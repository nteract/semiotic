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
import { scaleLinear } from "d3-scale"

import { RingBuffer } from "./RingBuffer"
import { IncrementalExtent } from "./IncrementalExtent"
import { lineRenderer } from "./renderers/lineRenderer"
import { swarmRenderer } from "./renderers/swarmRenderer"
import { candlestickRenderer } from "./renderers/candlestickRenderer"
import { waterfallRenderer } from "./renderers/waterfallRenderer"
import { barRenderer } from "./renderers/barRenderer"
import { computeBinExtent } from "./BinAccumulator"
import type { RendererFn } from "./renderers/types"
import type {
  RealtimeFrameProps,
  RealtimeFrameHandle,
  ArrowOfTime,
  LineStyle,
  HoverData,
  HoverAnnotationConfig
} from "./types"

const RENDERERS: Record<string, RendererFn> = {
  line: lineRenderer,
  swarm: swarmRenderer,
  candlestick: candlestickRenderer,
  waterfall: waterfallRenderer,
  bar: barRenderer
}

const DEFAULT_MARGIN = { top: 20, right: 20, bottom: 30, left: 40 }
const DEFAULT_LINE_STYLE: LineStyle = {}

function resolveAccessor(
  accessor: string | ((d: any) => number) | undefined,
  fallback: string
): (d: any) => number {
  if (typeof accessor === "function") return accessor
  const key = accessor || fallback
  return (d: any) => d[key]
}

function getTimeAxis(arrowOfTime: ArrowOfTime): "x" | "y" {
  return arrowOfTime === "up" || arrowOfTime === "down" ? "y" : "x"
}

function buildScales(
  arrowOfTime: ArrowOfTime,
  timeExtent: [number, number],
  valueExtent: [number, number],
  width: number,
  height: number
) {
  const timeAxis = getTimeAxis(arrowOfTime)

  let timeRange: [number, number]
  let valueRange: [number, number]

  if (timeAxis === "x") {
    timeRange = arrowOfTime === "right" ? [0, width] : [width, 0]
    valueRange = [height, 0]
  } else {
    timeRange = arrowOfTime === "down" ? [0, height] : [height, 0]
    valueRange = [0, width]
  }

  return {
    time: scaleLinear().domain(timeExtent).range(timeRange),
    value: scaleLinear().domain(valueExtent).range(valueRange)
  }
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  arrowOfTime: ArrowOfTime,
  timeScale: any,
  valueScale: any,
  width: number,
  height: number
) {
  const timeAxis = getTimeAxis(arrowOfTime)

  ctx.strokeStyle = "#ccc"
  ctx.lineWidth = 1
  ctx.fillStyle = "#666"
  ctx.font = "10px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "top"

  if (timeAxis === "x") {
    ctx.beginPath()
    ctx.moveTo(0, height)
    ctx.lineTo(width, height)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, height)
    ctx.stroke()

    const timeTicks = timeScale.ticks(5)
    for (const tick of timeTicks) {
      const x = timeScale(tick)
      ctx.beginPath()
      ctx.moveTo(x, height)
      ctx.lineTo(x, height + 5)
      ctx.stroke()
    }

    ctx.textAlign = "right"
    ctx.textBaseline = "middle"
    const valueTicks = valueScale.ticks(5)
    for (const tick of valueTicks) {
      const y = valueScale(tick)
      ctx.beginPath()
      ctx.moveTo(-5, y)
      ctx.lineTo(0, y)
      ctx.stroke()
      ctx.fillText(String(Math.round(tick * 100) / 100), -8, y)
    }
  } else {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, height)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, timeAxis === "y" && arrowOfTime === "down" ? 0 : height)
    ctx.lineTo(width, timeAxis === "y" && arrowOfTime === "down" ? 0 : height)
    ctx.stroke()

    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    const valueTicks = valueScale.ticks(5)
    for (const tick of valueTicks) {
      const x = valueScale(tick)
      ctx.beginPath()
      ctx.moveTo(x, height)
      ctx.lineTo(x, height + 5)
      ctx.stroke()
    }

    ctx.textAlign = "right"
    ctx.textBaseline = "middle"
    const timeTicks = timeScale.ticks(5)
    for (const tick of timeTicks) {
      const y = timeScale(tick)
      ctx.beginPath()
      ctx.moveTo(-5, y)
      ctx.lineTo(0, y)
      ctx.stroke()
    }
  }
}

// Binary search: find the index of the nearest point by time value
function findNearestIndex(
  buf: RingBuffer<Record<string, any>>,
  targetTime: number,
  getTime: (d: any) => number
): number {
  if (buf.size === 0) return -1

  let lo = 0
  let hi = buf.size - 1

  while (lo < hi) {
    const mid = (lo + hi) >> 1
    const t = getTime(buf.get(mid)!)
    if (t < targetTime) lo = mid + 1
    else hi = mid
  }

  // lo is first point with time >= targetTime; check if lo-1 is closer
  if (lo > 0) {
    const tLo = getTime(buf.get(lo)!)
    const tPrev = getTime(buf.get(lo - 1)!)
    if (Math.abs(tPrev - targetTime) <= Math.abs(tLo - targetTime)) {
      return lo - 1
    }
  }

  return lo
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  hover: HoverData,
  width: number,
  height: number,
  config: HoverAnnotationConfig,
  pointColor: string
) {
  const showCrosshair = config.crosshair !== false
  if (!showCrosshair) return

  ctx.save()
  const crossStyle = typeof config.crosshair === "object" ? config.crosshair : {}
  ctx.strokeStyle = crossStyle.stroke || "rgba(0, 0, 0, 0.25)"
  ctx.lineWidth = crossStyle.strokeWidth || 1
  if (crossStyle.strokeDasharray) {
    ctx.setLineDash(crossStyle.strokeDasharray.split(/[\s,]+/).map(Number))
  } else {
    ctx.setLineDash([4, 4])
  }

  // Vertical guide
  ctx.beginPath()
  ctx.moveTo(hover.x, 0)
  ctx.lineTo(hover.x, height)
  ctx.stroke()

  // Horizontal guide
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
  ctx.strokeStyle = "white"
  ctx.lineWidth = 2
  ctx.stroke()
}

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

const RealtimeFrame = forwardRef<RealtimeFrameHandle, RealtimeFrameProps>(
  function RealtimeFrame(props, ref) {
    const {
      chartType = "line",
      arrowOfTime = "right",
      windowMode = "sliding",
      windowSize = 200,
      data,
      timeAccessor,
      valueAccessor,
      timeExtent: fixedTimeExtent,
      valueExtent: fixedValueExtent,
      extentPadding = 0.1,
      size = [500, 300],
      margin: marginProp,
      className,
      lineStyle = DEFAULT_LINE_STYLE,
      annotations,
      svgAnnotationRules,
      hoverAnnotation,
      tooltipContent,
      customHoverBehavior,
      showAxes = true,
      background,
      categoryAccessor,
      binSize,
      barColors,
      barStyle
    } = props

    const margin = { ...DEFAULT_MARGIN, ...marginProp }
    const adjustedWidth = size[0] - margin.left - margin.right
    const adjustedHeight = size[1] - margin.top - margin.bottom

    // Memoize accessors so they don't change every render.
    // Without this, the data effect re-runs on every render
    // (new function reference), which triggers cascading re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const getTime = useMemo(() => resolveAccessor(timeAccessor, "time"), [timeAccessor])
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const getValue = useMemo(() => resolveAccessor(valueAccessor, "value"), [valueAccessor])

    const getCategory = useMemo(
      () => categoryAccessor
        ? (typeof categoryAccessor === "function" ? categoryAccessor : (d: any) => d[categoryAccessor])
        : undefined,
      [categoryAccessor]
    )

    const bufferRef = useRef<RingBuffer<Record<string, any>>>(
      new RingBuffer(windowSize)
    )
    const timeExtentRef = useRef(new IncrementalExtent())
    const valueExtentRef = useRef(new IncrementalExtent())
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rafRef = useRef(0)
    const dirtyRef = useRef(false)
    const scalesRef = useRef<ReturnType<typeof buildScales> | null>(null)
    const [annotationFrame, setAnnotationFrame] = useState(0)

    const growingCapRef = useRef(windowSize)

    // Hover state: ref for canvas (sync), React state for tooltip (async)
    const hoverRef = useRef<HoverData | null>(null)
    const [hoverPoint, setHoverPoint] = useState<HoverData | null>(null)

    // Store the render function in a ref so scheduleRender is stable
    // and never goes stale. The ref is updated every React render
    // (below the hooks) so it always captures fresh props/closures.
    const renderFnRef = useRef<() => void>(() => {})

    // Stable scheduleRender — never recreated, so no stale closure chain
    const scheduleRender = useCallback(() => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => renderFnRef.current())
    }, [])

    const pushPoint = useCallback(
      (point: Record<string, any>) => {
        const buf = bufferRef.current
        const t = getTime(point)
        const v = getValue(point)

        if (windowMode === "growing" && buf.full) {
          growingCapRef.current *= 2
          buf.resize(growingCapRef.current)
        }

        const evicted = buf.push(point)

        timeExtentRef.current.push(t)
        valueExtentRef.current.push(v)

        if (evicted != null) {
          timeExtentRef.current.evict(getTime(evicted))
          valueExtentRef.current.evict(getValue(evicted))
        }

        dirtyRef.current = true
        scheduleRender()
      },
      [windowMode, getTime, getValue, scheduleRender]
    )

    const pushManyPoints = useCallback(
      (points: Record<string, any>[]) => {
        for (const p of points) {
          pushPoint(p)
        }
      },
      [pushPoint]
    )

    const clearAll = useCallback(() => {
      bufferRef.current.clear()
      timeExtentRef.current.clear()
      valueExtentRef.current.clear()
      dirtyRef.current = true
      scheduleRender()
    }, [scheduleRender])

    useImperativeHandle(
      ref,
      () => ({
        push: pushPoint,
        pushMany: pushManyPoints,
        clear: clearAll,
        getData: () => bufferRef.current.toArray()
      }),
      [pushPoint, pushManyPoints, clearAll]
    )

    // Controlled data prop
    useEffect(() => {
      if (!data) return
      bufferRef.current.clear()
      timeExtentRef.current.clear()
      valueExtentRef.current.clear()
      for (const d of data) {
        bufferRef.current.push(d)
        timeExtentRef.current.push(getTime(d))
        valueExtentRef.current.push(getValue(d))
      }
      dirtyRef.current = true
      scheduleRender()
    }, [data, getTime, getValue, scheduleRender])

    // Hover mouse handler — stored in ref so it always captures fresh closures
    const hoverHandlerRef = useRef<(e: React.MouseEvent) => void>(() => {})
    const hoverLeaveRef = useRef<() => void>(() => {})

    hoverHandlerRef.current = (e: React.MouseEvent) => {
      if (!hoverAnnotation) return

      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()

      // Mouse position in chart coordinates (canvas is full-size, ctx translated by margin)
      const chartX = e.clientX - rect.left - margin.left
      const chartY = e.clientY - rect.top - margin.top

      // Outside chart area → clear hover
      if (chartX < 0 || chartX > adjustedWidth || chartY < 0 || chartY > adjustedHeight) {
        if (hoverRef.current) {
          hoverRef.current = null
          setHoverPoint(null)
          if (customHoverBehavior) customHoverBehavior(null)
          scheduleRender()
        }
        return
      }

      const scales = scalesRef.current
      if (!scales) return

      const buf = bufferRef.current
      if (buf.size === 0) return

      const timeAxis = getTimeAxis(arrowOfTime)
      const timePixel = timeAxis === "x" ? chartX : chartY
      const targetTime = scales.time.invert(timePixel)

      const idx = findNearestIndex(buf, targetTime, getTime)
      if (idx < 0) return

      const d = buf.get(idx)!
      const t = getTime(d)
      const v = getValue(d)

      const tPixel = scales.time(t)
      const vPixel = scales.value(v)
      const x = timeAxis === "x" ? tPixel : vPixel
      const y = timeAxis === "x" ? vPixel : tPixel

      const hover: HoverData = { data: d, time: t, value: v, x, y }
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

    // Stable event handlers that delegate to refs
    const onMouseMove = useCallback(
      (e: React.MouseEvent) => hoverHandlerRef.current(e),
      []
    )
    const onMouseLeave = useCallback(
      () => hoverLeaveRef.current(),
      []
    )

    // Update the render function ref on every React render.
    // This captures the latest props (arrowOfTime, chartType, lineStyle,
    // annotations, etc.) without needing useCallback dependency chains.
    // The rAF loop calls this via renderFnRef, so it always sees fresh values.
    renderFnRef.current = () => {
      rafRef.current = 0
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const buf = bufferRef.current
      const tExtent = timeExtentRef.current
      const vExtent = valueExtentRef.current

      if (tExtent.dirty) {
        tExtent.recalculate(buf, getTime)
      }
      if (vExtent.dirty) {
        vExtent.recalculate(buf, getValue)
      }

      let tDomain = fixedTimeExtent || tExtent.extent
      let vDomain = fixedValueExtent || vExtent.extent

      if (chartType === "bar" && binSize && !fixedValueExtent && buf.size > 0) {
        const [, maxTotal] = computeBinExtent(buf, getTime, getValue, binSize, getCategory)
        vDomain = [0, maxTotal + maxTotal * extentPadding]
      } else if (!fixedValueExtent && vDomain[0] !== Infinity) {
        const range = vDomain[1] - vDomain[0]
        const pad = range > 0 ? range * extentPadding : 1
        vDomain = [vDomain[0] - pad, vDomain[1] + pad]
      }

      if (tDomain[0] === Infinity || tDomain[1] === -Infinity) {
        tDomain = [0, 1]
      }
      if (vDomain[0] === Infinity || vDomain[1] === -Infinity) {
        vDomain = [0, 1]
      }

      const scales = buildScales(
        arrowOfTime,
        tDomain,
        vDomain,
        adjustedWidth,
        adjustedHeight
      )
      scalesRef.current = scales

      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
      canvas.width = size[0] * dpr
      canvas.height = size[1] * dpr
      canvas.style.width = `${size[0]}px`
      canvas.style.height = `${size[1]}px`
      ctx.scale(dpr, dpr)
      ctx.translate(margin.left, margin.top)

      ctx.clearRect(-margin.left, -margin.top, size[0], size[1])

      if (background) {
        ctx.fillStyle = background
        ctx.fillRect(0, 0, adjustedWidth, adjustedHeight)
      }

      if (showAxes) {
        ctx.save()
        drawAxes(ctx, arrowOfTime, scales.time, scales.value, adjustedWidth, adjustedHeight)
        ctx.restore()
      }

      const renderer = RENDERERS[chartType]
      if (renderer) {
        const layout = {
          width: adjustedWidth,
          height: adjustedHeight,
          timeAxis: getTimeAxis(arrowOfTime)
        }
        renderer(
          ctx, buf, scales, layout, lineStyle,
          { time: getTime, value: getValue, category: getCategory },
          annotations,
          chartType === "bar" ? { binSize, barColors, barStyle } : undefined
        )
      }

      // Draw crosshair after chart data so it renders on top
      if (hoverAnnotation && hoverRef.current) {
        const config: HoverAnnotationConfig =
          typeof hoverAnnotation === "object" ? hoverAnnotation : {}
        drawCrosshair(
          ctx,
          hoverRef.current,
          adjustedWidth,
          adjustedHeight,
          config,
          lineStyle.stroke || "#007bff"
        )
      }

      const wasDirty = dirtyRef.current
      dirtyRef.current = false

      // Trigger React re-render so SVG annotations recompute positions
      // using the scales we just stored in scalesRef.
      // Only do this when data actually changed (wasDirty) to avoid
      // setAnnotationFrame → re-render → effect → scheduleRender → loop.
      if (wasDirty && annotations && annotations.length > 0 && svgAnnotationRules) {
        setAnnotationFrame(f => f + 1)
      }
    }

    // Initial render and cleanup
    useEffect(() => {
      scheduleRender()
      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
      }
    }, [scheduleRender])

    // Re-render canvas when visual props change
    useEffect(() => {
      dirtyRef.current = true
      scheduleRender()
    }, [arrowOfTime, chartType, adjustedWidth, adjustedHeight, showAxes, background, lineStyle, scheduleRender])

    // Compute annotation elements during React render using latest scales
    const renderedAnnotations = React.useMemo(() => {
      if (!annotations || annotations.length === 0 || !svgAnnotationRules) {
        return null
      }
      const scales = scalesRef.current
      const timeAxis = getTimeAxis(arrowOfTime)
      return annotations
        .map((annotation, i) =>
          svgAnnotationRules(annotation, i, {
            scales,
            timeAxis,
            width: adjustedWidth,
            height: adjustedHeight
          })
        )
        .filter(Boolean)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [annotations, svgAnnotationRules, arrowOfTime, adjustedWidth, adjustedHeight, annotationFrame])

    const hasAnnotations = renderedAnnotations && renderedAnnotations.length > 0

    // Tooltip positioning: anchor at the hovered point, flip if near edges
    const tooltipElement = hoverAnnotation && hoverPoint ? (
      <div
        className="realtime-frame-tooltip"
        style={{
          position: "absolute",
          left: margin.left + hoverPoint.x,
          top: margin.top + hoverPoint.y,
          transform: `translate(${
            hoverPoint.x > adjustedWidth * 0.7 ? "calc(-100% - 12px)" : "12px"
          }, ${
            hoverPoint.y < adjustedHeight * 0.3 ? "4px" : "calc(-100% - 4px)"
          })`,
          pointerEvents: "none",
          zIndex: 1
        }}
      >
        {tooltipContent
          ? tooltipContent(hoverPoint)
          : <DefaultTooltip hover={hoverPoint} />}
      </div>
    ) : null

    return (
      <div
        className={`realtime-frame${className ? ` ${className}` : ""}`}
        style={{
          position: "relative",
          width: size[0],
          height: size[1]
        }}
        onMouseMove={hoverAnnotation ? onMouseMove : undefined}
        onMouseLeave={hoverAnnotation ? onMouseLeave : undefined}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0
          }}
        />
        {hasAnnotations && (
          <svg
            width={size[0]}
            height={size[1]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              pointerEvents: "none"
            }}
          >
            <g transform={`translate(${margin.left},${margin.top})`}>
              {renderedAnnotations}
            </g>
          </svg>
        )}
        {tooltipElement}
      </div>
    )
  }
)

export default RealtimeFrame
