import { useCallback } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import {
  emitClickObservations,
  emitHoverObservations,
  type SemanticClickBehavior,
  type SemanticHoverBehavior
} from "../charts/shared/semanticInteractions"
import type { HoverData } from "../realtime/types"
import type { OnObservationCallback } from "../store/ObservationStore"

const CHART_TYPE = "StreamNetworkFrame"

interface NetworkObservationBehaviorOptions {
  customHoverBehavior?: SemanticHoverBehavior<HoverData>
  customClickBehavior?: SemanticClickBehavior<HoverData>
  onObservation?: OnObservationCallback
  chartId?: string
}

/** Adds the standard observation vocabulary to the network behavior callbacks. */
export function useNetworkObservationBehaviors({
  customHoverBehavior: customHoverBehaviorProp,
  customClickBehavior: customClickBehaviorProp,
  onObservation,
  chartId
}: NetworkObservationBehaviorOptions): {
  customHoverBehavior: SemanticHoverBehavior<HoverData>
  customClickBehavior: SemanticClickBehavior<HoverData>
} {
  const customHoverBehavior = useCallback<SemanticHoverBehavior<HoverData>>(
    (hover, context) => {
      customHoverBehaviorProp?.(hover, context)
      emitHoverObservations({
        onObservation,
        datum: hover ? ((hover.data || hover) as Datum) : null,
        x: hover?.x,
        y: hover?.y,
        chartType: CHART_TYPE,
        chartId,
        context
      })
    },
    [customHoverBehaviorProp, onObservation, chartId]
  )

  const customClickBehavior = useCallback<SemanticClickBehavior<HoverData>>(
    (hover, context) => {
      customClickBehaviorProp?.(hover, context)
      emitClickObservations({
        onObservation,
        datum: hover ? ((hover.data || hover) as Datum) : null,
        x: hover?.x,
        y: hover?.y,
        chartType: CHART_TYPE,
        chartId,
        context
      })
    },
    [customClickBehaviorProp, onObservation, chartId]
  )

  return { customHoverBehavior, customClickBehavior }
}
