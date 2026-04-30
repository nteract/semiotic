import type { Datum } from "../../charts/shared/datumTypes"
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

export function buildAreaScene(ctx: XYSceneContext, data: Datum[]): SceneNode[] {
  const groups = ctx.groupData(data)
  const nodes: SceneNode[] = []

  const yDomain = ctx.scales.y.domain() as [number, number]
  const baseline = yDomain[0]

  const y0Get = ctx.getY0
    ? (d: Datum): number => {
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
    if (ctx.config.lineGradient) {
      node.strokeGradient = ctx.config.lineGradient
    }
    nodes.push(node)
  }

  emitPointNodes(ctx, groups, nodes)

  return nodes
}

export function buildStackedAreaScene(ctx: XYSceneContext, data: Datum[]): SceneNode[] {
  const groups = ctx.groupData(data)
  const stackOrder = ctx.config.stackOrder ?? "key"

  // Stack order — controls which series sits at the top, middle, or
  // bottom of the stack. Default "key" (alphabetical) gives stable
  // streaming behavior: when a sliding window evicts data, the order
  // doesn't shuffle. "insideOut" puts the largest-total series in the
  // middle with smaller series alternating above/below, which is the
  // canonical streamgraph aesthetic when combined with `baseline:
  // "wiggle"` or `"silhouette"` (one "central anchor" layer with others
  // built off of it).
  if (stackOrder === "key") {
    groups.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  } else {
    // Compute per-group totals once.
    const totals = new Map<string, number>()
    for (const g of groups) {
      let s = 0
      for (const d of g.data) {
        const v = ctx.getY(d)
        if (typeof v === "number" && Number.isFinite(v)) s += v
      }
      totals.set(g.key, s)
    }
    if (stackOrder === "asc") {
      groups.sort((a, b) => (totals.get(a.key) ?? 0) - (totals.get(b.key) ?? 0))
    } else if (stackOrder === "desc") {
      groups.sort((a, b) => (totals.get(b.key) ?? 0) - (totals.get(a.key) ?? 0))
    } else if (stackOrder === "insideOut") {
      // d3-shape's stackOrderInsideOut algorithm: sort by total desc,
      // then alternately push to bottom or top of the result so the
      // largest sits in the middle with progressively-smaller series
      // wrapping outward.
      const sorted = [...groups].sort((a, b) => (totals.get(b.key) ?? 0) - (totals.get(a.key) ?? 0))
      const tops: typeof groups = []
      const bottoms: typeof groups = []
      let topSum = 0
      let bottomSum = 0
      for (const g of sorted) {
        if (topSum < bottomSum) {
          tops.push(g)
          topSum += totals.get(g.key) ?? 0
        } else {
          bottoms.push(g)
          bottomSum += totals.get(g.key) ?? 0
        }
      }
      // Bottom group renders first (lowest in the stack); reverse it so
      // the largest group ends up in the middle.
      groups.length = 0
      groups.push(...bottoms.reverse(), ...tops)
    }
  }

  const styleFn = (group: string, sampleDatum?: Datum) =>
    ctx.resolveAreaStyle(group, sampleDatum)
  const curveType = (ctx.config.curve && ctx.config.curve !== "linear") ? ctx.config.curve : undefined
  // Normalized stacks assume a fixed [0, 1] y-domain; non-zero baselines
  // would shift layers negative and clip against that domain. Force "zero"
  // when normalize is set so the two props can't conflict at the scene level
  // even if a caller bypasses the HOC's coercion.
  const baseline = ctx.config.normalize ? "zero" : (ctx.config.baseline ?? "zero")
  const { nodes: areaNodes, stackedTops } = buildStackedAreaNodes(
    groups,
    ctx.scales,
    ctx.getX,
    ctx.getY,
    styleFn,
    ctx.config.normalize,
    curveType,
    baseline
  )
  const nodes: SceneNode[] = areaNodes

  // Emit points at stacked (cumulative) Y positions using stackedTops
  // computed by buildStackedAreaNodes — no duplicate stacking pass.
  if (ctx.config.pointStyle) {
    const stackedYMap = new WeakMap<Datum, number>()
    for (const g of groups) {
      const groupTops = stackedTops.get(g.key)
      if (!groupTops) continue
      for (const d of g.data) {
        const x = ctx.getX(d)
        const y = ctx.getY(d)
        if (x != null && !Number.isNaN(x) && y != null && !Number.isNaN(y) && groupTops.has(x)) {
          stackedYMap.set(d, groupTops.get(x)!)
        }
      }
    }

    const stackedYGet = (d: Datum): number => stackedYMap.get(d) ?? ctx.getY(d)
    emitPointNodes(ctx, groups, nodes, stackedYGet)
  }

  return nodes
}
