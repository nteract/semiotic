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
import { useImperativeHandle, useRef } from "react"
import type { Ref, RefObject } from "react"
import type { Datum } from "./datumTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"

/** Minimal shape the helper expects of an XY/ordinal frame ref. */
interface XYOrdinalFrameLike {
  push(point: Datum): void
  pushMany(points: Datum[]): void
  remove(id: string | string[]): Datum[]
  update(id: string | string[], updater: (d: Datum) => Datum): Datum[]
  /** Ordinal bounded-ingest; XY frames typically omit this. */
  replace?(data: Datum[]): void
  clear(): void
  getData(): Datum[]
  getScales(): unknown | null
  getCustomLayout?(): unknown | null
  getLayoutFailure?(): unknown | null
}

/** Minimal shape the helper expects of a network frame ref. */
interface NetworkFrameLike {
  push(edge: unknown): void
  pushMany(edges: unknown[]): void
  removeNode(id: string): boolean
  // `null`, not `undefined`, to match `StreamNetworkFrameHandle.updateNode`.
  // `prev ? […] : []` below treats both as falsy, so the consumer-facing
  // semantics are unchanged regardless — typing it correctly here just
  // lets a future maintainer plug another network frame into this helper
  // without wondering whether the contract is `null` or `undefined`.
  updateNode(id: string, updater: (d: Datum) => Datum): Datum | null
  clear(): void
  getTopology(): { nodes: Array<{ id: string; data?: Datum | null }> } | null
  getCustomLayout?(): unknown | null
  getLayoutFailure?(): unknown | null
}

/** Minimal shape the helper expects of a geo (point-only) frame ref. */
interface GeoPointsFrameLike {
  push(point: Datum): void
  pushMany(points: Datum[]): void
  removePoint(id: string | string[]): Datum[]
  clear(): void
  getData(): Datum[]
  getCustomLayout?(): unknown | null
  getLayoutFailure?(): unknown | null
}

/** Minimal shape the helper expects of a geo (line/flow) frame ref. */
interface GeoLinesFrameLike {
  pushLine(line: Datum): void
  pushManyLines(lines: Datum[]): void
  removeLine(id: string | string[]): Datum[]
  getLines(): Datum[]
  clear(): void
  getCustomLayout?(): unknown | null
  getLayoutFailure?(): unknown | null
}

type FrameVariant = "xy" | "network" | "geo-points" | "geo-lines"

interface Options {
  /**
   * Variant decides which default method bodies are emitted. The
   * concrete `frameRef` shape must match the variant — the helper
   * trusts the caller here rather than fighting TypeScript's
   * discriminated-union narrowing across heterogeneous frame handle
   * types (`StreamXYFrameHandle` vs `StreamNetworkFrameHandle` vs
   * `StreamGeoFrameHandle`). A regression test in
   * `useFrameImperativeHandle.test.ts` exercises each variant's
   * defaults plus the `getScales` omission for network/geo.
   */
  variant: FrameVariant
  frameRef: RefObject<unknown>
  overrides?: Partial<RealtimeFrameHandle>
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
  const { variant, frameRef, overrides } = options
  // Keep the latest overrides on a ref so the imperative handle can stay
  // referentially stable (deps `[]`) even when callers pass an inline
  // `overrides` object every render (Sankey/Chord/Bubble/Scatterplot/
  // ProcessSankey/FlowMap). Including `overrides` in deps rebuilt the
  // handle on every parent re-render, which re-fired callback-ref seed
  // patterns and undid live remove/update — the documented "Remove Cache"
  // bug this helper was written to kill.
  const overridesRef = useRef(overrides)
  overridesRef.current = overrides
  // Default deps to `[]` so the handle is referentially stable across
  // renders. The method bodies read `frameRef.current` (and overridesRef)
  // at call time, so a frozen closure still dispatches into the latest
  // store and latest overrides.
  useImperativeHandle(
    ref,
    () => {
      const defaults = makeVariantDefaults(variant, frameRef)
      // Proxy so each property access prefers the *current* overrides without
      // rebuilding the handle object identity. Missing keys on network/geo
      // (e.g. getScales) stay absent when neither defaults nor overrides
      // define them — `typeof handle.getScales === "function"` stays false.
      return new Proxy(defaults, {
        get(target, prop, receiver) {
          if (typeof prop === "string") {
            const latest = overridesRef.current?.[prop as keyof RealtimeFrameHandle]
            if (typeof latest === "function") return latest
          }
          return Reflect.get(target, prop, receiver)
        },
        has(target, prop) {
          if (typeof prop === "string" && overridesRef.current && prop in overridesRef.current) {
            return true
          }
          return Reflect.has(target, prop)
        },
      }) as RealtimeFrameHandle
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: stable handle; see comment above
    [],
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
      // Ordinal frames expose replace for bounded-ingest transitions;
      // XY frames typically omit it (no-op when missing).
      replace: (data) => r.current?.replace?.(data),
      clear: () => r.current?.clear(),
      getData: () => r.current?.getData() ?? [],
      getScales: () => r.current?.getScales() ?? null,
      getCustomLayout: () => r.current?.getCustomLayout?.() ?? null,
      getLayoutFailure: () => r.current?.getLayoutFailure?.() ?? null,
    }
  }
  if (variant === "network") {
    const r = frameRef as RefObject<NetworkFrameLike | null>
    // `getScales` is intentionally absent because `RealtimeFrameHandle`
    // marks it optional for network/geo frames. Returning a
    // `() => null` stub instead would silently flip
    // `typeof handle.getScales === "function"` checks consumers may
    // use to branch, so do not assign the key.
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
      // Nodes without a `data` payload surface as `undefined` entries in the returned
      // array. The `RealtimeFrameHandle.getData()` signature is
      // `Datum[]`, so we cast at the boundary to keep that type
      // contract.
      getData: () =>
        (r.current?.getTopology()?.nodes?.map((n) => n.data) as Datum[] | undefined) ?? [],
      getCustomLayout: () => r.current?.getCustomLayout?.() ?? null,
      getLayoutFailure: () => r.current?.getLayoutFailure?.() ?? null,
    }
  }
  if (variant === "geo-points") {
    // Geo point handles omit the optional `getScales` method.
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
      getCustomLayout: () => r.current?.getCustomLayout?.() ?? null,
      getLayoutFailure: () => r.current?.getLayoutFailure?.() ?? null,
    }
  }
  // variant === "geo-lines"
  // Mirrors `geo-points` but for line/flow records. FlowMap uses this
  // variant with a `push` / `pushMany` override that resolves
  // source/target through its `nodeLookup` before forwarding to
  // `pushLine` / `pushManyLines`. Other line-shaped geo HOCs
  // (potential future additions) can use the variant defaults
  // directly when their push payload already carries resolved
  // coordinates.
  const r = frameRef as RefObject<GeoLinesFrameLike | null>
  return {
    push: (line) => r.current?.pushLine(line),
    pushMany: (lines) => r.current?.pushManyLines(lines),
    remove: (id) => r.current?.removeLine(id) ?? [],
    update: (id, updater) => {
      // Same remove-then-push emulation pattern as geo-points — geo
      // frames don't natively support in-place line updates.
      const removed = r.current?.removeLine(id) ?? []
      for (const old of removed) r.current?.pushLine(updater(old))
      return removed
    },
    clear: () => r.current?.clear(),
    getData: () => r.current?.getLines() ?? [],
    getCustomLayout: () => r.current?.getCustomLayout?.() ?? null,
    getLayoutFailure: () => r.current?.getLayoutFailure?.() ?? null,
  }
}
