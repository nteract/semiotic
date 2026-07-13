/**
 * Frame-neutral semantics shared by SVG, HTML, and declarative visualization
 * controls. This module intentionally has no React, frame, or store imports so
 * it can be included by the small `semiotic/controls` entry point.
 */
export const VISUALIZATION_CONTROL_TYPES = [
  "value",
  "threshold",
  "partition-boundary",
  "time-window",
  "range-boundary",
] as const

export type VisualizationControlType = (typeof VISUALIZATION_CONTROL_TYPES)[number]
export type VisualizationControlValue = number | [number, number]
export type ControlObservationPhase =
  | "control-start"
  | "control-change"
  | "control-end"
export type ControlInputSource = "pointer" | "keyboard" | "programmatic"

/** A machine-readable interaction emitted by a visualization control. */
export interface ControlObservation {
  type: ControlObservationPhase
  controlType: VisualizationControlType
  value: VisualizationControlValue
  chartType: string
  timestamp: number
  controlId?: string
  chartId?: string
  source?: ControlInputSource
}

export type ControlObservationCallback = (observation: ControlObservation) => void

export interface ControlObservationAdapterOptions {
  controlType: VisualizationControlType
  controlId?: string
  chartId?: string
  chartType?: string
  onObservation?: ControlObservationCallback
}

/**
 * Creates an adapter for a control implementation. Frame adapters can pass
 * their existing `onObservation`, while standalone controls can omit it.
 */
export function createControlObservationAdapter({
  controlType,
  controlId,
  chartId,
  chartType = "VisualizationControl",
  onObservation,
}: ControlObservationAdapterOptions): (
  phase: ControlObservationPhase,
  value: VisualizationControlValue,
  source?: ControlInputSource,
) => void {
  return (phase, value, source) => {
    onObservation?.({
      type: phase,
      controlType,
      value,
      chartType,
      timestamp: Date.now(),
      ...(controlId ? { controlId } : {}),
      ...(chartId ? { chartId } : {}),
      ...(source ? { source } : {}),
    })
  }
}

/**
 * JSON-safe control metadata carried by portable recipes and agent-facing
 * audits. `target` is the controlled state binding, not a pointer handler.
 */
export interface VisualizationControlDefinition {
  id: string
  type: VisualizationControlType
  target: string
  domain: readonly [number, number]
  label: string
  valueText: string
  step?: number
  keyboard?: "slider" | "buttons" | "native-range"
  alternatives?: readonly string[]
  observations?: readonly ControlObservationPhase[]
  minimumTargetSize?: number
  annotation?: {
    /** The annotation state key that follows this control's value. */
    target?: string
    /** A portable template, such as "Threshold: {value}". */
    valueText?: string
  }
}
