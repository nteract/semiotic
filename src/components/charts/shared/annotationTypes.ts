import type { Datum } from "./datumTypes"

/**
 * Note-like annotations compete for placement and density budgets. Keep this
 * taxonomy centralized because layout, diagnostics, and accessibility checks
 * all need to agree on what counts as a note.
 */
export const NOTE_ANNOTATION_TYPES = [
  "label",
  "callout",
  "callout-circle",
  "callout-rect",
  "text",
  "widget",
] as const

export type NoteAnnotationType = (typeof NOTE_ANNOTATION_TYPES)[number]

/** Note types whose default renderer draws a connector unless disabled. */
export const CONNECTOR_ANNOTATION_TYPES = [
  "label",
  "callout",
  "callout-circle",
  "callout-rect",
] as const

const NOTE_TYPE_SET = new Set<string>(NOTE_ANNOTATION_TYPES)
const CONNECTOR_TYPE_SET = new Set<string>(CONNECTOR_ANNOTATION_TYPES)

export function annotationType(annotation: Datum): string {
  return typeof annotation?.type === "string" ? annotation.type : ""
}

export function isNoteAnnotation(annotation: Datum): boolean {
  return !!annotation && typeof annotation === "object" && NOTE_TYPE_SET.has(annotationType(annotation))
}

export function annotationDisablesConnector(annotation: Datum): boolean {
  return Array.isArray(annotation?.disable) &&
    (annotation.disable as unknown[]).includes("connector")
}

export function annotationDrawsConnector(annotation: Datum): boolean {
  return CONNECTOR_TYPE_SET.has(annotationType(annotation)) &&
    !annotationDisablesConnector(annotation)
}
