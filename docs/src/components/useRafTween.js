import { useEffect, useRef } from "react"

/** Smooth ease-in-out (quadratic). easeInOut(0) === 0, easeInOut(1) === 1. */
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/**
 * Interruptible requestAnimationFrame tween for the docs demos.
 *
 * Runs an eased 0→1 progress over `duration` ms each time `trigger` changes.
 * Initial mount and Strict Mode's effect replay are skipped. Each effect owns its queued
 * frame; replacement and unmount cancel it and retire any callback in progress.
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
  const previousTrigger = useRef(trigger)
  const previousDuration = useRef(duration)
  const startRef = useRef(onStart)
  const frameRef = useRef(onFrame)
  const easeRef = useRef(ease)
  startRef.current = onStart
  frameRef.current = onFrame
  easeRef.current = ease

  useEffect(() => {
    // Skip the initial mount — only actual `trigger` changes animate.
    if (Object.is(previousTrigger.current, trigger) && previousDuration.current === duration) return
    previousTrigger.current = trigger
    previousDuration.current = duration
    const ctx = startRef.current ? startRef.current() : undefined
    if (ctx === false) return
    let active = true
    let frame = null
    const t0 = performance.now()
    const step = (now) => {
      frame = null
      if (!active) return
      const p = Math.min(1, (now - t0) / duration)
      frameRef.current(easeRef.current(p), ctx)
      if (active && p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => {
      active = false
      if (frame !== null) cancelAnimationFrame(frame)
    }
    // Callbacks are read through refs; only trigger/duration drive re-runs.

  }, [trigger, duration])
}
