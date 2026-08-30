import type { Datum } from "../charts/shared/datumTypes"
import type { RealtimeEdge, RealtimeNode } from "../stream/networkTypes"
import { createSafeDatum, readField, unwrapDatum } from "./recipeUtils"

export interface AdjacencyFlowConfig {
  /** Explicit sequence for diagonal nodes. Unlisted nodes retain input order. */
  order?: readonly string[]
  /** Node field (or callback) used for the displayed label. @default "label" */
  labelAccessor?: string | ((node: Datum) => string)
  /** Edge field (or callback) used for flow magnitude. @default "value" */
  valueAccessor?: string | ((edge: Datum) => number | undefined)
  /** Outer matrix padding in plot pixels. @default 18 */
  padding?: number
  /** Upper bound for one matrix cell. Keeps summaries compact. @default 120 */
  maxCellSize?: number
  /** Square node size in pixels. By default it is derived from cell size. */
  nodeSize?: number
  /** Space reserved at either end of each node port. @default 4 */
  portPadding?: number
  /** Separation between adjacent flow strokes at a node port. @default 0.75 */
  flowGap?: number
  /** Smallest preferred visible flow width before fit-to-port shrinking. @default 1.25 */
  minFlowWidth?: number
  /** Largest allowed flow width. @default Infinity */
  maxFlowWidth?: number
  /** Fixed pixels per value unit. Omit to fit the busiest port automatically. */
  flowScale?: number
  /** Radius for the orthogonal turn fillet. @default 10 */
  cornerRadius?: number
  /** Flow color encoding. "source" also applies the source color to its node. @default "single" */
  colorMode?: "single" | "source" | "target" | "edge"
  /** Single color or per-aggregated-edge callback. */
  edgeColor?: string | ((edge: Datum) => string | undefined)
  /** Node color or per-node callback. */
  nodeColor?: string | ((node: Datum, index: number) => string | undefined)
  nodeTextColor?: string
  nodeStroke?: string
  /** Dotted adjacency grid behind the routes. @default true */
  showGrid?: boolean
  /** Numeric labels at matrix-cell turns. @default true */
  showValues?: boolean
  valueFormat?: (value: number, edge: Datum) => string
  /** Direction arrow placed on every route. @default true */
  showArrows?: boolean
  /** Arrow fill. Defaults to the --semiotic-adjacency-flow-arrow-fill CSS variable. */
  arrowColor?: string
  /** Maximum arrow width across its route. @default 14 */
  arrowSize?: number
  labelFontSize?: number
  valueFontSize?: number
  /** Maximum visible label length before an ellipsis. @default 14 */
  maxLabelLength?: number
}

export interface PlacedNode {
  id: string
  label: string
  datum: Datum
  index: number
  cx: number
  cy: number
}

export interface FlowEdge {
  key: string
  source: string
  target: string
  sourceIndex: number
  targetIndex: number
  value: number
  edgeCount: number
  memberEdges: Datum[]
  datum: Datum
  width: number
  color: string
}

export function rawDatum(value: RealtimeNode | RealtimeEdge): Datum {
  return (unwrapDatum<Datum>(value) ?? value) as Datum
}

function endpointId(value: RealtimeEdge["source"]): string {
  return typeof value === "string" ? value : value.id
}

function finitePositive(value: unknown, fallback: number): number {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function coord(value: number): string {
  return String(Math.round(value * 100) / 100)
}

export function roundedOrthogonalPath(
  points: ReadonlyArray<[number, number]>,
  radius: number
): string {
  if (points.length < 2) return ""
  let path = `M${coord(points[0][0])},${coord(points[0][1])}`
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const next = points[index + 1]
    const incomingLength = Math.hypot(
      current[0] - previous[0],
      current[1] - previous[1]
    )
    const outgoingLength = Math.hypot(
      next[0] - current[0],
      next[1] - current[1]
    )
    const turnRadius = Math.min(radius, incomingLength / 2, outgoingLength / 2)
    if (turnRadius <= 0) {
      path += `L${coord(current[0])},${coord(current[1])}`
      continue
    }
    const incomingUnit: [number, number] = [
      (current[0] - previous[0]) / incomingLength,
      (current[1] - previous[1]) / incomingLength
    ]
    const outgoingUnit: [number, number] = [
      (next[0] - current[0]) / outgoingLength,
      (next[1] - current[1]) / outgoingLength
    ]
    const before: [number, number] = [
      current[0] - incomingUnit[0] * turnRadius,
      current[1] - incomingUnit[1] * turnRadius
    ]
    const after: [number, number] = [
      current[0] + outgoingUnit[0] * turnRadius,
      current[1] + outgoingUnit[1] * turnRadius
    ]
    path += `L${coord(before[0])},${coord(before[1])}Q${coord(current[0])},${coord(current[1])} ${coord(after[0])},${coord(after[1])}`
  }
  const last = points[points.length - 1]
  return `${path}L${coord(last[0])},${coord(last[1])}`
}

export function arrowPath(
  x: number,
  y: number,
  angle: number,
  length: number,
  width: number = length * 0.92
): string {
  const forwardX = Math.cos(angle)
  const forwardY = Math.sin(angle)
  const normalX = -forwardY
  const normalY = forwardX
  const tip: [number, number] = [
    x + forwardX * length * 0.56,
    y + forwardY * length * 0.56
  ]
  const backX = x - forwardX * length * 0.44
  const backY = y - forwardY * length * 0.44
  const left: [number, number] = [
    backX + normalX * width * 0.5,
    backY + normalY * width * 0.5
  ]
  const right: [number, number] = [
    backX - normalX * width * 0.5,
    backY - normalY * width * 0.5
  ]
  return `M${coord(tip[0])},${coord(tip[1])}L${coord(left[0])},${coord(left[1])}L${coord(right[0])},${coord(right[1])}Z`
}

export function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label
  return `${label.slice(0, Math.max(1, maxLength - 1))}…`
}

function groupKey(
  nodeId: string,
  side: "out-right" | "out-left" | "in-top" | "in-bottom"
): string {
  return `${side}\u0000${nodeId}`
}

export function adjacencyFlowAggregateEdges(
  edges: readonly RealtimeEdge[],
  indexById: Map<string, number>,
  config: AdjacencyFlowConfig
): FlowEdge[] {
  const bySource = new Map<string, Map<string, FlowEdge>>()
  for (const wrapper of edges) {
    const source = endpointId(wrapper.source)
    const target = endpointId(wrapper.target)
    const sourceIndex = indexById.get(source)
    const targetIndex = indexById.get(target)
    if (sourceIndex == null || targetIndex == null) continue
    const raw = rawDatum(wrapper)
    const accessed =
      typeof config.valueAccessor === "function"
        ? config.valueAccessor(raw)
        : readField(raw, config.valueAccessor ?? "value", wrapper.value ?? 1)
    const value = finitePositive(accessed, 0)
    if (value <= 0) continue
    let targets = bySource.get(source)
    if (!targets) {
      targets = new Map()
      bySource.set(source, targets)
    }
    const existing = targets.get(target)
    if (existing) {
      existing.value += value
      existing.edgeCount += 1
      existing.memberEdges.push(raw)
      continue
    }
    targets.set(target, {
      key: `${sourceIndex}-${targetIndex}`,
      source,
      target,
      sourceIndex,
      targetIndex,
      value,
      edgeCount: 1,
      memberEdges: [raw],
      datum: raw,
      width: 1,
      color: ""
    })
  }

  const aggregated = [...bySource.values()].flatMap((targets) => [
    ...targets.values()
  ])
  for (const edge of aggregated) {
    edge.datum = createSafeDatum((set) => {
      for (const [key, value] of Object.entries(edge.memberEdges[0] ?? {}))
        set(key, value)
      set("source", edge.source)
      set("target", edge.target)
      set("value", edge.value)
      set("edgeCount", edge.edgeCount)
      set("internal", edge.source === edge.target)
      set("memberEdges", edge.memberEdges)
    })
  }
  return aggregated
}

export function allocateAdjacencyFlowWidths(
  edges: FlowEdge[],
  nodeSize: number,
  config: AdjacencyFlowConfig
): Map<string, FlowEdge[]> {
  const groups = new Map<string, FlowEdge[]>()
  const add = (key: string, edge: FlowEdge) => {
    const bucket = groups.get(key)
    if (bucket) bucket.push(edge)
    else groups.set(key, [edge])
  }
  for (const edge of edges) {
    add(
      groupKey(
        edge.source,
        edge.targetIndex >= edge.sourceIndex ? "out-right" : "out-left"
      ),
      edge
    )
    add(
      groupKey(
        edge.target,
        edge.sourceIndex < edge.targetIndex ? "in-top" : "in-bottom"
      ),
      edge
    )
  }

  for (const [key, group] of groups) {
    const outgoing = key.startsWith("out-")
    group.sort((a, b) => {
      const aIndex = outgoing ? a.targetIndex : a.sourceIndex
      const bIndex = outgoing ? b.targetIndex : b.sourceIndex
      return aIndex - bIndex || a.key.localeCompare(b.key)
    })
  }

  const gap = Math.max(0, config.flowGap ?? 0.75)
  const available = Math.max(
    1,
    nodeSize - Math.max(0, config.portPadding ?? 4) * 2
  )
  let scale =
    config.flowScale == null
      ? Number.POSITIVE_INFINITY
      : Math.max(0, config.flowScale)
  if (config.flowScale == null) {
    for (const group of groups.values()) {
      const valueTotal = group.reduce((sum, edge) => sum + edge.value, 0)
      const widthAvailable = Math.max(
        0.1,
        available - gap * Math.max(0, group.length - 1)
      )
      if (valueTotal > 0) scale = Math.min(scale, widthAvailable / valueTotal)
    }
    if (!Number.isFinite(scale)) scale = 1
  }

  const minWidth = Math.max(0, config.minFlowWidth ?? 1.25)
  const maxWidth = Math.max(
    minWidth,
    config.maxFlowWidth ?? Number.POSITIVE_INFINITY
  )
  for (const edge of edges)
    edge.width = Math.min(maxWidth, Math.max(minWidth, edge.value * scale))

  let shrink = 1
  for (const group of groups.values()) {
    const desired = group.reduce((sum, edge) => sum + edge.width, 0)
    const widthAvailable = Math.max(
      0.1,
      available - gap * Math.max(0, group.length - 1)
    )
    if (desired > 0) shrink = Math.min(shrink, widthAvailable / desired)
  }
  if (shrink < 1) for (const edge of edges) edge.width *= shrink
  return groups
}

export function allocateAdjacencyFlowPorts(
  groups: Map<string, FlowEdge[]>,
  nodesById: Map<string, PlacedNode>,
  config: AdjacencyFlowConfig
): Map<string, number> {
  const ports = new Map<string, number>()
  const gap = Math.max(0, config.flowGap ?? 0.75)
  for (const [key, group] of groups) {
    const nodeId = key.slice(key.indexOf("\u0000") + 1)
    const node = nodesById.get(nodeId)
    if (!node) continue
    const verticalPort = key.startsWith("out-")
    const center = verticalPort ? node.cy : node.cx
    const total =
      group.reduce((sum, edge) => sum + edge.width, 0) +
      gap * Math.max(0, group.length - 1)
    let cursor = center - total / 2
    for (const edge of group) {
      const position = cursor + edge.width / 2
      const sourceSide = key.startsWith("out-")
      ports.set(`${edge.key}:${sourceSide ? "source" : "target"}`, position)
      cursor += edge.width + gap
    }
  }
  return ports
}
