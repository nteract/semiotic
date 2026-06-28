import * as React from "react"
import { useRef } from "react"
import { polarToXY, xyToAngle, angleScale, ringArcPath, TAU } from "./recipes/radialCoords"
import { wrapValue, shortestArcDelta } from "./recipes/cyclical"

/**
 * `CircularBrush` — an accessible range brush over a **cyclical** domain
 * (day-of-year, hour-of-day, compass bearing, phase). The radial counterpart to
 * the linear `RealtimeHistogram` brush: a selected arc with two draggable
 * handles, wrap-around ranges, pointer-capture drag, and full keyboard control.
 *
 * **Control-surface contract.** This is a *control*, not a chart: it takes
 * `value` + `domain`/`period` + geometry + `onChange`, and never reaches into a
 * chart's internals. Layer it over a chart that shares its coordinate space (an
 * absolutely-positioned overlay, or embed its `<g>` in the chart's SVG) and feed
 * `onChange` into your own state — or into the linked-selection store — so the
 * brush drives a selection without a provider. Geometry in, value out.
 *
 * **Accessibility.** Each handle and the range itself is a `role="slider"` with
 * `aria-valuemin/max/now` (and `aria-valuetext` when `formatValue` is given),
 * reachable by Tab and nudgeable with ←/→ (Shift = `largeStep`). Built on the
 * tested radial (`polarToXY`/`xyToAngle`/`ringArcPath`) + cyclical
 * (`wrapValue`/`shortestArcDelta`) kit, so wrap-around never unwinds the long way.
 */
export interface CircularBrushValue {
  /** Range start, in domain units (e.g. day-of-year). */
  start: number
  /** Range end, in domain units. When `start > end` the range wraps the cycle. */
  end: number
}

export interface CircularBrushProps {
  /** The current selected range. Controlled. */
  value: CircularBrushValue
  /** Called with the next value, or an updater — mirrors `setState`, so you can
   *  pass a `useState` setter directly. */
  onChange: (
    next: CircularBrushValue | ((current: CircularBrushValue) => CircularBrushValue),
  ) => void
  /** Cycle length in domain units. @default 365 (day-of-year) */
  period?: number
  /** Outer radius of the brush ring, px. @default 180 */
  radius?: number
  /** Inner radius of the brush band, px. @default 14 */
  innerRadius?: number
  /** SVG width, px. @default `radius * 2 + 40` */
  width?: number
  /** SVG height, px. @default `radius * 2 + 40` */
  height?: number
  /** Keyboard nudge step (←/→), domain units. @default 1 */
  step?: number
  /** Shift+arrow step, domain units. @default 7 */
  largeStep?: number
  /** Accessible label prefix for the handles + range. @default "Range" */
  label?: string
  /** Format a domain value for `aria-valuetext` (e.g. a date). */
  formatValue?: (value: number) => string
  /** Brush arc fill. @default a translucent primary */
  arcFill?: string
  /** Brush arc + handle stroke. @default white */
  stroke?: string
  className?: string
  /** Inline style for the root `<svg>`. Use it to position the control as an
   *  overlay over a chart sharing its coordinate space — e.g.
   *  `{ position: "absolute", inset: 0, width: "100%", height: "100%" }`. */
  style?: React.CSSProperties
}

export function CircularBrush({
  value,
  onChange,
  period = 365,
  radius = 180,
  innerRadius = 14,
  width,
  height,
  step = 1,
  largeStep = 7,
  label = "Range",
  formatValue,
  arcFill = "var(--semiotic-primary, #4e79a7)",
  stroke = "var(--semiotic-bg, #ffffff)",
  className,
  style,
}: CircularBrushProps): React.ReactElement {
  const w = width ?? radius * 2 + 40
  const h = height ?? radius * 2 + 40
  const center = { x: w / 2, y: h / 2 }
  const toAngle = angleScale([0, period])
  const dragState = useRef<{ mode: "start" | "end" | "range"; lastValue: number } | null>(null)

  // Pointer position → domain value, accounting for the viewBox scale.
  const valueFromPointer = (event: React.PointerEvent): number => {
    const svg = (event.currentTarget as SVGElement).ownerSVGElement ?? (event.currentTarget as SVGSVGElement)
    const rect = svg.getBoundingClientRect()
    const vb = (svg as SVGSVGElement).viewBox?.baseVal
    const vw = vb?.width || w
    const vh = vb?.height || h
    const px = (event.clientX - rect.left) * (vw / (rect.width || 1)) - center.x
    const py = (event.clientY - rect.top) * (vh / (rect.height || 1)) - center.y
    return Math.round((xyToAngle(px, py) / TAU) * period) % period
  }

  const beginDrag = (event: React.PointerEvent, mode: "start" | "end" | "range") => {
    event.preventDefault()
    event.stopPropagation()
    const svg = (event.currentTarget as SVGElement).ownerSVGElement
    svg?.setPointerCapture?.(event.pointerId)
    dragState.current = { mode, lastValue: valueFromPointer(event) }
  }

  const handleMove = (event: React.PointerEvent) => {
    const drag = dragState.current
    if (!drag) return
    const next = valueFromPointer(event)
    if (drag.mode === "range") {
      const delta = shortestArcDelta(drag.lastValue, next, period)
      if (delta === 0) return
      drag.lastValue = next
      onChange((current) => ({
        start: wrapValue(current.start + delta, period),
        end: wrapValue(current.end + delta, period),
      }))
      return
    }
    onChange((current) => ({ ...current, [drag.mode]: next }))
  }

  const endDrag = (event: React.PointerEvent) => {
    const svg = (event.currentTarget as SVGElement).ownerSVGElement ?? (event.currentTarget as SVGSVGElement)
    if (svg?.hasPointerCapture?.(event.pointerId)) svg.releasePointerCapture(event.pointerId)
    dragState.current = null
  }

  const nudge = (mode: "start" | "end" | "range", delta: number) => {
    if (mode === "range") {
      onChange((current) => ({
        start: wrapValue(current.start + delta, period),
        end: wrapValue(current.end + delta, period),
      }))
    } else {
      onChange((current) => ({ ...current, [mode]: wrapValue(current[mode] + delta, period) }))
    }
  }

  const onKey = (mode: "start" | "end" | "range") => (event: React.KeyboardEvent) => {
    const s = event.shiftKey ? largeStep : step
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault()
      nudge(mode, s)
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault()
      nudge(mode, -s)
    }
  }

  // Selected arc(s): one when start <= end, two when the range wraps the cycle.
  const arcs: Array<[number, number]> =
    value.start <= value.end
      ? [[value.start, value.end]]
      : [
          [value.start, period],
          [0, value.end],
        ]

  const valueText = (v: number) => (formatValue ? formatValue(v) : String(v))
  const handlePoint = (v: number) => polarToXY(toAngle(v), radius + 8)
  const handleInner = (v: number) => polarToXY(toAngle(v), innerRadius)

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={className}
      onPointerMove={handleMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      style={{ touchAction: "none", ...style }}
      aria-label={`${label} brush`}
    >
      <g transform={`translate(${center.x},${center.y})`}>
        {/* Selected range — draggable, role=slider over the cycle */}
        <g
          role="slider"
          tabIndex={0}
          aria-label={`${label} (move both ends)`}
          aria-valuemin={0}
          aria-valuemax={period - 1}
          aria-valuenow={value.start}
          aria-valuetext={`${valueText(value.start)} to ${valueText(value.end)}`}
          onPointerDown={(e) => beginDrag(e, "range")}
          onKeyDown={onKey("range")}
          style={{ cursor: "grab" }}
        >
          {arcs.map(([a, b], i) => (
            <path
              key={i}
              d={ringArcPath(toAngle(a), toAngle(b), innerRadius, radius)}
              fill={arcFill}
              fillOpacity={0.35}
              stroke={stroke}
              strokeWidth={1}
            />
          ))}
        </g>
        {(["start", "end"] as const).map((mode) => {
          const v = value[mode]
          const inner = handleInner(v)
          const outer = handlePoint(v)
          return (
            <g
              key={mode}
              role="slider"
              tabIndex={0}
              aria-label={`${label} ${mode}`}
              aria-valuemin={0}
              aria-valuemax={period - 1}
              aria-valuenow={v}
              aria-valuetext={valueText(v)}
              onPointerDown={(e) => beginDrag(e, mode)}
              onKeyDown={onKey(mode)}
              style={{ cursor: "grab" }}
            >
              {/* fat transparent hit line for grabbing */}
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="transparent" strokeWidth={20} />
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={stroke} strokeWidth={1.5} />
              <circle cx={outer.x} cy={outer.y} r={4.5} fill={stroke} stroke={arcFill} strokeWidth={1} />
            </g>
          )
        })}
      </g>
    </svg>
  )
}
