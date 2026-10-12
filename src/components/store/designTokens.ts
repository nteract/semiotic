import type { Datum } from "../charts/shared/datumTypes"
import type { SemioticTheme } from "./themeCore"
import type {
  AestheticFeatureId,
  AestheticProfile,
  AestheticThresholds
} from "../ai/aestheticProfileTypes"
import { DARK_THEME, LIGHT_THEME } from "./themeCore"
import { themeToCSSVariables } from "./themeCSSVariables"
import { parseColorEvidence, colorEvidenceToHex } from "../ai/colorEvidence"
import { contrastRatio } from "../charts/shared/colorContrast"

/**
 * W3C Design Tokens (DTCG) → Semiotic theme.
 *
 * `themeToTokens` already exports a Semiotic theme *to* DTCG-shaped tokens; this
 * is the missing inverse — a brand's design-token file *in*. It lets a design
 * system drive chart theming from the same source of truth as the rest of the
 * product, the under-served "design/publishing" direction of the integration
 * strategy. Pure, dependency-free; rides only the shipped theme type.
 *
 * Three resolution paths, most-specific first:
 *   1. **Native** — tokens under a `semiotic.*` group (i.e. produced by
 *      `themeToTokens`) round-trip exactly back to their roles.
 *   2. **Explicit** — `options.mapping` pins a role to a token path.
 *   3. **Heuristic** — common brand-token names ("color.brand.primary",
 *      "semantic.error", "fg.default", …) are matched to roles by leaf name.
 * Anything unresolved falls back to a base theme (chosen light/dark by the
 * resolved background's luminance), so the result is always a complete,
 * contrast-sane theme.
 */

// ── DTCG flattening + alias resolution ──────────────────────────────────────

interface FlatToken {
  /** Dot-joined path, e.g. "color.brand.primary". */
  path: string
  /** Last path segment, e.g. "primary". */
  leaf: string
  value: unknown
  type?: string
}

function isTokenNode(node: unknown): node is Record<string, unknown> {
  return !!node && typeof node === "object" && "$value" in node
}

/** Walk a DTCG tree into a flat list of tokens, inheriting group `$type`. */
function flattenDesignTokens(tokens: unknown): FlatToken[] {
  const out: FlatToken[] = []
  const walk = (
    node: unknown,
    path: string[],
    inheritedType?: string
  ): void => {
    if (!node || typeof node !== "object") return
    const obj = node as Record<string, unknown>
    const groupType = (obj.$type as string | undefined) ?? inheritedType
    if (isTokenNode(obj)) {
      out.push({
        path: path.join("."),
        leaf: path[path.length - 1] ?? "",
        value: obj.$value,
        type: (obj.$type as string | undefined) ?? inheritedType
      })
      return
    }
    for (const [key, child] of Object.entries(obj)) {
      if (key.startsWith("$")) continue
      walk(child, [...path, key], groupType)
    }
  }
  walk(tokens, [])
  return out
}

const ALIAS_RE = /^\{([^}]+)\}$/

/** Resolve DTCG `{path.to.token}` alias references against the flat token set. */
function resolveAliases(flat: FlatToken[]): FlatToken[] {
  const byPath = new Map(flat.map((t) => [t.path, t]))
  const resolve = (value: unknown, depth: number): unknown => {
    if (depth > 8 || typeof value !== "string") return value
    const m = value.match(ALIAS_RE)
    if (!m) return value
    const target = byPath.get(m[1])
    return target ? resolve(target.value, depth + 1) : value
  }
  return flat.map((t) => ({ ...t, value: resolve(t.value, 0) }))
}

// ── Role resolution ──────────────────────────────────────────────────────────

type ColorRole =
  | "primary"
  | "secondary"
  | "background"
  | "surface"
  | "text"
  | "textSecondary"
  | "border"
  | "grid"
  | "focus"
  | "annotation"
  | "cellBorder"
  | "success"
  | "danger"
  | "warning"
  | "error"
  | "info"

/** Native `semiotic.*` token key → theme color role (exact inverse of themeToTokens). */
const NATIVE_COLOR: Record<string, ColorRole> = {
  bg: "background",
  text: "text",
  "text-secondary": "textSecondary",
  grid: "grid",
  border: "border",
  primary: "primary",
  focus: "focus",
  secondary: "secondary",
  surface: "surface",
  annotation: "annotation",
  "annotation-color": "annotation",
  "cell-border": "cellBorder",
  success: "success",
  danger: "danger",
  warning: "warning",
  error: "error",
  info: "info"
}

/**
 * Heuristic leaf-name patterns per role, evaluated in order. The first unused
 * color token whose leaf matches wins. Ordering matters: the more specific
 * roles (textSecondary, error) are matched before their broader siblings.
 */
const COLOR_HEURISTICS: Array<[ColorRole, RegExp]> = [
  [
    "textSecondary",
    /^(text-?secondary|secondary-?text|muted|subtle|text-?muted|fg-?muted)$/
  ],
  [
    "text",
    /^(text|foreground|fg|ink|on-?background|on-?surface|text-?default|fg-?default)$/
  ],
  ["background", /^(background|bg|canvas|base|page|backdrop|bg-?default)$/],
  ["surface", /^(surface|card|elevated|panel|sheet)$/],
  ["border", /^(border|divider|outline|stroke|hairline)$/],
  ["grid", /^(grid|gridline|gridlines)$/],
  ["primary", /^(primary|brand|accent|brand-?primary)$/],
  ["secondary", /^(secondary|brand-?secondary)$/],
  ["focus", /^(focus|ring|focus-?ring)$/],
  ["error", /^(error|critical)$/],
  ["danger", /^(danger|negative|destructive|fail|alert)$/],
  ["success", /^(success|positive|ok|good|pass)$/],
  ["warning", /^(warning|warn|caution)$/],
  ["info", /^(info|information|note)$/],
  ["annotation", /^(annotation|callout)$/]
]

const RGB_RE =
  /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*[\d.]+)?\s*\)$/i

function looksLikeColor(value: string): boolean {
  const v = value.trim()
  return (
    parseColorEvidence(v) != null ||
    /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(v) ||
    RGB_RE.test(v) ||
    /^hsla?\(/i.test(v)
  )
}

function isColor(t: FlatToken): boolean {
  return (
    typeof t.value === "string" &&
    (t.type === "color" || looksLikeColor(t.value))
  )
}

function resolveFontFamily(value: unknown): string | undefined {
  if (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string")
  ) {
    return value.join(", ")
  }
  return typeof value === "string" ? value : undefined
}

function resolvePixelDimension(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return undefined
  const match = value.trim().match(/^(-?(?:\d+|\d*\.\d+))px$/)
  return match ? Number(match[1]) : undefined
}

function resolveFontWeight(value: unknown): string | number | undefined {
  if (typeof value === "string") return value
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface DesignTokensToThemeOptions {
  /** Theme to merge resolved roles onto. Defaults to LIGHT/DARK by detected bg. */
  base?: SemioticTheme
  /** Pin a role to a token path, e.g. `{ primary: "color.brand.500" }`. */
  mapping?: Partial<Record<ColorRole | "fontFamily" | "categorical", string>>
}

/**
 * Build a `SemioticTheme` from a W3C Design Tokens object. Inverse of
 * `themeToTokens`; round-trips exactly for tokens under a `semiotic.*` group.
 */
export function designTokensToTheme(
  tokens: Datum,
  options: DesignTokensToThemeOptions = {}
): SemioticTheme {
  const flat = resolveAliases(flattenDesignTokens(tokens))
  const byPath = new Map(flat.map((t) => [t.path, t]))
  const used = new Set<string>()

  const resolved: Partial<Record<ColorRole, string>> = {}

  // 1. Explicit mapping wins.
  for (const [role, path] of Object.entries(options.mapping ?? {})) {
    if (role === "fontFamily" || role === "categorical") continue
    const t = path ? byPath.get(path) : undefined
    if (t && typeof t.value === "string") {
      resolved[role as ColorRole] = t.value
      used.add(t.path)
    }
  }

  // 2. Native `semiotic.*` tokens (exact round-trip).
  for (const t of flat) {
    const m = t.path.match(/^semiotic\.([^.]+)$/)
    const role =
      m && Object.prototype.hasOwnProperty.call(NATIVE_COLOR, m[1])
        ? NATIVE_COLOR[m[1]]
        : undefined
    if (role && !(role in resolved) && typeof t.value === "string") {
      resolved[role] = t.value
      used.add(t.path)
    }
  }

  // 3. Heuristic leaf-name match (first unused color token per role).
  for (const [role, pattern] of COLOR_HEURISTICS) {
    if (role in resolved) continue
    const t = flat.find(
      (f) =>
        !used.has(f.path) && isColor(f) && pattern.test(f.leaf.toLowerCase())
    )
    if (t && typeof t.value === "string") {
      resolved[role] = t.value
      used.add(t.path)
    }
  }

  // Categorical palette: an array-valued token, a `semiotic.categorical`, or a
  // group of colors named categorical/chart/palette/qualitative.
  let categorical: string[] | undefined
  const catMapPath = options.mapping?.categorical
  const catToken =
    (catMapPath ? byPath.get(catMapPath) : undefined) ??
    byPath.get("semiotic.categorical") ??
    flat.find(
      (t) =>
        Array.isArray(t.value) &&
        /categor|chart|palette|qualitative|series/i.test(t.path)
    )
  if (catToken && Array.isArray(catToken.value)) {
    categorical = catToken.value.filter(
      (v): v is string => typeof v === "string"
    )
  } else {
    const group = flat.filter(
      (t) =>
        isColor(t) &&
        /(^|\.)(categorical|chart|palette|qualitative|series)\b/i.test(t.path)
    )
    if (group.length >= 2) categorical = group.map((t) => t.value as string)
  }

  // Font family.
  const fontToken =
    (options.mapping?.fontFamily
      ? byPath.get(options.mapping.fontFamily)
      : undefined) ??
    byPath.get("semiotic.font-family") ??
    flat.find(
      (t) =>
        (t.type === "fontFamily" || /font-?family|typeface/i.test(t.leaf)) &&
        (typeof t.value === "string" || Array.isArray(t.value))
    )
  const fontFamily = fontToken ? resolveFontFamily(fontToken.value) : undefined

  // Typography tokens are native-only by design. Unlike a generic brand
  // font-family, title/legend treatments have no reliable leaf-name heuristic;
  // preserving them here makes `designTokensToTheme(themeToTokens(theme))` an
  // exact inverse for the public title/legend typography controls.
  const legendSize = resolvePixelDimension(
    byPath.get("semiotic.legend-font-size")?.value
  )
  const legendFontFamily = resolveFontFamily(
    byPath.get("semiotic.legend-font-family")?.value
  )
  const legendFontWeight = resolveFontWeight(
    byPath.get("semiotic.legend-font-weight")?.value
  )
  const titleFontSize = resolvePixelDimension(
    byPath.get("semiotic.title-font-size")?.value
  )
  const titleFontFamily = resolveFontFamily(
    byPath.get("semiotic.title-font-family")?.value
  )
  const titleFontWeight = resolveFontWeight(
    byPath.get("semiotic.title-font-weight")?.value
  )
  const tickFontFamily = resolveFontFamily(
    byPath.get("semiotic.tick-font-family")?.value
  )
  const tickSize = resolvePixelDimension(
    byPath.get("semiotic.tick-font-size")?.value
  )
  const labelSize = resolvePixelDimension(
    byPath.get("semiotic.axis-label-font-size")?.value
  )
  const titleSize = resolvePixelDimension(
    byPath.get("semiotic.title-size")?.value
  )
  const nativeString = (path: string): string | undefined => {
    const value = byPath.get(`semiotic.${path}`)?.value
    return typeof value === "string" ? value : undefined
  }
  const sequential = nativeString("sequential")
  const diverging = nativeString("diverging")
  const selection = nativeString("selection.color")
  const selectionOpacity = byPath.get("semiotic.selection.opacity")?.value
  const borderRadius = nativeString("border-radius")
  const nativeGroup = (name: string): boolean =>
    !!tokens.semiotic &&
    typeof tokens.semiotic === "object" &&
    Object.prototype.hasOwnProperty.call(tokens.semiotic, name)
  const tooltip: NonNullable<SemioticTheme["tooltip"]> = {}
  for (const [key, field] of Object.entries({
    bg: "background",
    text: "text",
    radius: "borderRadius",
    "font-size": "fontSize",
    shadow: "shadow"
  } as const)) {
    const value = nativeString(`tooltip.${key}`)
    if (value != null) tooltip[field] = value
  }
  const chrome = nativeString("tooltip.chrome")
  if (chrome === "none" || chrome === "default") tooltip.chrome = chrome
  const accessibility: NonNullable<SemioticTheme["accessibility"]> = {}
  for (const field of ["colorBlindSafe", "highContrast"] as const) {
    const value = byPath.get(`semiotic.accessibility.${field}`)?.value
    if (typeof value === "boolean") accessibility[field] = value
  }

  // Organizational aesthetic policy is metadata, not paint. Native tokens
  // preserve it so the same theme object can drive rendering and evaluation.
  const aestheticWeights: Partial<Record<AestheticFeatureId, number>> = {}
  const aestheticThresholds: AestheticThresholds = {}
  const aestheticRationales: Partial<Record<AestheticFeatureId, string>> = {}
  for (const token of flat) {
    const weight = token.path.match(/^semiotic\.aesthetics\.weights\.(.+)$/)
    if (
      weight &&
      typeof token.value === "number" &&
      Number.isFinite(token.value)
    ) {
      aestheticWeights[weight[1] as AestheticFeatureId] = token.value
    }
    const threshold = token.path.match(
      /^semiotic\.aesthetics\.thresholds\.(.+)$/
    )
    if (
      threshold &&
      typeof token.value === "number" &&
      Number.isFinite(token.value)
    ) {
      aestheticThresholds[threshold[1] as keyof AestheticThresholds] =
        token.value
    }
    const rationale = token.path.match(
      /^semiotic\.aesthetics\.rationales\.(.+)$/
    )
    if (rationale && typeof token.value === "string") {
      aestheticRationales[rationale[1] as AestheticFeatureId] = token.value
    }
  }
  const aestheticName = byPath.get("semiotic.aesthetics.profile")?.value
  const aestheticMinimum = byPath.get(
    "semiotic.aesthetics.minimum-score"
  )?.value
  const hasAestheticPolicy =
    typeof aestheticName === "string" ||
    typeof aestheticMinimum === "number" ||
    Object.keys(aestheticWeights).length > 0 ||
    Object.keys(aestheticThresholds).length > 0 ||
    Object.keys(aestheticRationales).length > 0
  const aesthetics: AestheticProfile | undefined = hasAestheticPolicy
    ? {
        ...(typeof aestheticName === "string" ? { name: aestheticName } : {}),
        ...(typeof aestheticMinimum === "number"
          ? { minimumScore: aestheticMinimum }
          : {}),
        ...(Object.keys(aestheticWeights).length > 0
          ? { weights: aestheticWeights }
          : {}),
        ...(Object.keys(aestheticThresholds).length > 0
          ? { thresholds: aestheticThresholds }
          : {}),
        ...(Object.keys(aestheticRationales).length > 0
          ? { rationales: aestheticRationales }
          : {})
      }
    : undefined

  // Mode + base theme.
  const background = parseColorEvidence(resolved.background)
  const opaqueBackground = background ? colorEvidenceToHex(background) : null
  const detectedMode = opaqueBackground
    ? contrastRatio(opaqueBackground, "#000")! >=
      contrastRatio(opaqueBackground, "#fff")!
      ? "light"
      : "dark"
    : LIGHT_THEME.mode
  const nativeMode = nativeString("mode")
  const mode =
    options.base?.mode ??
    (nativeMode === "light" || nativeMode === "dark" || nativeMode === "auto"
      ? nativeMode
      : detectedMode)
  const base = options.base ?? (mode === "dark" ? DARK_THEME : LIGHT_THEME)
  // Complete native exports preserve optional-field absence. Partial/foreign
  // token files keep the base theme's fallbacks.
  const completeNative =
    !options.base &&
    titleSize != null &&
    fontFamily != null &&
    tickSize != null &&
    labelSize != null &&
    categorical != null &&
    sequential != null &&
    ["mode", "primary", "bg", "text", "text-secondary", "grid", "border"].every(
      (key) => byPath.has(`semiotic.${key}`)
    )
  const baseColors = completeNative
    ? {
        primary: base.colors.primary,
        categorical: base.colors.categorical,
        sequential: base.colors.sequential,
        background: base.colors.background,
        text: base.colors.text,
        textSecondary: base.colors.textSecondary,
        grid: base.colors.grid,
        border: base.colors.border
      }
    : base.colors

  const theme: SemioticTheme = {
    ...base,
    mode,
    colors: {
      ...baseColors,
      ...resolved,
      ...(categorical && (completeNative || categorical.length > 0)
        ? { categorical }
        : {}),
      ...(sequential != null ? { sequential } : {}),
      ...(diverging != null ? { diverging } : {}),
      ...(selection != null ? { selection } : {}),
      ...(typeof selectionOpacity === "number" &&
      Number.isFinite(selectionOpacity) &&
      selectionOpacity >= 0 &&
      selectionOpacity <= 1
        ? { selectionOpacity }
        : {})
    },
    typography: {
      ...base.typography,
      ...(fontFamily ? { fontFamily } : {}),
      ...(titleSize != null ? { titleSize } : {}),
      ...(legendSize != null ? { legendSize } : {}),
      ...(legendFontFamily != null ? { legendFontFamily } : {}),
      ...(legendFontWeight != null ? { legendFontWeight } : {}),
      ...(titleFontSize != null ? { titleFontSize } : {}),
      ...(titleFontFamily != null ? { titleFontFamily } : {}),
      ...(titleFontWeight != null ? { titleFontWeight } : {}),
      ...(tickFontFamily != null ? { tickFontFamily } : {}),
      ...(tickSize != null ? { tickSize } : {}),
      ...(labelSize != null ? { labelSize } : {})
    },
    ...(aesthetics ? { aesthetics } : {}),
    ...(nativeGroup("tooltip") ? { tooltip } : {}),
    ...(nativeGroup("accessibility") ? { accessibility } : {}),
    ...(borderRadius != null ? { borderRadius } : {})
  }
  themeToCSSVariables(theme)
  return theme
}
