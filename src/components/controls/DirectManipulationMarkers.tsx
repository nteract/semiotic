import * as React from "react"
import { useRef } from "react"
import { createControlObservationAdapter } from "./controlContract"
import type { ControlInputSource, ControlObservationCallback, VisualizationControlType } from "./controlContract"
import { pointerToLocalPoint, type ControlPoint } from "./controlPointer"
import { keyboardSliderTarget, snapToStep } from "./directManipulationMath"

/** Per-handle presentation and accessible name. */
export interface DirectManipulationMarker {
  /** Accessible label, e.g. "Baseline". */
  label: string
  /** Optional human-readable current value. Defaults to `${label}: ${value}`. */
  valueText?: (value: number) => string
  /** Optional text rendered next to the handle. */
  labelText?: React.ReactNode
  fill?: string
  stroke?: string
  radius?: number
  /** Stable identity for observations. Defaults to `${controlId}-${index}`. */
  controlId?: string
  className?: string
}

export interface DirectManipulationMarkersChangeMeta {
  /** The handle that moved. */
  index: number
  source: Exclude<ControlInputSource, "programmatic">
}

export interface DirectManipulationMarkersProps {
  /** Controlled values, one per marker. With `ordered`, keep them ascending. */
  values: readonly number[]
  /** Called with the full next value array on every pointer or keyboard change. */
  onChange: (values: number[], meta: DirectManipulationMarkersChangeMeta) => void
  /** One entry per value: label, colors, and optional identity. */
  markers: readonly DirectManipulationMarker[]
  /** Where to draw a handle for a value, in the coordinate space of the parent `<g>`. */
  valueToPoint: (value: number, index: number) => ControlPoint
  /**
   * Convert the pointer, mapped into that same coordinate space, to a value —
   * usually an inverted chart scale: `(point) => scales.r.invert(point.x)`.
   */
  pointToValue: (point: ControlPoint, index: number) => number | null | undefined
  /** Inclusive value domain shared by every handle. */
  min: number
  max: number
  /** Keyboard and pointer quantization step. @default 1 */
  step?: number
  /** Value the step grid passes through. @default min */
  stepOrigin?: number
  /** Shift+arrow and PageUp/PageDown step. @default step * 5 */
  largeStep?: number
  /**
   * Keep values ascending: each handle is bounded by its neighbors, and when
   * handles coincide the drag direction picks which one moves (toward lower
   * values moves the lowest, toward higher values the highest), as in a
   * multi-thumb range slider. @default true
   */
  ordered?: boolean
  /** Accessible name for the group of handles. */
  label?: string
  /** Optional `aria-roledescription` for each handle; unset announces "slider". */
  ariaRoleDescription?: string
  controlType?: VisualizationControlType
  controlId?: string
  radius?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  labelDx?: number
  labelDy?: number
  labelClassName?: string
  className?: string
  disabled?: boolean
  onChangeStart?: (values: number[], meta: DirectManipulationMarkersChangeMeta) => void
  /** The values to commit: fires on pointer release and after each keyboard change. */
  onChangeEnd?: (values: number[], meta: DirectManipulationMarkersChangeMeta) => void
  onObservation?: ControlObservationCallback
  chartId?: string
  chartType?: string
}

interface DragState {
  pointerId: number
  pressedIndex: number
  startValue: number
  /** Handles that shared the pressed value; the drag direction picks one. */
  coincident: number[]
  active: number | null
}

/**
 * Ordered, draggable markers (baseline/max handles, quantile cuts, reporting
 * windows) over a chart that owns its scales. Every handle is its own focusable
 * `role="slider"` bounded by its neighbors, so keyboard users Tab between them
 * and hear the reachable range. Mount it in a frame's `interactiveGraphics`
 * layer (outside the chart's `role="img"`) or in any SVG overlay you own.
 */
export function DirectManipulationMarkers({
  values,
  onChange,
  markers,
  valueToPoint,
  pointToValue,
  min,
  max,
  step = 1,
  stepOrigin = min,
  largeStep = step * 5,
  ordered = true,
  label,
  ariaRoleDescription,
  controlType = "value",
  controlId = "markers",
  radius = 12,
  fill = "var(--semiotic-bg, #ffffff)",
  stroke = "var(--semiotic-primary, #4e79a7)",
  strokeWidth = 4,
  labelDx = 16,
  labelDy = -16,
  labelClassName,
  className,
  disabled = false,
  onChangeStart,
  onChangeEnd,
  onObservation,
  chartId,
  chartType
}: DirectManipulationMarkersProps): React.ReactElement {
  const current = useRef<number[]>([...values])
  current.current = [...values]
  const drag = useRef<DragState | null>(null)

  const observers = React.useMemo(
    () => markers.map((marker, index) => createControlObservationAdapter({
      controlType,
      controlId: marker.controlId ?? `${controlId}-${index}`,
      chartId,
      chartType,
      onObservation
    })),
    [chartId, chartType, controlId, controlType, markers, onObservation]
  )

  const boundsFor = (index: number, source: readonly number[]) => ordered
    ? {
        lo: index > 0 ? Math.max(min, source[index - 1]) : min,
        hi: index < source.length - 1 ? Math.min(max, source[index + 1]) : max
      }
    : { lo: min, hi: max }

  const apply = (index: number, raw: number, source: Exclude<ControlInputSource, "programmatic">): boolean => {
    const { lo, hi } = boundsFor(index, current.current)
    const snapped = snapToStep(raw, lo, hi, step, stepOrigin)
    if (snapped === current.current[index]) return false
    const next = [...current.current]
    next[index] = snapped
    current.current = next
    onChange(next, { index, source })
    observers[index]?.("control-change", snapped, source)
    return true
  }

  const valueFromEvent = (event: React.PointerEvent<SVGGElement>, index: number) => {
    const point = pointerToLocalPoint(event)
    const value = point ? pointToValue(point, index) : null
    return value != null && Number.isFinite(value) ? value : null
  }

  const beginDrag = (index: number) => (event: React.PointerEvent<SVGGElement>) => {
    if (disabled) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const startValue = current.current[index]
    const coincident = ordered
      ? current.current.flatMap((value, i) => (value === startValue ? [i] : []))
      : [index]
    drag.current = {
      pointerId: event.pointerId,
      pressedIndex: index,
      startValue,
      coincident,
      active: coincident.length > 1 ? null : index
    }
    const meta = { index, source: "pointer" as const }
    onChangeStart?.([...current.current], meta)
    observers[index]?.("control-start", startValue, "pointer")
    if (coincident.length === 1) {
      const value = valueFromEvent(event, index)
      if (value != null) apply(index, value, "pointer")
    }
  }

  const moveDrag = (event: React.PointerEvent<SVGGElement>) => {
    event.stopPropagation()
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    const value = valueFromEvent(event, state.active ?? state.pressedIndex)
    if (value == null) return
    if (state.active === null) {
      // Coincident handles wait for a direction before one is chosen.
      if (value === state.startValue) return
      state.active = value < state.startValue
        ? Math.min(...state.coincident)
        : Math.max(...state.coincident)
    }
    apply(state.active, value, "pointer")
  }

  const endDrag = (event: React.PointerEvent<SVGGElement>) => {
    event.stopPropagation()
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    drag.current = null
    const index = state.active ?? state.pressedIndex
    onChangeEnd?.([...current.current], { index, source: "pointer" })
    observers[index]?.("control-end", current.current[index], "pointer")
  }

  const onKeyDown = (index: number) => (event: React.KeyboardEvent<SVGGElement>) => {
    if (disabled) return
    const { lo, hi } = boundsFor(index, current.current)
    const base = current.current[index]
    const target = keyboardSliderTarget(event.key, event.shiftKey, base, { min: lo, max: hi, step, largeStep })
    if (target === null) return
    event.preventDefault()
    const meta = { index, source: "keyboard" as const }
    const before = [...current.current]
    if (snapToStep(target, lo, hi, step, stepOrigin) === base) return
    onChangeStart?.(before, meta)
    observers[index]?.("control-start", base, "keyboard")
    apply(index, target, "keyboard")
    onChangeEnd?.([...current.current], meta)
    observers[index]?.("control-end", current.current[index], "keyboard")
  }

  // DOM order stays fixed: moving a handle's node mid-gesture would drop its
  // pointer capture or keyboard focus. Coincident handles resolve by drag
  // direction instead of by which one happens to paint on top.
  return (
    <g
      className={["semiotic-direct-manipulation-markers", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={label}
    >
      {values.map((value, index) => {
        const marker = markers[index] ?? { label: `Marker ${index + 1}` }
        const point = valueToPoint(value, index)
        const { lo, hi } = boundsFor(index, values)
        const handleStroke = marker.stroke ?? stroke
        const handleRadius = marker.radius ?? radius
        return (
          <g
            key={marker.controlId ?? index}
            className={["semiotic-direct-manipulation-control", marker.className].filter(Boolean).join(" ")}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled || undefined}
            aria-label={marker.label}
            aria-valuemin={lo}
            aria-valuemax={hi}
            aria-valuenow={value}
            aria-valuetext={marker.valueText?.(value) ?? `${marker.label}: ${value}`}
            aria-roledescription={ariaRoleDescription}
            data-viz-control={controlType}
            data-viz-control-id={marker.controlId ?? `${controlId}-${index}`}
            data-viz-control-state="controlled"
            pointerEvents="all"
            onPointerDown={beginDrag(index)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onKeyDown={onKeyDown(index)}
            style={{ cursor: disabled ? "default" : "grab", touchAction: "none" }}
          >
            <circle className="semiotic-direct-manipulation-control__hit" cx={point.x} cy={point.y} r={handleRadius + 10} fill="transparent" />
            <circle
              className="semiotic-direct-manipulation-control__handle"
              cx={point.x}
              cy={point.y}
              r={handleRadius}
              fill={marker.fill ?? fill}
              stroke={handleStroke}
              strokeWidth={strokeWidth}
            />
            {marker.labelText ? (
              <text className={labelClassName} x={point.x + labelDx} y={point.y + labelDy} fill={handleStroke}>
                {marker.labelText}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
