import { describe, expect, it } from "vitest"
import { flowCircuitStory } from "../../../../scripts/network-atlas/stories/flowCircuitStories"
import { prepareFlowCircuit, explainCircuitModule } from "./flowCircuit"
import {
  admitCircuitEdition,
  readCircuitEdition,
  exportCircuitEvidence
} from "./flowCircuitTape"
import { layoutFlowCircuit } from "./flowCircuitGeometry"
import { prepareNetworkAtlas } from "./prepare"

describe("Flow Circuit compilation and admitted readings", () => {
  it("matches the independent hot-partition ledger and preserves the observation during modeling", () => {
    const { circuit, observed, modeled } = flowCircuitStory("etl")
    const before = JSON.stringify(observed)
    const snapshot = readCircuitEdition(observed, "observed-snapshot", 60)
    expect(snapshot.entry.totals).toMatchObject({
      arrivals: 60000,
      completions: 40000,
      capacity: 80000,
      queued: 1200000
    })
    expect(snapshot.entry.nodes.p1).toMatchObject({
      arrivals: 30000,
      completions: 10000,
      capacity: 10000,
      queued: 1200000
    })
    expect(
      Object.values(snapshot.entry.nodes)
        .filter((node) => node.capacity !== null)
        .reduce((sum, node) => sum + node.completions!, 0)
    ).toBe(40000)
    const candidate = readCircuitEdition(modeled, "modeled-scenario", 60)
    expect(candidate.entry.totals).toMatchObject({
      arrivals: 60000,
      completions: 60000,
      capacity: 80000,
      queued: 0
    })
    expect(
      modeled.model?.guardrails.map((guardrail) => guardrail.status)
    ).toEqual(["pass", "unverified"])
    expect(JSON.stringify(observed)).toBe(before)
    expect(admitCircuitEdition(circuit, modeled)).toBe(modeled)
    const stillHot = flowCircuitStory("etl", { hotPartitions: 2 }).modeled
    expect(stillHot.entries[6].totals.queued).toBe(600000)
    expect(stillHot.model?.guardrails[0].status).toBe("fail")
  })

  it("keeps root, attempt and retry rates distinct and refuses to invent observed queue growth", () => {
    const { observed, modeled } = flowCircuitStory("retry")
    expect(observed.entries[6].totals).toMatchObject({
      roots: 10000,
      attempts: 30000,
      retries: 20000,
      queued: null,
      completions: null,
      successes: null,
      errors: null
    })
    expect(modeled.entries[6].totals).toMatchObject({
      roots: 10000,
      attempts: 12000,
      retries: 2000,
      successes: 9000,
      errors: 1000,
      queued: null
    })
    expect(modeled.model?.guardrails[0].status).toBe("fail")
    expect(
      flowCircuitStory("retry", { retryBudget: 2 }).modeled.entries[6].totals
    ).toMatchObject({
      roots: 10000,
      attempts: 13000,
      retries: 3000,
      successes: 9500,
      errors: 500
    })
    expect(
      flowCircuitStory("retry", { retryBudget: 0 }).modeled.entries[6].totals
    ).toMatchObject({
      roots: 10000,
      attempts: 10000,
      retries: 0,
      successes: 8000,
      errors: 2000
    })
    expect(
      observed.entries[0].flows.find((flow) => flow.edgeId === "outcomes")
        ?.perSecond
    ).toBeNull()
  })

  it("reads the same tape at different frame rates, with exact sample boundaries and no timing interpolation", () => {
    const { observed } = flowCircuitStory("etl")
    for (const fps of [12, 30, 60, 144]) {
      let reading = readCircuitEdition(observed, "observed-replay", 0)
      for (let frame = 0; frame <= 60 * fps; frame++)
        reading = readCircuitEdition(observed, "observed-replay", frame / fps)
      expect(reading.entry.totals.queued).toBe(1200000)
    }
    expect(
      readCircuitEdition(observed, "observed-replay", 19.99).entry.totals.queued
    ).toBe(200000)
    expect(
      readCircuitEdition(observed, "observed-replay", 20).entry.totals.queued
    ).toBe(400000)
    expect(readCircuitEdition(observed, "observed-replay", 61).status).toBe(
      "incomplete"
    )
    expect(
      readCircuitEdition(
        { ...observed, timing: "incomplete" },
        "observed-replay",
        20
      ).status
    ).toBe("incomplete")
    expect(() => readCircuitEdition(observed, "modeled-scenario", 20)).toThrow(
      "cannot share"
    )
  })

  it("changes display backbones and dimensions without changing ledger values, match counts or edge coverage", () => {
    const first = flowCircuitStory("etl")
    const second = flowCircuitStory("etl", { reverseBackbone: true })
    expect(first.circuit.backboneEdgeIds).not.toEqual(
      second.circuit.backboneEdgeIds
    )
    expect(first.observed).toEqual(second.observed)
    expect(first.circuit.matches).toEqual(second.circuit.matches)
    const edges = first.circuit.atlas.source.edges.map((edge) => edge.id).sort()
    for (const circuit of [first.circuit, second.circuit]) {
      expect(
        [...circuit.backboneEdgeIds, ...circuit.residualEdgeIds].sort()
      ).toEqual(edges)
      for (const [width, height] of [
        [650, 860],
        [1100, 920]
      ]) {
        const geometry = layoutFlowCircuit(circuit, width, height)
        expect(geometry.routes.map((route) => route.edgeId).sort()).toEqual(
          edges
        )
        expect(
          new Set(geometry.modules.map((region) => region.module.nodeId)).size
        ).toBe(11)
        for (const route of geometry.routes)
          for (const point of route.points) {
            expect(point.x).toBeGreaterThanOrEqual(0)
            expect(point.x).toBeLessThanOrEqual(width)
            expect(point.y).toBeGreaterThanOrEqual(0)
            expect(point.y).toBeLessThanOrEqual(height)
          }
      }
    }
  })

  it("binds role-centered capsules once and retains overlapping matches and canonical port evidence", () => {
    const { circuit } = flowCircuitStory("retry")
    const inventory = explainCircuitModule(circuit, "inventory")
    expect(inventory.kind).toBe("retry")
    expect(inventory.selectedMatchId).toContain("repeated-state-episode")
    expect(inventory.matches.length).toBeGreaterThan(1)
    expect(inventory.originalEdges.map((edge) => edge.id).sort()).toEqual([
      "external",
      "outcomes",
      "retry-offer",
      "retry-return"
    ])
    const unbound = prepareFlowCircuit(
      circuit.atlas,
      circuit.modules.map((module) => ({
        ...module.semantics,
        retryPolicy: undefined
      }))
    )
    expect(
      unbound.modules.find((module) => module.nodeId === "inventory")?.kind
    ).toBe("junction")
    expect(unbound.matches).toBe(circuit.matches)
  })

  it("retains parallel edges, self-loops, unknown evidence, and explicitly declared join/dependency forms", () => {
    const { circuit } = flowCircuitStory("etl")
    const nodes = ["root", "a", "b", "join", "select", "gate", "unknown"].map(
      (id) => ({ id, sectionId: "Intake" })
    )
    const edges = [
      { id: "ra", source: "root", target: "a" },
      { id: "ra2", source: "root", target: "a" },
      { id: "rb", source: "root", target: "b" },
      { id: "aj", source: "a", target: "join" },
      { id: "bj", source: "b", target: "join" },
      { id: "as", source: "a", target: "select" },
      { id: "bs", source: "b", target: "select" },
      { id: "gg", source: "gate", target: "gate" }
    ]
    const prepared = prepareNetworkAtlas(
      {
        ...circuit.atlas.spec,
        forest: {
          display: {
            kind: "rooted-backbone",
            roots: ["root"],
            rankingPolicyId: "rooted-traversal:id-asc"
          }
        }
      },
      { graphRef: "forms", revision: "1", nodes, edges, measureValues: [] }
    )
    if (!prepared.ok) throw new Error("fixture admission failed")
    const compiled = prepareFlowCircuit(
      prepared.atlas,
      nodes.map(({ id }) => ({
        nodeId: id,
        label: id,
        unit: "records",
        ...(id === "join"
          ? { join: { kind: "all" as const, memberNodeIds: ["a", "b"] } }
          : {}),
        ...(id === "select"
          ? {
              join: {
                kind: "first-success" as const,
                memberNodeIds: ["a", "b"]
              }
            }
          : {}),
        ...(id === "gate" ? { dependencyNodeIds: ["a"] } : {})
      }))
    )
    expect(
      compiled.modules.find((module) => module.nodeId === "join")?.kind
    ).toBe("join-all")
    expect(
      compiled.modules.find((module) => module.nodeId === "select")?.kind
    ).toBe("selector")
    expect(
      compiled.modules.find((module) => module.nodeId === "gate")?.kind
    ).toBe("dependency")
    const geometry = layoutFlowCircuit(compiled, 980, 860)
    expect(geometry.routes.map((route) => route.edgeId).sort()).toEqual(
      edges.map((edge) => edge.id).sort()
    )
    expect(
      geometry.routes.find((route) => route.edgeId === "gg")?.points.length
    ).toBeGreaterThan(3)
  })

  it("rejects malformed tapes, unknown ports, stale revisions and mixed observed/model provenance", () => {
    const { circuit, observed } = flowCircuitStory("etl")
    const clone = () => JSON.parse(JSON.stringify(observed)) as typeof observed
    const stale = clone()
    stale.analysisRevision = "stale"
    const missing = clone()
    missing.entries[0].flows.pop()
    const negative = clone()
    negative.entries[0].nodes.p1.queued = -1
    const duplicate = clone()
    duplicate.entries[1].at = 0
    const mislabeled = clone()
    mislabeled.kind = "modeled"
    const absentCount = clone()
    delete (absentCount.entries[0].nodes.p1 as { queued?: number | null })
      .queued
    const absentTotal = clone()
    delete (absentTotal.entries[0].totals as { queued?: number | null }).queued
    const wrongUnit = clone()
    Object.assign(wrongUnit.entries[0].flows[0], { unit: "jobs" })
    for (const bad of [
      stale,
      missing,
      negative,
      duplicate,
      mislabeled,
      absentCount,
      absentTotal,
      wrongUnit
    ])
      expect(() => admitCircuitEdition(circuit, bad)).toThrow()
    expect(
      exportCircuitEvidence(
        circuit,
        observed,
        readCircuitEdition(observed, "observed-snapshot", 60)
      )
    ).toMatchObject({
      synthetic: true,
      relationScopeId: "directed-admitted",
      edition: { kind: "observed", individualTimings: "unavailable" }
    })
    const reading = readCircuitEdition(observed, "observed-snapshot", 60)
    const tampered = {
      ...reading,
      entry: {
        ...reading.entry,
        totals: { ...reading.entry.totals, queued: 0 }
      }
    }
    expect(
      exportCircuitEvidence(circuit, observed, tampered).reading.entry.totals
        .queued
    ).toBe(1200000)
    expect(() =>
      exportCircuitEvidence(circuit, observed, { ...reading, observedAt: 10 })
    ).toThrow("tape cursor")
  })
})
