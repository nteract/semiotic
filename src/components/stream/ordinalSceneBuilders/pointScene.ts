import type { OrdinalSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { Style } from "../types"
import type { Datum } from "../../charts/shared/datumTypes"
import { SYMBOL_SEQUENCE, type SymbolName } from "../symbolPath"
import type { OrdinalSceneContext } from "./types"

/**
 * Build a per-call category→shape resolver for the symbolBy channel, or null
 * when no symbol accessor is set. Explicit `symbolMap` wins; unmapped categories
 * auto-assign from SYMBOL_SEQUENCE in first-seen (deterministic) order. Mirrors
 * the XY point scene builder so swarm/dot glyphs match Scatterplot's.
 */
function makeShapeResolver(ctx: OrdinalSceneContext): ((d: Datum) => SymbolName) | null {
  const getSymbol = ctx.getSymbol
  if (!getSymbol) return null
  const symbolMapCfg = ctx.config.symbolMap
  const assign = new Map<string, SymbolName>()
  let seq = 0
  return (d: Datum) => {
    const cat = String(getSymbol(d))
    const explicit = symbolMapCfg?.[cat]
    if (explicit) return explicit
    let s = assign.get(cat)
    if (!s) {
      s = SYMBOL_SEQUENCE[seq % SYMBOL_SEQUENCE.length]
      seq++
      assign.set(cat, s)
    }
    return s
  }
}

/** Emit a point or, when symbolBy is active, a glyph (size = πr²) at (px, py). */
function pushMark(
  nodes: OrdinalSceneNode[],
  shapeFor: ((d: Datum) => SymbolName) | null,
  d: Datum,
  px: number,
  py: number,
  r: number,
  style: Style
): void {
  if (shapeFor) {
    nodes.push({ type: "symbol", x: px, y: py, size: Math.PI * r * r, symbolType: shapeFor(d), style, datum: d })
  } else {
    nodes.push({ type: "point", x: px, y: py, r, style, datum: d })
  }
}

export function buildPointScene(ctx: OrdinalSceneContext, _layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, getR, multiScales, resolvePieceStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isVertical = projection === "vertical"
  const isRadial = projection === "radial"
  const hasMultiAxis = multiScales.length > 0
  const shapeFor = makeShapeResolver(ctx)

  const twoPi = Math.PI * 2
  const startAngleOffset = -Math.PI / 2

  for (const col of Object.values(columns)) {
    for (const d of col.pieceData) {
      const rIndex = d.__rIndex ?? 0
      const val = d.__rValue ?? getR(d)
      const scale = hasMultiAxis ? (multiScales[rIndex] || rScale) : rScale
      const style = resolvePieceStyle(d, col.name)
      const r = style.r || 5

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

      pushMark(nodes, shapeFor, d, px, py, r, style)
    }
  }

  return nodes
}

export function buildSwarmScene(ctx: OrdinalSceneContext, _layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, getR, resolvePieceStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isVertical = projection === "vertical"
  const shapeFor = makeShapeResolver(ctx)

  for (const col of Object.values(columns)) {
    // Simple jittered placement (real force sim in Phase 3)
    const halfWidth = col.width / 2
    for (let i = 0; i < col.pieceData.length; i++) {
      const d = col.pieceData[i]
      const val = getR(d)
      const style = resolvePieceStyle(d, col.name)
      const r = style.r || 4

      // Deterministic jitter based on index
      const jitter = (((i * 7919) % 100) / 100 - 0.5) * halfWidth * 0.8

      const px = isVertical ? col.middle + jitter : rScale(val)
      const py = isVertical ? rScale(val) : col.middle + jitter

      pushMark(nodes, shapeFor, d, px, py, r, style)
    }
  }

  return nodes
}
