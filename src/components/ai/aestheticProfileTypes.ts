export type AestheticFeatureId =
  | "mark-scaffold-hierarchy"
  | "palette-authorship"
  | "palette-economy"
  | "typographic-hierarchy"
  | "theme-coherence"
  | "editorial-emphasis"

export type AestheticFeatureWeights = Partial<
  Record<AestheticFeatureId, number>
>

export interface AestheticThresholds {
  /** Minimum data-mark contrast relative to scaffold contrast. Default 2. */
  hierarchyRatio?: number
  /** Lowest useful scaffold/background contrast. Default 1.1. */
  scaffoldContrastMin?: number
  /** Highest subordinate scaffold/background contrast. Default 2. */
  scaffoldContrastMax?: number
  /** Desired title-size / tick-size ratio. Default 1.25. */
  titleScaleRatio?: number
  /** Maximum categorical colors before economy declines. Default 7. */
  categoricalColorMax?: number
  /** Smallest authored focal share treated as deliberate. Default 0.05. */
  emphasisRatioMin?: number
  /** Largest focal share treated as selective. Default 0.35. */
  emphasisRatioMax?: number
}

/**
 * An organization's explicit, serializable policy for machine-visible
 * presentation features. Values are priorities, not claims of universal taste.
 * Set a weight to 0 to remove that feature from the score.
 */
export interface AestheticProfile {
  /** Name surfaced in reports so a score always names whose taste it encodes. */
  name?: string
  /** Non-negative relative importance per feature. */
  weights?: AestheticFeatureWeights
  /** Optional boundary tuning for the measurable feature formulas. */
  thresholds?: AestheticThresholds
  /** Organizational rationale surfaced beside a feature's measured evidence. */
  rationales?: Partial<Record<AestheticFeatureId, string>>
  /** Weighted score needed for `ok: true`. Default 70. */
  minimumScore?: number
}
