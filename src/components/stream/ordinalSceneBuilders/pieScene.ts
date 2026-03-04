import type { WedgeSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { OrdinalSceneContext } from "./types"

export function buildPieScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): WedgeSceneNode[] {
  const { scales, columns, config, resolvePieceStyle } = ctx
  const nodes: WedgeSceneNode[] = []
  // cx/cy are 0 because StreamOrdinalFrame translates the canvas
  // to the center of the chart area for radial projection
  const cx = 0
  const cy = 0
  const outerRadius = Math.min(layout.width, layout.height) / 2 - 4
  const innerRadius = config.chartType === "donut" ? (config.innerRadius || 60) : 0
  // Start from 12 o'clock (-π/2) plus any user offset
  const startAngleOffset = -Math.PI / 2 + ((config.startAngle || 0) * Math.PI) / 180

  const twoPi = Math.PI * 2

  for (const col of Object.values(columns)) {
    const startAngle = startAngleOffset + col.pctStart * twoPi
    const endAngle = startAngleOffset + (col.pctStart + col.pct) * twoPi
    const style = resolvePieceStyle(col.pieceData[0], col.name)

    nodes.push({
      type: "wedge",
      cx, cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      style,
      datum: col.pieceData,
      category: col.name
    })
  }

  return nodes
}
