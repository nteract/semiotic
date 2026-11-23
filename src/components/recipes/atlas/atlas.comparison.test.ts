import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  prepareNetworkAtlas,
  prepareMotifBraid
} from "../../semiotic-atlas-core"
import { buildMotifProfile } from "./profile"
import { assignedDenominator, signedDifferenceBps } from "./compare"
import type { NetworkAtlasSource, NetworkAtlasSpec } from "./types"

function checkout(): { spec: NetworkAtlasSpec; source: NetworkAtlasSource } {
  return JSON.parse(
    readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../../../../scripts/network-atlas/fixtures/checkout-ab-v1.json"
      ),
      "utf8"
    )
  )
}

describe("Atlas partition rates", () => {
  it("compares each partition to the named reference using the two actual populations", () => {
    const { spec, source } = checkout()
    const [control, treatment] = spec.comparison!.partitions
    const third = "desktop/control"
    spec.comparison = {
      partitions: [third, treatment, control],
      referencePartition: control,
      denominatorMeasureId: "assigned",
      outcomeMeasureIds: ["purchases"],
      motifTemplates: ["repeated-state-episode"]
    }
    source.measureValues.find(
      (row) => row.subjectId === treatment && row.measureId === "assigned"
    )!.value = 75000
    const result = prepareNetworkAtlas(spec, source)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    const { differences } = prepareMotifBraid(result.atlas)
    expect(differences).toHaveLength(4)
    expect(differences.every((row) => row.leftPartition === control)).toBe(true)
    expect(
      differences.find(
        (row) =>
          row.motif === "repeated-state-episode" &&
          row.rightPartition === treatment
      )
    ).toMatchObject({
      leftCount: 1600,
      rightCount: 6000,
      deltaCount: 4400,
      deltaBps: 0,
      leftDenominator: 20000,
      rightDenominator: 75000
    })
    expect(
      differences.find(
        (row) => row.motif === "purchases" && row.rightPartition === treatment
      )?.deltaBps
    ).toBe(-840)
    expect(
      differences.filter((row) => row.rightPartition === third)
    ).toHaveLength(2)
  })

  it("derives legacy outcomes from observed measures and honors empty template selections", () => {
    const { spec, source } = checkout()
    spec.measures.releases = spec.measures.purchases
    delete spec.measures.purchases
    for (const row of source.measureValues)
      if (row.measureId === "purchases") row.measureId = "releases"
    delete spec.comparison!.outcomeMeasureIds
    spec.comparison!.motifTemplates = []
    const result = prepareNetworkAtlas(spec, source)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    const braid = prepareMotifBraid(result.atlas)
    expect(braid.differences.map((row) => row.motif)).toEqual([
      "loop-users",
      "releases"
    ])
    expect(braid.profile.templates).toEqual([])
    expect(braid.capsules).toEqual([])
  })

  it("rebuilds serialized legacy comparisons from their actual ledger", () => {
    const { spec, source } = checkout()
    const [left, right] = spec.comparison!.partitions
    delete spec.comparison!.referencePartition
    spec.comparison!.outcomeMeasureIds = ["__proto__"]
    spec.comparison!.motifTemplates = ["repeated-state-episode"]
    spec.measures = Object.fromEntries([
      ...Object.entries(spec.measures),
      ["__proto__", spec.measures.purchases]
    ])
    source.measureValues.push(
      {
        subjectId: left,
        measureId: "__proto__",
        value: 60,
        status: "estimated"
      },
      { subjectId: right, measureId: "__proto__", value: 80, status: "exact" }
    )
    const result = prepareNetworkAtlas(spec, source)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    result.atlas.comparison = {
      partitions: [left, right],
      denominatorMeasureId: "assigned",
      rows: [left, right].map((partition) => ({
        partition,
        assigned: 0,
        outcomes: { purchases: 0 },
        motifUsers: {}
      }))
    }
    const { differences, profile } = prepareMotifBraid(result.atlas)
    expect(new Set(profile.cells.map(cell => cell.denominator))).toEqual(new Set([40000]))
    expect(differences.filter(row => row.kind === "outcome")).toEqual([
      expect.objectContaining({
        leftPartition: left,
        rightPartition: right,
        motif: "__proto__",
        leftCount: 60,
        rightCount: 80,
        deltaBps: 10
      })
    ])
  })

  it.each(["motif occurrence", "occurrence denominator", "capacity denominator"])(
    "withholds deduplicated entity rates for %s units", mismatch => {
      const { spec, source } = checkout()
      spec.comparison!.outcomeMeasureIds = []
      if (mismatch === "motif occurrence") spec.motifs.countUnit = "occurrence"
      if (mismatch === "occurrence denominator") spec.measures.assigned.countUnit = "occurrence"
      if (mismatch === "capacity denominator") spec.measures.assigned.unitKind = "capacity"
      const result = prepareNetworkAtlas(spec, source)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      const braid = prepareMotifBraid(result.atlas)
      expect(braid.differences).toEqual([])
      expect(braid.unavailableDifferences).toContainEqual(expect.objectContaining({ kind: "motif", reason: "missing-count" }))
      expect(new Set(braid.profile.cells.map(cell => cell.status))).toEqual(new Set(["unknown"]))
    }
  )

  it("qualifies profile counts by the traces available in each partition", () => {
    const { spec, source } = checkout()
    const [left, right] = spec.comparison!.partitions
    delete spec.comparison!.motifTemplates
    source.occurrences = source.occurrences!.filter(row => row.partition === left)
    const statuses = (partition?: string) => {
      const result = prepareNetworkAtlas(spec, source)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      const cells = buildMotifProfile(result.atlas, { partition }).cells.filter(cell => cell.template === "fan-out")
      return [...new Set(cells.map(cell => cell.status))]
    }
    expect(statuses(right)).toEqual(["unknown"])
    expect(statuses(left)).toEqual(["exact"])
    expect(statuses()).toEqual(["incomplete"])
    source.occurrences[0].complete = false
    expect(statuses(left)).toEqual(["incomplete"])
    source.occurrences = []
    expect(statuses()).toEqual(["unknown"])
  })

  it("uses only the structural motif witnesses observed in each partition", () => {
    const { spec, source } = checkout()
    const [left, right] = spec.comparison!.partitions
    spec.comparison!.outcomeMeasureIds = []
    spec.comparison!.motifTemplates = ["fan-out"]
    source.nodes.push({ id: "unrelated" })
    source.occurrences = [
      {
        id: "left",
        partition: left,
        entityId: "shared",
        entityCount: 7,
        nodePath: ["checkout"],
        complete: true
      },
      {
        id: "other",
        partition: right,
        entityId: "shared",
        entityCount: 23,
        nodePath: ["unrelated"],
        complete: true
      },
      {
        id: "right",
        partition: right,
        entityId: "right-only",
        entityCount: 12,
        nodePath: ["checkout"],
        complete: true
      }
    ]
    const result = prepareNetworkAtlas(spec, source)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(prepareMotifBraid(result.atlas).differences).toEqual([
      expect.objectContaining({
        motif: "fan-out",
        leftCount: 7,
        rightCount: 12,
        deltaCount: 5
      })
    ])
  })

  it("reports unknown evidence separately when a population or outcome is missing", () => {
    const { spec, source } = checkout()
    const [left, right] = spec.comparison!.partitions
    spec.comparison!.motifTemplates = []
    spec.comparison!.outcomeMeasureIds = ["purchases"]
    const denominator = source.measureValues.find(
      (row) => row.subjectId === right && row.measureId === "assigned"
    )!
    denominator.value = 0
    function projection() {
      const result = prepareNetworkAtlas(spec, source)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      return prepareMotifBraid(result.atlas)
    }
    const zero = projection()
    expect(zero.differences).toEqual([])
    expect(zero.unavailableDifferences).toEqual([
      expect.objectContaining({
        leftPartition: left,
        rightPartition: right,
        motif: "purchases",
        status: "unknown",
        reason: "denominator"
      })
    ])
    denominator.value = 20000
    denominator.status = "incomplete"
    expect(projection().unavailableDifferences?.[0]?.reason).toBe("denominator")
    denominator.status = "exact"
    source.measureValues = source.measureValues.filter(
      (row) => !(row.subjectId === right && row.measureId === "purchases")
    )
    const absent = projection()
    expect(absent.differences).toEqual([])
    expect(absent.unavailableDifferences?.[0]?.reason).toBe("missing-count")
  })

  it.each(["exact", "incomplete"] as const)("keeps the first %s ledger entry when a partition names a node and section", status => {
    const { spec, source } = checkout()
    const partition = "checkout"
    const reference = spec.comparison!.partitions[0]
    spec.comparison!.partitions = [reference, partition]
    spec.comparison!.motifTemplates = []
    spec.comparison!.outcomeMeasureIds = ["purchases"]
    source.nodes.push({ id: "second-node", sectionId: partition })
    source.measureValues.push(
      { subjectId: partition, measureId: "assigned", value: 100, status },
      { subjectId: "second-node", measureId: "assigned", value: 200, status: "exact" },
      { subjectId: partition, measureId: "purchases", value: 8, status: "exact" }
    )
    const result = prepareNetworkAtlas(spec, source)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    const { differences, unavailableDifferences } = prepareMotifBraid(result.atlas)
    if (status === "exact") {
      expect(assignedDenominator(result.atlas, partition)).toBe(100)
      expect(differences[0]).toMatchObject({ rightDenominator: 100, rightCount: 8 })
    } else {
      expect(assignedDenominator(result.atlas, partition)).toBeUndefined()
      expect(differences).toEqual([])
      expect(unavailableDifferences?.[0]?.reason).toBe("denominator")
    }
  })

  it.each([{ missingPrehistory: true }, { complete: false }])("omits a motif count when only one partition has incomplete traces", partial => {
    const { spec, source } = checkout()
    const [left, right] = spec.comparison!.partitions
    spec.comparison!.partitions.push("desktop/control")
    spec.comparison!.outcomeMeasureIds = []
    spec.comparison!.motifTemplates = ["repeated-state-episode"]
    source.occurrences = source.occurrences!.filter(row => row.partition !== right || row.id === "mt-ordinary")
    Object.assign(source.occurrences.find(row => row.partition === right)!, partial)
    const result = prepareNetworkAtlas(spec, source)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    const braid = prepareMotifBraid(result.atlas)
    expect(braid.differences.map(row => row.rightPartition)).toEqual(["desktop/control"])
    expect(braid.unavailableDifferences).toEqual([{
      motif: "repeated-state-episode", kind: "motif", leftPartition: left, rightPartition: right,
      status: "unknown", reason: "missing-count"
    }])
  })

  it.each(["missing", "unknown", "incomplete", "estimated"] as const)("propagates a %s population through scoped and global profiles", state => {
    for (const global of [false, true]) {
      const { spec, source } = checkout()
      const id = global ? "global-count" : spec.comparison!.partitions[1]
      if (global) {
        delete spec.comparison
        source.measureValues = source.measureValues.filter(entry => entry.measureId !== "assigned")
        source.measureValues.push({ subjectId: id, measureId: "assigned", value: 300, status: "exact" })
      }
      const entry = source.measureValues.find(row => row.subjectId === id && row.measureId === "assigned")!
      if (state === "missing") source.measureValues = source.measureValues.filter(row => row !== entry)
      else entry.status = state
      const result = prepareNetworkAtlas(spec, source)
      if (!result.ok) throw new Error(JSON.stringify(result.issues))
      const cells = buildMotifProfile(result.atlas, { templates: ["repeated-state-episode"] }).cells
      expect(cells.length).toBeGreaterThan(0)
      for (const cell of cells) {
        expect(cell.denominatorStatus).toBe(state === "missing" ? "unknown" : state)
        expect(cell.status).toBe(cell.denominatorStatus)
        if (state === "estimated") expect(cell.denominator).toBe(global ? 300 : 40000)
        else expect(cell.denominator).toBeNaN()
      }
    }
  })

  it("rejects stock outcome rates divided by a capacity", () => {
    const { spec, source } = checkout()
    spec.comparison!.outcomeMeasureIds = ["purchases"]
    spec.measures.assigned.unitKind = "capacity"
    const result = prepareNetworkAtlas(spec, source)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues).toContainEqual(expect.objectContaining({ kind: "comparison-outcome" }))
  })

  it("reports unavailable matchers independently of observed zeroes", () => {
    const { spec, source } = checkout()
    const result = prepareNetworkAtlas(spec, source)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    const profile = buildMotifProfile(result.atlas, { templates: ["split-rejoin-diamond", "repeated-state-episode"] })
    expect(profile.cells.filter(cell => cell.template === "split-rejoin-diamond").map(cell => cell.status))
      .toEqual(profile.sections.map(() => "unknown"))
    expect(profile.cells.some(cell => cell.template === "repeated-state-episode" && cell.completionCount === 0 && cell.status === "exact")).toBe(true)
  })

  it("keeps truncated motif counts out of rate differences without suppressing other templates", () => {
    const { spec, source } = checkout()
    spec.comparison!.motifTemplates = ["fan-out", "repeated-state-episode"]
    spec.comparison!.outcomeMeasureIds = []
    spec.motifs.matchBudget = 1
    const result = prepareNetworkAtlas(spec, source)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    const braid = prepareMotifBraid(result.atlas)
    expect(new Set(braid.profile.cells.filter(cell => cell.template === "fan-out").map(cell => cell.status))).toEqual(new Set(["incomplete"]))
    expect(new Set(braid.profile.cells.filter(cell => cell.template === "repeated-state-episode").map(cell => cell.status))).toEqual(new Set(["exact"]))
    expect(braid.differences.map(row => row.motif)).toEqual(["repeated-state-episode"])
    expect(braid.unavailableDifferences).toEqual([expect.objectContaining({ motif: "fan-out", reason: "missing-count" })])
  })

  it("validates comparison selections before deriving the rows", () => {
    const { spec, source } = checkout()
    spec.comparison!.partitions = ["duplicate", "duplicate"]
    spec.comparison!.referencePartition = "absent"
    spec.comparison!.outcomeMeasureIds = ["undeclared"]
    spec.comparison!.motifTemplates = ["connector-bypass"]
    const result = prepareNetworkAtlas(spec, source)
    expect(result.ok).toBe(false)
    if (result.ok)
      throw new Error("Invalid comparisons must report their diagnostics")
    expect(result.issues.map((issue) => issue.kind)).toEqual(
      expect.arrayContaining([
        "comparison-partitions",
        "comparison-outcome",
        "comparison-template"
      ])
    )
  })

  it("rounds equal deltas consistently and refuses invalid denominators", () => {
    expect([
      signedDifferenceBps(0, 1, 3),
      signedDifferenceBps(1, 2, 3),
      signedDifferenceBps(2, 1, 3)
    ]).toEqual([3333, 3333, -3333])
    expect(signedDifferenceBps(0, 1, 0)).toBeNull()
    expect(signedDifferenceBps(0, 1, -2)).toBeNull()
    expect(signedDifferenceBps(0, 1, Number.MIN_VALUE)).toBeNull()
  })
})
