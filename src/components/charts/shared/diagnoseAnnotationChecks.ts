import { annotationBudget } from "../../recipes/annotationDensity"
import {
  annotationDrawsConnector,
  annotationType,
  isNoteAnnotation,
} from "./annotationTypes"
import type { Datum } from "./datumTypes"
import type { Diagnosis } from "./diagnoseTypes"

// Connector-necessity (Rahman et al.'s "Placement"): a note should sit next to
// its target, with a connector only when proximity is infeasible. Two cheap
// static smells — a note placed far from its anchor with no connector at all,
// and a connector long enough to suggest the note could have been adjacent.
// Advisory only (warnings). The label/callout default offset (~42px) sits well
// under both thresholds, so default-placed notes never trip this.
const FAR_PLACEMENT_PX = 120
const VERY_LONG_CONNECTOR_PX = 250

export function checkAnnotationConnectors(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const anns = Array.isArray(props.annotations) ? (props.annotations as Datum[]) : null
  if (!anns) return
  for (const a of anns) {
    if (!a || typeof a !== "object") continue
    const type = annotationType(a)
    // Widgets are HTML affordances rather than anchored SVG notes, so the
    // connector-distance diagnostic does not apply to them.
    if (!isNoteAnnotation(a) || type === "widget") continue
    const dx = typeof a.dx === "number" ? a.dx : 0
    const dy = typeof a.dy === "number" ? a.dy : 0
    const dist = Math.hypot(dx, dy)
    const label = typeof a.label === "string" ? a.label : typeof a.title === "string" ? a.title : type
    // `text` never draws a connector; label/callout draw one unless disabled.
    const hasConnector = annotationDrawsConnector(a)

    if (!hasConnector && dist > FAR_PLACEMENT_PX) {
      out.push({
        severity: "warning",
        code: "ANNOTATION_FAR_NO_CONNECTOR",
        message: `Annotation "${label}" sits ~${Math.round(dist)}px from its anchor with no connector — a reader can't tell what it refers to.`,
        fix: `Add a connector (connector: { end: "arrow" }, the label/callout default) or place the note adjacent to its target (smaller dx/dy).`,
      })
    } else if (hasConnector && dist > VERY_LONG_CONNECTOR_PX) {
      out.push({
        severity: "warning",
        code: "ANNOTATION_LONG_CONNECTOR",
        message: `Annotation "${label}" uses a very long connector (~${Math.round(dist)}px); prefer placing the note adjacent to its target when space allows.`,
        fix: `Reduce dx/dy so the note sits near its target, or keep the long connector only if proximity is genuinely infeasible.`,
      })
    }
  }
}

// Amount & density (Rahman et al.'s "Amount of annotation": balance explanatory
// support against clutter). A soft, advisory smell — count note-like
// annotations against the same area-derived budget the runtime density pass
// uses, and suggest emphasis or progressive disclosure when they pile up.
// Reference lines, bands and overlays don't count toward the budget.
export function checkAnnotationDensity(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const anns = Array.isArray(props.annotations) ? (props.annotations as Datum[]) : null
  if (!anns) return

  const noteCount = anns.filter(isNoteAnnotation).length
  if (noteCount === 0) return

  const width = typeof props.width === "number" ? props.width : 600
  const height = typeof props.height === "number" ? props.height : 400
  const budget = annotationBudget(width, height)
  if (!Number.isFinite(budget) || noteCount <= budget) return

  out.push({
    severity: "warning",
    code: "ANNOTATION_DENSITY",
    message: `${noteCount} note annotations on a ${width}×${height} chart exceed the ~${budget} notes the plot area carries comfortably — the chart may read as cluttered.`,
    fix: `Mark the essential notes emphasis: "primary" and let density management shed the rest (autoPlaceAnnotations: { density: true }), enable progressive disclosure to reveal secondary notes on hover, or give the chart more room.`,
  })
}
