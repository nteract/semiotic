import type { Datum } from "./datumTypes"

/** Annotation shape shared by React interaction and headless diagnostics. */
export type ChartAnnotation = Datum

/**
 * Resolve a durable annotation identity without ever falling back to array
 * position. Provenance stable IDs are accepted for agent-authored notes.
 */
export function annotationStableId(
  annotation: ChartAnnotation
): string | undefined {
  const provenance = annotation.provenance as
    | Record<string, unknown>
    | undefined
  const candidate =
    annotation.id ?? annotation.stableId ?? provenance?.stableId
  return candidate == null || candidate === "" ? undefined : String(candidate)
}
