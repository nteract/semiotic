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
