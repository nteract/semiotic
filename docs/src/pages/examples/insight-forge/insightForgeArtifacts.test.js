import { describe, expect, it } from "vitest"
import {
  RECIPE_ATLAS,
  auditArtifact,
  compatibleRecipe,
  craftArtifacts,
  explainCompatibility,
  isSuperseded,
  makeArtifact,
  recipePreview,
  setArtifactStatus,
} from "./insightForgeArtifacts"

const predicate = { op: "eq", field: "package.design", value: "insert-b" }

function artifact(id, kind, extra = {}) {
  return makeArtifact({ id, kind, title: id, summary: `${id} summary`, predicate, ...extra })
}

describe("insight artifact contract", () => {
  it("fails a rate artifact that drops its denominator", () => {
    const result = auditArtifact(artifact("rate", "anomaly", { stats: { rate: 0.2 } }))
    expect(result.ok).toBe(false)
    expect(result.findings.map((finding) => finding.id)).toContain("ARTIFACT_NO_DENOMINATOR")
  })

  it("finds recipes without depending on slot order", () => {
    const anomaly = artifact("anomaly", "anomaly")
    const segment = artifact("segment", "segment")
    expect(compatibleRecipe([segment, anomaly])?.id).toBe("cut-cohort")
    expect(recipePreview([segment, anomaly])).toContain("Cut a Cohort")
  })

  it("crafts a portable filter while retaining both parent clauses", () => {
    const result = craftArtifacts([
      artifact("anomaly", "anomaly", {
        predicate: { op: "between", field: "shipment.date", min: "2026-05-15", max: "2026-05-29" },
      }),
      artifact("damage", "segment", {
        predicate: { op: "eq", field: "return.reason", value: "damaged" },
      }),
    ])
    expect(result.ok).toBe(true)
    expect(result.artifact.kind).toBe("filter")
    expect(result.artifact.predicate.clauses).toHaveLength(2)
    expect(result.artifact.lineage.parentIds).toEqual(["anomaly", "damage"])
  })

  it("classifies low-volume alerts without deleting the source anomaly", () => {
    const anomaly = artifact("tiny-alert", "anomaly", {
      stats: { numerator: 1, denominator: 5, rate: 0.2 },
    })
    const denominator = artifact("tiny-n", "denominator", {
      stats: { numerator: 1, denominator: 5, rate: 0.2 },
    })
    const result = craftArtifacts([anomaly, denominator])
    expect(result.artifact.kind).toBe("false-positive")
    expect(result.artifact.summary).toContain("unknown, not proven harmless")
    expect(result.parentUpdates).toEqual([{ id: "tiny-alert", status: "retracted" }])
    expect(
      result.artifact.audit.findings.find((finding) => finding.id === "ARTIFACT_LOW_VOLUME"),
    ).toMatchObject({ status: "warn" })
  })

  it("retracts a tested carrier hypothesis and retains it in lineage", () => {
    const hypothesis = artifact("carrier", "hypothesis", { maturity: "proposed" })
    const counterevidence = artifact("complement", "counterevidence")
    const result = craftArtifacts([counterevidence, hypothesis], { insightPredicate: predicate })
    expect(result.artifact.kind).toBe("insight")
    expect(result.artifact.summary).toContain("appears across carriers")
    expect(result.artifact.audit.ok).toBe(true)
    expect(result.artifact.audit.findings.map((finding) => finding.id)).not.toContain(
      "ARTIFACT_CAUSAL_OVERREACH",
    )
    expect(result.artifact.lineage.parentIds).toEqual(["complement", "carrier"])
    expect(result.parentUpdates).toEqual([{ id: "carrier", status: "retracted" }])
    expect(result.artifact.stats).toEqual(counterevidence.stats)
  })

  it("does not bind retracted insight and restores maturity when an item is reopened", () => {
    const insight = artifact("accepted", "insight", {
      maturity: "operational",
      lifecycle: { status: "accepted" },
    })
    const savedView = artifact("view", "saved-view", {
      predicate: undefined,
      payload: { config: { component: "QuadrantChart", props: {}, version: "1" } },
    })
    const retired = setArtifactStatus(insight, "retracted")
    expect(compatibleRecipe([retired, savedView])).toBeNull()
    expect(setArtifactStatus(retired, "disputed").maturity).toBe("operational")
  })

  it("explains why an incompatible pair cannot be crafted", () => {
    const twoAnomalies = explainCompatibility([
      artifact("a1", "anomaly"),
      artifact("a2", "anomaly"),
    ])
    expect(twoAnomalies.compatible).toBe(false)
    expect(twoAnomalies.reason).toMatch(/Anomaly combines with/i)

    const single = explainCompatibility([artifact("a1", "anomaly"), null])
    expect(single.compatible).toBe(false)
    expect(single.reason).toMatch(/Choose two/i)

    const retired = setArtifactStatus(artifact("a1", "anomaly"), "retracted")
    const withRetired = explainCompatibility([retired, artifact("d", "denominator")])
    expect(withRetired.compatible).toBe(false)
    expect(withRetired.reason).toMatch(/retracted/i)
  })

  it("blocks binding an unaccepted insight with a specific explanation", () => {
    const proposedInsight = artifact("draft", "insight", {
      lifecycle: { status: "proposed" },
    })
    const savedView = artifact("view", "saved-view", {
      predicate: undefined,
      payload: { config: { component: "Heatmap", props: {}, version: "1" } },
    })
    const result = explainCompatibility([proposedInsight, savedView])
    expect(result.compatible).toBe(false)
    expect(result.reason).toMatch(/must be accepted/i)
  })

  it("reports a valid pair with its recipe", () => {
    const result = explainCompatibility([artifact("a", "anomaly"), artifact("d", "denominator")])
    expect(result.compatible).toBe(true)
    expect(result.recipe.id).toBe("appraise-signal")
    expect(result.resultKind).toBe("false-positive")
  })

  it("exposes a canonical recipe atlas covering every craftable step", () => {
    expect(RECIPE_ATLAS).toHaveLength(5)
    for (const step of RECIPE_ATLAS) {
      expect(step.inputKinds).toHaveLength(2)
      expect(typeof step.storyRole).toBe("string")
      expect(step.storyRole.length).toBeGreaterThan(0)
    }
    const testStep = RECIPE_ATLAS.find((step) => step.id === "test-attribution")
    expect(testStep.storyRole).toMatch(/retracts the carrier hypothesis/i)
  })

  it("detects a superseded artifact via lifecycle.supersedes", () => {
    const hypothesis = artifact("carrier", "hypothesis")
    const insight = artifact("accepted", "insight", {
      lifecycle: { status: "accepted", supersedes: hypothesis.provenance.stableId },
    })
    expect(isSuperseded(hypothesis, [hypothesis, insight])).toBe(true)
    expect(isSuperseded(insight, [hypothesis, insight])).toBe(false)
    // A retracted superseder no longer supersedes.
    const retiredInsight = setArtifactStatus(insight, "retracted")
    expect(isSuperseded(hypothesis, [hypothesis, retiredInsight])).toBe(false)
  })

  it("binds an accepted insight to a real Heatmap config and audit snapshot", () => {
    const insight = artifact("accepted", "insight", {
      maturity: "operational",
      lifecycle: { status: "accepted" },
    })
    const savedView = artifact("view", "saved-view", {
      predicate: undefined,
      payload: { config: { component: "QuadrantChart", props: {}, version: "1" } },
    })
    const knowledgeConfig = {
      component: "Heatmap",
      props: { data: [], xAccessor: "x", yAccessor: "y", valueAccessor: "value" },
      version: "1",
    }
    const result = craftArtifacts([insight, savedView], {
      knowledgeConfig,
      knowledgeAudit: { validation: { valid: true } },
    })
    expect(result.ok).toBe(true)
    expect(result.artifact.payload.config).toEqual(knowledgeConfig)
    expect(result.artifact.payload.sourceConfig.component).toBe("QuadrantChart")
    expect(result.artifact.payload.auditSnapshot.validation.valid).toBe(true)
  })
})
