import { describe, expect, it } from "vitest"
import {
  attachmentYRange,
  computeProcessSankeyLayout,
} from "../../../../../src/components/charts/network/processSankey/algorithm"
import {
  GERMANY_DOMAIN,
  GERMANY_ENDPOINT_ATOMS,
  GERMANY_EXTERNAL_FLOWS,
  GERMANY_METRICS,
  GERMANY_PROCESS_EDGES,
  GERMANY_PROCESS_NODES,
  GERMANY_RIVER_METADATA,
  GERMANY_STAGES,
  germanyStageById,
} from "./germanyStillBecoming"

function renderedBandRange(sample, centerline, valueScale) {
  const boundary = centerline + (sample.boundaryOffset ?? 0) * valueScale
  return [
    boundary - sample.topMass * valueScale,
    boundary + sample.botMass * valueScale,
  ]
}

function expectBundleToPartitionBand(nodeId, ranges, bandRange) {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  expect(sorted[0][0], `${nodeId}: bundle top`).toBeCloseTo(bandRange[0], 6)
  for (let index = 1; index < sorted.length; index += 1) {
    expect(
      sorted[index][0],
      `${nodeId}: gap or overlap before ribbon ${index}`,
    ).toBeCloseTo(sorted[index - 1][1], 6)
  }
  expect(sorted.at(-1)[1], `${nodeId}: bundle bottom`).toBeCloseTo(bandRange[1], 6)
}

describe("Germany history river adapter", () => {
  it("adapts the research dataset without dropping its conserved core", () => {
    expect(GERMANY_ENDPOINT_ATOMS).toHaveLength(GERMANY_RIVER_METADATA.counts.endpoint_atoms)
    expect(GERMANY_STAGES).toHaveLength(GERMANY_RIVER_METADATA.counts.stages)
    expect(GERMANY_PROCESS_NODES).toHaveLength(GERMANY_RIVER_METADATA.counts.nodes)
    expect(GERMANY_PROCESS_EDGES).toHaveLength(GERMANY_RIVER_METADATA.counts.links)
  })

  it("keeps every transition inside the display domain and attached to real containers", () => {
    const nodeIds = new Set(GERMANY_PROCESS_NODES.map((node) => node.id))
    for (const edge of GERMANY_PROCESS_EDGES) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
      expect(edge.startTime).toBeGreaterThanOrEqual(GERMANY_DOMAIN[0])
      expect(edge.endTime).toBeLessThanOrEqual(GERMANY_DOMAIN[1])
      expect(edge.endTime).toBeGreaterThan(edge.startTime)
    }
  })

  it("conserves one hundred percent for every metric at every historical transition", () => {
    for (let order = 0; order < GERMANY_STAGES.length - 1; order += 1) {
      const transition = GERMANY_PROCESS_EDGES.filter((edge) => edge.source_stage === `S${String(order).padStart(2, "0")}`)
      for (const metric of GERMANY_METRICS) {
        const total = transition.reduce((sum, edge) => sum + edge[metric.id], 0)
        expect(total).toBeCloseTo(100, 6)
      }
    }
  })

  it("ends with exactly one Germany node carrying the complete endpoint", () => {
    const endpoint = GERMANY_PROCESS_NODES.find((node) => node.id === "S11_GERMANY")
    for (const metric of GERMANY_METRICS) expect(endpoint[metric.id]).toBeCloseTo(100, 8)
  })

  it("keeps incompatible external gains and losses outside the conserved width scale", () => {
    expect(GERMANY_PROCESS_EDGES.every((edge) => edge.scope === "core")).toBe(true)
    expect(GERMANY_EXTERNAL_FLOWS.find((flow) => flow.external_flow_id === "X04")).toMatchObject({
      direction: "exit",
      metric_coverage: "lineage only",
    })
    expect(GERMANY_EXTERNAL_FLOWS.find((flow) => flow.external_flow_id === "X07")).toMatchObject({
      direction: "entry",
      component_id: "ALSACE_LORRAINE",
    })
  })

  it("defaults an unknown reading position to the 1815 Confederation stage", () => {
    expect(germanyStageById("missing")).toMatchObject({ id: "S04", benchmark: "1815" })
  })

  it("keeps each arrival bundle flush with the node band it creates", () => {
    const edges = GERMANY_PROCESS_EDGES.map((edge) => ({
      ...edge,
      value: edge.balanced_pct_DE,
    }))
    const layout = computeProcessSankeyLayout(
      GERMANY_PROCESS_NODES.map((node) => ({ ...node })),
      edges,
      {
        plotH: 864,
        pairing: "temporal",
        packing: "reuse",
        laneOrder: "crossing-min+inside-out",
        lanePlacement: "hug",
        ribbonLane: "both",
        lifetimeMode: "full",
        domain: [...GERMANY_DOMAIN],
      },
    )

    const nodeIds = [...new Set(edges.map((edge) => edge.target))]
    for (const nodeId of nodeIds) {
      const incoming = edges.filter((edge) => edge.target === nodeId)
      const arrival = incoming[0].endTime
      expect(incoming.every((edge) => edge.endTime === arrival)).toBe(true)

      const data = layout.nodeData[nodeId]
      const centerline = layout.centerlines[nodeId]
      const ranges = incoming.map((edge) => attachmentYRange(
        data.localAttachments.get(edge.id),
        centerline,
        layout.valueScale,
      ))
      const settled = data.samples.filter((sample) => sample.t === arrival).at(-1)
      expectBundleToPartitionBand(
        nodeId,
        ranges,
        renderedBandRange(settled, centerline, layout.valueScale),
      )
    }
  })

  it("keeps each full departure bundle flush with the settled node band", () => {
    const edges = GERMANY_PROCESS_EDGES.map((edge) => ({
      ...edge,
      value: edge.balanced_pct_DE,
    }))
    const layout = computeProcessSankeyLayout(
      GERMANY_PROCESS_NODES.map((node) => ({ ...node })),
      edges,
      {
        plotH: 864,
        pairing: "temporal",
        packing: "reuse",
        laneOrder: "crossing-min+inside-out",
        lanePlacement: "hug",
        ribbonLane: "both",
        lifetimeMode: "full",
        domain: [...GERMANY_DOMAIN],
      },
    )

    const nodeIds = [...new Set(edges.map((edge) => edge.source))]
    for (const nodeId of nodeIds) {
      const outgoing = edges.filter((edge) => edge.source === nodeId)
      const departure = outgoing[0].startTime
      expect(outgoing.every((edge) => edge.startTime === departure)).toBe(true)

      const data = layout.nodeData[nodeId]
      const centerline = layout.centerlines[nodeId]
      const ranges = outgoing.map((edge) => attachmentYRange(
        data.localAttachments.get(edge.id),
        centerline,
        layout.valueScale,
      ))
      const settled = data.samples.filter((sample) => sample.t < departure).at(-1)
      expectBundleToPartitionBand(
        nodeId,
        ranges,
        renderedBandRange(settled, centerline, layout.valueScale),
      )
    }
  })
})
