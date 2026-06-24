import type { Datum } from "../../charts/shared/datumTypes"
/**
 * Point/scatter/bubble scene builder.
 *
 * Handles: size scaling from sizeAccessor, color mapping from colorAccessor,
 * and pointId attachment for hit testing.
 *
 * Dependencies: SceneGraph (buildPointNode)
 * Consumed by: PipelineStore.buildSceneNodes (chartTypes "scatter", "bubble")
 */
import type { PointSceneNode, SymbolSceneNode } from "../types"
import { buildPointNode, buildSymbolNode } from "../SceneGraph"
import { SYMBOL_SEQUENCE, type SymbolName } from "../symbolPath"
import type { XYSceneContext } from "./types"

export function buildPointScene(ctx: XYSceneContext, data: Datum[]): (PointSceneNode | SymbolSceneNode)[] {
  const nodes: (PointSceneNode | SymbolSceneNode)[] = []
  const defaultR = ctx.config.chartType === "bubble" ? 10 : 5
  const sizeRange = ctx.config.sizeRange || [3, 15]

  // Compute size scale if sizeAccessor is set and no pointStyle handles it
  let sizeScale: ((v: number) => number) | null = null
  if (ctx.getSize && !ctx.config.pointStyle) {
    const sizes = data.map(d => ctx.getSize!(d)).filter(s => s != null && !Number.isNaN(s))
    if (sizes.length > 0) {
      let minSize = Infinity
      let maxSize = -Infinity
      for (const s of sizes) {
        if (s < minSize) minSize = s
        if (s > maxSize) maxSize = s
      }
      sizeScale = (s: number) => {
        if (minSize === maxSize) return (sizeRange[0] + sizeRange[1]) / 2
        return sizeRange[0] + ((s - minSize) / (maxSize - minSize)) * (sizeRange[1] - sizeRange[0])
      }
    }
  }

  // Build color map from colorAccessor
  const colorMap = ctx.getColor
    ? ctx.resolveColorMap(data)
    : null

  // Default point fill: theme primary > hardcoded #4e79a7. Resolved once
  // per scene build so it isn't rebuilt for every datum.
  const themedDefaultFill = ctx.config.themeSemantic?.primary || "#4e79a7"

  // Symbol (shape) channel: when a symbol accessor is set each mark renders as a
  // glyph instead of a circle. Explicit `symbolMap` wins; unmapped categories
  // auto-assign from SYMBOL_SEQUENCE in first-seen (deterministic) order.
  const getSymbol = ctx.getSymbol
  const symbolMapCfg = ctx.config.symbolMap
  const symbolAssign = new Map<string, SymbolName>()
  let symSeq = 0
  const shapeFor = (cat: string): SymbolName => {
    const explicit = symbolMapCfg?.[cat]
    if (explicit) return explicit
    let s = symbolAssign.get(cat)
    if (!s) {
      s = SYMBOL_SEQUENCE[symSeq % SYMBOL_SEQUENCE.length]
      symSeq++
      symbolAssign.set(cat, s)
    }
    return s
  }

  for (const d of data) {
    let style = ctx.config.pointStyle ? ctx.config.pointStyle(d) : { fill: themedDefaultFill, opacity: 0.8 }

    let r = style.r || defaultR
    if (sizeScale && ctx.getSize) {
      const sizeVal = ctx.getSize(d)
      if (sizeVal != null && !Number.isNaN(sizeVal)) {
        r = sizeScale(sizeVal)
      }
    }

    if (colorMap && ctx.getColor && !style.fill) {
      const colorVal = ctx.getColor(d)
      if (colorVal && colorMap.has(colorVal)) {
        style = { ...style, fill: colorMap.get(colorVal)! }
      }
    }

    const pointId = ctx.getPointId ? String(ctx.getPointId(d)) : undefined
    if (getSymbol) {
      // Encode the computed radius as d3-symbol area (πr²) so glyph size still
      // tracks `sizeBy`/`pointRadius`.
      const shape = shapeFor(String(getSymbol(d)))
      const node = buildSymbolNode(d, ctx.scales, ctx.getX, ctx.getY, Math.PI * r * r, shape, style, pointId)
      if (node) nodes.push(node)
    } else {
      const node = buildPointNode(d, ctx.scales, ctx.getX, ctx.getY, r, style, pointId)
      if (node) nodes.push(node)
    }
  }

  return nodes
}
