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
  StreamXYFrameProps,
  StreamXYFrameHandle,
  StreamChartType,
  HoverData,
  HoverAnnotationConfig,
  SceneNode,
  StreamScales
} from "./types"
import { brush as d3Brush, brushX as d3BrushX, brushY as d3BrushY } from "d3-brush"
import { select as d3Select } from "d3-selection"
import { DataSourceAdapter } from "./DataSourceAdapter"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import { findNearestNode, type HitResult } from "./CanvasHitTester"
import { SVGOverlay } from "./SVGOverlay"

// Canvas renderers
import { lineCanvasRenderer } from "./renderers/lineCanvasRenderer"
import { areaCanvasRenderer } from "./renderers/areaCanvasRenderer"
import { pointCanvasRenderer } from "./renderers/pointCanvasRenderer"
import { barCanvasRenderer } from "./renderers/barCanvasRenderer"
import { swarmCanvasRenderer } from "./renderers/swarmCanvasRenderer"
import { waterfallCanvasRenderer } from "./renderers/waterfallCanvasRenderer"
import { heatmapCanvasRenderer } from "./renderers/heatmapCanvasRenderer"
import { candlestickCanvasRenderer } from "./renderers/candlestickCanvasRenderer"
import type { StreamRendererFn } from "./renderers/types"

// ── Renderer dispatch ──────────────────────────────────────────────────

const RENDERERS: Record<StreamChartType, StreamRendererFn[]> = {
  line: [areaCanvasRenderer, lineCanvasRenderer],
  area: [areaCanvasRenderer],
  stackedarea: [areaCanvasRenderer],
  scatter: [pointCanvasRenderer],
  bubble: [pointCanvasRenderer],
  heatmap: [heatmapCanvasRenderer],
  bar: [barCanvasRenderer],
  swarm: [swarmCanvasRenderer],
  waterfall: [waterfallCanvasRenderer],
  candlestick: [candlestickCanvasRenderer]
}

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_MARGIN = { top: 20, right: 20, bottom: 30, left: 40 }

// ── Theme  ─────────────────────────────────────────

interface ThemeColors {
  axisStroke: string
  tickText: string
  crosshair: string
  hoverFill: string
  hoverStroke: string
  pointRing: string
}

const LIGHT_THEME: ThemeColors = {
  axisStroke: "#ccc",
  tickText: "#666",
  crosshair: "rgba(0, 0, 0, 0.25)",
  hoverFill: "rgba(255, 255, 255, 0.3)",
  hoverStroke: "rgba(0, 0, 0, 0.4)",
  pointRing: "white"
}

function resolveThemeColors(el: HTMLElement | null): ThemeColors {
  if (!el) return LIGHT_THEME
  const style = getComputedStyle(el)
  const textSecondary = style.getPropertyValue("--text-secondary").trim()
  const textPrimary = style.getPropertyValue("--text-primary").trim()
  const surface3 = style.getPropertyValue("--surface-3").trim()
  const surface0 = style.getPropertyValue("--surface-0").trim()

  if (!textSecondary && !textPrimary) return LIGHT_THEME

  return {
    axisStroke: surface3 || LIGHT_THEME.axisStroke,
    tickText: textSecondary || LIGHT_THEME.tickText,
    crosshair: textSecondary ? `${textSecondary}66` : LIGHT_THEME.crosshair,
    hoverFill: surface0 ? `${surface0}4D` : LIGHT_THEME.hoverFill,
    hoverStroke: textSecondary ? `${textSecondary}99` : LIGHT_THEME.hoverStroke,
    pointRing: surface0 || LIGHT_THEME.pointRing
  }
}

// ── Tooltip ────────────────────────────────────────────────────────────

const defaultTooltipStyle: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.85)",
  color: "white",
  padding: "6px 10px",
  borderRadius: 4,
  fontSize: 12,
  lineHeight: 1.5,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  pointerEvents: "none",
  whiteSpace: "nowrap"
}

function DefaultTooltip({ hover }: { hover: HoverData }) {
  const fmtValue = (v: number) =>
    Number.isInteger(v) ? String(v) : v.toFixed(2)

  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>
        {fmtValue(hover.value)}
      </div>
      <div style={{ opacity: 0.7, fontSize: 11 }}>
        {fmtValue(hover.time)}
      </div>
    </div>
  )
}

// ── Crosshair drawing ──────────────────────────────────────────────────

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  hover: HoverData,
  width: number,
  height: number,
  config: HoverAnnotationConfig,
  pointColor: string,
  theme: ThemeColors
) {
  const showCrosshair = config.crosshair !== false
  if (!showCrosshair) return

  ctx.save()
  const crossStyle = typeof config.crosshair === "object" ? config.crosshair : {}
  ctx.strokeStyle = crossStyle.stroke || theme.crosshair
  ctx.lineWidth = crossStyle.strokeWidth || 1
  if (crossStyle.strokeDasharray) {
    ctx.setLineDash(crossStyle.strokeDasharray.split(/[\s,]+/).map(Number))
  } else {
    ctx.setLineDash([4, 4])
  }

  ctx.beginPath()
  ctx.moveTo(hover.x, 0)
  ctx.lineTo(hover.x, height)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, hover.y)
  ctx.lineTo(width, hover.y)
  ctx.stroke()

  ctx.restore()

  // Point indicator
  ctx.beginPath()
  ctx.arc(hover.x, hover.y, 4, 0, Math.PI * 2)
  ctx.fillStyle = pointColor
  ctx.fill()
  ctx.strokeStyle = theme.pointRing
  ctx.lineWidth = 2
  ctx.stroke()
}

// ── Brush Overlay ─────────────────────────────────────────────────────

interface BrushOverlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  dimension: "x" | "y" | "xy"
  scales: StreamScales | null
  onBrush: (extent: { x: [number, number]; y: [number, number] } | null) => void
}

function BrushOverlay({
  width,
  height,
  totalWidth,
  totalHeight,
  margin,
  dimension,
  scales,
  onBrush
}: BrushOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const brushRef = useRef<any>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const g = d3Select(svgRef.current).select<SVGGElement>(".brush-g")

    const brushFn =
      dimension === "x"
        ? d3BrushX()
        : dimension === "y"
          ? d3BrushY()
          : d3Brush()

    brushFn.extent([[0, 0], [width, height]])

    brushFn.on("brush end", (event: any) => {
      if (!scales) return

      if (!event.selection) {
        onBrush(null)
        return
      }

      let xRange: [number, number]
      let yRange: [number, number]

      if (dimension === "x") {
        const [px0, px1] = event.selection as [number, number]
        xRange = [scales.x.invert(px0), scales.x.invert(px1)]
        yRange = [scales.y.invert(height), scales.y.invert(0)]
      } else if (dimension === "y") {
        const [py0, py1] = event.selection as [number, number]
        xRange = [scales.x.invert(0), scales.x.invert(width)]
        yRange = [scales.y.invert(py1), scales.y.invert(py0)]
      } else {
        const [[px0, py0], [px1, py1]] = event.selection as [[number, number], [number, number]]
        xRange = [scales.x.invert(px0), scales.x.invert(px1)]
        yRange = [scales.y.invert(py1), scales.y.invert(py0)]
      }

      onBrush({ x: xRange, y: yRange })
    })

    g.call(brushFn as any)
    brushRef.current = brushFn

    // Style the brush selection rectangle
    g.select(".selection")
      .attr("fill", "steelblue")
      .attr("fill-opacity", 0.15)
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1)

    return () => {
      brushFn.on("brush end", null)
      brushRef.current = null
    }
  }, [width, height, dimension, scales, onBrush])

  return (
    <svg
      ref={svgRef}
      width={totalWidth}
      height={totalHeight}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        // Allow pointer events only on the brush overlay itself
        pointerEvents: "all"
      }}
    >
      <g className="brush-g" transform={`translate(${margin.left},${margin.top})`} />
    </svg>
  )
}

// ── StreamXYFrame ──────────────────────────────────────────────────────

const StreamXYFrame = forwardRef<StreamXYFrameHandle, StreamXYFrameProps>(
  function StreamXYFrame(props, ref) {
    const {
      chartType,
      runtimeMode,
      data,
      xAccessor,
      yAccessor,
      colorAccessor,
      sizeAccessor,
      groupAccessor,
      lineDataAccessor,
      curve,
      normalize,
      binSize,
      valueAccessor,
      arrowOfTime = "right",
      windowMode = "sliding",
      windowSize = 200,
      timeAccessor,
      xExtent,
      yExtent,
      extentPadding = 0.1,
      sizeRange,
      size = [500, 300],
      margin: marginProp,
      className,
      background,
      lineStyle,
      pointStyle,
      areaStyle,
      barStyle,
      waterfallStyle,
      swarmStyle,
      barColors,
      colorScheme,
      boundsAccessor,
      boundsStyle,
      openAccessor,
      highAccessor,
      lowAccessor,
      closeAccessor,
      candlestickStyle,
      showAxes = true,
      xLabel,
      yLabel,
      xFormat,
      yFormat,
      tickFormatTime,
      tickFormatValue,
      hoverAnnotation,
      tooltipContent,
      customHoverBehavior,
      enableHover,
      annotations,
      svgAnnotationRules,
      showGrid,
      legend,
      backgroundGraphics,
      foregroundGraphics,
      title,
      categoryAccessor,
      brush,
      onBrush
    } = props

    const margin = { ...DEFAULT_MARGIN, ...marginProp }
    const adjustedWidth = size[0] - margin.left - margin.right
    const adjustedHeight = size[1] - margin.top - margin.bottom

    // Determine effective hover annotation config
    const effectiveHoverAnnotation = hoverAnnotation ?? enableHover

    // ── Refs ─────────────────────────────────────────────────────────────

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rafRef = useRef(0)
    const dirtyRef = useRef(false)
    const [annotationFrame, setAnnotationFrame] = useState(0)

    // Scales state: updated after each scene computation so SVGOverlay re-renders
    const [currentScales, setCurrentScales] = useState<StreamScales | null>(null)

    // Hover state: ref for canvas (sync), React state for tooltip (async)
    const hoverRef = useRef<HoverData | null>(null)
    const [hoverPoint, setHoverPoint] = useState<HoverData | null>(null)

    // Render function ref (always-fresh closure)
    const renderFnRef = useRef<() => void>(() => {})

    // ── Pipeline ─────────────────────────────────────────────────────────

    const isStreaming = runtimeMode === "streaming" || ["bar", "swarm", "waterfall"].includes(chartType)

    const pipelineConfig = useMemo((): PipelineConfig => ({
      chartType,
      runtimeMode: isStreaming ? "streaming" : "bounded",
      windowSize,
      windowMode,
      arrowOfTime: isStreaming ? arrowOfTime : "right",
      extentPadding,
      xAccessor: isStreaming ? undefined : xAccessor,
      yAccessor: isStreaming ? undefined : yAccessor,
      timeAccessor: isStreaming ? timeAccessor : undefined,
      valueAccessor,
      colorAccessor,
      sizeAccessor,
      groupAccessor,
      categoryAccessor,
      lineDataAccessor,
      xExtent,
      yExtent,
      sizeRange,
      binSize,
      normalize,
      boundsAccessor,
      boundsStyle,
      openAccessor,
      highAccessor,
      lowAccessor,
      closeAccessor,
      candlestickStyle,
      lineStyle,
      pointStyle,
      areaStyle,
      colorScheme,
      barColors,
      annotations
    }), [
      chartType, windowSize, windowMode, arrowOfTime, extentPadding,
      xAccessor, yAccessor, timeAccessor, valueAccessor,
      colorAccessor, sizeAccessor, groupAccessor, categoryAccessor,
      lineDataAccessor, xExtent, yExtent, sizeRange, binSize, normalize,
      boundsAccessor, boundsStyle,
      openAccessor, highAccessor, lowAccessor, closeAccessor, candlestickStyle,
      lineStyle, pointStyle, areaStyle, colorScheme, barColors, annotations, isStreaming
    ])

    const storeRef = useRef<PipelineStore | null>(null)
    if (!storeRef.current) {
      storeRef.current = new PipelineStore(pipelineConfig)
    }

    // ── Stable scheduleRender ────────────────────────────────────────────

    const scheduleRender = useCallback(() => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => renderFnRef.current())
    }, [])

    // Update config when it changes — also schedule re-render since style
    // callbacks (pointStyle, areaStyle, etc.) may have changed.
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

    // ── Push API (ref handle) ────────────────────────────────────────────

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
      getScales: () => storeRef.current?.scales ?? null,
      getExtents: () => storeRef.current?.getExtents() ?? null
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

      // Hit test against scene graph
      const hit = findNearestNode(store.scene, chartX, chartY)
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

      // Compute scene graph (scales + scene nodes)
      store.computeScene({ width: adjustedWidth, height: adjustedHeight })

      // DPR setup
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
      canvas.width = size[0] * dpr
      canvas.height = size[1] * dpr
      canvas.style.width = `${size[0]}px`
      canvas.style.height = `${size[1]}px`
      ctx.scale(dpr, dpr)
      ctx.translate(margin.left, margin.top)
      ctx.clearRect(-margin.left, -margin.top, size[0], size[1])

      const theme = resolveThemeColors(canvas)

      // Background
      if (background) {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, adjustedWidth, adjustedHeight)
      }

      // Render data marks via canvas renderers
      const renderers = RENDERERS[chartType]
      if (renderers && store.scales) {
        for (const renderer of renderers) {
          renderer(
            ctx,
            store.scene,
            store.scales,
            { width: adjustedWidth, height: adjustedHeight }
          )
        }
      }

      // Draw crosshair on hover
      if (effectiveHoverAnnotation && hoverRef.current && store.scales) {
        const config: HoverAnnotationConfig =
          typeof effectiveHoverAnnotation === "object" ? effectiveHoverAnnotation : {}
        drawCrosshair(
          ctx,
          hoverRef.current,
          adjustedWidth,
          adjustedHeight,
          config,
          "#007bff",
          theme
        )
      }

      const wasDirty = dirtyRef.current
      dirtyRef.current = false

      // Push scales into React state so SVGOverlay renders axes/grid
      if (wasDirty && store.scales) {
        setCurrentScales(store.scales)
      }

      // Trigger React re-render for SVG annotations
      if (wasDirty && annotations && annotations.length > 0 && svgAnnotationRules) {
        setAnnotationFrame(f => f + 1)
      }
    }

    // ── Lifecycle ────────────────────────────────────────────────────────

    useEffect(() => {
      scheduleRender()
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }, [scheduleRender])

    // Re-render when visual props change
    useEffect(() => {
      dirtyRef.current = true
      scheduleRender()
    }, [chartType, adjustedWidth, adjustedHeight, showAxes, background, lineStyle, scheduleRender])

    // ── Tooltip positioning ──────────────────────────────────────────────

    const tooltipRendered = effectiveHoverAnnotation && hoverPoint
      ? (tooltipContent ? tooltipContent(hoverPoint) : <DefaultTooltip hover={hoverPoint} />)
      : null

    const tooltipElement = tooltipRendered ? (
      <div
        className="stream-frame-tooltip"
        style={{
          position: "absolute",
          left: margin.left + hoverPoint!.x,
          top: margin.top + hoverPoint!.y,
          transform: `translate(${
            hoverPoint!.x > adjustedWidth * 0.7 ? "calc(-100% - 12px)" : "12px"
          }, ${
            hoverPoint!.y < adjustedHeight * 0.3 ? "4px" : "calc(-100% - 4px)"
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
        className={`stream-xy-frame${className ? ` ${className}` : ""}`}
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
              left: 0,
              top: 0,
              width: size[0],
              height: size[1],
              pointerEvents: "none"
            }}
          >
            {backgroundGraphics}
          </svg>
        )}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0
          }}
        />
        <SVGOverlay
          width={adjustedWidth}
          height={adjustedHeight}
          totalWidth={size[0]}
          totalHeight={size[1]}
          margin={margin}
          scales={currentScales}
          showAxes={showAxes}
          xLabel={xLabel}
          yLabel={yLabel}
          xFormat={xFormat || tickFormatTime}
          yFormat={yFormat || tickFormatValue}
          showGrid={showGrid}
          title={title}
          legend={legend}
          foregroundGraphics={foregroundGraphics}
          annotations={annotations}
          svgAnnotationRules={svgAnnotationRules}
          annotationFrame={annotationFrame}
        />
        {(brush || onBrush) && (
          <BrushOverlay
            width={adjustedWidth}
            height={adjustedHeight}
            totalWidth={size[0]}
            totalHeight={size[1]}
            margin={margin}
            dimension={brush?.dimension ?? "xy"}
            scales={currentScales}
            onBrush={onBrush ?? (() => {})}
          />
        )}
        {tooltipElement}
      </div>
    )
  }
)

StreamXYFrame.displayName = "StreamXYFrame"
export default StreamXYFrame
