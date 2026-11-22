import type { AutoPlaceAnnotations } from "../../recipes/annotationLayout"
import { filterAnnotationsByStatus } from "./annotationStatusFilter"
import { isNoteAnnotation } from "./annotationTypes"
import type { Datum } from "./datumTypes"

/** Notes with authored text can supply a separate label for each end of the familiarity scale. */
export function audienceNoteText(note: Datum, variant: "long" | "short"): string | undefined {
  if (!isNoteAnnotation(note) || note.type === "widget" ||
    (note.label != null && typeof note.label !== "string")) return undefined
  const text: unknown = note.audienceText?.[variant]
  return typeof text === "string" && text.trim() ? text : undefined
}

export function fullAudienceNoteText(note: Datum): string | undefined {
  return audienceNoteText(note, "long") ?? (audienceNoteText(note, "short") ? note.label : undefined)
}

export function visibleChartAnnotations(annotations: unknown): Datum[] {
  return Array.isArray(annotations) ? filterAnnotationsByStatus<Datum>(annotations) : []
}

/** Preserve authored explanations in the chart's accessible text at every viewport width. */
export function withAudienceNoteDescriptions(
  description: string | undefined,
  annotations: readonly Datum[] | undefined,
  layout: AutoPlaceAnnotations | undefined
): string | undefined {
  if (typeof layout !== "object" || !layout?.audience || !annotations?.length) return description
  const labels = visibleChartAnnotations(annotations).map(fullAudienceNoteText).filter(Boolean)
  return labels.length ? [description, ...labels].filter(Boolean).join(" ") : description
}
