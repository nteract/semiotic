// Process Sankey mass simulation — side assignment, per-node mass walk,
// same-slot handoffs, and attachment-tie resolution. Pure (no React/DOM).

import { getMin } from "../../shared/minMax"
import { compareProcessSankeyIds, type SlotByNode } from "./layoutGeometry"
import { attachmentYRange } from "./bandPaths"
import type {
  AttachmentKind,
  AttachmentSide,
  ProcessSankeyAttachment,
  ProcessSankeyEdge,
  ProcessSankeyEdgeIndex,
  ProcessSankeyNode,
  ProcessSankeyNodeData,
  ProcessSankeySample,
  ProcessSankeySideRecord,
} from "./processSankeyTypes"

export function buildEdgeIndex(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[],
): ProcessSankeyEdgeIndex {
  const incoming: Record<string, ProcessSankeyEdge[]> = {}
  const outgoing: Record<string, ProcessSankeyEdge[]> = {}
  for (const n of nodes) {
    incoming[n.id] = []
    outgoing[n.id] = []
  }
  for (const e of edges) {
    if (outgoing[e.source]) outgoing[e.source].push(e)
    if (incoming[e.target]) incoming[e.target].push(e)
  }
  return { incoming, outgoing }
}

interface EdgeGroup {
  partner: string
  edges: ProcessSankeyEdge[]
  total: number
  earliestStart: number
  latestEnd: number
}

export function assignSides(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[],
  edgeIndex: ProcessSankeyEdgeIndex,
  /** Matches the public HOC default (`"temporal"`). */
  pairing: "value" | "temporal" = "temporal",
): Map<string, ProcessSankeySideRecord> {
  const sortIn = pairing === "temporal"
    ? (a: ProcessSankeyEdge, b: ProcessSankeyEdge) => a.endTime - b.endTime || compareProcessSankeyIds(a.id, b.id)
    : (a: ProcessSankeyEdge, b: ProcessSankeyEdge) => b.value - a.value || compareProcessSankeyIds(a.id, b.id)
  const sortOut = pairing === "temporal"
    ? (a: ProcessSankeyEdge, b: ProcessSankeyEdge) => a.startTime - b.startTime || compareProcessSankeyIds(a.id, b.id)
    : (a: ProcessSankeyEdge, b: ProcessSankeyEdge) => b.value - a.value || compareProcessSankeyIds(a.id, b.id)
  const sides = new Map<string, ProcessSankeySideRecord>()
  for (const e of edges) sides.set(e.id, {})

  // Group edges by partner-node id. Multi-edge parallel ribbons between
  // the same pair land side-by-side rather than crossing.
  const groupBy = (edgeList: ProcessSankeyEdge[], partnerKey: "source" | "target"): EdgeGroup[] => {
    const groups = new Map<string, EdgeGroup>()
    for (const e of edgeList) {
      const partner = e[partnerKey]
      if (!groups.has(partner)) {
        groups.set(partner, {
          partner, edges: [], total: 0,
          earliestStart: Infinity, latestEnd: -Infinity,
        })
      }
      const g = groups.get(partner)!
      g.edges.push(e)
      g.total += e.value
      g.earliestStart = Math.min(g.earliestStart, e.startTime)
      g.latestEnd = Math.max(g.latestEnd, e.endTime)
    }
    const list = [...groups.values()]
    if (pairing === "temporal") {
      list.sort((a, b) => partnerKey === "target"
        ? a.earliestStart - b.earliestStart || compareProcessSankeyIds(a.partner, b.partner)
        : a.latestEnd - b.latestEnd || compareProcessSankeyIds(a.partner, b.partner))
    } else {
      list.sort((a, b) => b.total - a.total || compareProcessSankeyIds(a.partner, b.partner))
    }
    for (const g of list) {
      g.edges.sort(partnerKey === "target" ? sortOut : sortIn)
    }
    return list
  }

  for (const n of nodes) {
    const out = edgeIndex.outgoing[n.id]
    const inn = edgeIndex.incoming[n.id]
    if (inn.length === 0) {
      const groups = groupBy(out, "target")
      groups.forEach((g, i) => {
        const side: AttachmentSide = i % 2 === 0 ? "top" : "bot"
        for (const e of g.edges) sides.get(e.id)!.sourceSide = side
      })
    } else if (out.length === 0) {
      const groups = groupBy(inn, "source")
      groups.forEach((g, i) => {
        const side: AttachmentSide = i % 2 === 0 ? "top" : "bot"
        for (const e of g.edges) sides.get(e.id)!.targetSide = side
      })
    } else {
      const inGroups = groupBy(inn, "source")
      const outGroups = groupBy(out, "target")
      const pairs = Math.max(inGroups.length, outGroups.length)
      for (let i = 0; i < pairs; i++) {
        const side: AttachmentSide = i % 2 === 0 ? "top" : "bot"
        if (inGroups[i]) for (const e of inGroups[i].edges) sides.get(e.id)!.targetSide = side
        if (outGroups[i]) for (const e of outGroups[i].edges) sides.get(e.id)!.sourceSide = side
      }
    }
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
): ProcessSankeyNodeData {
  const incoming = edgeIndex.incoming[node.id]
  const outgoing = edgeIndex.outgoing[node.id]
  const events: NodeEvent[] = []
  for (const e of incoming) {
    events.push({ time: e.endTime, delta: +e.value, edge: e, kind: "in", side: sides.get(e.id)!.targetSide! })
  }
  for (const e of outgoing) {
    events.push({ time: e.startTime, delta: -e.value, edge: e, kind: "out", side: sides.get(e.id)!.sourceSide! })
  }

  const kindOrder: Record<EventKind, number> = { create: 0, in: 1, "transfer-out": 2, "transfer-in": 3, out: 4 }
  const compareOppositeEndpoint = (a: NodeEvent, b: NodeEvent): number => {
    if (!endpointPositions || !a.edge || !b.edge || a.kind !== b.kind || a.side !== b.side) return 0
    if (a.kind === "out") {
      // If both ends are tied at the same node there is no stable far-end
      // order to copy. Keeping the id order avoids a symmetric flip-flop.
      if (a.edge.target === b.edge.target && a.edge.endTime === b.edge.endTime) return 0
      const aY = endpointPositions.get(a.edge.id)?.target
      const bY = endpointPositions.get(b.edge.id)?.target
      if (typeof aY !== "number" || !Number.isFinite(aY) ||
          typeof bY !== "number" || !Number.isFinite(bY) || aY === bY) return 0
      // OUT slots are allocated outside-in: top grows upward, bottom grows
      // downward. Sort in the corresponding screen-space direction so the
      // departure order copies the already-resolved target order.
      return a.side === "top" ? aY - bY : bY - aY
    }
    if (a.kind === "in") {
      if (a.edge.source === b.edge.source && a.edge.startTime === b.edge.startTime) return 0
      const aY = endpointPositions.get(a.edge.id)?.source
      const bY = endpointPositions.get(b.edge.id)?.source
      if (typeof aY !== "number" || !Number.isFinite(aY) ||
          typeof bY !== "number" || !Number.isFinite(bY) || aY === bY) return 0
      // IN slots are allocated inside-out, the inverse of OUT slots.
      return a.side === "top" ? bY - aY : aY - bY
    }
    return 0
  }
  const sortEvents = () => {
    events.sort((a, b) =>
      a.time - b.time ||
      (a.phase ?? 0) - (b.phase ?? 0) ||
      (a.sequence ?? 0) - (b.sequence ?? 0) ||
      (kindOrder[a.kind] ?? 99) - (kindOrder[b.kind] ?? 99) ||
      compareOppositeEndpoint(a, b) ||
      compareProcessSankeyIds(a.edge?.id ?? "", b.edge?.id ?? "") ||
      compareProcessSankeyIds(a.side, b.side) ||
      a.delta - b.delta,
    )
  }

  // Per-OUT deficit synthesis: before each OUT, transfer mass from the
  // other side if available; if a deficit remains, batch a `create`
  // event at `xExtent[0] - 1` (or `firstEventTime - 1`) so the band
  // reads as one continuous mass through the whole lifetime.
  const firstEventTime: number | null = events.length ? getMin(events.map((e) => e.time)) : null
  const xStart: number | null = Array.isArray(node.xExtent) && Number.isFinite(node.xExtent[0])
    ? node.xExtent[0]
    : null
  const batchTime: number | null = xStart != null
    ? xStart - 1
    : (firstEventTime != null && Number.isFinite(firstEventTime) ? firstEventTime - 1 : null)
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

  const transferPlacementFor = (event: NodeEvent): {
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
    sequence: event.sequence ?? 0,
  })

  const synthesized: NodeEvent[] = []
  let simTop = 0, simBot = 0
  for (const e of events) {
    if (e.kind === "out") {
      const value = Math.abs(e.delta)
      const sideMass = e.side === "top" ? simTop : simBot
      let deficit = value - sideMass
      if (deficit > 0) {
        const otherSide: AttachmentSide = e.side === "top" ? "bot" : "top"
        const otherMass = otherSide === "top" ? simTop : simBot
        const transfer = Math.min(deficit, otherMass)
        if (transfer > 0) {
          const placement = transferPlacementFor(e)
          synthesized.push({
            ...placement,
            delta: -transfer, kind: "transfer-out", side: otherSide,
          })
          synthesized.push({
            ...placement,
            delta: +transfer, kind: "transfer-in", side: e.side,
          })
          if (otherSide === "top") simTop -= transfer
          else simBot -= transfer
          if (e.side === "top") simTop += transfer
          else simBot += transfer
          deficit -= transfer
        }
        if (deficit > 0 && batchTime !== null) {
          synthesized.push({ time: batchTime, delta: +deficit, kind: "create", side: e.side })
          if (e.side === "top") simTop += deficit
          else simBot += deficit
        }
      }
      if (e.side === "top") simTop -= value
      else simBot -= value
    } else if (e.kind === "in") {
      const value = Math.abs(e.delta)
      if (e.side === "top") simTop += value
      else simBot += value
    }
  }

  events.push(...synthesized)
  sortEvents()

  let topMass = 0, botMass = 0, boundaryOffset = 0
  let peak = 0, topPeak = 0, botPeak = 0
  const samples: ProcessSankeySample[] = []
  const localAttachments = new Map<string, ProcessSankeyAttachment>()
  const pushSample = (time: number) => {
    samples.push({
      t: time,
      topMass,
      botMass,
      ...(Math.abs(boundaryOffset) > 1e-12 && { boundaryOffset }),
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
    if (e.kind !== "transfer-out" && e.kind !== "transfer-in") pushSample(e.time)
    if ((e.kind === "in" || e.kind === "out") && e.edge) {
      const sideBefore = e.side === "top" ? topMass : botMass
      const sideAfter = sideBefore + e.delta
      localAttachments.set(e.edge.id, {
        side: e.side, time: e.time,
        sideMassBefore: sideBefore, sideMassAfter: sideAfter,
        kind: e.kind, value: Math.abs(e.delta),
        ...(Math.abs(boundaryOffset) > 1e-12 && { boundaryOffset }),
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
      if (samples[k].topMass !== last.topMass ||
          samples[k].botMass !== last.botMass ||
          (samples[k].boundaryOffset ?? 0) !== (last.boundaryOffset ?? 0)) {
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
  const xEnd: number | null = Array.isArray(node.xExtent) && Number.isFinite(node.xExtent[1])
    ? node.xExtent[1]
    : null
  let earliestSystemIn: number | null = null
  for (const e of outgoing) {
    if (e.systemInTime != null && Number.isFinite(e.systemInTime) && e.systemInTime < e.startTime) {
      if (earliestSystemIn === null || e.systemInTime < earliestSystemIn) earliestSystemIn = e.systemInTime
    }
  }
  let latestSystemOut: number | null = null
  for (const e of incoming) {
    if (e.systemOutTime != null && Number.isFinite(e.systemOutTime) && e.systemOutTime > e.endTime) {
      if (latestSystemOut === null || e.systemOutTime > latestSystemOut) latestSystemOut = e.systemOutTime
    }
  }
  if (collapsed.length > 0) {
    const last = collapsed[collapsed.length - 1]
    const rightEnd = Math.max(
      xEnd != null ? xEnd : -Infinity,
      latestSystemOut != null ? latestSystemOut : -Infinity,
    )
    if (Number.isFinite(rightEnd) && rightEnd > last.t && last.topMass + last.botMass > 0) {
      collapsed.push({
        t: rightEnd,
        topMass: last.topMass,
        botMass: last.botMass,
        ...(last.boundaryOffset != null && { boundaryOffset: last.boundaryOffset }),
      })
    }
    const first = collapsed[0]
    const firstNonZero = collapsed.find((sample) => sample.topMass + sample.botMass > 0)
    let leftStart = Infinity
    let leftSample: ProcessSankeySample | undefined
    // Preserve xExtent's lifetime-only behavior when the first state is empty:
    // it opens the rail but does not invent stock before a real arrival.
    if (xStart != null && Number.isFinite(xStart) &&
        xStart < first.t && first.topMass + first.botMass > 0) {
      leftStart = xStart
      leftSample = first
    }
    // systemInTime is different: it explicitly says the outgoing stock was
    // already present, so extend the first non-zero state to that timestamp.
    if (firstNonZero && earliestSystemIn != null && Number.isFinite(earliestSystemIn) &&
        earliestSystemIn < firstNonZero.t && earliestSystemIn < leftStart) {
      leftStart = earliestSystemIn
      leftSample = firstNonZero
    }
    if (leftSample && Number.isFinite(leftStart)) {
      collapsed.unshift({
        t: leftStart,
        topMass: leftSample.topMass,
        botMass: leftSample.botMass,
        ...(leftSample.boundaryOffset != null && { boundaryOffset: leftSample.boundaryOffset }),
      })
    }
  }

  return { samples: collapsed, peak, topPeak, botPeak, localAttachments }
}

export function collectEndpointPositions(
  edges: readonly ProcessSankeyEdge[],
  nodeData: Readonly<Record<string, ProcessSankeyNodeData>>,
  centerlines: Readonly<Record<string, number>>,
  valueScale: number,
): Map<string, ProcessSankeyEndpointPositions> {
  const positions = new Map<string, ProcessSankeyEndpointPositions>()
  for (const edge of edges) {
    const sourceAttachment = nodeData[edge.source]?.localAttachments.get(edge.id)
    const targetAttachment = nodeData[edge.target]?.localAttachments.get(edge.id)
    const sourceCenter = centerlines[edge.source]
    const targetCenter = centerlines[edge.target]
    if (!sourceAttachment || !targetAttachment ||
        !Number.isFinite(sourceCenter) || !Number.isFinite(targetCenter)) continue
    const sourceRange = attachmentYRange(sourceAttachment, sourceCenter, valueScale)
    const targetRange = attachmentYRange(targetAttachment, targetCenter, valueScale)
    positions.set(edge.id, {
      source: (sourceRange[0] + sourceRange[1]) / 2,
      target: (targetRange[0] + targetRange[1]) / 2,
    })
  }
  return positions
}

export function hasResolvableAttachmentTies(
  edgeIndex: ProcessSankeyEdgeIndex,
  sides: ReadonlyMap<string, ProcessSankeySideRecord>,
): boolean {
  const containsTie = (
    edgeLists: readonly ProcessSankeyEdge[][],
    kind: "in" | "out",
  ): boolean => {
    for (const edgeList of edgeLists) {
      const seen = new Map<string, string>()
      for (const edge of edgeList) {
        const side = kind === "out" ? sides.get(edge.id)?.sourceSide : sides.get(edge.id)?.targetSide
        const localTime = kind === "out" ? edge.startTime : edge.endTime
        const localKey = `${side ?? ""}\u0000${localTime}`
        const farKey = kind === "out"
          ? `${edge.target}\u0000${edge.endTime}`
          : `${edge.source}\u0000${edge.startTime}`
        const previous = seen.get(localKey)
        if (previous != null && previous !== farKey) return true
        seen.set(localKey, farKey)
      }
    }
    return false
  }
  return containsTie(Object.values(edgeIndex.outgoing), "out") ||
    containsTie(Object.values(edgeIndex.incoming), "in")
}

export function assignSameSlotHandoffSides(
  edges: readonly ProcessSankeyEdge[],
  sides: Map<string, ProcessSankeySideRecord>,
  slotByNode: Readonly<SlotByNode>,
): void {
  type Balance = { top: number; bot: number }
  type BalanceEvent = { time: number; kind: AttachmentKind; edge: ProcessSankeyEdge }
  const balance = new Map<string, Balance>()
  const events: BalanceEvent[] = []
  for (const edge of edges) {
    events.push({ time: edge.startTime, kind: "out", edge })
    events.push({ time: edge.endTime, kind: "in", edge })
  }
  events.sort((a, b) =>
    a.time - b.time ||
    (a.kind === b.kind ? 0 : a.kind === "in" ? -1 : 1) ||
    (a.kind === "out" ? b.edge.value - a.edge.value : 0) ||
    compareProcessSankeyIds(a.edge.id, b.edge.id),
  )

  const stateFor = (id: string): Balance => {
    let state = balance.get(id)
    if (!state) {
      state = { top: 0, bot: 0 }
      balance.set(id, state)
    }
    return state
  }
  const consume = (state: Balance, side: AttachmentSide, value: number): void => {
    const other: AttachmentSide = side === "top" ? "bot" : "top"
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
  sameSlotEdgeIds: ReadonlySet<string>,
): void {
  for (const node of nodes) {
    const inn = edgeIndex.incoming[node.id]
    const out = edgeIndex.outgoing[node.id]
    if (inn.length === 0 || out.length === 0) continue
    const tally = () => {
      const r = { inTop: 0, inBot: 0, outTop: 0, outBot: 0 }
      for (const e of inn) {
        const s = sides.get(e.id)!.targetSide
        if (s === "top") r.inTop += e.value
        else r.inBot += e.value
      }
      for (const e of out) {
        const s = sides.get(e.id)!.sourceSide
        if (s === "top") r.outTop += e.value
        else r.outBot += e.value
      }
      return r
    }
    const tryMove = (fromSide: AttachmentSide, toSide: AttachmentSide): boolean => {
      const t = tally()
      const surplusFrom = (fromSide === "top" ? t.outTop - t.inTop : t.outBot - t.inBot)
      const slackTo = (toSide === "top" ? t.inTop - t.outTop : t.inBot - t.outBot)
      if (surplusFrom <= 0 || slackTo <= 0) return false
      const move = Math.min(surplusFrom, slackTo)
      const candidates = out
        .filter((e) => !sameSlotEdgeIds.has(e.id) && sides.get(e.id)!.sourceSide === fromSide && e.value <= move)
        .sort((a, b) => b.value - a.value || compareProcessSankeyIds(a.id, b.id))
      if (candidates.length === 0) return false
      sides.get(candidates[0].id)!.sourceSide = toSide
      return true
    }
    let safety = out.length + 1
    while (safety-- > 0) {
      if (!tryMove("top", "bot") && !tryMove("bot", "top")) break
    }
  }
}
