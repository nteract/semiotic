import type { GlyphDef } from "../stream/glyphDef"
import type {
  PointSceneNode,
  SceneAccessibilityMetadata,
  SceneDatum,
  SceneNode,
  Style,
  SymbolSceneNode,
  GlyphSceneNode,
} from "../stream/types"
import type { SymbolName } from "../stream/symbolPath"
import { SYMBOL_SEQUENCE } from "../stream/symbolPath"
import { isotypeNetworkGlyphs } from "./isotypeGlyphs"
import {
  generateTokens,
  layoutTokenGrid,
  normalizeTokenEncoding,
  type PositionedToken,
  type TokenEncoding,
  type TokenGeneratorInput,
  type TokenGridOptions,
  type TokenLayout,
  type TokenSet,
  type VisualToken,
} from "./tokenEncoding"

const DEFAULT_TOKEN_COLOR = "var(--semiotic-primary, #4e79a7)"
const DEFAULT_TOKEN_INACTIVE_COLOR = "var(--semiotic-border, #d1d5db)"
const DEFAULT_TOKEN_RANGE_COLOR = "var(--semiotic-secondary, #9ca3af)"
const DEFAULT_TOKEN_ACCENT = "var(--semiotic-bg, #ffffff)"

export type TokenLayerInput<D> =
  | number
  | readonly number[]
  | TokenGeneratorInput<D>
  | TokenSet<D>

export type TokenLayerValue<T, D> = T | ((token: PositionedToken<D>) => T | undefined)

export interface TokenPosition {
  x: number
  y: number
  row?: number
  column?: number
}

export interface TokenLayerOptions<D = unknown> extends TokenGridOptions {
  /** Override the encoding's preferred layout for this placement. */
  layout?: TokenLayout
  /** Plot-space width used to infer grid columns or normalize quantile strips. */
  width?: number
  /** Plot-space height used to normalize quantile strips. */
  height?: number
  /** Rendered glyph height / symbol diameter / dot diameter. @default 12
   *  For user-facing ISOTYPE/icon arrays, prefer 16px+ in the final layout. */
  tokenSize?: TokenLayerValue<number, D>
  /** Dot radius. Defaults to half tokenSize. */
  radius?: TokenLayerValue<number, D>
  /** Primary mark paint. Prefer passing ctx.resolveColor(...) from custom layouts. */
  color?: TokenLayerValue<string, D>
  /** Paint for unhighlighted fixed-denominator tokens. */
  inactiveColor?: TokenLayerValue<string, D>
  /** Paint for projected/scenario range tokens when includeRange is true. */
  rangeColor?: TokenLayerValue<string, D>
  /** Accent paint for glyph role fills. */
  accent?: TokenLayerValue<string, D>
  /** Ghost paint for partial glyph fills. */
  ghostColor?: TokenLayerValue<string | undefined, D>
  /** Symbol shape for dot/icon fallback rendering. */
  symbolType?: TokenLayerValue<SymbolName, D>
  /** Custom origin-centered SVG path for symbol nodes. */
  symbolPath?: TokenLayerValue<string | undefined, D>
  /** Composite pictogram definition for icon/glyph tokens. */
  glyph?: TokenLayerValue<GlyphDef | undefined, D>
  /** Partial-fill axis for glyph tokens. */
  fractionDirection?: TokenLayerValue<"horizontal" | "vertical", D>
  rotation?: TokenLayerValue<number | undefined, D>
  style?: TokenLayerValue<Style | undefined, D>
  datum?: TokenLayerValue<SceneDatum, D>
  accessibleDatum?: TokenLayerValue<SceneAccessibilityMetadata["accessibleDatum"], D>
  accessibility?: TokenLayerValue<SceneAccessibilityMetadata["accessibility"], D>
  pointId?: TokenLayerValue<string | undefined, D>
  idPrefix?: string
  include?: (token: PositionedToken<D>) => boolean
  /** Render `TokenSet.rangeTokens` after base tokens for unitized scenario tallies. */
  includeRange?: boolean
  /** Custom placement hook for scale-driven strips, stacks, map clusters, etc. */
  positionToken?: (
    token: VisualToken<D>,
    index: number,
    tokens: readonly VisualToken<D>[]
  ) => TokenPosition
  /** Maps a sample/value to plot-space x for quantile/sample strips. */
  valueToX?: (value: number, token: VisualToken<D>) => number
  /** Maps a sample/value to plot-space y for quantile/sample strips. */
  valueToY?: (value: number, token: VisualToken<D>) => number
}

export interface TokenLayerConfig<D = unknown> {
  input: TokenLayerInput<D>
  encoding?: TokenEncoding
  options?: TokenLayerOptions<D>
}

export interface TokenLayerResult<D = unknown> {
  tokenSet: TokenSet<D>
  positionedTokens: PositionedToken<D>[]
  nodes: SceneNode[]
}

function isTokenSet<D>(input: TokenLayerInput<D>): input is TokenSet<D> {
  return (
    typeof input === "object" &&
    input !== null &&
    "tokens" in input &&
    "encoding" in input
  )
}

function resolveValue<T, D>(
  value: TokenLayerValue<T, D> | undefined,
  token: PositionedToken<D>,
  fallback: T
): T {
  if (typeof value === "function") {
    return (value as (token: PositionedToken<D>) => T)(token) ?? fallback
  }
  return value ?? fallback
}

function resolveOptional<T, D>(
  value: TokenLayerValue<T | undefined, D> | undefined,
  token: PositionedToken<D>
): T | undefined {
  if (typeof value === "function") {
    return (value as (token: PositionedToken<D>) => T | undefined)(token)
  }
  return value
}

function numericValue<D>(token: VisualToken<D>): number {
  return token.sample ?? token.value ?? token.index
}

function inferColumns<D>(
  tokens: readonly VisualToken<D>[],
  options: TokenLayerOptions<D>,
  cellWidth: number
): number | undefined {
  if (options.columns) return options.columns
  if (options.width && cellWidth > 0) {
    const gutter = options.gutter ?? 2
    return Math.max(1, Math.floor((options.width + gutter) / (cellWidth + gutter)))
  }
  return tokens.length > 0 ? Math.ceil(Math.sqrt(tokens.length)) : 1
}

function positionWithCustomHook<D>(
  tokens: readonly VisualToken<D>[],
  options: TokenLayerOptions<D>
): PositionedToken<D>[] {
  const hook = options.positionToken
  if (!hook) return []
  return tokens.map((token, index) => {
    const position = hook(token, index, tokens)
    return {
      ...token,
      x: position.x,
      y: position.y,
      row: position.row ?? index,
      column: position.column ?? 0,
    }
  })
}

function positionQuantileStrip<D>(
  tokens: readonly VisualToken<D>[],
  options: TokenLayerOptions<D>
): PositionedToken<D>[] {
  if (tokens.length === 0) return []
  const x0 = options.x ?? 0
  const y0 = options.y ?? 0
  const cellHeight =
    options.cellHeight ??
    (typeof options.tokenSize === "number" ? options.tokenSize : 12)
  const gutter = options.gutter ?? 2
  const rows = Math.max(1, Math.floor(options.rows ?? 1))
  const values = tokens.map(numericValue)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return tokens.map((token, index) => {
    const value = numericValue(token)
    const row = index % rows
    const x = options.valueToX
      ? options.valueToX(value, token)
      : x0 + ((value - min) / span) * (options.width ?? Math.max(1, tokens.length - 1) * 12)
    const y = options.valueToY
      ? options.valueToY(value, token)
      : y0 + row * (cellHeight + gutter)
    return { ...token, x, y, row, column: index }
  })
}

function positionDotplot<D>(
  tokens: readonly VisualToken<D>[],
  options: TokenLayerOptions<D>
): PositionedToken<D>[] {
  if (tokens.length === 0) return []
  const x0 = options.x ?? 0
  const y0 = options.y ?? 0
  const tokenSize =
    typeof options.tokenSize === "number" ? options.tokenSize : 12
  const gutter = options.gutter ?? 2
  const binWidth = options.cellWidth ?? tokenSize + gutter
  const step = options.cellHeight ?? tokenSize + gutter
  const values = tokens.map(numericValue)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const binCounts = new Map<number, number>()
  return tokens.map((token) => {
    const value = numericValue(token)
    const x = options.valueToX
      ? options.valueToX(value, token)
      : x0 + ((value - min) / span) * (options.width ?? Math.max(1, tokens.length - 1) * binWidth)
    const bin = Math.round((x - x0) / Math.max(1, binWidth))
    const row = binCounts.get(bin) ?? 0
    binCounts.set(bin, row + 1)
    const y = options.valueToY
      ? options.valueToY(value, token)
      : y0 + row * step
    return { ...token, x: x0 + bin * binWidth, y, row, column: bin }
  })
}

function positionBarSegment<D>(
  tokens: readonly VisualToken<D>[],
  options: TokenLayerOptions<D>
): PositionedToken<D>[] {
  if (!options.valueToX) return []
  const y0 = options.y ?? 0
  const cellHeight =
    options.cellHeight ??
    (typeof options.tokenSize === "number" ? options.tokenSize : 12)
  const anchor = options.anchor ?? [0.5, 0.5]
  return tokens.map((token, index) => {
    const start = Number.isFinite(token.start) ? token.start : numericValue(token)
    const end = Number.isFinite(token.end) ? token.end : start + token.value
    const midpoint = (start + end) / 2
    const y = options.valueToY
      ? options.valueToY(midpoint, token)
      : y0 + anchor[1] * cellHeight
    return {
      ...token,
      x: options.valueToX!(midpoint, token),
      y,
      row: 0,
      column: index,
    }
  })
}

function positionTokens<D>(
  tokenSet: TokenSet<D>,
  options: TokenLayerOptions<D>
): PositionedToken<D>[] {
  const tokens =
    options.includeRange && tokenSet.rangeTokens
      ? [...tokenSet.tokens, ...tokenSet.rangeTokens]
      : tokenSet.tokens
  if (options.positionToken) return positionWithCustomHook(tokens, options)
  const layout = options.layout ?? tokenSet.encoding.layout ?? "grid"
  if (layout === "quantile-strip") return positionQuantileStrip(tokens, options)
  if (layout === "dotplot") return positionDotplot(tokens, options)
  if (layout === "bar-segment") {
    if (!options.valueToX) {
      throw new Error(
        'tokenLayer layout "bar-segment" requires valueToX and optionally valueToY.'
      )
    }
    return positionBarSegment(tokens, options)
  }
  if (layout === "beeswarm" || layout === "small-multiple") {
    throw new Error(
      `tokenLayer layout "${layout}" is not implemented yet; use row, column, stack, grid, waffle, dotplot, quantile-strip, bar-segment with valueToX, or positionToken.`
    )
  }

  const tokenSize =
    typeof options.tokenSize === "number" ? options.tokenSize : undefined
  const cellWidth = options.cellWidth ?? tokenSize ?? 12
  const cellHeight = options.cellHeight ?? tokenSize ?? cellWidth
  const columns =
    layout === "row"
      ? Math.max(1, tokens.length)
      : layout === "column" || layout === "stack"
        ? 1
        : layout === "waffle" &&
            tokenSet.encoding.countStrategy === "fixed-denominator" &&
            tokenSet.denominator === 100
          ? 10
        : inferColumns(tokens, options, cellWidth)

  return layoutTokenGrid(tokens, {
    ...options,
    columns,
    cellWidth,
    cellHeight,
  })
}

function builtinGlyph(name: string | undefined): GlyphDef | undefined {
  if (!name) return undefined
  return isotypeNetworkGlyphs[name as keyof typeof isotypeNetworkGlyphs]
}

const SYMBOL_NAMES = new Set<string>(SYMBOL_SEQUENCE)

function namedSymbol(name: string | undefined): SymbolName | undefined {
  return name && SYMBOL_NAMES.has(name) ? (name as SymbolName) : undefined
}

function tokenDatum<D>(
  token: PositionedToken<D>,
  options: TokenLayerOptions<D>
): SceneDatum {
  if (options.datum !== undefined) return resolveValue(options.datum, token, null)
  return (token.datum as SceneDatum | undefined) ?? null
}

function baseStyle<D>(token: PositionedToken<D>, options: TokenLayerOptions<D>): Style {
  const active = token.highlighted !== false
  const color = active
    ? token.range === "scenario"
      ? resolveValue(options.rangeColor, token, DEFAULT_TOKEN_RANGE_COLOR)
      : resolveValue(options.color, token, DEFAULT_TOKEN_COLOR)
    : resolveValue(options.inactiveColor, token, DEFAULT_TOKEN_INACTIVE_COLOR)
  return {
    fill: color,
    stroke: "none",
    ...(resolveOptional(options.style, token) ?? {}),
  }
}

function baseIdentity<D>(
  token: PositionedToken<D>,
  options: TokenLayerOptions<D>
): {
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  pointId?: string
  _transitionKey?: string
} {
  const pointId =
    resolveOptional(options.pointId, token) ??
    (options.idPrefix
      ? `${options.idPrefix}-${token.range === "scenario" ? "range-" : ""}${token.index}`
      : undefined)
  return {
    datum: tokenDatum(token, options),
    accessibleDatum: resolveOptional(options.accessibleDatum, token),
    accessibility: resolveOptional(options.accessibility, token),
    pointId,
    _transitionKey: pointId,
  }
}

function pointNode<D>(
  token: PositionedToken<D>,
  options: TokenLayerOptions<D>
): PointSceneNode {
  const tokenSize = resolveValue(options.tokenSize, token, 12)
  return {
    type: "point",
    x: token.x,
    y: token.y,
    r: resolveValue(options.radius, token, tokenSize / 2),
    style: baseStyle(token, options),
    ...baseIdentity(token, options),
  }
}

function symbolNode<D>(
  token: PositionedToken<D>,
  options: TokenLayerOptions<D>
): SymbolSceneNode {
  const tokenSize = resolveValue(options.tokenSize, token, 12)
  return {
    type: "symbol",
    x: token.x,
    y: token.y,
    size: Math.PI * Math.max(1, tokenSize / 2) ** 2,
    symbolType: resolveValue(options.symbolType, token, "circle"),
    path: resolveOptional(options.symbolPath, token),
    rotation: resolveOptional(options.rotation, token),
    style: baseStyle(token, options),
    ...baseIdentity(token, options),
  }
}

function glyphNode<D>(
  token: PositionedToken<D>,
  glyph: GlyphDef,
  options: TokenLayerOptions<D>
): GlyphSceneNode {
  const style = baseStyle(token, options)
  const tokenSize = resolveValue(options.tokenSize, token, 12)
  return {
    type: "glyph",
    x: token.x,
    y: token.y,
    size: tokenSize,
    glyph,
    color: String(style.fill ?? DEFAULT_TOKEN_COLOR),
    accent: resolveValue(options.accent, token, DEFAULT_TOKEN_ACCENT),
    fraction: token.fraction < 1 ? token.fraction : undefined,
    fractionStart: token.startFraction > 0 ? token.startFraction : undefined,
    fractionDirection: resolveValue(options.fractionDirection, token, "horizontal"),
    ghostColor:
      token.fraction < 1
        ? resolveOptional(options.ghostColor, token) ?? DEFAULT_TOKEN_INACTIVE_COLOR
        : undefined,
    rotation: resolveOptional(options.rotation, token),
    style,
    ...baseIdentity(token, options),
  }
}

function nodeForToken<D>(
  token: PositionedToken<D>,
  options: TokenLayerOptions<D>,
  encoding: TokenEncoding
): SceneNode {
  if (encoding.tokenType === "dot") return pointNode(token, options)
  const glyph =
    resolveOptional(options.glyph, token) ??
    builtinGlyph(encoding.icon)
  if (glyph) return glyphNode(token, glyph, options)
  const symbolName = namedSymbol(encoding.icon)
  const symbolOptions =
    symbolName && options.symbolType == null
      ? { ...options, symbolType: symbolName }
      : options
  return symbolNode(token, symbolOptions)
}

/**
 * Frame-agnostic rendering helper for tokenized reasoning.
 *
 * `tokenLayer` is the scene-node bridge for ISOTYPE/icon arrays, risk grids,
 * quantile dotplots, and hybrid bar-token layouts. It creates the semantic
 * tokens, positions them, and returns ordinary Semiotic scene nodes so custom
 * charts still get canvas/SVG rendering, hit testing, keyboard navigation,
 * pointId annotations, transitions, and accessible table rows.
 */
export function tokenLayer<D = unknown>({
  input,
  encoding,
  options = {},
}: TokenLayerConfig<D>): TokenLayerResult<D> {
  if (!isTokenSet(input) && !encoding) {
    throw new Error("tokenLayer requires an encoding when input is not a TokenSet.")
  }
  const tokenSet = isTokenSet(input)
    ? { ...input, encoding: normalizeTokenEncoding(input.encoding) }
    : generateTokens(input, encoding!)
  const positionedTokens = positionTokens(tokenSet, options).filter((token) =>
    options.include ? options.include(token) : true
  )
  return {
    tokenSet,
    positionedTokens,
    nodes: positionedTokens.map((token) =>
      nodeForToken(token, options, tokenSet.encoding)
    ),
  }
}
