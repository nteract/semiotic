import {
  forceLayout,
  type ForceLayoutOptions
} from "./forceLayout"
import type { GraphEdge, GraphNode, Point } from "./networkAnalysis"
import {
  canUseForceWorker,
  runForceLayoutWorker,
  shouldUseForceWorker,
  type ForceLayoutExecution,
  type NormalizedForceWorkerRequest
} from "../stream/layouts/forceLayoutWorkerClient"

export interface ForceLayoutAsyncOptions extends ForceLayoutOptions {
  /** Choose worker execution, synchronous execution, or an automatic cost threshold. */
  execution?: ForceLayoutExecution
  /** Abort pending worker execution. */
  signal?: AbortSignal
  /** Override the automatic `iterations × (nodes + edges)` worker threshold. */
  workerThreshold?: number
}

/**
 * Asynchronous counterpart to {@link forceLayout}. Large layouts run in a
 * short-lived module worker; small, server-side, or unsupported environments
 * fall back to the same deterministic synchronous implementation.
 */
export async function forceLayoutAsync(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>,
  options: ForceLayoutAsyncOptions = {}
): Promise<Record<string, Point>> {
  const {
    execution = "auto",
    signal,
    workerThreshold,
    nodeRadius,
    ...layoutOptions
  } = options
  const iterations = layoutOptions.iterations ?? 260
  const useWorker =
    canUseForceWorker() &&
    shouldUseForceWorker(
      execution,
      nodes.length,
      edges.length,
      iterations,
      workerThreshold
    )

  if (!useWorker) {
    return forceLayout(nodes, edges, { ...layoutOptions, nodeRadius })
  }

  const request: NormalizedForceWorkerRequest = {
    kind: "normalized",
    nodes: nodes.map((node) => ({ ...node })),
    edges: edges.map((edge) => ({ ...edge })),
    options: layoutOptions,
    nodeRadii:
      typeof nodeRadius === "function"
        ? Object.fromEntries(
            nodes.map((node) => [node.id, nodeRadius(node)])
          )
        : nodeRadius == null
          ? undefined
          : Object.fromEntries(nodes.map((node) => [node.id, nodeRadius]))
  }

  try {
    const response = await runForceLayoutWorker(request, signal)
    return response.positions
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error
    return forceLayout(nodes, edges, { ...layoutOptions, nodeRadius })
  }
}

