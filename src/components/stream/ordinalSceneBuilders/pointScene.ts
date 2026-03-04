import type { OrdinalSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { OrdinalSceneContext } from "./types"

export function buildPointScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, getR, multiScales, resolvePieceStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isVertical = projection === "vertical"
  const isRadial = projection === "radial"
  const hasMultiAxis = multiScales.length > 0

  const twoPi = Math.PI * 2
  const startAngleOffset = -Math.PI / 2

  for (const col of Object.values(columns)) {
    for (const d of col.pieceData) {
      const rIndex = d.__rIndex ?? 0
      const val = d.__rValue ?? getR(d)
      const scale = hasMultiAxis ? (multiScales[rIndex] || rScale) : rScale
      const style = resolvePieceStyle(d, col.name)
      const r = (style as any).r || 5

      let px: number, py: number

      if (isRadial) {
        // Radial: angle from category position, radius from value
        const midAngle = startAngleOffset + (col.pctStart + col.pct / 2) * twoPi
        const radius = scale(val)
        px = Math.cos(midAngle) * radius
        py = Math.sin(midAngle) * radius
      } else if (isVertical) {
        px = col.middle
        py = scale(val)
      } else {
        px = scale(val)
        py = col.middle
      }

      nodes.push({ type: "point", x: px, y: py, r, style, datum: d })
    }
  }

  return nodes
}

export function buildSwarmScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, getR, resolvePieceStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isVertical = projection === "vertical"

  for (const col of Object.values(columns)) {
    // Simple jittered placement (real force sim in Phase 3)
    const halfWidth = col.width / 2
    for (let i = 0; i < col.pieceData.length; i++) {
      const d = col.pieceData[i]
      const val = getR(d)
      const style = resolvePieceStyle(d, col.name)
      const r = (style as any).r || 4

      // Deterministic jitter based on index
      const jitter = (((i * 7919) % 100) / 100 - 0.5) * halfWidth * 0.8

      const px = isVertical ? col.middle + jitter : rScale(val)
      const py = isVertical ? rScale(val) : col.middle + jitter

      nodes.push({ type: "point", x: px, y: py, r, style, datum: d })
    }
  }

  return nodes
}
