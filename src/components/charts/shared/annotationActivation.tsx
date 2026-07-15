import * as React from "react"
import type { Datum } from "./datumTypes"
import type {
  ChartObservation,
  OnObservationCallback,
  ObservationInputType
} from "../../store/ObservationStore"
import { useObservationSelector } from "../../store/ObservationStore"

export type ChartAnnotation = Datum

export interface AnnotationActivationEvent {
  annotation: ChartAnnotation
  annotationId?: string
  chartId?: string
  inputType: ObservationInputType
}

export type OnAnnotationActivateCallback = (
  event: AnnotationActivationEvent
) => void

export interface AnnotationActivationOptions {
  onAnnotationActivate?: OnAnnotationActivateCallback
  onObservation?: OnObservationCallback
  chartId?: string
  chartType?: string
}

/** Route annotation activation to both a direct callback and the observation store. */
export function useAnnotationActivationOptions(
  options: AnnotationActivationOptions
): AnnotationActivationOptions {
  const pushObservation = useObservationSelector((state) => state.pushObservation)
  const onObservation = React.useCallback(
    (observation: ChartObservation) => {
      options.onObservation?.(observation)
      pushObservation?.(observation)
    },
    [options, pushObservation]
  )
  return React.useMemo(
    () => ({ ...options, onObservation }),
    [onObservation, options]
  )
}

/**
 * Resolve a durable annotation identity without ever falling back to array
 * position. Provenance stable IDs are accepted for agent-authored notes.
 */
export function annotationStableId(annotation: ChartAnnotation): string | undefined {
  const provenance = annotation.provenance as Record<string, unknown> | undefined
  const candidate = annotation.id ?? annotation.stableId ?? provenance?.stableId
  return candidate == null || candidate === "" ? undefined : String(candidate)
}

function activationInputType(
  event: React.MouseEvent<HTMLElement>
): ObservationInputType {
  const nativeEvent = event.nativeEvent as MouseEvent & { pointerType?: string }
  if (nativeEvent.pointerType === "touch") return "touch"
  // Browser-generated keyboard clicks have detail 0. Pointer clicks have a
  // positive click count, including pen input (normalized to pointer).
  if (nativeEvent.detail === 0) return "keyboard"
  return "pointer"
}

/**
 * Event props for a widget's existing HTML boundary. Capture phase observes
 * arbitrary descendant controls without replacing their behavior or adding a
 * nested interactive element.
 */
export function annotationActivationProps(
  annotation: ChartAnnotation,
  options: AnnotationActivationOptions = {}
): React.HTMLAttributes<HTMLDivElement> & {
  "data-semiotic-annotation-id"?: string
  "data-semiotic-annotation-widget": ""
} {
  const annotationId = annotationStableId(annotation)
  return {
    "data-semiotic-annotation-widget": "",
    ...(annotationId
      ? { "data-semiotic-annotation-id": annotationId }
      : {}),
    onClickCapture(event) {
      const inputType = activationInputType(event)
      options.onAnnotationActivate?.({
        annotation,
        annotationId,
        chartId: options.chartId,
        inputType
      })
      if (!annotationId || !options.onObservation) return
      options.onObservation({
        type: "annotation-activate",
        annotationId,
        inputType,
        timestamp: Date.now(),
        chartType: options.chartType ?? "unknown",
        chartId: options.chartId
      })
    }
  }
}

/** True when a bubbled frame click originated inside a widget annotation. */
export function isAnnotationActivationTarget(target: EventTarget | null): boolean {
  return target instanceof Element &&
    target.closest("[data-semiotic-annotation-widget]") != null
}
