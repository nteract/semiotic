// Process Sankey layout algorithm.
//
// Pure functions — no React, no SVG, no DOM. Given a list of nodes
// (with optional xExtent: [start, end]) and edges (each with
// startTime/endTime/value), returns the centerlines, per-node band
// samples, per-edge attachment data, and the score (crossings +
// weighted edge length) the chart needs to render.
//
// The HOC component (`ProcessSankey.tsx`) wraps this with prop parsing,
// SVG drawing, and accessor unwrapping. See `docs/strategy/process_sankey_internals.md`
// for the long-form algorithm explanation.

// ---------------------------------------------------------------------------
// Public types (canonical home — `algorithm.d.ts` is deleted, this file
// is the single source of truth now that the implementation is TS).
// ---------------------------------------------------------------------------

export interface ProcessSankeyNode {
  id: string
  /** Optional explicit lifetime bound [start, end]. Lifetime is
   *  `min(xExtent[0], earliestEdge)` to `max(xExtent[1], latestEdge)`. */
  xExtent?: [number, number]
}

export interface ProcessSankeyEdge {
  id: string
  source: string
  target: string
  value: number
  startTime: number
  endTime: number
}

export interface ProcessSankeyIssue {
  kind: string
  id?: string
  source?: string
  target?: string
  endpoint?: string
  nodeId?: string
}

export interface ProcessSankeySample {
  t: number
  topMass: number
  botMass: number
}

export type AttachmentSide = "top" | "bot"
export type AttachmentKind = "in" | "out"

export interface ProcessSankeyAttachment {
  side: AttachmentSide
  time: number
  sideMassBefore: number
  sideMassAfter: number
  kind: AttachmentKind
  value: number
}

export interface ProcessSankeyNodeData {
  samples: ProcessSankeySample[]
  peak: number
  topPeak: number
  botPeak: number
  localAttachments: Map<string, ProcessSankeyAttachment>
}

export interface ProcessSankeySlotPeak {
  topPeak: number
  botPeak: number
}

export interface ProcessSankeySlotOccupant {
  id: string
  end: number
}

export interface ProcessSankeySlot {
  peak: ProcessSankeySlotPeak
  occupants: ProcessSankeySlotOccupant[]
}

export interface ProcessSankeyLaneLifetime {
  start: number | null
  end: number | null
}

export interface ProcessSankeySideRecord {
  sourceSide?: AttachmentSide
  targetSide?: AttachmentSide
}

export interface ProcessSankeyLayout {
  nodeData: Record<string, ProcessSankeyNodeData>
  sides: Map<string, ProcessSankeySideRecord>
  valueScale: number
  padding: number
  compressedPadding: boolean
  centerlines: Record<string, number>
  laneLifetime: Record<string, ProcessSankeyLaneLifetime>
  slots: ProcessSankeySlot[]
  slotByNode: Record<string, number>
  crossingsBefore: number | null
  crossingsAfter: number | null
  lengthBefore: number | null
  lengthAfter: number | null
}

export interface ProcessSankeyOptions {
  plotH: number
  pairing?: "value" | "temporal"
  packing?: "off" | "reuse"
  laneOrder?: "insertion" | "crossing-min" | "inside-out" | "crossing-min+inside-out"
  lifetimeMode?: "full" | "half"
}

export interface ProcessSankeyEdgeIndex {
  incoming: Record<string, ProcessSankeyEdge[]>
  outgoing: Record<string, ProcessSankeyEdge[]>
}

type Domain = [number, number] | null | undefined

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateProcessSankey(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[],
  domain: [number, number],
): ProcessSankeyIssue[] {
  const issues: ProcessSankeyIssue[] = []
  const nodeIds = new Set(nodes.map((n) => n.id))
  // Domain must be [start, end] with finite numbers and start <= end.
  // An inverted/malformed domain otherwise flows silently into scaleTime
  // and produces a chart with the x-axis wired backward.
  const domainShapeOk = Array.isArray(domain) && domain.length === 2
  const domainFinite = domainShapeOk && Number.isFinite(domain[0]) && Number.isFinite(domain[1])
  const domainOrdered = domainFinite && domain[0] <= domain[1]
  if (!domainShapeOk || !domainFinite || !domainOrdered) {
    issues.push({ kind: "invalid-domain" })
  }
  for (const n of nodes) {
    if (n.xExtent != null) {
      const valid = Array.isArray(n.xExtent)
        && n.xExtent.length === 2
        && Number.isFinite(n.xExtent[0])
        && Number.isFinite(n.xExtent[1])
        && n.xExtent[0] <= n.xExtent[1]
      if (!valid) issues.push({ kind: "invalid-node-time", id: n.id })
    }
  }
  for (const e of edges) {
    if (!nodeIds.has(e.source)) {
      issues.push({ kind: "missing-node", id: e.id, endpoint: "source", nodeId: e.source })
    }
    if (!nodeIds.has(e.target)) {
      issues.push({ kind: "missing-node", id: e.id, endpoint: "target", nodeId: e.target })
    }
    if (!Number.isFinite(e.startTime) || !Number.isFinite(e.endTime)) {
      issues.push({ kind: "invalid-edge-time", id: e.id })
      continue
    }
    if (!Number.isFinite(e.value) || e.value <= 0) {
      issues.push({ kind: "invalid-value", id: e.id })
    }
    if (e.endTime <= e.startTime) issues.push({ kind: "backward-edge", id: e.id, source: e.source, target: e.target })
  }
  return issues
}

export function formatProcessSankeyIssue(issue: ProcessSankeyIssue): string {
  if (issue.kind === "invalid-node-time") return `node ${issue.id} has an invalid xExtent (must be [start, end] with start <= end)`
  if (issue.kind === "invalid-edge-time") return `edge ${issue.id} has an invalid startTime or endTime`
  if (issue.kind === "invalid-domain") return "time domain must be a 2-tuple of finite times [start, end] with start <= end"
  if (issue.kind === "invalid-value") return `edge ${issue.id} must have a positive finite value`
  if (issue.kind === "missing-node") return `edge ${issue.id} references missing ${issue.endpoint} node "${issue.nodeId}"`
  if (issue.kind === "backward-edge") return `edge ${issue.id} (${issue.source}->${issue.target}) ends before it starts`
  return issue.kind
}

// ---------------------------------------------------------------------------
// Side assignment + per-node walk
// ---------------------------------------------------------------------------

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
  pairing: "value" | "temporal" = "value",
): Map<string, ProcessSankeySideRecord> {
  const sortIn = pairing === "temporal"
    ? (a: ProcessSankeyEdge, b: ProcessSankeyEdge) => a.endTime - b.endTime
    : (a: ProcessSankeyEdge, b: ProcessSankeyEdge) => b.value - a.value
  const sortOut = pairing === "temporal"
    ? (a: ProcessSankeyEdge, b: ProcessSankeyEdge) => a.startTime - b.startTime
    : (a: ProcessSankeyEdge, b: ProcessSankeyEdge) => b.value - a.value
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
        ? a.earliestStart - b.earliestStart
        : a.latestEnd - b.latestEnd)
    } else {
      list.sort((a, b) => b.total - a.total)
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
}

export function computeNode(
  node: ProcessSankeyNode,
  edgeIndex: ProcessSankeyEdgeIndex,
  sides: Map<string, ProcessSankeySideRecord>,
): ProcessSankeyNodeData {
  const incoming = edgeIndex.incoming[node.id]
  const outgoing = edgeIndex.outgoing[node.id]
  const events: NodeEvent[] = []
  for (const e of incoming) events.push({ time: e.endTime, delta: +e.value, edge: e, kind: "in", side: sides.get(e.id)!.targetSide! })
  for (const e of outgoing) events.push({ time: e.startTime, delta: -e.value, edge: e, kind: "out", side: sides.get(e.id)!.sourceSide! })

  const kindOrder: Record<EventKind, number> = { create: 0, in: 1, "transfer-out": 2, "transfer-in": 3, out: 4 }
  const sortEvents = () => {
    events.sort((a, b) => a.time - b.time || (kindOrder[a.kind] ?? 99) - (kindOrder[b.kind] ?? 99))
  }

  // Per-OUT deficit synthesis: before each OUT, transfer mass from the
  // other side if available; if a deficit remains, batch a `create`
  // event at `xExtent[0] - 1` (or `firstEventTime - 1`) so the band
  // reads as one continuous mass through the whole lifetime.
  const firstEventTime: number | null = events.length ? Math.min(...events.map((e) => e.time)) : null
  const xStart: number | null = Array.isArray(node.xExtent) && Number.isFinite(node.xExtent[0])
    ? node.xExtent[0]
    : null
  const batchTime: number | null = xStart != null
    ? xStart - 1
    : (firstEventTime != null && Number.isFinite(firstEventTime) ? firstEventTime - 1 : null)
  const sortedDistinctTimes = [...new Set(events.map((e) => e.time))].sort((a, b) => a - b)
  const prevDistinctTime = new Map<number, number>()
  for (let i = 1; i < sortedDistinctTimes.length; i++) {
    prevDistinctTime.set(sortedDistinctTimes[i], sortedDistinctTimes[i - 1])
  }
  const transferTimeFor = (eTime: number): number => {
    const prev = prevDistinctTime.get(eTime)
    if (prev != null) return (prev + eTime) / 2
    if (batchTime != null) return batchTime
    return eTime
  }

  sortEvents()

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
          const tt = transferTimeFor(e.time)
          synthesized.push({ time: tt, delta: -transfer, kind: "transfer-out", side: otherSide })
          synthesized.push({ time: tt, delta: +transfer, kind: "transfer-in", side: e.side })
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

  let topMass = 0, botMass = 0, peak = 0, topPeak = 0, botPeak = 0
  const samples: ProcessSankeySample[] = []
  const localAttachments = new Map<string, ProcessSankeyAttachment>()
  for (const e of events) {
    samples.push({ t: e.time, topMass, botMass })
    if ((e.kind === "in" || e.kind === "out") && e.edge) {
      const sideBefore = e.side === "top" ? topMass : botMass
      const sideAfter = sideBefore + e.delta
      localAttachments.set(e.edge.id, {
        side: e.side, time: e.time,
        sideMassBefore: sideBefore, sideMassAfter: sideAfter,
        kind: e.kind, value: Math.abs(e.delta),
      })
    }
    if (e.side === "top") topMass += e.delta
    else botMass += e.delta
    if (topMass + botMass > peak) peak = topMass + botMass
    if (topMass > topPeak) topPeak = topMass
    if (botMass > botPeak) botPeak = botMass
    samples.push({ t: e.time, topMass, botMass })
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
      if (samples[k].topMass !== last.topMass || samples[k].botMass !== last.botMass) {
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
  const xEnd: number | null = Array.isArray(node.xExtent) && Number.isFinite(node.xExtent[1])
    ? node.xExtent[1]
    : null
  if (collapsed.length > 0) {
    const last = collapsed[collapsed.length - 1]
    if (xEnd != null && xEnd > last.t && last.topMass + last.botMass > 0) {
      collapsed.push({ t: xEnd, topMass: last.topMass, botMass: last.botMass })
    }
    const first = collapsed[0]
    if (xStart != null && xStart < first.t && first.topMass + first.botMass > 0) {
      collapsed.unshift({ t: xStart, topMass: first.topMass, botMass: first.botMass })
    }
  }

  return { samples: collapsed, peak, topPeak, botPeak, localAttachments }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

export function clampTime(t: number, domain: Domain): number {
  if (!domain) return t
  return Math.max(domain[0], Math.min(domain[1], t))
}

export function clampSamples(samples: ProcessSankeySample[], domain: Domain): ProcessSankeySample[] {
  return samples.map((s) => ({
    t: clampTime(s.t, domain),
    topMass: s.topMass,
    botMass: s.botMass,
  }))
}

export function attachmentYRange(att: ProcessSankeyAttachment, cl: number, S: number): [number, number] {
  const v = att.value * S
  if (att.kind === "out") {
    const before = att.sideMassBefore * S
    if (att.side === "top") {
      const oldTop = cl - before
      return [oldTop, oldTop + v]
    }
    const oldBot = cl + before
    return [oldBot - v, oldBot]
  }
  const after = att.sideMassAfter * S
  if (att.side === "top") {
    const newTop = cl - after
    return [newTop, newTop + v]
  }
  const newBot = cl + after
  return [newBot - v, newBot]
}

export function buildBandPath(
  samples: ProcessSankeySample[],
  cl: number,
  S: number,
  xScale: (t: number) => number,
  domain: Domain,
): string | null {
  if (samples.length === 0) return null
  const sm = clampSamples(samples, domain)
  const yTop = (i: number) => cl - sm[i].topMass * S
  const yBot = (i: number) => cl + sm[i].botMass * S
  let path = `M${xScale(sm[0].t)},${yTop(0)}`
  for (let i = 1; i < sm.length; i++) {
    path += ` L${xScale(sm[i].t)},${yTop(i)}`
  }
  path += ` L${xScale(sm[sm.length - 1].t)},${yBot(sm.length - 1)}`
  for (let i = sm.length - 2; i >= 0; i--) {
    path += ` L${xScale(sm[i].t)},${yBot(i)}`
  }
  return path + " Z"
}

// `buildRibbonPath` lived here originally. It's been replaced by:
//   1. `computeProcessSankeyRibbonInputs` in `./ribbonInputs.ts`
//      — turns attachment data into the geometric inputs
//      (sx/sTop/sBot, tx/tTop/tBot, cp1X, cp2X).
//   2. `buildRibbonGeometry` in `src/components/geometry/ribbonGeometry`
//      — emits the M-C-L-C-Z path-D + centerline bezier from those
//      inputs. SankeyDiagram's `areaLink` calls the same helper, so
//      both charts produce identical ribbon shapes (parameterized by
//      control-point placement — Sankey uses curvature, ProcessSankey
//      uses ribbonLane).

// ---------------------------------------------------------------------------
// Crossing/length scoring + slot reordering
// ---------------------------------------------------------------------------

type SlotByNode = Record<string, number>

export function countCrossings(slotByNode: SlotByNode, edges: ProcessSankeyEdge[]): number {
  let count = 0
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const e1 = edges[i], e2 = edges[j]
      if (e1.source === e2.source || e1.target === e2.target ||
          e1.source === e2.target || e1.target === e2.source) continue
      const tOverlap = Math.max(e1.startTime, e2.startTime) <
        Math.min(e1.endTime, e2.endTime)
      if (!tOverlap) continue
      const s1 = slotByNode[e1.source], t1 = slotByNode[e1.target]
      const s2 = slotByNode[e2.source], t2 = slotByNode[e2.target]
      if ((s1 < s2) !== (t1 < t2)) count++
    }
  }
  return count
}

export function totalEdgeLength(slotByNode: SlotByNode, edges: ProcessSankeyEdge[]): number {
  let total = 0
  for (const e of edges) {
    const s = slotByNode[e.source], t = slotByNode[e.target]
    total += Math.abs(s - t) * (e.value || 1)
  }
  return total
}

const COST_K = 1000
function score(slotByNode: SlotByNode, edges: ProcessSankeyEdge[]): number {
  return countCrossings(slotByNode, edges) * COST_K + totalEdgeLength(slotByNode, edges)
}

interface OrderSnapshot {
  slots: ProcessSankeySlot[]
  map: SlotByNode
}

function snapshotOrder(slots: ProcessSankeySlot[], slotByNode: SlotByNode): OrderSnapshot {
  return {
    slots: slots.map(s => ({ peak: { ...s.peak }, occupants: s.occupants.slice() })),
    map: { ...slotByNode },
  }
}
function restoreOrder(slots: ProcessSankeySlot[], slotByNode: SlotByNode, snap: OrderSnapshot): void {
  slots.length = 0
  for (const s of snap.slots) slots.push(s)
  for (const k of Object.keys(slotByNode)) delete slotByNode[k]
  for (const k of Object.keys(snap.map)) slotByNode[k] = snap.map[k]
}

function reorderByBarycenter(
  slots: ProcessSankeySlot[],
  slotByNode: SlotByNode,
  edges: ProcessSankeyEdge[],
  passes = 6,
): void {
  const n = slots.length
  if (n <= 1) return
  let bestSnap = snapshotOrder(slots, slotByNode)
  let bestScore = score(slotByNode, edges)
  for (let p = 0; p < passes; p++) {
    const bary = new Array(n).fill(0) as number[]
    const cnt = new Array(n).fill(0) as number[]
    for (const e of edges) {
      const s = slotByNode[e.source], t = slotByNode[e.target]
      bary[s] += t * (e.value || 1)
      cnt[s] += (e.value || 1)
      bary[t] += s * (e.value || 1)
      cnt[t] += (e.value || 1)
    }
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
      const ba = cnt[a] > 0 ? bary[a] / cnt[a] : a
      const bb = cnt[b] > 0 ? bary[b] / cnt[b] : b
      return ba - bb
    })
    const newSlots = order.map(i => slots[i])
    const remap = new Map<number, number>()
    order.forEach((origIdx, newIdx) => remap.set(origIdx, newIdx))
    for (const id of Object.keys(slotByNode)) {
      slotByNode[id] = remap.get(slotByNode[id])!
    }
    slots.length = 0
    for (const s of newSlots) slots.push(s)
    const cur = score(slotByNode, edges)
    if (cur < bestScore) {
      bestScore = cur
      bestSnap = snapshotOrder(slots, slotByNode)
    } else if (cur === bestScore) {
      // converged
      break
    }
  }
  restoreOrder(slots, slotByNode, bestSnap)
}

function refineByAdjacentSwap(
  slots: ProcessSankeySlot[],
  slotByNode: SlotByNode,
  edges: ProcessSankeyEdge[],
  passes = 6,
): void {
  const n = slots.length
  if (n <= 1) return
  let curScore = score(slotByNode, edges)
  for (let p = 0; p < passes; p++) {
    let improved = false
    for (let i = 0; i < n - 1; i++) {
      const tmp = slots[i]; slots[i] = slots[i + 1]; slots[i + 1] = tmp
      for (const id of Object.keys(slotByNode)) {
        if (slotByNode[id] === i) slotByNode[id] = i + 1
        else if (slotByNode[id] === i + 1) slotByNode[id] = i
      }
      const newScore = score(slotByNode, edges)
      if (newScore < curScore) {
        curScore = newScore
        improved = true
      } else {
        const tmp2 = slots[i]; slots[i] = slots[i + 1]; slots[i + 1] = tmp2
        for (const id of Object.keys(slotByNode)) {
          if (slotByNode[id] === i) slotByNode[id] = i + 1
          else if (slotByNode[id] === i + 1) slotByNode[id] = i
        }
      }
    }
    if (!improved) break
  }
}

function reorderByBruteForce(
  slots: ProcessSankeySlot[],
  slotByNode: SlotByNode,
  edges: ProcessSankeyEdge[],
): void {
  const n = slots.length
  if (n <= 1) return
  const initialMap: SlotByNode = { ...slotByNode }
  const ids = Object.keys(initialMap)
  const perm = Array.from({ length: n }, (_, i) => i)
  const position = perm.slice()
  const trialMap: SlotByNode = { ...initialMap }
  let bestPerm = perm.slice()
  let bestScore = Infinity
  const tryPerm = () => {
    for (const id of ids) trialMap[id] = position[initialMap[id]]
    const s = score(trialMap, edges)
    if (s < bestScore) { bestScore = s; bestPerm = perm.slice() }
  }
  const swap = (a: number, b: number) => {
    const va = perm[a], vb = perm[b]
    perm[a] = vb; perm[b] = va
    position[va] = b; position[vb] = a
  }
  tryPerm()
  const c = new Array(n).fill(0) as number[]
  let i = 0
  while (i < n) {
    if (c[i] < i) {
      swap(i % 2 === 0 ? 0 : c[i], i)
      tryPerm()
      c[i]++
      i = 0
    } else {
      c[i] = 0
      i++
    }
  }
  const newSlots = bestPerm.map(idx => slots[idx])
  const remap = new Map<number, number>()
  bestPerm.forEach((origIdx, newIdx) => remap.set(origIdx, newIdx))
  for (const id of Object.keys(slotByNode)) {
    slotByNode[id] = remap.get(slotByNode[id])!
  }
  slots.length = 0
  for (const s of newSlots) slots.push(s)
}

const BRUTE_FORCE_MAX = 8
const BRUTE_FORCE_EDGE_MAX = 40
function reorderForReadability(
  slots: ProcessSankeySlot[],
  slotByNode: SlotByNode,
  edges: ProcessSankeyEdge[],
): void {
  if (slots.length <= BRUTE_FORCE_MAX && edges.length <= BRUTE_FORCE_EDGE_MAX) {
    reorderByBruteForce(slots, slotByNode, edges)
  } else {
    reorderByBarycenter(slots, slotByNode, edges, 6)
    refineByAdjacentSwap(slots, slotByNode, edges, 6)
  }
}

function reorderInsideOut(slots: ProcessSankeySlot[], slotByNode: SlotByNode): void {
  const n = slots.length
  if (n <= 1) return
  const sizeOf = (s: ProcessSankeySlot) => s.peak.topPeak + s.peak.botPeak
  const sortedDesc = slots
    .map((slot, idx) => ({ slot, idx }))
    .sort((a, b) => sizeOf(b.slot) - sizeOf(a.slot))
  const result = new Array<number>(n)
  const middle = Math.floor((n - 1) / 2)
  result[middle] = sortedDesc[0].idx
  let above = middle - 1
  let below = middle + 1
  for (let i = 1; i < sortedDesc.length; i++) {
    if (i % 2 === 1 && below < n) result[below++] = sortedDesc[i].idx
    else if (above >= 0) result[above--] = sortedDesc[i].idx
    else result[below++] = sortedDesc[i].idx
  }
  const newSlots = result.map(i => slots[i])
  const remap = new Map<number, number>()
  result.forEach((origIdx, newIdx) => remap.set(origIdx, newIdx))
  for (const id of Object.keys(slotByNode)) {
    slotByNode[id] = remap.get(slotByNode[id])!
  }
  slots.length = 0
  for (const s of newSlots) slots.push(s)
}

function biasLargestToCenter(
  slots: ProcessSankeySlot[],
  slotByNode: SlotByNode,
  edges: ProcessSankeyEdge[],
): void {
  const n = slots.length
  if (n <= 1) return
  const sizeOf = (s: ProcessSankeySlot) => s.peak.topPeak + s.peak.botPeak
  // Hold slot REFERENCES (not indices) since the loop body mutates the
  // slots array via splice. The original `idx` captured before the
  // first move would be stale on every subsequent iteration, leading
  // to "move the wrong slot" (or undo the previous move) — visible as
  // unstable layouts when `laneOrder="crossing-min+inside-out"` ran
  // against fixtures with three or more slots.
  const sortedDesc = slots
    .map((slot) => ({ slot, size: sizeOf(slot) }))
    .sort((a, b) => b.size - a.size)
  const middle = Math.floor((n - 1) / 2)
  let curScore = score(slotByNode, edges)
  for (const { slot } of sortedDesc) {
    const curPos = slots.indexOf(slot)
    if (curPos < 0) continue
    const targetPos = middle
    if (curPos === targetPos) continue
    const tmp = slots[curPos]
    slots.splice(curPos, 1)
    slots.splice(targetPos, 0, tmp)
    const remap = new Map<number, number>()
    for (let i = 0; i < n; i++) remap.set(i, i)
    if (curPos < targetPos) {
      for (let i = curPos + 1; i <= targetPos; i++) remap.set(i, i - 1)
      remap.set(curPos, targetPos)
    } else {
      for (let i = targetPos; i < curPos; i++) remap.set(i, i + 1)
      remap.set(curPos, targetPos)
    }
    for (const id of Object.keys(slotByNode)) {
      slotByNode[id] = remap.get(slotByNode[id])!
    }
    const newScore = score(slotByNode, edges)
    if (newScore <= curScore) {
      curScore = newScore
    } else {
      const tmp2 = slots[targetPos]
      slots.splice(targetPos, 1)
      slots.splice(curPos, 0, tmp2)
      const undo = new Map<number, number>()
      for (let i = 0; i < n; i++) undo.set(i, i)
      if (targetPos < curPos) {
        for (let i = targetPos + 1; i <= curPos; i++) undo.set(i, i - 1)
        undo.set(targetPos, curPos)
      } else {
        for (let i = curPos; i < targetPos; i++) undo.set(i, i + 1)
        undo.set(targetPos, curPos)
      }
      for (const id of Object.keys(slotByNode)) {
        slotByNode[id] = undo.get(slotByNode[id])!
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Lane layout
// ---------------------------------------------------------------------------

interface LaneLayoutOptions {
  plotH: number
  padding: number
  valueScale: number
  packing?: "off" | "reuse"
  laneOrder?: "insertion" | "crossing-min" | "inside-out" | "crossing-min+inside-out"
  lifetimeMode?: "full" | "half"
}

interface LaneLayoutResult {
  effectiveSlotsHeight: number
  centerlines: Record<string, number>
  laneLifetime: Record<string, ProcessSankeyLaneLifetime>
  slots: ProcessSankeySlot[]
  slotByNode: SlotByNode
  slotCenter: number[]
  crossingsBefore: number | null
  crossingsAfter: number | null
  lengthBefore: number | null
  lengthAfter: number | null
}

export function computeLaneLayout(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[],
  nodeData: Record<string, ProcessSankeyNodeData>,
  edgeIndex: ProcessSankeyEdgeIndex,
  opts: LaneLayoutOptions,
): LaneLayoutResult {
  const { plotH, padding, valueScale, packing, laneOrder, lifetimeMode = "full" } = opts
  const topPeak: Record<string, number> = {}
  const botPeak: Record<string, number> = {}
  for (const n of nodes) {
    topPeak[n.id] = nodeData[n.id].topPeak || 0
    botPeak[n.id] = nodeData[n.id].botPeak || 0
  }

  const half = lifetimeMode === "half"
  const laneLifetime: Record<string, ProcessSankeyLaneLifetime> = {}
  for (const n of nodes) {
    // xExtent: optional [start, end] explicit lifetime bounds. The
    // node's lane spans `min(xExtent[0], earliestEdge)` to
    // `max(xExtent[1], latestEdge)` — explicit extent extends the
    // lane *outward* but never trims it inside the actual edge range.
    const explicitStart = Array.isArray(n.xExtent) ? n.xExtent[0] : null
    const explicitEnd   = Array.isArray(n.xExtent) ? n.xExtent[1] : null
    let tStart: number = explicitStart != null && Number.isFinite(explicitStart) ? explicitStart : Infinity
    let tEnd: number   = explicitEnd   != null && Number.isFinite(explicitEnd)   ? explicitEnd   : -Infinity
    for (const e of edgeIndex.outgoing[n.id]) {
      if (e.startTime < tStart) tStart = e.startTime
      const endForSource = half ? (e.startTime + e.endTime) / 2 : e.endTime
      if (endForSource > tEnd) tEnd = endForSource
    }
    for (const e of edgeIndex.incoming[n.id]) {
      const startForTarget = half ? (e.startTime + e.endTime) / 2 : e.startTime
      if (startForTarget < tStart) tStart = startForTarget
      if (e.endTime > tEnd) tEnd = e.endTime
    }
    laneLifetime[n.id] = {
      start: Number.isFinite(tStart) ? tStart : null,
      end:   Number.isFinite(tEnd)   ? tEnd   : null,
    }
  }

  const slotByNode: SlotByNode = {}
  const slots: ProcessSankeySlot[] = []

  if (packing === "reuse") {
    // Sort by (topological depth, lifetime start). Hierarchical
    // fixtures pack one slot per depth level; cyclic graphs fall back
    // to lifetime sort within depth=0.
    const depth = new Map<string, number>()
    for (const n of nodes) depth.set(n.id, 0)
    const indeg = new Map<string, number>()
    for (const n of nodes) indeg.set(n.id, 0)
    for (const e of edges) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1)
    const queue: string[] = []
    for (const n of nodes) if ((indeg.get(n.id) ?? 0) === 0) queue.push(n.id)
    while (queue.length) {
      const u = queue.shift()!
      for (const e of edgeIndex.outgoing[u] ?? []) {
        const cand = (depth.get(u) ?? 0) + 1
        if (cand > (depth.get(e.target) ?? 0)) depth.set(e.target, cand)
        indeg.set(e.target, indeg.get(e.target)! - 1)
        if (indeg.get(e.target) === 0) queue.push(e.target)
      }
    }
    const sorted = [...nodes]
      .filter(n => laneLifetime[n.id].start !== null)
      .sort((a, b) => {
        const da = depth.get(a.id) ?? 0
        const db = depth.get(b.id) ?? 0
        if (da !== db) return da - db
        return (laneLifetime[a.id].start as number) - (laneLifetime[b.id].start as number)
      })
    const orphans = nodes.filter(n => laneLifetime[n.id].start === null)
    for (const n of [...sorted, ...orphans]) {
      const lt = laneLifetime[n.id]
      let placed = -1
      for (let s = 0; s < slots.length; s++) {
        const lastOcc = slots[s].occupants[slots[s].occupants.length - 1]
        if (lt.start === null || lastOcc === undefined || lastOcc.end <= lt.start) {
          placed = s; break
        }
      }
      if (placed === -1) {
        slots.push({ occupants: [], peak: { topPeak: 0, botPeak: 0 } })
        placed = slots.length - 1
      }
      slots[placed].occupants.push({ id: n.id, end: lt?.end ?? -Infinity })
      slots[placed].peak.topPeak = Math.max(slots[placed].peak.topPeak, topPeak[n.id])
      slots[placed].peak.botPeak = Math.max(slots[placed].peak.botPeak, botPeak[n.id])
      slotByNode[n.id] = placed
    }
  } else {
    nodes.forEach((n, i) => {
      slots.push({
        occupants: [{ id: n.id, end: laneLifetime[n.id]?.end ?? -Infinity }],
        peak: { topPeak: topPeak[n.id], botPeak: botPeak[n.id] },
      })
      slotByNode[n.id] = i
    })
  }

  let crossingsBefore: number | null = null
  let crossingsAfter: number | null = null
  let lengthBefore: number | null = null
  let lengthAfter: number | null = null
  const measureBefore = () => {
    crossingsBefore = countCrossings(slotByNode, edges)
    lengthBefore = totalEdgeLength(slotByNode, edges)
  }
  const measureAfter = () => {
    crossingsAfter = countCrossings(slotByNode, edges)
    lengthAfter = totalEdgeLength(slotByNode, edges)
  }
  if (laneOrder === "crossing-min") {
    measureBefore()
    reorderForReadability(slots, slotByNode, edges)
    measureAfter()
  } else if (laneOrder === "inside-out") {
    measureBefore()
    reorderInsideOut(slots, slotByNode)
    measureAfter()
  } else if (laneOrder === "crossing-min+inside-out") {
    measureBefore()
    reorderForReadability(slots, slotByNode, edges)
    biasLargestToCenter(slots, slotByNode, edges)
    measureAfter()
  }

  // Position slots vertically using max-simultaneous-sum between
  // adjacent slots instead of sum of per-slot peaks. Tightens layout
  // when peaks happen at different times.
  const slotProfiles: Array<Array<[number, { top: number; bot: number }]>> = slots.map((slot) => {
    const byT = new Map<number, { top: number; bot: number }>()
    for (const occ of slot.occupants) {
      const data = nodeData[occ.id]
      if (!data) continue
      for (const sample of data.samples) {
        const cur = byT.get(sample.t) || { top: 0, bot: 0 }
        byT.set(sample.t, {
          top: Math.max(cur.top, sample.topMass),
          bot: Math.max(cur.bot, sample.botMass),
        })
      }
    }
    return [...byT.entries()].sort((a, b) => a[0] - b[0])
  })
  const massAt = (profile: Array<[number, { top: number; bot: number }]>, t: number): { top: number; bot: number } => {
    let cur: { top: number; bot: number } = { top: 0, bot: 0 }
    for (const [st, m] of profile) {
      if (st > t) break
      cur = m
    }
    return cur
  }
  const adjacentMaxSum: number[] = []
  for (let i = 0; i < slots.length - 1; i++) {
    const profileA = slotProfiles[i]
    const profileB = slotProfiles[i + 1]
    const allTimes = new Set<number>([...profileA.map((p) => p[0]), ...profileB.map((p) => p[0])])
    let maxSum = 0
    for (const t of allTimes) {
      const a = massAt(profileA, t)
      const b = massAt(profileB, t)
      if (a.bot + b.top > maxSum) maxSum = a.bot + b.top
    }
    adjacentMaxSum.push(maxSum)
  }

  const slotCenter: number[] = []
  let cursor = padding + (slots[0]?.peak.topPeak ?? 0) * valueScale
  if (slots.length > 0) slotCenter.push(cursor)
  for (let i = 1; i < slots.length; i++) {
    cursor += adjacentMaxSum[i - 1] * valueScale + padding
    slotCenter.push(cursor)
  }
  if (slots.length > 0) {
    cursor += slots[slots.length - 1].peak.botPeak * valueScale + padding
  }

  if (cursor > plotH) {
    const scale = plotH / cursor
    for (let i = 0; i < slotCenter.length; i++) slotCenter[i] *= scale
  }

  const effectiveSlotsHeight = slots.length === 0
    ? 0
    : slots[0].peak.topPeak
      + adjacentMaxSum.reduce((a, b) => a + b, 0)
      + slots[slots.length - 1].peak.botPeak

  const centerlines: Record<string, number> = {}
  for (const n of nodes) centerlines[n.id] = slotCenter[slotByNode[n.id]]

  return {
    effectiveSlotsHeight,
    centerlines, laneLifetime, slots, slotByNode, slotCenter,
    crossingsBefore, crossingsAfter, lengthBefore, lengthAfter,
  }
}

// ---------------------------------------------------------------------------
// Top-level orchestrator
// ---------------------------------------------------------------------------

/**
 * Compute the full Process Sankey layout for a given dataset and
 * configuration. Pure function, no side effects.
 *
 * The chart's time domain isn't a layout opt — domain handling lives
 * in the geometry helpers (`buildBandPath`, `buildRibbonGeometry`,
 * `clampSamples`) which receive an `xScale` and a domain pair from
 * the caller. The layout itself is timeless apart from the per-node
 * sample/event timestamps.
 */
export function computeProcessSankeyLayout(
  nodes: ProcessSankeyNode[],
  edges: ProcessSankeyEdge[],
  opts: ProcessSankeyOptions,
): ProcessSankeyLayout {
  const {
    plotH,
    pairing = "temporal",
    packing = "reuse",
    laneOrder = "crossing-min",
    lifetimeMode = "half",
  } = opts

  const edgeIndex = buildEdgeIndex(nodes, edges)
  const sides = assignSides(nodes, edges, edgeIndex, pairing)
  let nodeData: Record<string, ProcessSankeyNodeData> = {}
  for (const n of nodes) {
    nodeData[n.id] = computeNode(n, edgeIndex, sides)
  }

  // First pass: lay out slots with the alternating side assignment.
  const basePadding = 12
  const dry1 = computeLaneLayout(nodes, edges, nodeData, edgeIndex, {
    plotH, padding: basePadding, valueScale: 1, packing, laneOrder, lifetimeMode,
  })

  // Override sides based on slot ordering: top when target is in a
  // higher slot, bot when lower. Same-slot edges become "handoff"
  // edges along the bottom of the shared lane.
  const sameSlotEdgeIds = new Set<string>()
  for (const e of edges) {
    const ss = dry1.slotByNode[e.source]
    const ts = dry1.slotByNode[e.target]
    if (ss === undefined || ts === undefined) continue
    const sObj = sides.get(e.id)!
    if (ss === ts) {
      sameSlotEdgeIds.add(e.id)
      sObj.sourceSide = "bot"
      sObj.targetSide = "bot"
      continue
    }
    if (ts < ss) { sObj.sourceSide = "top"; sObj.targetSide = "bot" }
    else        { sObj.sourceSide = "bot"; sObj.targetSide = "top" }
  }

  // Same-slot incoming edges align with the node's outgoing side so
  // pure accretors (PR1, PR2 etc) don't step.
  for (const n of nodes) {
    const out = edgeIndex.outgoing[n.id]
    const inn = edgeIndex.incoming[n.id]
    const outSides = new Set(out.map((e) => sides.get(e.id)!.sourceSide))
    const inSides  = new Set(inn.map((e) => sides.get(e.id)!.targetSide))
    if (outSides.size === 1 && inn.length > 0) {
      const align = [...outSides][0]
      for (const e of inn) {
        if (dry1.slotByNode[e.source] === dry1.slotByNode[e.target]) {
          sides.get(e.id)!.targetSide = align
        }
      }
    }
    if (inSides.size === 1 && out.length > 0) {
      const align = [...inSides][0]
      for (const e of out) {
        if (dry1.slotByNode[e.source] === dry1.slotByNode[e.target]) {
          sides.get(e.id)!.sourceSide = align
        }
      }
    }
  }

  // Per-node side rebalance to keep multi-edge bundles within
  // available per-side mass.
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
        .sort((a, b) => b.value - a.value)
      if (candidates.length === 0) return false
      sides.get(candidates[0].id)!.sourceSide = toSide
      return true
    }
    let safety = out.length + 1
    while (safety-- > 0) {
      if (!tryMove("top", "bot") && !tryMove("bot", "top")) break
    }
  }

  // Recompute samples with new sides
  nodeData = {}
  for (const n of nodes) {
    nodeData[n.id] = computeNode(n, edgeIndex, sides)
  }
  const dry = computeLaneLayout(nodes, edges, nodeData, edgeIndex, {
    plotH, padding: basePadding, valueScale: 1, packing, laneOrder, lifetimeMode,
  })

  // valueScale: tight effective slot height, not sum of per-slot peaks
  const slotsHeight = dry.effectiveSlotsHeight ?? dry.slots.reduce(
    (s, slot) => s + slot.peak.topPeak + slot.peak.botPeak, 0
  )
  const padding = Math.min(
    basePadding,
    (plotH * 0.35) / Math.max(dry.slots.length + 1, 1)
  )
  const totalGaps = padding * (dry.slots.length + 1)
  const valueScale = slotsHeight > 0
    ? Math.max(0, (plotH - totalGaps) / slotsHeight)
    : 1

  const layout = computeLaneLayout(nodes, edges, nodeData, edgeIndex, {
    plotH, padding, valueScale, packing, laneOrder, lifetimeMode,
  })

  return {
    nodeData,
    sides,
    valueScale,
    padding,
    compressedPadding: padding < basePadding,
    centerlines: layout.centerlines,
    laneLifetime: layout.laneLifetime,
    slots: layout.slots,
    slotByNode: layout.slotByNode,
    crossingsBefore: layout.crossingsBefore,
    crossingsAfter: layout.crossingsAfter,
    lengthBefore: layout.lengthBefore,
    lengthAfter: layout.lengthAfter,
  }
}
