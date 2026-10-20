import {
  getCSSColorCacheVersion,
  resolveCSSColor
} from "../renderers/resolveCSSColor"

export interface PhysicsCanvasTheme {
  annotationBackground: string
  annotationStroke: string
  annotationText: string
  background: string
  border: string
  closedWindowFill: string
  closedWindowStroke: string
  danger: string
  focus: string
  grid: string
  gutterFill: string
  lateFill: string
  openWindowFill: string
  openWindowStroke: string
  primary: string
  selectedFill: string
  selectedStroke: string
  success: string
  text: string
  textSecondary: string
  warning: string
}

export const DEFAULT_PHYSICS_CANVAS_THEME: PhysicsCanvasTheme = {
  annotationBackground: "rgba(248, 250, 252, 0.94)",
  annotationStroke: "#334155",
  annotationText: "#0f172a",
  background: "#f8fafc",
  border: "#334155",
  closedWindowFill: "rgba(220, 38, 38, 0.08)",
  closedWindowStroke: "rgba(220, 38, 38, 0.55)",
  danger: "#dc2626",
  focus: "#f97316",
  grid: "#cbd5e1",
  gutterFill: "rgba(71, 85, 105, 0.14)",
  lateFill: "#f97316",
  openWindowFill: "rgba(14, 165, 233, 0.07)",
  openWindowStroke: "rgba(14, 165, 233, 0.3)",
  primary: "#0ea5e9",
  selectedFill: "#f97316",
  selectedStroke: "#7c2d12",
  success: "#22c55e",
  text: "#0f172a",
  textSecondary: "#475569",
  warning: "#f97316"
}

type CSSVarCandidate = {
  fallback: string
  names: string[]
}

const THEME_CANDIDATES: Record<
  | "background"
  | "border"
  | "danger"
  | "focus"
  | "grid"
  | "primary"
  | "success"
  | "text"
  | "textSecondary"
  | "warning",
  CSSVarCandidate
> = {
  background: {
    names: ["--semiotic-bg", "--surface-1", "--surface-0"],
    fallback: DEFAULT_PHYSICS_CANVAS_THEME.background
  },
  border: {
    names: ["--semiotic-border", "--surface-3"],
    fallback: DEFAULT_PHYSICS_CANVAS_THEME.border
  },
  danger: {
    names: ["--semiotic-danger", "--viz-4"],
    fallback: DEFAULT_PHYSICS_CANVAS_THEME.danger
  },
  focus: {
    names: ["--semiotic-focus", "--accent", "--viz-9"],
    fallback: DEFAULT_PHYSICS_CANVAS_THEME.focus
  },
  grid: {
    names: ["--semiotic-grid", "--surface-3"],
    fallback: DEFAULT_PHYSICS_CANVAS_THEME.grid
  },
  primary: {
    names: ["--semiotic-primary", "--accent", "--viz-5"],
    fallback: DEFAULT_PHYSICS_CANVAS_THEME.primary
  },
  success: {
    names: ["--semiotic-success", "--viz-2"],
    fallback: DEFAULT_PHYSICS_CANVAS_THEME.success
  },
  text: {
    names: ["--semiotic-text", "--text-primary"],
    fallback: DEFAULT_PHYSICS_CANVAS_THEME.text
  },
  textSecondary: {
    names: ["--semiotic-text-secondary", "--text-secondary"],
    fallback: DEFAULT_PHYSICS_CANVAS_THEME.textSecondary
  },
  warning: {
    names: ["--semiotic-warning", "--viz-9", "--viz-3"],
    fallback: DEFAULT_PHYSICS_CANVAS_THEME.warning
  }
}

export type PhysicsCanvasThemeCSSKey = keyof PhysicsCanvasTheme

/** Each palette key has a dedicated camelCase CSS custom property. */
export function physicsThemeVariables(
  theme?: Partial<PhysicsCanvasTheme>
): Record<string, string> {
  const variables = Object.fromEntries(
    Object.entries(theme ?? {})
      .filter(([, value]) => value != null)
      .map(([key, value]) => [`--semiotic-physics-${key}`, value])
  )
  // Shared title/legend chrome reads the general tokens. Explicit frame
  // overrides scope those too, so an object palette reaches every layer.
  for (const key of Object.keys(THEME_CANDIDATES) as Array<
    keyof typeof THEME_CANDIDATES
  >) {
    if (theme?.[key] != null)
      variables[THEME_CANDIDATES[key].names[0]] = theme[key]!
  }
  return variables
}

const DERIVED_THEME_KEYS: Partial<
  Record<keyof PhysicsCanvasTheme, [keyof typeof THEME_CANDIDATES, number?]>
> = {
  annotationBackground: ["background", 0.94],
  annotationStroke: ["border"],
  annotationText: ["text"],
  closedWindowFill: ["danger", 0.08],
  closedWindowStroke: ["danger", 0.55],
  gutterFill: ["textSecondary", 0.14],
  lateFill: ["warning"],
  openWindowFill: ["primary", 0.07],
  openWindowStroke: ["primary", 0.3],
  selectedFill: ["warning"],
  selectedStroke: ["focus"]
}

/**
 * Serialize the canvas theme's ordered CSS-variable candidates for SVG/SSR.
 *
 * Canvas reads the first non-empty computed custom property at paint time.
 * A nested `var()` chain gives settled SVG the same candidate order and the
 * same unthemed fallback without requiring DOM style inspection on the server.
 */
export function physicsCanvasThemeCSSValue(
  key: PhysicsCanvasThemeCSSKey
): string {
  const candidate = THEME_CANDIDATES[key as keyof typeof THEME_CANDIDATES]
  const derived = DERIVED_THEME_KEYS[key]
  let fallback = DEFAULT_PHYSICS_CANVAS_THEME[key]
  if (candidate)
    fallback = candidate.names.reduceRight(
      (value, name) => `var(${name}, ${value})`,
      candidate.fallback
    )
  else if (derived) {
    const base = physicsCanvasThemeCSSValue(derived[0])
    fallback =
      derived[1] == null
        ? base
        : `color-mix(in srgb, ${base} ${derived[1] * 100}%, transparent)`
  }
  return `var(--semiotic-physics-${key}, ${fallback})`
}

function readCSSVar(
  ctx: CanvasRenderingContext2D,
  style: CSSStyleDeclaration | null,
  candidate: CSSVarCandidate
): string {
  if (!style) return candidate.fallback
  for (const name of candidate.names) {
    const value = style.getPropertyValue(name).trim()
    if (!value) continue
    return resolveCSSColor(ctx, value) ?? value
  }
  return candidate.fallback
}

export function physicsCanvasColorWithAlpha(
  color: string,
  opacity: number
): string {
  const alpha = Math.max(0, Math.min(1, opacity))
  const trimmed = color.trim()
  const hex3 = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (hex3) {
    const [, r, g, b] = hex3
    return physicsCanvasColorWithAlpha(`#${r}${r}${g}${g}${b}${b}`, alpha)
  }
  const hex6 = trimmed.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (hex6) {
    const [, r, g, b] = hex6
    return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`
  }
  const rgb = trimmed.match(/^rgb\s*\(\s*([^)]+?)\s*\)$/i)
  if (rgb) return `rgba(${rgb[1]}, ${alpha})`
  const rgba = trimmed.match(
    /^rgba\s*\(\s*([^,]+,\s*[^,]+,\s*[^,]+),\s*[^)]+\)$/i
  )
  if (rgba) return `rgba(${rgba[1]}, ${alpha})`
  return trimmed
}

export function resolvePhysicsCanvasTheme(
  ctx: CanvasRenderingContext2D
): PhysicsCanvasTheme {
  const canvas = ctx.canvas
  const style =
    typeof getComputedStyle === "function" && canvas
      ? getComputedStyle(canvas)
      : null
  const theme = { ...DEFAULT_PHYSICS_CANVAS_THEME }
  for (const key of Object.keys(THEME_CANDIDATES) as Array<
    keyof typeof THEME_CANDIDATES
  >) {
    const candidate = THEME_CANDIDATES[key]
    theme[key] = readCSSVar(ctx, style, {
      ...candidate,
      names: [`--semiotic-physics-${key}`, ...candidate.names]
    })
  }
  for (const key of Object.keys(DERIVED_THEME_KEYS) as Array<
    keyof PhysicsCanvasTheme
  >) {
    const [base, alpha] = DERIVED_THEME_KEYS[key]!
    theme[key] = readCSSVar(ctx, style, {
      names: [`--semiotic-physics-${key}`],
      fallback:
        alpha == null
          ? theme[base]
          : physicsCanvasColorWithAlpha(theme[base], alpha)
    })
  }
  return theme
}

/**
 * Version-keyed per-frame cache for the derived physics palette. Continuous
 * simulations can call this every tick without forcing style recalculation;
 * ThemeProvider and scoped CSS invalidation bump the shared color-cache
 * version before the next paint.
 */
export function createPhysicsCanvasThemeCache() {
  let canvas: HTMLCanvasElement | null = null
  let version = -1
  let theme = DEFAULT_PHYSICS_CANVAS_THEME

  return {
    resolve(ctx: CanvasRenderingContext2D): PhysicsCanvasTheme {
      const nextCanvas = ctx.canvas ?? null
      const nextVersion = getCSSColorCacheVersion()
      if (nextCanvas === canvas && nextVersion === version) return theme
      canvas = nextCanvas
      version = nextVersion
      theme = resolvePhysicsCanvasTheme(ctx)
      return theme
    },
    invalidate(): void {
      version = -1
    }
  }
}
