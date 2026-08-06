import { describe, expect, it } from "vitest"
import {
  CHAPTERS,
  CLAIM_CLASS_META,
  CLAIM_LEDGER,
  COMPANION_PROMISE_VS_ASSOCIATION,
  COURT_NODES,
  DEFAULT_SCARCITY_PARAMETERS,
  PALACE_EDGES,
  PALACE_ROOMS,
  RECIPE_MANIFESTS,
  RECIPE_CLAIM_CLASSES,
  SCARCITY_BEFORE_PARAMETERS,
  SCARCITY_GOODS,
  SOURCE_MANIFEST,
  courtEdges,
  scarcityAllocation,
  scarcityProcess,
} from "./lastScarcityData"
import {
  ATUS_COMPARISON_PROFILES,
  ATUS_PROFILE_CATEGORIES,
} from "./atusProfiles"
import { getExampleDefinition } from "../exampleDefinitions"

describe("The Last Scarcity argument model", () => {
  it("keeps chapter, claim, source, and recipe identifiers deterministic", () => {
    expect(new Set(CHAPTERS.map((chapter) => chapter.id)).size).toBe(CHAPTERS.length)
    expect(new Set(CLAIM_LEDGER.map((claim) => claim.id)).size).toBe(CLAIM_LEDGER.length)
    expect(new Set(SOURCE_MANIFEST.map((source) => source.id)).size).toBe(SOURCE_MANIFEST.length)

    const chapterIds = new Set(CHAPTERS.map((chapter) => chapter.id))
    const sourceIds = new Set(SOURCE_MANIFEST.map((source) => source.id))
    CLAIM_LEDGER.forEach((claim) => {
      expect(CLAIM_CLASS_META[claim.claimClass]).toBeTruthy()
      expect(claim.chapters.length).toBeGreaterThan(0)
      claim.chapters.forEach((chapterId) => expect(chapterIds.has(chapterId)).toBe(true))
      claim.sourceIds.forEach((sourceId) => expect(sourceIds.has(sourceId)).toBe(true))
    })

    CHAPTERS.forEach((chapter) => {
      const recipe = RECIPE_MANIFESTS[chapter.id]
      expect(recipe).toBeTruthy()
      expect(recipe.id).toMatch(/^semiotic\.recipe\./)
      expect(recipe.designContract.whyThisForm).toBeTruthy()
      expect(recipe.reception.strengths.length).toBeGreaterThan(0)
      expect(recipe.accessibility.navigationGranularity).toBeTruthy()
      expect(RECIPE_CLAIM_CLASSES[chapter.id].length).toBeGreaterThan(0)
    })
  })

  it("keeps the example registry inventory synchronized with the checked-in model", () => {
    const inventory = getExampleDefinition("/examples/the-last-scarcity")
      .contract.data.fixture.inventory
    expect(inventory).toEqual({
      chapters: CHAPTERS.length,
      sources: SOURCE_MANIFEST.length,
      claims: CLAIM_LEDGER.length,
      recipes: Object.keys(RECIPE_MANIFESTS).length,
    })
  })

  it("backs every Palace and Court relationship with a claim", () => {
    const claimIds = new Set(CLAIM_LEDGER.map((claim) => claim.id))
    const roomIds = new Set(PALACE_ROOMS.map((room) => room.id))
    const courtNodeIds = new Set(COURT_NODES.map((node) => node.id))

    PALACE_EDGES.forEach((edge) => {
      expect(roomIds.has(edge.source)).toBe(true)
      expect(roomIds.has(edge.target)).toBe(true)
      expect(claimIds.has(edge.claimId)).toBe(true)
      expect(CLAIM_CLASS_META[edge.claimClass]).toBeTruthy()
    })

    for (const settings of [
      { beatId: "cheap-praise" },
      { beatId: "orchid-gaze" },
      { beatId: "refusal" },
    ]) {
      courtEdges(settings).forEach((edge) => {
        expect(courtNodeIds.has(edge.source)).toBe(true)
        expect(courtNodeIds.has(edge.target)).toBe(true)
        expect(claimIds.has(edge.claimId)).toBe(true)
        expect(CLAIM_CLASS_META[edge.claimClass]).toBeTruthy()
      })
    }
    expect(courtEdges({ beatId: "cheap-praise" }).filter((e) => e.relation === "praise").length).toBeGreaterThan(
      courtEdges({ beatId: "orchid-gaze" }).filter((e) => e.relation === "praise").length,
    )
    expect(courtEdges({ beatId: "orchid-gaze" }).filter((e) => e.target === "orchid").length).toBeGreaterThan(
      courtEdges({ beatId: "cheap-praise" }).filter((e) => e.target === "orchid").length,
    )
  })

  it("conserves exactly 100 scenario units across parameter extremes", () => {
    const parameterIds = Object.keys(DEFAULT_SCARCITY_PARAMETERS)
    const settings = [
      DEFAULT_SCARCITY_PARAMETERS,
      Object.fromEntries(parameterIds.map((id) => [id, 0])),
      Object.fromEntries(parameterIds.map((id) => [id, 100])),
      ...parameterIds.flatMap((parameterId) => [0, 100].map((value) => ({
        ...DEFAULT_SCARCITY_PARAMETERS,
        [parameterId]: value,
      }))),
    ]

    settings.forEach((parameters) => {
      const allocation = scarcityAllocation(parameters)
      const process = scarcityProcess(parameters)
      expect(allocation.reduce((sum, good) => sum + good.value, 0)).toBe(100)
      expect(process.before.reduce((sum, good) => sum + good.value, 0)).toBe(100)
      expect(process.after.reduce((sum, good) => sum + good.value, 0)).toBe(100)
      expect(process.edges.reduce((sum, edge) => sum + edge.value, 0)).toBe(100)
      expect(process.edges.every((edge) => edge.claimClass === "transparent-model")).toBe(true)
      expect(process.edges.every((edge) => edge.caveat.includes("not a forecast"))).toBe(true)
      expect(process.nodes).toHaveLength(SCARCITY_GOODS.length * 2)
      expect(process.nodes.some((node) => node.stage === "before")).toBe(true)
      expect(process.nodes.some((node) => node.stage === "after")).toBe(true)
      expect(process.deltas.reduce((sum, row) => sum + row.delta, 0)).toBe(0)
    })
  })

  it("migrates residual competition when abundance rises from the baseline", () => {
    const process = scarcityProcess(DEFAULT_SCARCITY_PARAMETERS)
    const baseline = scarcityAllocation(SCARCITY_BEFORE_PARAMETERS)
    expect(process.before).toEqual(baseline)
    expect(process.migrated).toBeGreaterThan(0)
    expect(process.edges.some((edge) => edge.kind === "migrate")).toBe(true)
    expect(process.edges.some((edge) => edge.kind === "stay")).toBe(true)
    // High abundance should pull units out of copyable production toward scarcer goods.
    const beforeReproducible = process.before
      .filter((row) => row.kind === "reproducible")
      .reduce((sum, row) => sum + row.value, 0)
    const afterReproducible = process.after
      .filter((row) => row.kind === "reproducible")
      .reduce((sum, row) => sum + row.value, 0)
    expect(afterReproducible).toBeLessThan(beforeReproducible)
  })

  it("keeps companion promise series clearly separate from measured associations", () => {
    expect(COMPANION_PROMISE_VS_ASSOCIATION).toHaveLength(4)
    COMPANION_PROMISE_VS_ASSOCIATION.forEach((row, index) => {
      expect(row.x).toBe(index)
      expect(Number.isFinite(row.promise)).toBe(true)
      expect(Number.isFinite(row.associated)).toBe(true)
      expect(row.note.length).toBeGreaterThan(20)
    })
    expect(COMPANION_PROMISE_VS_ASSOCIATION.find((row) => row.id === "wellbeing")?.associated).toBe(-0.48)
  })

  it("keeps published ATUS values separate from disclosed ring-closure adjustments", () => {
    expect(ATUS_COMPARISON_PROFILES).toHaveLength(4)
    ATUS_COMPARISON_PROFILES.forEach((profile) => {
      expect(profile.segments).toHaveLength(ATUS_PROFILE_CATEGORIES.length)
      expect(profile.geometryValues.reduce((sum, value) => sum + value, 0)).toBeCloseTo(24, 8)
      expect(profile.closureAdjustment).toBeCloseTo(24 - profile.publishedSum, 8)
      profile.segments.forEach((segment, index) => {
        expect(segment.publishedHours).toBe(profile.publishedValues[index])
      })
    })
  })
})
