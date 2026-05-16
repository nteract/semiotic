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
  const wedgeCount = Object.keys(columns).length
  const isMultiZoneGauge = isGauge && wedgeCount > 1 && (config.cornerRadius ?? 0) > 0

  const cols = Object.values(columns)
  for (let i = 0; i < cols.length; i++) {
    const col = cols[i]
    const startAngle = startAngleOffset + col.pctStart * totalArc
    const endAngle = startAngleOffset + (col.pctStart + col.pct) * totalArc
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
      datum: col.pieceData,
      category: col.name,
    }
    if (isMultiZoneGauge) {
      node.roundedEnds = { start: isFirst, end: isLast }
    }
    nodes.push(node)
  }

  return nodes
}
