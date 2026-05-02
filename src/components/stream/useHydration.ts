/**
 * useHydration — small hook that distinguishes "first client render after
 * SSR" from "subsequent client renders." Returns false on the server pass
 * and during the first client render (so the markup matches what the
 * server emitted, satisfying React's hydration check), then flips to
 * true after the first commit.
 *
 * Stream Frames use this to keep their SVG-fallback branch active during
 * hydration: server output equals first-client-render output, then a
 * post-commit re-render swaps in the canvas + interactivity layer.
 *
 * The hook is the same shape across every frame family — adding hydration
 * support to a new frame is a one-line `useHydration()` call plus
 * extending its existing `isServerEnvironment` branch to also fire when
 * `!hydrated`.
 *
 * Implementation note: we use `useLayoutEffect` on the client and
 * `useEffect` on the server (the standard `useIsomorphicLayoutEffect`
 * pattern). `useLayoutEffect` fires synchronously after commit but
 * before the browser paints — and crucially before React Testing
 * Library's `render()` returns — so the post-hydration re-render
 * happens in the same paint frame as the initial render. No visible
 * flicker between SVG and canvas, and tests that assert canvas state
 * immediately after `render()` keep working without needing
 * `await waitFor(...)`.
 */
"use client"
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import type { MutableRefObject, RefObject } from "react"

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

/**
 * Returns `false` on the server (no effect fires there) and during the
 * first client render after hydration; `true` from the first
 * post-commit re-render onward.
 */
export function useHydration(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useIsomorphicLayoutEffect(() => {
    setHydrated(true)
  }, [])
  return hydrated
}

const noopSubscribe = () => () => {}
const csrSnapshot = () => false
const ssrSnapshot = () => true

/**
 * Returns `true` when this component instance was mounted via SSR
 * hydration (i.e. there was server-rendered HTML to hydrate from), and
 * `false` when it was mounted via pure client-side rendering (no SSR).
 *
 * The trick: `useSyncExternalStore`'s `getServerSnapshot` callback is
 * called *only* during hydration of server-rendered content — never
 * during a fresh CSR mount. Returning different values from the two
 * snapshots lets us read the hydration mode on the very first render,
 * then we capture it into a ref so it survives later renders.
 *
 * Stream Frames use this to decide whether to skip the intro animation
 * on the canvas's first paint: when SSR has already shown the chart in
 * its final state, re-animating from blank when the canvas takes over
 * looks like a regression. CSR mounts keep their intro animation
 * because the SVG branch's output never actually paints (it's
 * overwritten by the canvas branch within the same paint frame, before
 * the browser commits a frame).
 */
export function useWasHydratingFromSSR(): boolean {
  const isHydrating = useSyncExternalStore(noopSubscribe, csrSnapshot, ssrSnapshot)
  // Capture the first-render value. After hydration completes,
  // `isHydrating` flips to `false` (getSnapshot wins), but the ref
  // still holds the first-render value — which is `true` if and only
  // if React called `getServerSnapshot`, i.e. we were hydrating SSR.
  const ref = useRef(isHydrating)
  return ref.current
}

/**
 * Shared post-hydration lifecycle for every Stream Frame.
 *
 * Three things happen on every commit-after-hydration:
 *
 * 1. If we just rehydrated from SSR, cancel the intro animation that
 *    the SVG-branch's `computeScene` installed (the server already
 *    painted the chart in its final state — re-animating from blank
 *    on the canvas takeover is a visual regression).
 * 2. Mark the scene dirty so the canvas-paint pipeline rebuilds.
 * 3. **Paint the canvas synchronously** via `renderFnRef.current()`.
 *
 * Step 3 is the timing-critical bit. The hook fires inside an
 * isomorphic layout effect — `useLayoutEffect` on the client (runs
 * synchronously after commit but before the browser paints),
 * `useEffect` on the server (no-op, since SSR doesn't paint). If we
 * deferred the paint to a `requestAnimationFrame` (the standard
 * `scheduleRender()` route), the rAF callback wouldn't fire until
 * the *next* frame — meaning the browser would paint *frame N* with
 * the canvas in DOM but blank, then *frame N+1* with the canvas
 * actually drawn. Synchronous paint inside the layout effect makes
 * frame N's paint already include the canvas content; no flash.
 *
 * Each frame supplies its own `cleanup` for unmount work that's
 * frame-specific (XY/Ordinal clear the streaming adapter; Geo clears
 * its tile cache; Network has no extra cleanup).
 */
export interface HydrationLifecycleOptions {
  hydrated: boolean
  wasHydratingFromSSR: boolean
  /**
   * Ref to the frame's pipeline store. The store optionally implements
   * `cancelIntroAnimation()`; the hook calls it when the SVG → canvas
   * swap fires after SSR rehydration. (Currently every shipped store
   * implements the method, but the optional shape lets a custom store
   * opt out.)
   */
  storeRef: RefObject<{ cancelIntroAnimation?: () => void } | null>
  /**
   * Mutable dirty flag the renderer reads on its next paint. The hook
   * sets it to true on every commit so the post-hydration paint
   * rebuilds the scene from scratch.
   */
  dirtyRef: MutableRefObject<boolean>
  /**
   * Ref to the frame's render closure (assigned by `useFrame` /
   * the frame body). The hook calls this synchronously to paint
   * within the same frame as the SVG → canvas swap commit, avoiding
   * the one-frame blank-canvas flicker that an rAF-deferred paint
   * would produce.
   */
  renderFnRef: MutableRefObject<() => void>
  /**
   * Optional unmount cleanup. Frame-specific work the hook can't
   * generalize — e.g. clearing the streaming `DataSourceAdapter`
   * (XY/Ordinal) or the geo tile cache.
   */
  cleanup?: () => void
}

export function useHydrationLifecycle(opts: HydrationLifecycleOptions): void {
  const { hydrated, wasHydratingFromSSR, storeRef, dirtyRef, renderFnRef, cleanup } = opts
  useIsomorphicLayoutEffect(() => {
    if (hydrated && wasHydratingFromSSR) {
      storeRef.current?.cancelIntroAnimation?.()
    }
    dirtyRef.current = true
    // Synchronous paint — see the hook's docstring for why an rAF
    // here would produce a one-frame blank-canvas flicker on SSR
    // rehydration. `renderFnRef.current` is the frame body's render
    // closure; it's idempotent and rAF-cancel-safe (resets
    // `rafRef.current = 0` at the start), so calling it directly
    // from a layout effect doesn't conflict with the in-flight
    // scheduling that other paths use.
    renderFnRef.current()
    return cleanup
    // Stable refs (`storeRef`, `dirtyRef`, `renderFnRef`) intentionally
    // omitted from deps — including them would just trip
    // exhaustive-deps without changing behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, wasHydratingFromSSR])
}
