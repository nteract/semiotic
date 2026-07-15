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
 *    (`rafRef`, `renderFnRef`, `hoverHandlerRef`, `scheduleRender`, `cancelRender`,
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
import { FrameRuntime, type FrameClock, type FrameRandom } from "./FrameRuntime"
import { reserveFrameChromeMargin } from "./titleLayout"

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

/**
 * The small scheduling surface `useFrame` needs. Keeping this separate from
 * the browser global gives hook tests a deterministic, handle-agnostic seam
 * without coupling the frame lifecycle to a broader scheduler abstraction.
 */
export interface FrameScheduler {
  requestAnimationFrame(callback: FrameRequestCallback): number
  cancelAnimationFrame(handle: number): void
}

const browserFrameScheduler: FrameScheduler = {
  // `requestAnimationFrame` is a Window API. Prefer `window` when it exists
  // rather than retaining a different test/global host at module evaluation
  // time; this keeps the browser default and injected schedulers equivalent.
  requestAnimationFrame: callback => (
    typeof window === "undefined" ? globalThis : window
  ).requestAnimationFrame(callback),
  cancelAnimationFrame: handle => (
    typeof window === "undefined" ? globalThis : window
  ).cancelAnimationFrame(handle),
}

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
  /**
   * Visual title rendered by the frame's SVG chrome. A title reserves a small
   * top strip before plot geometry is calculated so compact caller margins do
   * not place marks directly beneath the title.
   */
  title?: ReactNode
  /** Optional legend; a top-positioned legend reserves its first row. */
  legend?: unknown
  /** Legend placement used for shared top-chrome clearance. */
  legendPosition?: "right" | "left" | "top" | "bottom"
  /** Frame's `foregroundGraphics` prop. */
  foregroundGraphics?: FrameGraphicsProp
  /** Frame's `backgroundGraphics` prop. */
  backgroundGraphics?: FrameGraphicsProp
  /** Frame's `animate` prop. */
  animate?: AnimateProp
  /** Frame's `transition` prop (legacy / explicit form). */
  transitionProp?: TransitionConfig
  /**
   * Optional rAF seam for deterministic frame tests or an embedding runtime.
   * It owns both render scheduling and pointer-move coalescing. Omit it to
   * use the browser's `requestAnimationFrame` / `cancelAnimationFrame`.
   */
  frameScheduler?: FrameScheduler
  /** Monotonic wall-clock seam used by the frame runtime. */
  clock?: FrameClock
  /** Injectable random seam. A serializable `seed` takes effect when omitted. */
  random?: FrameRandom
  /** Serializable deterministic random seed for frame-local stochastic work. */
  seed?: number
  /** Freeze logical frame time while paused. Opt-in so existing frame families retain their policy. */
  paused?: boolean
  /** Freeze logical frame time while the document is hidden. Opt-in per frame family. */
  suspendWhenHidden?: boolean
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
  /** Shared logical clock, pause/visibility policy, and RNG seam for this host. */
  frameRuntime: FrameRuntime

  // ── rAF-coalesced render scheduling ──────────────────────────────────
  // The frame body assigns its render closure to `renderFnRef.current`;
  // calling `scheduleRender()` queues a single rAF that invokes it. A
  // second `scheduleRender()` while a rAF is already pending is a no-op
  // (coalescing). The scheduler releases the token immediately before an
  // rAF-driven render runs. Frame render closures also reset
  // `rafRef.current = null` at the start because hydration can invoke them
  // synchronously, outside this scheduler callback. That lets either path
  // call `scheduleRender()` itself — e.g. to continue an animation — without
  // being silently coalesced into a frame that's already running.
  //
  // The hook installs an unmount effect that cancels any pending rAF —
  // frames no longer need their own cancel-on-unmount for this ref
  // (other unmount cleanup like move-coalesce or adapter teardown stays
  // frame-local).

  /** Token of the pending rAF, or `null` if none. `0` is a valid token. */
  rafRef: React.MutableRefObject<number | null>
  /** Frame assigns its render closure here. */
  renderFnRef: React.MutableRefObject<() => void>
  /** Queue a render on the next animation frame. Coalesces. */
  scheduleRender: () => void
  /** Cancel a queued render, if any. Direct/hydration paints use this before
   * taking over so a stale rAF cannot race a synchronous frame. */
  cancelRender: () => void

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
  const hasTitle = Boolean(input.title)
  const hasTopLegend = Boolean(input.legend) && input.legendPosition === "top"
  const margin = useMemo<FrameMargin>(
    () => reserveFrameChromeMargin(
      { ...input.marginDefault, ...input.userMargin },
      hasTitle,
      hasTopLegend,
    ),
    [input.marginDefault, input.userMargin, hasTitle, hasTopLegend],
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

  // ── Logical time, visibility, and seeded randomness ──────────────────
  // Construct once so the logical clock and seeded generator retain state
  // across React renders. `configure` only replaces sources when their
  // identity/seed changes; it never replays elapsed hidden/paused wall time.
  const frameRuntimeRef = useRef<FrameRuntime | null>(null)
  if (!frameRuntimeRef.current) {
    const initiallyVisible = input.suspendWhenHidden
      ? typeof document === "undefined" || !document.hidden
      : true
    frameRuntimeRef.current = new FrameRuntime({
      clock: input.clock,
      random: input.random,
      seed: input.seed,
      paused: input.paused,
      visible: initiallyVisible,
    })
  }
  const frameRuntime = frameRuntimeRef.current
  frameRuntime.configure({ clock: input.clock, random: input.random, seed: input.seed })

  // ── rAF-coalesced render scheduling ──────────────────────────────────
  // Owned here so any future tweak to the coalescing semantics (deferred
  // commits, scheduler integration, etc.) is one source of truth.
  // `0` is a valid requestAnimationFrame token, so pending state must use a
  // distinct sentinel. This also makes coalescing independent of a test
  // scheduler's choice of handle values.
  const rafRef = useRef<number | null>(null)
  const frameSchedulerRef = useRef<FrameScheduler>(input.frameScheduler ?? browserFrameScheduler)
  frameSchedulerRef.current = input.frameScheduler ?? browserFrameScheduler
  const pendingRafSchedulerRef = useRef<FrameScheduler | null>(null)
  const synchronouslyRenderingRef = useRef(false)
  const renderFnRef = useRef<() => void>(() => {})
  const scheduleRender = useCallback(() => {
    // A deterministic scheduler is allowed to invoke its callback before
    // `requestAnimationFrame` returns. A frame that requests continuation
    // during that synchronous render must not recurse indefinitely; browser
    // callbacks remain free to queue their normal next frame.
    if (rafRef.current !== null || synchronouslyRenderingRef.current) return
    const scheduler = frameSchedulerRef.current
    // Browsers always invoke rAF asynchronously, but a useful deterministic
    // test scheduler may flush synchronously. Do not write its already-fired
    // handle back into `rafRef` after the callback has cleared it.
    let firedSynchronously = false
    let requestReturned = false
    const handle = scheduler.requestAnimationFrame(() => {
      firedSynchronously = true
      const synchronous = !requestReturned
      if (synchronous) synchronouslyRenderingRef.current = true
      rafRef.current = null
      pendingRafSchedulerRef.current = null
      try {
        renderFnRef.current()
      } finally {
        if (synchronous) synchronouslyRenderingRef.current = false
      }
    })
    requestReturned = true
    if (!firedSynchronously) {
      rafRef.current = handle
      pendingRafSchedulerRef.current = scheduler
    }
  }, [])
  const cancelRender = useCallback(() => {
    if (rafRef.current === null) return
    const scheduler = pendingRafSchedulerRef.current ?? frameSchedulerRef.current
    scheduler.cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    pendingRafSchedulerRef.current = null
  }, [])

  // Pausing records elapsed active time before the freeze. The layout effect
  // prevents a queued paint from advancing an animation after a committed
  // paused prop change.
  useIsomorphicLayoutEffect(() => {
    frameRuntime.setPaused(input.paused === true)
  }, [frameRuntime, input.paused])

  useEffect(() => {
    if (!input.suspendWhenHidden || typeof document === "undefined") {
      frameRuntime.setVisible(true)
      return
    }
    const updateVisibility = () => frameRuntime.setVisible(!document.hidden)
    updateVisibility()
    document.addEventListener("visibilitychange", updateVisibility)
    return () => document.removeEventListener("visibilitychange", updateVisibility)
  }, [frameRuntime, input.suspendWhenHidden])

  // Cancel any pending rAF on unmount. Frames may still install their own
  // unmount cleanup for things the hook doesn't own (pointermove
  // coalescing, DataSourceAdapter teardown), but the rafRef cleanup is
  // now centralized.
  useEffect(() => {
    return () => {
      cancelRender()
    }
  }, [cancelRender])

  // ── Pointer event coalescing (hover handler) ──────────────────────────
  const hoverHandlerRef = useRef<(coords: HoverPointerCoords) => void>(() => {})
  const hoverLeaveRef = useRef<() => void>(() => {})
  const pendingMoveCoordsRef = useRef<HoverPointerCoords | null>(null)
  const moveRafRef = useRef<number | null>(null)
  const pendingMoveSchedulerRef = useRef<FrameScheduler | null>(null)
  const flushPendingMove = useCallback(() => {
    const coords = pendingMoveCoordsRef.current
    pendingMoveCoordsRef.current = null
    if (coords) hoverHandlerRef.current(coords)
  }, [])
  const onPointerMove = useCallback((e: { clientX: number; clientY: number; pointerType?: string }) => {
    pendingMoveCoordsRef.current = { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType }
    if (moveRafRef.current === null) {
      const scheduler = frameSchedulerRef.current
      let firedSynchronously = false
      const handle = scheduler.requestAnimationFrame(() => {
        firedSynchronously = true
        moveRafRef.current = null
        pendingMoveSchedulerRef.current = null
        flushPendingMove()
      })
      if (!firedSynchronously) {
        moveRafRef.current = handle
        pendingMoveSchedulerRef.current = scheduler
      }
    }
  }, [flushPendingMove])
  const onPointerLeave = useCallback(() => {
    pendingMoveCoordsRef.current = null
    if (moveRafRef.current !== null) {
      const scheduler = pendingMoveSchedulerRef.current ?? frameSchedulerRef.current
      scheduler.cancelAnimationFrame(moveRafRef.current)
      moveRafRef.current = null
      pendingMoveSchedulerRef.current = null
    }
    hoverLeaveRef.current()
  }, [])

  // Cleanup pending hover rAF on unmount alongside the render-rAF cancel.
  useEffect(() => {
    return () => {
      pendingMoveCoordsRef.current = null
      if (moveRafRef.current !== null) {
        const scheduler = pendingMoveSchedulerRef.current ?? frameSchedulerRef.current
        scheduler.cancelAnimationFrame(moveRafRef.current)
        moveRafRef.current = null
        pendingMoveSchedulerRef.current = null
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
    frameRuntime,
    rafRef,
    renderFnRef,
    scheduleRender,
    cancelRender,
    hoverHandlerRef,
    hoverLeaveRef,
    onPointerMove,
    onPointerLeave,
  }
}
