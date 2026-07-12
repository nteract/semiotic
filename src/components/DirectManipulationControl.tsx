import * as React from "react"
import { useRef } from "react"
import { createControlObservationAdapter } from "./controls/controlContract"
import type {
  ControlObservationCallback,
  VisualizationControlType,
} from "./controls/controlContract"

export { VISUALIZATION_CONTROL_TYPES } from "./controls/controlContract"
export type {
  ControlObservation,
  ControlObservationCallback,
  ControlObservationPhase,
  VisualizationControlDefinition,
  VisualizationControlType,
  VisualizationControlValue,
} from "./controls/controlContract"

export interface DirectManipulationControlProps {
  /** Controlled numeric value expressed in the chart's data domain. */
  value: number
  /** Called on pointer drag or keyboard nudge. */
  onChange: (value: number) => void
  /** Convert a pointer event in the control's frame coordinate space to a value. */
  pointerToValue: (event: React.PointerEvent<SVGGElement>) => number | null | undefined
  /** Inclusive value domain. */
  min: number
  max: number
  /** Keyboard and pointer quantization step. @default 1 */
  step?: number
  /** Shift+arrow nudge. @default step * 5 */
  largeStep?: number
  /** Position in the shared SVG/frame coordinate space. */
  x: number
  y: number
  /** Semantic machine-readable control classification. */
  controlType?: VisualizationControlType
  /** Stable identity for observations, audits, and portable recipes. */
  controlId?: string
  /** Accessible label. */
  label: string
  /** Optional human-readable current value. */
  valueText?: string
  /** Handle radius in CSS/SVG pixels. @default 12 */
  radius?: number
  /** Handle fill. Defaults to the active Semiotic surface token. */
  fill?: string
  /** Handle stroke. Defaults to the active Semiotic primary token. */
  stroke?: string
  strokeWidth?: number
  /** Optional text rendered next to the handle. */
  labelText?: React.ReactNode
  labelDx?: number
  labelDy?: number
  labelClassName?: string
  className?: string
  disabled?: boolean
  onChangeStart?: (value: number) => void
  onChangeEnd?: (value: number) => void
  /** Optional adapter to the same onObservation stream used by frames. */
  onObservation?: ControlObservationCallback
  /** Owning chart identity when this control is layered over a frame. */
  chartId?: string
  /** Owning frame/chart name used by control observations. */
  chartType?: string
}

function clampAndSnap(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value))
  const snapped = min + Math.round((clamped - min) / step) * step
  return Math.min(max, Math.max(min, Number(snapped.toFixed(12))))
}

/**
 * A small SVG-native control surface for a chart that owns its own scales.
 *
 * `DirectManipulationControl` deliberately does not know about a particular
 * Semiotic frame. The chart supplies `pointerToValue`, making this usable in
 * XY, ordinal, geographic, radial, and custom-layout overlays without the
 * control reaching into frame internals. It contributes the repeated parts
 * every visualization control needs: pointer capture, data-domain clamping,
 * keyboard stepping, focus semantics, and a stable machine-readable type.
 */
export function DirectManipulationControl({
  value,
  onChange,
  pointerToValue,
  min,
  max,
  step = 1,
  largeStep = step * 5,
  x,
  y,
  controlType = "value",
  controlId,
  label,
  valueText,
  radius = 12,
  fill = "var(--semiotic-bg, #ffffff)",
  stroke = "var(--semiotic-primary, #4e79a7)",
  strokeWidth = 4,
  labelText,
  labelDx = 16,
  labelDy = -16,
  labelClassName,
  className,
  disabled = false,
  onChangeStart,
  onChangeEnd,
  onObservation,
  chartId,
  chartType,
}: DirectManipulationControlProps): React.ReactElement {
  const activePointer = useRef<number | null>(null)
  const currentValue = useRef(value)
  currentValue.current = value
  const emitObservation = React.useMemo(
    () => createControlObservationAdapter({
      controlType,
      controlId,
      chartId,
      chartType,
      onObservation,
    }),
    [chartId, chartType, controlId, controlType, onObservation],
  )

  const updateFromPointer = (event: React.PointerEvent<SVGGElement>) => {
    if (disabled) return
    const next = pointerToValue(event)
    if (next == null || !Number.isFinite(next)) return
    const snapped = clampAndSnap(next, min, max, step)
    currentValue.current = snapped
    onChange(snapped)
    emitObservation("control-change", snapped, "pointer")
  }

  const beginDrag = (event: React.PointerEvent<SVGGElement>) => {
    if (disabled) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    activePointer.current = event.pointerId
    onChangeStart?.(currentValue.current)
    emitObservation("control-start", currentValue.current, "pointer")
    updateFromPointer(event)
  }

  const moveDrag = (event: React.PointerEvent<SVGGElement>) => {
    // SVGOverlay intentionally disables pointer events at the root so labels
    // and annotations never interfere with chart hover. A real control opts
    // back in below that layer and owns pointer movement while it is present.
    event.stopPropagation()
    if (activePointer.current !== event.pointerId) return
    updateFromPointer(event)
  }

  const endDrag = (event: React.PointerEvent<SVGGElement>) => {
    event.stopPropagation()
    if (activePointer.current !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    activePointer.current = null
    onChangeEnd?.(currentValue.current)
    emitObservation("control-end", currentValue.current, "pointer")
  }

  const onKeyDown = (event: React.KeyboardEvent<SVGGElement>) => {
    if (disabled) return
    const increment = event.shiftKey ? largeStep : step
    const base = currentValue.current
    let next: number | null = null
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = base - increment
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = base + increment
    if (event.key === "Home") next = min
    if (event.key === "End") next = max
    if (next === null) return
    event.preventDefault()
    const snapped = clampAndSnap(next, min, max, step)
    currentValue.current = snapped
    onChange(snapped)
    emitObservation("control-change", snapped, "keyboard")
  }

  const classes = ["semiotic-direct-manipulation-control", className].filter(Boolean).join(" ")

  return (
    <g
      className={classes}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText ?? `${label}: ${value}`}
      aria-roledescription="visualization control"
      data-viz-control={controlType}
      data-viz-control-id={controlId}
      data-viz-control-state="controlled"
      pointerEvents="all"
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onKeyDown={onKeyDown}
      style={{ cursor: disabled ? "default" : "grab", touchAction: "none" }}
    >
      <circle className="semiotic-direct-manipulation-control__hit" cx={x} cy={y} r={radius + 10} fill="transparent" />
      <circle className="semiotic-direct-manipulation-control__handle" cx={x} cy={y} r={radius} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      {labelText ? (
        <text className={labelClassName} x={x + labelDx} y={y + labelDy} fill={stroke}>
          {labelText}
        </text>
      ) : null}
    </g>
  )
}
