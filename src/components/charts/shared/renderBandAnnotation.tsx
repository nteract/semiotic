import { projectHeatmapBandBound } from "../../stream/heatmapBandTicks"
import { AnnotationLabel, type AnnotationLabelBackground } from "./AnnotationLabel"
import { bandLabelY, TOP_LABEL_BASELINE } from "./annotationLabelLayout"
import { resolveAnnotationBandFill } from "./annotationBandFill"
import type { Datum } from "./datumTypes"

interface BandOptions {
  scale: Parameters<typeof projectHeatmapBandBound>[0]
  width: number
  height: number
  id: string
  underLayer?: boolean
  color?: string
  background?: AnnotationLabelBackground
  fontSize?: number
  fontFamily?: string
}

export function renderBandAnnotation(ann: Datum, {
  scale, width, height, id, underLayer, color = "var(--semiotic-primary, #6366f1)",
  background = ann.labelBackground ?? "halo", fontSize = 11, fontFamily
}: BandOptions) {
  const xBand = ann.type === "x-band"
  const lower = xBand ? ann.x0 : ann.y0
  const upper = xBand ? ann.x1 : ann.y1
  const from = projectHeatmapBandBound(scale, lower, 0)
  const to = projectHeatmapBandBound(scale, upper, 1)
  if ((scale || xBand) && ((lower != null && from == null) || (upper != null && to == null))) return null
  const start = from ?? 0
  const end = to ?? (xBand ? width : height)
  const offset = Math.min(start, end)
  const size = Math.abs(end - start)
  const drawFill = !underLayer || ann.layer !== "under"
  const paint = resolveAnnotationBandFill(ann, id, xBand ? "horizontal" : "vertical", color)
  return (
    <g key={id} opacity={ann.opacity}>
      {drawFill && paint.def && <defs>{paint.def}</defs>}
      {drawFill && <rect x={xBand ? offset : 0} y={xBand ? 0 : offset}
        width={xBand ? size : width} height={xBand ? height : size}
        fill={paint.fill} fillOpacity={ann.fillOpacity ?? 0.1} />}
      {ann.label && <AnnotationLabel x={xBand ? offset + 4 : width - 4}
        y={xBand ? TOP_LABEL_BASELINE : bandLabelY(start, end)} textAnchor={xBand ? "start" : "end"}
        fill={ann.labelColor ?? (ann.color || color)} fontSize={fontSize} fontFamily={fontFamily}
        fontWeight="bold" text={ann.label} background={background} />}
    </g>
  )
}
