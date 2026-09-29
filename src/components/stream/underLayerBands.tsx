/**
 * `band` and `x-band` annotations with `layer: "under"` draw their fill
 * beneath the data marks instead of in the annotation overlay, so a shaded
 * range doesn't wash out the bars or areas inside it. The label stays in the
 * overlay, above the marks. The fill paints on the data canvas after the
 * background (browser) and before the marks in static SVG, through the same
 * pre-renderer pass QuadrantChart uses for its fills.
 */
import * as React from "react"
import { filterAnnotationsByStatus } from "../charts/shared/annotationStatusFilter"
import type { Datum } from "../charts/shared/datumTypes"
import { resolveAnnotationBandFill } from "../charts/shared/annotationBandFill"
import { normalizeAnnotationGradient } from "../charts/shared/hatchFill"
import { buildLinearFillGradient, resolveCanvasPaint } from "./renderers/canvasRenderHelpers"
import type { CanvasRendererFn, SceneNode, StreamLayout, StreamScales, SVGPreRendererFn } from "./types"
import { useStableShallow } from "./useStableShallow"

const DEFAULT_BAND_FILL = "var(--semiotic-primary, #6366f1)"

type BandScale = ((value: unknown) => number) & { domain?: () => unknown[] }

/** True for a `band` / `x-band` annotation that opts into `layer: "under"`. */
export function isUnderLayerBand(annotation: Datum): boolean {
  return annotation.layer === "under" && (annotation.type === "band" || annotation.type === "x-band")
}

/**
 * Plot-space rect a band covers: the full width between `y0`/`y1` (`band`) or
 * the full height between `x0`/`x1` (`x-band`). A null or omitted bound
 * extends to that axis' domain edge. Null when the axis has no scale.
 */
export function underBandRect(
  annotation: Datum,
  scales: { x?: unknown; y?: unknown },
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } | null {
  const horizontal = annotation.type === "band"
  const scale = (horizontal ? scales.y : scales.x) as BandScale | undefined
  if (typeof scale !== "function") return null
  const domain = scale.domain?.()
  const from = scale((horizontal ? annotation.y0 : annotation.x0) ?? domain?.[0])
  const to = scale((horizontal ? annotation.y1 : annotation.x1) ?? domain?.[1])
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null
  // Clamp to the plot: the canvas clips, but the component-SSR branch draws
  // pre-renderers unclipped, and a bound past the domain would spill over.
  const extent = horizontal ? height : width
  const start = Math.min(extent, Math.max(0, Math.min(from, to)))
  const size = Math.max(0, Math.min(extent, Math.max(from, to)) - start)
  return horizontal
    ? { x: 0, y: start, width, height: size }
    : { x: start, y: 0, width: size, height }
}

function gradientDirection(annotation: Datum): "horizontal" | "vertical" {
  return annotation.type === "band" ? "vertical" : "horizontal"
}

/** Canvas pre-renderer that paints each under-layer band's fill. */
export function underBandCanvasRenderer(bands: readonly Datum[]): CanvasRendererFn {
  return (ctx, _nodes, scales, layout) => {
    const baseAlpha = ctx.globalAlpha
    for (const band of bands) {
      const rect = underBandRect(band, scales, layout.width, layout.height)
      if (!rect) continue
      const paint = band.fill ?? band.color
      const baseColor = typeof paint === "string" && paint ? paint : DEFAULT_BAND_FILL
      const gradient = normalizeAnnotationGradient(band.gradient, gradientDirection(band), baseColor)
      const horizontalGradient = gradient?.direction === "horizontal"
      ctx.globalAlpha = baseAlpha * (band.opacity ?? 1) * (band.fillOpacity ?? 0.1)
      ctx.fillStyle = (gradient && buildLinearFillGradient(
        ctx,
        gradient,
        baseColor,
        rect.x,
        rect.y,
        horizontalGradient ? rect.x + rect.width : rect.x,
        horizontalGradient ? rect.y : rect.y + rect.height
      )) || resolveCanvasPaint(ctx, paint, DEFAULT_BAND_FILL)
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    }
    ctx.globalAlpha = baseAlpha
  }
}

/**
 * Static-SVG counterpart of {@link underBandCanvasRenderer}. `fallback` is the
 * paint for a band without `fill`/`color`; renderChart passes the theme's
 * annotation color, as its over-the-data bands use.
 */
export function underBandSVGRenderer(
  bands: readonly Datum[],
  idPrefix = "under-band",
  fallback = DEFAULT_BAND_FILL
): SVGPreRendererFn {
  return (_nodes, scales, layout) => bands.map((band, index) => {
    const rect = underBandRect(band, scales, layout.width, layout.height)
    if (!rect) return null
    const bandFill = resolveAnnotationBandFill(band, `${idPrefix}-${index}`, gradientDirection(band), fallback)
    return (
      <g key={`${idPrefix}-${index}`} opacity={band.opacity}>
        {bandFill.def && <defs>{bandFill.def}</defs>}
        <rect {...rect} fill={bandFill.fill} fillOpacity={band.fillOpacity ?? 0.1} />
      </g>
    )
  })
}

/**
 * The frame's pre-renderers with the under-layer bands in `annotations` drawn
 * first. Stable while the bands stay shallow-equal, so an inline annotations
 * array doesn't repaint the data canvas every render; unchanged (the authored
 * arrays) when there are no under-layer bands.
 */
export function useUnderLayerBandRenderers(
  annotations: readonly Datum[] | undefined,
  canvasPreRenderers: CanvasRendererFn[] | undefined,
  svgPreRenderers: SVGPreRendererFn[] | undefined
): { canvasPreRenderers: CanvasRendererFn[] | undefined; svgPreRenderers: SVGPreRendererFn[] | undefined } {
  // Instance-unique, so hatch/gradient defs don't collide across charts in
  // server-rendered markup.
  const idPrefix = `under-band-${React.useId().replace(/:/g, "")}`
  // Keyed by index so the two-level shallow compare reaches each band's fields
  // (it compares array entries by identity).
  const byIndex = useStableShallow(
    React.useMemo((): Record<number, Datum> => Object.assign({}, filterAnnotationsByStatus(annotations ?? []).filter(isUnderLayerBand)), [annotations])
  )
  const bands = React.useMemo(() => Object.values(byIndex), [byIndex])
  return React.useMemo(() => bands.length === 0
    ? { canvasPreRenderers, svgPreRenderers }
    : {
        canvasPreRenderers: [underBandCanvasRenderer(bands), ...(canvasPreRenderers ?? [])],
        svgPreRenderers: [underBandSVGRenderer(bands, idPrefix), ...(svgPreRenderers ?? [])]
      }, [bands, canvasPreRenderers, svgPreRenderers, idPrefix])
}

/** Run canvas pre-renderers beneath the data marks, isolating each one's context state. */
export function paintCanvasPreRenderers(
  ctx: CanvasRenderingContext2D,
  renderers: CanvasRendererFn[] | undefined,
  nodes: SceneNode[],
  scales: StreamScales | null | undefined,
  layout: StreamLayout
): void {
  if (!renderers || !scales) return
  for (const renderer of renderers) {
    ctx.save()
    renderer(ctx, nodes, scales, layout)
    ctx.restore()
  }
}
