import { useCallback } from "react"
import type { Datum } from "../../charts/shared/datumTypes"
import type {
  ObservationInputType,
  OnObservationCallback
} from "../../store/ObservationStore"

const CHART_TYPE = "StreamPhysicsFrame"

interface CurrentRef<T> {
  current: T
}

export type PhysicsFrameObservationType =
  | "hover"
  | "hover-end"
  | "click"
  | "click-end"
  | "focus"
  | "activate"

export interface PhysicsFrameObservationPayload {
  datum?: unknown
  x?: number
  y?: number
  inputType?: ObservationInputType
}

interface PhysicsFrameObservationOptions {
  onObservationRef: CurrentRef<OnObservationCallback | undefined>
  chartIdRef: CurrentRef<string | undefined>
  wallClockRef: CurrentRef<() => number>
}

/** Builds a stable emitter while reading the frame's latest callback and clock refs. */
export function usePhysicsFrameObservationEmitter({
  onObservationRef,
  chartIdRef,
  wallClockRef
}: PhysicsFrameObservationOptions): (
  type: PhysicsFrameObservationType,
  payload?: PhysicsFrameObservationPayload
) => void {
  return useCallback((type, payload) => {
    const onObservation = onObservationRef.current
    if (!onObservation) return

    const base = {
      timestamp: wallClockRef.current(),
      chartType: CHART_TYPE,
      chartId: chartIdRef.current
    }
    if (type === "hover" || type === "click") {
      onObservation({
        ...base,
        type,
        datum: (payload?.datum as Datum) ?? {},
        x: payload?.x ?? 0,
        y: payload?.y ?? 0
      })
    } else if (type === "focus") {
      onObservation({
        ...base,
        type,
        datum: (payload?.datum as Datum) ?? {},
        inputType:
          payload?.inputType === "touch"
            ? "pointer"
            : payload?.inputType ?? "keyboard"
      })
    } else if (type === "activate") {
      onObservation({
        ...base,
        type,
        datum: (payload?.datum as Datum) ?? {},
        inputType: payload?.inputType ?? "keyboard"
      })
    } else {
      onObservation({ ...base, type })
    }
  }, [chartIdRef, onObservationRef, wallClockRef])
}
