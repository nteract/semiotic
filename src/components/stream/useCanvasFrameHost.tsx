/**
 * Narrow canvas-host lifecycle shared by Stream Frame family adapters.
 *
 * `useFrame` owns responsive sizing, theme/motion, logical time, and rAF
 * coalescing. This hook deliberately owns only the lifecycle that begins once
 * a family has its store and paint closure: canvas-layer refs, hydration
 * takeover/teardown, runtime pause/visibility handoff, and explicit canvas
 * repaint dependencies. Layout, scene construction, hit testing, and the
 * contents of SVG overlays stay in the family adapter.
 */
"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import type {
  DependencyList,
  MutableRefObject,
  ReactNode,
  RefObject,
} from "react"
import type { FrameMargin } from "./useFrame"
import { useHydrationLifecycle } from "./useHydration"

export interface CanvasFrameHostRuntime {
  readonly isActive: boolean
  subscribe(listener: () => void): () => void
}

export interface CanvasFrameHostStore {
  cancelIntroAnimation?: () => void
}

export interface UseCanvasFrameHostInput<TStore extends object> {
  /** The family-owned store only needs the shared hydration escape hatch. */
  storeRef: RefObject<TStore | null>
  /** The family-owned retained-scene repaint flag. */
  dirtyRef: MutableRefObject<boolean>
  /** Stable render closure and scheduler callbacks supplied by `useFrame`. */
  renderFnRef: MutableRefObject<() => void>
  scheduleRender: () => void
  cancelRender: () => void
  /** Logical pause/visibility runtime supplied by `useFrame`. */
  frameRuntime: CanvasFrameHostRuntime
  /**
   * Opt out only when a family-specific lifecycle adapter must synchronize
   * pause/visibility with an external runtime such as a worker. The default
   * host policy owns ordinary canvas-frame runtime transitions.
   */
  manageFrameRuntime?: boolean
  hydrated: boolean
  wasHydratingFromSSR: boolean
  /** Family-specific teardown such as clearing a streaming data adapter. */
  cleanup?: () => void
  /**
   * Some adapters synchronously paint their initial retained scene through a
   * family-specific execution policy. They can skip the otherwise useful
   * mount-time invalidation while retaining dependency-change invalidation.
   */
  skipInitialCanvasPaintInvalidation?: boolean
  /**
   * Values that require a data-canvas repaint. Keep this list family-owned:
   * it expresses paint semantics without teaching the host chart props or
   * layout rules. Its length must remain stable for one host instance.
   */
  canvasPaintDependencies: DependencyList
}

export interface CanvasFrameHostResult {
  /** Base retained-scene data layer. */
  canvasRef: RefObject<HTMLCanvasElement | null>
  /** Optional family use for hover/crosshair/highlight canvas content. */
  interactionCanvasRef: RefObject<HTMLCanvasElement | null>
}

/**
 * Installs common canvas-host lifecycle without absorbing family render work.
 */
export function useCanvasFrameHost<TStore extends object>(
  input: UseCanvasFrameHostInput<TStore>,
): CanvasFrameHostResult {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null)
  const hasRunCanvasPaintInvalidationRef = useRef(false)

  useHydrationLifecycle({
    hydrated: input.hydrated,
    wasHydratingFromSSR: input.wasHydratingFromSSR,
    storeRef: input.storeRef as RefObject<CanvasFrameHostStore | null>,
    dirtyRef: input.dirtyRef,
    renderFnRef: input.renderFnRef,
    cancelRender: input.cancelRender,
    cleanup: input.cleanup,
  })

  // A pause/visibility transition must cancel queued canvas work immediately.
  // On resume, the family repaints its retained scene from FrameRuntime's
  // rebased logical time. This mirrors the contract tested across every frame
  // family while keeping their actual render closures local.
  useEffect(() => {
    if (input.manageFrameRuntime === false) return
    return input.frameRuntime.subscribe(() => {
      if (!input.frameRuntime.isActive) {
        input.cancelRender()
        return
      }
      input.dirtyRef.current = true
      input.scheduleRender()
    })
  }, [
    input.cancelRender,
    input.dirtyRef,
    input.frameRuntime,
    input.manageFrameRuntime,
    input.scheduleRender,
  ])

  // Overlay/background changes can alter whether opaque canvas paint hides an
  // SVG underlay. Each family provides its own precise dependency list so the
  // host performs the common handoff without taking ownership of overlay
  // contents or layout policy.
  useEffect(() => {
    if (!hasRunCanvasPaintInvalidationRef.current) {
      hasRunCanvasPaintInvalidationRef.current = true
      if (input.skipInitialCanvasPaintInvalidation) return
    }
    input.dirtyRef.current = true
    input.scheduleRender()
    // `canvasPaintDependencies` is intentionally the adapter's explicit
    // dependency list; React compares its values just like a local effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, input.canvasPaintDependencies)

  return { canvasRef, interactionCanvasRef }
}

export interface CanvasFrameBackgroundProps {
  children: ReactNode
  size: readonly [number, number]
  margin: FrameMargin
  /** Preserve a family's existing SVG overflow behavior when it needs it. */
  overflowVisible?: boolean
}

/**
 * The shared SVG background layer. Its coordinate translation is common;
 * resolving graphics and choosing their contents remain family-specific.
 */
export function CanvasFrameBackground({
  children,
  size,
  margin,
  overflowVisible = false,
}: CanvasFrameBackgroundProps): React.ReactNode {
  if (!children) return null
  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: size[0],
        height: size[1],
        pointerEvents: "none",
        overflow: overflowVisible ? "visible" : undefined,
      }}
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        {children}
      </g>
    </svg>
  )
}
