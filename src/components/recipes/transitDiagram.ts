import type { Datum } from "../charts/shared/datumTypes"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type {
  NetworkCircleNode,
  NetworkCurvedEdge,
  NetworkLabel,
  RealtimeEdge,
  RealtimeNode,
} from "../stream/networkTypes"
import { createSafeDatum, readField, unwrapDatum } from "./recipeUtils"
import {
  computeTransitDiagramPositions,
  octilinearRoute,
  offsetTransitPath,
  roundedTransitPath,
  type TransitDiagramPoint,
  type TransitDiagramPositionResult,
} from "./transitDiagramGeometry"

export interface TransitDiagramLineDescriptor {
  id: string
  color?: string
  label?: string
}

export type TransitDiagramLineValue =
  | string
  | number
  | TransitDiagramLineDescriptor
  | ReadonlyArray<string | number | TransitDiagramLineDescriptor>

export interface TransitDiagramConfig {
  /** Complete authored x/y positions win by default; otherwise use topology. */
  layoutMode?: "auto" | "authored" | "automatic"
  xAccessor?: string | ((d: Datum) => number | undefined)
  yAccessor?: string | ((d: Datum) => number | undefined)
  labelAccessor?: string | ((d: Datum) => string)
  lineAccessor?: string | ((d: Datum) => TransitDiagramLineValue | undefined)
  lineColorAccessor?: string | ((d: Datum) => string | undefined)
  lineColors?: Record<string, string>
  /** Preferred global order for parallel lines. Remaining lines sort by id. */
  lineOrder?: string[]
  /** Field containing authored intermediate `{x,y}` points. @default "points" */
  pointsAccessor?: string
  padding?: number
  componentGap?: number
  /** Preferred endpoint for the automatic topology layout. */
  rootId?: string
  direction?: "left-to-right" | "right-to-left"
  lineWidth?: number
  lineGap?: number
  cornerRadius?: number
  stationRadius?: number
  interchangeRadius?: number
  stationFill?: string
  stationStroke?: string
  showLabels?: boolean
  labelFontSize?: number
  labelColor?: string
  dimOpacity?: number
}

interface PreparedNode {
  id: string
  data: Datum
  wrapper: RealtimeNode
}

interface PreparedEdge {
  source: string
  target: string
  data: Datum
  wrapper: RealtimeEdge
}

interface SegmentLine {
  descriptor: TransitDiagramLineDescriptor
  edge: PreparedEdge
}

interface PhysicalSegment {
  key: string
  source: string
  target: string
  lines: Map<string, SegmentLine>
  authoredOrder?: string[]
}

function rawDatum(value: RealtimeNode | RealtimeEdge): Datum {
  return (unwrapDatum<Datum>(value) ?? value) as Datum
}

function edgeEndpoint(value: RealtimeEdge["source"]): string {
  return typeof value === "string" ? value : value.id
}

function normalizeLineValue(value: TransitDiagramLineValue | undefined): TransitDiagramLineDescriptor[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value]
  const descriptors = values.map((entry) => {
    if (typeof entry === "object") return { ...entry, id: String(entry.id) }
    return { id: String(entry) }
  })
  return descriptors.length > 0 ? descriptors : [{ id: "network" }]
}

function lineDescriptors(edge: PreparedEdge, config: TransitDiagramConfig): TransitDiagramLineDescriptor[] {
  const accessor = config.lineAccessor
  let value: TransitDiagramLineValue | undefined
  if (typeof accessor === "function") value = accessor(edge.data)
  else if (typeof accessor === "string") value = edge.data[accessor] as TransitDiagramLineValue
  else {
    value = (edge.data.lines ?? edge.data.line ?? edge.data.route ?? edge.data.group) as
      | TransitDiagramLineValue
      | undefined
  }
  return normalizeLineValue(value)
}

function resolveLineColor(
  line: TransitDiagramLineDescriptor,
  edge: PreparedEdge,
  config: TransitDiagramConfig,
  resolveColor: (key: string) => string,
): string {
  if (line.color) return line.color
  if (config.lineColors?.[line.id]) return config.lineColors[line.id]
  const accessor = config.lineColorAccessor
  const accessed =
    typeof accessor === "function"
      ? accessor(edge.data)
      : typeof accessor === "string"
        ? edge.data[accessor]
        : edge.data.color
  return typeof accessed === "string" ? accessed : resolveColor(line.id)
}

function prepareSegments(edges: readonly PreparedEdge[], config: TransitDiagramConfig): PhysicalSegment[] {
  const segments = new Map<string, PhysicalSegment>()
  for (const edge of edges) {
    const key =
      edge.source < edge.target
        ? `${edge.source}\u0000${edge.target}`
        : `${edge.target}\u0000${edge.source}`
    let segment = segments.get(key)
    if (!segment) {
      segment = { key, source: edge.source, target: edge.target, lines: new Map() }
      segments.set(key, segment)
    }
    const authoredOrder = edge.data.lineOrder
    if (Array.isArray(authoredOrder)) segment.authoredOrder = authoredOrder.map(String)
    for (const descriptor of lineDescriptors(edge, config)) {
      if (!segment.lines.has(descriptor.id)) segment.lines.set(descriptor.id, { descriptor, edge })
    }
  }
  return [...segments.values()].sort((a, b) => a.key.localeCompare(b.key))
}

function orderSegmentLines(segment: PhysicalSegment, config: TransitDiagramConfig): SegmentLine[] {
  const preferred = segment.authoredOrder ?? config.lineOrder ?? []
  const rank = new Map(preferred.map((id, index) => [id, index]))
  return [...segment.lines.values()].sort(
    (a, b) =>
      (rank.get(a.descriptor.id) ?? Number.POSITIVE_INFINITY) -
        (rank.get(b.descriptor.id) ?? Number.POSITIVE_INFINITY) ||
      a.descriptor.id.localeCompare(b.descriptor.id),
  )
}

function authoredPoints(
  edge: PreparedEdge,
  positions: TransitDiagramPositionResult,
  config: TransitDiagramConfig,
): TransitDiagramPoint[] | null {
  if (positions.mode !== "authored") return null
  const value = edge.data[config.pointsAccessor ?? "points"]
  if (!Array.isArray(value)) return null
  const points = value
    .map((point) => {
      const record = point as { x?: unknown; y?: unknown }
      return typeof record.x === "number" && typeof record.y === "number"
        ? positions.projectAuthoredPoint({ x: record.x, y: record.y })
        : null
    })
    .filter((point): point is TransitDiagramPoint => point != null)
  return points.length > 0 ? points : null
}

function enrichedEdgeDatum(
  edge: PreparedEdge,
  line: TransitDiagramLineDescriptor,
): Datum {
  return createSafeDatum((set) => {
    for (const [key, value] of Object.entries(edge.data)) set(key, value)
    set("source", edge.source)
    set("target", edge.target)
    set("lineId", line.id)
    set("lineLabel", line.label ?? line.id)
  })
}

interface LabelBox {
  left: number
  right: number
  top: number
  bottom: number
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function placeLabels(
  nodes: readonly PreparedNode[],
  positions: TransitDiagramPositionResult["positions"],
  lineIdsByStation: Map<string, Set<string>>,
  plot: { width: number; height: number },
  config: TransitDiagramConfig,
): NetworkLabel[] {
  if (config.showLabels === false) return []
  const fontSize = config.labelFontSize ?? 11
  const placed: LabelBox[] = []
  const labels: NetworkLabel[] = []
  const sorted = [...nodes].sort(
    (a, b) =>
      (lineIdsByStation.get(b.id)?.size ?? 0) - (lineIdsByStation.get(a.id)?.size ?? 0) ||
      a.id.localeCompare(b.id),
  )
  for (const node of sorted) {
    const point = positions.get(node.id)
    if (!point) continue
    const rawLabel =
      typeof config.labelAccessor === "function"
        ? config.labelAccessor(node.data)
        : String(readField(node.data, config.labelAccessor ?? "label", node.id))
    const text = rawLabel || node.id
    const width = Math.max(fontSize * 2, text.length * fontSize * 0.58)
    const height = fontSize * 1.25
    const distance = (config.interchangeRadius ?? 7) + 5
    const candidates = [
      { x: point.x + distance, y: point.y, anchor: "start" as const, left: point.x + distance },
      { x: point.x - distance, y: point.y, anchor: "end" as const, left: point.x - distance - width },
      { x: point.x, y: point.y - distance, anchor: "middle" as const, left: point.x - width / 2 },
      { x: point.x, y: point.y + distance, anchor: "middle" as const, left: point.x - width / 2 },
    ]
    const scored = candidates.map((candidate, index) => {
      const box = {
        left: candidate.left,
        right: candidate.left + width,
        top: candidate.y - height / 2,
        bottom: candidate.y + height / 2,
      }
      const collisions = placed.filter((other) => overlaps(box, other)).length
      const overflow =
        Math.max(0, -box.left) +
        Math.max(0, box.right - plot.width) +
        Math.max(0, -box.top) +
        Math.max(0, box.bottom - plot.height)
      return { candidate, box, score: collisions * 10000 + overflow * 10 + index }
    })
    const winner = scored.sort((a, b) => a.score - b.score)[0]
    placed.push(winner.box)
    labels.push({
      x: winner.candidate.x,
      y: winner.candidate.y,
      text,
      anchor: winner.candidate.anchor,
      baseline: "middle",
      fontSize,
      fill: config.labelColor ?? "var(--semiotic-text, #222)",
      stroke: "var(--semiotic-background, white)",
      strokeWidth: 3,
      paintOrder: "stroke",
    })
  }
  return labels
}

/**
 * Transit-diagram renderer with a deliberately useful fallback.
 *
 * Complete station x/y coordinates are fitted and honored. If any are missing,
 * the recipe computes a deterministic topology-led layered layout, reduces
 * crossings with repeated barycenter sweeps, and routes every connection using
 * horizontal, vertical, and 45-degree segments. The fallback is a starting
 * point for experimentation; authored coordinates, waypoints, and line order
 * remain the path to publication-quality diagrams.
 */
export const transitDiagramLayout: NetworkCustomLayout<TransitDiagramConfig> = (ctx) => {
  const config = ctx.config ?? {}
  const nodes: PreparedNode[] = ctx.nodes.map((wrapper) => ({
    id: wrapper.id,
    data: rawDatum(wrapper),
    wrapper,
  }))
  const edges: PreparedEdge[] = ctx.edges.map((wrapper) => ({
    source: edgeEndpoint(wrapper.source),
    target: edgeEndpoint(wrapper.target),
    data: rawDatum(wrapper),
    wrapper,
  }))
  const positionResult = computeTransitDiagramPositions(
    nodes,
    edges,
    ctx.dimensions.plot,
    config,
  )
  const segments = prepareSegments(edges, config)
  const lineIdsByStation = new Map(nodes.map((node) => [node.id, new Set<string>()]))
  const lineWidth = Math.max(1, config.lineWidth ?? 6)
  const lineGap = Math.max(0, config.lineGap ?? 2)
  const sceneEdges: NetworkCurvedEdge[] = []

  for (const segment of segments) {
    const source = positionResult.positions.get(segment.source)
    const target = positionResult.positions.get(segment.target)
    if (!source || !target) continue
    const orderedLines = orderSegmentLines(segment, config)
    orderedLines.forEach((line, index) => {
      lineIdsByStation.get(segment.source)?.add(line.descriptor.id)
      lineIdsByStation.get(segment.target)?.add(line.descriptor.id)
      const middle = authoredPoints(line.edge, positionResult, config)
      const base = middle
        ? [source, ...middle, target]
        : octilinearRoute(source, target)
      const distance = (index - (orderedLines.length - 1) / 2) * (lineWidth + lineGap)
      const path = offsetTransitPath(base, distance)
      const datum = enrichedEdgeDatum(line.edge, line.descriptor)
      sceneEdges.push({
        type: "curved",
        id: `${segment.key}:${line.descriptor.id}`,
        label: `${line.descriptor.label ?? line.descriptor.id}: ${segment.source} to ${segment.target}`,
        pathD: roundedTransitPath(path, config.cornerRadius ?? 10),
        style: {
          fill: "none",
          stroke: resolveLineColor(line.descriptor, line.edge, config, ctx.resolveColor),
          strokeWidth: lineWidth,
          strokeLinecap: "round",
        },
        datum,
        accessibleDatum: datum,
        accessibility: {
          label: `${line.descriptor.label ?? line.descriptor.id}, ${segment.source} to ${segment.target}`,
          tableFields: {
            line: line.descriptor.label ?? line.descriptor.id,
            source: segment.source,
            target: segment.target,
          },
        },
      })
    })
  }

  const sceneNodes: NetworkCircleNode[] = nodes.flatMap((node) => {
    const point = positionResult.positions.get(node.id)
    if (!point) return []
    const lineCount = lineIdsByStation.get(node.id)?.size ?? 0
    const interchange = lineCount > 1 || node.data.interchange === true || node.data.transfer === true
    const label =
      typeof config.labelAccessor === "function"
        ? config.labelAccessor(node.data)
        : String(readField(node.data, config.labelAccessor ?? "label", node.id))
    return [{
      type: "circle" as const,
      cx: point.x,
      cy: point.y,
      r: interchange ? (config.interchangeRadius ?? 7) : (config.stationRadius ?? 4),
      style: {
        fill: config.stationFill ?? "var(--semiotic-background, white)",
        stroke: config.stationStroke ?? "var(--semiotic-text, #222)",
        strokeWidth: interchange ? 3 : 1.5,
      },
      datum: node.data,
      accessibleDatum: node.data,
      accessibility: {
        label: `${label}${interchange ? ", interchange" : ""}`,
        tableFields: { station: label, lines: [...(lineIdsByStation.get(node.id) ?? [])].join(", ") },
      },
      id: node.id,
      label,
    }]
  })

  const dimOpacity = config.dimOpacity ?? 0.14
  return {
    sceneEdges,
    sceneNodes,
    labels: placeLabels(
      nodes,
      positionResult.positions,
      lineIdsByStation,
      ctx.dimensions.plot,
      config,
    ),
    restyle: (node, selection) =>
      selection?.isActive && !selection.predicate(node.datum as Datum)
        ? { opacity: dimOpacity }
        : { opacity: 1 },
    restyleEdge: (edge, selection) =>
      selection?.isActive && !selection.predicate(edge.datum as Datum)
        ? { opacity: dimOpacity }
        : { opacity: 1 },
  }
}

export { computeTransitDiagramPositions, octilinearRoute, offsetTransitPath, roundedTransitPath }
export type {
  TransitDiagramPoint,
  TransitDiagramPositionOptions,
  TransitDiagramPositionResult,
  TransitDiagramPositionedNode,
} from "./transitDiagramGeometry"
