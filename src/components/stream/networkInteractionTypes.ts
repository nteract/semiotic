import type { ReactNode } from "react"
import type { Datum } from "../charts/shared/datumTypes"
import type {
  SemanticClickBehavior,
  SemanticHoverBehavior
} from "../charts/shared/semanticInteractions"
import type { OnAnnotationActivateCallback } from "../charts/shared/annotationActivation"
import type { AnnotationContext, HoverData } from "../realtime/types"
import type { AutoPlaceAnnotations } from "../recipes/annotationLayout"
import type { OnObservationCallback } from "../store/ObservationStore"

/** Interaction and annotation callbacks shared by every network chart layout. */
export interface StreamNetworkInteractionProps<Node, Edge> {
  enableHover?: boolean
  tooltipContent?: (d: HoverData) => ReactNode
  customHoverBehavior?: SemanticHoverBehavior<HoverData>
  customClickBehavior?: SemanticClickBehavior<HoverData>
  /** Observation callback — emits hover/click events to the ObservationStore and this callback. */
  onObservation?: OnObservationCallback
  /** @internal HOC observation callback forwarded only to annotation widgets. */
  annotationObservationCallback?: OnObservationCallback
  /** Chart instance identifier for observation filtering. */
  chartId?: string
  onTopologyChange?: (nodes: Node[], edges: Edge[]) => void
  annotations?: Datum[]
  /** Observe activation of widget annotations without replacing widget behavior. */
  onAnnotationActivate?: OnAnnotationActivateCallback
  autoPlaceAnnotations?: AutoPlaceAnnotations
  svgAnnotationRules?: (
    annotation: Datum,
    index: number,
    context: AnnotationContext
  ) => ReactNode
}
