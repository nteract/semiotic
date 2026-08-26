import type { Datum } from "../charts/shared/datumTypes"
import { ruleMatches, type StyleRule } from "../charts/shared/styleRules"
import type { SemioticTheme } from "../store/themeCore"
import { LIGHT_THEME } from "../store/themeCore"
import {
  auditVisualHierarchy,
  type VisualHierarchyAuditResult
} from "./auditVisualHierarchy"
import {
  canonicalColorEvidence,
  colorEvidenceToHex,
  compositeColorEvidence,
  parseColorEvidence
} from "./colorEvidence"
import type {
  AestheticFeatureId,
  AestheticFeatureWeights,
  AestheticProfile,
  AestheticThresholds
} from "./aestheticProfileTypes"

export type AestheticFeatureStatus = "pass" | "warn" | "manual" | "disabled"

export interface AestheticFeatureResult {
  readonly id: AestheticFeatureId
  readonly label: string
  readonly status: AestheticFeatureStatus
  /** Normalized machine evidence score from 0..1. */
  readonly score: number
  /** Resolved organizational importance. Zero disables the feature. */
  readonly weight: number
  /** `score * weight`, retained so the aggregate is fully reconstructable. */
  readonly contribution: number
  readonly message: string
  readonly rationale?: string
  readonly evidence: Readonly<Record<string, string | number | boolean>>
}

export interface EvaluateAestheticsOptions {
  /** Resolved chart theme. Its `aesthetics` profile is used unless `profile` overrides it. */
  readonly theme?: SemioticTheme
  /** One-off policy override; useful for comparing organizational profiles. */
  readonly profile?: AestheticProfile
}

export interface AestheticEvaluationResult {
  readonly component: string
  readonly profile: string
  readonly ok: boolean
  /** Weighted 0..100 result, or null when every feature weight is zero. */
  readonly score: number | null
  readonly minimumScore: number
  readonly weightedPoints: number
  readonly totalWeight: number
  readonly features: ReadonlyArray<AestheticFeatureResult>
  readonly method: "weighted-machine-visible-features"
}

export const DEFAULT_AESTHETIC_WEIGHTS: Readonly<
  Record<AestheticFeatureId, number>
> = Object.freeze({
  "mark-scaffold-hierarchy": 3,
  "palette-authorship": 1,
  "palette-economy": 1,
  "typographic-hierarchy": 1,
  "theme-coherence": 2,
  "editorial-emphasis": 1
})

export const DEFAULT_AESTHETIC_THRESHOLDS: Readonly<
  Required<AestheticThresholds>
> = Object.freeze({
  hierarchyRatio: 2,
  scaffoldContrastMin: 1.1,
  scaffoldContrastMax: 2,
  titleScaleRatio: 1.25,
  categoricalColorMax: 7,
  emphasisRatioMin: 0.05,
  emphasisRatioMax: 0.35
})

export const DEFAULT_AESTHETIC_PROFILE: Readonly<AestheticProfile> =
  Object.freeze({
    name: "Semiotic balanced",
    weights: DEFAULT_AESTHETIC_WEIGHTS,
    thresholds: DEFAULT_AESTHETIC_THRESHOLDS,
    minimumScore: 70
  })

export const AESTHETICS_OFF_PROFILE: Readonly<AestheticProfile> = Object.freeze(
  {
    name: "Aesthetics off",
    weights: Object.freeze(
      Object.fromEntries(
        Object.keys(DEFAULT_AESTHETIC_WEIGHTS).map((id) => [id, 0])
      ) as AestheticFeatureWeights
    ),
    minimumScore: 0
  }
)

const D3_CATEGORY_10 = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf"
]

const TABLEAU_10 = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc949",
  "#af7aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ab"
]

const UBIQUITOUS_PALETTES = [D3_CATEGORY_10, TABLEAU_10]
const UBIQUITOUS_NAMED_SCHEMES = new Set(["category10", "tableau10"])
const CYCLE_BY_CATEGORY_COMPONENTS = new Set([
  "DonutChart",
  "PieChart",
  "SwimlaneChart"
])

const FEATURE_LABELS: Record<AestheticFeatureId, string> = {
  "mark-scaffold-hierarchy": "Mark–scaffold hierarchy",
  "palette-authorship": "Palette authorship",
  "palette-economy": "Palette economy",
  "typographic-hierarchy": "Typographic hierarchy",
  "theme-coherence": "Theme coherence",
  "editorial-emphasis": "Editorial emphasis"
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function finiteOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? (value as number) : fallback
}

function resolveThresholds(
  profile: AestheticProfile
): Required<AestheticThresholds> {
  const requested = profile.thresholds ?? {}
  const scaffoldContrastMin = Math.max(
    1,
    finiteOr(
      requested.scaffoldContrastMin,
      DEFAULT_AESTHETIC_THRESHOLDS.scaffoldContrastMin
    )
  )
  const emphasisRatioMin = clamp01(
    finiteOr(
      requested.emphasisRatioMin,
      DEFAULT_AESTHETIC_THRESHOLDS.emphasisRatioMin
    )
  )
  return {
    hierarchyRatio: Math.max(
      1,
      finiteOr(
        requested.hierarchyRatio,
        DEFAULT_AESTHETIC_THRESHOLDS.hierarchyRatio
      )
    ),
    scaffoldContrastMin,
    scaffoldContrastMax: Math.max(
      scaffoldContrastMin,
      finiteOr(
        requested.scaffoldContrastMax,
        DEFAULT_AESTHETIC_THRESHOLDS.scaffoldContrastMax
      )
    ),
    titleScaleRatio: Math.max(
      1.01,
      finiteOr(
        requested.titleScaleRatio,
        DEFAULT_AESTHETIC_THRESHOLDS.titleScaleRatio
      )
    ),
    categoricalColorMax: Math.max(
      1,
      Math.round(
        finiteOr(
          requested.categoricalColorMax,
          DEFAULT_AESTHETIC_THRESHOLDS.categoricalColorMax
        )
      )
    ),
    emphasisRatioMin,
    emphasisRatioMax: Math.max(
      emphasisRatioMin,
      clamp01(
        finiteOr(
          requested.emphasisRatioMax,
          DEFAULT_AESTHETIC_THRESHOLDS.emphasisRatioMax
        )
      )
    )
  }
}

function normalizeColor(value: unknown): string | undefined {
  return canonicalColorEvidence(value)
}

function colorArray(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.values(value)
      : [value]
  return values.map(normalizeColor).filter((color): color is string => !!color)
}

function colorSchemeColors(value: unknown): string[] {
  return Array.isArray(value) || (value && typeof value === "object")
    ? colorArray(value)
    : []
}

function isUbiquitousPalette(colors: ReadonlyArray<string>): boolean {
  if (colors.length < 4) return false
  return UBIQUITOUS_PALETTES.some(
    (palette) =>
      colors.length === palette.length &&
      colors.every((color, index) => color === palette[index])
  )
}

function explicitColors(props: Datum): string[] {
  const framePieceStyle =
    props.frameProps &&
    typeof props.frameProps === "object" &&
    props.frameProps.pieceStyle &&
    typeof props.frameProps.pieceStyle === "object"
      ? (props.frameProps.pieceStyle as Datum)
      : undefined
  const colors = [
    ...colorSchemeColors(props.colorScheme),
    ...colorArray(props.color),
    ...colorArray(props.fill),
    ...colorArray(props.stroke),
    ...colorArray(framePieceStyle?.fill),
    ...colorArray(framePieceStyle?.stroke)
  ]
  const rules = Array.isArray(props.styleRules)
    ? (props.styleRules as StyleRule[])
    : []
  for (const rule of rules) {
    if (!rule.style || typeof rule.style === "function") continue
    colors.push(
      ...colorArray(rule.style.fill),
      ...colorArray(rule.style.stroke)
    )
  }
  return Array.from(new Set(colors))
}

function authoredFillColors(props: Datum): string[] {
  const framePieceStyle =
    props.frameProps &&
    typeof props.frameProps === "object" &&
    props.frameProps.pieceStyle &&
    typeof props.frameProps.pieceStyle === "object"
      ? (props.frameProps.pieceStyle as Datum)
      : undefined
  const colors = [
    ...colorSchemeColors(props.colorScheme),
    ...colorArray(props.color),
    ...colorArray(props.fill),
    ...colorArray(framePieceStyle?.fill)
  ]
  const rules = Array.isArray(props.styleRules)
    ? (props.styleRules as StyleRule[])
    : []
  for (const rule of rules) {
    if (!rule.style || typeof rule.style === "function") continue
    colors.push(...colorArray(rule.style.fill))
  }
  return Array.from(new Set(colors))
}

function accessorValues(props: Datum, accessor: unknown): string[] {
  const data = Array.isArray(props.data) ? (props.data as Datum[]) : []
  if (typeof accessor === "string") {
    return Array.from(new Set(data.map((datum) => String(datum[accessor]))))
  }
  if (typeof accessor === "function") {
    return Array.from(
      new Set(data.map((datum, index) => String(accessor(datum, index))))
    )
  }
  return []
}

function matchingRuleFillColors(props: Datum): string[] {
  const data = Array.isArray(props.data) ? (props.data as Datum[]) : []
  const rules = Array.isArray(props.styleRules)
    ? (props.styleRules as StyleRule[])
    : []
  const valueAccessor =
    typeof props.valueAccessor === "string"
      ? props.valueAccessor
      : typeof props.yAccessor === "string"
        ? props.yAccessor
        : "value"
  const categoryAccessor =
    typeof props.categoryAccessor === "string"
      ? props.categoryAccessor
      : "category"
  const colors: string[] = []
  for (const rule of rules) {
    if (!rule.style || typeof rule.style === "function") continue
    if (
      data.some((datum, index) =>
        ruleMatches(rule, datum, {
          value: Number(datum[valueAccessor]),
          category: String(datum[categoryAccessor] ?? ""),
          index
        })
      )
    ) {
      colors.push(...colorArray(rule.style.fill))
    }
  }
  return Array.from(new Set(colors))
}

function dataColors(
  component: string,
  props: Datum,
  theme: SemioticTheme
): string[] {
  const explicit = colorSchemeColors(props.colorScheme)
  const direct = colorArray(props.color)
  const colorByValues = accessorValues(props, props.colorBy)
  const cyclesByCategory = CYCLE_BY_CATEGORY_COMPONENTS.has(component)
  const categoryValues = cyclesByCategory
    ? accessorValues(props, props.categoryAccessor ?? "category")
    : []
  const schemeMap =
    props.colorScheme &&
    typeof props.colorScheme === "object" &&
    !Array.isArray(props.colorScheme)
      ? (props.colorScheme as Record<string, unknown>)
      : undefined
  const mappedValues = (values: string[], fallback: "gray" | "theme") =>
    values.map(
      (value, index) =>
        normalizeColor(schemeMap?.[value]) ??
        (fallback === "gray"
          ? "#999999"
          : theme.colors.categorical.length > 0
            ? theme.colors.categorical[index % theme.colors.categorical.length]
            : "#007bff")
    )
  const palette =
    colorByValues.length > 0
      ? schemeMap
        ? mappedValues(colorByValues, "gray")
        : explicit.length > 0
          ? explicit
          : theme.colors.categorical
      : direct.length > 0
        ? direct
        : categoryValues.length > 0 && schemeMap
          ? mappedValues(categoryValues, "theme")
          : explicit.length > 0 && !schemeMap
            ? explicit
            : theme.colors.categorical
  const visibleRoleCount = Math.max(
    1,
    colorByValues.length || categoryValues.length || 1
  )
  const base =
    colorByValues.length > 0 || categoryValues.length > 0
      ? palette.slice(0, Math.min(palette.length, visibleRoleCount))
      : palette.slice(0, 1)
  const accents = matchingRuleFillColors(props).filter(
    (color) => !base.includes(color)
  )
  return Array.from(new Set([...base, ...accents]))
}

function hierarchyBackground(theme: SemioticTheme): string {
  const rawSurface = theme.colors.surface ?? theme.colors.background
  const surface = parseColorEvidence(rawSurface)
  const background = parseColorEvidence(theme.colors.background)
  if (!surface) return rawSurface
  if (surface.a === 1)
    return colorEvidenceToHex(surface) ?? rawSurface
  if (!background) return rawSurface
  const composited = compositeColorEvidence(surface, background)
  return composited
    ? (colorEvidenceToHex(composited) ?? rawSurface)
    : rawSurface
}

function hierarchyScore(
  audit: VisualHierarchyAuditResult,
  thresholds: Required<AestheticThresholds>
): number {
  if (!audit.evidence) return 0.5
  const { weakestDataContrast, scaffoldContrast, hierarchyRatio } =
    audit.evidence
  return Math.min(
    clamp01(weakestDataContrast / 3),
    clamp01(scaffoldContrast / thresholds.scaffoldContrastMin),
    clamp01(thresholds.scaffoldContrastMax / scaffoldContrast),
    clamp01(hierarchyRatio / thresholds.hierarchyRatio)
  )
}

function feature(
  id: AestheticFeatureId,
  score: number,
  weights: Record<AestheticFeatureId, number>,
  message: string,
  evidence: Record<string, string | number | boolean>,
  rationales: AestheticProfile["rationales"],
  statusOverride?: AestheticFeatureStatus
): AestheticFeatureResult {
  const weight = weights[id]
  return {
    id,
    label: FEATURE_LABELS[id],
    status:
      weight === 0
        ? "disabled"
        : (statusOverride ?? (score >= 0.8 ? "pass" : "warn")),
    score,
    weight,
    contribution: score * weight,
    message,
    ...(rationales?.[id] ? { rationale: rationales[id] } : {}),
    evidence
  }
}

function countColorRoles(colors: ReadonlyArray<string>): number {
  return Math.max(1, colors.length)
}

function emphasisEvidence(props: Datum): { ratio: number; authored: boolean } {
  const data = Array.isArray(props.data) ? (props.data as Datum[]) : []
  const rules = Array.isArray(props.styleRules)
    ? (props.styleRules as StyleRule[])
    : []
  if (data.length === 0 || rules.length === 0)
    return { ratio: 0, authored: false }
  const valueAccessor =
    typeof props.valueAccessor === "string"
      ? props.valueAccessor
      : typeof props.yAccessor === "string"
        ? props.yAccessor
        : "value"
  const categoryAccessor =
    typeof props.categoryAccessor === "string"
      ? props.categoryAccessor
      : "category"
  const emphasized = data.filter((datum, index) =>
    rules.some((rule) =>
      ruleMatches(rule, datum, {
        value: Number(datum[valueAccessor]),
        category: String(datum[categoryAccessor] ?? ""),
        index
      })
    )
  ).length
  return { ratio: emphasized / data.length, authored: true }
}

/**
 * Evaluate the machine-visible portion of an organization's aesthetic policy.
 * The aggregate is a transparent weighted quality function, not a universal
 * beauty prediction. Human validation can be collected separately with a
 * validated instrument such as BeauVis.
 */
export function evaluateAesthetics(
  component: string,
  props: Datum,
  options: EvaluateAestheticsOptions = {}
): AestheticEvaluationResult {
  const theme = options.theme ?? LIGHT_THEME
  const profile =
    options.profile ?? theme.aesthetics ?? DEFAULT_AESTHETIC_PROFILE
  const weights = {
    ...DEFAULT_AESTHETIC_WEIGHTS,
    ...(profile.weights ?? {})
  }
  for (const id of Object.keys(weights) as AestheticFeatureId[]) {
    const value = weights[id]
    weights[id] = Number.isFinite(value) ? Math.max(0, value) : 0
  }
  const thresholds = resolveThresholds(profile)
  const colors = dataColors(component, props, theme)
  const background = hierarchyBackground(theme)
  const scaffold = theme.colors.grid
  const hierarchy = auditVisualHierarchy({
    backgroundColor: background,
    dataColors: colors,
    scaffoldColor: scaffold,
    minimumHierarchyRatio: thresholds.hierarchyRatio,
    minimumScaffoldContrast: thresholds.scaffoldContrastMin,
    maximumScaffoldContrast: thresholds.scaffoldContrastMax
  })

  const explicit = explicitColors(props)
  const usesDefaultPalette = isUbiquitousPalette(
    theme.colors.categorical
      .map(normalizeColor)
      .filter((color): color is string => !!color)
  )
  const authoredPalette = authoredFillColors(props)
  const namedScheme =
    typeof props.colorScheme === "string"
      ? props.colorScheme.trim().toLowerCase()
      : undefined
  const paletteSource =
    authoredPalette.length > 0 || namedScheme ? "chart" : "theme"
  const paletteIsUbiquitous =
    paletteSource === "chart"
      ? isUbiquitousPalette(authoredPalette) ||
        (namedScheme ? UBIQUITOUS_NAMED_SCHEMES.has(namedScheme) : false)
      : usesDefaultPalette
  const authorshipScore = paletteIsUbiquitous
    ? 0.2
    : paletteSource === "chart"
      ? 1
      : 0.8

  const roleCount = countColorRoles(colors)
  const economyScore =
    roleCount <= thresholds.categoricalColorMax
      ? 1
      : clamp01(
          1 -
            (roleCount - thresholds.categoricalColorMax) /
              thresholds.categoricalColorMax
        )

  const titleSize = theme.typography.titleFontSize ?? theme.typography.titleSize
  const supportingSize = Math.max(
    theme.typography.tickSize,
    theme.typography.labelSize
  )
  const typeRatio = supportingSize > 0 ? titleSize / supportingSize : 1
  const typeScore = clamp01((typeRatio - 1) / (thresholds.titleScaleRatio - 1))

  const themeColors = new Set(
    [
      ...theme.colors.categorical,
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.background,
      theme.colors.surface,
      theme.colors.text,
      theme.colors.textSecondary,
      theme.colors.grid,
      theme.colors.border,
      theme.colors.annotation
    ]
      .map(normalizeColor)
      .filter((color): color is string => !!color)
  )
  const outsideTheme = explicit.filter(
    (color) => !themeColors.has(color)
  ).length
  const coherenceScore =
    explicit.length === 0 ? 1 : clamp01(1 - outsideTheme / explicit.length)

  const emphasis = emphasisEvidence(props)
  const emphasisScore = !emphasis.authored
    ? 0.35
    : emphasis.ratio < thresholds.emphasisRatioMin
      ? clamp01(emphasis.ratio / thresholds.emphasisRatioMin)
      : emphasis.ratio <= thresholds.emphasisRatioMax
        ? 1
        : clamp01(thresholds.emphasisRatioMax / emphasis.ratio)

  const features = [
    feature(
      "mark-scaffold-hierarchy",
      hierarchyScore(hierarchy, thresholds),
      weights,
      hierarchy.finding.message,
      {
        hierarchyRatio: hierarchy.evidence?.hierarchyRatio ?? 0,
        markContrast: hierarchy.evidence?.weakestDataContrast ?? 0,
        scaffoldContrast: hierarchy.evidence?.scaffoldContrast ?? 0
      },
      profile.rationales,
      hierarchy.status
    ),
    feature(
      "palette-authorship",
      authorshipScore,
      weights,
      paletteIsUbiquitous
        ? paletteSource === "theme"
          ? "The chart inherits a ubiquitous categorical default without an organizational palette decision."
          : "The chart explicitly selects a ubiquitous categorical palette."
        : "The effective palette records an authored choice beyond the ubiquitous defaults.",
      {
        paletteSource,
        ubiquitousDefault: paletteIsUbiquitous,
        colorCount: colors.length
      },
      profile.rationales
    ),
    feature(
      "palette-economy",
      economyScore,
      weights,
      `${roleCount} color role(s) are used against a policy ceiling of ${thresholds.categoricalColorMax}.`,
      { colorRoles: roleCount, maximum: thresholds.categoricalColorMax },
      profile.rationales
    ),
    feature(
      "typographic-hierarchy",
      typeScore,
      weights,
      `Title-to-supporting-type scale is ${typeRatio.toFixed(2)}×.`,
      { titleSize, supportingSize, ratio: typeRatio },
      profile.rationales
    ),
    feature(
      "theme-coherence",
      coherenceScore,
      weights,
      `${outsideTheme} of ${explicit.length} explicit chart color(s) fall outside the theme vocabulary.`,
      { explicitColors: explicit.length, outsideTheme },
      profile.rationales
    ),
    feature(
      "editorial-emphasis",
      emphasisScore,
      weights,
      emphasis.authored
        ? `${Math.round(emphasis.ratio * 100)}% of marks receive authored emphasis.`
        : "No machine-visible editorial emphasis rule is declared.",
      { authored: emphasis.authored, emphasizedRatio: emphasis.ratio },
      profile.rationales
    )
  ]

  const totalWeight = features.reduce((sum, item) => sum + item.weight, 0)
  const weightedPoints = features.reduce(
    (sum, item) => sum + item.contribution,
    0
  )
  const score = totalWeight === 0 ? null : (weightedPoints / totalWeight) * 100
  const minimumScore =
    clamp01(
      finiteOr(
        profile.minimumScore,
        DEFAULT_AESTHETIC_PROFILE.minimumScore ?? 70
      ) / 100
    ) * 100
  return {
    component,
    profile: profile.name ?? "Unnamed aesthetic profile",
    ok: score === null || score >= minimumScore,
    score,
    minimumScore,
    weightedPoints,
    totalWeight,
    features,
    method: "weighted-machine-visible-features"
  }
}
