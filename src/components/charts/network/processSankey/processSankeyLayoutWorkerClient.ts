import { commonJsWorkerModuleUrl } from "../../../stream/workerModuleUrl"
import {
  ModuleWorkerSession,
  createSharedWorkerSessionHolder,
  moduleWorkerErrorFromPayload,
  parseModuleWorkerErrorField,
} from "../../../stream/moduleWorkerSession"
import type { BuildScenesInput, BuildScenesResult } from "./buildScenes"
import type { ProcessSankeyLayout } from "./algorithm"
import type { ProcessSankeyLayoutConfig } from "./streamingLayout"
import { validateProcessSankeyWorkerResponse } from "./workerResponse"

import { canUseProcessSankeyWorker, processSankeyWorkerAvailability } from "./workerPolicy"
export {
  canUseProcessSankeyWorker, estimateProcessSankeyLayoutCost,
  shouldUseProcessSankeyWorker, DEFAULT_PROCESS_SANKEY_WORKER_THRESHOLD,
  type ProcessSankeyLayoutExecution,
} from "./workerPolicy"

/**
 * Serializable worker request — no functions or React nodes.
 * Author `__raw` datums are included when structured-cloneable so
 * declarative styleRules / label priority resolve identically to sync.
 */
export interface ProcessSankeyWorkerRequest {
  input: Omit<BuildScenesInput, "colorOf" | "styleRules" | "labelPriorityAccessor" | "colorBy" | "valueAccessor" | "edgeOpacity"> & {
    /** Numeric form only; opacity resolver functions stay on the main thread. */
    edgeOpacity: number
    /** Declarative styleRules only. Function when/style force main-thread. */
    styleRules?: BuildScenesInput["styleRules"]
    /** String field form only; functions force main-thread. */
    labelPriorityAccessor?: string
    colorBy?: string
    valueAccessor?: string
  }
  colorById: Record<string, string>
  fallbackPalette: string[]
}

export interface ProcessSankeyWorkerResponse {
  layout: ProcessSankeyLayout | null
  layoutConfig: ProcessSankeyLayoutConfig
  issues: BuildScenesResult["issues"]
  warnings: BuildScenesResult["warnings"]
  domain: [number, number]
  timelineExtent: number
}

interface WireResponse {
  requestId?: number
  layout?: ProcessSankeyWorkerResponse["layout"] & { sides?: [string, unknown][] | Map<string, unknown> }
  layoutConfig?: ProcessSankeyLayoutConfig
  issues?: BuildScenesResult["issues"]
  warnings?: BuildScenesResult["warnings"]
  domain?: [number, number]
  timelineExtent?: number
  error?: { message: string; name?: string; stack?: string }
}

export function createProcessSankeyLayoutWorker(): Worker {
  // The inline URL lets consumer bundlers discover the worker's module graph.
  if (typeof import.meta.url === "string" && import.meta.url) {
    return new Worker(new URL("./processSankeyLayoutWorker.js", import.meta.url), {
      type: "module",
      name: "semiotic-process-sankey-layout",
    })
  }
  return new Worker(commonJsWorkerModuleUrl("processSankeyLayoutWorker.js"), {
    type: "module",
    name: "semiotic-process-sankey-layout",
  })
}

function reviveLayout(layout: WireResponse["layout"]): ProcessSankeyLayout | null {
  if (!layout) return null
  const sidesEntries = layout.sides
  const sides =
    sidesEntries instanceof Map
      ? (sidesEntries as ProcessSankeyLayout["sides"])
      : new Map(
          Array.isArray(sidesEntries)
            ? (sidesEntries as [string, ProcessSankeyLayout["sides"] extends Map<string, infer V> ? V : never][])
            : [],
        )
  return { ...layout, sides } as ProcessSankeyLayout
}

/**
 * Long-lived ProcessSankey layout worker session. Built on
 * {@link ModuleWorkerSession} (shared with force layout).
 */
export class ProcessSankeyLayoutWorkerSession {
  private readonly session: ModuleWorkerSession<
    ProcessSankeyWorkerRequest,
    ProcessSankeyWorkerResponse
  >

  constructor(worker: Worker = createProcessSankeyLayoutWorker()) {
    this.session = new ModuleWorkerSession({
      name: "ProcessSankey layout",
      terminateOnAbort: true,
      createWorker: () => worker,
      parseMessage: (data) => {
        const response = data as WireResponse
        const { requestId, error } = parseModuleWorkerErrorField(response)
        if (error) {
          return {
            requestId,
            ok: false as const,
            error: moduleWorkerErrorFromPayload(error),
          }
        }
        validateProcessSankeyWorkerResponse(data)
        return {
          requestId,
          ok: true as const,
          payload: {
            layout: reviveLayout(response.layout),
            layoutConfig: response.layoutConfig!,
            issues: response.issues!,
            warnings: response.warnings!,
            domain: response.domain!,
            timelineExtent: response.timelineExtent!,
          },
        }
      },
    })
  }

  get isDead(): boolean {
    return this.session.isDead
  }

  get failure(): Error | null { return this.session.failure }

  request(
    request: ProcessSankeyWorkerRequest,
    signal?: AbortSignal,
  ): Promise<ProcessSankeyWorkerResponse> {
    return this.session.request(request, signal)
  }

  terminate(): void {
    this.session.terminate()
  }
}

const sharedProcessSankeySession = /*#__PURE__*/ createSharedWorkerSessionHolder(
  () => new ProcessSankeyLayoutWorkerSession(),
)

/** Explicitly retry after worker deployment/policy changes; also drops live work. */
export function resetProcessSankeyLayoutWorker(): void {
  sharedProcessSankeySession.resetForTest()
  processSankeyWorkerAvailability.failed = false
}

export const _resetSharedProcessSankeyLayoutSessionForTest = resetProcessSankeyLayoutWorker

export async function runProcessSankeyLayoutWorker(
  request: ProcessSankeyWorkerRequest,
  signal?: AbortSignal,
): Promise<ProcessSankeyWorkerResponse> {
  if (!canUseProcessSankeyWorker()) {
    return Promise.reject(new Error("Web Workers are unavailable"))
  }
  try {
    return await sharedProcessSankeySession.get().request(request, signal)
  } catch (error) {
    if (!sharedProcessSankeySession.available) processSankeyWorkerAvailability.failed = true
    throw error
  }
}

export { reattachProcessSankeySceneDatums, processSankeyStyleRulesNeedMainThread, processSankeyNeedsMainThread } from "./processSankeyWorkerHelpers"
