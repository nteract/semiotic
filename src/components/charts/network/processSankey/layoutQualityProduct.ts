/**
 * Product surface for ProcessSankey layout quality (M10).
 *
 * Pure helpers that turn a finished layout (or raw props) into diagnoses /
 * interrogation-friendly text — shared by diagnoseConfig, MCP, and docs.
 */

import type { Diagnosis } from "../../shared/diagnoseTypes"
import type { ProcessSankeyLayout, ProcessSankeyLayoutQuality } from "./processSankeyTypes"

/** Soft thresholds for flagship-scale rivers; not hard layout failures. */
export const PROCESS_SANKEY_QUALITY_THRESHOLDS = {
  /** Weighted ribbons crossing dense intermediate mass (layout proxy). */
  highTransitOcclusion: 8,
  /** Fraction of plot height occupied by peaks + gaps. */
  highLaneUtilization: 0.92,
  /** Crossings remaining after ordering (topology-hard cases still warn). */
  residualCrossings: 3,
} as const

/**
 * Diagnose an already-computed layout. Call with `ref.getCustomLayout()?.layout`
 * or the result of `computeProcessSankeyLayout`.
 */
export function diagnoseProcessSankeyLayout(
  layout: Pick<
    ProcessSankeyLayout,
    "layoutQuality" | "layoutQualityBefore" | "compressedPadding" | "crossingsAfter"
  > | null | undefined,
): Diagnosis[] {
  if (!layout?.layoutQuality) return []
  const out: Diagnosis[] = []
  const q = layout.layoutQuality
  const before = layout.layoutQualityBefore

  if (layout.compressedPadding) {
    out.push({
      severity: "warning",
      code: "PROCESS_SANKEY_COMPRESSED_PADDING",
      message: "Lane gaps were compressed to fit peaks into the plot height.",
      fix: "Increase height, lower maxValueScale, use packing=\"reuse\", or reduce concurrent peaks.",
    })
  }

  if (q.transitOcclusion >= PROCESS_SANKEY_QUALITY_THRESHOLDS.highTransitOcclusion) {
    out.push({
      severity: "warning",
      code: "PROCESS_SANKEY_HIGH_TRANSIT",
      message: `High transit occlusion (${q.transitOcclusion.toFixed(1)}) — ribbons cross dense intermediate lanes.`,
      fix: "Try laneOrder=\"crossing-min+inside-out\", packing=\"reuse\", or lanePlacement=\"hug\" with a modest maxValueScale.",
    })
  }

  if (
    q.verticalUtilization >= PROCESS_SANKEY_QUALITY_THRESHOLDS.highLaneUtilization
  ) {
    out.push({
      severity: "warning",
      code: "PROCESS_SANKEY_HIGH_UTILIZATION",
      message: `Lane utilization is ${Math.round(q.verticalUtilization * 100)}% of plot height.`,
      fix: "Increase chart height or cap band scale with maxValueScale.",
    })
  }

  const crossings = layout.crossingsAfter ?? q.crossings
  if (
    crossings != null &&
    crossings >= PROCESS_SANKEY_QUALITY_THRESHOLDS.residualCrossings
  ) {
    out.push({
      severity: "warning",
      code: "PROCESS_SANKEY_RESIDUAL_CROSSINGS",
      message: `Ordering left ${crossings} edge-pair crossings` +
        (before ? ` (from ${before.crossings})` : "") + ".",
      fix: "Prefer laneOrder=\"crossing-min\" or \"crossing-min+inside-out\"; check for unavoidable fan-outs.",
    })
  }

  return out
}

/** One-paragraph layout summary for interrogation / agent grounding. */
export function explainProcessSankeyLayout(
  layout: Pick<
    ProcessSankeyLayout,
    "layoutQuality" | "layoutQualityBefore" | "compressedPadding" | "slots" | "crossingsAfter"
  > | null | undefined,
): string | null {
  if (!layout?.layoutQuality) return null
  const q = layout.layoutQuality
  const before = layout.layoutQualityBefore
  const crossings = layout.crossingsAfter ?? q.crossings
  const parts = [
    `ProcessSankey layout uses ${layout.slots?.length ?? "?"} packed lane(s).`,
    crossings != null
      ? `Edge-pair crossings ${before ? `${before.crossings} → ` : ""}${crossings}.`
      : null,
    `Pixel path length ${before ? `${Math.round(before.pixelLength)} → ` : ""}${Math.round(q.pixelLength)}.`,
    `Transit occlusion ${before ? `${before.transitOcclusion.toFixed(1)} → ` : ""}${q.transitOcclusion.toFixed(1)}.`,
    `Lane utilization ${Math.round(q.verticalUtilization * 100)}%.`,
    layout.compressedPadding ? "Lane gaps were compressed to fit the plot." : null,
  ].filter(Boolean)
  return parts.join(" ")
}

/** Prop-only checks when a layout has not been run yet. */
export function diagnoseProcessSankeyProps(props: Record<string, unknown>): Diagnosis[] {
  const out: Diagnosis[] = []
  const domain = props.domain
  if (domain == null) {
    out.push({
      severity: "error",
      code: "PROCESS_SANKEY_MISSING_DOMAIN",
      message: "ProcessSankey requires domain: [tStart, tEnd].",
      fix: "Pass domain={[start, end]} as numbers or Date-compatible values.",
    })
  } else if (
    !Array.isArray(domain) ||
    domain.length !== 2 ||
    !Number.isFinite(Number(domain[0])) ||
    !Number.isFinite(Number(domain[1]))
  ) {
    out.push({
      severity: "error",
      code: "PROCESS_SANKEY_BAD_DOMAIN",
      message: "domain must be a 2-tuple of finite times.",
      fix: "Use domain={[t0, t1]} with t0 <= t1.",
    })
  }

  const edges = props.edges
  if (Array.isArray(edges) && edges.length > 0) {
    const sample = edges[0] as Record<string, unknown>
    if (sample.startTime == null || sample.endTime == null) {
      out.push({
        severity: "warning",
        code: "PROCESS_SANKEY_EDGE_TIMES",
        message: "Edges should carry startTime and endTime for temporal layout.",
        fix: "Add startTime/endTime fields or set startTimeAccessor/endTimeAccessor.",
      })
    }
  }

  const nodes = props.nodes
  const nodeCount = Array.isArray(nodes) ? nodes.length : 0
  if (props.showLabels === true && nodeCount >= 24) {
    out.push({
      severity: "warning",
      code: "PROCESS_SANKEY_LABEL_DENSITY",
      message: `showLabels={true} with ${nodeCount} nodes may overcrowd the plot.`,
      fix: "Use showLabels=\"auto\" with optional labelPriorityAccessor / maxLabels.",
    })
  }

  const edgeCount = Array.isArray(edges) ? edges.length : 0
  if (edgeCount >= 80 && props.layoutExecution == null && props.packing !== "off") {
    out.push({
      severity: "warning",
      code: "PROCESS_SANKEY_WORKER_HINT",
      message: "Dense ProcessSankey layouts benefit from worker packing/order.",
      fix: "layoutExecution defaults to \"auto\"; set layoutExecution=\"worker\" or raise layoutWorkerThreshold deliberately.",
    })
  }

  return out
}

export type { ProcessSankeyLayoutQuality }
