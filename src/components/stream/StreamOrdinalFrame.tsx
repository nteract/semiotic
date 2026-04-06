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
  OrdinalSceneNode,
  OrdinalPipelineConfig,
  OrdinalRendererFn,
  OrdinalLayout,
  HoverData,
  HoverAnnotationConfig
} from "./ordinalTypes"
import { DataSourceAdapter } from "./DataSourceAdapter"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { findNearestOrdinalNode } from "./OrdinalCanvasHitTester"
import { extractOrdinalNavPoints, buildNavGraph, resolvePosition, nextGraphIndex, navPointToHover, type NavGraph } from "./keyboardNav"
import { useResponsiveSize } from "./useResponsiveSize"
import { useStalenessCheck } from "./useStalenessCheck"
import { OrdinalSVGOverlay, OrdinalSVGUnderlay } from "./OrdinalSVGOverlay"
import { OrdinalBrushOverlay } from "./OrdinalBrushOverlay"
import { ordinalSceneNodeToSVG, isServerEnvironment } from "./SceneToSVG"
import { AccessibleDataTable, AriaLiveTooltip, ScreenReaderSummary, SkipToTableLink, computeCanvasAriaLabel } from "./AccessibleDataTable"
import { FocusRing } from "./FocusRing"
import { FlippingTooltip } from "../Tooltip/FlippingTooltip"
import { useReducedMotion } from "./useMediaPreferences"
import { useThemeSelector } from "../store/ThemeStore"
import type { SemioticTheme } from "../store/ThemeStore"

// Canvas renderers
import { getDevicePixelRatio } from "./canvasSetup"
import { barCanvasRenderer } from "./renderers/barCanvasRenderer"
import { pointCanvasRenderer } from "./renderers/pointCanvasRenderer"
import { wedgeCanvasRenderer } from "./renderers/wedgeCanvasRenderer"
import { boxplotCanvasRenderer } from "./renderers/boxplotCanvasRenderer"
import { violinCanvasRenderer } from "./renderers/violinCanvasRenderer"
import { connectorCanvasRenderer } from "./renderers/connectorCanvasRenderer"
import { trapezoidCanvasRenderer, funnelLabelRenderer } from "./renderers/trapezoidCanvasRenderer"
import { barFunnelHatchRenderer, barFunnelLabelRenderer } from "./renderers/barFunnelCanvasRenderer"

// ── Renderer dispatch ──────────────────────────────────────────────────

// Connectors are built into the scene graph by the store, so every
// chart type includes the connector renderer to paint them.
const withConnectors = (renderers: OrdinalRendererFn[]): OrdinalRendererFn[] =>
  [connectorCanvasRenderer as any, ...renderers]

const RENDERERS: Record<OrdinalChartType, OrdinalRendererFn[]> = {
  bar: withConnectors([barCanvasRenderer as any]),
  clusterbar: withConnectors([barCanvasRenderer as any]),
  point: withConnectors([pointCanvasRenderer as any]),
  swarm: withConnectors([pointCanvasRenderer as any]),
  pie: [wedgeCanvasRenderer as any],
  donut: [wedgeCanvasRenderer as any],
  boxplot: withConnectors([boxplotCanvasRenderer as any, pointCanvasRenderer as any]),
  violin: withConnectors([violinCanvasRenderer as any]),
  histogram: withConnectors([barCanvasRenderer as any]),
  ridgeline: withConnectors([violinCanvasRenderer as any]),
  timeline: withConnectors([barCanvasRenderer as any]),
  funnel: [barCanvasRenderer as any, trapezoidCanvasRenderer as any, funnelLabelRenderer as any],
  "bar-funnel": [barCanvasRenderer as any, barFunnelHatchRenderer as any, barFunnelLabelRenderer as any],
  swimlane: withConnectors([barCanvasRenderer as any])
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
  const stats = (hover as any).stats
  const hoverCategory = (hover as any).category

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
  const oAccessor = (hover as any).__oAccessor as string | undefined
  const rAccessor = (hover as any).__rAccessor as string | undefined
  const hoverChartType = (hover as any).__chartType as string | undefined

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
      baselinePadding,
      innerRadius,
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
      arrowOfTime,
      windowMode = "sliding",
      windowSize = 200,
      pieceStyle,
      summaryStyle,
      colorScheme,
      barColors,
      showAxes = true,
      showCategoryTicks,
      oLabel,
      rLabel,
      oFormat,
      rFormat,
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
      backgroundGraphics,
      foregroundGraphics,
      title,
      className,
      background,
      centerContent,
      decay,
      pulse,
      transition,
      staleness,
      brush,
      onBrush: onBrushProp,
      accessibleTable = true,
      description,
      summary
    } = props

    // ── Reduced motion ────────────────────────────────────────────────────
    const reducedMotion = useReducedMotion()
    const reducedMotionRef = useRef(reducedMotion)
    reducedMotionRef.current = reducedMotion

    // ── Layout ───────────────────────────────────────────────────────────

    const [responsiveRef, size] = useResponsiveSize(sizeProp, responsiveWidth, responsiveHeight)
    const margin = useMemo(() => ({ ...DEFAULT_MARGIN, ...userMargin }), [userMargin])
    const adjustedWidth = size[0] - margin.left - margin.right
    const adjustedHeight = size[1] - margin.top - margin.bottom

    const resolvedForeground = typeof foregroundGraphics === "function"
      ? (foregroundGraphics as (ctx: { size: number[]; margin: typeof margin }) => React.ReactNode)({ size, margin })
      : foregroundGraphics

    // ── Refs ─────────────────────────────────────────────────────────────

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const dirtyRef = useRef(true)
    // Theme change tracking (effect added after scheduleRender is defined)
    const currentTheme = useThemeSelector((s: { theme: SemioticTheme }) => s.theme)
    const rafRef = useRef<number>(0)
    const hoverRef = useRef<HoverData | null>(null)
    const renderFnRef = useRef<() => void>(() => {})

    // ── State ────────────────────────────────────────────────────────────

    const [hoverPoint, setHoverPoint] = useState<HoverData | null>(null)
    const [currentScales, setCurrentScales] = useState<OrdinalScales | null>(null)
    const [annotationFrame, setAnnotationFrame] = useState(0)
    const [isStale, setIsStale] = useState(false)

    // ── Hover config ─────────────────────────────────────────────────────

    const effectiveHoverAnnotation = enableHover || hoverAnnotation

    // ── Pipeline ─────────────────────────────────────────────────────────

    const isStreaming = runtimeMode === "streaming"

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
      baselinePadding,
      innerRadius,
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
      barColors,
      decay,
      pulse,
      transition,
      staleness
    }), [
      chartType, windowSize, windowMode, extentPadding, projection,
      oAccessor, rAccessor, colorAccessor, stackBy, groupBy, multiAxis,
      timeAccessor, valueAccessor, categoryAccessor,
      rExtent, oExtent, barPadding, baselinePadding, innerRadius, normalize, startAngle, sweepAngle,
      dynamicColumnWidth,
      bins, showOutliers, showIQR, amplitude, connectorOpacity, showLabels, connectorAccessor, connectorStyle, dataIdAccessor, oSort,
      pieceStyle, summaryStyle, colorScheme, barColors,
      decay, pulse, transition, staleness,
      isStreaming
    ])

    const storeRef = useRef<OrdinalPipelineStore | null>(null)
    if (!storeRef.current) {
      storeRef.current = new OrdinalPipelineStore(pipelineConfig)
    }

    // ── Stable scheduleRender ────────────────────────────────────────────

    const scheduleRender = useCallback(() => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => renderFnRef.current())
    }, [])

    // Update config when it changes
    useEffect(() => {
      storeRef.current?.updateConfig(pipelineConfig)
      dirtyRef.current = true
      scheduleRender()
    }, [pipelineConfig, scheduleRender])

    // Repaint canvas when ThemeProvider theme changes
    useEffect(() => {
      dirtyRef.current = true
      scheduleRender()
    }, [currentTheme, scheduleRender])

    // ── DataSourceAdapter ────────────────────────────────────────────────

    const adapterRef = useRef<DataSourceAdapter | null>(null)
    if (!adapterRef.current) {
      adapterRef.current = new DataSourceAdapter((changeset) => {
        const store = storeRef.current
        if (!store) return
        const needsRender = store.ingest(changeset)
        if (needsRender) {
          dirtyRef.current = true
          scheduleRender()
        }
      })
    }

    // ── Push API ─────────────────────────────────────────────────────────

    const pushPoint = useCallback((datum: Record<string, any>) => {
      adapterRef.current?.push(datum)
    }, [])

    const pushManyPoints = useCallback((data: Record<string, any>[]) => {
      adapterRef.current?.pushMany(data)
    }, [])

    const clearAll = useCallback(() => {
      adapterRef.current?.clear()
      storeRef.current?.clear()
      dirtyRef.current = true
      scheduleRender()
    }, [scheduleRender])

    useImperativeHandle(ref, () => ({
      push: pushPoint,
      pushMany: pushManyPoints,
      remove: (id: string | string[]) => {
        adapterRef.current?.flush()
        const removed = storeRef.current?.remove(id) ?? []
        if (removed.length > 0) {
          dirtyRef.current = true
          scheduleRender()
        }
        return removed
      },
      update: (id: string | string[], updater: (d: any) => any) => {
        adapterRef.current?.flush()
        const previous = storeRef.current?.update(id, updater) ?? []
        if (previous.length > 0) {
          dirtyRef.current = true
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
    }), [pushPoint, pushManyPoints, clearAll, scheduleRender])

    // ── Controlled data prop ─────────────────────────────────────────────

    useEffect(() => {
      if (!data) return
      adapterRef.current?.setBoundedData(data)
    }, [data])

    // ── Hover handlers ───────────────────────────────────────────────────

    const hoverHandlerRef = useRef<(e: React.MouseEvent) => void>(() => {})
    const hoverLeaveRef = useRef<() => void>(() => {})

    hoverHandlerRef.current = (e: React.MouseEvent) => {
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

      const hit = findNearestOrdinalNode(store.scene, hitX, hitY)
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
      const hover: HoverData = {
        ...(typeof rawDatum === "object" && rawDatum !== null && !Array.isArray(rawDatum) ? rawDatum : {}),
        data: rawDatum,
        time: hit.x,
        value: hit.y,
        x: hit.x,
        y: hit.y,
        ...(hit.stats && { stats: hit.stats }),
        ...(hit.category && { category: hit.category }),
        __oAccessor: typeof oAccessor === "string" ? oAccessor : undefined,
        __rAccessor: typeof rAccessor === "string" ? rAccessor : undefined,
        __chartType: chartType
      } as any

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

    const onMouseMove = useCallback(
      (e: React.MouseEvent) => hoverHandlerRef.current(e),
      []
    )
    const onMouseLeave = useCallback(
      () => hoverLeaveRef.current(),
      []
    )

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
        const hover = {
          ...navPointToHover(point),
          __oAccessor: typeof oAccessor === "string" ? oAccessor : undefined,
          __rAccessor: typeof rAccessor === "string" ? rAccessor : undefined,
          __chartType: chartType
        } as HoverData
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
      const hover = {
        ...navPointToHover(point),
        __oAccessor: typeof oAccessor === "string" ? oAccessor : undefined,
        __rAccessor: typeof rAccessor === "string" ? rAccessor : undefined,
        __chartType: chartType
      } as HoverData
      hoverRef.current = hover
      setHoverPoint(hover)
      if (customHoverBehavior) customHoverBehavior(hover)
      scheduleRender()
    }, [customHoverBehavior, scheduleRender])

    const onMouseMoveWrapped = useCallback((e: React.MouseEvent) => {
      kbFocusIndexRef.current = -1
      focusedNavPointRef.current = null
      hoverHandlerRef.current(e)
    }, [])

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

      // Background — use explicit prop, or fall back to semiotic theme background
      const semioticBg = canvas
        ? getComputedStyle(canvas).getPropertyValue("--semiotic-bg").trim()
        : ""
      const effectiveBg = background || (semioticBg && semioticBg !== "transparent" ? semioticBg : null)
      if (effectiveBg) {
        ctx.fillStyle = effectiveBg
        ctx.fillRect(0, 0, size[0], size[1])
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

      // Dispatch to renderers
      const renderers = RENDERERS[chartType] || []
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
      if (isTransitioning || store.hasActivePulses) {
        rafRef.current = requestAnimationFrame(() => renderFnRef.current())
      }
    }

    // ── Lifecycle ────────────────────────────────────────────────────────

    useEffect(() => {
      scheduleRender()
      return () => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0 }
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
            {backgroundGraphics && (
              <g transform={`translate(${margin.left},${margin.top})`}>
                {backgroundGraphics}
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
            foregroundGraphics={resolvedForeground}
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

    const tableId = `semiotic-table-${React.useId()}`

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
          onMouseLeave={effectiveHoverAnnotation ? onMouseLeave : undefined}
        >
        {backgroundGraphics && (
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
              {backgroundGraphics}
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
          foregroundGraphics={resolvedForeground}
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
