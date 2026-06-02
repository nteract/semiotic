import { describe, it, expect } from "vitest"
import {
  applyAudienceBias,
  effectiveFamiliarity,
  stretchFamiliarityCeiling,
  receivabilityBias
} from "./audienceProfile"
import type { AudienceProfile } from "./audienceProfile"
import { suggestCharts } from "./suggestCharts"
import { dataScientistPersona, analystPersona } from "./audiences"
import {
  auditAccessibility,
  accessibilityCaveats,
  type A11yFinding,
  type AccessibilityAuditResult
} from "../charts/shared/auditAccessibility"

function auditWith(findings: A11yFinding[]): AccessibilityAuditResult {
  return {
    component: "X",
    ok: true,
    summary: { criticalsPassed: 0, criticalsEvaluated: 0, fails: 0, warnings: 0, manual: 0, passes: 0 },
    findings,
    reference: "",
  }
}
const finding = (id: string, status: A11yFinding["status"], critical = false): A11yFinding => ({
  id, principle: "assistive", heuristic: id.split(".")[1].replace(/-/g, " "), critical, status, message: `msg:${id}`,
})

const baseRubric = { familiarity: 3, accuracy: 4, precision: 4 }

describe("applyAudienceBias", () => {
  it("returns identity when no audience is supplied", () => {
    const r = applyAudienceBias(3.5, baseRubric, "BarChart", undefined)
    expect(r.score).toBe(3.5)
    expect(r.rubric).toEqual(baseRubric)
    expect(r.appliedReason).toBeUndefined()
  })

  it("overrides familiarity when audience specifies it", () => {
    const audience: AudienceProfile = { familiarity: { BarChart: 5 } }
    const r = applyAudienceBias(3.5, baseRubric, "BarChart", audience)
    expect(r.rubric.familiarity).toBe(5)
    // Familiarity bias: (5 - 3) * 0.5 = +1.0
    expect(r.score).toBeCloseTo(4.5)
  })

  it("applies increase target as positive score delta", () => {
    const audience: AudienceProfile = {
      targets: { BoxPlot: { direction: "increase", weight: 2 } }
    }
    const r = applyAudienceBias(3.0, baseRubric, "BoxPlot", audience)
    // No familiarity override; target +1.0 * 2 = +2.0
    expect(r.score).toBe(5.0)
  })

  it("applies decrease target as negative score delta", () => {
    const audience: AudienceProfile = {
      targets: { PieChart: { direction: "decrease", weight: 3 } }
    }
    const r = applyAudienceBias(4.5, baseRubric, "PieChart", audience)
    // Target -1.0 * 3 = -3.0
    expect(r.score).toBeCloseTo(1.5)
  })

  it("combines familiarity + target", () => {
    const audience: AudienceProfile = {
      familiarity: { BoxPlot: 2 },
      targets: { BoxPlot: { direction: "increase", weight: 2 } }
    }
    const r = applyAudienceBias(3.0, baseRubric, "BoxPlot", audience)
    // Familiarity (2-3)*0.5 = -0.5; target +2.0 → +1.5 total
    expect(r.score).toBeCloseTo(4.5)
    expect(r.rubric.familiarity).toBe(2)
  })

  it("clamps target weight to 1..3", () => {
    const audience: AudienceProfile = {
      targets: { X: { direction: "increase", weight: 10 } }
    }
    const r = applyAudienceBias(0, baseRubric, "X", audience)
    expect(r.score).toBe(3) // 1.0 * 3 (clamped)
  })

  it("includes appliedReason when target fires", () => {
    const audience: AudienceProfile = {
      name: "Acme",
      targets: {
        BoxPlot: { direction: "increase", reason: "we want distributions" }
      }
    }
    const r = applyAudienceBias(3.0, baseRubric, "BoxPlot", audience)
    expect(r.appliedReason).toContain("Acme")
    expect(r.appliedReason).toContain("distributions")
  })

  it("folds a precomputed receivability signal when the modality is non-visual", () => {
    const audience: AudienceProfile = { receptionModality: "screen-reader" }
    const signal = receivabilityBias(auditWith([finding("assistive.data-density", "warn", true)]), "screen-reader")
    const r = applyAudienceBias(4, baseRubric, "PieChart", audience, signal)
    expect(r.score).toBeCloseTo(3.6) // 4 − 0.4 (a warn)
    expect(r.receivabilityReason).toContain("screen reader")
  })

  it("applies no receivability penalty for a visual audience even when a signal is passed", () => {
    const signal = receivabilityBias(auditWith([finding("assistive.data-density", "warn", true)]), "screen-reader")
    const r = applyAudienceBias(4, baseRubric, "PieChart", { receptionModality: "visual" }, signal)
    expect(r.score).toBe(4)
    expect(r.receivabilityReason).toBeUndefined()
  })

  it("applies no receivability penalty when no signal is supplied", () => {
    const r = applyAudienceBias(4, baseRubric, "PieChart", { receptionModality: "screen-reader" })
    expect(r.score).toBe(4)
    expect(r.receivabilityReason).toBeUndefined()
  })
})

describe("receivabilityBias", () => {
  it("returns no bias for the visual channel", () => {
    const audit = auditWith([finding("assistive.data-density", "warn", true)])
    expect(receivabilityBias(audit, "visual")).toEqual({ delta: 0, caveats: [] })
  })

  it("weighs a critical fail (1.2) above a warn (0.4), clamps to −3, and names the channel", () => {
    const audit = auditWith([
      finding("compromising.table", "fail", true),
      finding("assistive.data-density", "warn", true),
    ])
    const r = receivabilityBias(audit, "agent")
    expect(r.delta).toBeCloseTo(-1.6)
    expect(r.reason).toContain("an AI reader")
  })

  it("ignores manual/pass findings and heuristics outside the receivability set", () => {
    const audit = auditWith([
      finding("robust.conforms-to-standards", "manual"),
      finding("operable.focus-indicator", "warn"), // not in the receivability set
      finding("compromising.table", "pass", true),
    ])
    expect(receivabilityBias(audit, "screen-reader").delta).toBe(0)
  })
})

describe("accessibilityCaveats", () => {
  const eightSlices = Array.from({ length: 8 }, (_, i) => ({ vendor: `V${i}`, share: 20 - i }))

  it("distils a real audit's fail/warn findings into caveat strings", () => {
    const audit = auditAccessibility("PieChart", { data: eightSlices, categoryAccessor: "vendor", valueAccessor: "share" })
    const caveats = accessibilityCaveats(audit)
    expect(caveats.some((c) => /slice|density/i.test(c))).toBe(true)
    expect(accessibilityCaveats(audit, { onlyCritical: true }).length).toBeLessThanOrEqual(caveats.length)
  })
})

describe("effectiveFamiliarity", () => {
  it("returns audience override when present", () => {
    const audience: AudienceProfile = { familiarity: { BoxPlot: 5 } }
    expect(effectiveFamiliarity("BoxPlot", 2, audience)).toBe(5)
  })
  it("returns default when audience does not list the chart", () => {
    const audience: AudienceProfile = { familiarity: { BarChart: 5 } }
    expect(effectiveFamiliarity("BoxPlot", 2, audience)).toBe(2)
  })
  it("returns default when no audience supplied", () => {
    expect(effectiveFamiliarity("BoxPlot", 2, undefined)).toBe(2)
  })
})

describe("stretchFamiliarityCeiling", () => {
  it("returns 3 for no audience or exposureLevel undefined/1", () => {
    expect(stretchFamiliarityCeiling(undefined)).toBe(3)
    expect(stretchFamiliarityCeiling({})).toBe(3)
    expect(stretchFamiliarityCeiling({ exposureLevel: 1 })).toBe(3)
  })
  it("returns 4 at exposureLevel 2", () => {
    expect(stretchFamiliarityCeiling({ exposureLevel: 2 })).toBe(4)
  })
})

describe("suggestCharts × audience", () => {
  const categorical = [
    { product: "A", units: 30 },
    { product: "B", units: 50 },
    { product: "C", units: 20 },
    { product: "D", units: 45 }
  ]

  it("data scientist persona meaningfully decreases PieChart for rank intent", () => {
    const withoutAudience = suggestCharts(categorical, {
      intent: "rank",
      includeVariants: false
    })
    const withAudience = suggestCharts(categorical, {
      intent: "rank",
      audience: dataScientistPersona,
      includeVariants: false,
      // Lower minScore so we can see the biased score even if it goes negative
      minScore: -10
    })
    const pieBase = withoutAudience.find((s) => s.component === "PieChart")
    const pieAud = withAudience.find((s) => s.component === "PieChart")
    expect(pieBase).toBeDefined()
    expect(pieAud).toBeDefined()
    if (pieBase && pieAud) {
      // Data scientist: PieChart familiarity 3 (no shift) + decrease target weight 2 = -2.0
      expect(pieAud.score).toBeLessThan(pieBase.score - 1)
    }
  })

  it("strong decrease targets can suppress a chart entirely below default minScore", () => {
    // With the default minScore (0), PieChart's biased score for rank
    // (1 - 2 = -1) falls below the floor and disappears from results.
    const suggestions = suggestCharts(categorical, {
      intent: "rank",
      audience: dataScientistPersona,
      includeVariants: false
    })
    expect(suggestions.find((s) => s.component === "PieChart")).toBeUndefined()
  })

  it("appends audience rationale to suggestion.reasons when a target fires", () => {
    const suggestions = suggestCharts(categorical, {
      audience: dataScientistPersona,
      includeVariants: false
    })
    const pie = suggestions.find((s) => s.component === "PieChart")
    if (pie) {
      expect(
        pie.reasons.some(
          (r) =>
            r.toLowerCase().includes("length") ||
            r.toLowerCase().includes("decrease")
        )
      ).toBe(true)
    }
  })

  it("returns the same ranking as no-audience when audience is empty", () => {
    const a = suggestCharts(categorical, {
      intent: "rank",
      includeVariants: false
    })
    const b = suggestCharts(categorical, {
      intent: "rank",
      includeVariants: false,
      audience: {}
    })
    expect(a.map((s) => s.component)).toEqual(b.map((s) => s.component))
  })

  it("preserves overall ranking quality — top pick remains valid", () => {
    // BarChart should still win rank for the analyst even with a mild
    // decrease-pie target, because BarChart is the correct answer.
    const suggestions = suggestCharts(categorical, {
      intent: "rank",
      audience: analystPersona,
      includeVariants: false
    })
    expect(suggestions[0].component).toBe("BarChart")
  })
})
