import { describe, expect, it } from "vitest"
import {
  attachmentYRange,
  buildBandCutoutsForNode,
  computeProcessSankeyLayout,
  validateProcessSankey,
} from "../../../../../src/components/charts/network/processSankey/algorithm"
import {
  computeProcessSankeyRibbonInputs,
  synchronizeProcessSankeyFeederBatches,
} from "../../../../../src/components/charts/network/processSankey/ribbonInputs"
import {
  computeFeederRibbonRunwayStarts,
  computeFeederVisualDepartureTimes,
  indexFeederVisualDepartures,
  projectFeederBandSamples,
} from "../../../../../src/components/charts/network/processSankey/ribbonRunway"
import {
  US_AXIS_TICKS,
  US_COLORS,
  US_CORE_NODE_IDS,
  US_DOMAIN,
  US_EVENTS,
  US_MILESTONES,
  US_PROCESS_EDGES,
  US_PROCESS_NODES,
  US_SOURCES,
  US_WIDTH_UNIT,
  usNodeLabel,
} from "./unitedStatesHistoryRiver"
import runtimeRiverSource from "./unitedStatesHistoryRiver.source.generated"

const EPSILON = 1e-9

function processLayout() {
  return computeProcessSankeyLayout(
    US_PROCESS_NODES,
    US_PROCESS_EDGES,
    {
      plotH: 900,
      pairing: "temporal",
      packing: "reuse",
      laneOrder: "crossing-min+inside-out",
      lanePlacement: "hug",
      ribbonLane: "both",
      lifetimeMode: "full",
      domain: [...US_DOMAIN],
    },
  )
}

function logicalInventory(nodeId) {
  const events = []
  for (const edge of US_PROCESS_EDGES) {
    if (edge.target === nodeId) events.push({ time: edge.endTime, delta: edge.value })
    if (edge.source === nodeId) events.push({ time: edge.startTime, delta: -edge.value })
  }
  events.sort((a, b) => a.time - b.time || b.delta - a.delta)
  let balance = 0
  let minimum = 0
  for (const event of events) {
    balance += event.delta
    minimum = Math.min(minimum, balance)
  }
  return { balance, minimum }
}

function lifecycleInventory(nodeId, time) {
  let balance = 0
  for (const edge of US_PROCESS_EDGES) {
    if (edge.target === nodeId && edge.endTime <= time) balance += edge.value
    if (edge.source === nodeId && edge.startTime <= time) balance -= edge.value
    if (edge.target === nodeId && edge.systemOutTime <= time) balance -= edge.value
  }
  return balance
}

function renderedBandRange(sample, centerline, valueScale) {
  const boundary = centerline + (sample.boundaryOffset ?? 0) * valueScale
  return [
    boundary - sample.topMass * valueScale,
    boundary + sample.botMass * valueScale,
  ]
}

function endpointRadius(p0, p1, p2) {
  const dx = 3 * (p1.x - p0.x)
  const dy = 3 * (p1.y - p0.y)
  const ddx = 6 * (p2.x - 2 * p1.x + p0.x)
  const ddy = 6 * (p2.y - 2 * p1.y + p0.y)
  const cross = Math.abs(dx * ddy - dy * ddx)
  return cross === 0 ? Infinity : Math.pow(dx * dx + dy * dy, 1.5) / cross
}

function minimumEndpointRadius(geometry) {
  const sourceCenter = (geometry.sTop + geometry.sBot) / 2
  const targetCenter = (geometry.tTop + geometry.tBot) / 2
  const points = [
    { x: geometry.sx, y: sourceCenter },
    { x: geometry.cp1X, y: sourceCenter },
    { x: geometry.cp2X, y: targetCenter },
    { x: geometry.tx, y: targetCenter },
  ]
  return Math.min(
    endpointRadius(points[0], points[1], points[2]),
    endpointRadius(points[3], points[2], points[1]),
  )
}

function strictlyBetween(value, first, second) {
  return value > Math.min(first, second) + 1e-6 &&
    value < Math.max(first, second) - 1e-6
}

describe("United States persistent-process adapter", () => {
  it("keeps the compact browser projection aligned with adapter exports", () => {
    expect(new Set(runtimeRiverSource.events.map((event) => event.event_id))).toEqual(
      new Set(US_MILESTONES.flatMap((milestone) => milestone.eventIds)),
    )
    expect(US_EVENTS.map((event) => event.id)).toEqual(
      runtimeRiverSource.events.map((event) => event.event_id),
    )
    expect(US_SOURCES.map((source) => source.id)).toEqual(
      runtimeRiverSource.sources.map((source) => source.source_key),
    )
  })


  it("defines three distinct, unbonded U.S. institutions with the authored blue scale", () => {
    expect(US_CORE_NODE_IDS).toEqual({
      states: "US_STATES",
      territories: "US_TERRITORIES",
      colonies: "US_COLONIES",
    })

    const states = US_PROCESS_NODES.find((node) => node.id === US_CORE_NODE_IDS.states)
    const territories = US_PROCESS_NODES.find((node) => node.id === US_CORE_NODE_IDS.territories)
    const colonies = US_PROCESS_NODES.find((node) => node.id === US_CORE_NODE_IDS.colonies)

    expect(states).toMatchObject({ label: "United States", category: "states", xExtent: [1776, 2025] })
    expect(territories).toMatchObject({ label: "United States Territories", category: "territories", xExtent: [1783, 2025] })
    expect(colonies).toMatchObject({ label: "United States Colonies", category: "colonies" })
    expect(US_COLORS).toMatchObject({
      states: "#173f6b",
      territories: "#4f82b5",
      colonies: "#9bc9e2",
    })
    for (const node of [states, territories, colonies]) {
      expect(node.group).toBeUndefined()
      expect(node.bondGroup).toBeUndefined()
    }
  })

  it("forms the United States in 1776 from exactly three regional colony bundles", () => {
    const founding = US_PROCESS_EDGES.filter((edge) => edge.eventType === "founding")
    expect(founding).toHaveLength(3)
    expect(founding.map((edge) => edge.source)).toEqual([
      "NEW_ENGLAND_COLONIES",
      "MIDDLE_COLONIES",
      "SOUTHERN_COLONIES",
    ])
    expect(founding.map((edge) => edge.value)).toEqual([4, 4, 5])
    expect(founding.every((edge) => edge.target === US_CORE_NODE_IDS.states)).toBe(true)
    expect(founding.every((edge) => Math.floor(edge.endTime) === 1776)).toBe(true)
    expect(founding.flatMap((edge) => edge.members)).toHaveLength(13)

    const foundingNodes = new Map(US_PROCESS_NODES.map((node) => [node.id, node]))
    expect(foundingNodes.get("MIDDLE_COLONIES")).toMatchObject({
      group: "founding-regions",
      category: "foundingRed",
    })
    expect(foundingNodes.get("NEW_ENGLAND_COLONIES")).toMatchObject({
      group: "founding-regions",
      category: "foundingWhite",
    })
    expect(foundingNodes.get("SOUTHERN_COLONIES")).toMatchObject({
      group: "founding-regions",
      category: "foundingBlue",
    })
    expect(US_COLORS).toMatchObject({
      foundingRed: "#9a443f",
      foundingWhite: "#d2d0c8",
      foundingBlue: "#315c94",
    })
  })

  it("distinguishes inherited pre-domain sources from events that open inside the history window", () => {
    // Domain opens in 1763. Every territorial acquisition and colonial holding
    // in the authored ledger either begins inside the window or is introduced
    // by a post-domain event, so no edge carries a pre-domain systemInTime.
    // Founding and the 1783 interior cession are pure in-window openings.
    const preDomain = US_PROCESS_EDGES
      .filter((edge) => edge.systemInTime != null && edge.systemInTime < US_DOMAIN[0])
      .map((edge) => edge.id)
    const founding = US_PROCESS_EDGES.filter((edge) => edge.eventType === "founding")
    const interiorCessions = US_PROCESS_EDGES.find(
      (edge) => edge.id === "ACQUIRE_TREATY_1783_INTERIOR",
    )

    expect(preDomain).toEqual([])
    expect(founding.every((edge) => edge.systemInTime == null)).toBe(true)
    expect(interiorCessions.systemInTime).toBeUndefined()
  })

  it("uses the territorial institution as inventory before statehood", () => {
    const statehood = US_PROCESS_EDGES.filter((edge) => edge.eventType === "statehood")
    expect(statehood).toHaveLength(32)
    expect(statehood.every((edge) => edge.source === US_CORE_NODE_IDS.territories)).toBe(true)
    expect(statehood.every((edge) => edge.target === US_CORE_NODE_IDS.states)).toBe(true)
    expect(statehood.every((edge) => edge.value === 1 && edge.members.length === 1)).toBe(true)
    expect(statehood.some((edge) => edge.members.includes("California"))).toBe(true)
    expect(statehood.some((edge) => edge.members.includes("Alaska"))).toBe(true)
    expect(statehood.some((edge) => edge.members.includes("Hawaii"))).toBe(true)
  })

  it("drains eleven state threads during secession and restores the same eleven", () => {
    const secession = US_PROCESS_EDGES.filter((edge) => edge.eventType === "secession")
    const restoration = US_PROCESS_EDGES.filter((edge) => edge.eventType === "restoration")
    expect(secession.reduce((sum, edge) => sum + edge.value, 0)).toBe(11)
    expect(restoration.reduce((sum, edge) => sum + edge.value, 0)).toBe(11)
    expect(new Set(secession.flatMap((edge) => edge.memberCodes))).toEqual(
      new Set(restoration.flatMap((edge) => edge.memberCodes)),
    )
    expect(secession.every((edge) => edge.source === US_CORE_NODE_IDS.states && edge.target === "CONFEDERATE_STATES")).toBe(true)
    expect(restoration.every((edge) => edge.source === "CONFEDERATE_STATES" && edge.target === US_CORE_NODE_IDS.states)).toBe(true)
  })

  it("renders colonial repatriation as lifecycle exits, including both Cuban occupations and the Philippines", () => {
    const colonialInflows = US_PROCESS_EDGES.filter((edge) => edge.target === US_CORE_NODE_IDS.colonies)
    const philippines = colonialInflows.find((edge) => edge.holdingId === "PHILIPPINES")
    const cuba = colonialInflows.filter((edge) => edge.holdingId?.startsWith("CUBA_OCCUPATION"))

    expect(philippines).toMatchObject({ systemOutLabel: "Philippine independence" })
    expect(philippines.systemOutTime).toBeCloseTo(1946.5, 1)
    expect(cuba).toHaveLength(2)
    expect(cuba.map((edge) => Math.floor(edge.systemOutTime))).toEqual([1902, 1909])
    expect(colonialInflows.length).toBeGreaterThanOrEqual(7)
    expect(colonialInflows.every((edge) => edge.systemOutTime > edge.endTime)).toBe(true)
    expect(US_PROCESS_EDGES.some((edge) => edge.source === US_CORE_NODE_IDS.colonies)).toBe(false)
    expect(lifecycleInventory(US_CORE_NODE_IDS.colonies, 2000)).toBe(0)
  })

  it("has a valid forward-moving ledger whose central inventories never go negative", () => {
    expect(validateProcessSankey(US_PROCESS_NODES, US_PROCESS_EDGES, US_DOMAIN)).toEqual([])
    for (const edge of US_PROCESS_EDGES) {
      expect(edge.startTime).toBeGreaterThanOrEqual(US_DOMAIN[0])
      expect(edge.endTime).toBeLessThanOrEqual(US_DOMAIN[1])
      expect(edge.endTime).toBeGreaterThan(edge.startTime)
      expect(edge.value).toBeGreaterThan(0)
    }
    expect(logicalInventory(US_CORE_NODE_IDS.states)).toEqual({ balance: 50, minimum: 0 })
    expect(logicalInventory(US_CORE_NODE_IDS.territories)).toEqual({ balance: 5, minimum: 0 })
    expect(logicalInventory("CONFEDERATE_STATES")).toEqual({ balance: 0, minimum: 0 })
  })

  it("starts each core band at its first real inflow and keeps the three lanes separate", () => {
    const layout = processLayout()
    const firstNonZero = (nodeId) => layout.nodeData[nodeId].samples.find(
      (sample) => sample.topMass + sample.botMass > EPSILON,
    )?.t

    expect(Math.floor(firstNonZero(US_CORE_NODE_IDS.states))).toBe(1776)
    expect(Math.floor(firstNonZero(US_CORE_NODE_IDS.territories))).toBe(1783)
    expect(Math.floor(firstNonZero(US_CORE_NODE_IDS.colonies))).toBe(1898)
    expect(new Set(Object.values(US_CORE_NODE_IDS).map((id) => layout.slotByNode[id])).size).toBe(3)
  })

  it("keeps late colonial feeder lanes clear of unrelated persistent institutions", () => {
    const layout = processLayout()
    const feederSources = ["PANAMA_CANAL_TREATIES", "PACIFIC_TRUST_SOURCE"]
    const targetId = US_CORE_NODE_IDS.colonies
    const unrelatedPersistentIds = [
      US_CORE_NODE_IDS.states,
      US_CORE_NODE_IDS.territories,
    ]
    const unrelatedBetweenBySource = {}

    for (const sourceId of feederSources) {
      const sourceEdges = US_PROCESS_EDGES.filter((edge) => edge.source === sourceId)
      expect(sourceEdges.length, `${sourceId} authored edges`).toBeGreaterThan(0)
      expect(sourceEdges.every((edge) => edge.target === targetId), `${sourceId} target`)
        .toBe(true)

      unrelatedBetweenBySource[sourceId] = unrelatedPersistentIds.filter((nodeId) =>
        strictlyBetween(
          layout.centerlines[nodeId],
          layout.centerlines[sourceId],
          layout.centerlines[targetId],
        ),
      )
    }
    expect(unrelatedBetweenBySource).toEqual({
      PANAMA_CANAL_TREATIES: [],
      PACIFIC_TRUST_SOURCE: [],
    })
  })

  it("keeps every ribbon attachment exactly as thick as its jurisdiction bundle", () => {
    const layout = processLayout()
    for (const edge of US_PROCESS_EDGES) {
      for (const nodeId of [edge.source, edge.target]) {
        const attachment = layout.nodeData[nodeId].localAttachments.get(edge.id)
        const [top, bottom] = attachmentYRange(
          attachment,
          layout.centerlines[nodeId],
          layout.valueScale,
        )
        expect(bottom - top, `${edge.id} at ${nodeId}`).toBeCloseTo(edge.value * layout.valueScale, 6)
      }
    }
  })

  it("keeps all 64 transactions attached inside their event-time bands with zero authored crossings", () => {
    const layout = processLayout()
    expect(layout.layoutQuality.crossings).toBe(0)
    expect(Number.isFinite(layout.layoutQuality.transitOcclusion)).toBe(true)
    // Boundary-fan centering is an authored topology constraint: a feeder block
    // meets its sink through the middle row. It can trade a modest amount of
    // pixel length for a substantial transit-occlusion reduction, while the
    // slot-index weighted length remains a coarse proxy for bonded units.
    const foundingSlots = [
      layout.slotByNode.MIDDLE_COLONIES,
      layout.slotByNode.NEW_ENGLAND_COLONIES,
      layout.slotByNode.SOUTHERN_COLONIES,
    ]
    expect(Math.abs(
      layout.slotByNode.US_STATES * 2 - Math.min(...foundingSlots) - Math.max(...foundingSlots),
    )).toBeLessThanOrEqual(1)
    expect(layout.layoutQuality.pixelLength)
      .toBeLessThanOrEqual(layout.layoutQualityBefore.pixelLength * 1.15)
    expect(layout.layoutQuality.transitOcclusion)
      .toBeLessThanOrEqual(layout.layoutQualityBefore.transitOcclusion)
    expect(layout.layoutQuality.weightedLength)
      .toBeLessThanOrEqual(layout.layoutQualityBefore.weightedLength * 1.15)

    for (const edge of US_PROCESS_EDGES) {
      for (const [kind, nodeId, time] of [
        ["source", edge.source, edge.startTime],
        ["target", edge.target, edge.endTime],
      ]) {
        const data = layout.nodeData[nodeId]
        const attachment = data.localAttachments.get(edge.id)
        const attachmentRange = attachmentYRange(
          attachment,
          layout.centerlines[nodeId],
          layout.valueScale,
        )
        const samplesAtTime = data.samples.filter((sample) => sample.t === time)
        const settledSample = kind === "source" ? samplesAtTime[0] : samplesAtTime.at(-1)
        const bandRange = renderedBandRange(
          settledSample,
          layout.centerlines[nodeId],
          layout.valueScale,
        )
        expect(attachmentRange[0], `${edge.id} top at ${nodeId}`).toBeGreaterThanOrEqual(bandRange[0] - 1e-6)
        expect(attachmentRange[1], `${edge.id} bottom at ${nodeId}`).toBeLessThanOrEqual(bandRange[1] + 1e-6)
      }
    }
  })

  it("gives cross-lane feeders visible bend runway without moving their authored events", () => {
    const layout = processLayout()
    const timelineExtent = 2850
    const timelineScale = (time) =>
      (time - US_DOMAIN[0]) / (US_DOMAIN[1] - US_DOMAIN[0]) * timelineExtent
    const runwayStarts = computeFeederRibbonRunwayStarts(
      US_PROCESS_NODES,
      US_PROCESS_EDGES,
      US_DOMAIN,
    )
    const sourceGroupByNode = new Map(
      US_PROCESS_NODES
        .filter((node) => node.group != null)
        .map((node) => [node.id, node.group]),
    )
    const intervals = new Map()
    const initialGeometryByEdge = new Map()

    for (const edge of US_PROCESS_EDGES) {
      const sourceAttachment = layout.nodeData[edge.source].localAttachments.get(edge.id)
      const targetAttachment = layout.nodeData[edge.target].localAttachments.get(edge.id)
      const geometry = computeProcessSankeyRibbonInputs(
        sourceAttachment,
        layout.centerlines[edge.source],
        targetAttachment,
        layout.centerlines[edge.target],
        layout.valueScale,
        timelineScale,
        "both",
        US_DOMAIN,
        { minRun: "auto", sourceRunwayStart: runwayStarts.get(edge.id) },
      )
      initialGeometryByEdge.set(edge.id, geometry)
    }
    const geometryByEdge = synchronizeProcessSankeyFeederBatches(
      US_PROCESS_EDGES,
      initialGeometryByEdge,
      runwayStarts,
      timelineScale,
      "both",
      sourceGroupByNode,
    )
    const visualDepartureByEdge = computeFeederVisualDepartureTimes(
      US_PROCESS_EDGES,
      geometryByEdge,
      runwayStarts,
      timelineScale,
      (pixel) => US_DOMAIN[0] + pixel / timelineExtent * (US_DOMAIN[1] - US_DOMAIN[0]),
    )
    const visualDeparturesByNode = indexFeederVisualDepartures(
      US_PROCESS_EDGES, visualDepartureByEdge, sourceGroupByNode,
    )

    for (const edge of US_PROCESS_EDGES) {
      const geometry = geometryByEdge.get(edge.id)
      intervals.set(edge.id, [geometry.sx, geometry.tx])

      if (geometry.sx < timelineScale(edge.startTime)) {
        const visualStartTime = US_DOMAIN[0] +
          geometry.sx / timelineExtent * (US_DOMAIN[1] - US_DOMAIN[0])
        const sourceData = layout.nodeData[edge.source]
        const sourceSample = sourceData.samples
          .filter((sample) => sample.t <= visualStartTime)
          .at(-1)
        const sourceBand = renderedBandRange(
          sourceSample,
          layout.centerlines[edge.source],
          layout.valueScale,
        )
        expect(geometry.sTop, `${edge.id} visual top`).toBeGreaterThanOrEqual(sourceBand[0] - 1e-6)
        expect(geometry.sBot, `${edge.id} visual bottom`).toBeLessThanOrEqual(sourceBand[1] + 1e-6)

        const renderedSamples = projectFeederBandSamples(
          sourceData.samples,
          visualDeparturesByNode.get(edge.source),
        )
        expect(
          renderedSamples.some((sample) => Math.abs(sample.t - visualStartTime) < 1e-9),
          `${edge.id} rendered departure`,
        ).toBe(true)
        expect(
          sourceData.samples.some((sample) => sample.t === edge.startTime),
          `${edge.id} authored departure`,
        ).toBe(true)
      }
    }

    const founding = US_PROCESS_EDGES.filter((edge) => edge.eventType === "founding")
    const foundingGeometries = founding.map((edge) => geometryByEdge.get(edge.id))
    const sharedSourceX = foundingGeometries[0].sx
    for (const [index, geometry] of foundingGeometries.entries()) {
      const edge = founding[index]
      expect(geometry.sx, `${edge.id} shared source time`).toBeCloseTo(sharedSourceX, 8)
      expect(minimumEndpointRadius(geometry), `${edge.id} endpoint radius`)
        .toBeGreaterThanOrEqual(8 - 1e-6)
      expect(timelineScale(edge.endTime) - timelineScale(edge.startTime)).toBeLessThan(6)
      expect(sharedSourceX).toBeLessThan(timelineScale(edge.startTime))
      expect(Math.floor(edge.startTime)).toBe(1776)
    }

    const projectedOrderReversals = []
    for (let first = 0; first < US_PROCESS_EDGES.length; first++) {
      for (let second = first + 1; second < US_PROCESS_EDGES.length; second++) {
        const a = US_PROCESS_EDGES[first]
        const b = US_PROCESS_EDGES[second]
        if (a.source === b.source || a.target === b.target ||
            a.source === b.target || a.target === b.source) continue
        const [aStart, aEnd] = intervals.get(a.id)
        const [bStart, bEnd] = intervals.get(b.id)
        if (Math.max(aStart, bStart) >= Math.min(aEnd, bEnd)) continue
        if ((layout.slotByNode[a.source] - layout.slotByNode[b.source]) *
            (layout.slotByNode[a.target] - layout.slotByNode[b.target]) < 0) {
          projectedOrderReversals.push([a, b])
        }
      }
    }
    // Adaptive source runway can make otherwise disjoint event windows
    // overlap in x, so the cheap endpoint-order proxy is no longer a valid
    // curve-intersection count. It must not reveal a pre-existing authored
    // crossing, nor may the new bonded founding batch participate in one.
    expect(projectedOrderReversals.every(([a, b]) =>
      Math.max(a.startTime, b.startTime) >= Math.min(a.endTime, b.endTime),
    )).toBe(true)
    expect(projectedOrderReversals.some(([a, b]) =>
      a.eventType === "founding" || b.eventType === "founding",
    )).toBe(false)
  })

  it("builds one vertical-compatible fade slot for every colonial holding", () => {
    const layout = processLayout()
    const scale = (year) => (year - US_DOMAIN[0]) * 10
    const colonialInflows = US_PROCESS_EDGES.filter((edge) => edge.target === US_CORE_NODE_IDS.colonies)
    const stubs = buildBandCutoutsForNode(
      US_CORE_NODE_IDS.colonies,
      US_PROCESS_EDGES,
      layout,
      scale,
      US_DOMAIN,
    )
    expect(stubs).toHaveLength(colonialInflows.length)
    expect(stubs.every((stub) => stub.from === 1 && stub.to === 0)).toBe(true)
  })

  it("labels the three persistent institutions and uses an explicit count scale", () => {
    expect(US_WIDTH_UNIT).toMatchObject({ id: "jurisdiction_routes", singular: "jurisdiction route" })
    for (const id of Object.values(US_CORE_NODE_IDS)) {
      expect(usNodeLabel(US_PROCESS_NODES.find((node) => node.id === id))).not.toBe("")
    }
    expect(US_AXIS_TICKS.at(-1)).toEqual({ date: 2025, label: "present" })
  })
})
