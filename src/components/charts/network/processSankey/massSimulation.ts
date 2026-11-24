// Process Sankey mass simulation — side assignment, per-node mass walk,
// same-slot handoffs, and attachment-tie resolution. Pure (no React/DOM).

import { getMin } from "../../shared/minMax"
import {
  compareProcessSankeyIds,
  createProcessSankeyRecord,
  type SlotByNode
} from "./layoutGeometry"
import { attachmentYRange, hasInventory } from "./bandPaths"
import type {
  AttachmentKind,
  AttachmentSide,
  ProcessSankeyAttachment,
  ProcessSankeyEdge,
  ProcessSankeyEdgeIndex,
  ProcessSankeyNode,
  ProcessSankeyNodeData,
  ProcessSankeyNodeSizing,
  ProcessSankeySample,
  ProcessSankeySideRecord
} from "./processSankeyTypes"

export function buildEdgeIndex(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[]
): ProcessSankeyEdgeIndex {
  const incoming = createProcessSankeyRecord<ProcessSankeyEdge[]>()
  const outgoing = createProcessSankeyRecord<ProcessSankeyEdge[]>()
  for (const n of nodes) {
    incoming[n.id] = []
    outgoing[n.id] = []
  }
  for (const e of edges) {
    outgoing[e.source]?.push(e)
    incoming[e.target]?.push(e)
  }
  return { incoming, outgoing }
}

function oppositeSide(side: AttachmentSide): AttachmentSide {
  return side === "top" ? "bot" : "top"
}

export function assignSides(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[],
  edgeIndex: ProcessSankeyEdgeIndex,
  /** Matches the public HOC default (`"temporal"`). */
  pairing: "value" | "temporal" = "temporal"
): Map<string, ProcessSankeySideRecord> {
  const sides = new Map<string, ProcessSankeySideRecord>()
  for (const e of edges) sides.set(e.id, {})

  function assignGroups(edges: ProcessSankeyEdge[], partnerKey: "source" | "target", endpoint: "targetSide" | "sourceSide") {
    const outgoing = partnerKey === "target"
    const groups = new Map<string, { partner: string, edges: ProcessSankeyEdge[], rank: number }>()
    for (const edge of edges) {
      const partner = edge[partnerKey]
      let group = groups.get(partner)
      if (!group) {
        group = { partner, edges: [], rank: pairing === "value" ? 0 : outgoing ? Infinity : -Infinity }
        groups.set(partner, group)
      }
      group.edges.push(edge)
      if (pairing === "value") group.rank -= edge.value
      else group.rank = outgoing ? Math.min(group.rank, edge.startTime) : Math.max(group.rank, edge.endTime)
    }
    const ranked = [...groups.values()].sort((a, b) => a.rank - b.rank || compareProcessSankeyIds(a.partner, b.partner))
    ranked.forEach((group, index) => {
      const side = index % 2 === 0 ? "top" : "bot"
      for (const edge of group.edges) sides.get(edge.id)![endpoint] = side
    })
  }
  for (const node of nodes) {
    assignGroups(edgeIndex.incoming[node.id], "source", "targetSide")
    assignGroups(edgeIndex.outgoing[node.id], "target", "sourceSide")
  }
  return sides
}

type EventKind = "create" | "in" | "out" | "transfer-in" | "transfer-out"

interface NodeEvent {
  time: number
  delta: number
  edge?: ProcessSankeyEdge
  kind: EventKind
  side: AttachmentSide
  /** Synthetic bookkeeping anchored after real events at the same time. */
  phase?: 0 | 1
  /** Keeps a synthesized transfer-out/in pair adjacent and deterministic. */
  sequence?: number
}

export interface ProcessSankeyEndpointPositions {
  source: number
  target: number
}

export function computeNode(
  node: ProcessSankeyNode,
  edgeIndex: ProcessSankeyEdgeIndex,
  sides: Map<string, ProcessSankeySideRecord>,
  endpointPositions?: ReadonlyMap<string, ProcessSankeyEndpointPositions>,
  nodeSizing: ProcessSankeyNodeSizing = "temporal"
): ProcessSankeyNodeData {
  const incoming = edgeIndex.incoming[node.id]
  const outgoing = edgeIndex.outgoing[node.id]
  const events: NodeEvent[] = []
  for (const e of incoming) {
    events.push({
      time: e.endTime,
      delta: +e.value,
      edge: e,
      kind: "in",
      side: sides.get(e.id)!.targetSide!
    })
  }
  for (const e of outgoing) {
    events.push({
      time: e.startTime,
      delta: -e.value,
      edge: e,
      kind: "out",
      side: sides.get(e.id)!.sourceSide!
    })
  }

  const kindOrder: Record<EventKind, number> = {
    create: 0,
    in: 1,
    "transfer-out": 2,
    "transfer-in": 3,
    out: 4
  }
  const compareOppositeEndpoint = (a: NodeEvent, b: NodeEvent): number => {
    if (
      !endpointPositions ||
      !a.edge ||
      !b.edge ||
      a.kind !== b.kind ||
      a.side !== b.side
    )
      return 0
    if (a.kind !== "out" && a.kind !== "in") return 0
    const outgoing = a.kind === "out"
    const endpoint = outgoing ? "target" : "source"
    const time = outgoing ? "endTime" : "startTime"
    // Identical far endpoints keep their stable ID order.
    if (a.edge[endpoint] === b.edge[endpoint] && a.edge[time] === b.edge[time]) return 0
    const aY = endpointPositions.get(a.edge.id)?.[endpoint]
    const bY = endpointPositions.get(b.edge.id)?.[endpoint]
    if (aY == null || bY == null || !Number.isFinite(aY) || !Number.isFinite(bY)) return 0
    // Arrivals fill inside-out and departures empty outside-in.
    return outgoing === (a.side === "top") ? aY - bY : bY - aY
  }
  const sortEvents = () => {
    events.sort(
      (a, b) =>
        a.time - b.time ||
        (a.phase ?? 0) - (b.phase ?? 0) ||
        (a.sequence ?? 0) - (b.sequence ?? 0) ||
        (kindOrder[a.kind] ?? 99) - (kindOrder[b.kind] ?? 99) ||
        compareOppositeEndpoint(a, b) ||
        compareProcessSankeyIds(a.edge?.id ?? "", b.edge?.id ?? "") ||
        compareProcessSankeyIds(a.side, b.side) ||
        a.delta - b.delta
    )
  }

  // Per-OUT deficit synthesis: before each OUT, transfer mass from the
  // other side if available; if a deficit remains, batch a `create`
  // event at `xExtent[0] - 1` (or `firstEventTime - 1`) so the band
  // reads as one continuous mass through the whole lifetime.
  const extent = Array.isArray(node.xExtent) ? node.xExtent : []
  const xStart = Number.isFinite(extent[0]) ? extent[0] : null
  const xEnd = Number.isFinite(extent[1]) ? extent[1] : null
  const firstTime = xStart ?? getMin(events.map(event => event.time))
  const batchTime = firstTime - 1
  sortEvents()

  // Give real events at the same time a stable execution order before adding
  // synthetic side transfers. A transfer inherits its outgoing event's
  // sequence, so the final sort places transfer-out -> transfer-in -> out as
  // one adjacent unit. This matters when several departures share a timestamp:
  // each must see the balance left by the preceding departure.
  let sequenceTime: number | null = null
  let sequenceAtTime = 0
  for (const event of events) {
    if (event.time !== sequenceTime) {
      sequenceTime = event.time
      sequenceAtTime = 0
    }
    event.sequence = sequenceAtTime++
  }

  const transferPlacementFor = (
    event: NodeEvent
  ): {
    time: number
    phase: 0 | 1
    sequence: number
  } => ({
    // Side changes are internal preparation for a departure. Rendering them
    // at the previous external event translated the whole settled node away
    // from the ribbons that had just created it. Keep the arrival-facing body
    // untouched and perform the bookkeeping at the departure boundary.
    time: event.time,
    phase: 0,
    sequence: event.sequence ?? 0
  })

  const synthesized: NodeEvent[] = []
  const balance = { top: 0, bot: 0 }
  for (const e of events) {
    if (e.kind === "out") {
      const value = Math.abs(e.delta)
      let deficit = value - balance[e.side]
      if (deficit > 0) {
        const otherSide = oppositeSide(e.side)
        const transfer = Math.min(deficit, balance[otherSide])
        if (transfer > 0) {
          const placement = transferPlacementFor(e)
          synthesized.push({
            ...placement,
            delta: -transfer,
            kind: "transfer-out",
            side: otherSide
          })
          synthesized.push({
            ...placement,
            delta: +transfer,
            kind: "transfer-in",
            side: e.side
          })
          balance[otherSide] -= transfer
          balance[e.side] += transfer
          deficit -= transfer
        }
        if (deficit > 0 && Number.isFinite(batchTime)) {
          synthesized.push({
            time: batchTime,
            delta: +deficit,
            kind: "create",
            side: e.side
          })
          balance[e.side] += deficit
        }
      }
      balance[e.side] -= value
    } else if (e.kind === "in") {
      balance[e.side] += Math.abs(e.delta)
    }
  }

  events.push(...synthesized)
  sortEvents()

  let topMass = 0,
    botMass = 0,
    boundaryOffset = 0
  let peak = 0,
    topPeak = 0,
    botPeak = 0
  const samples: ProcessSankeySample[] = []
  const localAttachments = new Map<string, ProcessSankeyAttachment>()
  const pushSample = (time: number) => {
    samples.push({
      t: time,
      topMass,
      botMass,
      ...(Math.abs(boundaryOffset) > 1e-12 && { boundaryOffset })
    })
  }
  const updatePeaks = () => {
    peak = Math.max(peak, topMass + botMass)
    // Peaks describe the rendered extents around the lane centerline, not
    // merely the logical mass stored on each side of the movable boundary.
    topPeak = Math.max(topPeak, topMass - boundaryOffset)
    botPeak = Math.max(botPeak, botMass + boundaryOffset)
  }
  for (const e of events) {
    // A transfer-out/in pair is invisible bookkeeping. Treat it as one
    // geometric operation: exposing the intermediate, temporarily depleted
    // state creates a zero-width spike at the departure coordinate.
    if (e.kind !== "transfer-out" && e.kind !== "transfer-in")
      pushSample(e.time)
    if ((e.kind === "in" || e.kind === "out") && e.edge) {
      const sideBefore = e.side === "top" ? topMass : botMass
      const sideAfter = sideBefore + e.delta
      localAttachments.set(e.edge.id, {
        side: e.side,
        time: e.time,
        sideMassBefore: sideBefore,
        sideMassAfter: sideAfter,
        kind: e.kind,
        value: Math.abs(e.delta),
        ...(Math.abs(boundaryOffset) > 1e-12 && { boundaryOffset })
      })
    }
    if (e.side === "top") topMass += e.delta
    else botMass += e.delta
    if (e.kind === "transfer-in") {
      // Moving bot -> top shifts the internal boundary down by the transfer
      // amount; moving top -> bot shifts it up. In both cases the two visible
      // outer coordinates remain fixed while the side ownership changes.
      boundaryOffset += e.side === "top" ? e.delta : -e.delta
      updatePeaks()
      pushSample(e.time)
    } else if (e.kind !== "transfer-out") {
      updatePeaks()
      if (e.kind === "out" && topMass + botMass <= 1e-12) boundaryOffset = 0
      pushSample(e.time)
    }
  }

  // Same-t collapse keeps every distinct mass state in a same-t group
  // so synthesized transfer peaks survive into the rendered band.
  const collapsed: ProcessSankeySample[] = []
  let i = 0
  while (i < samples.length) {
    let j = i
    while (j + 1 < samples.length && samples[j + 1].t === samples[i].t) j++
    collapsed.push(samples[i])
    for (let k = i + 1; k <= j; k++) {
      const last = collapsed[collapsed.length - 1]
      if (
        samples[k].topMass !== last.topMass ||
        samples[k].botMass !== last.botMass ||
        (samples[k].boundaryOffset ?? 0) !== (last.boundaryOffset ?? 0)
      ) {
        collapsed.push(samples[k])
      }
    }
    i = j + 1
  }

  // xExtent end-extension: when a node's `xExtent[1]` is later than its
  // last event AND that last sample has non-zero mass, replay the
  // trailing mass at xExtent[1] so the band keeps drawing flat through
  // the explicit end. Mirror for xExtent[0] < first event with non-zero
  // first mass: replay the leading mass at xExtent[0]. Without these,
  // the band stops at the last/first edge even though `laneLifetime`
  // reports a longer span — visible mismatch in fixtures like a sink
  // (Library/Release) whose lane is supposed to stay open after every
  // commit lands. Skipping the zero-mass case avoids painting a
  // 1-pixel "backbone" line where the lane rail would be more
  // appropriate (the lane is open but holds nothing yet/anymore).
  //
  // systemInTime / systemOutTime also extend the band through their wider
  // inventory lifetime so per-edge gradient stubs have a surface to render
  // onto. Event states inside the authored transfer window stay unchanged;
  // the appropriate outer non-zero state is replayed to the lifecycle bound.
  let earliestSystemIn = Infinity
  for (const edge of outgoing) {
    const time = edge.systemInTime
    if (time != null && Number.isFinite(time) && time < edge.startTime) {
      earliestSystemIn = Math.min(earliestSystemIn, time)
    }
  }
  let rightEnd = xEnd ?? -Infinity
  for (const edge of incoming) {
    const time = edge.systemOutTime
    if (time != null && Number.isFinite(time) && time > edge.endTime) {
      rightEnd = Math.max(rightEnd, time)
    }
  }
  if (collapsed.length > 0) {
    const last = collapsed[collapsed.length - 1]
    if (
      rightEnd > last.t &&
      hasInventory(last)
    ) {
      collapsed.push({ ...last, t: rightEnd })
    }
    const first = collapsed[0]
    const firstNonZero = collapsed.find(hasInventory)
    let leftStart = Infinity
    let leftSample: ProcessSankeySample | undefined
    // Preserve xExtent's lifetime-only behavior when the first state is empty:
    // it opens the rail but does not invent stock before a real arrival.
    if (
      xStart != null &&
      xStart < first.t &&
      hasInventory(first)
    ) {
      leftStart = xStart
      leftSample = first
    }
    // systemInTime is different: it explicitly says the outgoing stock was
    // already present, so extend the first non-zero state to that timestamp.
    if (
      firstNonZero &&
      earliestSystemIn < firstNonZero.t &&
      earliestSystemIn < leftStart
    ) {
      leftStart = earliestSystemIn
      leftSample = firstNonZero
    }
    if (leftSample && Number.isFinite(leftStart)) {
      collapsed.unshift({ ...leftSample, t: leftStart })
    }
  }

  // An authored extent can mean either a true lifecycle boundary (the default)
  // or a visual stage. In the latter case, a same-stage handoff can briefly
  // raise a node to its full value at the extent's edge and immediately drain
  // it again. The slot already reserves that peak, but a pure time-series band
  // has zero width at that instant. Hold the real peak state across the stage
  // so fixed-stage Sankeys read node height like a conventional Sankey without
  // changing event dates, ribbon attachments, or mass accounting.
  let renderedSamples = collapsed
  if (nodeSizing === "max" && xStart != null && xEnd != null && xEnd > xStart) {
    let peakSample: ProcessSankeySample | undefined
    let peakMass = 0
    for (const sample of collapsed) {
      const mass = sample.topMass + sample.botMass
      if (mass > peakMass) {
        peakMass = mass
        peakSample = sample
      }
    }
    if (peakSample) {
      renderedSamples = [
        ...collapsed.filter((sample) => sample.t < xStart),
        { ...peakSample, t: xStart },
        { ...peakSample, t: xEnd },
        ...collapsed.filter((sample) => sample.t > xEnd)
      ]
    }
  }

  return { samples: renderedSamples, peak, topPeak, botPeak, localAttachments }
}

export function collectEndpointPositions(
  edges: readonly ProcessSankeyEdge[],
  nodeData: Readonly<Record<string, ProcessSankeyNodeData>>,
  centerlines: Readonly<Record<string, number>>,
  valueScale: number
): Map<string, ProcessSankeyEndpointPositions> {
  const positions = new Map<string, ProcessSankeyEndpointPositions>()
  function midpoint(node: string, edge: string) {
    const attachment = nodeData[node]?.localAttachments.get(edge)
    const center = centerlines[node]
    if (attachment && Number.isFinite(center)) {
      const [top, bottom] = attachmentYRange(attachment, center, valueScale)
      return (top + bottom) / 2
    }
  }
  for (const edge of edges) {
    const source = midpoint(edge.source, edge.id)
    const target = midpoint(edge.target, edge.id)
    if (source !== undefined && target !== undefined) positions.set(edge.id, { source, target })
  }
  return positions
}

export function hasResolvableAttachmentTies(
  edgeIndex: ProcessSankeyEdgeIndex,
  sides: ReadonlyMap<string, ProcessSankeySideRecord>
): boolean {
  const containsTie = (
    edgeLists: readonly ProcessSankeyEdge[][],
    kind: "in" | "out"
  ): boolean => {
    for (const edgeList of edgeLists) {
      const seen = new Map<string, string>()
      for (const edge of edgeList) {
        const side =
          kind === "out"
            ? sides.get(edge.id)?.sourceSide
            : sides.get(edge.id)?.targetSide
        const localTime = kind === "out" ? edge.startTime : edge.endTime
        const localKey = `${side ?? ""}\u0000${localTime}`
        const farKey =
          kind === "out"
            ? `${edge.target}\u0000${edge.endTime}`
            : `${edge.source}\u0000${edge.startTime}`
        const previous = seen.get(localKey)
        if (previous != null && previous !== farKey) return true
        seen.set(localKey, farKey)
      }
    }
    return false
  }
  return (
    containsTie(Object.values(edgeIndex.outgoing), "out") ||
    containsTie(Object.values(edgeIndex.incoming), "in")
  )
}

export function assignSameSlotHandoffSides(
  edges: readonly ProcessSankeyEdge[],
  sides: Map<string, ProcessSankeySideRecord>,
  slotByNode: Readonly<SlotByNode>
): void {
  type Balance = { top: number; bot: number }
  type BalanceEvent = {
    time: number
    kind: AttachmentKind
    edge: ProcessSankeyEdge
  }
  const balance = new Map<string, Balance>()
  const events: BalanceEvent[] = []
  for (const edge of edges) {
    events.push({ time: edge.startTime, kind: "out", edge })
    events.push({ time: edge.endTime, kind: "in", edge })
  }
  events.sort(
    (a, b) =>
      a.time - b.time ||
      (a.kind === b.kind ? 0 : a.kind === "in" ? -1 : 1) ||
      (a.kind === "out" ? b.edge.value - a.edge.value : 0) ||
      compareProcessSankeyIds(a.edge.id, b.edge.id)
  )

  const stateFor = (id: string): Balance => {
    let state = balance.get(id)
    if (!state) {
      state = { top: 0, bot: 0 }
      balance.set(id, state)
    }
    return state
  }
  const consume = (
    state: Balance,
    side: AttachmentSide,
    value: number
  ): void => {
    const other = oppositeSide(side)
    const local = Math.min(value, state[side])
    state[side] -= local
    const remainder = value - local
    if (remainder > 0) state[other] = Math.max(0, state[other] - remainder)
    // Any remainder after both sides is synthesized source mass in computeNode
    // and therefore leaves no balance for a later edge.
  }

  for (const event of events) {
    const { edge } = event
    if (event.kind === "in") {
      const side = sides.get(edge.id)?.targetSide ?? "bot"
      stateFor(edge.target)[side] += edge.value
      continue
    }

    const state = stateFor(edge.source)
    const sideRecord = sides.get(edge.id)!
    let side = sideRecord.sourceSide ?? "bot"
    if (slotByNode[edge.source] === slotByNode[edge.target]) {
      const topFits = state.top >= edge.value
      const botFits = state.bot >= edge.value
      if (topFits !== botFits) side = topFits ? "top" : "bot"
      else if (!topFits && !botFits && state.top !== state.bot) {
        side = state.top > state.bot ? "top" : "bot"
      }
      sideRecord.sourceSide = side
      sideRecord.targetSide = side
    }
    consume(state, side, edge.value)
  }
}

/** Per-node side rebalance to keep multi-edge bundles within available per-side mass. */
export function rebalanceOutgoingSides(
  nodes: readonly ProcessSankeyNode[],
  edgeIndex: ProcessSankeyEdgeIndex,
  sides: Map<string, ProcessSankeySideRecord>,
  sameSlotEdgeIds: ReadonlySet<string>
): void {
  for (const node of nodes) {
    const inn = edgeIndex.incoming[node.id]
    const out = edgeIndex.outgoing[node.id]
    if (inn.length === 0 || out.length === 0) continue
    const totalBySide = (edges: ProcessSankeyEdge[], endpoint: "sourceSide" | "targetSide") => {
      const totals = { top: 0, bot: 0 }
      for (const edge of edges) totals[sides.get(edge.id)![endpoint] ?? "bot"] += edge.value
      return totals
    }
    const incoming = totalBySide(inn, "targetSide")
    for (let moves = 0; moves <= out.length; moves++) {
      const outgoing = totalBySide(out, "sourceSide")
      const top = outgoing.top - incoming.top
      const bottom = outgoing.bot - incoming.bot
      const fromSide = top > 0 ? "top" : "bot"
      const toSide = oppositeSide(fromSide)
      const move = fromSide === "top" ? Math.min(top, -bottom) : Math.min(bottom, -top)
      if (!(move > 0)) break
      const candidates = out
        .filter(
          (e) =>
            !sameSlotEdgeIds.has(e.id) &&
            sides.get(e.id)!.sourceSide === fromSide &&
            e.value <= move
        )
        .sort(
          (a, b) => b.value - a.value || compareProcessSankeyIds(a.id, b.id)
        )
      if (!candidates.length) break
      sides.get(candidates[0].id)!.sourceSide = toSide
    }
  }
}
