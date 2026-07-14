import type { OnObservationCallback } from "../store/ObservationStore"
import type {
  SemanticClickBehavior,
  SemanticHoverBehavior
} from "../charts/shared/semanticInteractions"
import type { OnAnnotationActivateCallback } from "../charts/shared/annotationActivation"

/** Interaction props shared by all Stream Frame families. */
export interface StreamSemanticInteractionProps<Hover> {
  customHoverBehavior?: SemanticHoverBehavior<Hover>
  customClickBehavior?: SemanticClickBehavior<Hover>
  /** Structured interaction observations, including semantic focus/activate. */
  onObservation?: OnObservationCallback
  /** @internal HOC observation callback forwarded only to annotation widgets. */
  annotationObservationCallback?: OnObservationCallback
  /** Chart instance identifier included in observation events. */
  chartId?: string
  /** Observe activation of widget annotations without replacing widget behavior. */
  onAnnotationActivate?: OnAnnotationActivateCallback
}
