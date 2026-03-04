import type {
  SceneNode,
  LineSceneNode,
  AreaSceneNode,
  PointSceneNode,
  RectSceneNode,
  HeatcellSceneNode,
  Style,
  StreamScales,
  StreamLayout
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
  const path: [number, number][] = []
  const rawValues: number[] = []
  for (const d of data) {
    const xVal = xGet(d)
    const yVal = yGet(d)
    if (xVal == null || yVal == null || Number.isNaN(xVal) || Number.isNaN(yVal)) continue
    path.push([scales.x(xVal), scales.y(yVal)])
    rawValues.push(yVal)
  }
  return { type: "line", path, rawValues, style, datum: data, group }
}

export function buildAreaNode(
  data: Record<string, any>[],
  scales: StreamScales,
  xGet: (d: Record<string, any>) => number,
  yGet: (d: Record<string, any>) => number,
  baselineY: number,
  style: Style,
  group?: string
): AreaSceneNode {
  const topPath: [number, number][] = []
  const bottomPath: [number, number][] = []
  for (const d of data) {
    const xVal = xGet(d)
    const yVal = yGet(d)
    if (xVal == null || yVal == null || Number.isNaN(xVal) || Number.isNaN(yVal)) continue
    const px = scales.x(xVal)
    topPath.push([px, scales.y(yVal)])
    bottomPath.push([px, scales.y(baselineY)])
  }
  return { type: "area", topPath, bottomPath, style, datum: data, group }
}

export function buildStackedAreaNodes(
  groups: { key: string; data: Record<string, any>[] }[],
  scales: StreamScales,
  xGet: (d: Record<string, any>) => number,
  yGet: (d: Record<string, any>) => number,
  styleFn: (group: string, sampleDatum?: Record<string, any>) => Style,
  normalize?: boolean
): AreaSceneNode[] {
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
  const baselines = new Map<number, number>() // x → cumulative y
  for (const x of xValues) baselines.set(x, 0)

  for (const g of groups) {
    const vMap = valueMaps.get(g.key)!
    const topPath: [number, number][] = []
    const bottomPath: [number, number][] = []

    for (const x of xValues) {
      let rawY = vMap.get(x) || 0
      const base = baselines.get(x)!

      if (normalize) {
        const total = totals!.get(x)!
        rawY = rawY / total
      }

      const px = scales.x(x)
      bottomPath.push([px, scales.y(base)])
      topPath.push([px, scales.y(base + rawY)])
      baselines.set(x, base + rawY)
    }

    nodes.push({
      type: "area",
      topPath,
      bottomPath,
      style: styleFn(g.key, g.data[0]),
      datum: g.data,
      group: g.key
    })
  }

  return nodes
}

export function buildPointNode(
  datum: Record<string, any>,
  scales: StreamScales,
  xGet: (d: Record<string, any>) => number,
  yGet: (d: Record<string, any>) => number,
  r: number,
  style: Style
): PointSceneNode | null {
  const xVal = xGet(datum)
  const yVal = yGet(datum)
  if (xVal == null || yVal == null || Number.isNaN(xVal) || Number.isNaN(yVal)) return null
  return {
    type: "point",
    x: scales.x(xVal),
    y: scales.y(yVal),
    r,
    style,
    datum
  }
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
  datum: any
): HeatcellSceneNode {
  return { type: "heatcell", x, y, w, h, fill, datum }
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
