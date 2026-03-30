/**
 * Area and stacked area scene builders.
 *
 * buildAreaScene — single/multi-group areas with gradient fill and curve support.
 * buildStackedAreaScene — stable-order stacking with optional normalization.
 *
 * Dependencies: SceneGraph (buildAreaNode, buildStackedAreaNodes)
 * Consumed by: PipelineStore.buildSceneNodes (chartTypes "area", "stackedarea")
 */
import type { SceneNode } from "../types"
import { buildAreaNode, buildStackedAreaNodes } from "../SceneGraph"
import type { XYSceneContext } from "./types"
import { emitPointNodes } from "./emitPointNodes"

export function buildAreaScene(ctx: XYSceneContext, data: Record<string, any>[]): SceneNode[] {
  const groups = ctx.groupData(data)
  const nodes: SceneNode[] = []

  const yDomain = ctx.scales.y.domain() as [number, number]
  const baseline = yDomain[0]

  const y0Get = ctx.getY0
    ? (d: Record<string, any>): number => {
        const value = ctx.getY0!(d)
        return value == null ? baseline : value
      }
    : undefined

  for (const g of groups) {
    const style = ctx.resolveAreaStyle(g.key, g.data[0])
    const node = buildAreaNode(g.data, ctx.scales, ctx.getX, ctx.getY, baseline, style, g.key, y0Get)
    if (ctx.config.gradientFill) {
      node.fillGradient = ctx.config.gradientFill as any
    }
    if (ctx.config.curve && ctx.config.curve !== "linear") {
      node.curve = ctx.config.curve
    }
    nodes.push(node)
  }

  emitPointNodes(ctx, groups, nodes)

  return nodes
}

export function buildStackedAreaScene(ctx: XYSceneContext, data: Record<string, any>[]): SceneNode[] {
  const groups = ctx.groupData(data)
  // Sort groups by key to ensure a stable stacking order. Without this,
  // a sliding window can reorder groups when eviction changes which group
  // appears first in the buffer, causing layers to swap and flicker.
  groups.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  const styleFn = (group: string, sampleDatum?: Record<string, any>) =>
    ctx.resolveAreaStyle(group, sampleDatum)
  const curveType = (ctx.config.curve && ctx.config.curve !== "linear") ? ctx.config.curve : undefined
  const nodes: SceneNode[] = buildStackedAreaNodes(
    groups,
    ctx.scales,
    ctx.getX,
    ctx.getY,
    styleFn,
    ctx.config.normalize,
    curveType
  )

  // Emit points at stacked (cumulative) Y positions, not raw values.
  // Replay the stacking logic to build a datum→stackedY lookup.
  if (ctx.config.pointStyle) {
    const stackedYMap = new WeakMap<Record<string, any>, number>()
    const xBaselines = new Map<number, number>()

    // Compute totals per x for normalization (mirrors buildStackedAreaNodes)
    let totals: Map<number, number> | undefined
    if (ctx.config.normalize) {
      totals = new Map()
      for (const g of groups) {
        for (const d of g.data) {
          const x = ctx.getX(d)
          const y = ctx.getY(d)
          if (x != null && y != null && !Number.isNaN(x) && !Number.isNaN(y)) {
            totals.set(x, (totals.get(x) || 0) + y)
          }
        }
      }
      // Avoid division by zero
      for (const [x, v] of totals) {
        if (v === 0) totals.set(x, 1)
      }
    }

    for (const g of groups) {
      for (const d of g.data) {
        const x = ctx.getX(d)
        let y = ctx.getY(d)
        if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) continue
        if (ctx.config.normalize && totals) {
          y = y / totals.get(x)!
        }
        const base = xBaselines.get(x) || 0
        stackedYMap.set(d, base + y)
        xBaselines.set(x, base + y)
      }
    }

    const stackedYGet = (d: Record<string, any>): number => stackedYMap.get(d) ?? ctx.getY(d)
    emitPointNodes(ctx, groups, nodes, stackedYGet)
  }

  return nodes
}
