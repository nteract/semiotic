/**
 * useStableShallow — return a stable reference for a value as long as it
 * remains shallow-equal to the previous render's value.
 *
 * Why: pipeline configs in the Stream Frames are large objects whose
 * fields are typically primitives plus a few nested config sub-objects
 * (`pulse`, `staleness`, `transition`, `particleStyle`, etc.). When a
 * consumer constructs those sub-objects inline on the JSX —
 * `frameProps={{ pulse: { duration: 600, ... } }}` is the canonical
 * shape — every parent render produces a new top-level config object
 * even though no value actually changed. Effects that list the config
 * in their dep array then re-fire every render, dirty the scene, and
 * schedule a paint; the rAF render loop fires `setAnnotationFrame`,
 * which re-renders, which produces a fresh inline ref, which re-fires
 * the effect. React 19 catches this as "Maximum update depth exceeded"
 * after roughly fifty cycles.
 *
 * The hook performs a one-level-deep shallow compare: top-level keys
 * are compared with `===`, and any object-typed value is compared by
 * its own keys with `===`. That's enough to absorb the inline-config
 * pattern (objects of primitives) without paying for full deep
 * equality. Function-valued props are compared by identity — consumers
 * that pass new function refs every render are still expected to
 * memoize them, since stable-function semantics require it for hover
 * callbacks, tooltip renderers, and similar.
 */
import { useRef } from "react"
import { shallowEqualTwoLevel } from "./shallowEqual"

export function useStableShallow<T>(value: T): T {
  const ref = useRef<T>(value)
  if (!shallowEqualTwoLevel(ref.current, value)) {
    ref.current = value
  }
  return ref.current
}
