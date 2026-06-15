import { useEffect, useRef } from "react"

/** Smooth ease-in-out (quadratic). easeInOut(0) === 0, easeInOut(1) === 1. */
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/**
 * Token-guarded, interruptible requestAnimationFrame tween — the canonical
 * pattern for re-triggerable animations in the docs demos.
 *
 * Runs an eased 0→1 progress over `duration` ms each time `trigger` changes
 * (the initial mount is skipped). A new trigger (or unmount) bumps an internal
 * token so any in-flight `step` bails on its next frame — rapid re-triggering
 * can never stack loops, and a single loop is always live.
 *
 * - `onStart()` — optional, runs once synchronously when a tween begins. Return
 *   a context value to thread into every `onFrame` call, or return `false` to
 *   cancel the tween (e.g. when there's nothing to animate).
 * - `onFrame(easedT, ctx)` — called each frame with eased progress, including a
 *   final call at `easedT === 1`. Drive your state here.
 *
 * @example
 * useRafTween({
 *   trigger: target,
 *   duration: 480,
 *   onStart: () => ({ from: valueRef.current }),
 *   onFrame: (t, { from }) => setValue(t < 1 ? from + (target - from) * t : target),
 * })
 */
export function useRafTween({ trigger, duration = 500, onStart, onFrame, ease = easeInOut }) {
  const tokenRef = useRef(0)
  const mountedRef = useRef(false)
  const startRef = useRef(onStart)
  const frameRef = useRef(onFrame)
  const easeRef = useRef(ease)
  startRef.current = onStart
  frameRef.current = onFrame
  easeRef.current = ease

  useEffect(() => {
    // Skip the initial mount — only actual `trigger` changes animate.
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    const ctx = startRef.current ? startRef.current() : undefined
    if (ctx === false) return
    const token = ++tokenRef.current
    const t0 = performance.now()
    const step = (now) => {
      if (tokenRef.current !== token) return // superseded by a newer tween / unmount
      const p = Math.min(1, (now - t0) / duration)
      frameRef.current(easeRef.current(p), ctx)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    return () => { tokenRef.current++ }
    // Callbacks are read through refs; only trigger/duration drive re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, duration])
}
