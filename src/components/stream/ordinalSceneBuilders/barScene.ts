import { buildRectNode } from "../SceneGraph"
import { aggregateOrdinalColumns } from "../ordinalAggregation"
import type { OrdinalSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { RectSceneNode } from "../types"
import type { OrdinalSceneContext } from "./types"

function radiusForBar(
  roundedTop: OrdinalSceneContext["config"]["roundedTop"],
  node: RectSceneNode,
  isVertical: boolean
): number {
  const requested = typeof roundedTop === "function"
    ? roundedTop(isVertical ? node.w : node.h)
    : roundedTop
  return typeof requested === "number" && Number.isFinite(requested)
    ? Math.max(0, requested)
    : 0
}

export function buildBarScene(ctx: OrdinalSceneContext, _layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, config, getR, getStack, resolvePieceStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isVertical = projection === "vertical"
  const isHorizontal = projection === "horizontal"
  const normalize = config.normalize

  const { steps, keys: stackKeys } = aggregateOrdinalColumns(
    Object.values(columns), getR, getStack, normalize
  )
  for (const { col, groups: stacks } of steps) {
    let posOffset = 0
    let negOffset = 0

    // Iterate in global stack key order for consistent stacking across columns
    for (const stackKey of stackKeys) {
      const group = stacks.get(stackKey)
      if (!group) continue
      // Use the aggregated total for the stack group (one rect per group)
      const val = group.value

      // Use the first piece for styling — look up barColors by stack key (not category)
      const style = getStack
        ? resolvePieceStyle(group.pieces[0], stackKey)
        : resolvePieceStyle(group.pieces[0], col.name)
      // Build a synthetic datum that includes the aggregate info
      const aggDatum = {
        ...group.pieces[0],
        __aggregateValue: group.total,
        __pieceCount: group.pieces.length,
        category: col.name
      }

      if (isVertical) {
        const actualY = val >= 0
          ? rScale(posOffset + val)
          : rScale(negOffset)
        const actualH = val >= 0
          ? rScale(posOffset) - rScale(posOffset + val)
          : rScale(negOffset + val) - rScale(negOffset)

        nodes.push(buildRectNode(
          col.x, actualY, col.width, Math.abs(actualH),
          style, aggDatum, stackKey
        ))

        if (val >= 0) posOffset += val
        else negOffset += val
      } else if (isHorizontal) {
        const actualX = val >= 0
          ? rScale(posOffset)
          : rScale(negOffset + val)
        const actualW = val >= 0
          ? rScale(posOffset + val) - rScale(posOffset)
          : rScale(negOffset) - rScale(negOffset + val)

        nodes.push(buildRectNode(
          actualX, col.x, Math.abs(actualW), col.width,
          style, aggDatum, stackKey
        ))

        if (val >= 0) posOffset += val
        else negOffset += val
      }
    }
  }

  const isV = projection === "vertical"

  // Tag every segment with its tip edge (away from baseline) and the optional
  // gradient. roundedEdge is set unconditionally so gradients resolve orientation
  // even when roundedTop is zero — the renderer only actually rounds when
  // roundedTop > 0. gradientFill is applied per-segment so each stack piece
  // fades tip→base along its own rect.
  for (const n of nodes) {
    if (n.type !== "rect") continue
    const val = n.datum?.__aggregateValue ?? 0
    if (isV) {
      n.roundedEdge = val >= 0 ? "top" : "bottom"
    } else {
      n.roundedEdge = val >= 0 ? "right" : "left"
    }
    if (config.gradientFill) {
      n.fillGradient = config.gradientFill
    }
  }

  // Rounded corners still go on only the outermost segment per category.
  if (config.roundedTop !== undefined) {
    const byCat = new Map<string, RectSceneNode[]>()
    for (const n of nodes) {
      if (n.type !== "rect") continue
      const cat = n.datum?.category || ""
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat)!.push(n)
    }
    for (const rects of byCat.values()) {
      if (rects.length === 0) continue
      const positive = rects.filter(n => (n.datum?.__aggregateValue ?? 0) >= 0)
      const negative = rects.filter(n => (n.datum?.__aggregateValue ?? 0) < 0)
      if (positive.length > 0) {
        const topmost = isV
          ? positive.reduce((a, b) => a.y < b.y ? a : b)
          : positive.reduce((a, b) => (a.x + a.w) > (b.x + b.w) ? a : b)
        const radius = radiusForBar(config.roundedTop, topmost, isV)
        if (radius > 0) topmost.roundedTop = radius
      }
      if (negative.length > 0) {
        const bottommost = isV
          ? negative.reduce((a, b) => (a.y + a.h) > (b.y + b.h) ? a : b)
          : negative.reduce((a, b) => a.x < b.x ? a : b)
        const radius = radiusForBar(config.roundedTop, bottommost, isV)
        if (radius > 0) bottommost.roundedTop = radius
      }
    }
  }

  return nodes
}

export function buildClusterBarScene(ctx: OrdinalSceneContext, _layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, config, getR, getGroup, resolvePieceStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isVertical = projection === "vertical"

  const { steps, keys: groupKeys } = aggregateOrdinalColumns(Object.values(columns), getR, getGroup)
  const groupCount = groupKeys.length || 1

  // Inner padding between bars within a group (fraction of sub-bar width)
  const innerPadRatio = 0.2

  for (const { col, groups } of steps) {
    const subWidth = col.width / groupCount
    const innerPad = subWidth * innerPadRatio
    const barWidth = subWidth - innerPad
    for (let gi = 0; gi < groupKeys.length; gi++) {
      const groupData = groups.get(groupKeys[gi])?.pieces || []
      for (const d of groupData) {
        const val = getR(d)
        const style = resolvePieceStyle(d, groupKeys[gi])

        if (isVertical) {
          const barX = col.x + gi * subWidth + innerPad / 2
          const zeroY = rScale(0)
          const valY = rScale(val)
          nodes.push(buildRectNode(
            barX, Math.min(zeroY, valY), barWidth, Math.abs(zeroY - valY),
            style, d, groupKeys[gi]
          ))
        } else {
          const barY = col.x + gi * subWidth + innerPad / 2
          const zeroX = rScale(0)
          const valX = rScale(val)
          nodes.push(buildRectNode(
            Math.min(zeroX, valX), barY, Math.abs(valX - zeroX), barWidth,
            style, d, groupKeys[gi]
          ))
        }
      }
    }
  }

  // Tag every bar with the edge opposite the baseline (the "tip"). Used by
  // the renderer for rounded-corner placement AND for gradient direction —
  // we want gradients running from tip → base regardless of orientation or
  // sign. Setting this unconditionally (not only when roundedTop > 0) keeps
  // gradient direction resolvable without roundedTop being set.
  for (const n of nodes) {
    if (n.type !== "rect") continue
    if (n.datum == null) continue
    const val = getR(n.datum)
    const radius = radiusForBar(config.roundedTop, n, isVertical)
    if (radius > 0) n.roundedTop = radius
    if (isVertical) {
      n.roundedEdge = val >= 0 ? "top" : "bottom"
    } else {
      n.roundedEdge = val >= 0 ? "right" : "left"
    }
    if (config.gradientFill) {
      n.fillGradient = config.gradientFill
    }
  }

  return nodes
}
