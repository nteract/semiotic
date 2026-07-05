import { mulberry32 } from "./forceLayout"
import { nonNegativeFinite } from "./recipeUtils"
import { unitize, unitizeRange } from "./unitize"

export type TokenType = "dot" | "icon" | "glyph"

export type TokenSemantics =
  | "observed-unit"
  | "unitized-measure"
  | "possible-outcome"
  | "posterior-sample"
  | "hypothetical-case"
  | "risk-case"
  | "topic-anchor"
  | "decorative"

export type TokenCountStrategy =
  | "actual"
  | "unitized"
  | "fixed-denominator"
  | "quantile"
  | "sample"
  | "posterior-sample"
  | "random-sample"

export type TokenLayout =
  | "row"
  | "column"
  | "grid"
  | "stack"
  | "bar-segment"
  | "waffle"
  | "beeswarm"
  | "dotplot"
  | "quantile-strip"
  | "small-multiple"

export type TokenLabelPolicy =
  | "text-plus-token"
  | "text-plus-icon"
  | "text-only"
  | "token-only"
  | "icon-only"
  | "none"

export type TokenTaskIntent =
  // Canonical token-task intents:
  | "precise-comparison"
  | "frequency-reasoning"
  | "probability-estimation"
  | "risk-communication"
  | "memory"
  | "editorial-engagement"
  | "public-explanation"
  | "support-decision"
  // Human-friendly aliases accepted by helpers:
  | "measure"
  | "estimate probability"
  | "understand risk"
  | "remember"
  | "decide"

export type TokenCapabilityIntent =
  | "compare-categories"
  | "distribution"
  | "part-to-whole"
  | "rank"
  | "outlier-detection"

export interface TokenEncoding {
  tokenType: TokenType
  tokenSemantics: TokenSemantics
  countStrategy: TokenCountStrategy
  layout?: TokenLayout
  /** Named icon/glyph key in host code; Semiotic keeps this semantic, not visual. */
  token?: string
  icon?: string
  /** Value represented by one complete token for unitized measures. */
  unitValue?: number
  /** Alias for `unitValue`, matching the lower-level `unitize` helper. */
  unit?: number
  /** Human-readable meaning, e.g. "one token = 1,000 commuters". */
  unitMeaning?: string
  tokenCount?: number
  maxTokens?: number
  minFraction?: number
  numerator?: number
  denominator?: number
  labelPolicy?: TokenLabelPolicy
  seed?: number
}

export interface TokenGeneratorInput<D = unknown> {
  value?: number
  /** Scenario/projection endpoint for `unitized` tallies. */
  rangeValue?: number
  numerator?: number
  denominator?: number
  samples?: readonly number[]
  data?: readonly D[]
  valueAccessor?: keyof D | ((d: D) => number)
}

export interface VisualToken<D = unknown> {
  index: number
  tokenType: TokenType
  tokenSemantics: TokenSemantics
  countStrategy: TokenCountStrategy
  fraction: number
  startFraction: number
  value: number
  start: number
  end: number
  unitValue?: number
  unitMeaning?: string
  highlighted?: boolean
  /** Marks a token as the projected/scenario extension of a range tally. */
  range?: "scenario"
  quantile?: number
  sample?: number
  datum?: D
}

export type TokenDiagnosticCode =
  | "TOKEN_SEMANTICS_UNCLEAR"
  | "MISSING_COUNT_STRATEGY"
  | "ICON_ONLY_LABELS"
  | "TOO_MANY_VISIBLE_TOKENS"
  | "DECORATIVE_PICTOGRAPHS"
  | "TOKEN_STRATEGY_MISMATCH"
  | "MISSING_UNIT_VALUE"
  | "MISSING_UNIT_MEANING"

export interface TokenDiagnostic {
  code: TokenDiagnosticCode
  severity: "warning" | "info"
  message: string
}

export interface TokenDiagnosticsContext {
  visibleTokens?: number
  maxRecommendedTokens?: number
}

export interface TokenSet<D = unknown> {
  tokens: VisualToken<D>[]
  encoding: TokenEncoding
  /**
   * Strategy-specific source total: value-space for `unitized`/numeric `actual`,
   * denominator for `fixed-denominator`, sample count for sample/quantile
   * strategies, and observed datum count for data-backed `actual`.
   */
  total: number
  /**
   * Strategy-specific visible amount: represented value for `unitized`, visible
   * token count for fixed-denominator/sample/quantile/data-backed actual.
   */
  shown: number
  overflow: boolean
  numerator?: number
  denominator?: number
  unitValue?: number
  /** Projected/scenario endpoint when input.rangeValue is supplied. */
  rangeTotal?: number
  /** Tokens extending a unitized tally from total to rangeTotal. */
  rangeTokens?: VisualToken<D>[]
  diagnostics: TokenDiagnostic[]
}

export interface TokenGridOptions {
  x?: number
  y?: number
  columns?: number
  rows?: number
  cellWidth?: number
  cellHeight?: number
  gutter?: number
  flow?: "row" | "column"
  columnDirection?: "right" | "left"
  rowDirection?: "down" | "up"
  /** Anchor within each cell for the returned point. `[0.5, 1]` is useful for feet-down glyphs. */
  anchor?: [number, number]
}

export interface PositionedToken<D = unknown> extends VisualToken<D> {
  x: number
  y: number
  row: number
  column: number
}

export interface TokenEncodingSuggestion {
  recommendedEncoding: string
  tokenEncoding?: TokenEncoding
  rationale: string
  warnings: TokenDiagnostic[]
  alternatives: string[]
}

export interface SuggestTokenEncodingInput {
  taskIntent: TokenTaskIntent
  dataType?:
    "count" | "measure" | "distribution" | "probability" | "risk" | "category"
  audience?: "expert" | "general-public" | "internal"
  precisionNeed?: "low" | "medium" | "high"
  availableSpace?: "small" | "medium" | "large"
  concreteEntity?: string
}

const DEFAULT_MAX_RECOMMENDED_TOKENS = 80
const FIXED_DENOMINATOR_MAX_RECOMMENDED_TOKENS = 100

function isVisualTokenArray<D>(
  value: TokenSet<D> | readonly VisualToken<D>[]
): value is readonly VisualToken<D>[] {
  return Array.isArray(value)
}

function finiteNumbers(values: readonly number[] | undefined): number[] {
  if (!values) return []
  return values.map(Number).filter(Number.isFinite)
}

function maxTokenCount(encoding: TokenEncoding): number {
  if (encoding.countStrategy === "fixed-denominator") return Infinity
  const max = encoding.maxTokens ?? Infinity
  return max > 0 ? Math.floor(max) : 0
}

function capTokens<D>(
  tokens: VisualToken<D>[],
  encoding: TokenEncoding
): { tokens: VisualToken<D>[]; overflow: boolean } {
  const max = maxTokenCount(encoding)
  if (tokens.length <= max) return { tokens, overflow: false }
  return { tokens: tokens.slice(0, max), overflow: true }
}

function normalizeInput<D>(
  input: number | readonly number[] | TokenGeneratorInput<D>
): TokenGeneratorInput<D> {
  if (typeof input === "number") return { value: input }
  if (Array.isArray(input)) {
    const values = input as readonly number[]
    return { samples: finiteNumbers(values), data: input as readonly D[] }
  }
  return input as TokenGeneratorInput<D>
}

export function normalizeTokenEncoding(encoding: TokenEncoding): TokenEncoding {
  const unitValue = encoding.unitValue ?? encoding.unit
  const icon = encoding.icon ?? encoding.token
  return {
    ...encoding,
    ...(unitValue != null && { unitValue }),
    ...(icon != null && { icon }),
  }
}

function readSamples<D>(input: TokenGeneratorInput<D>): number[] {
  if (input.samples) return finiteNumbers(input.samples)
  if (!input.data || !input.valueAccessor) return []
  const accessor = input.valueAccessor
  return input.data
    .map((d) =>
      typeof accessor === "function" ? accessor(d) : Number(d[accessor])
    )
    .filter(Number.isFinite)
}

function quantileSorted(sorted: readonly number[], p: number): number {
  // R-7 interpolation, matching d3-array's quantileSorted.
  const n = sorted.length
  if (n === 0) return 0
  if (n === 1) return sorted[0]
  const clamped = Math.min(1, Math.max(0, p))
  const i = (n - 1) * clamped
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  const t = i - lo
  return sorted[lo] * (1 - t) + sorted[hi] * t
}

function seededOrder(length: number, seed = 1): number[] {
  const order = Array.from({ length }, (_, i) => i)
  const next = mulberry32(Math.floor(seed) || 1)
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1))
    const tmp = order[i]
    order[i] = order[j]
    order[j] = tmp
  }
  return order
}

function makeToken<D>(
  encoding: TokenEncoding,
  index: number,
  value: number,
  overrides: Partial<VisualToken<D>> = {}
): VisualToken<D> {
  return {
    index,
    tokenType: encoding.tokenType,
    tokenSemantics: encoding.tokenSemantics,
    countStrategy: encoding.countStrategy,
    fraction: 1,
    startFraction: 0,
    value,
    start: index,
    end: index + value,
    unitValue: encoding.unitValue,
    unitMeaning: encoding.unitMeaning,
    ...overrides
  }
}

/**
 * Generate visible token records from a semantic token encoding.
 *
 * This is the frame-agnostic bridge between the strategy layer ("each token
 * is a case / unit / possible outcome") and today's glyph/dot/icon renderers.
 * `unitized` delegates to `unitize`, so fractional final glyphs keep the same
 * ISOTYPE partial-fill convention used by existing custom layouts.
 */
export function generateTokens<D = unknown>(
  input: number | readonly number[] | TokenGeneratorInput<D>,
  encoding: TokenEncoding
): TokenSet<D> {
  const normalizedEncoding = normalizeTokenEncoding(encoding)
  const normalized = normalizeInput(input)
  let tokens: VisualToken<D>[] = []
  let total = 0
  let shown = 0
  let overflow = false
  let numerator: number | undefined
  let denominator: number | undefined
  let unitValue: number | undefined
  let rangeTotal: number | undefined
  let rangeTokens: VisualToken<D>[] | undefined

  if (normalizedEncoding.countStrategy === "unitized") {
    unitValue = normalizedEncoding.unitValue ?? 1
    const tallyOptions = {
      unit: unitValue,
      maxUnits: normalizedEncoding.maxTokens,
      minFraction: normalizedEncoding.minFraction
    }
    const tally =
      normalized.rangeValue == null
        ? unitize(nonNegativeFinite(normalized.value), tallyOptions)
        : unitizeRange(
            nonNegativeFinite(normalized.value),
            nonNegativeFinite(normalized.rangeValue),
            tallyOptions
          )
    tokens = tally.units.map((sign) =>
      makeToken<D>(normalizedEncoding, sign.index, sign.value, {
        fraction: sign.fraction,
        start: sign.start,
        end: sign.end,
        unitValue: tally.unit
      })
    )
    total = tally.total
    shown = tally.shown
    overflow = tally.overflow
    if (normalized.rangeValue != null) {
      const rangeTally = tally as ReturnType<typeof unitizeRange>
      rangeTotal = rangeTally.rangeTotal
      rangeTokens = rangeTally.rangeUnits.map((sign) =>
        makeToken<D>(normalizedEncoding, sign.index, sign.value, {
          fraction: sign.fraction,
          startFraction: sign.startFraction,
          start: sign.start,
          end: sign.end,
          unitValue: tally.unit,
          range: "scenario"
        })
      )
    }
  } else if (normalizedEncoding.countStrategy === "fixed-denominator") {
    denominator = Math.floor(
      nonNegativeFinite(normalized.denominator ?? normalizedEncoding.denominator)
    )
    numerator = nonNegativeFinite(
      normalized.numerator ?? normalizedEncoding.numerator ?? normalized.value
    )
    const highlighted = Math.min(
      denominator,
      Math.max(0, Math.round(numerator))
    )
    tokens = Array.from({ length: denominator }, (_, index) =>
      makeToken<D>(normalizedEncoding, index, 1, {
        highlighted: index < highlighted,
        start: index,
        end: index + 1
      })
    )
    total = denominator
    shown = tokens.length
    overflow = false
  } else if (normalizedEncoding.countStrategy === "quantile") {
    const samples = readSamples(normalized).sort((a, b) => a - b)
    const desired = Math.max(0, Math.floor(normalizedEncoding.tokenCount ?? 50))
    const count =
      samples.length > 0 ? Math.min(desired, maxTokenCount(normalizedEncoding)) : 0
    tokens = Array.from({ length: count }, (_, index) => {
      const quantile = (index + 0.5) / count
      const sample = quantileSorted(samples, quantile)
      return makeToken<D>(normalizedEncoding, index, sample, {
        sample,
        quantile,
        start: sample,
        end: sample
      })
    })
    total = samples.length
    shown = tokens.length
    overflow = samples.length > 0 && desired > tokens.length
  } else if (
    normalizedEncoding.countStrategy === "sample" ||
    normalizedEncoding.countStrategy === "posterior-sample" ||
    normalizedEncoding.countStrategy === "random-sample"
  ) {
    const samples = readSamples(normalized)
    const desired = Math.min(
      samples.length,
      Math.max(0, Math.floor(normalizedEncoding.tokenCount ?? samples.length))
    )
    const count = Math.min(desired, maxTokenCount(normalizedEncoding))
    const order =
      normalizedEncoding.countStrategy === "random-sample"
        ? seededOrder(samples.length, normalizedEncoding.seed).slice(0, count)
        : Array.from({ length: count }, (_, i) =>
            Math.floor((i / Math.max(1, count - 1)) * (samples.length - 1))
          )
    tokens = order.map((sampleIndex, index) => {
      const sample = samples[sampleIndex]
      return makeToken<D>(normalizedEncoding, index, sample, {
        sample,
        start: sample,
        end: sample
      })
    })
    total = samples.length
    shown = tokens.length
    overflow = desired > tokens.length
  } else {
    const data = normalized.data
    if (data && normalized.value == null) {
      tokens = data.map((datum, index) =>
        makeToken<D>(normalizedEncoding, index, 1, { datum })
      )
      total = data.length
    } else {
      const tally = unitize(nonNegativeFinite(normalized.value), {
        unit: 1,
        maxUnits: normalizedEncoding.maxTokens,
        minFraction: normalizedEncoding.minFraction
      })
      tokens = tally.units.map((sign) =>
        makeToken<D>(normalizedEncoding, sign.index, sign.value, {
          fraction: sign.fraction,
          start: sign.start,
          end: sign.end,
          unitValue: 1
        })
      )
      total = tally.total
      shown = tally.shown
      overflow = tally.overflow
    }
    if (data && normalized.value == null) {
      const capped = capTokens(tokens, normalizedEncoding)
      tokens = capped.tokens
      shown = tokens.length
      overflow = capped.overflow
    }
  }

  return {
    tokens,
    encoding: normalizedEncoding,
    total,
    shown,
    overflow,
    numerator,
    denominator,
    unitValue,
    rangeTotal,
    rangeTokens,
    diagnostics: diagnoseTokenEncoding(normalizedEncoding, {
      visibleTokens: tokens.length + (rangeTokens?.length ?? 0)
    })
  }
}

/**
 * Position generated tokens in a deterministic row/column grid. The returned
 * `(x, y)` is the anchor point inside each cell, so use `[0.5, 1]` for
 * baseline-standing ISOTYPE glyphs and `[0.5, 0.5]` for centered dots/icons.
 */
export function layoutTokenGrid<D = unknown>(
  tokenSetOrTokens: TokenSet<D> | readonly VisualToken<D>[],
  options: TokenGridOptions = {}
): PositionedToken<D>[] {
  const tokens: readonly VisualToken<D>[] = isVisualTokenArray(tokenSetOrTokens)
    ? tokenSetOrTokens
    : tokenSetOrTokens.tokens
  const count = tokens.length
  if (count === 0) return []

  const flow = options.flow ?? "row"
  const cellWidth = options.cellWidth ?? 16
  const cellHeight = options.cellHeight ?? cellWidth
  const gutter = options.gutter ?? 2
  const anchor = options.anchor ?? [0.5, 0.5]
  const columns = Math.max(
    1,
    Math.floor(
      options.columns ??
        (options.rows
          ? Math.ceil(count / options.rows)
          : Math.ceil(Math.sqrt(count)))
    )
  )
  const rows = Math.max(
    1,
    Math.floor(options.rows ?? Math.ceil(count / columns))
  )
  const rowReference =
    flow === "row" ? Math.max(rows, Math.ceil(count / columns)) : rows
  const columnReference =
    flow === "column" ? Math.max(columns, Math.ceil(count / rows)) : columns
  const x0 = options.x ?? 0
  const y0 = options.y ?? 0

  return tokens.map((token, index) => {
    let row: number
    let column: number
    if (flow === "column") {
      column = Math.floor(index / rows)
      row = index % rows
    } else {
      row = Math.floor(index / columns)
      column = index % columns
    }
    if (options.columnDirection === "left") column = columnReference - 1 - column
    if (options.rowDirection === "up") row = rowReference - 1 - row
    return {
      ...token,
      row,
      column,
      x: x0 + column * (cellWidth + gutter) + anchor[0] * cellWidth,
      y: y0 + row * (cellHeight + gutter) + anchor[1] * cellHeight
    }
  })
}

export function diagnoseTokenEncoding(
  encoding: Partial<TokenEncoding>,
  context: TokenDiagnosticsContext = {}
): TokenDiagnostic[] {
  const diagnostics: TokenDiagnostic[] = []
  const semantics = encoding.tokenSemantics
  const strategy = encoding.countStrategy
  const maxRecommended =
    context.maxRecommendedTokens ??
    (strategy === "fixed-denominator" &&
    nonNegativeFinite(encoding.denominator) <= FIXED_DENOMINATOR_MAX_RECOMMENDED_TOKENS
      ? FIXED_DENOMINATOR_MAX_RECOMMENDED_TOKENS
      : DEFAULT_MAX_RECOMMENDED_TOKENS)

  if (!semantics) {
    diagnostics.push({
      code: "TOKEN_SEMANTICS_UNCLEAR",
      severity: "warning",
      message:
        "Every tokenized encoding should state what one token represents."
    })
  }
  if (!strategy) {
    diagnostics.push({
      code: "MISSING_COUNT_STRATEGY",
      severity: "warning",
      message:
        "Every tokenized encoding should state how token counts are produced."
    })
  }
  if (
    (encoding.tokenType === "icon" || encoding.tokenType === "glyph") &&
    (encoding.labelPolicy === "icon-only" ||
      encoding.labelPolicy === "token-only")
  ) {
    diagnostics.push({
      code: "ICON_ONLY_LABELS",
      severity: "warning",
      message: "Icons should supplement text labels, not replace them."
    })
  }
  if (context.visibleTokens != null && context.visibleTokens > maxRecommended) {
    diagnostics.push({
      code: "TOO_MANY_VISIBLE_TOKENS",
      severity: "warning",
      message: `This encoding renders ${context.visibleTokens} visible tokens. Consider unitizing, sampling, or a hybrid bar/token view.`
    })
  }
  if (
    semantics === "decorative" &&
    (encoding.tokenType === "icon" || encoding.tokenType === "glyph")
  ) {
    diagnostics.push({
      code: "DECORATIVE_PICTOGRAPHS",
      severity: "warning",
      message:
        "Decorative pictographs can harm recall and speed when they do not clarify the data."
    })
  }
  if (semantics === "unitized-measure" && strategy && strategy !== "unitized") {
    diagnostics.push({
      code: "TOKEN_STRATEGY_MISMATCH",
      severity: "warning",
      message:
        "Unitized measures should use the unitized count strategy so each token has a stable value."
    })
  }
  if (
    semantics === "risk-case" &&
    strategy &&
    strategy !== "fixed-denominator"
  ) {
    diagnostics.push({
      code: "TOKEN_STRATEGY_MISMATCH",
      severity: "warning",
      message:
        "Risk cases are usually clearest as a fixed-denominator natural frequency."
    })
  }
  if (
    (semantics === "possible-outcome" ||
      semantics === "posterior-sample" ||
      semantics === "hypothetical-case") &&
    strategy &&
    strategy !== "quantile" &&
    strategy !== "sample" &&
    strategy !== "posterior-sample" &&
    strategy !== "random-sample"
  ) {
    diagnostics.push({
      code: "TOKEN_STRATEGY_MISMATCH",
      severity: "warning",
      message:
        "Outcome/sample tokens should come from quantiles or samples, not from a unitized magnitude."
    })
  }
  if (
    semantics === "unitized-measure" &&
    strategy === "unitized" &&
    encoding.unitValue == null &&
    encoding.unit == null
  ) {
    diagnostics.push({
      code: "MISSING_UNIT_VALUE",
      severity: "warning",
      message:
        "Unitized measures should set unitValue so each token has a declared value."
    })
  }
  if (
    semantics === "unitized-measure" &&
    strategy === "unitized" &&
    !encoding.unitMeaning
  ) {
    diagnostics.push({
      code: "MISSING_UNIT_MEANING",
      severity: "info",
      message: "Add unitMeaning so readers know what one full token represents."
    })
  }

  return diagnostics
}

function defaultTokenCount(
  space: SuggestTokenEncodingInput["availableSpace"]
): number {
  if (space === "small") return 25
  if (space === "large") return 100
  return 50
}

function normalizeIntent(intent: TokenTaskIntent): TokenTaskIntent {
  if (intent === "measure") return "precise-comparison"
  if (intent === "estimate probability") return "probability-estimation"
  if (intent === "understand risk") return "risk-communication"
  if (intent === "remember") return "memory"
  if (intent === "decide") return "support-decision"
  return intent
}

/**
 * Bridge token-task intents into the chart capability taxonomy used by
 * `suggestCharts`. Human-friendly aliases normalize first, so callers can use
 * either the canonical token intent (`probability-estimation`) or the UI label
 * alias (`estimate probability`).
 */
export function tokenTaskIntentToCapabilityIntents(
  intent: TokenTaskIntent
): TokenCapabilityIntent[] {
  const normalized = normalizeIntent(intent)
  if (normalized === "precise-comparison") return ["compare-categories", "rank"]
  if (normalized === "probability-estimation") return ["distribution"]
  if (normalized === "risk-communication") return ["part-to-whole", "distribution"]
  if (normalized === "frequency-reasoning") return ["distribution", "compare-categories"]
  if (normalized === "memory" || normalized === "editorial-engagement") {
    return ["compare-categories"]
  }
  if (normalized === "public-explanation" || normalized === "support-decision") {
    return ["distribution", "compare-categories"]
  }
  return ["compare-categories"]
}

/**
 * Task-aware defaults for tokenized reasoning. This does not render a chart;
 * it returns the semantic encoding Semiotic/IDID can explain, critique, or
 * hand to `generateTokens` before a custom layout stamps dots/icons/glyphs.
 */
export function suggestTokenEncoding(
  input: SuggestTokenEncodingInput
): TokenEncodingSuggestion {
  const intent = normalizeIntent(input.taskIntent)
  const count = defaultTokenCount(input.availableSpace)

  if (intent === "precise-comparison") {
    return {
      recommendedEncoding: "bar-or-line",
      rationale:
        "Use continuous position/length encodings when precise magnitude comparison is the primary task.",
      warnings: [],
      alternatives: ["hybrid-bar-token", "unitized-measure"]
    }
  }

  if (intent === "probability-estimation") {
    const tokenEncoding: TokenEncoding = {
      tokenType: "dot",
      tokenSemantics: "possible-outcome",
      countStrategy: "quantile",
      tokenCount: count,
      layout: "dotplot",
      labelPolicy: "text-plus-token"
    }
    return {
      recommendedEncoding: "quantile-dotplot",
      tokenEncoding,
      rationale:
        "This task asks readers to estimate probability from a distribution. Quantile tokens turn probability mass into countable possible outcomes.",
      warnings: diagnoseTokenEncoding(tokenEncoding),
      alternatives: ["cdf-with-threshold", "density-with-threshold"]
    }
  }

  if (intent === "risk-communication") {
    const tokenEncoding: TokenEncoding = {
      tokenType: input.concreteEntity ? "icon" : "dot",
      icon: input.concreteEntity,
      tokenSemantics: "risk-case",
      countStrategy: "fixed-denominator",
      denominator: 100,
      layout: "waffle",
      labelPolicy: "text-plus-token"
    }
    return {
      recommendedEncoding: "fixed-denominator-icon-array",
      tokenEncoding,
      rationale:
        "Risk is often clearer as natural frequency: highlighted cases out of a fixed denominator.",
      warnings: diagnoseTokenEncoding(tokenEncoding, {
        visibleTokens: 100,
        maxRecommendedTokens: 100
      }),
      alternatives: ["labeled-percent", "bar-with-risk-threshold"]
    }
  }

  if (intent === "memory" || intent === "editorial-engagement") {
    const tokenEncoding: TokenEncoding = {
      tokenType: input.concreteEntity ? "glyph" : "icon",
      icon: input.concreteEntity,
      tokenSemantics: "unitized-measure",
      countStrategy: "unitized",
      unitValue: 1,
      layout: "grid",
      labelPolicy: "text-plus-token",
      unitMeaning: input.concreteEntity
        ? `one token represents a unit of ${input.concreteEntity}`
        : "one token represents one unit"
    }
    return {
      recommendedEncoding: "semantic-isotype",
      tokenEncoding,
      rationale:
        "Semantic tokens are useful when the chart needs to make a topic concrete and memorable.",
      warnings: diagnoseTokenEncoding(tokenEncoding),
      alternatives: ["labeled-bar", "hybrid-bar-token"]
    }
  }

  if (
    intent === "frequency-reasoning" ||
    intent === "public-explanation" ||
    intent === "support-decision"
  ) {
    const tokenEncoding: TokenEncoding = {
      tokenType: input.concreteEntity ? "icon" : "dot",
      icon: input.concreteEntity,
      tokenSemantics:
        input.dataType === "distribution"
          ? "possible-outcome"
          : "unitized-measure",
      countStrategy:
        input.dataType === "distribution" ? "quantile" : "unitized",
      unitValue: input.dataType === "distribution" ? undefined : 1,
      tokenCount: count,
      layout:
        input.dataType === "distribution" ? "dotplot" : "bar-segment",
      labelPolicy: "text-plus-token",
      unitMeaning:
        input.dataType === "distribution"
          ? undefined
          : "one token represents one unit interval"
    }
    return {
      recommendedEncoding: "hybrid-continuous-token",
      tokenEncoding,
      rationale:
        "A hybrid view preserves measurement while adding countable tokens for explanation and decisions.",
      warnings: diagnoseTokenEncoding(tokenEncoding),
      alternatives: [
        "bar-or-line",
        "quantile-dotplot",
        "fixed-denominator-icon-array"
      ]
    }
  }

  return {
    recommendedEncoding: "bar-or-line",
    rationale:
      "Use continuous encodings unless the task needs frequency, risk, memory, or outcome reasoning.",
    warnings: [],
    alternatives: [
      "unitized-measure",
      "quantile-dotplot",
      "fixed-denominator-icon-array"
    ]
  }
}
