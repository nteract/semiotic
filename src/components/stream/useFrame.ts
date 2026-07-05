/**
 * useFrame — composition hook shared by all four Stream Frames.
 *
 * Bundles the concerns that all four frames duplicate identically (or with
 * trivial variation): reduced-motion tracking, responsive sizing, theme
 * tracking, animate-config resolution, foreground/background graphics
 * resolution, accessible-table id, and so on.
 *
 * Concerns are extracted in the order documented in
 * FRAME_COMPOSITION_LOG.md, smallest blast radius first.
 *
 * Design rules:
 *
 * 1. **No frame-specific knowledge here.** This file knows nothing about
 *    pipeline stores, hit testers, scene-node types, or family-specific
 *    layout. If a concern requires that knowledge, it stays in the frame.
 * 2. **Refs and state created here stay owned by the frame.** The hook
 *    returns the refs/state; assignment to `renderFnRef.current = () => …`
 *    happens in the frame body where the local closure captures family
 *    state.
 * 3. **Frame-supplied defaults.** Anything that varies across frames
 *    (margin defaults, dirtyRef initial value, table component) is passed
 *    in as input; the hook doesn't pick its own.
 * 4. **Output stability, where practical.** Refs and callback outputs
 *    (`rafRef`, `renderFnRef`, `hoverHandlerRef`, `scheduleRender`,
 *    `onPointerMove`, `onPointerLeave`) are stable across renders.
 *    `margin` is useMemo'd. But some outputs can change identity per
 *    render: `size` is whatever `useResponsiveSize` returns (stable
 *    only when the measured size hasn't changed); `resolvedForeground`
 *    / `resolvedBackground` are recomputed each render (and call the
 *    user's function-form graphics prop fresh each time); `transition`
 *    is derived inline from `animate`. Callers that use these as
 *    useMemo/useEffect deps should memoize the upstream props
 *    themselves where stability matters.
 *
 * See `useFrame.test.ts` for the behavior contracts.
 */
"use client"

import * as React from "react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react"
import type { ReactNode } from "react"
import { useThemeSelector } from "../store/ThemeStore"
import type { SemioticTheme } from "../store/ThemeStore"
import { useReducedMotion } from "./useMediaPreferences"
import { useResponsiveSize } from "./useResponsiveSize"
import { resolveAnimateConfig } from "./pipelineTransitionUtils"
import type { AnimateProp } from "./pipelineTransitionUtils"
import type { TransitionConfig } from "./types"
import { clearCSSColorCache } from "./renderers/resolveCSSColor"
import type { HoverPointerCoords } from "./hoverUtils"

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

// ── Margin handling ─────────────────────────────────────────────────────────

/**
 * Frame-supplied margin defaults. Each Stream Frame has its own — XY's
 * differs from Ordinal's, Network has both a default and a CENTERED variant
 * for radial chart types. The hook accepts the resolved default and
 * shallow-merges user margin on top.
 */
export interface FrameMargin {
  top: number
  right: number
  bottom: number
  left: number
}

// ── Foreground / background graphics ────────────────────────────────────────

/**
 * Foreground/background graphics can be a ReactNode (rendered as-is) or a
 * function that receives the current `{ size, margin }` and returns one.
 * The function form lets users place chrome relative to the chart area.
 */
export type FrameGraphicsProp =
  | ReactNode
  | ((ctx: { size: number[]; margin: FrameMargin }) => ReactNode)

function resolveGraphics(
  graphics: FrameGraphicsProp | undefined,
  size: number[],
  margin: FrameMargin,
): ReactNode {
  if (typeof graphics === "function") {
    return (graphics as (ctx: { size: number[]; margin: FrameMargin }) => ReactNode)({ size, margin })
  }
  return graphics
}

// ── Hook input / output ─────────────────────────────────────────────────────

export interface UseFrameInput {
  /** Resolved size `[width, height]`. Each frame defaults its `size` prop
   *  before calling, so this is never undefined. */
  sizeProp: [number, number]
  /** Frame's `responsiveWidth` prop. */
  responsiveWidth: boolean | undefined
  /** Frame's `responsiveHeight` prop. */
  responsiveHeight: boolean | undefined
  /** Frame's user-supplied margin (always partial — each side optional).
   *  Matches the `margin?:` prop type on every Stream Frame. */
  userMargin: Partial<FrameMargin> | undefined
  /** Frame's family-default margin. Shallow-merged with `userMargin`. */
  marginDefault: FrameMargin
  /** Frame's `foregroundGraphics` prop. */
  foregroundGraphics?: FrameGraphicsProp
  /** Frame's `backgroundGraphics` prop. */
  backgroundGraphics?: FrameGraphicsProp
  /** Frame's `animate` prop. */
  animate?: AnimateProp
  /** Frame's `transition` prop (legacy / explicit form). */
  transitionProp?: TransitionConfig
  /**
   * Frame's `dirtyRef` (the flag that forces a full canvas redraw on the
   * next paint). When provided, useFrame installs a theme-change effect
   * that bumps it to `true`, clears the CSS-var cache, and queues a
   * render — the pattern that all four frames duplicated.
   *
   * Optional because this is a Tier B add-on; before the migration the
   * frames installed this themselves. The hook keeps the input optional
   * so a frame can opt in independently, but in practice all four pass
   * it.
   *
   * `dirtyRef` is owned by the frame (not the hook) because its initial
   * value differs — only `StreamXYFrame` inits to `false`; Ordinal,
   * Network, and Geo all init to `true` (load-bearing for first-paint
   * timing on those three).
   */
  themeDirtyRef?: React.MutableRefObject<boolean>
}

export interface UseFrameResult {
  /** Reduced-motion preference at last render (for re-render gating). */
  reducedMotion: boolean
  /** Reduced-motion ref-mirror so render closures see the latest value
   *  without depending on it. */
  reducedMotionRef: React.MutableRefObject<boolean>
  /** Ref to attach to the responsive container. */
  responsiveRef: ReturnType<typeof useResponsiveSize>[0]
  /** Resolved size `[width, height]` accounting for `responsiveWidth/Height`. */
  size: [number, number]
  /** Effective margin (`marginDefault` ⊕ `userMargin`). */
  margin: FrameMargin
  /** `size[0] - margin.left - margin.right`. */
  adjustedWidth: number
  /** `size[1] - margin.top - margin.bottom`. */
  adjustedHeight: number
  /** Resolved foreground (function-or-node, evaluated). */
  resolvedForeground: ReactNode
  /** Resolved background (function-or-node, evaluated). */
  resolvedBackground: ReactNode
  /** Current theme from the ThemeStore — re-renders on theme change. */
  currentTheme: SemioticTheme
  /** Resolved transition config from `animate`/`transition` props. */
  transition: ReturnType<typeof resolveAnimateConfig>["transition"]
  /** Whether the intro animation should run on first render. */
  introEnabled: boolean
  /** Stable id for the AccessibleDataTable region (hash-suffixed). */
  tableId: string

  // ── rAF-coalesced render scheduling ──────────────────────────────────
  // The frame body assigns its render closure to `renderFnRef.current`;
  // calling `scheduleRender()` queues a single rAF that invokes it. A
  // second `scheduleRender()` while a rAF is already pending is a no-op
  // (coalescing). The frame's render closure should reset
  // `rafRef.current = 0` at the start (before doing render work) so
  // subsequent `scheduleRender()` calls can queue again. Resetting at
  // the start lets a render closure call `scheduleRender()` itself —
  // e.g. to continue an animation — without being silently coalesced
  // into the frame that's already running.
  //
  // The hook installs an unmount effect that cancels any pending rAF —
  // frames no longer need their own cancel-on-unmount for this ref
  // (other unmount cleanup like move-coalesce or adapter teardown stays
  // frame-local).

  /** Token of the pending rAF, or 0 if none. */
  rafRef: React.MutableRefObject<number>
  /** Frame assigns its render closure here. */
  renderFnRef: React.MutableRefObject<() => void>
  /** Queue a render on the next animation frame. Coalesces. */
  scheduleRender: () => void

  // ── Hover / pointer event coalescing ─────────────────────────────────
  // Pointer events fire faster than the display refreshes — sometimes
  // 240Hz on hi-fi mice. Each pointermove triggers a hit test and a
  // tooltip re-render; coalescing into one-per-rAF keeps the hover path
  // bounded at the display refresh rate.
  //
  // Frame body assigns the family-specific handler bodies to
  // `hoverHandlerRef.current` (called with HoverPointerCoords on each
  // coalesced event) and `hoverLeaveRef.current` (called on
  // pointerleave; e.g. clears tooltip state). Wire the canvas to
  // `onPointerMove` and `onPointerLeave` returned here.
  //
  // The hook owns: rAF coalescing, cleanup of the pending move on
  // unmount, and the pendingMoveCoordsRef nullification on leave.

  /** Frame assigns its hover handler closure here. */
  hoverHandlerRef: React.MutableRefObject<(coords: HoverPointerCoords) => void>
  /** Frame assigns its pointer-leave closure here. */
  hoverLeaveRef: React.MutableRefObject<() => void>
  /** Stable callback to attach to canvas's onPointerMove (or onMouseMove).
   *  Captures the coords and queues a single rAF to drain into hoverHandlerRef. */
  onPointerMove: (e: { clientX: number; clientY: number; pointerType?: string }) => void
  /** Stable callback to attach to canvas's onPointerLeave (or onMouseLeave).
   *  Cancels any pending hover rAF and invokes hoverLeaveRef. */
  onPointerLeave: () => void
}

/**
 * Bundles the universally-shared setup boilerplate that opens every
 * Stream Frame. See `FRAME_COMPOSITION_LOG.md` for which concerns are
 * inside this hook vs. left frame-specific.
 */
export function useFrame(input: UseFrameInput): UseFrameResult {
  // ── Reduced motion + ref-mirror ───────────────────────────────────────
  // The ref-mirror pattern lets render closures read the latest value
  // without rebinding (useReducedMotion subscribes via media query, so it
  // updates on system pref change without remounting).
  const reducedMotion = useReducedMotion()
  const reducedMotionRef = useRef(reducedMotion)
  reducedMotionRef.current = reducedMotion

  // ── Responsive sizing ─────────────────────────────────────────────────
  const [responsiveRef, size] = useResponsiveSize(
    input.sizeProp,
    input.responsiveWidth,
    input.responsiveHeight,
  )

  // ── Margin merge + adjusted dimensions ────────────────────────────────
  // Memoized so frames using `margin` as a useMemo dependency don't loop.
  const margin = useMemo<FrameMargin>(
    () => ({ ...input.marginDefault, ...input.userMargin }),
    [input.marginDefault, input.userMargin],
  )
  const adjustedWidth = size[0] - margin.left - margin.right
  const adjustedHeight = size[1] - margin.top - margin.bottom

  // ── Foreground / background resolution ────────────────────────────────
  const resolvedForeground = resolveGraphics(input.foregroundGraphics, size, margin)
  const resolvedBackground = resolveGraphics(input.backgroundGraphics, size, margin)

  // ── Theme tracking ────────────────────────────────────────────────────
  // The selector subscribes to `state.theme`, so a theme change anywhere
  // re-renders the frame. The frame typically also feeds this into a
  // theme-change effect that calls clearCSSColorCache + scheduleRender.
  const currentTheme = useThemeSelector(
    (s: { theme: SemioticTheme }) => s.theme,
  )

  // ── Animate → transition resolution ───────────────────────────────────
  const { transition, introEnabled } = resolveAnimateConfig(input.animate, input.transitionProp)

  // ── Stable table id ───────────────────────────────────────────────────
  // useId is stable across renders, hydration-safe, and unique per instance.
  // The `semiotic-table-` prefix gives the SkipToTableLink something readable.
  const reactId = React.useId()
  const tableId = `semiotic-table-${reactId}`

  // ── rAF-coalesced render scheduling ──────────────────────────────────
  // Owned here so any future tweak to the coalescing semantics (deferred
  // commits, scheduler integration, etc.) is one source of truth.
  const rafRef = useRef(0)
  const renderFnRef = useRef<() => void>(() => {})
  const scheduleRender = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => renderFnRef.current())
  }, [])

  // Cancel any pending rAF on unmount. Frames may still install their own
  // unmount cleanup for things the hook doesn't own (pointermove
  // coalescing, DataSourceAdapter teardown), but the rafRef cleanup is
  // now centralized.
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [])

  // ── Pointer event coalescing (hover handler) ──────────────────────────
  const hoverHandlerRef = useRef<(coords: HoverPointerCoords) => void>(() => {})
  const hoverLeaveRef = useRef<() => void>(() => {})
  const pendingMoveCoordsRef = useRef<HoverPointerCoords | null>(null)
  const moveRafRef = useRef(0)
  const flushPendingMove = useCallback(() => {
    moveRafRef.current = 0
    const coords = pendingMoveCoordsRef.current
    pendingMoveCoordsRef.current = null
    if (coords) hoverHandlerRef.current(coords)
  }, [])
  const onPointerMove = useCallback((e: { clientX: number; clientY: number; pointerType?: string }) => {
    pendingMoveCoordsRef.current = { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType }
    if (moveRafRef.current === 0) {
      moveRafRef.current = requestAnimationFrame(flushPendingMove)
    }
  }, [flushPendingMove])
  const onPointerLeave = useCallback(() => {
    pendingMoveCoordsRef.current = null
    if (moveRafRef.current !== 0) {
      cancelAnimationFrame(moveRafRef.current)
      moveRafRef.current = 0
    }
    hoverLeaveRef.current()
  }, [])

  // Cleanup pending hover rAF on unmount alongside the render-rAF cancel.
  useEffect(() => {
    return () => {
      pendingMoveCoordsRef.current = null
      if (moveRafRef.current !== 0) {
        cancelAnimationFrame(moveRafRef.current)
        moveRafRef.current = 0
      }
    }
  }, [])

  // ── Theme-change effect ───────────────────────────────────────────────
  // When the theme changes (currentTheme reference changes), invalidate
  // the per-canvas CSS-var color cache, force a full redraw on the next
  // paint, and schedule that paint. Identical pattern across all four
  // frames pre-migration; only installed when the frame opts in by
  // passing themeDirtyRef.
  //
  // Note: `clearCSSColorCache` accepts an optional canvas argument that
  // it doesn't use (the cache is global, keyed on a version counter).
  // Both the canvas-arg and argless call sites in the four frames
  // reduced to a single global counter bump; we use the argless form.
  const themeDirtyRef = input.themeDirtyRef
  useIsomorphicLayoutEffect(() => {
    if (!themeDirtyRef) return
    clearCSSColorCache()
    themeDirtyRef.current = true
    scheduleRender()
  }, [currentTheme, scheduleRender, themeDirtyRef])

  return {
    reducedMotion,
    reducedMotionRef,
    responsiveRef,
    size,
    margin,
    adjustedWidth,
    adjustedHeight,
    resolvedForeground,
    resolvedBackground,
    currentTheme,
    transition,
    introEnabled,
    tableId,
    rafRef,
    renderFnRef,
    scheduleRender,
    hoverHandlerRef,
    hoverLeaveRef,
    onPointerMove,
    onPointerLeave,
  }
}
