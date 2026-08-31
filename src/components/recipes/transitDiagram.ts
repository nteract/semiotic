import { createElement, type ReactNode } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type {
  NetworkArcNode,
  NetworkCurvedEdge,
  NetworkLabel,
  NetworkSceneNode,
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

export type TransitDiagramMode = "primary" | "compact" | "minimap"

export interface TransitDiagramStationRenderInfo {
  /** Raw station datum supplied to the chart. */
  station: Datum
  /** Fitted center in plot coordinates. */
  x: number
  /** Fitted center in plot coordinates. */
  y: number
  /** Radius resolved for the active detail mode. */
  radius: number
  /** Ordered line ids that pass through this station. */
  lineIds: readonly string[]
  interchange: boolean
  mode: Exclude<TransitDiagramMode, "minimap">
}

export interface TransitDiagramConfig {
  /** Complete authored x/y positions win by default; otherwise use topology. */
  layoutMode?: "auto" | "authored" | "automatic"
  /** Station and track level of detail. @default "primary" */
  mode?: TransitDiagramMode
  xAccessor?: string | ((d: Datum) => number | undefined)
  yAccessor?: string | ((d: Datum) => number | undefined)
  labelAccessor?: string | ((d: Datum) => string)
  lineAccessor?: string | ((d: Datum) => TransitDiagramLineValue | undefined)
  lineColorAccessor?: string | ((d: Datum) => string | undefined)
  /** Derive one line per source node and propagate it through a directed DAG. */
  lineMode?: "source-rooted"
  /** Source-node color used by source-rooted lines. Defaults to `color`. */
  sourceColorAccessor?: string | ((d: Datum) => string)
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
  /** Replace primary/compact station circles with SVG rendered above the tracks. */
  renderStation?: (info: TransitDiagramStationRenderInfo) => ReactNode
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

function normalizeLineValue(
  value: TransitDiagramLineValue | undefined,
): TransitDiagramLineDescriptor[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value]
  const descriptors = values.map((entry) => {
    if (typeof entry === "object") return { ...entry, id: String(entry.id) }
    return { id: String(entry) }
  })
  return descriptors.length > 0 ? descriptors : [{ id: "network" }]
}

function lineDescriptors(
  edge: PreparedEdge,
  config: TransitDiagramConfig,
): TransitDiagramLineDescriptor[] {
  const accessor = config.lineAccessor
  let value: TransitDiagramLineValue | undefined
  if (typeof accessor === "function") value = accessor(edge.data)
  else if (typeof accessor === "string") value = edge.data[accessor] as TransitDiagramLineValue
  else {
    value = (edge.data.lines ?? edge.data.line ?? edge.data.route ?? edge.data.group) as
      TransitDiagramLineValue | undefined
  }
  return normalizeLineValue(value)
}

interface SourceRootedLines {
  byEdge: Map<PreparedEdge, TransitDiagramLineDescriptor[]>
  byNode: Map<string, TransitDiagramLineDescriptor[]>
}

function sourceLineColor(
  source: PreparedNode,
  config: TransitDiagramConfig,
  resolveColor: (key: string) => string,
): string {
  const accessor = config.sourceColorAccessor
  const value =
    typeof accessor === "function"
      ? accessor(source.data)
      : typeof accessor === "string"
        ? source.data[accessor]
        : source.data.color
  return typeof value === "string" && value ? value : resolveColor(source.id)
}

function deriveSourceRootedLines(
  nodes: readonly PreparedNode[],
  edges: readonly PreparedEdge[],
  config: TransitDiagramConfig,
  resolveColor: (key: string) => string,
): SourceRootedLines {
  const nodeIds = new Set(nodes.map((node) => node.id))
  const indegree = new Map(nodes.map((node) => [node.id, 0]))
  const outgoing = new Map(nodes.map((node) => [node.id, [] as PreparedEdge[]]))
  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
    outgoing.get(edge.source)?.push(edge)
  }
  for (const next of outgoing.values()) {
    next.sort((a, b) => a.target.localeCompare(b.target) || a.source.localeCompare(b.source))
  }

  const roots = nodes
    .filter((node) => (indegree.get(node.id) ?? 0) === 0)
    .sort((a, b) => a.id.localeCompare(b.id))
  const edgeLines = new Map<PreparedEdge, Map<string, TransitDiagramLineDescriptor>>()
  const nodeLines = new Map(
    nodes.map((node) => [node.id, new Map<string, TransitDiagramLineDescriptor>()]),
  )

  for (const root of roots) {
    const rootLabel =
      typeof config.labelAccessor === "function"
        ? config.labelAccessor(root.data)
        : readField(root.data, config.labelAccessor ?? "label", root.id)
    const descriptor: TransitDiagramLineDescriptor = {
      id: root.id,
      label: String(rootLabel),
      color: sourceLineColor(root, config, resolveColor),
    }
    const visited = new Set<string>()
    const queue = [root.id]
    while (queue.length > 0) {
      const nodeId = queue.shift() as string
      if (visited.has(nodeId)) continue
      visited.add(nodeId)
      nodeLines.get(nodeId)?.set(descriptor.id, descriptor)
      for (const edge of outgoing.get(nodeId) ?? []) {
        let lines = edgeLines.get(edge)
        if (!lines) {
          lines = new Map()
          edgeLines.set(edge, lines)
        }
        lines.set(descriptor.id, descriptor)
        if (!visited.has(edge.target)) queue.push(edge.target)
      }
    }
  }

  const sortedDescriptors = (values: Iterable<TransitDiagramLineDescriptor>) =>
    [...values].sort((a, b) => a.id.localeCompare(b.id))
  return {
    byEdge: new Map(
      edges.map((edge) => [edge, sortedDescriptors(edgeLines.get(edge)?.values() ?? [])]),
    ),
    byNode: new Map(
      nodes.map((node) => [node.id, sortedDescriptors(nodeLines.get(node.id)?.values() ?? [])]),
    ),
  }
}

function resolveLineColor(
  line: TransitDiagramLineDescriptor,
  edge: PreparedEdge,
  config: TransitDiagramConfig,
  resolveColor: (key: string) => string,
): string {
  if (line.color) return line.color
  const configuredColor =
    config.lineColors && Object.prototype.hasOwnProperty.call(config.lineColors, line.id)
      ? config.lineColors[line.id]
      : undefined
  if (typeof configuredColor === "string" && configuredColor) return configuredColor
  const accessor = config.lineColorAccessor
  const accessed =
    typeof accessor === "function"
      ? accessor(edge.data)
      : typeof accessor === "string"
        ? edge.data[accessor]
        : edge.data.color
  return typeof accessed === "string" ? accessed : resolveColor(line.id)
}

function prepareSegments(
  edges: readonly PreparedEdge[],
  config: TransitDiagramConfig,
  sourceRootedLines?: SourceRootedLines,
): PhysicalSegment[] {
  const segments = new Map<string, PhysicalSegment>()
  for (const edge of edges) {
    const key =
      edge.source < edge.target
        ? `${edge.source}\u0000${edge.target}`
        : `${edge.target}\u0000${edge.source}`
    let segment = segments.get(key)
    if (!segment) {
      segment = {
        key,
        source: edge.source,
        target: edge.target,
        lines: new Map(),
      }
      segments.set(key, segment)
    }
    const authoredOrder = edge.data.lineOrder
    if (Array.isArray(authoredOrder)) segment.authoredOrder = authoredOrder.map(String)
    const descriptors = sourceRootedLines?.byEdge.get(edge) ?? lineDescriptors(edge, config)
    for (const descriptor of descriptors) {
      if (!segment.lines.has(descriptor.id)) segment.lines.set(descriptor.id, { descriptor, edge })
    }
  }
  return [...segments.values()].sort((a, b) => a.key.localeCompare(b.key))
}

function orderLineIds(ids: Iterable<string>, config: TransitDiagramConfig): string[] {
  const rank = new Map((config.lineOrder ?? []).map((id, index) => [id, index]))
  return [...ids].sort(
    (a, b) =>
      (rank.get(a) ?? Number.POSITIVE_INFINITY) - (rank.get(b) ?? Number.POSITIVE_INFINITY) ||
      a.localeCompare(b),
  )
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
  reverse: boolean,
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
  if (points.length === 0) return null
  return reverse ? points.reverse() : points
}

function enrichedEdgeDatum(edge: PreparedEdge, line: TransitDiagramLineDescriptor): Datum {
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
  stationRadii: ReadonlyMap<string, number>,
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
    const distance =
      Math.max(
        config.interchangeRadius ?? 7,
        stationRadii.get(node.id) ?? config.stationRadius ?? 4,
      ) + 5
    const candidates = [
      {
        x: point.x + distance,
        y: point.y,
        anchor: "start" as const,
        left: point.x + distance,
      },
      {
        x: point.x - distance,
        y: point.y,
        anchor: "end" as const,
        left: point.x - distance - width,
      },
      {
        x: point.x,
        y: point.y - distance,
        anchor: "middle" as const,
        left: point.x - width / 2,
      },
      {
        x: point.x,
        y: point.y + distance,
        anchor: "middle" as const,
        left: point.x - width / 2,
      },
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
      return {
        candidate,
        box,
        score: collisions * 10000 + overflow * 10 + index,
      }
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
      stroke: "var(--semiotic-bg, white)",
      strokeWidth: 3,
      paintOrder: "stroke",
    })
  }
  return labels
}

/**
 * Transit-diagram renderer for authored maps and plain directed graphs.
 *
 * Complete station x/y coordinates are fitted and honored. Otherwise the
 * recipe computes a byte-stable topology-led layout with id-based tie breaks.
 * Connections use horizontal, vertical, and 45-degree segments. Detail modes,
 * source-rooted lines, custom station glyphs, waypoints, and line order all
 * share the same fitted geometry.
 */
export const transitDiagramLayout: NetworkCustomLayout<TransitDiagramConfig> = (ctx) => {
  const config = ctx.config ?? {}
  const mode = config.mode ?? "primary"
  const dimOpacity = config.dimOpacity ?? 0.14
  const opacityFor = (datum: Datum) =>
    ctx.selection?.isActive && !ctx.selection.predicate(datum) ? dimOpacity : 1
  const nodes: PreparedNode[] = ctx.nodes
    .map((wrapper) => ({
      id: wrapper.id,
      data: rawDatum(wrapper),
      wrapper,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
  const edges: PreparedEdge[] = ctx.edges
    .map((wrapper) => ({
      source: edgeEndpoint(wrapper.source),
      target: edgeEndpoint(wrapper.target),
      data: rawDatum(wrapper),
      wrapper,
    }))
    .sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target))
  const positionResult = computeTransitDiagramPositions(nodes, edges, ctx.dimensions.plot, config)
  const sourceRootedLines =
    config.lineMode === "source-rooted"
      ? deriveSourceRootedLines(nodes, edges, config, ctx.resolveColor)
      : undefined
  const segments = prepareSegments(edges, config, sourceRootedLines)
  const lineIdsByStation = new Map(nodes.map((node) => [node.id, new Set<string>()]))
  const lineColorsById = new Map<string, string>()
  if (sourceRootedLines) {
    for (const [nodeId, descriptors] of sourceRootedLines.byNode) {
      for (const descriptor of descriptors) {
        lineIdsByStation.get(nodeId)?.add(descriptor.id)
        if (descriptor.color) lineColorsById.set(descriptor.id, descriptor.color)
      }
    }
  }
  const lineWidth = Math.max(
    1,
    config.lineWidth ?? (mode === "primary" ? 6 : mode === "compact" ? 3.5 : 2),
  )
  const lineGap = Math.max(
    0,
    config.lineGap ?? (mode === "primary" ? 2 : mode === "compact" ? 1 : 0.5),
  )
  const bundleRadiusByStation = new Map<string, number>()
  const sceneEdges: NetworkCurvedEdge[] = []

  for (const segment of segments) {
    const source = positionResult.positions.get(segment.source)
    const target = positionResult.positions.get(segment.target)
    if (!source || !target) continue
    const orderedLines = orderSegmentLines(segment, config)
    const bundleRadius = ((orderedLines.length - 1) / 2) * (lineWidth + lineGap) + lineWidth / 2
    for (const stationId of [segment.source, segment.target]) {
      bundleRadiusByStation.set(
        stationId,
        Math.max(bundleRadiusByStation.get(stationId) ?? 0, bundleRadius),
      )
    }
    orderedLines.forEach((line, index) => {
      lineIdsByStation.get(segment.source)?.add(line.descriptor.id)
      lineIdsByStation.get(segment.target)?.add(line.descriptor.id)
      const middle = authoredPoints(
        line.edge,
        positionResult,
        config,
        line.edge.source !== segment.source,
      )
      const base = middle ? [source, ...middle, target] : octilinearRoute(source, target)
      const distance = (index - (orderedLines.length - 1) / 2) * (lineWidth + lineGap)
      const path = offsetTransitPath(base, distance)
      const datum = enrichedEdgeDatum(line.edge, line.descriptor)
      const color = resolveLineColor(line.descriptor, line.edge, config, ctx.resolveColor)
      if (!lineColorsById.has(line.descriptor.id)) {
        lineColorsById.set(line.descriptor.id, color)
      }
      sceneEdges.push({
        type: "curved",
        id: `${segment.key}:${line.descriptor.id}`,
        label: `${line.descriptor.label ?? line.descriptor.id}: ${line.edge.source} to ${line.edge.target}`,
        pathD: roundedTransitPath(path, config.cornerRadius ?? 10),
        style: {
          fill: "none",
          stroke: color,
          strokeWidth: lineWidth,
          strokeLinecap: "round",
          opacity: opacityFor(datum),
        },
        datum,
        accessibleDatum: datum,
        accessibility: {
          label: `${line.descriptor.label ?? line.descriptor.id}, ${line.edge.source} to ${line.edge.target}`,
          tableFields: {
            line: line.descriptor.label ?? line.descriptor.id,
            source: line.edge.source,
            target: line.edge.target,
          },
        },
      })
    })
  }

  const stationRadii = new Map<string, number>()
  const sceneNodes: NetworkSceneNode[] = []
  const stationGlyphs: ReactNode[] = []
  const stationLabel = (node: PreparedNode) => {
    const value =
      typeof config.labelAccessor === "function"
        ? config.labelAccessor(node.data)
        : readField(node.data, config.labelAccessor ?? "label", node.id)
    return String(value || node.id)
  }

  if (mode === "minimap") {
    const stops = new Map<
      string,
      {
        x: number
        y: number
        nodes: PreparedNode[]
        lineIds: Set<string>
        bundleRadius: number
      }
    >()
    for (const node of nodes) {
      const point = positionResult.positions.get(node.id)
      if (!point) continue
      const key = `${point.x}\u0000${point.y}`
      let stop = stops.get(key)
      if (!stop) {
        stop = {
          x: point.x,
          y: point.y,
          nodes: [],
          lineIds: new Set(),
          bundleRadius: 0,
        }
        stops.set(key, stop)
      }
      stop.nodes.push(node)
      for (const lineId of lineIdsByStation.get(node.id) ?? []) stop.lineIds.add(lineId)
      stop.bundleRadius = Math.max(stop.bundleRadius, bundleRadiusByStation.get(node.id) ?? 0)
    }

    const orderedStops = [...stops.values()].sort(
      (a, b) => a.x - b.x || a.y - b.y || a.nodes[0].id.localeCompare(b.nodes[0].id),
    )
    for (const stop of orderedStops) {
      const lineIds = orderLineIds(stop.lineIds, config)
      const interchange =
        lineIds.length > 1 ||
        stop.nodes.length > 1 ||
        stop.nodes.some((node) => node.data.interchange === true || node.data.transfer === true)
      const radius = interchange
        ? (config.interchangeRadius ?? Math.max(5, stop.bundleRadius))
        : (config.stationRadius ?? Math.max(3.5, stop.bundleRadius))
      for (const node of stop.nodes) stationRadii.set(node.id, radius)
      const labels = stop.nodes.map(stationLabel)
      const label = labels.join(" / ")
      const id = stop.nodes.map((node) => node.id).join("--")
      const datum =
        stop.nodes.length === 1
          ? stop.nodes[0].data
          : createSafeDatum((set) => {
              set("id", id)
              set("label", label)
              set("stationIds", stop.nodes.map((node) => node.id))
              set("stations", stop.nodes.map((node) => node.data))
              set("lineIds", lineIds)
              set("interchange", interchange)
            })
      const accessibility = {
        label: `${label}${interchange ? ", interchange" : ""}`,
        tableFields: { station: label, lines: lineIds.join(", ") },
      }
      if (lineIds.length <= 1) {
        sceneNodes.push({
          type: "circle",
          cx: stop.x,
          cy: stop.y,
          r: radius,
          style: {
            fill:
              (lineIds[0] && lineColorsById.get(lineIds[0])) ??
              config.stationFill ??
              "var(--semiotic-bg, white)",
            stroke: config.stationStroke ?? "var(--semiotic-text, #222)",
            strokeWidth: 1.25,
            opacity: opacityFor(datum),
          },
          datum,
          accessibleDatum: datum,
          accessibility,
          id,
          label,
        })
        continue
      }

      lineIds.forEach((lineId, index) => {
        const startAngle = -Math.PI / 2 + (index / lineIds.length) * Math.PI * 2
        const endAngle = -Math.PI / 2 + ((index + 1) / lineIds.length) * Math.PI * 2
        const segment: NetworkArcNode = {
          type: "arc",
          cx: stop.x,
          cy: stop.y,
          innerR: 0,
          outerR: radius,
          startAngle,
          endAngle,
          style: {
            fill: lineColorsById.get(lineId) ?? ctx.resolveColor(lineId),
            stroke: "none",
            opacity: opacityFor(datum),
          },
          datum: null,
          id: `${id}:${lineId}`,
        }
        sceneNodes.push(segment)
      })
      sceneNodes.push({
        type: "circle",
        cx: stop.x,
        cy: stop.y,
        r: radius,
        style: {
          fill: "transparent",
          stroke: config.stationStroke ?? "var(--semiotic-text, #222)",
          strokeWidth: 1.25,
          opacity: opacityFor(datum),
        },
        datum,
        accessibleDatum: datum,
        accessibility,
        id,
        label,
      })
    }
  } else {
    for (const node of nodes) {
      const point = positionResult.positions.get(node.id)
      if (!point) continue
      const lineIds = orderLineIds(lineIdsByStation.get(node.id) ?? [], config)
      const interchange =
        lineIds.length > 1 || node.data.interchange === true || node.data.transfer === true
      const radius = interchange
        ? (config.interchangeRadius ??
          Math.max(mode === "primary" ? 7 : 5, bundleRadiusByStation.get(node.id) ?? 0))
        : (config.stationRadius ?? (mode === "primary" ? 4 : 2.75))
      stationRadii.set(node.id, radius)
      const label = stationLabel(node)
      const customStation = config.renderStation != null
      sceneNodes.push({
        type: "circle",
        cx: point.x,
        cy: point.y,
        r: radius,
        style: customStation
          ? { fill: "transparent", stroke: "transparent" }
          : {
              fill: config.stationFill ?? "var(--semiotic-bg, white)",
              stroke: config.stationStroke ?? "var(--semiotic-text, #222)",
              strokeWidth: interchange ? (mode === "primary" ? 3 : 2) : 1.5,
              opacity: opacityFor(node.data),
            },
        datum: node.data,
        accessibleDatum: node.data,
        accessibility: {
          label: `${label}${interchange ? ", interchange" : ""}`,
          tableFields: { station: label, lines: lineIds.join(", ") },
        },
        id: node.id,
        label,
      })
      if (config.renderStation) {
        const rendered = config.renderStation({
          station: node.data,
          x: point.x,
          y: point.y,
          radius,
          lineIds,
          interchange,
          mode,
        })
        if (rendered != null) {
          stationGlyphs.push(
            createElement(
              "g",
              {
                key: node.id,
                opacity: opacityFor(node.data),
                style: { pointerEvents: "none" },
              },
              rendered,
            ),
          )
        }
      }
    }
  }

  const overlays =
    stationGlyphs.length > 0
      ? createElement("g", { className: "transit-diagram-stations" }, ...stationGlyphs)
      : undefined
  const result = {
    sceneEdges,
    sceneNodes,
    overlays,
    labels: placeLabels(
      nodes,
      positionResult.positions,
      lineIdsByStation,
      stationRadii,
      ctx.dimensions.plot,
      mode === "primary" ? config : { ...config, showLabels: false },
    ),
  }
  if (stationGlyphs.length > 0) return result
  return {
    ...result,
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
