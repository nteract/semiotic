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
  ConnectorSceneNode,
  OrdinalChartType
} from "./ordinalTypes"
import type { Changeset, Style, PointSceneNode, RectSceneNode, DecayConfig } from "./types"
import { resolveAccessor, resolveStringAccessor } from "./accessorUtils"

// ── OrdinalPipelineStore ───────────────────────────────────────────────

export class OrdinalPipelineStore {
  private buffer: RingBuffer<Record<string, any>>
  private rExtent = new IncrementalExtent()
  /** Per-accessor extents for multiAxis mode */
  private rExtents: IncrementalExtent[] = []
  private config: OrdinalPipelineConfig

  private getO: (d: any) => string
  private getR: (d: any) => number
  /** All resolved rAccessors (length > 1 when multiAxis) */
  private rAccessors: ((d: any) => number)[] = []
  private getStack: ((d: any) => string) | undefined
  private getGroup: ((d: any) => string) | undefined
  private getColor: ((d: any) => string) | undefined
  private getConnector: ((d: any) => string) | undefined

  /** Discovered categories in insertion order */
  private categories = new Set<string>()
  /** Lazy color map built from colorScheme for resolvePieceStyle */
  private _colorSchemeMap: Map<string, string> | null = null
  private _colorSchemeIndex = 0

  // ── Pulse tracking ──────────────────────────────────────────────────
  private timestampBuffer: RingBuffer<number> | null = null

  // ── Transition animation ────────────────────────────────────────────
  activeTransition: { startTime: number; duration: number } | null = null
  private prevPositionMap = new Map<string, { x: number; y: number; w?: number; h?: number; r?: number }>()

  // ── Staleness tracking ──────────────────────────────────────────────
  lastIngestTime = 0

  scales: OrdinalScales | null = null
  /** Per-accessor scales for multiAxis */
  multiScales: (ScaleLinear<number, number>)[] = []
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

    // Resolve rAccessor — may be an array for multiAxis
    const rawR = config.rAccessor
    if (Array.isArray(rawR)) {
      this.rAccessors = rawR.map(acc => resolveAccessor(acc, "value"))
      this.getR = this.rAccessors[0]
      this.rExtents = rawR.map(() => new IncrementalExtent())
    } else {
      if (isStreaming && (config.timeAccessor || config.valueAccessor)) {
        this.getR = resolveAccessor(config.valueAccessor || rawR, "value")
      } else {
        this.getR = resolveAccessor(rawR, "value")
      }
      this.rAccessors = [this.getR]
      this.rExtents = [this.rExtent]
    }

    this.getStack = resolveStringAccessor(config.stackBy)
    this.getGroup = resolveStringAccessor(config.groupBy)
    this.getColor = resolveStringAccessor(config.colorAccessor)
    this.getConnector = resolveStringAccessor(config.connectorAccessor)

    if (config.pulse) {
      this.timestampBuffer = new RingBuffer(config.windowSize)
    }
  }

  // ── Data ingestion ───────────────────────────────────────────────────

  ingest(changeset: Changeset): boolean {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    this.lastIngestTime = now

    if (changeset.bounded) {
      this.buffer.clear()
      this.rExtent.clear()
      this.categories.clear()
      if (this.timestampBuffer) this.timestampBuffer.clear()

      const targetSize = changeset.totalSize || changeset.inserts.length
      if (targetSize > this.buffer.capacity) {
        this.buffer.resize(targetSize)
        if (this.timestampBuffer && targetSize > this.timestampBuffer.capacity) {
          this.timestampBuffer.resize(targetSize)
        }
      }

      for (const d of changeset.inserts) {
        this.buffer.push(d)
        if (this.timestampBuffer) this.timestampBuffer.push(now)
        this.categories.add(this.getO(d))
        this.pushValueExtent(d)
      }
    } else {
      // Streaming append
      for (const d of changeset.inserts) {
        const evicted = this.buffer.push(d)
        if (this.timestampBuffer) this.timestampBuffer.push(now)
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
    if (this.config.chartType === "timeline") {
      const range = this.getRawRange(d)
      if (range) {
        this.rExtent.push(range[0])
        this.rExtent.push(range[1])
      }
    } else if (this.rAccessors.length > 1) {
      // MultiAxis: track extents per accessor
      for (let i = 0; i < this.rAccessors.length; i++) {
        this.rExtents[i].push(this.rAccessors[i](d))
      }
      // Also push to primary extent for single-scale fallback
      this.rExtent.push(this.getR(d))
    } else {
      this.rExtent.push(this.getR(d))
    }
  }

  private evictValueExtent(d: any): void {
    if (this.config.chartType === "timeline") {
      const range = this.getRawRange(d)
      if (range) {
        this.rExtent.evict(range[0])
        this.rExtent.evict(range[1])
      }
    } else if (this.rAccessors.length > 1) {
      for (let i = 0; i < this.rAccessors.length; i++) {
        this.rExtents[i].evict(this.rAccessors[i](d))
      }
      this.rExtent.evict(this.getR(d))
    } else {
      this.rExtent.evict(this.getR(d))
    }
  }

  /** For timeline type: resolve rAccessor as a [start, end] pair */
  private getRawRange(d: any): [number, number] | null {
    const acc = this.config.rAccessor
    if (!acc) return null
    const result = typeof acc === "function" ? (acc as Function)(d) : d[acc as string]
    if (Array.isArray(result) && result.length >= 2) {
      return [+result[0], +result[1]]
    }
    return null
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

    // 3b. Build per-accessor scales for multiAxis mode
    if (this.rAccessors.length > 1 && config.multiAxis) {
      this.multiScales = this.rAccessors.map((acc, i) => {
        const ext = this.rExtents[i]
        if (ext.dirty) ext.recalculate(buffer, acc)
        let [min, max] = ext.extent
        if (min === Infinity) { min = 0; max = 1 }
        const pad = config.extentPadding || 0.05
        const range = max - min
        const padAmt = range > 0 ? range * pad : 1
        min -= padAmt
        max += padAmt
        if (min > 0) min = 0

        if (isHorizontal) return scaleLinear().domain([min, max]).range([0, layout.width])
        return scaleLinear().domain([min, max]).range([layout.height, 0])
      })
    } else {
      this.multiScales = []
    }

    // 3c. Expand data for multi-accessor: each datum becomes N pieces with rIndex
    let expandedData = data
    if (this.rAccessors.length > 1) {
      expandedData = data.flatMap(d =>
        this.rAccessors.map((acc, rIndex) => ({
          ...d,
          __rIndex: rIndex,
          __rValue: acc(d),
          __rName: this.resolveRAccessorName(rIndex)
        }))
      )
    }

    // 4. Build projected columns
    this.columns = this.buildColumns(expandedData, oExtent, oScale, projection, layout)

    // Snapshot positions for transition animation
    if (this.config.transition && this.scene.length > 0) {
      this.snapshotPositions()
    }

    // 5. Build scene graph
    this.scene = this.buildSceneNodes(expandedData, layout)

    // Apply decay/pulse to discrete scene nodes
    if (this.config.decay) {
      this.applyDecay(this.scene, data)
    }
    if (this.config.pulse) {
      this.applyPulse(this.scene, data)
    }

    // Start transition animation
    if (this.config.transition && this.prevPositionMap.size > 0) {
      this.startTransition()
    }

    this.version++
  }

  private resolveRAccessorName(index: number): string {
    const acc = Array.isArray(this.config.rAccessor) ? this.config.rAccessor[index] : this.config.rAccessor
    return typeof acc === "string" ? acc : `value${index}`
  }

  // ── Category resolution ──────────────────────────────────────────────

  private resolveCategories(data: Record<string, any>[]): string[] {
    const cats = Array.from(this.categories)
    const sort = this.config.oSort

    // In streaming mode, preserve insertion order by default to avoid
    // jarring category shuffling as values fluctuate in the sliding window
    if (this.config.runtimeMode === "streaming" && sort === undefined) {
      return cats
    }

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

    // For radial pie/donut, the value axis represents proportions
    // But for radial point (radar), use actual data values
    if (this.config.projection === "radial" && (chartType === "pie" || chartType === "donut")) {
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
    } else if (chartType === "bar") {
      // Non-stacked bars: pieces within each category are summed,
      // so the domain must cover the per-category total
      const catSums = new Map<string, number>()
      for (const d of data) {
        const cat = this.getO(d)
        const val = this.getR(d)
        catSums.set(cat, (catSums.get(cat) || 0) + val)
      }
      for (const s of catSums.values()) {
        if (s > max) max = s
        if (s < min) min = s
      }
    } else if (chartType === "clusterbar") {
      // Cluster bars: individual values (side-by-side)
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

    // Dynamic column widths: compute proportional widths instead of uniform bands
    const dcw = this.config.dynamicColumnWidth
    let dynamicWidths: Map<string, number> | null = null
    if (dcw && projection !== "radial") {
      dynamicWidths = new Map()
      let totalWidth = 0
      for (const cat of oExtent) {
        const pieceData = grouped.get(cat) || []
        let colValue: number
        if (typeof dcw === "string") {
          colValue = pieceData.reduce((s, d) => s + (Number(d[dcw]) || 0), 0)
        } else {
          colValue = dcw(pieceData)
        }
        dynamicWidths.set(cat, colValue)
        totalWidth += colValue
      }
      // Normalize to available space
      const availableSpace = projection === "horizontal" ? layout.height : layout.width
      const paddingTotal = oScale.padding() * oScale.step() * oExtent.length
      const usableSpace = availableSpace - paddingTotal
      if (totalWidth > 0) {
        for (const [cat, val] of dynamicWidths) {
          dynamicWidths.set(cat, (val / totalWidth) * usableSpace)
        }
      }
    }

    let cumulativePct = 0
    let cumulativeX = 0

    for (const cat of oExtent) {
      const pieceData = grouped.get(cat) || []
      const catSum = pieceData.reduce((s, d) => s + Math.abs(this.getR(d)), 0)
      const pct = total > 0 ? catSum / total : 0

      let bandStart: number
      let bandwidth: number
      if (dynamicWidths) {
        bandStart = cumulativeX
        bandwidth = dynamicWidths.get(cat) || oScale.bandwidth()
        cumulativeX += bandwidth + (oScale.padding() * oScale.step())
      } else {
        bandStart = oScale(cat) ?? 0
        bandwidth = oScale.bandwidth()
      }

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
    let nodes: OrdinalSceneNode[]

    switch (chartType) {
      case "bar":
        nodes = this.buildBarScene(layout); break
      case "clusterbar":
        nodes = this.buildClusterBarScene(layout); break
      case "point":
        nodes = this.buildPointScene(layout); break
      case "swarm":
        nodes = this.buildSwarmScene(layout); break
      case "pie":
      case "donut":
        nodes = this.buildPieScene(layout); break
      case "boxplot":
        nodes = this.buildBoxplotScene(layout); break
      case "violin":
        nodes = this.buildViolinScene(layout); break
      case "histogram":
        nodes = this.buildHistogramScene(layout); break
      case "ridgeline":
        nodes = this.buildRidgelineScene(layout); break
      case "timeline":
        nodes = this.buildTimelineScene(layout); break
      default:
        nodes = []
    }

    // Build connectors if configured
    if (this.getConnector && this.scales) {
      const connectors = this.buildConnectors(nodes, layout)
      // Connectors render behind pieces
      nodes = [...connectors, ...nodes]
    }

    return nodes
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
      // Group pieces by stack key if stacking, and aggregate values per group
      const stacks = new Map<string, { total: number; pieces: Record<string, any>[] }>()
      for (const d of col.pieceData) {
        const key = getStack ? getStack(d) : "_default"
        if (!stacks.has(key)) stacks.set(key, { total: 0, pieces: [] })
        const group = stacks.get(key)!
        group.total += this.getR(d)
        group.pieces.push(d)
      }

      // Compute totals for normalization
      let colTotal = 0
      if (normalize) {
        for (const g of stacks.values()) colTotal += Math.abs(g.total)
      }

      let posOffset = 0
      let negOffset = 0

      for (const [stackKey, group] of stacks) {
        // Use the aggregated total for the stack group (one rect per group)
        let val = group.total
        if (normalize && colTotal > 0) val = val / colTotal

        // Use the first piece for styling — look up barColors by stack key (not category)
        const style = getStack
          ? this.resolvePieceStyle(group.pieces[0], stackKey)
          : this.resolvePieceStyle(group.pieces[0], col.name)
        // Build a synthetic datum that includes the aggregate info
        const aggDatum = {
          ...group.pieces[0],
          __aggregateValue: group.total,
          __pieceCount: group.pieces.length,
          category: col.name
        }

        if (isVertical) {
          const actualY = val >= 0
            ? rScale(posOffset + val)
            : rScale(negOffset)
          const actualH = val >= 0
            ? rScale(posOffset) - rScale(posOffset + val)
            : rScale(negOffset + val) - rScale(negOffset)

          nodes.push(buildRectNode(
            col.x, actualY, col.width, Math.abs(actualH),
            style, aggDatum, stackKey
          ))

          if (val >= 0) posOffset += val
          else negOffset += val
        } else if (isHorizontal) {
          const actualX = val >= 0
            ? rScale(posOffset)
            : rScale(negOffset + val)
          const actualW = val >= 0
            ? rScale(posOffset + val) - rScale(posOffset)
            : rScale(negOffset) - rScale(negOffset + val)

          nodes.push(buildRectNode(
            actualX, col.x, Math.abs(actualW), col.width,
            style, aggDatum, stackKey
          ))

          if (val >= 0) posOffset += val
          else negOffset += val
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
    const isRadial = projection === "radial"
    const hasMultiAxis = this.multiScales.length > 0

    const twoPi = Math.PI * 2
    const startAngleOffset = -Math.PI / 2

    for (const col of Object.values(this.columns)) {
      for (const d of col.pieceData) {
        const rIndex = d.__rIndex ?? 0
        const val = d.__rValue ?? this.getR(d)
        const scale = hasMultiAxis ? (this.multiScales[rIndex] || rScale) : rScale
        const style = this.resolvePieceStyle(d, col.name)
        const r = (style as any).r || 5

        let px: number, py: number

        if (isRadial) {
          // Radial: angle from category position, radius from value
          const midAngle = startAngleOffset + (col.pctStart + col.pct / 2) * twoPi
          const radius = scale(val)
          px = Math.cos(midAngle) * radius
          py = Math.sin(midAngle) * radius
        } else if (isVertical) {
          px = col.middle
          py = scale(val)
        } else {
          px = scale(val)
          py = col.middle
        }

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

      const violinBounds = isVertical
        ? { x: col.x, y: Math.min(rScale(vMax), rScale(vMin)), width: col.width, height: Math.abs(rScale(vMax) - rScale(vMin)) }
        : { x: Math.min(rScale(vMin), rScale(vMax)), y: col.x, width: Math.abs(rScale(vMax) - rScale(vMin)), height: col.width }

      nodes.push({
        type: "violin",
        pathString: pathStr,
        translateX: 0,
        translateY: 0,
        bounds: violinBounds,
        iqrLine,
        style,
        datum: col.pieceData,
        category: col.name
      } as ViolinSceneNode)
    }

    return nodes
  }

  // ── Ridgeline scene ──────────────────────────────────────────────────

  private buildRidgelineScene(layout: OrdinalLayout): OrdinalSceneNode[] {
    if (!this.scales) return []
    const { r: rScale, projection } = this.scales
    const nodes: OrdinalSceneNode[] = []
    const numBins = this.config.bins || 20
    const isHorizontal = projection === "horizontal"
    // Amplitude controls how far the density extends (can overlap neighbors)
    const amplitude = (this.config as any).amplitude || 1.5

    for (const col of Object.values(this.columns)) {
      const values = col.pieceData
        .map(d => this.getR(d))
        .filter(v => v != null && !isNaN(v))
        .sort((a, b) => a - b)

      if (values.length < 2) continue

      const vMin = values[0]
      const vMax = values[values.length - 1]
      const binWidth = (vMax - vMin) / numBins || 1

      // Build histogram bins
      const counts = new Array(numBins).fill(0)
      for (const v of values) {
        const idx = Math.min(Math.floor((v - vMin) / binWidth), numBins - 1)
        counts[idx]++
      }
      const maxCount = Math.max(...counts, 1)

      const style = this.resolveSummaryStyle(col.pieceData[0], col.name)
      const halfBand = col.width * amplitude

      // Build one-sided area path (density extends in one direction from baseline)
      let pathStr = ""

      if (isHorizontal) {
        // Horizontal: categories on y, values on x
        // Baseline is the bottom of the column band, density extends upward
        const baseline = col.x + col.width

        // Start at baseline
        pathStr = `M ${rScale(vMin)} ${baseline}`
        // Density curve going upward (negative y)
        for (let i = 0; i < numBins; i++) {
          const x = rScale(vMin + (i + 0.5) * binWidth)
          const h = (counts[i] / maxCount) * halfBand
          pathStr += ` L ${x} ${baseline - h}`
        }
        // Close back to baseline
        pathStr += ` L ${rScale(vMax)} ${baseline} Z`
      } else {
        // Vertical: categories on x, values on y
        // Baseline is the left of the column band, density extends rightward
        const baseline = col.x

        pathStr = `M ${baseline} ${rScale(vMin)}`
        for (let i = 0; i < numBins; i++) {
          const y = rScale(vMin + (i + 0.5) * binWidth)
          const w = (counts[i] / maxCount) * halfBand
          pathStr += ` L ${baseline + w} ${y}`
        }
        pathStr += ` L ${baseline} ${rScale(vMax)} Z`
      }

      const ridgeBounds = isHorizontal
        ? { x: Math.min(rScale(vMin), rScale(vMax)), y: col.x, width: Math.abs(rScale(vMax) - rScale(vMin)), height: col.width }
        : { x: col.x, y: Math.min(rScale(vMax), rScale(vMin)), width: col.width, height: Math.abs(rScale(vMax) - rScale(vMin)) }

      nodes.push({
        type: "violin",
        pathString: pathStr,
        translateX: 0,
        translateY: 0,
        bounds: ridgeBounds,
        style: { ...style, fillOpacity: style.fillOpacity ?? 0.5 },
        datum: col.pieceData,
        category: col.name
      } as ViolinSceneNode)
    }

    return nodes
  }

  // ── Histogram scene ──────────────────────────────────────────────────

  private buildHistogramScene(layout: OrdinalLayout): OrdinalSceneNode[] {
    if (!this.scales) return []
    const { r: rScale } = this.scales
    const nodes: OrdinalSceneNode[] = []
    const numBins = this.config.bins || 25
    const isRelative = this.config.normalize

    // Histograms always render horizontally: categories on y-axis, value bins on x-axis
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

      const style = this.resolveSummaryStyle(col.pieceData[0], col.name)

      for (let i = 0; i < numBins; i++) {
        if (counts[i] === 0) continue

        const normCount = isRelative ? counts[i] / total : counts[i] / maxCount
        // Bar height proportional to count, within the column band
        const barH = normCount * col.width * 0.9

        // Bin position on the value (x) axis
        const binStart = rScale(vMin + i * binWidth)
        const binEnd = rScale(vMin + (i + 1) * binWidth)
        const x = Math.min(binStart, binEnd)
        const w = Math.abs(binEnd - binStart)

        // Align bar to baseline (bottom of the column band)
        const y = col.x + col.width - barH

        nodes.push(buildRectNode(
          x, y, w, barH,
          style,
          { bin: i, count: counts[i], range: [vMin + i * binWidth, vMin + (i + 1) * binWidth], category: col.name },
          col.name
        ))
      }
    }

    return nodes
  }

  // ── Timeline scene ───────────────────────────────────────────────────

  private buildTimelineScene(layout: OrdinalLayout): OrdinalSceneNode[] {
    if (!this.scales) return []
    const { r: rScale, projection } = this.scales
    const nodes: OrdinalSceneNode[] = []
    const isHorizontal = projection === "horizontal"

    for (const col of Object.values(this.columns)) {
      for (const d of col.pieceData) {
        const range = this.getRawRange(d)
        if (!range) continue

        const [start, end] = range
        const style = this.resolvePieceStyle(d, col.name)

        if (isHorizontal) {
          const x0 = rScale(Math.min(start, end))
          const x1 = rScale(Math.max(start, end))
          nodes.push(buildRectNode(
            x0, col.x, x1 - x0, col.width,
            style, d, col.name
          ))
        } else {
          const y0 = rScale(Math.max(start, end))
          const y1 = rScale(Math.min(start, end))
          nodes.push(buildRectNode(
            col.x, y0, col.width, y1 - y0,
            style, d, col.name
          ))
        }
      }
    }

    return nodes
  }

  // ── Connectors ───────────────────────────────────────────────────────

  private buildConnectors(pieceNodes: OrdinalSceneNode[], layout: OrdinalLayout): ConnectorSceneNode[] {
    if (!this.getConnector || !this.scales) return []
    const connectors: ConnectorSceneNode[] = []
    const { projection } = this.scales

    // Group pieces by connector key
    const groups = new Map<string, { x: number; y: number; datum: any; category: string }[]>()

    for (const node of pieceNodes) {
      if (node.type !== "point" && node.type !== "rect") continue
      const datum = node.datum
      if (!datum) continue

      const key = this.getConnector(datum)
      if (!key) continue

      let cx: number, cy: number
      if (node.type === "point") {
        cx = node.x
        cy = node.y
      } else {
        // rect: use center
        cx = node.x + node.w / 2
        cy = node.y + (projection === "vertical" ? 0 : node.h / 2)
      }

      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push({ x: cx, y: cy, datum, category: this.getO(datum) })
    }

    // Draw lines connecting pieces with the same connector key, sorted by category order
    const oExtent = this.scales.o.domain()
    const resolveConnStyle = this.config.connectorStyle

    for (const [key, points] of groups) {
      if (points.length < 2) continue

      // Sort by category order
      points.sort((a, b) => oExtent.indexOf(a.category) - oExtent.indexOf(b.category))

      for (let i = 0; i < points.length - 1; i++) {
        const from = points[i]
        const to = points[i + 1]
        const style: Style = typeof resolveConnStyle === "function"
          ? resolveConnStyle(from.datum)
          : (resolveConnStyle || { stroke: "#999", strokeWidth: 1, opacity: 0.5 })

        connectors.push({
          type: "connector",
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          style,
          datum: from.datum,
          group: key
        })
      }
    }

    return connectors
  }

  // ── Style resolution ─────────────────────────────────────────────────

  private resolvePieceStyle(d: any, category?: string): Style {
    if (typeof this.config.pieceStyle === "function") {
      return this.config.pieceStyle(d, category)
    }
    if (this.config.pieceStyle && typeof this.config.pieceStyle === "object") {
      return this.config.pieceStyle as unknown as Style
    }
    if (this.config.barColors && category) {
      return { fill: this.config.barColors[category] || "#007bff" }
    }
    // Use colorScheme to generate colors by category/group
    if (this.config.colorScheme && category) {
      return { fill: this.getColorFromScheme(category) }
    }
    return { fill: "#007bff" }
  }

  private getColorFromScheme(key: string): string {
    if (!this._colorSchemeMap) this._colorSchemeMap = new Map()
    const existing = this._colorSchemeMap.get(key)
    if (existing) return existing

    const palette = Array.isArray(this.config.colorScheme)
      ? this.config.colorScheme
      : ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac"]
    const color = palette[this._colorSchemeIndex % palette.length]
    this._colorSchemeIndex++
    this._colorSchemeMap.set(key, color)
    return color
  }

  private resolveSummaryStyle(d: any, category?: string): Style {
    if (typeof this.config.summaryStyle === "function") {
      return this.config.summaryStyle(d, category)
    }
    if (this.config.summaryStyle && typeof this.config.summaryStyle === "object") {
      return this.config.summaryStyle as unknown as Style
    }
    return { fill: "#007bff", fillOpacity: 0.6, stroke: "#007bff", strokeWidth: 1 }
  }

  // ── Decay ────────────────────────────────────────────────────────────

  computeDecayOpacity(bufferIndex: number, bufferSize: number): number {
    const decay = this.config.decay
    if (!decay || bufferSize <= 1) return 1

    const minOpacity = decay.minOpacity ?? 0.1
    const age = bufferSize - 1 - bufferIndex

    switch (decay.type) {
      case "linear": {
        const t = 1 - age / (bufferSize - 1)
        return minOpacity + t * (1 - minOpacity)
      }
      case "exponential": {
        const halfLife = decay.halfLife ?? bufferSize / 2
        const t = Math.pow(0.5, age / halfLife)
        return minOpacity + t * (1 - minOpacity)
      }
      case "step": {
        const threshold = decay.stepThreshold ?? bufferSize * 0.5
        return age < threshold ? 1 : minOpacity
      }
      default:
        return 1
    }
  }

  private applyDecay(nodes: OrdinalSceneNode[], data: Record<string, any>[]): void {
    if (!this.config.decay) return
    const bufferSize = data.length
    if (bufferSize <= 1) return

    const indexMap = new Map<any, number>()
    for (let i = 0; i < data.length; i++) {
      indexMap.set(data[i], i)
    }

    for (const node of nodes) {
      if (node.type === "connector" || node.type === "violin" || node.type === "boxplot" || node.type === "wedge") continue
      const idx = indexMap.get(node.datum)
      if (idx == null) continue
      const decayOpacity = this.computeDecayOpacity(idx, bufferSize)
      const baseOpacity = node.style?.opacity ?? 1
      ;(node as any).style = { ...(node as any).style, opacity: baseOpacity * decayOpacity }
    }
  }

  // ── Pulse ───────────────────────────────────────────────────────────

  private applyPulse(nodes: OrdinalSceneNode[], data: Record<string, any>[]): void {
    if (!this.config.pulse || !this.timestampBuffer) return
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    const duration = this.config.pulse.duration ?? 500
    const pulseColor = this.config.pulse.color ?? "rgba(255,255,255,0.6)"

    const indexMap = new Map<any, number>()
    for (let i = 0; i < data.length; i++) {
      indexMap.set(data[i], i)
    }

    for (const node of nodes) {
      if (node.type === "connector" || node.type === "violin" || node.type === "boxplot" || node.type === "wedge") continue
      const idx = indexMap.get(node.datum)
      if (idx == null) continue
      const insertTime = this.timestampBuffer.get(idx)
      if (insertTime == null) continue
      const age = now - insertTime
      if (age < duration) {
        const intensity = 1 - age / duration
        ;(node as any)._pulseIntensity = intensity
        ;(node as any)._pulseColor = pulseColor
      }
    }
  }

  get hasActivePulses(): boolean {
    if (!this.config.pulse || !this.timestampBuffer || this.timestampBuffer.size === 0) return false
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    const duration = this.config.pulse.duration ?? 500
    const newest = this.timestampBuffer.peek()
    return newest != null && (now - newest) < duration
  }

  // ── Transitions ─────────────────────────────────────────────────────

  private snapshotPositions(): void {
    this.prevPositionMap.clear()
    for (let i = 0; i < this.scene.length; i++) {
      const node = this.scene[i]
      if (node.type === "point") {
        this.prevPositionMap.set(`p:${i}`, { x: node.x, y: node.y, r: node.r })
      } else if (node.type === "rect") {
        const key = `r:${node.group || ""}:${node.datum?.category ?? i}`
        this.prevPositionMap.set(key, { x: node.x, y: node.y, w: node.w, h: node.h })
      }
    }
  }

  private startTransition(): void {
    if (!this.config.transition || this.prevPositionMap.size === 0) return
    const duration = this.config.transition.duration ?? 300

    let hasChanges = false
    for (let i = 0; i < this.scene.length; i++) {
      const node = this.scene[i]
      let key: string | null = null
      if (node.type === "point") {
        key = `p:${i}`
      } else if (node.type === "rect") {
        key = `r:${node.group || ""}:${node.datum?.category ?? i}`
      }
      if (!key) continue
      const prev = this.prevPositionMap.get(key)
      if (!prev) continue

      if (node.type === "point") {
        if (prev.x !== node.x || prev.y !== node.y) {
          node._targetX = node.x
          node._targetY = node.y
          node.x = prev.x
          node.y = prev.y
          hasChanges = true
        }
      } else if (node.type === "rect") {
        if (prev.x !== node.x || prev.y !== node.y || prev.w !== node.w || prev.h !== node.h) {
          node._targetX = node.x
          node._targetY = node.y
          node._targetW = node.w
          node._targetH = node.h
          node.x = prev.x
          node.y = prev.y
          node.w = prev.w ?? node.w
          node.h = prev.h ?? node.h
          hasChanges = true
        }
      }
    }

    if (hasChanges) {
      this.activeTransition = {
        startTime: typeof performance !== "undefined" ? performance.now() : Date.now(),
        duration
      }
    }
  }

  advanceTransition(now: number): boolean {
    if (!this.activeTransition) return false

    const elapsed = now - this.activeTransition.startTime
    const rawT = Math.min(elapsed / this.activeTransition.duration, 1)
    const t = this.config.transition?.easing === "linear"
      ? rawT
      : 1 - Math.pow(1 - rawT, 3)

    for (const node of this.scene) {
      if (node.type === "point") {
        if (node._targetX === undefined) continue
        const key = `p:${0}`
        const prev = this.prevPositionMap.get(key)
        if (!prev) continue
        node.x = prev.x + (node._targetX - prev.x) * t
        node.y = prev.y + (node._targetY! - prev.y) * t
      } else if (node.type === "rect") {
        if (node._targetX === undefined) continue
        const key = `r:${node.group || ""}:${node.datum?.category ?? 0}`
        const prev = this.prevPositionMap.get(key)
        if (!prev) continue
        node.x = prev.x + (node._targetX - prev.x) * t
        node.y = prev.y + (node._targetY! - prev.y) * t
        if (prev.w !== undefined) {
          node.w = prev.w + (node._targetW! - prev.w) * t
          node.h = prev.h! + (node._targetH! - prev.h!) * t
        }
      }
    }

    if (rawT >= 1) {
      for (const node of this.scene) {
        if (node.type === "point") {
          if (node._targetX === undefined) continue
          node.x = node._targetX
          node.y = node._targetY!
          node._targetX = undefined
          node._targetY = undefined
        } else if (node.type === "rect") {
          if (node._targetX === undefined) continue
          node.x = node._targetX
          node.y = node._targetY!
          node.w = node._targetW!
          node.h = node._targetH!
          node._targetX = undefined
          node._targetY = undefined
          node._targetW = undefined
          node._targetH = undefined
        }
      }
      this.activeTransition = null
      return false
    }

    return true
  }

  // ── Public accessors ─────────────────────────────────────────────────

  getData(): Record<string, any>[] {
    return this.buffer.toArray()
  }

  clear(): void {
    this.buffer.clear()
    this.rExtent.clear()
    this.categories.clear()
    if (this.timestampBuffer) this.timestampBuffer.clear()
    this.prevPositionMap.clear()
    this.activeTransition = null
    this.lastIngestTime = 0
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
    if (config.colorScheme !== this.config.colorScheme) {
      this._colorSchemeMap = null
      this._colorSchemeIndex = 0
    }
    Object.assign(this.config, config)
  }
}
