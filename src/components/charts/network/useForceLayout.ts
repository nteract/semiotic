"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  forceLayout,
  type ForceLayoutOptions
} from "../../recipes/forceLayout"
import {
  forceLayoutAsync,
  type ForceLayoutAsyncOptions
} from "../../recipes/forceLayoutAsync"
import type { GraphEdge, GraphNode, Point } from "../../recipes/networkAnalysis"
import { useWasHydratingFromSSR } from "../../stream/useHydration"

export type ForceLayoutStatus = "pending" | "ready" | "error"

export interface UseForceLayoutResult {
  positions: Record<string, Point> | null
  status: ForceLayoutStatus
  error: Error | null
}

// The layout is deterministic, so identical inputs always settle to identical
// positions — remounts (route re-entry, docs chapter flips) can reuse the
// settled result instead of re-entering "pending". Keyed by node/edge array
// identity (module-constant graphs hit; rebuilt arrays simply recompute) and
// an options signature; entries are GC'd with their arrays. The per-pair map
// is bounded so a "re-seed on every click" interaction can't grow unbounded.
const MAX_CACHED_VARIANTS = 16
const positionsCache = new WeakMap<
  ReadonlyArray<GraphNode>,
  WeakMap<ReadonlyArray<GraphEdge>, Map<string, Record<string, Point>>>
>()

/** Null when any option is a function (uncacheable identity). */
function optionsSignature(options: Record<string, unknown>): string | null {
  const parts: string[] = []
  for (const key of Object.keys(options).sort()) {
    const value = options[key]
    if (value === undefined) continue
    if (typeof value === "function") return null
    parts.push(`${key}:${String(value)}`)
  }
  return parts.join("|")
}

function readCachedPositions(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>,
  signature: string | null
): Record<string, Point> | null {
  if (signature == null) return null
  return positionsCache.get(nodes)?.get(edges)?.get(signature) ?? null
}

function writeCachedPositions(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>,
  signature: string | null,
  positions: Record<string, Point>
): void {
  if (signature == null) return
  let byEdges = positionsCache.get(nodes)
  if (!byEdges) {
    byEdges = new WeakMap()
    positionsCache.set(nodes, byEdges)
  }
  let bySignature = byEdges.get(edges)
  if (!bySignature) {
    bySignature = new Map()
    byEdges.set(edges, bySignature)
  }
  if (!bySignature.has(signature) && bySignature.size >= MAX_CACHED_VARIANTS) {
    const oldest = bySignature.keys().next().value
    if (oldest !== undefined) bySignature.delete(oldest)
  }
  bySignature.set(signature, positions)
}

/**
 * React lifecycle wrapper for deterministic force layout. Direct SSR and the
 * first hydration render stay synchronous so markup matches; client-side mounts
 * and subsequent graph changes use {@link forceLayoutAsync}. Settled positions
 * are memoized by node/edge array identity + options, so remounting with the
 * same module-constant graph resolves "ready" immediately instead of
 * re-flashing a pending state.
 */
export function useForceLayout(
  nodes: ReadonlyArray<GraphNode>,
  edges: ReadonlyArray<GraphEdge>,
  options: Omit<ForceLayoutAsyncOptions, "signal"> = {}
): UseForceLayoutResult {
  const wasHydratingFromSSR = useWasHydratingFromSSR()
  const {
    seed,
    iterations,
    repulsion,
    linkDistance,
    linkStrength,
    centerStrength,
    damping,
    nodeRadius,
    nodePadding,
    inset,
    execution,
    workerThreshold
  } = options
  const stableOptions = useMemo(
    () => ({
      seed,
      iterations,
      repulsion,
      linkDistance,
      linkStrength,
      centerStrength,
      damping,
      nodeRadius,
      nodePadding,
      inset,
      execution,
      workerThreshold
    }),
    [
      seed,
      iterations,
      repulsion,
      linkDistance,
      linkStrength,
      centerStrength,
      damping,
      nodeRadius,
      nodePadding,
      inset,
      execution,
      workerThreshold
    ]
  )
  const hydratedInitialLayout = useRef(wasHydratingFromSSR)
  const [result, setResult] = useState<UseForceLayoutResult>(() => {
    if (typeof window === "undefined" || wasHydratingFromSSR) {
      const positions = forceLayout(
        nodes,
        edges,
        stableOptions as ForceLayoutOptions
      )
      writeCachedPositions(nodes, edges, optionsSignature(stableOptions), positions)
      return { positions, status: "ready", error: null }
    }
    const cached = readCachedPositions(nodes, edges, optionsSignature(stableOptions))
    if (cached) return { positions: cached, status: "ready", error: null }
    return { positions: null, status: "pending", error: null }
  })

  useEffect(() => {
    // The server and first hydration render already computed matching geometry.
    if (hydratedInitialLayout.current) {
      hydratedInitialLayout.current = false
      return
    }

    const signature = optionsSignature(stableOptions)
    const cached = readCachedPositions(nodes, edges, signature)
    if (cached) {
      setResult((current) =>
        current.status === "ready" && current.positions === cached
          ? current
          : { positions: cached, status: "ready", error: null }
      )
      return
    }

    const controller = new AbortController()
    setResult((current) => ({
      positions: current.positions,
      status: "pending",
      error: null
    }))
    forceLayoutAsync(nodes, edges, {
      ...stableOptions,
      signal: controller.signal
    })
      .then((positions) => {
        writeCachedPositions(nodes, edges, signature, positions)
        setResult({ positions, status: "ready", error: null })
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return
        setResult((current) => ({
          positions: current.positions,
          status: "error",
          error
        }))
      })

    return () => controller.abort()
  }, [
    nodes,
    edges,
    stableOptions
  ])

  return result
}
