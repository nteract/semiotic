import type { Datum } from "./datumTypes"
import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import type {
  OnObservationCallback,
  ObservationInputType
} from "../../store/ObservationStore"

/** Extra context supplied by Stream Frames to their existing behavior hooks. */
export interface SemanticInteractionContext {
  type: "focus" | "activate"
  inputType: ObservationInputType
}

export type SemanticHoverBehavior<T = Datum> = (
  datum: T | null,
  context?: SemanticInteractionContext
) => void

export type SemanticClickBehavior<T = Datum> = (
  datum: T | null,
  context?: SemanticInteractionContext
) => void

export function observationInputType(pointerType?: string): "pointer" | "touch" {
  return pointerType === "touch" ? "touch" : "pointer"
}

/**
 * Stream Frame keyboard navigation lives on a focusable chart wrapper. Let
 * native controls rendered inside that wrapper (notably widget annotations)
 * handle their own keys before the chart consumes Enter, Space, or arrows.
 */
export function isInteractiveKeyboardTarget(
  event: Pick<ReactKeyboardEvent, "target" | "currentTarget">
): boolean {
  const target = event.target
  if (!(target instanceof Element) || target === event.currentTarget) return false
  return target.closest(
    "button, a[href], input, select, textarea, summary, [contenteditable='true'], [role='button'], [role='link'], [role='checkbox'], [role='radio'], [role='switch']"
  ) != null
}

/**
 * Emit the legacy hover event and its semantic focus companion when present.
 * Keeping both makes the semantic vocabulary additive for existing consumers.
 */
export function emitHoverObservations(options: {
  onObservation?: OnObservationCallback
  datum: Datum | null
  x?: number
  y?: number
  chartType: string
  chartId?: string
  context?: SemanticInteractionContext
  timestamp?: number
}): void {
  const {
    onObservation,
    datum,
    x = 0,
    y = 0,
    chartType,
    chartId,
    context,
    timestamp = Date.now()
  } = options
  if (!onObservation) return
  if (!datum) {
    onObservation({ type: "hover-end", timestamp, chartType, chartId })
    return
  }
  onObservation({ type: "hover", datum, x, y, timestamp, chartType, chartId })
  if (context?.type === "focus") {
    onObservation({
      type: "focus",
      datum,
      inputType:
        context.inputType === "touch" ? "pointer" : context.inputType,
      timestamp,
      chartType,
      chartId
    })
  }
}

/** Emit the legacy click event and its semantic activation companion. */
export function emitClickObservations(options: {
  onObservation?: OnObservationCallback
  datum: Datum | null
  x?: number
  y?: number
  chartType: string
  chartId?: string
  context?: SemanticInteractionContext
  timestamp?: number
}): void {
  const {
    onObservation,
    datum,
    x = 0,
    y = 0,
    chartType,
    chartId,
    context,
    timestamp = Date.now()
  } = options
  if (!onObservation) return
  if (!datum) {
    onObservation({ type: "click-end", timestamp, chartType, chartId })
    return
  }
  onObservation({ type: "click", datum, x, y, timestamp, chartType, chartId })
  if (context?.type === "activate") {
    onObservation({
      type: "activate",
      datum,
      inputType: context.inputType,
      timestamp,
      chartType,
      chartId
    })
  }
}
