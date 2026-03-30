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
import { buildAreaNode, buildStackedAreaNodes, buildPointNode } from "../SceneGraph"
import type { XYSceneContext } from "./types"

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

  // Emit point nodes when pointStyle is configured (showPoints on HOC)
  if (ctx.config.pointStyle) {
    for (const g of groups) {
      for (const d of g.data) {
        const style = ctx.config.pointStyle(d)
        const r = style.r || 3
        const ptNode = buildPointNode(d, ctx.scales, ctx.getX, ctx.getY, r, style)
        if (ptNode) nodes.push(ptNode)
      }
    }
  }

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

  // Emit point nodes when pointStyle is configured (showPoints on HOC)
  if (ctx.config.pointStyle) {
    for (const g of groups) {
      for (const d of g.data) {
        const style = ctx.config.pointStyle(d)
        const r = style.r || 3
        const ptNode = buildPointNode(d, ctx.scales, ctx.getX, ctx.getY, r, style)
        if (ptNode) nodes.push(ptNode)
      }
    }
  }

  return nodes
}
