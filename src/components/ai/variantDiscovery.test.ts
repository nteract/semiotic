import { afterEach, describe, expect, it } from "vitest"
import {
  clearVariantDiscovery,
  evaluateVariantProposal,
  getRegisteredVariantDiscovery,
  proposeVariant,
  registerVariantDiscovery,
  type ProposeVariantFn,
  type VariantProposal,
} from "./variantDiscovery"
import type { ChartCapability, ChartDataProfile } from "./chartCapabilityTypes"

afterEach(() => {
  clearVariantDiscovery()
})

// Minimal stubs sufficient to type-check call sites. The M1 surface
// doesn't actually inspect them — real fixtures arrive with the M2/M3
// implementations.
const stubCapability: ChartCapability = {
  component: "LineChart",
  family: "xy",
  importPath: "semiotic/xy",
  rubric: { familiarity: 5, accuracy: 4, precision: 4 },
  fits: () => null,
  intentScores: {},
  buildProps: () => ({}),
}

const stubProfile: ChartDataProfile = {
  rowCount: 0,
  fields: {},
  data: [],
  candidates: {
    x: [],
    y: [],
    size: [],
    category: [],
    series: [],
    time: [],
  },
  primary: {},
}

describe("variantDiscovery — M1 stubs", () => {
  it("proposeVariant returns an empty array at M1", () => {
    const result = proposeVariant("LineChart", stubCapability, { profile: stubProfile })
    expect(result).toEqual([])
  })

  it("evaluateVariantProposal returns a neutral baseline score", () => {
    const proposal: VariantProposal = {
      id: "LineChart:streamgraph",
      baseComponent: "StackedAreaChart",
      source: "manual",
    }

    const score = evaluateVariantProposal(proposal, stubProfile)

    expect(score.proposalId).toBe("LineChart:streamgraph")
    expect(score.fit).toBe(0)
    expect(score.novelty).toBe(0)
    expect(score.risk).toBe(0)
    expect(score.reasons).toHaveLength(1)
    expect(score.reasons[0]).toMatch(/M1: scoring not implemented/)
  })
})

describe("variantDiscovery — registration plug point", () => {
  it("registers, lists, and unregisters discovery functions", () => {
    expect(getRegisteredVariantDiscovery()).toEqual([])

    const fnA: ProposeVariantFn = () => []
    const fnB: ProposeVariantFn = () => []

    const unsubA = registerVariantDiscovery(fnA)
    registerVariantDiscovery(fnB)

    expect(getRegisteredVariantDiscovery()).toHaveLength(2)
    expect(getRegisteredVariantDiscovery()).toContain(fnA)
    expect(getRegisteredVariantDiscovery()).toContain(fnB)

    unsubA()
    expect(getRegisteredVariantDiscovery()).toEqual([fnB])
  })

  it("clears all registered discovery functions", () => {
    registerVariantDiscovery(() => [])
    registerVariantDiscovery(() => [])
    expect(getRegisteredVariantDiscovery()).toHaveLength(2)

    clearVariantDiscovery()
    expect(getRegisteredVariantDiscovery()).toEqual([])
  })

  it("treats double-register of the same fn as idempotent", () => {
    const fn: ProposeVariantFn = () => []
    registerVariantDiscovery(fn)
    registerVariantDiscovery(fn)
    expect(getRegisteredVariantDiscovery()).toHaveLength(1)
  })
})

describe("variantDiscovery — proposal shape", () => {
  it("accepts manual, heuristic, and model sources", () => {
    const proposals: VariantProposal[] = [
      { id: "a", baseComponent: "BarChart", source: "manual" },
      { id: "b", baseComponent: "BarChart", source: "heuristic" },
      { id: "c", baseComponent: "BarChart", source: "model" },
    ]
    expect(proposals.map((p) => p.source)).toEqual(["manual", "heuristic", "model"])
  })

  it("carries optional deltas and a buildProps closure", () => {
    const proposal: VariantProposal = {
      id: "RidgelinePlot:bimodal",
      baseComponent: "RidgelinePlot",
      intentDeltas: { distribution: 1, "outlier-detection": -1 },
      rubricDeltas: { familiarity: -1 },
      buildProps: () => ({ bins: 40 }),
      rationale: "Distributions are bimodal — Ridgeline reveals the second mode.",
      source: "model",
      tags: ["distribution", "exploratory"],
    }

    expect(proposal.intentDeltas?.distribution).toBe(1)
    expect(proposal.buildProps?.(stubProfile)).toEqual({ bins: 40 })
  })
})
