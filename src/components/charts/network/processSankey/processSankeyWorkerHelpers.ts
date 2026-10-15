import { scaleTime } from "d3-scale"
import type { BuildScenesInput, BuildScenesResult } from "./buildScenes"
import type { ProcessSankeyWorkerResponse } from "./processSankeyLayoutWorkerClient"
import type { Datum } from "../../shared/datumTypes"

/**
 * Re-attach host-side raw datums after a worker layout (workers strip them).
 * Rebuilds the time scale on the main thread.
 */
export function reattachProcessSankeySceneDatums(
  response: ProcessSankeyWorkerResponse,
  rawNodeById: ReadonlyMap<string, Datum>,
  rawEdgeById: ReadonlyMap<string, Datum>
): BuildScenesResult {
  const bands = (response.layoutConfig.bands ?? []).map((band) => ({
    ...band,
    rawDatum: rawNodeById.get(band.id) ?? ({ id: band.id } as Datum)
  }))
  const ribbons = (response.layoutConfig.ribbons ?? []).map((ribbon) => ({
    ...ribbon,
    rawDatum: rawEdgeById.get(ribbon.id) ?? ({ id: ribbon.id } as Datum)
  }))
  const xScale = scaleTime()
    .domain(response.domain)
    .range([0, response.timelineExtent])
  return {
    layout: response.layout,
    layoutConfig: {
      bands,
      ribbons,
      showLabels: response.layoutConfig.showLabels
    },
    issues: response.issues,
    warnings: response.warnings,
    xScale
  }
}

/**
 * True when styleRules contain non-serializable predicate/style functions.
 * Those force the main-thread path. Declarative thresholds are worker-safe
 * when author `__raw` datums are cloned onto the wire request.
 */
export function processSankeyStyleRulesNeedMainThread(
  styleRules: BuildScenesInput["styleRules"] | undefined
): boolean {
  if (!styleRules || styleRules.length === 0) return false
  for (const rule of styleRules) {
    if (typeof rule.when === "function") return true
    if (typeof rule.style === "function") return true
  }
  return false
}

/**
 * True when any ProcessSankey input cannot cross the worker boundary without
 * changing layout/style/validation semantics. Forces the main-thread path.
 */
export function processSankeyNeedsMainThread(
  input: Partial<
    Pick<
      BuildScenesInput,
      | "styleRules"
      | "labelPriorityAccessor"
      | "colorBy"
      | "valueAccessor"
      | "edgeOpacity"
    >
  >
): boolean {
  if (processSankeyStyleRulesNeedMainThread(input.styleRules)) return true
  if (typeof input.edgeOpacity === "function") return true
  // Function accessors cannot structured-clone; label density would diverge.
  if (typeof input.labelPriorityAccessor === "function") return true
  // Function colorBy/valueAccessor only affect styleRules rule context.
  // Colors themselves are precomputed into colorById on the main thread.
  if (input.styleRules && input.styleRules.length > 0) {
    if (typeof input.colorBy === "function") return true
    if (typeof input.valueAccessor === "function") return true
  }
  return false
}
