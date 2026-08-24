import { resolveCSSColor } from "./resolveCSSColor"

/** Resolve the inherited chart font token for canvas, which has no CSS cascade. */
export function resolveCanvasFontFamily(ctx: CanvasRenderingContext2D): string {
  return (
    resolveCSSColor(ctx, "var(--semiotic-font-family, sans-serif)") ||
    "sans-serif"
  )
}
