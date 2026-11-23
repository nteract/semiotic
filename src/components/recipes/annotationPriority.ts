import { isNoteAnnotation } from "../charts/shared/annotationTypes"
import type { Datum } from "../charts/shared/datumTypes"
import { clamp } from "../utils/clamp"

type PriorityAccessor = string | ((annotation: Datum, index: number) => number | undefined)

function priorityScore(annotation: Datum, emphasis: string, index: number, accessor?: PriorityAccessor): number {
  const explicit = typeof accessor === "function" ? accessor(annotation, index) : accessor && annotation[accessor]
  if (typeof explicit === "number" && Number.isFinite(explicit)) return explicit
  let score = emphasis === "primary" || emphasis === "critical" ? 100 : emphasis === "secondary" ? 10 : 50
  const priority = annotation.priority
  if (priority === "high") score += 50
  if (priority === "low") score -= 15
  if (Number.isFinite(priority)) score += priority
  const confidence = annotation.provenance?.confidence
  if (Number.isFinite(confidence)) score += clamp(confidence, 0, 1) * 15
  switch (String(annotation.lifecycle?.freshness).toLowerCase()) {
    case "fresh": return score + 8
    case "aging": return score + 4
    case "stale": return score - 1
    case "expired": return score - 200
    default: return score
  }
}

export function rankAnnotationNotes(
  annotations: readonly Datum[],
  budget: number,
  minVisible: number,
  options: { shedSecondary?: boolean; preservePrimary?: boolean; priorityAccessor?: PriorityAccessor } = {}
) {
  const ranked = []
  let protectedCount = 0
  let eligibleCount = 0
  for (const [index, annotation] of annotations.entries()) {
    if (!isNoteAnnotation(annotation)) continue
    const emphasis = String(annotation.emphasis ?? "").toLowerCase()
    const protectedNote = annotation.defensive === true || (options.preservePrimary !== false && emphasis === "primary")
    const eligible = protectedNote || !options.shedSecondary || emphasis !== "secondary"
    if (protectedNote) protectedCount++
    if (eligible) eligibleCount++
    ranked.push({ index, annotation, tier: protectedNote ? 2 : eligible ? 1 : 0,
      priority: priorityScore(annotation, emphasis, index, options.priorityAccessor) })
  }
  ranked.sort((a, b) => b.tier - a.tier || b.priority - a.priority || a.index - b.index)
  const visibleCount = Math.min(ranked.length, Math.max(protectedCount, minVisible, Math.min(budget, eligibleCount)))
  return { ranked, visibleCount: Math.floor(visibleCount) }
}
