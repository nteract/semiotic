/**
 * OrdinalPipelineStore — stateful pipeline for ordinal chart data.
 *
 * Owns: data ingestion (RingBuffer), scale computation (o-band + r-linear),
 * value domain logic (per-lane sums for swimlane, zero-inclusion for bars),
 * and scene layout delegation to ordinalSceneBuilders/*.
 *
 * Key design decisions:
 *   - Swimlane domain uses per-lane sums, not individual values, because
 *     stacked bars within a lane must fit within the lane's total range.
 *   - Zero-inclusion for bar/swimlane is skipped when explicit rExtent is
 *     set (either end non-null), enabling zoom/brush without domain override.
 *   - Scene builders are pure functions; this store coordinates them.
 *
 * Consumed by: StreamOrdinalFrame (sole consumer).
 */
import { scaleBand, scaleLinear, type ScaleBand, type ScaleLinear } from "d3-scale"
import { RingBuffer } from "../realtime/RingBuffer"
import { IncrementalExtent } from "../realtime/IncrementalExtent"
import type {
  OrdinalPipelineConfig,
  OrdinalScales,
  OrdinalSceneNode,
  OrdinalColumn,
  OrdinalLayout,
  OrdinalChartType
} from "./ordinalTypes"
import type { Changeset, Style, DecayConfig } from "./types"
import { computeEasing, computeRawProgress, lerp, now as getTimestamp } from "./pipelineTransitionUtils"
import type { ActiveTransition } from "./pipelineTransitionUtils"
import { resolveAccessor, resolveStringAccessor, accessorsEquivalent } from "./accessorUtils"
import { STREAMING_PALETTE } from "../charts/shared/colorUtils"
import { buildBarScene, buildClusterBarScene } from "./ordinalSceneBuilders/barScene"
import { buildPointScene, buildSwarmScene } from "./ordinalSceneBuilders/pointScene"
import { buildPieScene } from "./ordinalSceneBuilders/pieScene"
import { buildBoxplotScene, buildViolinScene, buildHistogramScene, buildRidgelineScene } from "./ordinalSceneBuilders/statisticalScene"
import { buildTimelineScene } from "./ordinalSceneBuilders/timelineScene"
import { buildFunnelScene } from "./ordinalSceneBuilders/funnelScene"
import { buildBarFunnelScene } from "./ordinalSceneBuilders/barFunnelScene"
import { buildSwimlaneScene } from "./ordinalSceneBuilders/swimlaneScene"
import { buildConnectors } from "./ordinalSceneBuilders/connectorScene"
import type { OrdinalSceneContext, SceneBuilderFn } from "./ordinalSceneBuilders/types"

const SCENE_BUILDERS: Record<string, SceneBuilderFn> = {
  bar: buildBarScene,
  clusterbar: buildClusterBarScene,
  point: buildPointScene,
  swarm: buildSwarmScene,
  pie: buildPieScene,
  donut: buildPieScene,
  boxplot: buildBoxplotScene,
  violin: buildViolinScene,
  histogram: buildHistogramScene,
  ridgeline: buildRidgelineScene,
  timeline: buildTimelineScene,
  funnel: buildFunnelScene,
  "bar-funnel": buildBarFunnelScene,
  swimlane: buildSwimlaneScene,
}

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
  /** True once a non-bounded (push) changeset has been ingested */
  private _hasStreamingData = false
  /** Lazy color map built from colorScheme for resolvePieceStyle */
  private _colorSchemeMap: Map<string, string> | null = null
  private _colorSchemeIndex = 0

  // ── Pulse tracking ──────────────────────────────────────────────────
  private timestampBuffer: RingBuffer<number> | null = null

  // ── Transition animation ────────────────────────────────────────────
  activeTransition: ActiveTransition | null = null
  private prevPositionMap = new Map<string, { x: number; y: number; w?: number; h?: number; r?: number; opacity?: number }>()
  /** Exit nodes awaiting fade-out removal */
  exitNodes: import("./ordinalTypes").OrdinalSceneNode[] = []

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
      this._hasStreamingData = true
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

    // In streaming mode (explicit runtimeMode or push-API data), preserve
    // insertion order by default to avoid jarring category shuffling as
    // values fluctuate in the sliding window
    if ((this.config.runtimeMode === "streaming" || this._hasStreamingData) && sort === undefined) {
      // Filter to only categories with live data in the buffer, but do NOT
      // delete from the Set — so if a category's data is evicted and later
      // re-pushed, it retains its original FIFO position (no shuffling)
      const liveCategories = new Set<string>()
      for (const d of data) {
        liveCategories.add(this.getO(d))
      }

      // Cap the retained history to prevent unbounded growth in high-cardinality
      // streams. Prune dead categories from the front (oldest first) when the
      // Set exceeds 3x the live count, keeping recent evictions for FIFO stability.
      const maxRetained = Math.max(50, liveCategories.size * 3)
      if (this.categories.size > maxRetained) {
        let toRemove = this.categories.size - maxRetained
        for (const cat of this.categories) {
          if (toRemove <= 0) break
          if (!liveCategories.has(cat)) {
            this.categories.delete(cat)
            toRemove--
          }
        }
      }

      return cats.filter(cat => liveCategories.has(cat))
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

    if (chartType === "bar" && this.getStack && this.config.normalize) {
      // Normalized stacked bars: values are divided by column total → domain is [0, 1]
      min = 0
      max = 1
    } else if (chartType === "bar" && this.getStack) {
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
    } else if (chartType === "swimlane") {
      // Swimlane: items stack sequentially per lane — domain covers max lane sum
      const laneSums = new Map<string, number>()
      for (const d of data) {
        const cat = this.getO(d)
        const val = Math.abs(this.getR(d))
        laneSums.set(cat, (laneSums.get(cat) || 0) + val)
      }
      for (const s of laneSums.values()) {
        if (s > max) max = s
      }
    } else if (chartType === "clusterbar" || chartType === "bar-funnel") {
      // Cluster bars / bar-funnel: individual values (side-by-side grouping)
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

    // Apply padding (bar-funnel needs exact [0, max] — no padding)
    if (chartType !== "bar-funnel") {
      const range = max - min
      const padAmount = range > 0 ? range * pad : 1
      if (this.config.rExtent?.[0] == null) min -= padAmount
      if (this.config.rExtent?.[1] == null) max += padAmount
    }

    // Bars should include zero (unless user explicitly set rExtent)
    if (chartType === "bar" || chartType === "clusterbar" || chartType === "bar-funnel" || chartType === "swimlane") {
      if (!(this.config.rExtent?.[0] != null || this.config.rExtent?.[1] != null)) {
        if (min > 0) min = 0
        if (max < 0) max = 0
      }
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

  private getSceneContext(): OrdinalSceneContext {
    return {
      scales: this.scales!,
      columns: this.columns,
      config: this.config,
      getR: this.getR,
      getStack: this.getStack,
      getGroup: this.getGroup,
      getColor: this.getColor,
      getConnector: this.getConnector,
      getO: this.getO,
      multiScales: this.multiScales,
      rAccessors: this.rAccessors,
      resolvePieceStyle: (d: any, category?: string) => this.resolvePieceStyle(d, category),
      resolveSummaryStyle: (d: any, category?: string) => this.resolveSummaryStyle(d, category),
      getRawRange: (d: any) => this.getRawRange(d)
    }
  }

  private buildSceneNodes(data: Record<string, any>[], layout: OrdinalLayout): OrdinalSceneNode[] {
    if (!this.scales) return []

    const ctx = this.getSceneContext()
    const builder = SCENE_BUILDERS[this.config.chartType]
    let nodes = builder ? builder(ctx, layout) : []

    // Build connectors if configured
    if (this.getConnector && this.scales) {
      const connectorNodes = buildConnectors(ctx, nodes, layout)
      // Connectors render behind pieces
      nodes = [...connectorNodes, ...nodes]
    }

    return nodes
  }

  // ── Style resolution ─────────────────────────────────────────────────

  private resolvePieceStyle(d: any, category?: string): Style {
    if (typeof this.config.pieceStyle === "function") {
      const style = this.config.pieceStyle(d, category)
      // If the function returned a style without a fill color and we have a category,
      // fill in from the frame's color scheme. This handles push API where HOC colorScale
      // is not yet available.
      if (style && !style.fill && category) {
        return { ...style, fill: this.getColorFromScheme(category) }
      }
      return style
    }
    if (this.config.pieceStyle && typeof this.config.pieceStyle === "object") {
      return this.config.pieceStyle as unknown as Style
    }
    if (this.config.barColors && category) {
      return { fill: this.config.barColors[category] || "#007bff" }
    }
    // Use colorScheme (or default palette) to generate colors by category
    if (category) {
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
      : STREAMING_PALETTE
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
    const glowRadius = this.config.pulse.glowRadius ?? 4

    const indexMap = new Map<any, number>()
    for (let i = 0; i < data.length; i++) {
      indexMap.set(data[i], i)
    }

    for (const node of nodes) {
      if (node.type === "connector" || node.type === "violin" || node.type === "boxplot") continue

      // Wedge nodes: datum is a representative point for the category.
      // Pulse the wedge when any data point in that category was recently inserted.
      if (node.type === "wedge") {
        const cat = node.category
        if (!cat) continue
        let bestIntensity = 0
        for (let i = 0; i < data.length; i++) {
          const d = data[i]
          const oAcc = this.config.oAccessor
          const dCat = typeof oAcc === "function" ? oAcc(d) : d[oAcc || "category"]
          if (dCat !== cat) continue
          const insertTime = this.timestampBuffer.get(i)
          if (insertTime == null) continue
          const age = now - insertTime
          if (age < duration) {
            const intensity = 1 - age / duration
            if (intensity > bestIntensity) bestIntensity = intensity
          }
        }
        if (bestIntensity > 0) {
          node._pulseIntensity = bestIntensity
          node._pulseColor = pulseColor
        }
        continue
      }

      const idx = indexMap.get(node.datum)
      if (idx == null) continue
      const insertTime = this.timestampBuffer.get(idx)
      if (insertTime == null) continue
      const age = now - insertTime
      if (age < duration) {
        const intensity = 1 - age / duration
        ;(node as any)._pulseIntensity = intensity
        ;(node as any)._pulseColor = pulseColor
        ;(node as any)._pulseGlowRadius = glowRadius
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

  /** Build a stable identity key for a scene node based on its content, not array index */
  private getNodeKey(node: OrdinalSceneNode, keyCounts: Map<string, number>): string | null {
    if (node.type === "point") {
      const cat = node.datum ? this.getO(node.datum) : ""
      const val = node.datum ? this.getR(node.datum) : 0
      const baseKey = `p:${cat}:${val}`
      const count = keyCounts.get(baseKey) || 0
      keyCounts.set(baseKey, count + 1)
      return `${baseKey}:${count}`
    } else if (node.type === "rect") {
      return `r:${node.group || ""}:${node.datum?.category ?? ""}`
    }
    return null
  }

  private snapshotPositions(): void {
    this.prevPositionMap.clear()
    const keyCounts = new Map<string, number>()
    for (let i = 0; i < this.scene.length; i++) {
      const node = this.scene[i]
      const key = this.getNodeKey(node, keyCounts)
      if (!key) continue
      if (node.type === "point") {
        this.prevPositionMap.set(key, { x: node.x, y: node.y, r: node.r, opacity: node.style.opacity })
      } else if (node.type === "rect") {
        this.prevPositionMap.set(key, { x: node.x, y: node.y, w: node.w, h: node.h, opacity: node.style.opacity })
      }
    }
  }

  private startTransition(): void {
    if (!this.config.transition || this.prevPositionMap.size === 0) return
    const duration = this.config.transition.duration ?? 300

    // Clear any previously-appended exit nodes from the scene
    if (this.exitNodes.length > 0) {
      const exitSet = new Set(this.exitNodes)
      this.scene = this.scene.filter(n => !exitSet.has(n))
      this.exitNodes = []
    }

    let hasChanges = false
    const matchedPrevKeys = new Set<string>()
    const keyCounts = new Map<string, number>()
    for (let i = 0; i < this.scene.length; i++) {
      const node = this.scene[i]
      const key = this.getNodeKey(node, keyCounts)
      if (!key) continue

      // Store stable key on node so advanceTransition can use it
      // even after exit nodes are appended to the scene
      ;(node as any)._transitionKey = key

      const prev = this.prevPositionMap.get(key)

      if (node.type === "point") {
        if (prev) {
          matchedPrevKeys.add(key)
          node._targetOpacity = node.style.opacity ?? 1
          if (prev.x !== node.x || prev.y !== node.y) {
            node._targetX = node.x
            node._targetY = node.y
            node.x = prev.x
            node.y = prev.y
            hasChanges = true
          }
        } else {
          // Entering node
          node._targetOpacity = node.style.opacity ?? 1
          node.style = { ...node.style, opacity: 0 }
          hasChanges = true
        }
      } else if (node.type === "rect") {
        if (prev) {
          matchedPrevKeys.add(key)
          node._targetOpacity = node.style.opacity ?? 1
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
        } else {
          // Entering node
          node._targetOpacity = node.style.opacity ?? 1
          node.style = { ...node.style, opacity: 0 }
          hasChanges = true
        }
      }
    }

    // Detect exit nodes
    this.exitNodes = []
    for (const [key, prev] of this.prevPositionMap) {
      if (matchedPrevKeys.has(key)) continue
      if (key.startsWith("p:")) {
        this.exitNodes.push({
          type: "point", x: prev.x, y: prev.y, r: prev.r ?? 3,
          style: { opacity: prev.opacity ?? 1 }, datum: null,
          _targetOpacity: 0, _transitionKey: key
        } as any)
      } else if (key.startsWith("r:")) {
        this.exitNodes.push({
          type: "rect", x: prev.x, y: prev.y, w: prev.w ?? 0, h: prev.h ?? 0,
          style: { opacity: prev.opacity ?? 1, fill: "#999" }, datum: null,
          _targetOpacity: 0, _transitionKey: key
        } as any)
      }
      hasChanges = true
    }

    // Append exit nodes (at end to preserve existing indices)
    if (this.exitNodes.length > 0) {
      this.scene = [...this.scene, ...this.exitNodes]
    }

    if (hasChanges) {
      this.activeTransition = {
        startTime: getTimestamp(),
        duration
      }
    }
  }

  advanceTransition(now: number): boolean {
    if (!this.activeTransition) return false

    const rawT = computeRawProgress(now, this.activeTransition)
    const easing = this.config.transition?.easing === "linear" ? "linear" : "ease-out-cubic"
    const t = computeEasing(rawT, easing)

    for (const node of this.scene) {
      // Use stable key stored during startTransition (immune to exit node shifts)
      const key = (node as any)._transitionKey as string | undefined
      if (!key) continue

      if (node.type === "point") {
        // Interpolate opacity for enter/exit
        if (node._targetOpacity !== undefined) {
          const prev = this.prevPositionMap.get(key)
          const startOpacity = prev ? (prev.opacity ?? 1) : 0
          node.style.opacity = lerp(startOpacity, node._targetOpacity, t)
        }
        if (node._targetX === undefined) continue
        const prev = this.prevPositionMap.get(key)
        if (!prev) continue
        node.x = lerp(prev.x, node._targetX, t)
        node.y = lerp(prev.y, node._targetY!, t)
      } else if (node.type === "rect") {
        if (node._targetOpacity !== undefined) {
          const prev = this.prevPositionMap.get(key)
          const startOpacity = prev ? (prev.opacity ?? 1) : 0
          node.style.opacity = lerp(startOpacity, node._targetOpacity, t)
        }
        if (node._targetX === undefined) continue
        const prev = this.prevPositionMap.get(key)
        if (!prev) continue
        node.x = lerp(prev.x, node._targetX, t)
        node.y = lerp(prev.y, node._targetY!, t)
        if (prev.w !== undefined) {
          node.w = lerp(prev.w, node._targetW!, t)
          node.h = lerp(prev.h!, node._targetH!, t)
        }
      }
    }

    if (rawT >= 1) {
      for (const node of this.scene) {
        if (node._targetOpacity !== undefined) {
          (node as any).style = { ...((node as any).style || {}), opacity: node._targetOpacity === 0 ? 0 : node._targetOpacity }
          ;(node as any)._targetOpacity = undefined
        }
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
      // Remove exit nodes
      if (this.exitNodes.length > 0) {
        const exitSet = new Set(this.exitNodes)
        this.scene = this.scene.filter(n => !exitSet.has(n))
        this.exitNodes = []
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
    this._hasStreamingData = false
    if (this.timestampBuffer) this.timestampBuffer.clear()
    this.prevPositionMap.clear()
    this.exitNodes = []
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
    const prev = { ...this.config }

    if (config.colorScheme !== this.config.colorScheme) {
      this._colorSchemeMap = null
      this._colorSchemeIndex = 0
    }

    Object.assign(this.config, config)

    // Re-resolve accessors only when the accessor source actually changed.
    // Uses .toString() comparison to skip re-resolution for inline arrow functions
    // that are recreated on every parent render but have identical source code.
    if (config.oAccessor !== undefined || config.categoryAccessor !== undefined) {
      const newO = config.oAccessor || config.categoryAccessor
      const prevO = prev.oAccessor || prev.categoryAccessor
      if (!accessorsEquivalent(newO, prevO)) {
        this.getO = resolveStringAccessor(
          this.config.oAccessor || this.config.categoryAccessor,
          "category"
        ) as (d: any) => string
        // Clear discovered categories so they're rebuilt with the new accessor
        this.categories.clear()
      }
    }
    if (config.rAccessor !== undefined) {
      const newArr = Array.isArray(config.rAccessor) ? config.rAccessor : [config.rAccessor]
      const prevArr = Array.isArray(prev.rAccessor) ? prev.rAccessor : [prev.rAccessor]
      const rChanged = newArr.length !== prevArr.length || newArr.some((acc, i) => !accessorsEquivalent(acc, prevArr[i]))
      if (rChanged) {
        const rawR = this.config.rAccessor
        if (Array.isArray(rawR)) {
          this.rAccessors = rawR.map(acc => resolveAccessor(acc, "value"))
          this.getR = this.rAccessors[0]
          this.rExtents = rawR.map(() => new IncrementalExtent())
        } else {
          this.getR = resolveAccessor(rawR, "value")
          this.rAccessors = [this.getR]
          this.rExtents = [this.rExtent]
        }
      }
    }
    if ("stackBy" in config && !accessorsEquivalent(config.stackBy, prev.stackBy)) {
      this.getStack = this.config.stackBy != null ? resolveStringAccessor(this.config.stackBy) : undefined
    }
    if ("groupBy" in config && !accessorsEquivalent(config.groupBy, prev.groupBy)) {
      this.getGroup = this.config.groupBy != null ? resolveStringAccessor(this.config.groupBy) : undefined
    }
    if ("colorAccessor" in config && !accessorsEquivalent(config.colorAccessor, prev.colorAccessor)) {
      this.getColor = this.config.colorAccessor != null ? resolveStringAccessor(this.config.colorAccessor) : undefined
    }
    if ("connectorAccessor" in config && !accessorsEquivalent(config.connectorAccessor, prev.connectorAccessor)) {
      this.getConnector = this.config.connectorAccessor != null ? resolveStringAccessor(this.config.connectorAccessor) : undefined
    }
  }
}
