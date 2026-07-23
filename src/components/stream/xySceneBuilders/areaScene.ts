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
import { resolveAreaGradient } from "./areaGradient"
import { buildAggregateRibbons, buildPerSeriesRibbons, partitionRibbons } from "./ribbonScene"

export function buildAreaScene(ctx: XYSceneContext, data: Datum[]): SceneNode[] {
  const groups = ctx.groupData(data)
  const nodes: SceneNode[] = []

  // Ribbons (bounds + band) paint first so they sit behind the area fills.
  if (ctx.ribbons && ctx.ribbons.length > 0) {
    const { perSeries, aggregate } = partitionRibbons(ctx.ribbons)
    if (aggregate.length > 0) {
      nodes.push(...buildAggregateRibbons(ctx, data, aggregate))
    }
    if (perSeries.length > 0) {
      for (const g of groups) {
        nodes.push(...buildPerSeriesRibbons(ctx, g.data, g.key, perSeries))
      }
    }
  }

  const yDomain = ctx.scales.y.domain() as [number, number]
  const baseline = yDomain[0]
  const semanticLineThresholds = ctx.config.semanticLineStops
    ?.filter((stop) => Number.isFinite(stop.offset))
    .map((stop) => ({
      value: yDomain[0] + Math.max(0, Math.min(1, stop.offset)) * (yDomain[1] - yDomain[0]),
      color: stop.color,
      thresholdType: "greater" as const,
    }))
    .sort((a, b) => a.value - b.value)
  const semanticStrokeBands = semanticLineThresholds && semanticLineThresholds.length > 0
    ? (() => {
        // Duplicate threshold values have the same "last matching wins"
        // semantics as LineChart thresholds.
        const uniqueThresholds = semanticLineThresholds.reduce<typeof semanticLineThresholds>(
          (bands, threshold) => {
            if (bands.at(-1)?.value === threshold.value) bands[bands.length - 1] = threshold
            else bands.push(threshold)
            return bands
          },
          [],
        )
        const valueBands: Array<{ from: number; to: number; color?: string }> = [
          { from: yDomain[0], to: uniqueThresholds[0].value },
        ]
        for (let i = 0; i < uniqueThresholds.length; i++) {
          valueBands.push({
            from: uniqueThresholds[i].value,
            to: uniqueThresholds[i + 1]?.value ?? yDomain[1],
            color: uniqueThresholds[i].color,
          })
        }
        return valueBands
          .map(({ from, to, color }) => {
            const fromY = ctx.scales.y(from)
            const toY = ctx.scales.y(to)
            return { y: Math.min(fromY, toY), height: Math.abs(toY - fromY), color }
          })
          .filter((band) => band.height > 0)
      })()
    : undefined

  const y0Get = ctx.getY0
    ? (d: Datum): number => {
        const value = ctx.getY0!(d)
        return value == null ? baseline : value
      }
    : undefined

  for (const g of groups) {
    const style = ctx.resolveAreaStyle(g.key, g.data[0])
    const node = buildAreaNode(g.data, ctx.scales, ctx.getX, ctx.getY, baseline, style, g.key, y0Get)
    const fillGradient = resolveAreaGradient(ctx.config.gradientFill)
    if (fillGradient) {
      node.fillGradient = fillGradient
    }
    if (ctx.config.curve && ctx.config.curve !== "linear") {
      node.curve = ctx.config.curve
    }
    if (ctx.config.lineGradient) {
      node.strokeGradient = ctx.config.lineGradient
    }
    if (semanticLineThresholds && semanticLineThresholds.length > 0) {
      node.colorThresholds = semanticLineThresholds
      node.strokeColorBands = semanticStrokeBands
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
  // Default any unrecognized value to "key" so we always end up with a
  // stable order. PipelineStore's extent computation does the same
  // (`config.stackOrder ?? "key"`); the two paths must agree on order
  // because wiggle offsets are order-dependent.
  const sortByKey = () => groups.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  if (stackOrder === "input") {
    // Preserve first-seen group order from ctx.groupData(data).
  } else if (stackOrder === "key") {
    sortByKey()
  } else if (stackOrder === "asc" || stackOrder === "desc" || stackOrder === "insideOut") {
    // Compute per-group totals using the SAME validity filter as the
    // stacking pipeline (`Number.isFinite` on both x and y). Without
    // matching the filter, a group whose only y-finite rows have
    // invalid x would still contribute to the order sort but skip the
    // actual stacking — order would diverge from extent/scene.
    const totals = new Map<string, number>()
    for (const g of groups) {
      let s = 0
      for (const d of g.data) {
        const x = ctx.getX(d)
        const y = ctx.getY(d)
        if (Number.isFinite(x) && Number.isFinite(y)) s += y
      }
      totals.set(g.key, s)
    }
    // Tie-breaker: when two groups have equal totals, fall back to
    // lexicographic key order. `Array.sort` is stable in modern JS but
    // its stability is on insertion order — under sliding-window
    // eviction the insertion order can shift between frames and tied
    // groups would swap, causing layer flicker. The lexicographic tie-
    // breaker matches the "key" sort default and PipelineStore's
    // extent comparator so both paths stay in sync.
    const keyCmp = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
    if (stackOrder === "asc") {
      groups.sort((a, b) => {
        const d = (totals.get(a.key) ?? 0) - (totals.get(b.key) ?? 0)
        return d !== 0 ? d : keyCmp(a.key, b.key)
      })
    } else if (stackOrder === "desc") {
      groups.sort((a, b) => {
        const d = (totals.get(b.key) ?? 0) - (totals.get(a.key) ?? 0)
        return d !== 0 ? d : keyCmp(a.key, b.key)
      })
    } else {
      // insideOut — d3-shape's stackOrderInsideOut algorithm: sort by
      // total desc (ties broken by key), then alternately push to
      // bottom or top of the result so the largest sits in the middle
      // with progressively-smaller series wrapping outward.
      const sorted = [...groups].sort((a, b) => {
        const d = (totals.get(b.key) ?? 0) - (totals.get(a.key) ?? 0)
        return d !== 0 ? d : keyCmp(a.key, b.key)
      })
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
  } else {
    // Unknown stackOrder string — match PipelineStore's fallback.
    sortByKey()
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
