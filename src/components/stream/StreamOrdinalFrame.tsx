/**
 * StreamOrdinalFrame — canvas-based ordinal chart renderer.
 *
 * Renders bar, stacked bar, grouped bar, pie/donut, swarm, box, violin,
 * histogram, ridgeline, dot, funnel, and swimlane charts via a streaming
 * pipeline backed by OrdinalPipelineStore.
 *
 * Key dependencies:
 *   OrdinalPipelineStore  — data ingestion, scale computation, scene layout
 *   DataSourceAdapter     — static vs streaming data source abstraction
 *   OrdinalSVGOverlay     — annotations, axes, legends (SVG layer above canvas)
 *   OrdinalBrushOverlay   — d3-brush SVG overlay for value-axis brushing
 *   ordinalSceneBuilders/ — per-chartType layout algorithms
 *   SceneToSVG            — SSR fallback (scene nodes → SVG elements)
 *
 * Consumed by: all ordinal HOC charts (BarChart, SwarmPlot, Histogram, etc.)
 * via StreamOrdinalFrameProps. HOCs set chartType + style functions; the
 * frame owns rendering, interaction, and accessibility.
 */
"use client"
import type { Datum } from "../charts/shared/datumTypes"
import * as React from "react"
import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useImperativeHandle,
  forwardRef
} from "react"
import type {
  StreamOrdinalFrameProps,
  StreamOrdinalFrameHandle,
  OrdinalChartType,
  OrdinalScales,
  
  OrdinalPipelineConfig,
  
  OrdinalLayout,
  HoverData
} from "./ordinalTypes"
import { DataSourceAdapter } from "./DataSourceAdapter"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { composeOverlays } from "./composeOverlays"
import { findNearestOrdinalNode } from "./OrdinalCanvasHitTester"
import { extractOrdinalNavPoints, buildNavGraph, resolvePosition, nextGraphIndex, navPointToHover, type NavGraph } from "./keyboardNav"
import { useStalenessCheck } from "./useStalenessCheck"
import { OrdinalSVGOverlay, OrdinalSVGUnderlay } from "./OrdinalSVGOverlay"
import { OrdinalBrushOverlay } from "./OrdinalBrushOverlay"
import { ordinalSceneNodeToSVG, isServerEnvironment } from "./SceneToSVG"
import { AccessibleDataTable, AriaLiveTooltip, ScreenReaderSummary, SkipToTableLink, computeCanvasAriaLabel } from "./AccessibleDataTable"
import { FocusRing } from "./FocusRing"
import { FlippingTooltip } from "../Tooltip/FlippingTooltip"
import { useFrame } from "./useFrame"
import { resolveThemeSemanticColors } from "../store/ThemeStore"

// Canvas renderers
import { getDevicePixelRatio } from "./canvasSetup"
import { barCanvasRenderer } from "./renderers/barCanvasRenderer"
import { pointCanvasRenderer } from "./renderers/pointCanvasRenderer"
import { wedgeCanvasRenderer } from "./renderers/wedgeCanvasRenderer"
import { buildHoverData, type HoverPointerCoords } from "./hoverUtils"
import { boxplotCanvasRenderer } from "./renderers/boxplotCanvasRenderer"
import { violinCanvasRenderer } from "./renderers/violinCanvasRenderer"
import { connectorCanvasRenderer } from "./renderers/connectorCanvasRenderer"
import { trapezoidCanvasRenderer, funnelLabelRenderer } from "./renderers/trapezoidCanvasRenderer"
import { barFunnelHatchRenderer, barFunnelLabelRenderer } from "./renderers/barFunnelCanvasRenderer"
import { extractCategoryDomain, sameCategoryDomain } from "./categoryDomain"

// ── Renderer dispatch ──────────────────────────────────────────────────

// Connectors are built into the scene graph by the store, so every
// chart type includes the connector renderer to paint them.
// Renderers internally filter nodes by type, so the union-typed array is safe.
// Use a relaxed function type to avoid casting every renderer to OrdinalRendererFn.
type AnyRendererFn = (ctx: CanvasRenderingContext2D, nodes: any[], scales: any, layout: any) => void

const withConnectors = (renderers: AnyRendererFn[]): AnyRendererFn[] =>
  [connectorCanvasRenderer, ...renderers]

const RENDERERS: Record<OrdinalChartType, AnyRendererFn[]> = {
  bar: withConnectors([barCanvasRenderer]),
  clusterbar: withConnectors([barCanvasRenderer]),
  point: withConnectors([pointCanvasRenderer]),
  swarm: withConnectors([pointCanvasRenderer]),
  pie: [wedgeCanvasRenderer],
  donut: [wedgeCanvasRenderer],
  boxplot: withConnectors([boxplotCanvasRenderer, pointCanvasRenderer]),
  violin: withConnectors([violinCanvasRenderer]),
  histogram: withConnectors([barCanvasRenderer]),
  ridgeline: withConnectors([violinCanvasRenderer]),
  timeline: withConnectors([barCanvasRenderer]),
  funnel: [barCanvasRenderer, trapezoidCanvasRenderer, funnelLabelRenderer],
  "bar-funnel": [barCanvasRenderer, barFunnelHatchRenderer, barFunnelLabelRenderer],
  swimlane: withConnectors([barCanvasRenderer]),
  // custom: any node type possible — each renderer self-filters to its type.
  custom: withConnectors([
    barCanvasRenderer,
    pointCanvasRenderer,
    wedgeCanvasRenderer,
    boxplotCanvasRenderer,
    violinCanvasRenderer,
    trapezoidCanvasRenderer,
  ])
}

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_MARGIN = { top: 50, right: 40, bottom: 60, left: 70 }

// ── Tooltip ────────────────────────────────────────────────────────────

const defaultTooltipStyle: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.85)",
  color: "white",
  padding: "6px 10px",
  borderRadius: "4px",
  fontSize: "13px",
  lineHeight: "1.4",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  pointerEvents: "none",
  whiteSpace: "nowrap"
}

function DefaultOrdinalTooltip({ hover }: { hover: HoverData }) {
  const d = hover.data || {}
  const stats = hover.stats
  const hoverCategory = hover.category

  // For summary types (boxplot, violin, ridgeline), datum is an array of pieces
  if (Array.isArray(d)) {
    const category = hoverCategory || d[0]?.category || ""
    if (stats) {
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          {category && <div style={{ fontWeight: "bold" }}>{String(category)}</div>}
          <div>n = {stats.n}</div>
          <div>Min: {stats.min.toLocaleString()}</div>
          <div>Q1: {stats.q1.toLocaleString()}</div>
          <div>Median: {stats.median.toLocaleString()}</div>
          <div>Q3: {stats.q3.toLocaleString()}</div>
          <div>Max: {stats.max.toLocaleString()}</div>
          <div style={{ opacity: 0.8 }}>Mean: {stats.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </div>
      )
    }
    const n = d.length
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        {category && <div style={{ fontWeight: "bold" }}>{String(category)}</div>}
        <div>{n} items</div>
      </div>
    )
  }

  // For histogram bins
  if (d.bin != null && d.count != null) {
    const range = d.range || []
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        {d.category && <div style={{ fontWeight: "bold" }}>{String(d.category)}</div>}
        <div>Count: {d.count}</div>
        {range.length === 2 && (
          <div style={{ opacity: 0.8 }}>
            {Number(range[0]).toFixed(1)} – {Number(range[1]).toFixed(1)}
          </div>
        )}
      </div>
    )
  }

  // Accessor hints passed from the hover handler
  const oAccessor = hover.__oAccessor
  const rAccessor = hover.__rAccessor
  const hoverChartType = hover.__chartType

  // For swarm/point charts, show all datum fields (point-level data, not aggregated)
  if (hoverChartType === "swarm" || hoverChartType === "point") {
    const entries = Object.entries(d).filter(
      ([k]) => !k.startsWith("_") && k !== "data"
    )
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <span style={{ opacity: 0.7 }}>{k}:</span>{" "}
            {typeof v === "number" ? v.toLocaleString() : String(v)}
          </div>
        ))}
      </div>
    )
  }

  // For regular pieces (bar, pie, etc.) — use accessor names to find category and value
  const category = (oAccessor && d[oAccessor] != null ? d[oAccessor] : null)
    || d.category || d.name || d.group || d.__rName || ""
  const value = d.__aggregateValue
    ?? (rAccessor && d[rAccessor] != null ? d[rAccessor] : null)
    ?? d.value ?? d.__rValue ?? d.pct ?? ""

  // If standard fields didn't match, show all non-internal fields from the datum
  if (!category && value === "") {
    const entries = Object.entries(d).filter(
      ([k]) => !k.startsWith("_") && k !== "data"
    )
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <span style={{ opacity: 0.7 }}>{k}:</span>{" "}
            {typeof v === "number" ? v.toLocaleString() : String(v)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      {category && <div style={{ fontWeight: "bold" }}>{String(category)}</div>}
      {value !== "" && <div>{typeof value === "number" ? value.toLocaleString() : String(value)}</div>}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────

const StreamOrdinalFrame = forwardRef<StreamOrdinalFrameHandle, StreamOrdinalFrameProps>(
  function StreamOrdinalFrame(props, ref) {
    const {
      chartType,
      runtimeMode,
      data,
      oAccessor = "category",
      rAccessor = "value",
      colorAccessor,
      stackBy,
      groupBy,
      multiAxis,
      timeAccessor,
      valueAccessor,
      categoryAccessor,
      projection = "vertical",
      size: sizeProp = [600, 400],
      responsiveWidth,
      responsiveHeight,
      margin: userMargin,
      barPadding,
      roundedTop,
      gradientFill,
      baselinePadding,
      innerRadius,
      cornerRadius,
      normalize,
      startAngle,
      sweepAngle,
      dynamicColumnWidth,
      bins,
      showOutliers,
      showIQR,
      amplitude,
      connectorOpacity,
      showLabels,
      connectorAccessor,
      connectorStyle,
      dataIdAccessor,
      rExtent,
      oExtent,
      extentPadding = 0.05,
      oSort,
      windowMode = "sliding",
      windowSize = 200,
      pieceStyle,
      summaryStyle,
      colorScheme,
      barColors,
      showAxes = true,
      showCategoryTicks,
      categoryLabel, valueLabel, categoryFormat, valueFormat,
      oLabel: oLabelLegacy, rLabel: rLabelLegacy,
      oFormat: oFormatLegacy, rFormat: rFormatLegacy,
      rTickValues,
      tickLabelEdgeAlign,
      enableHover = true,
      hoverAnnotation,
      tooltipContent,
      customHoverBehavior,
      annotations,
      svgAnnotationRules,
      showGrid = false,
      legend,
      legendHoverBehavior,
      legendClickBehavior,
      legendHighlightedCategory,
      legendIsolatedCategories,
      legendPosition,
      legendCategoryAccessor,
      onCategoriesChange,
      backgroundGraphics,
      foregroundGraphics,
      title,
      className,
      background,
      centerContent,
      decay,
      pulse,
      transition: transitionProp,
      animate,
      staleness,
      brush,
      onBrush: onBrushProp,
      accessibleTable = true,
      description,
      summary,
      customLayout,
      layoutConfig,
    } = props

    // dirtyRef is declared before useFrame so it can be threaded in for
    // the theme-change effect. Initial value `true` is family-specific
    // (Ordinal forces a first paint) — see investigation note #3.
    const dirtyRef = useRef(true)

    // ── Frame composition (Tier A + B concerns; see useFrame.ts) ─────────
    const frame = useFrame({
      sizeProp,
      responsiveWidth,
      responsiveHeight,
      userMargin,
      marginDefault: DEFAULT_MARGIN,
      foregroundGraphics,
      backgroundGraphics,
      animate,
      transitionProp,
      themeDirtyRef: dirtyRef,
    })
    const {
      reducedMotionRef,
      responsiveRef,
      size,
      margin,
      adjustedWidth,
      adjustedHeight,
      resolvedForeground,
      resolvedBackground,
      currentTheme,
      transition,
      introEnabled,
      tableId,
      rafRef,
      renderFnRef,
      scheduleRender,
    } = frame

    // Resolve new-style names with legacy fallback
    const oLabel = categoryLabel ?? oLabelLegacy
    const rLabel = valueLabel ?? rLabelLegacy
    const oFormat = categoryFormat ?? oFormatLegacy
    const rFormat = valueFormat ?? rFormatLegacy

    // ── Refs ─────────────────────────────────────────────────────────────

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const hoverRef = useRef<HoverData | null>(null)
    const lastLegendCategoriesRef = useRef<string[]>([])
    const legendCategoryAccessorRef = useRef(legendCategoryAccessor)
    const onCategoriesChangeRef = useRef(onCategoriesChange)
    legendCategoryAccessorRef.current = legendCategoryAccessor
    onCategoriesChangeRef.current = onCategoriesChange

    // ── State ────────────────────────────────────────────────────────────

    const [hoverPoint, setHoverPoint] = useState<HoverData | null>(null)
    const [currentScales, setCurrentScales] = useState<OrdinalScales | null>(null)
    const [annotationFrame, setAnnotationFrame] = useState(0)
    const [isStale, setIsStale] = useState(false)
    // Lifted from store.customLayoutOverlays so React re-renders when overlays
    // change. Synced via syncCustomOverlays() after data-change scene rebuilds.
    // Same pattern as the network frame; reference-equality short-circuits
    // no-op updates.
    const [customOverlays, setCustomOverlays] = useState<React.ReactNode>(null)
    const syncCustomOverlays = useCallback(() => {
      setCustomOverlays(storeRef.current?.customLayoutOverlays ?? null)
    }, [])

    // ── Hover config ─────────────────────────────────────────────────────

    const effectiveHoverAnnotation = enableHover || hoverAnnotation

    // ── Pipeline ─────────────────────────────────────────────────────────

    const isStreaming = runtimeMode === "streaming"

    // animate → transition + introEnabled comes from useFrame above.

    const pipelineConfig = useMemo((): OrdinalPipelineConfig => ({
      chartType,
      runtimeMode: isStreaming ? "streaming" : "bounded",
      windowSize,
      windowMode,
      extentPadding,
      projection,
      oAccessor: isStreaming ? undefined : oAccessor,
      rAccessor: isStreaming ? undefined : rAccessor,
      colorAccessor,
      stackBy,
      groupBy,
      multiAxis,
      timeAccessor: isStreaming ? timeAccessor : undefined,
      valueAccessor: isStreaming ? (valueAccessor || (typeof rAccessor === "string" || typeof rAccessor === "function" ? rAccessor : undefined)) : undefined,
      categoryAccessor: isStreaming ? (categoryAccessor || oAccessor) : undefined,
      rExtent,
      oExtent,
      barPadding,
      roundedTop,
      gradientFill,
      baselinePadding,
      innerRadius,
      cornerRadius,
      normalize,
      startAngle,
      sweepAngle,
      dynamicColumnWidth,
      bins,
      showOutliers,
      showIQR,
      amplitude,
      connectorOpacity,
      showLabels,
      connectorAccessor,
      connectorStyle,
      dataIdAccessor,
      oSort,
      pieceStyle,
      summaryStyle,
      colorScheme,
      themeCategorical: currentTheme?.colors?.categorical,
      themeSemantic: resolveThemeSemanticColors(currentTheme),
      themeSequential: currentTheme?.colors?.sequential,
      themeDiverging: currentTheme?.colors?.diverging,
      barColors,
      decay,
      pulse,
      transition,
      introAnimation: introEnabled,
      staleness,
      customLayout,
      layoutConfig,
      layoutMargin: margin,
    }), [
      chartType, windowSize, windowMode, extentPadding, projection,
      oAccessor, rAccessor, colorAccessor, stackBy, groupBy, multiAxis,
      timeAccessor, valueAccessor, categoryAccessor,
      rExtent, oExtent, barPadding, roundedTop, gradientFill, baselinePadding, innerRadius, cornerRadius, normalize, startAngle, sweepAngle,
      dynamicColumnWidth,
      bins, showOutliers, showIQR, amplitude, connectorOpacity, showLabels, connectorAccessor, connectorStyle, dataIdAccessor, oSort,
      pieceStyle, summaryStyle, colorScheme, barColors,
      decay, pulse, transition?.duration, transition?.easing, introEnabled, staleness,
      isStreaming, currentTheme,
      customLayout, layoutConfig, margin,
    ])

    const storeRef = useRef<OrdinalPipelineStore | null>(null)
    if (!storeRef.current) {
      storeRef.current = new OrdinalPipelineStore(pipelineConfig)
    }

    // scheduleRender comes from useFrame above.

    const emitLegendCategories = useCallback(() => {
      const accessor = legendCategoryAccessorRef.current
      const onChange = onCategoriesChangeRef.current
      if (!onChange || !accessor) return
      const categories = extractCategoryDomain(storeRef.current?.getData() ?? [], accessor)
      if (sameCategoryDomain(categories, lastLegendCategoriesRef.current)) return
      lastLegendCategoriesRef.current = categories
      onChange(categories)
    }, [])

    // Update config when it changes
    useEffect(() => {
      storeRef.current?.updateConfig(pipelineConfig)
      dirtyRef.current = true
      scheduleRender()
    }, [pipelineConfig, scheduleRender])

    // Theme-change repaint (clearCSSColorCache + dirty + scheduleRender)
    // is handled by useFrame above when themeDirtyRef is provided.

    // ── DataSourceAdapter ────────────────────────────────────────────────

    const adapterRef = useRef<DataSourceAdapter | null>(null)
    if (!adapterRef.current) {
      adapterRef.current = new DataSourceAdapter((changeset) => {
        const store = storeRef.current
        if (!store) return
        const needsRender = store.ingest(changeset)
        if (needsRender) {
          dirtyRef.current = true
          // Legend-category emission deferred to the post-computeScene path
          // in the render loop — single canonical emit point per data change,
          // already rAF-throttled. Calling here too would scan the full
          // buffer twice per push at high streaming frequencies.
          scheduleRender()
        }
      })
    }

    // ── Push API ─────────────────────────────────────────────────────────

    const pushPoint = useCallback((datum: Datum) => {
      adapterRef.current?.push(datum)
    }, [])

    const pushManyPoints = useCallback((data: Datum[]) => {
      adapterRef.current?.pushMany(data)
    }, [])

    const clearAll = useCallback(() => {
      adapterRef.current?.clear()
      storeRef.current?.clear()
      dirtyRef.current = true
      // emitLegendCategories runs after computeScene in the render loop.
      scheduleRender()
    }, [scheduleRender])

    // Data replacement. Routes through `setReplacementData`, which emits
    // `{ bounded: true, preserveCategoryOrder: true }`. Three effects:
    //   1. The store skips `categories.clear()` on ingest so insertion
    //      order is preserved across replacements (otherwise categories
    //      would shuffle as their values fluctuate across re-aggregations
    //      — e.g. LikertChart streaming percentages).
    //   2. `_hasStreamingData` is flipped so `resolveCategories` picks
    //      the streaming-preserve branch for `sort: "auto"` / undefined.
    //   3. Transitions still fire because bounded ingest doesn't wipe
    //      the store's `prevPositionMap`.
    //
    // Parameter type mirrors `pushPoint`/`pushManyPoints` above: the frame
    // itself isn't generic (it's typed with the non-generic
    // `StreamOrdinalFrameHandle`, whose default `T` is `Datum`),
    // so all internal callbacks use that concrete shape. The generic `T` on
    // `StreamOrdinalFrameHandle<T>` still flows to consumers — TS method-
    // bivariance lets this wider internal callback sit inside a ref typed
    // with a narrower `T`, so `useRef<StreamOrdinalFrameHandle<MyDatum>>`
    // sees `replace(data: MyDatum[])` at the call site.
    const replaceData = useCallback((newData: Datum[]) => {
      adapterRef.current?.clearLastData()
      adapterRef.current?.setReplacementData(newData)
    }, [])

    useImperativeHandle(ref, () => ({
      push: pushPoint,
      pushMany: pushManyPoints,
      replace: replaceData,
      remove: (id: string | string[]) => {
        adapterRef.current?.flush()
        const removed = storeRef.current?.remove(id) ?? []
        if (removed.length > 0) {
          const hoveredData = hoverRef.current?.data
          const shouldClear = hoverRef.current
            ? Array.isArray(hoveredData)
              ? removed.some(d => hoveredData.includes(d))
              : removed.some(d => d === hoveredData)
            : false
          if (shouldClear) {
            hoverRef.current = null
            setHoverPoint(null)
          }
          dirtyRef.current = true
          // Legend emit deferred to post-computeScene render path.
          scheduleRender()
        }
        return removed
      },
      update: (id: string | string[], updater: (d: Datum) => any) => {
        adapterRef.current?.flush()
        const previous = storeRef.current?.update(id, updater) ?? []
        if (previous.length > 0) {
          dirtyRef.current = true
          // Legend emit deferred to post-computeScene render path.
          scheduleRender()
        }
        return previous
      },
      clear: clearAll,
      getData: () => {
        adapterRef.current?.flush()
        return storeRef.current?.getData() ?? []
      },
      getScales: () => storeRef.current?.scales ?? null
    }), [pushPoint, pushManyPoints, replaceData, clearAll, scheduleRender])

    // ── Controlled data prop ─────────────────────────────────────────────

    useEffect(() => {
      if (!data) return
      adapterRef.current?.setBoundedData(data)
    }, [data])

    // ── Hover handlers ───────────────────────────────────────────────────

    const { hoverHandlerRef, hoverLeaveRef, onPointerMove, onPointerLeave } = frame

    hoverHandlerRef.current = (e: HoverPointerCoords) => {
      if (!effectiveHoverAnnotation) return

      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()

      const chartX = e.clientX - rect.left - margin.left
      const chartY = e.clientY - rect.top - margin.top

      if (chartX < 0 || chartX > adjustedWidth || chartY < 0 || chartY > adjustedHeight) {
        if (hoverRef.current) {
          hoverRef.current = null
          setHoverPoint(null)
          if (customHoverBehavior) customHoverBehavior(null)
          scheduleRender()
        }
        return
      }

      const store = storeRef.current
      if (!store || store.scene.length === 0) return

      // For radial projection, convert to center-relative coordinates
      // since scene nodes use (0,0) as center
      const isRadialMode = projection === "radial"
      const hitX = isRadialMode ? chartX - adjustedWidth / 2 : chartX
      const hitY = isRadialMode ? chartY - adjustedHeight / 2 : chartY

      const hit = findNearestOrdinalNode(store.scene, hitX, hitY, 30, store.pointQuadtree, store.maxPointRadius)
      if (!hit) {
        if (hoverRef.current) {
          hoverRef.current = null
          setHoverPoint(null)
          if (customHoverBehavior) customHoverBehavior(null)
          scheduleRender()
        }
        return
      }

      const rawDatum = hit.datum || {}
      const hover: HoverData = buildHoverData(rawDatum, hit.x, hit.y, {
        ...(hit.stats && { stats: hit.stats }),
        ...(hit.category && { category: hit.category }),
        __oAccessor: typeof oAccessor === "string" ? oAccessor : undefined,
        __rAccessor: typeof rAccessor === "string" ? rAccessor : undefined,
        __chartType: chartType
      })

      hoverRef.current = hover
      setHoverPoint(hover)
      if (customHoverBehavior) {
        customHoverBehavior(hover)
        dirtyRef.current = true // selection state may have changed
      }
      scheduleRender()
    }

    hoverLeaveRef.current = () => {
      if (hoverRef.current) {
        hoverRef.current = null
        setHoverPoint(null)
        if (customHoverBehavior) {
          customHoverBehavior(null)
          dirtyRef.current = true
        }
        scheduleRender()
      }
    }

    // pointermove coalescing (rAF-bounded hit testing) + onMouseLeave
    // come from useFrame above. Frame still owns the hoverHandlerRef
    // and hoverLeaveRef closure bodies (assigned earlier in this file).

    // ── Keyboard navigation ───────────────────────────────────────────

    const kbFocusIndexRef = useRef(-1)
    const focusedNavPointRef = useRef<{ shape?: string; w?: number; h?: number } | null>(null)
    const navGraphCacheRef = useRef<{ version: number; graph: NavGraph } | null>(null)

    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
      const store = storeRef.current
      if (!store || store.scene.length === 0) return

      // Cache NavGraph keyed off store.version to avoid O(n log n) rebuild per keypress
      const storeVersion = store.version
      let graph: NavGraph
      if (navGraphCacheRef.current && navGraphCacheRef.current.version === storeVersion) {
        graph = navGraphCacheRef.current.graph
      } else {
        const navPoints = extractOrdinalNavPoints(store.scene)
        if (navPoints.length === 0) return
        graph = buildNavGraph(navPoints)
        navGraphCacheRef.current = { version: storeVersion, graph }
      }

      const current = kbFocusIndexRef.current

      if (current < 0) {
        if (e.key === "Escape") return
        const isNav = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)
        if (!isNav) return
        e.preventDefault()
        kbFocusIndexRef.current = 0
        const point = graph.flat[0]
        focusedNavPointRef.current = { shape: point.shape, w: point.w, h: point.h }
        const hover: HoverData = {
          ...navPointToHover(point),
          __oAccessor: typeof oAccessor === "string" ? oAccessor : undefined,
          __rAccessor: typeof rAccessor === "string" ? rAccessor : undefined,
          __chartType: chartType
        }
        hoverRef.current = hover
        setHoverPoint(hover)
        if (customHoverBehavior) customHoverBehavior(hover)
        scheduleRender()
        return
      }

      const pos = resolvePosition(graph, current)
      const next = nextGraphIndex(e.key, pos, graph)
      if (next === null) return

      e.preventDefault()

      if (next < 0) {
        kbFocusIndexRef.current = -1
        focusedNavPointRef.current = null
        hoverRef.current = null
        setHoverPoint(null)
        if (customHoverBehavior) customHoverBehavior(null)
        scheduleRender()
        return
      }

      kbFocusIndexRef.current = next
      const point = graph.flat[next]
      focusedNavPointRef.current = { shape: point.shape, w: point.w, h: point.h }
      const hover: HoverData = {
        ...navPointToHover(point),
        __oAccessor: typeof oAccessor === "string" ? oAccessor : undefined,
        __rAccessor: typeof rAccessor === "string" ? rAccessor : undefined,
        __chartType: chartType
      }
      hoverRef.current = hover
      setHoverPoint(hover)
      if (customHoverBehavior) customHoverBehavior(hover)
      scheduleRender()
    }, [customHoverBehavior, scheduleRender])

    const onMouseMoveWrapped = useCallback((e: React.MouseEvent) => {
      kbFocusIndexRef.current = -1
      focusedNavPointRef.current = null
      onPointerMove(e)
    }, [onPointerMove])

    // ── Render function ──────────────────────────────────────────────────

    renderFnRef.current = () => {
      rafRef.current = 0
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const store = storeRef.current
      if (!store) return

      const now = typeof performance !== "undefined" ? performance.now() : Date.now()

      // Advance transition animation
      // Fast-forward transitions when reduced motion is active so target positions
      // are applied immediately and transition state is cleared properly
      const transitionActive = store.advanceTransition(reducedMotionRef.current ? now + 1e6 : now)
      const isTransitioning = reducedMotionRef.current ? false : transitionActive

      const wasDirty = dirtyRef.current
      if (wasDirty && !transitionActive) {
        store.computeScene({ width: adjustedWidth, height: adjustedHeight })
        emitLegendCategories()
        syncCustomOverlays()
        dirtyRef.current = false
      }

      // Update canvas aria-label imperatively after scene changes
      if (wasDirty || isTransitioning) {
        canvas.setAttribute("aria-label", computeCanvasAriaLabel(store.scene, chartType + " chart"))
      }

      // DPR setup — only resize the canvas buffer when dimensions actually change.
      // Setting canvas.width/height (even to the same value) implicitly clears the
      // buffer and forces GPU reallocation on HiDPI displays.
      const dpr = getDevicePixelRatio()
      const newWidth = size[0] * dpr
      const newHeight = size[1] * dpr
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth
        canvas.height = newHeight
        canvas.style.width = `${size[0]}px`
        canvas.style.height = `${size[1]}px`
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Clear
      ctx.clearRect(0, 0, size[0], size[1])

      // Staleness dimming
      const staleThreshold = staleness?.threshold ?? 5000
      const currentlyStale = staleness && store.lastIngestTime > 0 &&
        (now - store.lastIngestTime) > staleThreshold

      if (currentlyStale) {
        ctx.globalAlpha = staleness?.dimOpacity ?? 0.5
      }

      // Background — use explicit prop, or fall back to semiotic theme background.
      // Skip the fill when:
      //   • `background="transparent"` — explicit opt-out for overlay composition.
      //   • `backgroundGraphics` is provided — user supplied their own SVG
      //     background behind the canvas; painting a themed fill would hide it.
      const shouldPaintBg = background !== "transparent" && !backgroundGraphics
      if (shouldPaintBg) {
        const semioticBg = canvas
          ? getComputedStyle(canvas).getPropertyValue("--semiotic-bg").trim()
          : ""
        const effectiveBg = background || (semioticBg && semioticBg !== "transparent" ? semioticBg : null)
        if (effectiveBg) {
          ctx.fillStyle = effectiveBg
          ctx.fillRect(0, 0, size[0], size[1])
        }
      }

      const isRadial = projection === "radial"

      // Clip to chart area so items outside rExtent don't overflow
      ctx.save()
      ctx.beginPath()
      ctx.rect(margin.left, margin.top, adjustedWidth, adjustedHeight)
      ctx.clip()

      if (isRadial) {
        // Radial: translate to center of chart area
        ctx.save()
        ctx.translate(margin.left + adjustedWidth / 2, margin.top + adjustedHeight / 2)
      } else {
        ctx.translate(margin.left, margin.top)
      }

      // Dispatch to renderers. When customLayout is provided, the user
      // can emit any node type; use the "custom" renderer set (each
      // renderer self-filters) regardless of the declared chartType.
      const renderers = customLayout ? RENDERERS.custom : (RENDERERS[chartType] || [])
      const layout: OrdinalLayout = { width: adjustedWidth, height: adjustedHeight }

      for (const renderer of renderers) {
        renderer(ctx, store.scene as any, store.scales as any, layout)
      }

      if (isRadial) {
        ctx.restore()
      }

      // Restore clip
      ctx.restore()

      // Reset alpha after staleness dimming
      if (currentlyStale) {
        ctx.globalAlpha = 1
      }

      // Push scales to React state for SVG overlay
      if (wasDirty && store.scales) {
        setCurrentScales(store.scales)
        setAnnotationFrame(f => f + 1)
      }

      // Update staleness badge state
      if (staleness?.showBadge) {
        setIsStale(!!currentlyStale)
      }

      // Schedule next frame for pulse/transition continuous rendering
      // Re-check activeTransition after computeScene — intro animation may
      // have been set up during this frame's computeScene call.
      const needsContinuation = isTransitioning || store.activeTransition != null || store.hasActivePulses
      if (needsContinuation) {
        rafRef.current = requestAnimationFrame(() => renderFnRef.current())
      }
    }

    // ── Lifecycle ────────────────────────────────────────────────────────

    useEffect(() => {
      scheduleRender()
      return () => {
        // rafRef + pendingMoveCoordsRef + moveRafRef cancel-on-unmount
        // is handled by useFrame.
        // Cancel any in-flight progressive chunking / pending push microtask
        // so `store.ingest` can't fire after the component is gone.
        adapterRef.current?.clear()
      }
    }, [scheduleRender])

    useEffect(() => {
      dirtyRef.current = true
      scheduleRender()
    }, [chartType, adjustedWidth, adjustedHeight, showAxes, background, scheduleRender])

    // Staleness check timer
    useStalenessCheck(staleness, storeRef, dirtyRef, scheduleRender, isStale, setIsStale)

    // ── Tooltip positioning ──────────────────────────────────────────────

    const tooltipRendered = effectiveHoverAnnotation && hoverPoint
      ? (tooltipContent ? tooltipContent(hoverPoint) : <DefaultOrdinalTooltip hover={hoverPoint} />)
      : null

    // For radial projection, hit coords are center-relative — convert back
    // to margin-relative for tooltip positioning
    const isRadialMode = projection === "radial"
    const tooltipX = hoverPoint
      ? (isRadialMode ? hoverPoint.x + adjustedWidth / 2 : hoverPoint.x)
      : 0
    const tooltipY = hoverPoint
      ? (isRadialMode ? hoverPoint.y + adjustedHeight / 2 : hoverPoint.y)
      : 0

    const tooltipElement = tooltipRendered ? (
      <FlippingTooltip
        x={tooltipX}
        y={tooltipY}
        containerWidth={adjustedWidth}
        containerHeight={adjustedHeight}
        margin={margin}
        className="stream-ordinal-tooltip"
      >
        {tooltipRendered}
      </FlippingTooltip>
    ) : null

    // ── SSR path: render SVG instead of canvas ──────────────────────────

    if (isServerEnvironment) {
      const store = storeRef.current
      if (store && data) {
        store.ingest({ inserts: data, bounded: true })
        store.computeScene({ width: adjustedWidth, height: adjustedHeight })
      }

      const scene = store?.scene ?? []
      const scales = store?.scales ?? null
      const isRadial = projection === "radial"
      const translateX = isRadial ? margin.left + adjustedWidth / 2 : margin.left
      const translateY = isRadial ? margin.top + adjustedHeight / 2 : margin.top

      return (
        <div
          className={`stream-ordinal-frame${className ? ` ${className}` : ""}`}
          role="img"
          aria-label={description || (typeof title === "string" ? title : "Ordinal chart")}
          style={{
            position: "relative",
            width: size[0],
            height: size[1],
          }}
        >
          <ScreenReaderSummary summary={summary} />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size[0]}
            height={size[1]}
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            {resolvedBackground && (
              <g transform={`translate(${margin.left},${margin.top})`}>
                {resolvedBackground}
              </g>
            )}
            <g transform={`translate(${translateX},${translateY})`}>
              {background && (
                <rect x={0} y={0} width={adjustedWidth} height={adjustedHeight} fill={background} />
              )}
              {scene.map((node, i) => ordinalSceneNodeToSVG(node, i)).filter(Boolean)}
            </g>
          </svg>
          <OrdinalSVGOverlay
            width={adjustedWidth}
            height={adjustedHeight}
            totalWidth={size[0]}
            totalHeight={size[1]}
            margin={margin}
            scales={scales}
            showAxes={showAxes}
            showCategoryTicks={showCategoryTicks}
            oLabel={oLabel}
            rLabel={rLabel}
            oFormat={oFormat}
            rFormat={rFormat}
            rTickValues={rTickValues}
            tickLabelEdgeAlign={tickLabelEdgeAlign}
            showGrid={showGrid}
            title={title}
            legend={legend}
            legendHoverBehavior={legendHoverBehavior}
            legendClickBehavior={legendClickBehavior}
            legendHighlightedCategory={legendHighlightedCategory}
            legendIsolatedCategories={legendIsolatedCategories}
            legendPosition={legendPosition}
            foregroundGraphics={
              composeOverlays(resolvedForeground, storeRef.current?.customLayoutOverlays)
            }
            annotations={annotations}
            svgAnnotationRules={svgAnnotationRules}
            annotationFrame={0}
            xAccessor={typeof oAccessor === "string" ? oAccessor : undefined}
            yAccessor={typeof rAccessor === "string" ? rAccessor : undefined}
            annotationData={store?.getData()}
          />
          {centerContent && projection === "radial" && (
            <div
              style={{
                position: "absolute",
                left: margin.left + adjustedWidth / 2,
                top: margin.top + adjustedHeight / 2,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                textAlign: "center"
              }}
            >
              {centerContent}
            </div>
          )}
        </div>
      )
    }

    // ── Render ───────────────────────────────────────────────────────────

    // tableId comes from useFrame above (semiotic-table-${React.useId()}).

    return (
      <div
        ref={responsiveRef}
        className={`stream-ordinal-frame${className ? ` ${className}` : ""}`}
        role="group"
        aria-label={description || (typeof title === "string" ? title : "Ordinal chart")}
        tabIndex={0}
        style={{
          position: "relative",
          width: responsiveWidth ? "100%" : size[0],
          height: responsiveHeight ? "100%" : size[1],
          overflow: "visible",
        }}
        onKeyDown={onKeyDown}
      >
        {accessibleTable && <SkipToTableLink tableId={tableId} />}
        {accessibleTable && <AccessibleDataTable scene={storeRef.current?.scene ?? []} chartType={chartType + " chart"} tableId={tableId} chartTitle={typeof title === "string" ? title : undefined} />}
        <ScreenReaderSummary summary={summary} />
        <div
          role="img"
          aria-label={description || (typeof title === "string" ? title : "Ordinal chart")}
          style={{ position: "relative", width: "100%", height: "100%" }}
          onMouseMove={effectiveHoverAnnotation ? onMouseMoveWrapped : undefined}
          onMouseLeave={effectiveHoverAnnotation ? onPointerLeave : undefined}
        >
        {resolvedBackground && (
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: size[0],
              height: size[1],
              pointerEvents: "none"
            }}
          >
            <g transform={`translate(${margin.left},${margin.top})`}>
              {resolvedBackground}
            </g>
          </svg>
        )}

        <OrdinalSVGUnderlay
          width={adjustedWidth}
          height={adjustedHeight}
          totalWidth={size[0]}
          totalHeight={size[1]}
          margin={margin}
          scales={currentScales}
          showAxes={showAxes}
          showGrid={showGrid}
          rFormat={rFormat}
          rTickValues={rTickValues}
        />

        <canvas
          ref={canvasRef}
          aria-label={computeCanvasAriaLabel(storeRef.current?.scene ?? [], chartType + " chart")}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size[0],
            height: size[1]
          }}
        />
        <AriaLiveTooltip hoverPoint={hoverPoint} />

        <OrdinalSVGOverlay
          width={adjustedWidth}
          height={adjustedHeight}
          totalWidth={size[0]}
          totalHeight={size[1]}
          margin={margin}
          scales={currentScales}
          showAxes={showAxes}
          showCategoryTicks={showCategoryTicks}
          oLabel={oLabel}
          rLabel={rLabel}
          oFormat={oFormat}
          rFormat={rFormat}
          showGrid={showGrid}
          title={title}
          legend={legend}
          legendHoverBehavior={legendHoverBehavior}
          legendClickBehavior={legendClickBehavior}
          legendHighlightedCategory={legendHighlightedCategory}
          legendIsolatedCategories={legendIsolatedCategories}
          legendPosition={legendPosition}
          foregroundGraphics={
            composeOverlays(resolvedForeground, customOverlays)
          }
          annotations={annotations}
          svgAnnotationRules={svgAnnotationRules}
          annotationFrame={annotationFrame}
          xAccessor={typeof oAccessor === "string" ? oAccessor : undefined}
          yAccessor={typeof rAccessor === "string" ? rAccessor : undefined}
          annotationData={storeRef.current?.getData()}
          underlayRendered
        />

        {/* Brush overlay — not supported for radial projection (pie/donut) */}
        {(brush || onBrushProp) && projection !== "radial" && (
          <OrdinalBrushOverlay
            width={adjustedWidth}
            height={adjustedHeight}
            totalWidth={size[0]}
            totalHeight={size[1]}
            margin={margin}
            scales={currentScales}
            onBrush={onBrushProp || (() => {})}
          />
        )}

        {/* Donut center content */}
        {centerContent && projection === "radial" && (
          <div
            style={{
              position: "absolute",
              left: margin.left + adjustedWidth / 2,
              top: margin.top + adjustedHeight / 2,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              textAlign: "center"
            }}
          >
            {centerContent}
          </div>
        )}

        {staleness?.showBadge && (
          <div
            className="stream-staleness-badge"
            style={{
              position: "absolute",
              ...(staleness.badgePosition === "top-left" ? { top: 4, left: 4 } :
                staleness.badgePosition === "bottom-left" ? { bottom: 4, left: 4 } :
                staleness.badgePosition === "bottom-right" ? { bottom: 4, right: 4 } :
                { top: 4, right: 4 }),
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              pointerEvents: "none",
              background: isStale ? "#dc3545" : "#28a745",
              color: "white"
            }}
          >
            {isStale ? "STALE" : "LIVE"}
          </div>
        )}
        <FocusRing
          active={kbFocusIndexRef.current >= 0}
          hoverPoint={hoverPoint}
          margin={margin}
          size={size}
          shape={focusedNavPointRef.current?.shape as any}
          width={focusedNavPointRef.current?.w}
          height={focusedNavPointRef.current?.h}
        />
        {tooltipElement}
        </div>{/* end role="img" */}
      </div>
    )
  }
)

StreamOrdinalFrame.displayName = "StreamOrdinalFrame"
export default StreamOrdinalFrame
