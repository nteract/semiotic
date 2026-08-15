import { describe, expect, it } from "vitest"

import { buildEvidence } from "../server/renderEvidence"
import type { ChartCapability } from "./chartCapabilityTypes"
import {
  registerChartCapability,
  unregisterChartCapability
} from "./chartCapabilities"
import { applySemanticViability } from "./semanticViability"

function paintedEvidence(component: string) {
  const evidence = buildEvidence({
    frameType: "xy",
    width: 600,
    height: 400,
    marks: [{ type: "line" }]
  })
  evidence.component = component
  return evidence
}

describe("capability-owned semantic viability", () => {
  it("distinguishes a painted rank-1 BumpChart from a meaningful one", () => {
    const evidence = paintedEvidence("BumpChart")
    applySemanticViability(evidence, "BumpChart", {
      data: [
        { period: "Q1", service: "alpha", throughput: 10 },
        { period: "Q2", service: "bravo", throughput: 15 },
        { period: "Q3", service: "charlie", throughput: 8 }
      ],
      xAccessor: "period",
      yAccessor: "throughput",
      lineBy: "service"
    })

    expect(evidence.status).toBe("ok")
    expect(evidence.empty).toBe(false)
    expect(evidence.semanticStatus).toBe("degenerate")
    expect(evidence.semanticDiagnostics).toEqual([
      expect.objectContaining({
        code: "BUMP_NO_RANK_COMPETITION",
        severity: "error",
        metrics: expect.objectContaining({
          columns: 3,
          median: 1,
          max: 1,
          contestedColumns: 0
        })
      })
    ])
    expect(evidence.warnings).toContain("BUMP_NO_RANK_COMPETITION")
  })

  it("marks a checked BumpChart with shared ranking columns as meaningful", () => {
    const evidence = paintedEvidence("BumpChart")
    const data = ["Q1", "Q2", "Q3"].flatMap((period, periodIndex) =>
      ["alpha", "bravo", "charlie"].map((service, serviceIndex) => ({
        period,
        service,
        throughput: 10 + periodIndex * 2 - serviceIndex
      }))
    )
    applySemanticViability(evidence, "BumpChart", {
      data,
      xAccessor: "period",
      yAccessor: "throughput",
      lineBy: "service"
    })

    expect(evidence.semanticStatus).toBe("meaningful")
    expect(evidence.semanticDiagnostics).toEqual([])
    expect(evidence.warnings).toEqual([])
  })

  it("does not claim charts without a semantic check were assessed", () => {
    const evidence = paintedEvidence("LineChart")
    applySemanticViability(evidence, "LineChart", {})

    expect(evidence.semanticStatus).toBe("not-assessed")
    expect(evidence.semanticDiagnostics).toEqual([])
  })

  it("honors semantic callbacks on registered capability overrides", () => {
    const capability: ChartCapability = {
      component: "BumpChart",
      family: "time-series",
      importPath: "semiotic/xy",
      rubric: { familiarity: 1, accuracy: 1, precision: 1 },
      fits: () => null,
      intentScores: {},
      buildProps: () => ({}),
      semanticViability: () => [{
        code: "CUSTOM_SEMANTIC_FAILURE",
        severity: "error",
        message: "The registered semantic check ran."
      }]
    }

    registerChartCapability(capability)
    try {
      const registered = paintedEvidence(capability.component)
      applySemanticViability(registered, capability.component, {})
      expect(registered.semanticDiagnostics?.[0]?.code).toBe("CUSTOM_SEMANTIC_FAILURE")
    } finally {
      unregisterChartCapability(capability.component)
    }

    const restored = paintedEvidence(capability.component)
    applySemanticViability(restored, capability.component, {
      data: [{ x: 1, y: 1, series: "only" }]
    })
    expect(restored.semanticDiagnostics?.[0]?.code).toBe("BUMP_NO_RANK_COMPETITION")
  })
})
