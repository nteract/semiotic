/**
 * Shared `useImperativeHandle` bridge for HOC charts.
 *
 * Every HOC chart implements the same 7-method `RealtimeFrameHandle`
 * (push / pushMany / remove / update / clear / getData / getScales) by
 * delegating to its inner `frameRef`. The boilerplate is identical
 * across XY and ordinal HOCs, with two well-defined variants for
 * network (`remove`/`update` route through `removeNode`/`updateNode`
 * after walking topology) and geo-points (`remove` routes through
 * `removePoint`; `update` is emulated by `removePoint` + `push` of the
 * updater result).
 *
 * This helper exposes the three variants behind one call site so each
 * HOC drops ~10 lines of boilerplate. HOCs with bespoke
 * `useImperativeHandle` bodies (MultiAxisLineChart's per-series
 * unitization, LikertChart's pre-aggregator, BubbleChart's wrapped
 * push) can either pass `overrides` to selectively replace methods
 * while keeping the rest of the variant's defaults, or skip the helper
 * entirely if the body diverges enough that the helper would be a
 * fight rather than a tool.
 */
"use client"
import { useImperativeHandle } from "react"
import type { Ref, RefObject, DependencyList } from "react"
import type { Datum } from "./datumTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"

/** Minimal shape the helper expects of an XY/ordinal frame ref. */
interface XYOrdinalFrameLike {
  push(point: Datum): void
  pushMany(points: Datum[]): void
  remove(id: string | string[]): Datum[]
  update(id: string | string[], updater: (d: Datum) => Datum): Datum[]
  clear(): void
  getData(): Datum[]
  getScales(): unknown | null
}

/** Minimal shape the helper expects of a network frame ref. */
interface NetworkFrameLike {
  push(edge: unknown): void
  pushMany(edges: unknown[]): void
  removeNode(id: string): boolean
  updateNode(id: string, updater: (d: Datum) => Datum): Datum | undefined
  clear(): void
  getTopology(): { nodes: Array<{ id: string; data?: Datum }> } | null
}

/** Minimal shape the helper expects of a geo (point-only) frame ref. */
interface GeoPointsFrameLike {
  push(point: Datum): void
  pushMany(points: Datum[]): void
  removePoint(id: string | string[]): Datum[]
  clear(): void
  getData(): Datum[]
}

type FrameVariant = "xy" | "network" | "geo-points"

interface Options {
  /**
   * Variant decides which default method bodies are emitted. The
   * concrete `frameRef` shape must match the variant — the helper
   * trusts the caller here rather than fighting TypeScript's
   * discriminated-union narrowing across heterogeneous frame handle
   * types (`StreamXYFrameHandle` vs `StreamNetworkFrameHandle` vs
   * `StreamGeoFrameHandle`). Test fixtures cover each variant's
   * methods end-to-end.
   */
  variant: FrameVariant
  frameRef: RefObject<unknown>
  overrides?: Partial<RealtimeFrameHandle>
  deps?: DependencyList
}

/**
 * Wire up the HOC's exposed `ref` to the inner frame ref using the
 * shape conventions for the chosen variant. Pass `overrides` to
 * replace specific methods (e.g. a wrapped `push` or a custom `clear`
 * that runs HOC-side cleanup before delegating to the frame); the
 * variant's defaults fill in everything else.
 */
export function useFrameImperativeHandle(
  ref: Ref<RealtimeFrameHandle> | undefined,
  options: Options,
): void {
  const { variant, frameRef, overrides, deps } = options
  // Methods are computed inside `useImperativeHandle`'s factory so they
  // capture the latest `frameRef.current`. The factory re-runs on every
  // render unless `deps` is supplied — match React's contract for the
  // hook so consumer behavior is unchanged from the inline form.
  useImperativeHandle(
    ref,
    () => {
      const defaults = makeVariantDefaults(variant, frameRef)
      return { ...defaults, ...overrides } as RealtimeFrameHandle
    },
    deps,
  )
}

function makeVariantDefaults(
  variant: FrameVariant,
  frameRef: RefObject<unknown>,
): RealtimeFrameHandle {
  if (variant === "xy") {
    const r = frameRef as RefObject<XYOrdinalFrameLike | null>
    return {
      push: (point) => r.current?.push(point),
      pushMany: (points) => r.current?.pushMany(points),
      remove: (id) => r.current?.remove(id) ?? [],
      update: (id, updater) => r.current?.update(id, updater) ?? [],
      clear: () => r.current?.clear(),
      getData: () => r.current?.getData() ?? [],
      getScales: () => r.current?.getScales() ?? null,
    }
  }
  if (variant === "network") {
    const r = frameRef as RefObject<NetworkFrameLike | null>
    return {
      // Network HOCs ingest edges, not points — the `RealtimeFrameHandle`
      // surface uses `Datum` for both, so the cast at the boundary is
      // intentional and matches the inline pattern these HOCs replaced.
      push: (point) => r.current?.push(point),
      pushMany: (points) => r.current?.pushMany(points),
      remove: (id) => {
        const ids = Array.isArray(id) ? id : [id]
        const nodes = r.current?.getTopology()?.nodes ?? []
        const results: Datum[] = []
        for (const nodeId of ids) {
          const node = nodes.find((n) => n.id === nodeId)
          if (node) results.push({ ...(node.data ?? {}), id: nodeId })
          r.current?.removeNode(nodeId)
        }
        return results
      },
      update: (id, updater) => {
        const ids = Array.isArray(id) ? id : [id]
        return ids.flatMap((nodeId) => {
          const prev = r.current?.updateNode(nodeId, updater)
          return prev ? [{ ...prev, id: nodeId }] : []
        })
      },
      clear: () => r.current?.clear(),
      getData: () =>
        r.current?.getTopology()?.nodes?.map((n) => n.data ?? {}) ?? [],
      // Network frames don't expose `getScales` — return null. Consumers
      // that documented this behavior in their inline handles get the
      // same shape from this default.
      getScales: () => null,
    }
  }
  // variant === "geo-points"
  const r = frameRef as RefObject<GeoPointsFrameLike | null>
  return {
    push: (point) => r.current?.push(point),
    pushMany: (points) => r.current?.pushMany(points),
    remove: (id) => r.current?.removePoint(id) ?? [],
    update: (id, updater) => {
      // Geo frames don't expose a native in-place update — emulate via
      // remove-then-push of the updater result. Mirrors the inline
      // pattern in ProportionalSymbolMap.
      const removed = r.current?.removePoint(id) ?? []
      for (const old of removed) r.current?.push(updater(old))
      return removed
    },
    clear: () => r.current?.clear(),
    getData: () => r.current?.getData() ?? [],
    // Geo frames don't have a meaningful scales concept either —
    // return null for consistency.
    getScales: () => null,
  }
}
