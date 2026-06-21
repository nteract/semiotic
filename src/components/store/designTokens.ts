import type { Datum } from "../charts/shared/datumTypes"
import type { SemioticTheme } from "./ThemeStore"
import { DARK_THEME, LIGHT_THEME } from "./ThemeStore"

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
  return typeof node === "object" && node !== null && "$value" in (node as object)
}

/** Walk a DTCG tree into a flat list of tokens, inheriting group `$type`. */
function flattenDesignTokens(tokens: unknown): FlatToken[] {
  const out: FlatToken[] = []
  const walk = (node: unknown, path: string[], inheritedType?: string): void => {
    if (typeof node !== "object" || node === null) return
    const obj = node as Record<string, unknown>
    const groupType = (obj.$type as string | undefined) ?? inheritedType
    if (isTokenNode(obj)) {
      out.push({
        path: path.join("."),
        leaf: path[path.length - 1] ?? "",
        value: obj.$value,
        type: (obj.$type as string | undefined) ?? inheritedType,
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
  | "primary" | "secondary" | "background" | "surface" | "text" | "textSecondary"
  | "border" | "grid" | "focus" | "annotation"
  | "success" | "danger" | "warning" | "error" | "info"

/** Native `semiotic.*` token key → theme color role (exact inverse of themeToTokens). */
const NATIVE_COLOR: Record<string, ColorRole> = {
  bg: "background", text: "text", "text-secondary": "textSecondary", grid: "grid",
  border: "border", primary: "primary", focus: "focus", secondary: "secondary",
  surface: "surface", annotation: "annotation",
  success: "success", danger: "danger", warning: "warning", error: "error", info: "info",
}

/**
 * Heuristic leaf-name patterns per role, evaluated in order. The first unused
 * color token whose leaf matches wins. Ordering matters: the more specific
 * roles (textSecondary, error) are matched before their broader siblings.
 */
const COLOR_HEURISTICS: Array<[ColorRole, RegExp]> = [
  ["textSecondary", /^(text-?secondary|secondary-?text|muted|subtle|text-?muted|fg-?muted)$/],
  ["text", /^(text|foreground|fg|ink|on-?background|on-?surface|text-?default|fg-?default)$/],
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
  ["annotation", /^(annotation|callout)$/],
]

function isColor(t: FlatToken): boolean {
  return (t.type === "color" || typeof t.value === "string") && typeof t.value === "string"
}

// ── Mode detection ───────────────────────────────────────────────────────────

/** Relative luminance of a hex color (0 dark … 1 light); null if not parseable. */
function luminance(hex: unknown): number | null {
  if (typeof hex !== "string") return null
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  if (!/^[0-9a-f]{6}$/i.test(h)) return null
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
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
export function designTokensToTheme(tokens: Datum, options: DesignTokensToThemeOptions = {}): SemioticTheme {
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
    const role = m ? NATIVE_COLOR[m[1]] : undefined
    if (role && !(role in resolved) && typeof t.value === "string") {
      resolved[role] = t.value
      used.add(t.path)
    }
  }

  // 3. Heuristic leaf-name match (first unused color token per role).
  for (const [role, pattern] of COLOR_HEURISTICS) {
    if (role in resolved) continue
    const t = flat.find((f) => !used.has(f.path) && isColor(f) && pattern.test(f.leaf.toLowerCase()))
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
    flat.find((t) => Array.isArray(t.value) && /categor|chart|palette|qualitative|series/i.test(t.path))
  if (catToken && Array.isArray(catToken.value)) {
    categorical = catToken.value.filter((v): v is string => typeof v === "string")
  } else {
    const group = flat.filter(
      (t) => isColor(t) && /(^|\.)(categorical|chart|palette|qualitative|series)\b/i.test(t.path),
    )
    if (group.length >= 2) categorical = group.map((t) => t.value as string)
  }

  // Font family.
  const fontToken =
    (options.mapping?.fontFamily ? byPath.get(options.mapping.fontFamily) : undefined) ??
    byPath.get("semiotic.font-family") ??
    flat.find((t) => (t.type === "fontFamily" || /font-?family|typeface/i.test(t.leaf)) && (typeof t.value === "string" || Array.isArray(t.value)))
  const fontFamily = fontToken
    ? Array.isArray(fontToken.value)
      ? fontToken.value.join(", ")
      : typeof fontToken.value === "string"
        ? fontToken.value
        : undefined
    : undefined

  // Mode + base theme.
  const bgLum = luminance(resolved.background)
  const mode = options.base?.mode ?? (bgLum != null ? (bgLum < 0.5 ? "dark" : "light") : LIGHT_THEME.mode)
  const base = options.base ?? (mode === "dark" ? DARK_THEME : LIGHT_THEME)

  return {
    ...base,
    mode,
    colors: {
      ...base.colors,
      ...resolved,
      ...(categorical && categorical.length > 0 ? { categorical } : {}),
    },
    typography: {
      ...base.typography,
      ...(fontFamily ? { fontFamily } : {}),
    },
  }
}
