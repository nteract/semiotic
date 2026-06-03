import { describe, it, expect } from "vitest"
import {
  auditAccessibility,
  formatAccessibilityAudit,
  type A11yFinding,
  type AccessibilityAuditResult,
} from "./auditAccessibility"

const find = (r: AccessibilityAuditResult, id: string): A11yFinding | undefined =>
  r.findings.find(x => x.id === id)
const status = (r: AccessibilityAuditResult, id: string) => find(r, id)?.status

const LINE_DATA = [
  { month: 1, sales: 4200 },
  { month: 2, sales: 5100 },
  { month: 3, sales: 6800 },
]

describe("auditAccessibility — title/description criticals", () => {
  it("fails a bare chart with no title/description/summary", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, xAccessor: "month", yAccessor: "sales" })
    expect(status(r, "understandable.title-summary-caption")).toBe("fail")
    expect(status(r, "understandable.explain-purpose")).toBe("fail")
    expect(r.ok).toBe(false)
    expect(r.summary.fails).toBeGreaterThan(0)
  })

  it("passes title-summary with only a title, but warns on explain-purpose", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "Sales" })
    expect(status(r, "understandable.title-summary-caption")).toBe("pass")
    expect(status(r, "understandable.explain-purpose")).toBe("warn")
  })

  it("passes a well-described chart on every critical heuristic", () => {
    const r = auditAccessibility("LineChart", {
      data: LINE_DATA,
      xAccessor: "month",
      yAccessor: "sales",
      xLabel: "Month",
      yLabel: "Sales",
      title: "Sales by month",
      description: "A line chart of monthly sales.",
      summary: "Sales rose over the quarter. Use the arrow keys to move between points.",
      colorScheme: ["#08306b", "#7f2704"],
    }, { inChartContainer: true })

    const failedCriticals = r.findings.filter(x => x.critical && x.status === "fail")
    expect(failedCriticals).toEqual([])
    expect(r.ok).toBe(true)
    expect(status(r, "understandable.reading-level")).toBe("pass")
    expect(status(r, "compromising.table")).toBe("pass")
    expect(status(r, "perceivable.low-contrast")).toBe("pass")
  })
})

describe("auditAccessibility — non-visual alternative (Perceivable + Compromising)", () => {
  it("fails content-only-visual and table when accessibleTable is off with no text alt", () => {
    const r = auditAccessibility("BarChart", {
      data: [{ category: "A", value: 1 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      accessibleTable: false,
    })
    expect(status(r, "perceivable.content-only-visual")).toBe("fail")
    expect(status(r, "compromising.table")).toBe("fail")
    expect(r.ok).toBe(false)
  })

  it("softens content-only-visual to manual when description+summary exist, but table still fails", () => {
    const r = auditAccessibility("BarChart", {
      data: [{ category: "A", value: 1 }],
      accessibleTable: false,
      description: "A bar chart.",
      summary: "One category, value one.",
    })
    expect(status(r, "perceivable.content-only-visual")).toBe("manual")
    expect(status(r, "compromising.table")).toBe("fail") // table is its own critical
    expect(r.ok).toBe(false)
  })

  it("credits the data table and skip link by default", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "Sales" })
    expect(status(r, "perceivable.content-only-visual")).toBe("pass")
    expect(status(r, "compromising.table")).toBe("pass")
    expect(status(r, "assistive.skippable-navigation")).toBe("pass")
  })
})

describe("auditAccessibility — contrast", () => {
  it("fails when a colorScheme color is below 3:1 vs white", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", colorScheme: ["#eeeeee", "#08306b"] })
    expect(status(r, "perceivable.low-contrast")).toBe("fail")
    expect(r.ok).toBe(false)
  })

  it("is manual when colors come from the theme (no colorScheme)", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" })
    expect(status(r, "perceivable.low-contrast")).toBe("manual")
  })

  it("respects an explicit dark background", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", background: "#000000", colorScheme: ["#ffffff"] })
    expect(status(r, "perceivable.low-contrast")).toBe("pass")
  })

  it("defers to manual when the background is a theme token / CSS var (not assumed white)", () => {
    // A theme-derived background resolves at render time — checking against an
    // assumed #ffffff would give a false pass/fail, so stay honest.
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", background: "var(--semiotic-bg)", colorScheme: ["#eeeeee"] })
    expect(status(r, "perceivable.low-contrast")).toBe("manual")
  })
})

describe("auditAccessibility — color-only encoding", () => {
  it("warns on color-alone and asks for CVD verification when colorBy is set", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", colorBy: "series" })
    expect(status(r, "perceivable.color-alone")).toBe("warn")
    expect(status(r, "perceivable.cvd-safe")).toBe("manual")
  })

  it("omits color-only checks when no color encoding is present", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" })
    expect(find(r, "perceivable.color-alone")).toBeUndefined()
  })
})

describe("auditAccessibility — annotation→target association (correspondence problem)", () => {
  const base = { data: LINE_DATA, title: "x" }

  it("does not raise the check when there are no annotations", () => {
    const r = auditAccessibility("LineChart", base)
    expect(find(r, "perceivable.annotation-association")).toBeUndefined()
  })

  it("passes when annotations tie to their target with a non-color cue", () => {
    const r = auditAccessibility("LineChart", {
      ...base,
      annotations: [
        { type: "callout", x: 2, label: "Peak", color: "#f00" }, // draws a connector
        { type: "y-threshold", y: 5000, label: "Target", color: "#0f0" }, // spans the plot
        { type: "enclose", coordinates: [{ x: 1, y: 1 }], label: "Cluster", color: "#00f" },
      ],
    })
    expect(status(r, "perceivable.annotation-association")).toBe("pass")
  })

  it("warns when a colored note relies on color + position alone", () => {
    const r = auditAccessibility("LineChart", {
      ...base,
      annotations: [
        { type: "text", x: 2, y: 5000, label: "Echoes the red line", color: "#f00" }, // no connector/subject
      ],
    })
    const f = find(r, "perceivable.annotation-association")
    expect(f?.status).toBe("warn")
    expect(f?.message).toContain("correspondence problem")
    expect(f?.fix).toContain("connector")
  })

  it("warns when a callout's connector is disabled", () => {
    const r = auditAccessibility("LineChart", {
      ...base,
      annotations: [
        { type: "callout", x: 2, label: "Peak", color: "#f00", disable: ["connector"] },
      ],
    })
    expect(status(r, "perceivable.annotation-association")).toBe("warn")
  })

  it("treats a colorless note as fine (association isn't by color)", () => {
    const r = auditAccessibility("LineChart", {
      ...base,
      annotations: [{ type: "text", x: 2, y: 5000, label: "no color set" }],
    })
    expect(status(r, "perceivable.annotation-association")).toBe("pass")
  })
})

describe("auditAccessibility — annotation hierarchy", () => {
  const base = { data: LINE_DATA, title: "x" }

  it("warns when multiple annotations have no declared hierarchy", () => {
    const r = auditAccessibility("LineChart", {
      ...base,
      annotations: [
        { type: "callout", x: 1, y: 4200, label: "First" },
        { type: "callout", x: 2, y: 5100, label: "Second" },
      ],
    })
    const f = find(r, "understandable.annotation-hierarchy")
    expect(f?.status).toBe("warn")
    expect(f?.fix).toContain("emphasis")
  })

  it("passes when hierarchy is explicit or inferred from provenance confidence", () => {
    const explicit = auditAccessibility("LineChart", {
      ...base,
      annotations: [
        { type: "callout", x: 1, y: 4200, label: "Context", emphasis: "secondary" },
        { type: "callout", x: 2, y: 5100, label: "Main", emphasis: "primary" },
      ],
    })
    const inferred = auditAccessibility("LineChart", {
      ...base,
      annotations: [
        { type: "callout", x: 1, y: 4200, label: "Context", provenance: { confidence: 0.6 } },
        { type: "callout", x: 2, y: 5100, label: "Main", provenance: { confidence: 0.9 } },
      ],
    })

    expect(status(explicit, "understandable.annotation-hierarchy")).toBe("pass")
    expect(status(inferred, "understandable.annotation-hierarchy")).toBe("pass")
  })
})

describe("auditAccessibility — operability", () => {
  it("keeps single-input-modality a pass for a recognized HOC (keyboard nav is built in)", () => {
    const withBrush = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", brush: { dimension: "x" } })
    const without = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" })
    // Brushing is mouse-only, but the chart still has keyboard nav — so the
    // critical "single input modality" heuristic passes either way.
    expect(status(withBrush, "operable.single-input-modality")).toBe("pass")
    expect(status(without, "operable.single-input-modality")).toBe("pass")
  })

  it("warns that a complex action (brush) has no standard-UI alternative", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", brush: { dimension: "x" } })
    expect(status(r, "operable.complex-action-alternatives")).toBe("warn")
  })

  it("flags zoom and legend-filtering as complex actions too", () => {
    const zoom = auditAccessibility("ChoroplethMap", { areas: [], title: "x", zoomable: true })
    expect(status(zoom, "operable.complex-action-alternatives")).toBe("warn")
    const legend = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", legendInteraction: "isolate" })
    expect(status(legend, "operable.complex-action-alternatives")).toBe("warn")
  })

  it("omits complex-action-alternatives when there are no complex actions", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" })
    expect(find(r, "operable.complex-action-alternatives")).toBeUndefined()
  })

  it("warns when interactive point targets are below 24px", () => {
    const small = auditAccessibility("Scatterplot", { data: LINE_DATA, title: "x", pointRadius: 4 })
    expect(status(small, "operable.target-size")).toBe("warn")
    const ok = auditAccessibility("Scatterplot", { data: LINE_DATA, title: "x", pointRadius: 14 })
    expect(find(ok, "operable.target-size")).toBeUndefined()
  })

  it("credits the single-tab-stop + arrow-key navigation model", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" })
    expect(status(r, "operable.tab-stops")).toBe("pass")
  })

  it("warns when an interactive chart has no instructions", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" })
    // tooltip defaults on → interactive; no summary/description → warn
    expect(status(r, "operable.interaction-cues")).toBe("warn")
  })
})

describe("auditAccessibility — expanded heuristics", () => {
  it("passes color-alone when categories are directly labeled", () => {
    const labeled = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", colorBy: "series", directLabel: true })
    expect(status(labeled, "perceivable.color-alone")).toBe("pass")
    const bare = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", colorBy: "series" })
    expect(status(bare, "perceivable.color-alone")).toBe("warn")
  })

  it("upgrades cvd-safe to pass when the Wong palette is used", () => {
    const wong = ["#0072B2", "#E69F00", "#009E73", "#CC79A7"]
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", colorBy: "series", colorScheme: wong })
    expect(status(r, "perceivable.cvd-safe")).toBe("pass")
  })

  it("warns textures cannot be adjusted whenever color encodes meaning", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", colorBy: "series" })
    expect(status(r, "flexible.textures-adjustable")).toBe("warn")
  })

  it("warns on dual-axis information complexity", () => {
    const r = auditAccessibility("MultiAxisLineChart", { data: LINE_DATA, title: "x", series: [{ yAccessor: "a" }, { yAccessor: "b" }] })
    expect(status(r, "understandable.information-complexity")).toBe("warn")
  })

  it("routes statistical overlays to a manual uncertainty check", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", forecast: { periods: 3 } })
    expect(status(r, "understandable.uncertainty")).toBe("manual")
  })

  it("warns on large unformatted numbers", () => {
    const big = [{ month: 1, revenue: 6500000 }, { month: 2, revenue: 7200000 }]
    const r = auditAccessibility("LineChart", { data: big, xAccessor: "month", yAccessor: "revenue", title: "x" })
    expect(status(r, "assistive.human-readable-numbers")).toBe("warn")
  })

  it("does not warn on large numbers when a formatter is supplied", () => {
    const big = [{ month: 1, revenue: 6500000 }]
    const r = auditAccessibility("LineChart", { data: big, yAccessor: "revenue", title: "x", yFormat: "compact" })
    expect(find(r, "assistive.human-readable-numbers")).toBeUndefined()
  })

  it("passes zoom-reflow when the chart is responsive", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", responsiveWidth: true })
    expect(status(r, "flexible.zoom-reflow")).toBe("pass")
  })

  it("counts network density by node count", () => {
    const nodes = Array.from({ length: 250 }, (_, i) => ({ id: `n${i}` }))
    const r = auditAccessibility("ForceDirectedGraph", { nodes, edges: [], title: "x" })
    expect(status(r, "assistive.data-density")).toBe("warn")
  })

  it("adds robust manual checks and credits resilient rendering", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" })
    expect(status(r, "robust.semantically-valid")).toBe("manual")
    expect(status(r, "robust.fragile-technology-support")).toBe("pass")
  })

  it("passes features-described when ChartContainer describe is enabled", () => {
    const without = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" })
    expect(status(without, "assistive.features-described")).toBe("warn")
    const withDescribe = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" }, { describe: true })
    expect(status(withDescribe, "assistive.features-described")).toBe("pass")
  })

  it("passes navigable-structure when the navigable tree is enabled — even for hierarchy charts", () => {
    const hierWarn = auditAccessibility("Treemap", { data: { name: "root", children: [] }, title: "x" })
    expect(status(hierWarn, "compromising.navigable-structure")).toBe("warn")
    const hierNav = auditAccessibility("Treemap", { data: { name: "root", children: [] }, title: "x" }, { navigable: true })
    expect(status(hierNav, "compromising.navigable-structure")).toBe("pass")
    const xyNav = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" }, { navigable: true })
    expect(status(xyNav, "compromising.navigable-structure")).toBe("pass")
  })

  it("routes chrome heuristics toward ChartContainer when the chart lacks text", () => {
    // No title on the chart, but wrapped in a ChartContainer → the container is
    // the layer that supplies title/caption, so don't hard-fail.
    const contained = auditAccessibility("LineChart", { data: LINE_DATA }, { inChartContainer: true })
    expect(status(contained, "understandable.title-summary-caption")).toBe("manual")
    // describe satisfies the how-to-read half of "explain purpose".
    const described = auditAccessibility("LineChart", { data: LINE_DATA }, { describe: true })
    expect(status(described, "understandable.explain-purpose")).toBe("manual")
  })
})

describe("auditAccessibility — data density", () => {
  it("warns on a part-to-whole chart with too many slices", () => {
    const data = Array.from({ length: 9 }, (_, i) => ({ category: `C${i}`, value: i + 1 }))
    const r = auditAccessibility("PieChart", { data, title: "x" })
    expect(status(r, "assistive.data-density")).toBe("warn")
  })

  it("passes a part-to-whole chart with few slices", () => {
    const data = Array.from({ length: 4 }, (_, i) => ({ category: `C${i}`, value: i + 1 }))
    const r = auditAccessibility("PieChart", { data, title: "x" })
    expect(status(r, "assistive.data-density")).toBe("pass")
  })

  it("is manual when data is omitted (push mode)", () => {
    const r = auditAccessibility("LineChart", { title: "x", xAccessor: "month", yAccessor: "sales" })
    expect(status(r, "assistive.data-density")).toBe("manual")
  })
})

describe("auditAccessibility — described features & reading level", () => {
  it("warns when no summary describes trends/outliers", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" })
    expect(status(r, "assistive.features-described")).toBe("warn")
  })

  it("routes feature description to manual verification when a summary exists", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", summary: "Sales rose then fell." })
    expect(status(r, "assistive.features-described")).toBe("manual")
  })

  it("warns when description text reads above grade 9", () => {
    const dense =
      "The multidimensional visualization juxtaposes heterogeneous longitudinal observations, " +
      "facilitating sophisticated interpretation of the underlying socioeconomic relationships notwithstanding considerable variability."
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "x", description: dense })
    expect(status(r, "understandable.reading-level")).toBe("warn")
  })
})

describe("auditAccessibility — families & unknowns", () => {
  it("treats BigNumber's table heuristics as not-applicable and content as text-pass", () => {
    const r = auditAccessibility("BigNumber", { value: 42, label: "Revenue", title: "Revenue" })
    expect(status(r, "compromising.table")).toBe("not-applicable")
    expect(status(r, "assistive.skippable-navigation")).toBe("not-applicable")
    expect(status(r, "perceivable.content-only-visual")).toBe("pass")
  })

  it("warns that hierarchy charts lack structured navigation", () => {
    const r = auditAccessibility("Treemap", { data: { name: "root", children: [] }, title: "x" })
    expect(status(r, "compromising.navigable-structure")).toBe("warn")
  })

  it("downgrades built-in passes to manual for an unrecognized component", () => {
    const r = auditAccessibility("MysteryChart", { data: LINE_DATA, title: "x" })
    expect(status(r, "operable.controls-override-at")).toBe("manual")
    expect(status(r, "flexible.user-style-respected")).toBe("manual")
  })

  it("credits exportable data when inChartContainer is set", () => {
    const open = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" })
    const contained = auditAccessibility("LineChart", { data: LINE_DATA, title: "x" }, { inChartContainer: true })
    expect(status(open, "compromising.table-static")).toBe("warn")
    expect(status(contained, "compromising.table-static")).toBe("manual")
  })
})

describe("formatAccessibilityAudit", () => {
  it("renders a grouped, referenced report", () => {
    const r = auditAccessibility("LineChart", { data: LINE_DATA, title: "Sales" })
    const text = formatAccessibilityAudit(r)
    expect(text).toContain("LineChart")
    expect(text).toContain("Chartability")
    expect(text).toContain("PERCEIVABLE")
    expect(text).toMatch(/critical heuristics pass/)
  })

  it("does not list not-applicable findings", () => {
    const r = auditAccessibility("BigNumber", { value: 1, title: "x" })
    const text = formatAccessibilityAudit(r)
    expect(text).not.toContain("compromising.table:")
  })
})
