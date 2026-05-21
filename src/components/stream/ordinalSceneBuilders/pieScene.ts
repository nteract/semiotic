import type { WedgeSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { OrdinalSceneContext } from "./types"

export function buildPieScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): WedgeSceneNode[] {
  const { scales: _scales, columns, config, resolvePieceStyle } = ctx
  const nodes: WedgeSceneNode[] = []
  // cx/cy are 0 because StreamOrdinalFrame translates the canvas
  // to the center of the chart area for radial projection
  const cx = 0
  const cy = 0
  const outerRadius = Math.min(layout.width, layout.height) / 2 - 4
  const innerRadius = config.chartType === "donut" ? (config.innerRadius || 60) : 0
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
  const cols = Object.values(columns)
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
