"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { scaleTime } from "d3-scale"
import {
  buildProcessSankeyScenes, prepareProcessSankeyLayout,
  type BuildScenesInput, type BuildScenesResult, type PreparedProcessSankeyLayout,
} from "./buildScenes"
import {
  canUseProcessSankeyWorker, shouldUseProcessSankeyWorker, runProcessSankeyLayoutWorker,
  type ProcessSankeyLayoutExecution,
} from "./processSankeyLayoutWorkerClient"
import { useWasHydratingFromSSR } from "../../../stream/useHydration"

export type ProcessSankeyLayoutStatus = "pending" | "ready" | "error"
export interface UseProcessSankeyScenesResult extends BuildScenesResult {
  status: ProcessSankeyLayoutStatus
  error: Error | null
}
export interface UseProcessSankeyScenesOptions {
  execution?: ProcessSankeyLayoutExecution
  workerThreshold?: number

}
const emptyResult = (domain: [number, number], extent: number): BuildScenesResult => ({
  layout: null, layoutConfig: { bands: [], ribbons: [], showLabels: true },
  issues: [], warnings: [], xScale: scaleTime().domain(domain).range([0, extent]),
})

/** Only derived analysis values cross the geometry cache/worker boundary. */
function geometryInput(input: BuildScenesInput | null) {
  return input ? {
    nodes: input.nodes.map(({ id, group, xExtent }) => ({ id, group, xExtent })),
    edges: input.edges.map(({ id, source, target, value, startTime, endTime, systemInTime, systemOutTime }) =>
      ({ id, source, target, value, startTime, endTime, systemInTime, systemOutTime })),
    domain: input.domain, plotW: 1,
    plotH: input.orientation === "vertical" ? input.plotW : input.plotH,
    ribbonLane: input.ribbonLane, usageMode: input.usageMode, layoutOpts: input.layoutOpts,
    colorOf: () => "#475569", edgeOpacity: 0.35, showLabels: false,
  } : null
}

/** Reuse analysis across presentation changes; keep the latest committed scene while workers run. */
export function useProcessSankeyScenes(input: BuildScenesInput | null, options: UseProcessSankeyScenesOptions): UseProcessSankeyScenesResult {
  const { execution = "auto", workerThreshold } = options
  const geometry = geometryInput(input)
  const key = JSON.stringify(geometry, (_key, value: unknown) =>
    typeof value === "number" && !Number.isFinite(value) ? String(value) : value)
  const wasHydrating = useWasHydratingFromSSR()
  const hydrationKey = useRef(wasHydrating ? key : null)
  // Serialization includes all analysis inputs. Presentation uses current input below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layoutInput = useMemo(() => geometry, [key])
  const useWorker = !!layoutInput && hydrationKey.current !== key &&
    typeof window !== "undefined" && canUseProcessSankeyWorker() &&
    shouldUseProcessSankeyWorker(execution, layoutInput.nodes.length, layoutInput.edges.length,
      layoutInput.layoutOpts.packing ?? "reuse", layoutInput.layoutOpts.laneOrder ?? "crossing-min", workerThreshold)
  const sync = useMemo(() => layoutInput && !useWorker ? prepareProcessSankeyLayout(layoutInput) : null,
    [layoutInput, useWorker])
  const [asyncResult, setAsyncResult] = useState<{
    key: string; prepared: PreparedProcessSankeyLayout | null; error: Error | null
  } | null>(null)
  const committed = useRef<{ key: string; prepared: PreparedProcessSankeyLayout; scene: BuildScenesResult } | null>(null)
  const matched = asyncResult?.key === key ? asyncResult : null
  const prepared = sync ?? matched?.prepared ?? (committed.current?.key === key ? committed.current.prepared : null)
  const scene = useMemo(() => input && prepared ? buildProcessSankeyScenes(input, prepared) : null, [input, prepared])
  useEffect(() => {
    if (scene && prepared) committed.current = { key, prepared, scene }
    if (!input) committed.current = null
  }, [key, scene, prepared, input])
  useEffect(() => {
    if (!layoutInput || !useWorker || committed.current?.key === key) return
    const controller = new AbortController()
    // The geometry input already excludes raw records and presentation callbacks.
    // Only the host-side color resolver needs to be omitted at this boundary.
    const wire = { ...layoutInput, colorOf: undefined }
    runProcessSankeyLayoutWorker({ input: wire, colorById: {}, fallbackPalette: ["#475569"] }, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setAsyncResult({ key, prepared: { layout: result.layout, issues: result.issues, warnings: result.warnings }, error: null })
      })
      .catch((error: Error) => {
        if (controller.signal.aborted || error.name === "AbortError") return
        try {
          setAsyncResult({ key, prepared: prepareProcessSankeyLayout(layoutInput), error: null })
        } catch (fallbackError) {
          setAsyncResult({ key, prepared: null, error: fallbackError as Error })
        }
      })
    return () => controller.abort()
  }, [key, layoutInput, useWorker, execution, workerThreshold])
  if (!input) return { ...emptyResult([0, 1], 1), status: "ready", error: null }
  return {
    ...(scene ?? committed.current?.scene ?? emptyResult(input.domain, input.orientation === "vertical" ? input.plotH : input.plotW)),
    status: prepared ? "ready" : matched?.error ? "error" : "pending",
    error: matched?.error ?? null,
  }
}
