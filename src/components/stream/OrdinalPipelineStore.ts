import { scaleBand, scaleLinear, type ScaleBand, type ScaleLinear } from "d3-scale"
import { quantile as d3Quantile } from "d3-array"
import { RingBuffer } from "../realtime/RingBuffer"
import { IncrementalExtent } from "../realtime/IncrementalExtent"
import { buildRectNode } from "./SceneGraph"
import type {
  OrdinalPipelineConfig,
  OrdinalScales,
  OrdinalSceneNode,
  OrdinalColumn,
  OrdinalLayout,
  WedgeSceneNode,
  BoxplotSceneNode,
  ViolinSceneNode,
  OrdinalChartType
} from "./ordinalTypes"
import type { Changeset, Style, PointSceneNode, RectSceneNode } from "./types"

// ── Accessor resolution ────────────────────────────────────────────────

function resolveAccessor<T>(
  accessor: string | ((d: T) => number) | undefined,
  fallback: string
): (d: T) => number {
  if (typeof accessor === "function") return (d: T) => +accessor(d)
  const key = accessor || fallback
  return (d: T) => +(d as any)[key]
}

function resolveStringAccessor<T>(
  accessor: string | ((d: T) => string) | undefined,
  fallback?: string
): ((d: T) => string) | undefined {
  if (typeof accessor === "function") return accessor
  if (accessor) return (d: T) => String((d as any)[accessor])
  if (fallback) return (d: T) => String((d as any)[fallback])
  return undefined
}

// ── OrdinalPipelineStore ───────────────────────────────────────────────

export class OrdinalPipelineStore {
  private buffer: RingBuffer<Record<string, any>>
  private rExtent = new IncrementalExtent()
  private config: OrdinalPipelineConfig

  private getO: (d: any) => string
  private getR: (d: any) => number
  private getStack: ((d: any) => string) | undefined
  private getGroup: ((d: any) => string) | undefined
  private getColor: ((d: any) => string) | undefined

  /** Discovered categories in insertion order */
  private categories = new Set<string>()

  scales: OrdinalScales | null = null
  scene: OrdinalSceneNode[] = []
  columns: Record<string, OrdinalColumn> = {}
  version = 0

  constructor(config: OrdinalPipelineConfig) {
    this.config = config
    this.buffer = new RingBuffer(config.windowSize)

    // Resolve accessors
    this.getO = resolveStringAccessor(
      config.oAccessor || config.categoryAccessor,
      "category"
    ) as (d: any) => string

    const isStreaming = config.runtimeMode === "streaming"
    if (isStreaming && (config.timeAccessor || config.valueAccessor)) {
      this.getR = resolveAccessor(config.valueAccessor || config.rAccessor, "value")
    } else {
      this.getR = resolveAccessor(config.rAccessor, "value")
    }

    this.getStack = resolveStringAccessor(config.stackBy)
    this.getGroup = resolveStringAccessor(config.groupBy)
    this.getColor = resolveStringAccessor(config.colorAccessor)
  }

  // ── Data ingestion ───────────────────────────────────────────────────

  ingest(changeset: Changeset): boolean {
    if (changeset.bounded) {
      this.buffer.clear()
      this.rExtent.clear()
      this.categories.clear()

      const targetSize = changeset.totalSize || changeset.inserts.length
      if (targetSize > this.buffer.capacity) {
        this.buffer.resize(targetSize)
      }

      for (const d of changeset.inserts) {
        this.buffer.push(d)
        this.categories.add(this.getO(d))
        this.pushValueExtent(d)
      }
    } else {
      // Streaming append
      for (const d of changeset.inserts) {
        const evicted = this.buffer.push(d)
        this.categories.add(this.getO(d))
        this.pushValueExtent(d)

        if (evicted != null) {
          this.evictValueExtent(evicted)
        }
      }
    }

    return true
  }

  private pushValueExtent(d: any): void {
    const chartType = this.config.chartType
    if (chartType === "boxplot" || chartType === "violin" || chartType === "histogram") {
      // Summary types: raw values per datum
      this.rExtent.push(this.getR(d))
    } else {
      this.rExtent.push(this.getR(d))
    }
  }

  private evictValueExtent(d: any): void {
    this.rExtent.evict(this.getR(d))
  }

  // ── Scene computation ────────────────────────────────────────────────

  computeScene(layout: OrdinalLayout): void {
    const { config, buffer } = this
    if (buffer.size === 0) {
      this.scales = null
      this.scene = []
      this.columns = {}
      this.version++
      return
    }

    // Recalculate dirty extents
    if (this.rExtent.dirty) {
      this.rExtent.recalculate(buffer, this.getR)
    }

    const data = buffer.toArray()
    const projection = config.projection || "vertical"

    // 1. Resolve category extent
    const oExtent = config.oExtent || this.resolveCategories(data)

    // 2. Compute value extent
    const rDomain = this.computeValueDomain(data, oExtent)

    // 3. Build scales
    const isVertical = projection === "vertical"
    const isHorizontal = projection === "horizontal"
    const isRadial = projection === "radial"

    const padding = config.barPadding != null ? config.barPadding / (isVertical ? layout.width : layout.height) : 0.1

    let oScale: ScaleBand<string>
    let rScale: ScaleLinear<number, number>

    if (isRadial) {
      // Radial: oScale maps to [0, 2π], rScale maps outward
      oScale = scaleBand<string>().domain(oExtent).range([0, 1]).padding(0)
      const maxR = Math.min(layout.width, layout.height) / 2
      const innerR = config.innerRadius || 0
      rScale = scaleLinear().domain(rDomain).range([innerR, maxR])
    } else if (isHorizontal) {
      oScale = scaleBand<string>().domain(oExtent).range([0, layout.height]).padding(padding)
      rScale = scaleLinear().domain(rDomain).range([0, layout.width])
    } else {
      // vertical (default)
      oScale = scaleBand<string>().domain(oExtent).range([0, layout.width]).padding(padding)
      rScale = scaleLinear().domain(rDomain).range([layout.height, 0])
    }

    this.scales = { o: oScale, r: rScale, projection }

    // 4. Build projected columns
    this.columns = this.buildColumns(data, oExtent, oScale, projection, layout)

    // 5. Build scene graph
    this.scene = this.buildSceneNodes(data, layout)
    this.version++
  }

  // ── Category resolution ──────────────────────────────────────────────

  private resolveCategories(data: Record<string, any>[]): string[] {
    const cats = Array.from(this.categories)
    const sort = this.config.oSort

    if (sort === false) return cats

    if (typeof sort === "function") {
      return cats.sort(sort)
    }

    // Default: sort by total value descending (unless explicitly "asc")
    const sums = new Map<string, number>()
    for (const d of data) {
      const cat = this.getO(d)
      sums.set(cat, (sums.get(cat) || 0) + Math.abs(this.getR(d)))
    }

    if (sort === "asc") {
      return cats.sort((a, b) => (sums.get(a) || 0) - (sums.get(b) || 0))
    }

    // Default, true, "desc", or undefined → descending
    return cats.sort((a, b) => (sums.get(b) || 0) - (sums.get(a) || 0))
  }

  // ── Value domain computation ─────────────────────────────────────────

  private computeValueDomain(data: Record<string, any>[], oExtent: string[]): [number, number] {
    const chartType = this.config.chartType
    const pad = this.config.extentPadding || 0.05

    // For radial (pie/donut), the value axis represents proportions
    if (this.config.projection === "radial") {
      return [0, 1]
    }

    let min = 0
    let max = 0

    if (chartType === "bar" && this.getStack) {
      // Stacked bars: compute per-category stacked sums
      const posSums = new Map<string, number>()
      const negSums = new Map<string, number>()

      for (const d of data) {
        const cat = this.getO(d)
        const val = this.getR(d)
        if (val >= 0) {
          posSums.set(cat, (posSums.get(cat) || 0) + val)
        } else {
          negSums.set(cat, (negSums.get(cat) || 0) + val)
        }
      }

      for (const s of posSums.values()) if (s > max) max = s
      for (const s of negSums.values()) if (s < min) min = s
    } else if (chartType === "bar" || chartType === "clusterbar") {
      // Simple bars: extent of individual values
      for (const d of data) {
        const val = this.getR(d)
        if (val > max) max = val
        if (val < min) min = val
      }
    } else {
      // Points, swarm, summary types: raw data extent
      const dataMin = this.rExtent.extent[0]
      const dataMax = this.rExtent.extent[1]
      if (dataMin !== Infinity) min = dataMin
      if (dataMax !== -Infinity) max = dataMax
    }

    // Apply user-specified extents
    if (this.config.rExtent) {
      if (this.config.rExtent[0] != null) min = this.config.rExtent[0]
      if (this.config.rExtent[1] != null) max = this.config.rExtent[1]
    }

    // Apply padding
    const range = max - min
    const padAmount = range > 0 ? range * pad : 1
    if (!this.config.rExtent?.[0]) min -= padAmount
    if (!this.config.rExtent?.[1]) max += padAmount

    // Bars should include zero
    if (chartType === "bar" || chartType === "clusterbar") {
      if (min > 0) min = 0
      if (max < 0) max = 0
    }

    return [min, max]
  }

  // ── Column projection ────────────────────────────────────────────────

  private buildColumns(
    data: Record<string, any>[],
    oExtent: string[],
    oScale: ScaleBand<string>,
    projection: string,
    layout: OrdinalLayout
  ): Record<string, OrdinalColumn> {
    const columns: Record<string, OrdinalColumn> = {}

    // Group data by category
    const grouped = new Map<string, Record<string, any>[]>()
    for (const d of data) {
      const cat = this.getO(d)
      if (!grouped.has(cat)) grouped.set(cat, [])
      grouped.get(cat)!.push(d)
    }

    // Compute total for radial proportions
    let total = 0
    if (projection === "radial") {
      for (const d of data) {
        total += Math.abs(this.getR(d))
      }
    }

    let cumulativePct = 0

    for (const cat of oExtent) {
      const pieceData = grouped.get(cat) || []
      const bandStart = oScale(cat) ?? 0
      const bandwidth = oScale.bandwidth()
      const catSum = pieceData.reduce((s, d) => s + Math.abs(this.getR(d)), 0)
      const pct = total > 0 ? catSum / total : 0

      columns[cat] = {
        name: cat,
        x: bandStart,
        y: 0,
        width: bandwidth,
        middle: bandStart + bandwidth / 2,
        padding: oScale.padding() * oScale.step(),
        pieceData,
        pct,
        pctStart: cumulativePct
      }

      cumulativePct += pct
    }

    return columns
  }

  // ── Scene graph building ─────────────────────────────────────────────

  private buildSceneNodes(data: Record<string, any>[], layout: OrdinalLayout): OrdinalSceneNode[] {
    const chartType = this.config.chartType

    switch (chartType) {
      case "bar":
        return this.buildBarScene(layout)
      case "clusterbar":
        return this.buildClusterBarScene(layout)
      case "point":
        return this.buildPointScene(layout)
      case "swarm":
        return this.buildSwarmScene(layout)
      case "pie":
      case "donut":
        return this.buildPieScene(layout)
      case "boxplot":
        return this.buildBoxplotScene(layout)
      case "violin":
        return this.buildViolinScene(layout)
      case "histogram":
        return this.buildHistogramScene(layout)
      default:
        return []
    }
  }

  // ── Bar scene ────────────────────────────────────────────────────────

  private buildBarScene(layout: OrdinalLayout): OrdinalSceneNode[] {
    if (!this.scales) return []
    const { r: rScale, projection } = this.scales
    const nodes: OrdinalSceneNode[] = []
    const isVertical = projection === "vertical"
    const isHorizontal = projection === "horizontal"
    const normalize = this.config.normalize
    const getStack = this.getStack

    for (const col of Object.values(this.columns)) {
      // Group pieces by stack key if stacking
      const stacks = new Map<string, Record<string, any>[]>()
      for (const d of col.pieceData) {
        const key = getStack ? getStack(d) : "_default"
        if (!stacks.has(key)) stacks.set(key, [])
        stacks.get(key)!.push(d)
      }

      // Compute totals for normalization
      let colTotal = 0
      if (normalize) {
        for (const d of col.pieceData) colTotal += Math.abs(this.getR(d))
      }

      let posOffset = 0
      let negOffset = 0

      for (const [stackKey, pieces] of stacks) {
        for (const d of pieces) {
          let val = this.getR(d)
          if (normalize && colTotal > 0) val = val / colTotal

          const style = this.resolvePieceStyle(d, col.name)

          if (isVertical) {
            const zeroY = rScale(0)
            const valY = rScale(val >= 0 ? posOffset + val : negOffset + val)
            const barY = Math.min(zeroY - (val >= 0 ? posOffset : 0) * (rScale(0) - rScale(1)), valY)
            const barH = Math.abs(rScale(0) - rScale(val))

            const actualY = val >= 0
              ? rScale(posOffset + val)
              : rScale(negOffset)
            const actualH = val >= 0
              ? rScale(posOffset) - rScale(posOffset + val)
              : rScale(negOffset + val) - rScale(negOffset)

            nodes.push(buildRectNode(
              col.x, actualY, col.width, Math.abs(actualH),
              style, d, stackKey
            ))

            if (val >= 0) posOffset += val
            else negOffset += val
          } else if (isHorizontal) {
            const zeroX = rScale(0)
            const actualX = val >= 0
              ? rScale(posOffset)
              : rScale(negOffset + val)
            const actualW = val >= 0
              ? rScale(posOffset + val) - rScale(posOffset)
              : rScale(negOffset) - rScale(negOffset + val)

            nodes.push(buildRectNode(
              actualX, col.x, Math.abs(actualW), col.width,
              style, d, stackKey
            ))

            if (val >= 0) posOffset += val
            else negOffset += val
          }
        }
      }
    }

    return nodes
  }

  // ── Cluster bar scene ────────────────────────────────────────────────

  private buildClusterBarScene(layout: OrdinalLayout): OrdinalSceneNode[] {
    if (!this.scales) return []
    const { r: rScale, projection } = this.scales
    const nodes: OrdinalSceneNode[] = []
    const isVertical = projection === "vertical"
    const getGroup = this.getGroup

    // Discover all group keys
    const groupKeys: string[] = []
    const groupSet = new Set<string>()
    for (const col of Object.values(this.columns)) {
      for (const d of col.pieceData) {
        const key = getGroup ? getGroup(d) : "_default"
        if (!groupSet.has(key)) {
          groupSet.add(key)
          groupKeys.push(key)
        }
      }
    }
    const groupCount = groupKeys.length || 1

    for (const col of Object.values(this.columns)) {
      const subWidth = col.width / groupCount
      const grouped = new Map<string, Record<string, any>[]>()
      for (const d of col.pieceData) {
        const key = getGroup ? getGroup(d) : "_default"
        if (!grouped.has(key)) grouped.set(key, [])
        grouped.get(key)!.push(d)
      }

      for (let gi = 0; gi < groupKeys.length; gi++) {
        const groupData = grouped.get(groupKeys[gi]) || []
        for (const d of groupData) {
          const val = this.getR(d)
          const style = this.resolvePieceStyle(d, col.name)

          if (isVertical) {
            const barX = col.x + gi * subWidth
            const zeroY = rScale(0)
            const valY = rScale(val)
            nodes.push(buildRectNode(
              barX, Math.min(zeroY, valY), subWidth, Math.abs(zeroY - valY),
              style, d, groupKeys[gi]
            ))
          } else {
            const barY = col.x + gi * subWidth
            const zeroX = rScale(0)
            const valX = rScale(val)
            nodes.push(buildRectNode(
              Math.min(zeroX, valX), barY, Math.abs(valX - zeroX), subWidth,
              style, d, groupKeys[gi]
            ))
          }
        }
      }
    }

    return nodes
  }

  // ── Point scene ──────────────────────────────────────────────────────

  private buildPointScene(layout: OrdinalLayout): OrdinalSceneNode[] {
    if (!this.scales) return []
    const { r: rScale, projection } = this.scales
    const nodes: OrdinalSceneNode[] = []
    const isVertical = projection === "vertical"

    for (const col of Object.values(this.columns)) {
      for (const d of col.pieceData) {
        const val = this.getR(d)
        const style = this.resolvePieceStyle(d, col.name)
        const r = (style as any).r || 5

        const px = isVertical ? col.middle : rScale(val)
        const py = isVertical ? rScale(val) : col.middle

        nodes.push({ type: "point", x: px, y: py, r, style, datum: d })
      }
    }

    return nodes
  }

  // ── Swarm scene ──────────────────────────────────────────────────────

  private buildSwarmScene(layout: OrdinalLayout): OrdinalSceneNode[] {
    // Swarm uses force simulation — placeholder for Phase 3
    // For now, fall back to point layout with jitter
    if (!this.scales) return []
    const { r: rScale, projection } = this.scales
    const nodes: OrdinalSceneNode[] = []
    const isVertical = projection === "vertical"

    for (const col of Object.values(this.columns)) {
      // Simple jittered placement (real force sim in Phase 3)
      const halfWidth = col.width / 2
      for (let i = 0; i < col.pieceData.length; i++) {
        const d = col.pieceData[i]
        const val = this.getR(d)
        const style = this.resolvePieceStyle(d, col.name)
        const r = (style as any).r || 4

        // Deterministic jitter based on index
        const jitter = (((i * 7919) % 100) / 100 - 0.5) * halfWidth * 0.8

        const px = isVertical ? col.middle + jitter : rScale(val)
        const py = isVertical ? rScale(val) : col.middle + jitter

        nodes.push({ type: "point", x: px, y: py, r, style, datum: d })
      }
    }

    return nodes
  }

  // ── Pie/donut scene ──────────────────────────────────────────────────

  private buildPieScene(layout: OrdinalLayout): WedgeSceneNode[] {
    if (!this.scales) return []
    const nodes: WedgeSceneNode[] = []
    // cx/cy are 0 because StreamOrdinalFrame translates the canvas
    // to the center of the chart area for radial projection
    const cx = 0
    const cy = 0
    const outerRadius = Math.min(layout.width, layout.height) / 2 - 4
    const innerRadius = this.config.chartType === "donut" ? (this.config.innerRadius || 60) : 0
    // Start from 12 o'clock (-π/2) plus any user offset
    const startAngleOffset = -Math.PI / 2 + ((this.config.startAngle || 0) * Math.PI) / 180

    const twoPi = Math.PI * 2

    for (const col of Object.values(this.columns)) {
      const startAngle = startAngleOffset + col.pctStart * twoPi
      const endAngle = startAngleOffset + (col.pctStart + col.pct) * twoPi
      const style = this.resolvePieceStyle(col.pieceData[0], col.name)

      nodes.push({
        type: "wedge",
        cx, cy,
        innerRadius,
        outerRadius,
        startAngle,
        endAngle,
        style,
        datum: col.pieceData,
        category: col.name
      })
    }

    return nodes
  }

  // ── Boxplot scene ────────────────────────────────────────────────────

  private buildBoxplotScene(layout: OrdinalLayout): OrdinalSceneNode[] {
    if (!this.scales) return []
    const { r: rScale, projection } = this.scales
    const nodes: OrdinalSceneNode[] = []
    const isVertical = projection === "vertical"
    const showOutliers = this.config.showOutliers !== false

    for (const col of Object.values(this.columns)) {
      const values = col.pieceData
        .map(d => this.getR(d))
        .filter(v => v != null && !isNaN(v))
        .sort((a, b) => a - b)

      if (values.length === 0) continue

      const min = values[0]
      const max = values[values.length - 1]
      const q1 = d3Quantile(values, 0.25) ?? min
      const median = d3Quantile(values, 0.5) ?? (min + max) / 2
      const q3 = d3Quantile(values, 0.75) ?? max

      // IQR-based whiskers
      const iqr = q3 - q1
      const lowerFence = q1 - 1.5 * iqr
      const upperFence = q3 + 1.5 * iqr
      const whiskerMin = values.find(v => v >= lowerFence) ?? min
      const whiskerMax = [...values].reverse().find(v => v <= upperFence) ?? max

      const style = this.resolveSummaryStyle(col.pieceData[0], col.name)

      const outliers: BoxplotSceneNode["outliers"] = []
      if (showOutliers) {
        for (const d of col.pieceData) {
          const v = this.getR(d)
          if (v < lowerFence || v > upperFence) {
            const px = isVertical ? col.middle : rScale(v)
            const py = isVertical ? rScale(v) : col.middle
            outliers.push({ px, py, value: v, datum: d })
          }
        }
      }

      nodes.push({
        type: "boxplot",
        x: isVertical ? col.middle : 0,
        y: isVertical ? 0 : col.middle,
        projection: isVertical ? "vertical" : "horizontal",
        columnWidth: col.width * 0.6,
        minPos: rScale(whiskerMin),
        q1Pos: rScale(q1),
        medianPos: rScale(median),
        q3Pos: rScale(q3),
        maxPos: rScale(whiskerMax),
        stats: { min: whiskerMin, q1, median, q3, max: whiskerMax },
        style,
        datum: col.pieceData,
        category: col.name,
        outliers
      } as BoxplotSceneNode)

      // Add outlier points
      if (showOutliers) {
        for (const o of outliers) {
          nodes.push({
            type: "point",
            x: o.px,
            y: o.py,
            r: 3,
            style: { fill: style.fill || "#999", opacity: 0.6 },
            datum: o.datum
          })
        }
      }
    }

    return nodes
  }

  // ── Violin scene ─────────────────────────────────────────────────────

  private buildViolinScene(layout: OrdinalLayout): OrdinalSceneNode[] {
    if (!this.scales) return []
    const { r: rScale, projection } = this.scales
    const nodes: OrdinalSceneNode[] = []
    const isVertical = projection === "vertical"
    const bins = this.config.bins || 20
    const showIQR = this.config.showIQR !== false

    for (const col of Object.values(this.columns)) {
      const values = col.pieceData
        .map(d => this.getR(d))
        .filter(v => v != null && !isNaN(v))
        .sort((a, b) => a - b)

      if (values.length < 2) continue

      const vMin = values[0]
      const vMax = values[values.length - 1]
      const binWidth = (vMax - vMin) / bins || 1

      // Build histogram bins
      const counts = new Array(bins).fill(0)
      for (const v of values) {
        const idx = Math.min(Math.floor((v - vMin) / binWidth), bins - 1)
        counts[idx]++
      }
      const maxCount = Math.max(...counts, 1)

      // Build symmetric violin path
      const halfWidth = col.width / 2 * 0.9
      let pathStr = ""

      if (isVertical) {
        // Right side (top to bottom)
        for (let i = 0; i < bins; i++) {
          const y = rScale(vMin + (i + 0.5) * binWidth)
          const w = (counts[i] / maxCount) * halfWidth
          pathStr += i === 0 ? `M ${col.middle + w} ${y}` : ` L ${col.middle + w} ${y}`
        }
        // Left side (bottom to top)
        for (let i = bins - 1; i >= 0; i--) {
          const y = rScale(vMin + (i + 0.5) * binWidth)
          const w = (counts[i] / maxCount) * halfWidth
          pathStr += ` L ${col.middle - w} ${y}`
        }
        pathStr += " Z"
      } else {
        // Top side (left to right)
        for (let i = 0; i < bins; i++) {
          const x = rScale(vMin + (i + 0.5) * binWidth)
          const w = (counts[i] / maxCount) * halfWidth
          pathStr += i === 0 ? `M ${x} ${col.middle - w}` : ` L ${x} ${col.middle - w}`
        }
        // Bottom side (right to left)
        for (let i = bins - 1; i >= 0; i--) {
          const x = rScale(vMin + (i + 0.5) * binWidth)
          const w = (counts[i] / maxCount) * halfWidth
          pathStr += ` L ${x} ${col.middle + w}`
        }
        pathStr += " Z"
      }

      const style = this.resolveSummaryStyle(col.pieceData[0], col.name)

      // IQR overlay
      let iqrLine: ViolinSceneNode["iqrLine"]
      if (showIQR && values.length >= 4) {
        const q1 = d3Quantile(values, 0.25) ?? vMin
        const median = d3Quantile(values, 0.5) ?? (vMin + vMax) / 2
        const q3 = d3Quantile(values, 0.75) ?? vMax
        iqrLine = {
          q1Pos: rScale(q1),
          medianPos: rScale(median),
          q3Pos: rScale(q3)
        }
      }

      nodes.push({
        type: "violin",
        pathString: pathStr,
        translateX: 0,
        translateY: 0,
        iqrLine,
        style,
        datum: col.pieceData,
        category: col.name
      } as ViolinSceneNode)
    }

    return nodes
  }

  // ── Histogram scene ──────────────────────────────────────────────────

  private buildHistogramScene(layout: OrdinalLayout): OrdinalSceneNode[] {
    if (!this.scales) return []
    const { r: rScale, projection } = this.scales
    const nodes: OrdinalSceneNode[] = []
    const numBins = this.config.bins || 25
    const isRelative = this.config.normalize

    for (const col of Object.values(this.columns)) {
      const values = col.pieceData
        .map(d => this.getR(d))
        .filter(v => v != null && !isNaN(v))

      if (values.length === 0) continue

      const vMin = Math.min(...values)
      const vMax = Math.max(...values)
      const binWidth = (vMax - vMin) / numBins || 1

      const counts = new Array(numBins).fill(0)
      for (const v of values) {
        const idx = Math.min(Math.floor((v - vMin) / binWidth), numBins - 1)
        counts[idx]++
      }

      const total = values.length
      const maxCount = Math.max(...counts, 1)
      const barWidth = col.width / numBins

      // Histogram always renders horizontally within the column
      for (let i = 0; i < numBins; i++) {
        const count = isRelative ? counts[i] / total : counts[i]
        const normHeight = isRelative ? count : counts[i] / maxCount
        const barHeight = normHeight * col.width * 0.8

        if (counts[i] === 0) continue

        const style = this.resolveSummaryStyle(col.pieceData[0], col.name)

        // Position within the column
        const binY = rScale(vMin + i * binWidth)
        const binH = Math.abs(rScale(vMin + (i + 1) * binWidth) - binY)

        nodes.push(buildRectNode(
          col.x,
          Math.min(binY, rScale(vMin + (i + 1) * binWidth)),
          barHeight,
          binH,
          style,
          { bin: i, count: counts[i], range: [vMin + i * binWidth, vMin + (i + 1) * binWidth] },
          col.name
        ))
      }
    }

    return nodes
  }

  // ── Style resolution ─────────────────────────────────────────────────

  private resolvePieceStyle(d: any, category?: string): Style {
    if (this.config.pieceStyle) {
      return this.config.pieceStyle(d, category)
    }
    if (this.config.barColors && category) {
      return { fill: this.config.barColors[category] || "#007bff" }
    }
    return { fill: "#007bff" }
  }

  private resolveSummaryStyle(d: any, category?: string): Style {
    if (this.config.summaryStyle) {
      return this.config.summaryStyle(d, category)
    }
    return { fill: "#007bff", fillOpacity: 0.6, stroke: "#007bff", strokeWidth: 1 }
  }

  // ── Public accessors ─────────────────────────────────────────────────

  getData(): Record<string, any>[] {
    return this.buffer.toArray()
  }

  clear(): void {
    this.buffer.clear()
    this.rExtent.clear()
    this.categories.clear()
    this.scales = null
    this.scene = []
    this.columns = {}
    this.version++
  }

  get size(): number {
    return this.buffer.size
  }

  getOAccessor(): (d: any) => string {
    return this.getO
  }

  getRAccessor(): (d: any) => number {
    return this.getR
  }

  updateConfig(config: Partial<OrdinalPipelineConfig>): void {
    Object.assign(this.config, config)
  }
}
