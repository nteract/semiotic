import * as React from "react"
import { useRef } from "react"
import { polarToXY, xyToAngle, angleScale, ringArcPath, TAU } from "./recipes/radialCoords"
import { wrapValue, shortestArcDelta } from "./recipes/cyclical"
import {
  createControlObservationAdapter,
  type ControlInputSource,
  type ControlObservationCallback,
  type VisualizationControlType,
} from "./controls/controlContract"

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
 * reachable by Tab, with a visible focus ring, and nudgeable with ←/→ (Shift or
 * PageUp/PageDown = `largeStep`); Home/End go to the start and the last step of
 * the cycle. Pointer and keyboard changes snap to `step`, so fractional cycles
 * (a phase in `[0, 1)`, half-hours of a day) work. With `onObservation` it
 * emits the `semiotic/controls` `ControlObservation`s (`control-start`,
 * `control-change`, `control-end`) with `[start, end]` values. Built on the
 * tested radial (`polarToXY`/`xyToAngle`/`ringArcPath`) + cyclical
 * (`wrapValue`/`shortestArcDelta`) kit, so wrap-around never unwinds the long way.
 */
export interface CircularBrushValue {
  /** Range start, in domain units (e.g. day-of-year). */
  start: number
  /** Range end, in domain units. When `start > end` the range wraps the cycle.
   * Use `{ start: 0, end: period }` for a controlled full-cycle selection. */
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
  /**
   * Resolution in domain units: pointer values snap to it and ←/→ nudge by it.
   * @default 1 for an integer period of 2 or more, else `period / 100`
   */
  step?: number
  /** Shift+arrow and PageUp/PageDown step, domain units.
   *  @default 7 for an integer period of 2 or more, else `step * 10` */
  largeStep?: number
  /** Accessible label prefix for the handles + range. @default "Range" */
  label?: string
  /** Format a domain value for `aria-valuetext` (e.g. a date). */
  formatValue?: (value: number) => string
  /** Brush arc fill. @default a translucent primary */
  arcFill?: string
  /** Brush arc + handle stroke. @default white */
  stroke?: string
  /** Receives `control-start`/`control-change`/`control-end` observations with
   *  `[start, end]` values, the `semiotic/controls` contract. */
  onObservation?: ControlObservationCallback
  /** Observation `controlType`. @default "range-boundary" */
  controlType?: VisualizationControlType
  /** Stable id carried on observations and `data-viz-control-id`. */
  controlId?: string
  /** Chart this brush controls, carried on observations. */
  chartId?: string
  /** Observation `chartType`. @default "CircularBrush" */
  chartType?: string
  className?: string
  /** Inline style for the root `<svg>`. Use it to position the control as an
   *  overlay over a chart sharing its coordinate space — e.g.
   *  `{ position: "absolute", inset: 0, width: "100%", height: "100%" }`. */
  style?: React.CSSProperties
}

type BrushMode = "start" | "end" | "range"

const FOCUS_STROKE = "var(--semiotic-focus, #005fcc)"

/** Drop float noise from step arithmetic (0.1 + 0.2 → 0.3). */
function cleanFloat(value: number): number {
  return Number(value.toPrecision(12))
}

function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(":focus-visible")
  } catch {
    return true
  }
}

export function CircularBrush({
  value,
  onChange,
  period = 365,
  radius = 180,
  innerRadius = 14,
  width,
  height,
  step,
  largeStep,
  label = "Range",
  formatValue,
  arcFill = "var(--semiotic-primary, #4e79a7)",
  stroke = "var(--semiotic-bg, #ffffff)",
  onObservation,
  controlType = "range-boundary",
  controlId,
  chartId,
  chartType = "CircularBrush",
  className,
  style,
}: CircularBrushProps): React.ReactElement {
  const w = width ?? radius * 2 + 40
  const h = height ?? radius * 2 + 40
  const center = { x: w / 2, y: h / 2 }
  const toAngle = angleScale([0, period])
  const integerCycle = Number.isInteger(period) && period >= 2
  const snapStep = step != null && step > 0 ? step : integerCycle ? 1 : period / 100
  const pageStep = largeStep != null && largeStep > 0 ? largeStep : integerCycle ? 7 : snapStep * 10
  // The last snapped value before the cycle wraps back to 0.
  const maxValue = cleanFloat(Math.max(0, Math.ceil(period / snapStep - 1e-9) - 1) * snapStep)
  const dragState = useRef<{ mode: BrushMode; lastValue: number; changed: boolean } | null>(null)
  // The value observations report: the controlled value, advanced by each
  // change this component requests before the parent re-renders it.
  const latestValue = useRef(value)
  latestValue.current = value
  const [focus, setFocus] = React.useState<{ mode: BrushMode; visible: boolean } | null>(null)
  const pointerFocus = useRef(false)

  const observe = React.useMemo(
    () => createControlObservationAdapter({ controlType, controlId, chartId, chartType, onObservation }),
    [controlType, controlId, chartId, chartType, onObservation]
  )

  /** Wrap into `[0, period)` without float noise. */
  const wrap = (v: number): number => {
    const wrapped = cleanFloat(wrapValue(v, period))
    return wrapped >= period ? 0 : wrapped
  }
  /** Snap to the step, then wrap. */
  const snap = (v: number): number => wrap(cleanFloat(Math.round(v / snapStep) * snapStep))
  const shiftRange = (current: CircularBrushValue, delta: number): CircularBrushValue =>
    current.end - current.start >= period ? current : {
      start: wrap(current.start + delta),
      end: wrap(current.end + delta),
    }

  /** Request a change through `onChange`'s updater form and report its value. */
  const change = (
    update: (current: CircularBrushValue) => CircularBrushValue,
    source: ControlInputSource,
    phases: { start: boolean; end: boolean },
  ) => {
    const next = update(latestValue.current)
    latestValue.current = next
    const observed: [number, number] = [next.start, next.end]
    if (phases.start) observe("control-start", observed, source)
    onChange(update)
    observe("control-change", observed, source)
    if (phases.end) observe("control-end", observed, source)
  }

  // Pointer position → domain value, accounting for the viewBox scale.
  const valueFromPointer = (event: React.PointerEvent): number => {
    const svg = (event.currentTarget as SVGElement).ownerSVGElement ?? (event.currentTarget as SVGSVGElement)
    const rect = svg.getBoundingClientRect()
    const vb = (svg as SVGSVGElement).viewBox?.baseVal
    const vw = vb?.width || w
    const vh = vb?.height || h
    const px = (event.clientX - rect.left) * (vw / (rect.width || 1)) - center.x
    const py = (event.clientY - rect.top) * (vh / (rect.height || 1)) - center.y
    return snap((xyToAngle(px, py) / TAU) * period)
  }

  const beginDrag = (event: React.PointerEvent, mode: BrushMode) => {
    // preventDefault keeps the drag from selecting text, but it also stops
    // the browser focusing the slider, so focus it here (without a ring).
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as SVGGElement
    if (target.ownerDocument?.activeElement !== target) {
      pointerFocus.current = true
      target.focus?.({ preventScroll: true })
      pointerFocus.current = false
    }
    const svg = target.ownerSVGElement
    svg?.setPointerCapture?.(event.pointerId)
    dragState.current = { mode, lastValue: valueFromPointer(event), changed: false }
  }

  const handleMove = (event: React.PointerEvent) => {
    const drag = dragState.current
    if (!drag) return
    const next = valueFromPointer(event)
    const first = !drag.changed
    if (drag.mode === "range") {
      const delta = shortestArcDelta(drag.lastValue, next, period)
      if (delta === 0) return
      drag.lastValue = next
      drag.changed = true
      change((current) => shiftRange(current, delta), "pointer", { start: first, end: false })
      return
    }
    const mode = drag.mode
    if (latestValue.current[mode] === next) return
    drag.changed = true
    change((current) => ({ ...current, [mode]: next }), "pointer", { start: first, end: false })
  }

  const endDrag = (event: React.PointerEvent) => {
    const svg = (event.currentTarget as SVGElement).ownerSVGElement ?? (event.currentTarget as SVGSVGElement)
    if (svg?.hasPointerCapture?.(event.pointerId)) svg.releasePointerCapture(event.pointerId)
    const drag = dragState.current
    dragState.current = null
    if (drag?.changed) {
      const current = latestValue.current
      observe("control-end", [current.start, current.end], "pointer")
    }
  }

  const keyboardChange = (update: (current: CircularBrushValue) => CircularBrushValue) =>
    change(update, "keyboard", { start: true, end: true })

  const nudge = (mode: BrushMode, delta: number) => {
    if (mode === "range") {
      keyboardChange((current) => shiftRange(current, delta))
    } else {
      keyboardChange((current) => ({ ...current, [mode]: wrap(current[mode] + delta) }))
    }
  }

  /** Home/End: a handle goes to the cycle's first or last step; the range
   *  moves as a whole so its start does. */
  const jumpTo = (mode: BrushMode, target: number) => {
    if (mode === "range") {
      keyboardChange((current) => shiftRange(current, target - current.start))
    } else {
      keyboardChange((current) => ({ ...current, [mode]: target }))
    }
  }

  const onKey = (mode: BrushMode) => (event: React.KeyboardEvent) => {
    const s = event.shiftKey ? pageStep : snapStep
    const actions: Record<string, () => void> = {
      ArrowRight: () => nudge(mode, s),
      ArrowUp: () => nudge(mode, s),
      ArrowLeft: () => nudge(mode, -s),
      ArrowDown: () => nudge(mode, -s),
      PageUp: () => nudge(mode, pageStep),
      PageDown: () => nudge(mode, -pageStep),
      Home: () => jumpTo(mode, 0),
      End: () => jumpTo(mode, maxValue),
    }
    const action = actions[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

  const focusHandlers = (mode: BrushMode) => ({
    onFocus: (event: React.FocusEvent<SVGGElement>) =>
      setFocus({ mode, visible: !pointerFocus.current && isFocusVisible(event.currentTarget) }),
    onBlur: () => setFocus(null),
  })
  const ringed = (mode: BrushMode) => focus?.mode === mode && focus.visible

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
      data-viz-control-id={controlId}
    >
      <g transform={`translate(${center.x},${center.y})`}>
        {/* Selected range — draggable, role=slider over the cycle */}
        <g
          role="slider"
          tabIndex={0}
          aria-label={`${label} (move both ends)`}
          aria-valuemin={0}
          aria-valuemax={maxValue}
          aria-valuenow={value.start}
          aria-valuetext={`${valueText(value.start)} to ${valueText(value.end)}`}
          onPointerDown={(e) => beginDrag(e, "range")}
          onKeyDown={onKey("range")}
          {...focusHandlers("range")}
          style={{ cursor: "grab", outline: "none" }}
        >
          {arcs.map(([a, b], i) => (
            <path
              key={i}
              d={ringArcPath(toAngle(a), toAngle(b), innerRadius, radius)}
              fill={arcFill}
              fillOpacity={0.35}
              stroke={ringed("range") ? FOCUS_STROKE : stroke}
              strokeWidth={ringed("range") ? 3 : 1}
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
              aria-valuemax={mode === "end" && value.end === period ? period : maxValue}
              aria-valuenow={v}
              aria-valuetext={valueText(v)}
              onPointerDown={(e) => beginDrag(e, mode)}
              onKeyDown={onKey(mode)}
              {...focusHandlers(mode)}
              style={{ cursor: "grab", outline: "none" }}
            >
              {/* fat transparent hit line for grabbing */}
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="transparent" strokeWidth={20} />
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={stroke} strokeWidth={1.5} />
              <circle cx={outer.x} cy={outer.y} r={4.5} fill={stroke} stroke={arcFill} strokeWidth={1} />
              {ringed(mode) && (
                <circle cx={outer.x} cy={outer.y} r={8} fill="none" stroke={FOCUS_STROKE} strokeWidth={2} />
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}
