import { rankAnnotationNotes } from "./annotationPriority"
import type { Datum } from "../charts/shared/datumTypes"

/**
 * M3 — Amount & density management (Rahman et al.'s sixth consideration:
 * "balance explanatory support against clutter").
 *
 * A pure, geometry-light pass that decides *which* note-like annotations should
 * stay on screen when there are more than the plot area can carry without
 * clutter. It does not move anything (that is M2's `annotationLayout`); it
 * partitions notes into a persistent set and a deferred set by importance and
 * freshness, with the lowest-priority notes shed first.
 *
 * Priority signals, reusing what M0/M1 already attach:
 *   • `emphasis` (M1) — `"primary"` is the floor (never shed); `"secondary"`
 *     ranks below an un-emphasised note.
 *   • `provenance.confidence` (M0) — a small nudge so a higher-confidence note
 *     outranks a lower-confidence one at the same emphasis.
 *   • `lifecycle.freshness` (M0) — `fresh > aging > stale`; `expired` is shed
 *     first.
 *
 * Only note types compete for the budget; reference lines, bands, enclosures
 * and statistical overlays pass through untouched (they are not "clutter notes"
 * in the paper's sense and a density cap shedding a threshold line would be
 * surprising).
 *
 * The persistent set is the floor and is never empty when any note exists — the
 * paper's "keep the core message persistent; hover is not guaranteed."
 */

/** Plot area (px²) allotted per note before the budget tightens. */
export const DEFAULT_AREA_PER_ANNOTATION = 20000
/** Notes always kept regardless of the area-derived budget. */
const DEFAULT_MIN_VISIBLE = 1

export interface AnnotationDensityConfig {
  /**
   * Hard cap on simultaneously-persistent notes. When set, overrides the
   * `width`×`height`-derived budget.
   */
  maxAnnotations?: number
  /**
   * Plot area (px²) allotted per note when deriving the budget from the chart
   * dimensions. Larger ⇒ fewer notes. Default {@link DEFAULT_AREA_PER_ANNOTATION}.
   */
  areaPerAnnotation?: number
  /** Minimum notes kept regardless of budget. Default 1. */
  minVisible?: number
}

export interface AnnotationDensityOptions extends AnnotationDensityConfig {
  annotations: ReadonlyArray<Datum>
  /** Plot width in px (used to derive the budget when `maxAnnotations` is unset). */
  width: number
  /** Plot height in px. */
  height: number
}

export interface AnnotationDensityResult {
  /** Notes kept on screen plus every non-note annotation, in author order. */
  visible: Datum[]
  /** Notes shed by the budget, in author order. Empty when nothing is shed. */
  deferred: Datum[]
  /** The note budget that produced this partition. */
  budget: number
}

/**
 * Derive the note budget for a plot. Exported so the clutter diagnostic
 * (`diagnoseConfig`) and the runtime pass agree on the same threshold.
 */
export function annotationBudget(
  width: number,
  height: number,
  config: AnnotationDensityConfig = {}
): number {
  if (typeof config.maxAnnotations === "number" && Number.isFinite(config.maxAnnotations)) {
    return Math.max(0, Math.floor(config.maxAnnotations))
  }
  if (!(width > 0) || !(height > 0)) return Infinity
  const per = config.areaPerAnnotation && config.areaPerAnnotation > 0
    ? config.areaPerAnnotation
    : DEFAULT_AREA_PER_ANNOTATION
  return Math.max(1, Math.round((width * height) / per))
}

/**
 * Partition annotations into a persistent (visible) set and a deferred set
 * given a note budget. Pure and deterministic; preserves author order within
 * each returned array.
 */
export function annotationDensity(options: AnnotationDensityOptions): AnnotationDensityResult {
  const { annotations, width, height } = options
  const minVisible = Math.max(0, options.minVisible ?? DEFAULT_MIN_VISIBLE)
  const budget = annotationBudget(width, height, options)

  const { ranked, visibleCount } = rankAnnotationNotes(annotations, budget, minVisible)
  const shed = new Set(ranked.slice(visibleCount).map(entry => entry.index))
  const visible: Datum[] = []
  const deferred: Datum[] = []
  annotations.forEach((note, index) => {
    if (shed.has(index)) deferred.push(note)
    else visible.push(note)
  })
  return { visible, deferred, budget }
}
