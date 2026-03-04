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
import { OrdinalSVGOverlay } from "./OrdinalSVGOverlay"

// Canvas renderers
import { barCanvasRenderer } from "./renderers/barCanvasRenderer"
import { pointCanvasRenderer } from "./renderers/pointCanvasRenderer"
import { wedgeCanvasRenderer } from "./renderers/wedgeCanvasRenderer"
import { boxplotCanvasRenderer } from "./renderers/boxplotCanvasRenderer"
import { violinCanvasRenderer } from "./renderers/violinCanvasRenderer"
import { connectorCanvasRenderer } from "./renderers/connectorCanvasRenderer"

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
  timeline: withConnectors([barCanvasRenderer as any])
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

  // For summary types (boxplot, violin), datum is an array of pieces
  if (Array.isArray(d)) {
    const category = d[0]?.category || ""
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

  // For regular pieces — extract category and value from common field names
  const category = d.category || d.name || d.group || d.__rName || ""
  const value = d.value ?? d.__rValue ?? d.pct ?? ""

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
      size = [600, 400],
      margin: userMargin,
      barPadding,
      innerRadius,
      normalize,
      startAngle,
      dynamicColumnWidth,
      bins,
      showOutliers,
      showIQR,
      amplitude,
      connectorAccessor,
      connectorStyle,
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
      oLabel,
      rLabel,
      oFormat,
      rFormat,
      enableHover = true,
      hoverAnnotation,
      tooltipContent,
      customHoverBehavior,
      annotations,
      svgAnnotationRules,
      showGrid = false,
      legend,
      backgroundGraphics,
      foregroundGraphics,
      title,
      className,
      background,
      centerContent,
      decay,
      pulse,
      transition,
      staleness
    } = props

    // ── Layout ───────────────────────────────────────────────────────────

    const margin = useMemo(() => ({ ...DEFAULT_MARGIN, ...userMargin }), [userMargin])
    const adjustedWidth = size[0] - margin.left - margin.right
    const adjustedHeight = size[1] - margin.top - margin.bottom

    // ── Refs ─────────────────────────────────────────────────────────────

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const dirtyRef = useRef(true)
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
      innerRadius,
      normalize,
      startAngle,
      dynamicColumnWidth,
      bins,
      showOutliers,
      showIQR,
      amplitude,
      connectorAccessor,
      connectorStyle,
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
      rExtent, oExtent, barPadding, innerRadius, normalize, startAngle,
      dynamicColumnWidth,
      bins, showOutliers, showIQR, amplitude, connectorAccessor, connectorStyle, oSort,
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
      clear: clearAll,
      getData: () => storeRef.current?.getData() ?? [],
      getScales: () => storeRef.current?.scales ?? null
    }), [pushPoint, pushManyPoints, clearAll])

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

      const hover: HoverData = {
        data: hit.datum,
        time: hit.x,
        value: hit.y,
        x: hit.x,
        y: hit.y
      }

      hoverRef.current = hover
      setHoverPoint(hover)
      if (customHoverBehavior) customHoverBehavior(hover)
      scheduleRender()
    }

    hoverLeaveRef.current = () => {
      if (hoverRef.current) {
        hoverRef.current = null
        setHoverPoint(null)
        if (customHoverBehavior) customHoverBehavior(null)
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
      const isTransitioning = store.advanceTransition(now)

      const wasDirty = dirtyRef.current
      if (wasDirty && !isTransitioning) {
        store.computeScene({ width: adjustedWidth, height: adjustedHeight })
        dirtyRef.current = false
      }

      // DPR setup
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
      canvas.width = size[0] * dpr
      canvas.height = size[1] * dpr
      canvas.style.width = `${size[0]}px`
      canvas.style.height = `${size[1]}px`
      ctx.scale(dpr, dpr)

      // Clear
      ctx.clearRect(0, 0, size[0], size[1])

      // Staleness dimming
      const staleThreshold = staleness?.threshold ?? 5000
      const currentlyStale = staleness && store.lastIngestTime > 0 &&
        (now - store.lastIngestTime) > staleThreshold

      if (currentlyStale) {
        ctx.globalAlpha = staleness?.dimOpacity ?? 0.5
      }

      // Background
      if (background) {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, size[0], size[1])
      }

      const isRadial = projection === "radial"

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
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }, [scheduleRender])

    useEffect(() => {
      dirtyRef.current = true
      scheduleRender()
    }, [chartType, adjustedWidth, adjustedHeight, showAxes, background, scheduleRender])

    // Staleness check timer
    useEffect(() => {
      if (!staleness) return
      const interval = setInterval(() => {
        const store = storeRef.current
        if (!store || store.lastIngestTime === 0) return
        const now = typeof performance !== "undefined" ? performance.now() : Date.now()
        const threshold = staleness.threshold ?? 5000
        const stale = (now - store.lastIngestTime) > threshold
        if (stale !== isStale) {
          setIsStale(stale)
          dirtyRef.current = true
          scheduleRender()
        }
      }, 1000)
      return () => clearInterval(interval)
    }, [staleness, isStale, scheduleRender])

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
      <div
        className="stream-ordinal-tooltip"
        style={{
          position: "absolute",
          left: margin.left + tooltipX,
          top: margin.top + tooltipY,
          transform: `translate(${
            tooltipX > adjustedWidth * 0.7 ? "calc(-100% - 12px)" : "12px"
          }, ${
            tooltipY < adjustedHeight * 0.3 ? "4px" : "calc(-100% - 4px)"
          })`,
          pointerEvents: "none",
          zIndex: 1
        }}
      >
        {tooltipRendered}
      </div>
    ) : null

    // ── Render ───────────────────────────────────────────────────────────

    return (
      <div
        className={`stream-ordinal-frame${className ? ` ${className}` : ""}`}
        style={{
          position: "relative",
          width: size[0],
          height: size[1]
        }}
        onMouseMove={effectiveHoverAnnotation ? onMouseMove : undefined}
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

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size[0],
            height: size[1]
          }}
        />

        <OrdinalSVGOverlay
          width={adjustedWidth}
          height={adjustedHeight}
          totalWidth={size[0]}
          totalHeight={size[1]}
          margin={margin}
          scales={currentScales}
          showAxes={showAxes}
          oLabel={oLabel}
          rLabel={rLabel}
          oFormat={oFormat}
          rFormat={rFormat}
          showGrid={showGrid}
          title={title}
          legend={legend}
          foregroundGraphics={foregroundGraphics}
          annotations={annotations}
          svgAnnotationRules={svgAnnotationRules}
          annotationFrame={annotationFrame}
        />

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
        {tooltipElement}
      </div>
    )
  }
)

StreamOrdinalFrame.displayName = "StreamOrdinalFrame"
export default StreamOrdinalFrame
