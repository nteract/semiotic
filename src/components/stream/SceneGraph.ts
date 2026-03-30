import type {
  SceneNode,
  LineSceneNode,
  AreaSceneNode,
  PointSceneNode,
  RectSceneNode,
  HeatcellSceneNode,
  Style,
  StreamScales,
  StreamLayout,
  CurveType
} from "./types"

// ── Scene node builders ────────────────────────────────────────────────

export function buildLineNode(
  data: Record<string, any>[],
  scales: StreamScales,
  xGet: (d: Record<string, any>) => number,
  yGet: (d: Record<string, any>) => number,
  style: Style,
  group?: string
): LineSceneNode {
  // Build indexed entries so we can sort by x while keeping datum alignment
  const entries: { px: number; py: number; rawY: number; d: Record<string, any> }[] = []
  for (const d of data) {
    const xVal = xGet(d)
    const yVal = yGet(d)
    if (xVal == null || yVal == null || Number.isNaN(xVal) || Number.isNaN(yVal)) continue
    entries.push({ px: scales.x(xVal), py: scales.y(yVal), rawY: yVal, d })
  }
  // Sort by x pixel coordinate to guarantee binary search correctness
  entries.sort((a, b) => a.px - b.px)

  const path: [number, number][] = new Array(entries.length)
  const rawValues: number[] = new Array(entries.length)
  const sortedData: Record<string, any>[] = new Array(entries.length)
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    path[i] = [e.px, e.py]
    rawValues[i] = e.rawY
    sortedData[i] = e.d
  }
  return { type: "line", path, rawValues, style, datum: sortedData, group }
}

export function buildAreaNode(
  data: Record<string, any>[],
  scales: StreamScales,
  xGet: (d: Record<string, any>) => number,
  yGet: (d: Record<string, any>) => number,
  baselineY: number,
  style: Style,
  group?: string,
  y0Get?: (d: Record<string, any>) => number
): AreaSceneNode {
  // Build indexed entries so we can sort by x for binary search correctness
  const entries: { px: number; topY: number; botY: number }[] = []
  for (const d of data) {
    const xVal = xGet(d)
    const yVal = yGet(d)
    if (xVal == null || yVal == null || Number.isNaN(xVal) || Number.isNaN(yVal)) continue
    const px = scales.x(xVal)
    const bottomY = y0Get ? y0Get(d) : baselineY
    entries.push({ px, topY: scales.y(yVal), botY: scales.y(bottomY) })
  }
  // Sort by x pixel coordinate
  entries.sort((a, b) => a.px - b.px)

  const topPath: [number, number][] = new Array(entries.length)
  const bottomPath: [number, number][] = new Array(entries.length)
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    topPath[i] = [e.px, e.topY]
    bottomPath[i] = [e.px, e.botY]
  }
  return { type: "area", topPath, bottomPath, style, datum: data, group }
}

/** Per-group-per-x stacked top values, keyed by group then x */
export type StackedTops = Map<string, Map<number, number>>

export function buildStackedAreaNodes(
  groups: { key: string; data: Record<string, any>[] }[],
  scales: StreamScales,
  xGet: (d: Record<string, any>) => number,
  yGet: (d: Record<string, any>) => number,
  styleFn: (group: string, sampleDatum?: Record<string, any>) => Style,
  normalize?: boolean,
  curve?: CurveType
): { nodes: AreaSceneNode[]; stackedTops: StackedTops } {
  // Collect all unique x values
  const xSet = new Set<number>()
  for (const g of groups) {
    for (const d of g.data) {
      const x = xGet(d)
      if (x != null && !Number.isNaN(x)) xSet.add(x)
    }
  }
  const xValues = Array.from(xSet).sort((a, b) => a - b)

  // Build value lookup per group per x
  const valueMaps: Map<string, Map<number, number>> = new Map()
  for (const g of groups) {
    const m = new Map<number, number>()
    for (const d of g.data) {
      const x = xGet(d)
      const y = yGet(d)
      if (x != null && y != null && !Number.isNaN(x) && !Number.isNaN(y)) {
        m.set(x, (m.get(x) || 0) + y)
      }
    }
    valueMaps.set(g.key, m)
  }

  // Compute totals per x for normalization
  let totals: Map<number, number> | undefined
  if (normalize) {
    totals = new Map()
    for (const x of xValues) {
      let sum = 0
      for (const g of groups) {
        sum += valueMaps.get(g.key)?.get(x) || 0
      }
      totals.set(x, sum || 1) // avoid div by 0
    }
  }

  // Build stacked area nodes bottom-up
  const nodes: AreaSceneNode[] = []
  const stackedTops: StackedTops = new Map()
  const baselines = new Map<number, number>() // x → cumulative y
  for (const x of xValues) baselines.set(x, 0)

  for (const g of groups) {
    const vMap = valueMaps.get(g.key)!
    const topPath: [number, number][] = []
    const bottomPath: [number, number][] = []
    const groupTops = new Map<number, number>()

    for (const x of xValues) {
      let rawY = vMap.get(x) || 0
      const base = baselines.get(x)!

      if (normalize) {
        const total = totals!.get(x)!
        rawY = rawY / total
      }

      const stackedY = base + rawY
      const px = scales.x(x)
      bottomPath.push([px, scales.y(base)])
      topPath.push([px, scales.y(stackedY)])
      baselines.set(x, stackedY)
      groupTops.set(x, stackedY)
    }

    stackedTops.set(g.key, groupTops)

    const areaNode: AreaSceneNode = {
      type: "area",
      topPath,
      bottomPath,
      style: styleFn(g.key, g.data[0]),
      datum: g.data,
      group: g.key
    }
    if (curve) areaNode.curve = curve
    nodes.push(areaNode)
  }

  return { nodes, stackedTops }
}

export function buildPointNode(
  datum: Record<string, any>,
  scales: StreamScales,
  xGet: (d: Record<string, any>) => number,
  yGet: (d: Record<string, any>) => number,
  r: number,
  style: Style,
  pointId?: string
): PointSceneNode | null {
  const xVal = xGet(datum)
  const yVal = yGet(datum)
  if (xVal == null || yVal == null || Number.isNaN(xVal) || Number.isNaN(yVal)) return null
  const node: PointSceneNode = {
    type: "point",
    x: scales.x(xVal),
    y: scales.y(yVal),
    r,
    style,
    datum
  }
  if (pointId !== undefined) node.pointId = pointId
  return node
}

export function buildRectNode(
  x: number,
  y: number,
  w: number,
  h: number,
  style: Style,
  datum: any,
  group?: string
): RectSceneNode {
  return { type: "rect", x, y, w, h, style, datum, group }
}

export function buildHeatcellNode(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  datum: any,
  options?: { value?: number; showValues?: boolean; valueFormat?: (v: number) => string }
): HeatcellSceneNode {
  const node: HeatcellSceneNode = { type: "heatcell", x, y, w, h, fill, datum }
  if (options?.showValues) {
    node.showValues = true
    node.value = options.value
    if (options.valueFormat) node.valueFormat = options.valueFormat
  }
  return node
}

// ── Scene graph container ──────────────────────────────────────────────

export interface SceneGraphData {
  nodes: SceneNode[]
  version: number
}

export function createSceneGraph(): SceneGraphData {
  return { nodes: [], version: 0 }
}

export function updateSceneGraph(
  scene: SceneGraphData,
  nodes: SceneNode[]
): SceneGraphData {
  return { nodes, version: scene.version + 1 }
}
