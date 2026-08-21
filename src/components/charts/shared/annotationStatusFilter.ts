/**
 * Editorial-status visibility filter, kept free of the rest of the
 * annotation-provenance module so SVG overlays do not pull the AI graph.
 */

export interface AnnotationStatusVisibility {
  showRetractedAnnotations?: boolean
  showSupersededAnnotations?: boolean
}

export type StatusFilterable = {
  provenance?: { stableId?: string }
  lifecycle?: { status?: string; supersedes?: string }
}

export function filterAnnotationsByStatus<T extends StatusFilterable>(
  annotations: ReadonlyArray<T>,
  options: AnnotationStatusVisibility = {}
): T[] {
  const showRetracted = options.showRetractedAnnotations === true
  const showSuperseded = options.showSupersededAnnotations === true

  const supersededIds = new Set<string>()
  for (const a of annotations) {
    const target = a?.lifecycle?.supersedes
    if (target && a?.lifecycle?.status !== "retracted") supersededIds.add(target)
  }

  return annotations.filter((annotation) => {
    if (annotation?.lifecycle?.status === "retracted" && !showRetracted) return false
    const myId = annotation?.provenance?.stableId
    return !(myId && supersededIds.has(myId) && !showSuperseded)
  })
}
