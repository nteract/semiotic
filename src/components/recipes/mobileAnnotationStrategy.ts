import type { Datum } from "../charts/shared/datumTypes"
import { isNoteAnnotation } from "../charts/shared/annotationTypes"

export type MobileAnnotationStrategyMode = "plot" | "callout-list" | "hybrid"

export interface MobileAnnotationStrategyConfig {
  /** Activate the strategy explicitly. When omitted, width/breakpoint decides. */
  active?: boolean
  /** Measured plot/container width in CSS pixels. */
  width?: number
  /** Width at or below which the strategy activates. Default 480. */
  breakpoint?: number
  /** Plot-only, list-only, or hybrid visible-plus-list behavior. Default "hybrid". */
  strategy?: MobileAnnotationStrategyMode
  /** Maximum persistent note annotations left in the plot. Alias: maxAnnotations. */
  maxPlotAnnotations?: number
  maxAnnotations?: number
  /** Minimum number of note annotations kept in the plot. Default 1. */
  minPlotAnnotations?: number
  minVisible?: number
  /** Maximum callout-list items. Default 6. */
  maxCalloutItems?: number
  /** Keep primary/emergency notes in the plot before lower-priority notes. Default true. */
  preservePrimary?: boolean
  /** Prefer mobileText/shortText over full label. Default true. */
  preferShortText?: boolean
  /** Field or function used as an explicit priority score. */
  priorityAccessor?: string | ((annotation: Datum, index: number) => number | undefined)
  /** Optional filter for annotations that should move into the callout list. */
  calloutFilter?: (annotation: Datum, index: number) => boolean
}

export interface MobileAnnotationCalloutItem {
  id: string
  label: string
  shortLabel?: string
  pointId?: string | number
  emphasis?: string
  source?: string
  priority: number
  annotation: Datum
}

export interface MobileAnnotationStrategyResult {
  active: boolean
  strategy: MobileAnnotationStrategyMode
  budget: number
  visible: Datum[]
  deferred: Datum[]
  calloutList: MobileAnnotationCalloutItem[]
  hidden: Datum[]
}

function isObject(value: unknown): value is Datum {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function textValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

function annotationLabel(annotation: Datum, preferShortText: boolean): string | undefined {
  const note = isObject(annotation.note) ? annotation.note : undefined
  if (preferShortText) {
    return (
      textValue(annotation.mobileText) ||
      textValue(annotation.shortText) ||
      textValue(annotation.label) ||
      textValue(note?.mobileText) ||
      textValue(note?.shortText) ||
      textValue(note?.label) ||
      textValue(note?.title)
    )
  }
  return (
    textValue(annotation.label) ||
    textValue(annotation.mobileText) ||
    textValue(annotation.shortText) ||
    textValue(note?.label) ||
    textValue(note?.title)
  )
}

function explicitPriority(
  annotation: Datum,
  index: number,
  accessor: MobileAnnotationStrategyConfig["priorityAccessor"]
): number | undefined {
  if (!accessor) return undefined
  const value = typeof accessor === "function" ? accessor(annotation, index) : annotation[accessor]
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function priorityScore(
  annotation: Datum,
  index: number,
  config: MobileAnnotationStrategyConfig
): number {
  const explicit = explicitPriority(annotation, index, config.priorityAccessor)
  if (explicit !== undefined) return explicit

  let score = 1000 - index
  const emphasis = String(annotation.emphasis ?? "").toLowerCase()
  if (emphasis === "primary" || emphasis === "critical") score += 10000
  if (emphasis === "secondary") score -= 1000
  if (annotation.priority === "high") score += 5000
  if (annotation.priority === "low") score -= 1500
  if (typeof annotation.priority === "number") score += annotation.priority * 100

  const provenance = isObject(annotation.provenance) ? annotation.provenance : undefined
  if (typeof provenance?.confidence === "number") score += provenance.confidence * 100

  const lifecycle = isObject(annotation.lifecycle) ? annotation.lifecycle : undefined
  const freshness = String(lifecycle?.freshness ?? "").toLowerCase()
  if (freshness === "expired" || freshness === "stale") score -= 3000

  return score
}

function withMobileCopy(annotation: Datum, preferShortText: boolean): Datum {
  if (!preferShortText) return annotation
  const label = annotationLabel(annotation, true)
  if (!label || typeof annotation.label !== "string") return annotation
  return { ...annotation, label }
}

function calloutItem(annotation: Datum, index: number, priority: number, preferShortText: boolean): MobileAnnotationCalloutItem | null {
  const label = annotationLabel(annotation, preferShortText)
  if (!label) return null
  const id =
    textValue(annotation.id) ||
    textValue(annotation.key) ||
    textValue(annotation.pointId) ||
    `annotation-${index + 1}`
  const source = isObject(annotation.provenance)
    ? textValue(annotation.provenance.source) || textValue(annotation.provenance.authorKind)
    : undefined
  return {
    id,
    label,
    shortLabel: textValue(annotation.shortText),
    pointId: annotation.pointId as string | number | undefined,
    emphasis: typeof annotation.emphasis === "string" ? annotation.emphasis : undefined,
    source,
    priority,
    annotation,
  }
}

export function mobileAnnotationStrategy(
  annotations: readonly Datum[] | undefined,
  config: MobileAnnotationStrategyConfig = {}
): MobileAnnotationStrategyResult {
  const all = Array.isArray(annotations) ? annotations.filter(isObject) : []
  const breakpoint = config.breakpoint ?? 480
  const active = config.active ?? (config.width == null ? true : config.width <= breakpoint)
  const strategy = config.strategy ?? "hybrid"
  const preferShortText = config.preferShortText !== false
  const preservePrimary = config.preservePrimary !== false
  const budget = Math.max(
    0,
    config.maxPlotAnnotations ??
      config.maxAnnotations ??
      (strategy === "callout-list" ? 1 : 2)
  )
  const minVisible = Math.max(0, config.minPlotAnnotations ?? config.minVisible ?? 1)

  if (!active || strategy === "plot") {
    return {
      active,
      strategy,
      budget: all.length,
      visible: preferShortText ? all.map((a) => withMobileCopy(a, preferShortText)) : all,
      deferred: [],
      calloutList: [],
      hidden: [],
    }
  }

  const structural: Datum[] = []
  const notes = all
    .map((annotation, index) => ({ annotation, index, priority: priorityScore(annotation, index, config) }))
    .filter((entry) => {
      if (!isNoteAnnotation(entry.annotation)) {
        structural.push(entry.annotation)
        return false
      }
      return true
    })
    .sort((a, b) => b.priority - a.priority)

  const primary = preservePrimary
    ? notes.filter((entry) => String(entry.annotation.emphasis ?? "").toLowerCase() === "primary")
    : []
  const primaryIndexes = new Set(primary.map((entry) => entry.index))
  const remaining = notes.filter((entry) => !primaryIndexes.has(entry.index))
  const visibleNoteEntries = [...primary, ...remaining].slice(0, Math.max(budget, minVisible))
  const visibleIndexes = new Set(visibleNoteEntries.map((entry) => entry.index))
  const deferredEntries = notes.filter((entry) => !visibleIndexes.has(entry.index))

  const visible = [
    ...structural,
    ...visibleNoteEntries
      .sort((a, b) => a.index - b.index)
      .map((entry) => withMobileCopy(entry.annotation, preferShortText)),
  ]
  const deferred = deferredEntries
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.annotation)

  const maxCalloutItems = Math.max(0, config.maxCalloutItems ?? 6)
  const calloutList = deferredEntries
    .filter((entry) => config.calloutFilter ? config.calloutFilter(entry.annotation, entry.index) : true)
    .map((entry) => calloutItem(entry.annotation, entry.index, entry.priority, preferShortText))
    .filter((item): item is MobileAnnotationCalloutItem => !!item)
    .slice(0, maxCalloutItems)

  const listed = new Set(calloutList.map((item) => item.annotation))
  const hidden = deferred.filter((annotation) => !listed.has(annotation))

  return {
    active,
    strategy,
    budget,
    visible,
    deferred,
    calloutList,
    hidden,
  }
}
