import type { AnnotationLabelBackground } from "../charts/shared/AnnotationLabel"
import { cssVarFallback, isCssVarPaint } from "../charts/shared/cssVarFallback"
import type { Datum } from "../charts/shared/datumTypes"
import type { SemioticTheme } from "../store/themeCore"

function standalonePaint(paint: string | undefined, fallback: string): string | undefined {
  if (!isCssVarPaint(paint)) return paint
  return cssVarFallback(paint) ?? fallback
}

/**
 * Resolve an annotation's `labelBackground` into an {@link AnnotationLabel}
 * `background` for the server path. Server SVG is standalone, so CSS vars
 * won't resolve — bake the theme's resolved background color into the halo /
 * box fill (unless the caller overrode `fill`), and replace a caller's
 * `var()` paint with its literal fallback. `defaultType` is the
 * per-annotation-type default when `labelBackground` is unset.
 */
export function ssrLabelBackground(
  ann: Datum,
  theme: SemioticTheme,
  defaultType: "halo" | "none",
): AnnotationLabelBackground {
  const lb = ann.labelBackground as AnnotationLabelBackground | undefined
  // A halo/box only aids legibility if it actually paints. The default light
  // theme's background is "transparent" (so charts compose over any page), but
  // baking that verbatim yields an invisible halo — a threshold label drawn
  // over a same-colored area (e.g. a semanticGradient fill) then vanishes. On
  // the client the halo is a CSS var that resolves to the real page background;
  // SSR is standalone, so fall back to the theme's opaque `surface` (the "paper"
  // behind the plot) whenever the background is transparent/unset.
  const rawBg = theme.colors.background
  const bg = rawBg && rawBg !== "transparent" ? rawBg : (theme.colors.surface || rawBg)
  if (lb === undefined) return defaultType === "none" ? "none" : { type: "halo", fill: bg }
  if (lb === false || lb === "none") return "none"
  if (lb === true || lb === "halo") return { type: "halo", fill: bg }
  if (lb === "box") return { type: "box", fill: bg }
  return {
    ...lb,
    fill: standalonePaint(lb.fill, bg) ?? bg,
    ...(lb.stroke !== undefined ? { stroke: standalonePaint(lb.stroke, theme.colors.border) } : {}),
  }
}
