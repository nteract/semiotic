import { buildRectNode } from "../SceneGraph"
import type { OrdinalSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { RectSceneNode } from "../types"
import type { OrdinalSceneContext } from "./types"
import type { Datum } from "../../charts/shared/datumTypes"

export function buildBarScene(ctx: OrdinalSceneContext, _layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, config, getR, getStack, resolvePieceStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isVertical = projection === "vertical"
  const isHorizontal = projection === "horizontal"
  const normalize = config.normalize

  // Discover all stack keys globally for consistent ordering across columns.
  // When stacking is disabled (no getStack), short-circuit to the single default key
  // to avoid an unnecessary full pass over all columns and pieces.
  const stackKeys: string[] = []
  if (getStack) {
    const stackKeySet = new Set<string>()
    for (const col of Object.values(columns)) {
      for (const d of col.pieceData) {
        const key = getStack(d)
        if (!stackKeySet.has(key)) {
          stackKeySet.add(key)
          stackKeys.push(key)
        }
      }
    }
  } else {
    stackKeys.push("_default")
  }

  for (const col of Object.values(columns)) {
    // Group pieces by stack key if stacking, and aggregate values per group
    const stacks = new Map<string, { total: number; pieces: Datum[] }>()
    for (const d of col.pieceData) {
      const key = getStack ? getStack(d) : "_default"
      if (!stacks.has(key)) stacks.set(key, { total: 0, pieces: [] })
      const group = stacks.get(key)!
      group.total += getR(d)
      group.pieces.push(d)
    }

    // Compute totals for normalization
    let colTotal = 0
    if (normalize) {
      for (const g of stacks.values()) colTotal += Math.abs(g.total)
    }

    let posOffset = 0
    let negOffset = 0

    // Iterate in global stack key order for consistent stacking across columns
    for (const stackKey of stackKeys) {
      const group = stacks.get(stackKey)
      if (!group) continue
      // Use the aggregated total for the stack group (one rect per group)
      let val = group.total
      if (normalize && colTotal > 0) val = val / colTotal

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
  const r = config.roundedTop && config.roundedTop > 0 ? Math.max(0, config.roundedTop) : 0

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
  if (r > 0) {
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
        topmost.roundedTop = r
      }
      if (negative.length > 0) {
        const bottommost = isV
          ? negative.reduce((a, b) => (a.y + a.h) > (b.y + b.h) ? a : b)
          : negative.reduce((a, b) => a.x < b.x ? a : b)
        bottommost.roundedTop = r
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

  // Discover all group keys
  const groupKeys: string[] = []
  const groupSet = new Set<string>()
  for (const col of Object.values(columns)) {
    for (const d of col.pieceData) {
      const key = getGroup ? getGroup(d) : "_default"
      if (!groupSet.has(key)) {
        groupSet.add(key)
        groupKeys.push(key)
      }
    }
  }
  const groupCount = groupKeys.length || 1

  // Inner padding between bars within a group (fraction of sub-bar width)
  const innerPadRatio = 0.2

  for (const col of Object.values(columns)) {
    const subWidth = col.width / groupCount
    const innerPad = subWidth * innerPadRatio
    const barWidth = subWidth - innerPad
    const grouped = new Map<string, Datum[]>()
    for (const d of col.pieceData) {
      const key = getGroup ? getGroup(d) : "_default"
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(d)
    }

    for (let gi = 0; gi < groupKeys.length; gi++) {
      const groupData = grouped.get(groupKeys[gi]) || []
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
  const r = config.roundedTop && config.roundedTop > 0 ? Math.max(0, config.roundedTop) : 0
  for (const n of nodes) {
    if (n.type !== "rect") continue
    if (n.datum == null) continue
    const val = getR(n.datum)
    if (r > 0) n.roundedTop = r
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
