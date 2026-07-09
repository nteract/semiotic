/**
 * Shared frame theme color resolution for Stream Frames.
 *
 * Reads ThemeProvider / docs-shell CSS variables via getComputedStyle once
 * per cache version (see getCSSColorCacheVersion) so paint loops do not
 * re-query styles every rAF.
 */
import { getCSSColorCacheVersion } from "./renderers/resolveCSSColor"

export interface FrameThemeColors {
  axisStroke: string
  tickText: string
  crosshair: string
  hoverFill: string
  hoverStroke: string
  pointRing: string
  /** Primary accent — crosshair / highlight fallback when datum has no color. */
  primary: string
  /** Chart background from `--semiotic-bg` / surface tokens (may be empty). */
  background: string
}

export const LIGHT_FRAME_THEME: FrameThemeColors = {
  axisStroke: "#ccc",
  tickText: "#666",
  crosshair: "rgba(0, 0, 0, 0.25)",
  hoverFill: "rgba(255, 255, 255, 0.3)",
  hoverStroke: "rgba(0, 0, 0, 0.4)",
  pointRing: "white",
  primary: "#007bff",
  background: ""
}

/**
 * Append a 2-char hex alpha to an existing CSS color.
 * Expands 3-char hex; converts rgb() to rgba(); passes other forms through.
 */
export function withAlpha(color: string, alphaHex: string): string {
  const trimmed = color.trim()
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const r = trimmed[1], g = trimmed[2], b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`
  }
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return `${trimmed}${alphaHex}`
  }
  const rgbMatch = trimmed.match(/^rgb\s*\(\s*([^)]+?)\s*\)$/i)
  if (rgbMatch) {
    const alpha = parseInt(alphaHex, 16) / 255
    return `rgba(${rgbMatch[1]}, ${alpha.toFixed(3)})`
  }
  return trimmed
}

export function resolveFrameThemeColors(el: HTMLElement | null): FrameThemeColors {
  if (!el) return LIGHT_FRAME_THEME
  const style = getComputedStyle(el)

  const semioticBorder = style.getPropertyValue("--semiotic-border").trim()
  const semioticTextSecondary = style.getPropertyValue("--semiotic-text-secondary").trim()
  const semioticBg = style.getPropertyValue("--semiotic-bg").trim()
  const semioticPrimary = style.getPropertyValue("--semiotic-primary").trim()

  const textSecondary = semioticTextSecondary || style.getPropertyValue("--text-secondary").trim()
  const textPrimary = style.getPropertyValue("--text-primary").trim()
  const surface3 = semioticBorder || style.getPropertyValue("--surface-3").trim()
  const surface0 = semioticBg || style.getPropertyValue("--surface-0").trim()

  if (!textSecondary && !textPrimary && !semioticBorder && !semioticPrimary) {
    return LIGHT_FRAME_THEME
  }

  return {
    axisStroke: surface3 || LIGHT_FRAME_THEME.axisStroke,
    tickText: textSecondary || LIGHT_FRAME_THEME.tickText,
    crosshair: textSecondary ? withAlpha(textSecondary, "66") : LIGHT_FRAME_THEME.crosshair,
    hoverFill: surface0 ? withAlpha(surface0, "4D") : LIGHT_FRAME_THEME.hoverFill,
    hoverStroke: textSecondary ? withAlpha(textSecondary, "99") : LIGHT_FRAME_THEME.hoverStroke,
    pointRing: surface0 || LIGHT_FRAME_THEME.pointRing,
    primary: semioticPrimary || LIGHT_FRAME_THEME.primary,
    background: surface0 || LIGHT_FRAME_THEME.background
  }
}

/** Version-keyed cache for a frame instance's theme colors. */
export function createFrameThemeColorCache() {
  let version = -1
  let colors: FrameThemeColors = LIGHT_FRAME_THEME
  return {
    resolve(el: HTMLElement | null): FrameThemeColors {
      if (!el) return LIGHT_FRAME_THEME
      const v = getCSSColorCacheVersion()
      if (v === version) return colors
      colors = resolveFrameThemeColors(el)
      version = v
      return colors
    },
    invalidate() {
      version = -1
    }
  }
}
