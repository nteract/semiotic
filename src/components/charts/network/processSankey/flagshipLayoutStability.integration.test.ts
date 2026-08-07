import { describe, expect, it } from "vitest"
import {
  computeProcessSankeyLayout,
  type ProcessSankeyEdge,
  type ProcessSankeyNode,
} from "./algorithm"
// @ts-expect-error -- This authored docs fixture is JavaScript; its layout shape is asserted below.
import * as germanyFixture from "../../../../../docs/src/pages/examples/data/germanyStillBecoming.js"
// @ts-expect-error -- This authored docs fixture is JavaScript; its layout shape is asserted below.
import * as goodEarthFixture from "../../../../../docs/src/pages/examples/data/goodEarthLyingFlat.js"
// @ts-expect-error -- This authored docs fixture is JavaScript; its layout shape is asserted below.
import * as apolloFixture from "../../../../../docs/src/pages/examples/data/apolloLunarChoreography.js"

const {
  GERMANY_DOMAIN,
  GERMANY_PROCESS_EDGES,
  GERMANY_PROCESS_NODES,
} = germanyFixture
const {
  GOOD_EARTH_DOMAIN,
  GOOD_EARTH_PROCESS_EDGES,
  GOOD_EARTH_PROCESS_NODES,
} = goodEarthFixture
const { processDataForFocus } = apolloFixture

type GermanyEdge = ProcessSankeyEdge & { balanced_pct_DE: number }
type ProcessFixture = {
  nodes: ProcessSankeyNode[]
  edges: ProcessSankeyEdge[]
  domain: [number, number]
}

const historyRiverOptions = {
  pairing: "temporal" as const,
  packing: "reuse" as const,
  laneOrder: "crossing-min+inside-out" as const,
  lanePlacement: "hug" as const,
  ribbonLane: "both" as const,
  lifetimeMode: "full" as const,
}

function slotMembers(layout: ReturnType<typeof computeProcessSankeyLayout>): string[][] {
  return layout.slots.map((slot) => slot.occupants
    .map((occupant) => occupant.id)
    .sort())
}

describe("flagship ProcessSankey layout stability", () => {
  it("preserves Germany's established sixteen-row history river", () => {
    const domain = GERMANY_DOMAIN as [number, number]
    const layout = computeProcessSankeyLayout(
      (GERMANY_PROCESS_NODES as ProcessSankeyNode[]).map((node) => ({ ...node })),
      (GERMANY_PROCESS_EDGES as GermanyEdge[]).map((edge) => ({
        ...edge,
        value: edge.balanced_pct_DE,
      })),
      {
        ...historyRiverOptions,
        plotH: 864,
        domain: [...domain],
      },
    )

    const rowRepresentatives = [
      "S00_BAVARIAN",
      "S00_FRANKISH",
      "S00_DANISH_SAXON_FRONTIER",
      "S00_FRISIAN",
      "S00_SLAVIC_EASTERN",
      "S10_THURINGIA",
      "S11_GERMANY",
      "S00_ALEMANNIC_SWABIAN",
      "S01_THURINGIA",
      "S00_THURINGIAN",
      "S02_ELECTORAL_PALATINATE",
      "S02_SCHLESWIG_HOLSTEIN",
      "S02_WELF_WESTPHALIA",
      "S02_WETTIN_LANDS",
      "S02_WUERTTEMBERG_SWABIA",
      "S03_WUERTTEMBERG_SWABIA",
    ]
    expect(layout.slots).toHaveLength(rowRepresentatives.length)
    expect(rowRepresentatives.map((id) => layout.slotByNode[id])).toEqual(
      rowRepresentatives.map((_, index) => index),
    )

    // Protect the central constitutional spine and the eastern postwar spine,
    // whose long straight continuities define the example's visual argument.
    expect(new Set([
      "S05_NORTH_GERMAN_CONFED",
      "S06_GERMAN_EMPIRE",
      "S07_WEIMAR_GERMANY",
      "S08_WESTERN_ZONES",
      "S11_GERMANY",
    ].map((id) => layout.slotByNode[id])).size).toBe(1)
    expect(new Set([
      "S08_SOVIET_ZONE",
      "S09_GDR",
      "S10_BRANDENBURG",
    ].map((id) => layout.slotByNode[id])).size).toBe(1)
  })

  it("preserves Good Earth's five authored causal rows", () => {
    const domain = GOOD_EARTH_DOMAIN as [number, number]
    const layout = computeProcessSankeyLayout(
      (GOOD_EARTH_PROCESS_NODES as ProcessSankeyNode[]).map((node) => ({ ...node })),
      (GOOD_EARTH_PROCESS_EDGES as ProcessSankeyEdge[]).map((edge) => ({ ...edge })),
      {
        ...historyRiverOptions,
        plotH: 1004,
        domain: [...domain],
        nodeSizing: "max",
      },
    )

    expect(slotMembers(layout)).toEqual([
      ["rat_people"],
      [
        "credential_race",
        "credential_security",
        "defensive_stability",
        "growth_bargain",
        "job_mismatch",
        "private_retreat",
      ],
      [
        "delayed_family",
        "involution",
        "lying_flat",
        "overwork_norm",
        "scarcity_memory",
      ],
      [
        "confidence_loss",
        "consumption_success",
        "precaution",
        "status_competition",
        "weak_consumption",
      ],
      ["affordability", "housing_machine", "property_security"],
    ])
  })

  it("preserves Apollo's four flight-plan rows", () => {
    const processData = (processDataForFocus as (focus: string) => ProcessFixture)("all")
    const layout = computeProcessSankeyLayout(
      processData.nodes.map((node) => ({ ...node })),
      processData.edges.map((edge) => ({ ...edge })),
      {
        ...historyRiverOptions,
        plotH: 476,
        lifetimeMode: "half",
        domain: [...processData.domain],
        maxValueScale: 4.8,
      },
    )

    expect(slotMembers(layout)).toEqual([
      ["LIFEBOAT", "RECOVERY"],
      ["LOW PASS"],
      ["LAUNCH", "LUNAR ORBIT"],
      ["SURFACE"],
    ])
    expect(layout.layoutQuality.crossings).toBe(0)
  })
})
