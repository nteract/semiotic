import {
  buildProcessSankeyScenes,
  type BuildScenesInput,
  type BuildScenesResult,
  type ProcessSankeyNormalizedEdge,
  type ProcessSankeyNormalizedNode,
} from "./buildScenes"
import {
  canUseProcessSankeyWorker,
  processSankeyNeedsMainThread,
  reattachProcessSankeySceneDatums,
  runProcessSankeyLayoutWorker,
  shouldUseProcessSankeyWorker,
  type ProcessSankeyLayoutExecution,
  type ProcessSankeyWorkerRequest,
} from "./processSankeyLayoutWorkerClient"
import type { Datum } from "../../shared/datumTypes"

export interface ProcessSankeyLayoutAsyncOptions {
  execution?: ProcessSankeyLayoutExecution
  workerThreshold?: number
  signal?: AbortSignal
  /** Precomputed per-node colors (required for worker path). */
  colorById: Record<string, string>
  fallbackPalette?: string[]
  rawNodeById?: ReadonlyMap<string, Datum>
  rawEdgeById?: ReadonlyMap<string, Datum>
}

/**
 * Clone author datums for the worker boundary. Prefer structuredClone; fall
 * back to JSON so plain records still cross when structuredClone is missing
 * or rejects (e.g. non-cloneable fields).
 */
export function cloneProcessSankeyWireDatum(value: unknown): Datum | undefined {
  if (value == null || typeof value !== "object") return undefined
  try {
    if (typeof structuredClone === "function") {
      return structuredClone(value) as Datum
    }
  } catch {
    /* fall through to JSON */
  }
  try {
    return JSON.parse(JSON.stringify(value)) as Datum
  } catch {
    return undefined
  }
}

function wireNode(n: ProcessSankeyNormalizedNode): ProcessSankeyNormalizedNode {
  const raw = cloneProcessSankeyWireDatum(n.__raw)
  return {
    id: n.id,
    ...(n.label != null && { label: n.label }),
    ...(n.group != null && { group: n.group }),
    ...(n.xExtent != null && { xExtent: n.xExtent }),
    ...(raw != null && { __raw: raw }),
  }
}

function wireEdge(e: ProcessSankeyNormalizedEdge): ProcessSankeyNormalizedEdge {
  const raw = cloneProcessSankeyWireDatum(e.__raw)
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    value: e.value,
    startTime: e.startTime,
    endTime: e.endTime,
    ...(e.systemInTime != null && { systemInTime: e.systemInTime }),
    ...(e.systemOutTime != null && { systemOutTime: e.systemOutTime }),
    ...(raw != null && { __raw: raw }),
  }
}

/** Exported for tests — keep worker input observationally equal to sync. */
export function toProcessSankeyWorkerRequest(
  input: BuildScenesInput,
  colorById: Record<string, string>,
  fallbackPalette: string[],
): ProcessSankeyWorkerRequest {
  return {
    input: {
      nodes: input.nodes.map(wireNode),
      edges: input.edges.map(wireEdge),
      domain: input.domain,
      plotW: input.plotW,
      plotH: input.plotH,
      orientation: input.orientation,
      ribbonLane: input.ribbonLane,
      ribbonMinRun: input.ribbonMinRun,
      // Function opacity resolvers cannot cross the worker boundary; the
      // caller routes those through the synchronous builder first.
      edgeOpacity: typeof input.edgeOpacity === "number" ? input.edgeOpacity : 0.35,
      layoutOpts: { ...input.layoutOpts },
      showLabels: input.showLabels,
      // Function accessors cannot cross the boundary (caller forces main thread).
      ...(typeof input.labelPriorityAccessor === "string" && {
        labelPriorityAccessor: input.labelPriorityAccessor,
      }),
      ...(input.maxLabels != null && { maxLabels: input.maxLabels }),
      ...(input.selectionDatum != null && { selectionDatum: input.selectionDatum }),
      // Push vs static validation must match the HOC path (default static in buildScenes).
      ...(input.usageMode != null && { usageMode: input.usageMode }),
      styleRules: input.styleRules,
      colorBy: typeof input.colorBy === "string" ? input.colorBy : undefined,
      valueAccessor:
        typeof input.valueAccessor === "string" ? input.valueAccessor : undefined,
    } as ProcessSankeyWorkerRequest["input"],
    colorById,
    fallbackPalette,
  }
}

/**
 * Async ProcessSankey scene builder. Large layouts run in a long-lived module
 * worker; small graphs, SSR, non-serializable styleRules/label accessors, or
 * missing Worker fall back to the same synchronous {@link buildProcessSankeyScenes}.
 */
export async function buildProcessSankeyScenesAsync(
  input: BuildScenesInput,
  options: ProcessSankeyLayoutAsyncOptions,
): Promise<BuildScenesResult> {
  const {
    execution = "auto",
    workerThreshold,
    signal,
    colorById,
    fallbackPalette = ["#475569"],
    rawNodeById = new Map(),
    rawEdgeById = new Map(),
  } = options

  const packing = input.layoutOpts.packing ?? "reuse"
  const laneOrder = input.layoutOpts.laneOrder ?? "crossing-min"
  const useWorker =
    canUseProcessSankeyWorker() &&
    !processSankeyNeedsMainThread(input) &&
    shouldUseProcessSankeyWorker(
      execution,
      input.nodes.length,
      input.edges.length,
      packing,
      laneOrder,
      workerThreshold,
    )

  if (!useWorker) {
    return buildProcessSankeyScenes(input)
  }

  try {
    const response = await runProcessSankeyLayoutWorker(
      toProcessSankeyWorkerRequest(input, colorById, fallbackPalette),
      signal,
    )
    return reattachProcessSankeySceneDatums(response, rawNodeById, rawEdgeById)
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error
    // Worker construction/runtime failures retain correctness through sync.
    return buildProcessSankeyScenes(input)
  }
}
