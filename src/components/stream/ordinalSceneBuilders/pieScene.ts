import type { WedgeSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { OrdinalSceneContext } from "./types"

/** Ring a donut falls back to when its requested hole does not fit. */
const FALLBACK_DONUT_RING = 12

/**
 * `innerRadius` is a pixel request, but the outer radius follows the plot
 * area. On a short plot the requested hole can be wider than the pie; drawing
 * that inverted ring paints it outside the plot, where the clip cuts it flat.
 * A hole that leaves at least a 1px ring is kept as requested (thin rings are
 * a legitimate style, and gauges size their hole against the radius they
 * reserve); one that does not falls back to a readable ring of
 * `FALLBACK_DONUT_RING` px, or a quarter of the radius on very small donuts.
 */
export function fitDonutInnerRadius(requested: number, outerRadius: number): number {
  if (!(requested > 0)) return 0
  if (requested <= outerRadius - 1) return requested
  return Math.max(0, outerRadius - Math.min(FALLBACK_DONUT_RING, outerRadius / 4))
}

export function buildPieScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): WedgeSceneNode[] {
  const { scales: _scales, config, resolvePieceStyle, getR } = ctx
  const nodes: WedgeSceneNode[] = []
  // cx/cy are 0 because StreamOrdinalFrame translates the canvas
  // to the center of the chart area for radial projection
  const cx = 0
  const cy = 0
  // Floor at 0: a plot under 8px would give a negative radius, which canvas
  // `arc()` rejects with an IndexSizeError.
  const outerRadius = Math.max(0, Math.min(layout.width, layout.height) / 2 - 4)
  const innerRadius = config.chartType === "donut"
    ? fitDonutInnerRadius(config.innerRadius ?? 60, outerRadius)
    : 0
  // Angles are in canvas convention (0 = 3 o'clock / east).
  // Start from 12 o'clock (-π/2) plus any user offset in degrees.
  // The SVG renderer (SceneToSVG.tsx) adds π/2 back when converting to d3-shape arcs.
  const startAngleOffset = -Math.PI / 2 + ((config.startAngle || 0) * Math.PI) / 180

  // sweepAngle limits the total arc (default: full circle). Used by GaugeChart for partial arcs.
  const totalArc = config.sweepAngle != null ? (config.sweepAngle * Math.PI) / 180 : Math.PI * 2

  // Gauge mode: partial-sweep arcs (sweepAngle < 360) where multiple
  // wedges line up end-to-end and the visual contract is "round only
  // the gauge's outer endpoints, leave internal zone seams square."
  // d3-shape arc().cornerRadius() rounds all 4 corners of every wedge,
  // which would round the seams too. The renderer honors `roundedEnds`
  // to override that on a per-side basis; we only mark the FIRST
  // wedge's start side and the LAST wedge's end side.
  const isGauge = config.sweepAngle != null && config.sweepAngle < 360
  const cols = ctx.orderedColumns
  const hasExplicitGaugeLayout = cols.some((col) => {
    const d = col.pieceData[0] as { _pct?: unknown; _pctStart?: unknown; _roundedEnds?: unknown } | undefined
    return d && (typeof d._pct === "number" || typeof d._pctStart === "number" || d._roundedEnds != null)
  })
  const wedgeCount = cols.length
  const isMultiZoneGauge = isGauge && !hasExplicitGaugeLayout && wedgeCount > 1 && (config.cornerRadius ?? 0) > 0
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i]
    const datum = col.pieceData[0] as {
      _pct?: number
      _pctStart?: number
      _roundedEnds?: { start?: boolean; end?: boolean }
      _nonInteractive?: boolean
      _gradientBand?: { colors: string[] }
    } | undefined
    const pctStart = typeof datum?._pctStart === "number" ? datum._pctStart : col.pctStart
    const pct = typeof datum?._pct === "number" ? datum._pct : col.pct
    const startAngle = startAngleOffset + pctStart * totalArc
    const endAngle = startAngleOffset + (pctStart + pct) * totalArc
    const style = resolvePieceStyle(col.pieceData[0], col.name)
    const isFirst = i === 0
    const isLast = i === cols.length - 1

    const node: WedgeSceneNode = {
      type: "wedge",
      cx, cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      ...(config.cornerRadius && { cornerRadius: config.cornerRadius }),
      style,
      datum: datum?._nonInteractive ? null : col.pieceData,
      accessibleDatum: {
        ...(col.pieceData.length === 1 ? col.pieceData[0] : {}),
        category: col.name,
        value: col.pieceData.reduce((total, piece) => total + getR(piece), 0),
        percent: pct * 100,
        count: col.pieceData.length,
        ...col.pieceData[0]?.__gaugeAccessibleDatum,
      },
      category: col.name,
    }
    if (datum?._roundedEnds) {
      node.roundedEnds = datum._roundedEnds
    } else if (isMultiZoneGauge) {
      node.roundedEnds = { start: isFirst, end: isLast }
    }
    if (datum?._gradientBand) {
      node._gradientBand = datum._gradientBand
    }
    nodes.push(node)
  }

  return nodes
}
