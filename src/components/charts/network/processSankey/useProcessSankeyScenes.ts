"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { scaleTime } from "d3-scale"
import {
  buildProcessSankeyScenes,
  type BuildScenesInput,
  type BuildScenesResult,
} from "./buildScenes"
import { buildProcessSankeyScenesAsync } from "./processSankeyLayoutAsync"
import {
  canUseProcessSankeyWorker,
  processSankeyNeedsMainThread,
  shouldUseProcessSankeyWorker,
  type ProcessSankeyLayoutExecution,
} from "./processSankeyLayoutWorkerClient"
import { useWasHydratingFromSSR } from "../../../stream/useHydration"
import type { Datum } from "../../shared/datumTypes"

export type ProcessSankeyLayoutStatus = "pending" | "ready" | "error"

export interface UseProcessSankeyScenesResult extends BuildScenesResult {
  status: ProcessSankeyLayoutStatus
  error: Error | null
}

export interface UseProcessSankeyScenesOptions {
  execution?: ProcessSankeyLayoutExecution
  workerThreshold?: number
  colorById: Record<string, string>
  fallbackPalette?: string[]
  rawNodeById?: ReadonlyMap<string, Datum>
  rawEdgeById?: ReadonlyMap<string, Datum>
}

const emptyResult = (domain: [number, number], timelineExtent: number): BuildScenesResult => ({
  layout: null,
  layoutConfig: { bands: [], ribbons: [], showLabels: true },
  issues: [],
  warnings: [],
  xScale: scaleTime().domain(domain).range([0, timelineExtent]),
})

function wantsWorker(
  input: BuildScenesInput,
  execution: ProcessSankeyLayoutExecution,
  workerThreshold?: number,
): boolean {
  if (typeof window === "undefined") return false
  if (!canUseProcessSankeyWorker()) return false
  if (processSankeyNeedsMainThread(input)) return false
  return shouldUseProcessSankeyWorker(
    execution,
    input.nodes.length,
    input.edges.length,
    input.layoutOpts.packing ?? "reuse",
    input.layoutOpts.laneOrder ?? "crossing-min",
    workerThreshold,
  )
}

/**
 * React lifecycle wrapper for ProcessSankey scene construction.
 *
 * - **Sync path** (SSR, cheap graphs, `execution: "sync"`, predicate styleRules):
 *   `buildProcessSankeyScenes` runs during render via `useMemo` so prop updates
 *   paint immediately — no one-frame lag on the previous scene.
 * - **Worker path** (costly client layouts): previous ready scene stays painted
 *   while status is `"pending"`; settles to worker (or sync-fallback) result.
 */
export function useProcessSankeyScenes(
  input: BuildScenesInput | null,
  options: UseProcessSankeyScenesOptions,
): UseProcessSankeyScenesResult {
  const wasHydratingFromSSR = useWasHydratingFromSSR()
  const {
    execution = "auto",
    workerThreshold,
    colorById,
    fallbackPalette,
    rawNodeById,
    rawEdgeById,
  } = options

  const colorByIdKey = useMemo(
    () =>
      Object.keys(colorById)
        .sort()
        .map((id) => `${id}:${colorById[id]}`)
        .join("|"),
    [colorById],
  )

  const stableKey = useMemo(() => {
    if (!input) return "null"
    return [
      input.nodes,
      input.edges,
      input.plotW,
      input.plotH,
      input.orientation ?? "horizontal",
      input.ribbonLane,
      String(input.ribbonMinRun ?? 0),
      input.edgeOpacity,
      String(input.showLabels ?? true),
      input.layoutOpts.pairing ?? "temporal",
      input.layoutOpts.packing ?? "reuse",
      input.layoutOpts.laneOrder ?? "crossing-min",
      input.layoutOpts.lifetimeMode ?? "half",
      input.layoutOpts.maxValueScale ?? "",
      input.layoutOpts.lanePlacement ?? "stack",
      input.layoutOpts.nodeSizing ?? "temporal",
      input.layoutOpts.groupPadding ?? 0,
      input.domain[0],
      input.domain[1],
      input.styleRules,
      colorByIdKey,
    ]
  }, [input, colorByIdKey])

  // Worker only on client after the SSR-hydration-safe first paint.
  const useWorkerPath =
    !!input &&
    !wasHydratingFromSSR &&
    wantsWorker(input, execution, workerThreshold)

  // Sync path — always ready for this key when not using the worker.
  const syncScenes = useMemo((): BuildScenesResult | null => {
    if (!input) {
      return emptyResult([0, 1], 1)
    }
    if (useWorkerPath) return null
    return buildProcessSankeyScenes(input)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stableKey encodes input
  }, [stableKey, useWorkerPath, input])

  const skipHydrationWorker = useRef(wasHydratingFromSSR)
  const [asyncResult, setAsyncResult] = useState<UseProcessSankeyScenesResult>(() => {
    if (!input) {
      return { ...emptyResult([0, 1], 1), status: "ready", error: null }
    }
    // First hydration: seed with sync so markup matches SSR.
    if (wasHydratingFromSSR) {
      return { ...buildProcessSankeyScenes(input), status: "ready", error: null }
    }
    if (!useWorkerPath) {
      return { ...buildProcessSankeyScenes(input), status: "ready", error: null }
    }
    return {
      ...emptyResult(
        input.domain,
        input.orientation === "vertical" ? input.plotH : input.plotW,
      ),
      status: "pending",
      error: null,
    }
  })

  useEffect(() => {
    if (skipHydrationWorker.current) {
      skipHydrationWorker.current = false
      return
    }
    if (!input || !useWorkerPath) return

    const controller = new AbortController()
    setAsyncResult((current) => ({
      ...current,
      status: "pending",
      error: null,
    }))

    buildProcessSankeyScenesAsync(input, {
      execution,
      workerThreshold,
      signal: controller.signal,
      colorById,
      fallbackPalette,
      rawNodeById,
      rawEdgeById,
    })
      .then((scenes) => {
        setAsyncResult({ ...scenes, status: "ready", error: null })
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return
        setAsyncResult((current) => ({
          ...current,
          status: "error",
          error,
        }))
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey, useWorkerPath, execution, workerThreshold, fallbackPalette, rawNodeById, rawEdgeById])

  if (syncScenes) {
    return { ...syncScenes, status: "ready", error: null }
  }
  return asyncResult
}
