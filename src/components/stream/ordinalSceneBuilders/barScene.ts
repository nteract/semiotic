import { buildRectNode } from "../SceneGraph"
import type { OrdinalSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { OrdinalSceneContext } from "./types"

export function buildBarScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, config, getR, getStack, resolvePieceStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isVertical = projection === "vertical"
  const isHorizontal = projection === "horizontal"
  const normalize = config.normalize

  for (const col of Object.values(columns)) {
    // Group pieces by stack key if stacking, and aggregate values per group
    const stacks = new Map<string, { total: number; pieces: Record<string, any>[] }>()
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

    for (const [stackKey, group] of stacks) {
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

  return nodes
}

export function buildClusterBarScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, getR, getGroup, resolvePieceStyle } = ctx
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

  for (const col of Object.values(columns)) {
    const subWidth = col.width / groupCount
    const grouped = new Map<string, Record<string, any>[]>()
    for (const d of col.pieceData) {
      const key = getGroup ? getGroup(d) : "_default"
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(d)
    }

    for (let gi = 0; gi < groupKeys.length; gi++) {
      const groupData = grouped.get(groupKeys[gi]) || []
      for (const d of groupData) {
        const val = getR(d)
        const style = resolvePieceStyle(d, col.name)

        if (isVertical) {
          const barX = col.x + gi * subWidth
          const zeroY = rScale(0)
          const valY = rScale(val)
          nodes.push(buildRectNode(
            barX, Math.min(zeroY, valY), subWidth, Math.abs(zeroY - valY),
            style, d, groupKeys[gi]
          ))
        } else {
          const barY = col.x + gi * subWidth
          const zeroX = rScale(0)
          const valX = rScale(val)
          nodes.push(buildRectNode(
            Math.min(zeroX, valX), barY, Math.abs(valX - zeroX), subWidth,
            style, d, groupKeys[gi]
          ))
        }
      }
    }
  }

  return nodes
}
