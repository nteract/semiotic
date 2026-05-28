import { afterEach, describe, expect, it, vi } from "vitest"
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
  family: "time-series",
  importPath: "semiotic/xy",
  rubric: { familiarity: 5, accuracy: 4, precision: 4 },
  fits: () => null,
  intentScores: {},
  buildProps: () => ({}),
}

const stubProfile: ChartDataProfile = {
  rowCount: 0,
  fields: {},
  sample: [],
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
  hasRepeatedX: false,
  monotonicX: false,
  hasTimeAxis: false,
  xProvenance: "none",
  hasHierarchy: false,
  hasNetwork: false,
  hasGeo: false,
}

describe("variantDiscovery — proposeVariant", () => {
  it("returns an empty array when no discovery functions are registered", () => {
    const result = proposeVariant("LineChart", stubCapability, { profile: stubProfile })
    expect(result).toEqual([])
  })

  it("dispatches through every registered discovery function", () => {
    registerVariantDiscovery(() => [
      { id: "A:variant-a", baseComponent: "A", source: "heuristic" },
    ])
    registerVariantDiscovery(() => [
      { id: "B:variant-b", baseComponent: "B", source: "model" },
    ])

    const result = proposeVariant("LineChart", stubCapability, { profile: stubProfile })

    expect(result.map((p) => p.id)).toEqual(["A:variant-a", "B:variant-b"])
  })

  it("forwards (component, capability, context) to each proposer", () => {
    const calls: Array<{ component: string; intent?: string }> = []
    registerVariantDiscovery((component, _capability, context) => {
      calls.push({ component, intent: context.intent })
      return []
    })

    proposeVariant("LineChart", stubCapability, { profile: stubProfile, intent: "trend" })

    expect(calls).toEqual([{ component: "LineChart", intent: "trend" }])
  })

  it("deduplicates proposals by id — first proposer wins", () => {
    registerVariantDiscovery(() => [
      {
        id: "RidgelinePlot:bimodal",
        baseComponent: "RidgelinePlot",
        source: "heuristic",
        rationale: "from proposer 1",
      },
    ])
    registerVariantDiscovery(() => [
      {
        id: "RidgelinePlot:bimodal",
        baseComponent: "RidgelinePlot",
        source: "model",
        rationale: "from proposer 2",
      },
      { id: "RidgelinePlot:peak", baseComponent: "RidgelinePlot", source: "model" },
    ])

    const result = proposeVariant("LineChart", stubCapability, { profile: stubProfile })

    expect(result).toHaveLength(2)
    expect(result.find((p) => p.id === "RidgelinePlot:bimodal")?.rationale).toBe("from proposer 1")
    expect(result.map((p) => p.id)).toContain("RidgelinePlot:peak")
  })

  it("isolates a throwing proposer — siblings still produce proposals", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})
    registerVariantDiscovery(() => {
      throw new Error("proposer failure")
    })
    registerVariantDiscovery(() => [
      { id: "ok:variant", baseComponent: "ok", source: "manual" },
    ])

    const result = proposeVariant("LineChart", stubCapability, { profile: stubProfile })

    expect(result.map((p) => p.id)).toEqual(["ok:variant"])
    expect(consoleWarn).toHaveBeenCalled()
    consoleWarn.mockRestore()
  })

  it("tolerates a misbehaving proposer that returns nullish (defensive runtime check)", () => {
    // `ProposeVariantFn` is typed to return ReadonlyArray<VariantProposal>,
    // but external/runtime proposers can violate that. Cast through unknown
    // to exercise the `?? []` defensive branch.
    registerVariantDiscovery(((() => undefined) as unknown) as ProposeVariantFn)
    registerVariantDiscovery(() => [
      { id: "ok:variant", baseComponent: "ok", source: "manual" },
    ])

    const result = proposeVariant("LineChart", stubCapability, { profile: stubProfile })

    expect(result.map((p) => p.id)).toEqual(["ok:variant"])
  })
})

describe("variantDiscovery — evaluateVariantProposal", () => {
  it("returns a neutral baseline score (M1 placeholder)", () => {
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
