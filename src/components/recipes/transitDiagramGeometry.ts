import type { Datum } from "../charts/shared/datumTypes"

export interface TransitDiagramPoint {
  x: number
  y: number
}

export interface TransitDiagramPositionedNode {
  id: string
  x: number
  y: number
  data: Datum
}

export interface TransitDiagramPositionOptions {
  /** Force authored or automatic geometry. By default complete x/y data wins. */
  layoutMode?: "auto" | "authored" | "automatic"
  xAccessor?: string | ((d: Datum) => number | undefined)
  yAccessor?: string | ((d: Datum) => number | undefined)
  padding?: number
  componentGap?: number
  /** Preferred automatic-layout endpoint for its connected component. */
  rootId?: string
  /** Place the automatic root at the left or right edge. @default "left-to-right" */
  direction?: "left-to-right" | "right-to-left"
}

export interface TransitDiagramPositionResult {
  positions: Map<string, TransitDiagramPositionedNode>
  mode: "authored" | "automatic"
  warnings: string[]
  /** Fit a point from the authored coordinate system into plot space. */
  projectAuthoredPoint: (point: TransitDiagramPoint) => TransitDiagramPoint
}

interface TransitDiagramEdgeLike {
  source: string
  target: string
}

interface PlotBox {
  width: number
  height: number
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

function readCoordinate(
  datum: Datum,
  accessor: string | ((d: Datum) => number | undefined),
): number | undefined {
  const value = typeof accessor === "function" ? accessor(datum) : datum[accessor]
  return finite(value) ? value : undefined
}

function stableIds(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b))
}

function adjacencyFor(
  ids: readonly string[],
  edges: readonly TransitDiagramEdgeLike[],
): Map<string, Set<string>> {
  const adjacency = new Map(ids.map((id) => [id, new Set<string>()]))
  for (const edge of edges) {
    if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) continue
    adjacency.get(edge.source)?.add(edge.target)
    adjacency.get(edge.target)?.add(edge.source)
  }
  return adjacency
}

function connectedComponents(adjacency: Map<string, Set<string>>): string[][] {
  const remaining = new Set(adjacency.keys())
  const components: string[][] = []
  while (remaining.size > 0) {
    const seed = stableIds(remaining)[0]
    const queue = [seed]
    const component: string[] = []
    remaining.delete(seed)
    while (queue.length > 0) {
      const id = queue.shift() as string
      component.push(id)
      for (const neighbor of stableIds(adjacency.get(id) ?? [])) {
        if (!remaining.has(neighbor)) continue
        remaining.delete(neighbor)
        queue.push(neighbor)
      }
    }
    components.push(component.sort((a, b) => a.localeCompare(b)))
  }
  return components.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]))
}

function distancesFrom(
  start: string,
  component: ReadonlySet<string>,
  adjacency: Map<string, Set<string>>,
): Map<string, number> {
  const distances = new Map([[start, 0]])
  const queue = [start]
  while (queue.length > 0) {
    const id = queue.shift() as string
    const depth = distances.get(id) as number
    for (const neighbor of stableIds(adjacency.get(id) ?? [])) {
      if (!component.has(neighbor) || distances.has(neighbor)) continue
      distances.set(neighbor, depth + 1)
      queue.push(neighbor)
    }
  }
  return distances
}

function farthest(
  start: string,
  component: ReadonlySet<string>,
  adjacency: Map<string, Set<string>>,
): string {
  const distances = distancesFrom(start, component, adjacency)
  return [...distances.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0][0]
}

function orderedLevels(
  componentIds: readonly string[],
  adjacency: Map<string, Set<string>>,
  preferredRoot?: string,
): string[][] {
  const component = new Set(componentIds)
  const endpoints = componentIds.filter((id) => (adjacency.get(id)?.size ?? 0) <= 1)
  const seed = endpoints[0] ?? componentIds[0]
  const root =
    preferredRoot && component.has(preferredRoot)
      ? preferredRoot
      : farthest(farthest(seed, component, adjacency), component, adjacency)
  const depths = distancesFrom(root, component, adjacency)
  const maxDepth = Math.max(0, ...depths.values())
  const levels = Array.from({ length: maxDepth + 1 }, () => [] as string[])
  for (const id of componentIds) levels[depths.get(id) ?? 0].push(id)
  levels.forEach((level) => level.sort((a, b) => a.localeCompare(b)))

  const reorder = (levelIndex: number, neighborIndex: number) => {
    const neighborOrder = new Map(levels[neighborIndex].map((id, index) => [id, index]))
    const barycenter = (id: string) => {
      const indexes = [...(adjacency.get(id) ?? [])]
        .map((neighbor) => neighborOrder.get(neighbor))
        .filter((index): index is number => index != null)
      return indexes.length === 0
        ? Number.POSITIVE_INFINITY
        : indexes.reduce((sum, index) => sum + index, 0) / indexes.length
    }
    levels[levelIndex].sort(
      (a, b) => barycenter(a) - barycenter(b) || a.localeCompare(b),
    )
  }

  // Repeated median/barycenter sweeps are a cheap, deterministic crossing reducer.
  for (let pass = 0; pass < 4; pass += 1) {
    for (let level = 1; level < levels.length; level += 1) reorder(level, level - 1)
    for (let level = levels.length - 2; level >= 0; level -= 1) reorder(level, level + 1)
  }
  return levels
}

function automaticPositions(
  nodes: readonly { id: string; data: Datum }[],
  edges: readonly TransitDiagramEdgeLike[],
  plot: PlotBox,
  padding: number,
  componentGap: number,
  rootId?: string,
): Map<string, TransitDiagramPositionedNode> {
  const adjacency = adjacencyFor(nodes.map((node) => node.id), edges)
  const components = connectedComponents(adjacency)
  const dataById = new Map(nodes.map((node) => [node.id, node.data]))
  const positions = new Map<string, TransitDiagramPositionedNode>()
  const availableHeight = Math.max(
    1,
    plot.height - padding * 2 - componentGap * Math.max(0, components.length - 1),
  )
  const totalWeight = components.reduce((sum, component) => sum + Math.sqrt(component.length), 0)
  let top = padding

  for (const component of components) {
    const height = availableHeight * (Math.sqrt(component.length) / totalWeight)
    const levels = orderedLevels(component, adjacency, rootId)
    const maxLevelSize = Math.max(1, ...levels.map((level) => level.length))
    const innerWidth = Math.max(1, plot.width - padding * 2)
    const innerHeight = Math.max(1, height - padding)
    levels.forEach((level, levelIndex) => {
      const x =
        levels.length === 1
          ? plot.width / 2
          : padding + (levelIndex / (levels.length - 1)) * innerWidth
      level.forEach((id, index) => {
        const y =
          maxLevelSize === 1
            ? top + height / 2
            : top + padding / 2 + (index / (maxLevelSize - 1)) * innerHeight
        positions.set(id, { id, x, y, data: dataById.get(id) as Datum })
      })
    })
    top += height + componentGap
  }
  return positions
}

export function computeTransitDiagramPositions(
  nodes: readonly { id: string; data: Datum }[],
  edges: readonly TransitDiagramEdgeLike[],
  plot: PlotBox,
  options: TransitDiagramPositionOptions = {},
): TransitDiagramPositionResult {
  const padding = Math.max(0, options.padding ?? 36)
  const componentGap = Math.max(0, options.componentGap ?? 26)
  const xAccessor = options.xAccessor ?? "x"
  const yAccessor = options.yAccessor ?? "y"
  const authored = nodes.map((node) => ({
    ...node,
    authoredX: readCoordinate(node.data, xAccessor),
    authoredY: readCoordinate(node.data, yAccessor),
  }))
  const completeAuthored =
    authored.length > 0 && authored.every((node) => finite(node.authoredX) && finite(node.authoredY))
  const useAuthored =
    options.layoutMode === "authored" ||
    (options.layoutMode !== "automatic" && completeAuthored)
  const warnings: string[] = []

  if (useAuthored && !completeAuthored) {
    warnings.push(
      "Authored transit layout requested, but at least one station has no finite x/y position; using automatic topology layout.",
    )
  }

  if (!useAuthored || !completeAuthored) {
    if (!completeAuthored && options.layoutMode !== "automatic") {
      warnings.push(
        "Complete station positions were not supplied; using the deterministic automatic topology layout.",
      )
    }
    const positions = automaticPositions(nodes, edges, plot, padding, componentGap, options.rootId)
    if (options.direction === "right-to-left") {
      for (const node of positions.values()) node.x = plot.width - node.x
    }
    return {
      positions,
      mode: "automatic",
      warnings,
      projectAuthoredPoint: (point) => point,
    }
  }

  const xs = authored.map((node) => node.authoredX as number)
  const ys = authored.map((node) => node.authoredY as number)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const innerWidth = Math.max(1, plot.width - padding * 2)
  const innerHeight = Math.max(1, plot.height - padding * 2)
  const projectAuthoredPoint = (point: TransitDiagramPoint): TransitDiagramPoint => ({
    x: maxX === minX ? plot.width / 2 : padding + ((point.x - minX) / (maxX - minX)) * innerWidth,
    y: maxY === minY ? plot.height / 2 : padding + ((point.y - minY) / (maxY - minY)) * innerHeight,
  })
  const positions = new Map<string, TransitDiagramPositionedNode>()
  for (const node of authored) {
    const point = projectAuthoredPoint({ x: node.authoredX as number, y: node.authoredY as number })
    positions.set(node.id, { id: node.id, ...point, data: node.data })
  }
  return { positions, mode: "authored", warnings, projectAuthoredPoint }
}

/** Route two points with only horizontal, vertical, and 45-degree segments. */
export function octilinearRoute(
  source: TransitDiagramPoint,
  target: TransitDiagramPoint,
): TransitDiagramPoint[] {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (ax < 0.001 || ay < 0.001 || Math.abs(ax - ay) < 0.001) return [source, target]
  const sx = Math.sign(dx)
  const sy = Math.sign(dy)
  if (ax > ay) {
    const run = (ax - ay) / 2
    return [
      source,
      { x: source.x + sx * run, y: source.y },
      { x: target.x - sx * run, y: target.y },
      target,
    ]
  }
  const run = (ay - ax) / 2
  return [
    source,
    { x: source.x, y: source.y + sy * run },
    { x: target.x, y: target.y - sy * run },
    target,
  ]
}

export function offsetTransitPath(
  points: readonly TransitDiagramPoint[],
  distance: number,
): TransitDiagramPoint[] {
  if (distance === 0 || points.length < 2) return points.map((point) => ({ ...point }))
  const normal = (a: TransitDiagramPoint, b: TransitDiagramPoint) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = Math.hypot(dx, dy) || 1
    return { x: -dy / length, y: dx / length }
  }
  return points.map((point, index) => {
    const previous = index > 0 ? normal(points[index - 1], point) : null
    const next = index < points.length - 1 ? normal(point, points[index + 1]) : null
    let nx = (previous?.x ?? 0) + (next?.x ?? 0)
    let ny = (previous?.y ?? 0) + (next?.y ?? 0)
    const length = Math.hypot(nx, ny)
    if (length < 0.001) {
      nx = (next ?? previous)?.x ?? 0
      ny = (next ?? previous)?.y ?? 0
    } else {
      nx /= length
      ny /= length
    }
    return { x: point.x + nx * distance, y: point.y + ny * distance }
  })
}

export function roundedTransitPath(
  points: readonly TransitDiagramPoint[],
  radius: number,
): string {
  if (points.length === 0) return ""
  if (points.length === 1) return `M${points[0].x},${points[0].y}`
  const clampedRadius = Math.max(0, radius)
  let path = `M${points[0].x},${points[0].y}`
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]
    const point = points[index]
    const next = points[index + 1]
    const incoming = Math.hypot(point.x - previous.x, point.y - previous.y)
    const outgoing = Math.hypot(next.x - point.x, next.y - point.y)
    const turnRadius = Math.min(clampedRadius, incoming / 2, outgoing / 2)
    if (turnRadius <= 0.001) {
      path += ` L${point.x},${point.y}`
      continue
    }
    const enter = {
      x: point.x + ((previous.x - point.x) / incoming) * turnRadius,
      y: point.y + ((previous.y - point.y) / incoming) * turnRadius,
    }
    const exit = {
      x: point.x + ((next.x - point.x) / outgoing) * turnRadius,
      y: point.y + ((next.y - point.y) / outgoing) * turnRadius,
    }
    path += ` L${enter.x},${enter.y} Q${point.x},${point.y} ${exit.x},${exit.y}`
  }
  const last = points[points.length - 1]
  return `${path} L${last.x},${last.y}`
}
