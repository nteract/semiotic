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

export type PhysicsCanvasThemeCSSKey = keyof typeof THEME_CANDIDATES

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
  const candidate = THEME_CANDIDATES[key]
  return candidate.names.reduceRight(
    (fallback, name) => `var(${name}, ${fallback})`,
    candidate.fallback
  )
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
  const primary = readCSSVar(ctx, style, THEME_CANDIDATES.primary)
  const danger = readCSSVar(ctx, style, THEME_CANDIDATES.danger)
  const warning = readCSSVar(ctx, style, THEME_CANDIDATES.warning)
  const success = readCSSVar(ctx, style, THEME_CANDIDATES.success)
  const border = readCSSVar(ctx, style, THEME_CANDIDATES.border)
  const background = readCSSVar(ctx, style, THEME_CANDIDATES.background)
  const text = readCSSVar(ctx, style, THEME_CANDIDATES.text)
  const textSecondary = readCSSVar(ctx, style, THEME_CANDIDATES.textSecondary)
  const focus = readCSSVar(ctx, style, THEME_CANDIDATES.focus)
  const grid = readCSSVar(ctx, style, THEME_CANDIDATES.grid)

  return {
    annotationBackground: physicsCanvasColorWithAlpha(background, 0.94),
    annotationStroke: border,
    annotationText: text,
    background,
    border,
    closedWindowFill: physicsCanvasColorWithAlpha(danger, 0.08),
    closedWindowStroke: physicsCanvasColorWithAlpha(danger, 0.55),
    danger,
    focus,
    grid,
    gutterFill: physicsCanvasColorWithAlpha(textSecondary, 0.14),
    lateFill: warning,
    openWindowFill: physicsCanvasColorWithAlpha(primary, 0.07),
    openWindowStroke: physicsCanvasColorWithAlpha(primary, 0.3),
    primary,
    selectedFill: warning,
    selectedStroke: focus,
    success,
    text,
    textSecondary,
    warning
  }
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
