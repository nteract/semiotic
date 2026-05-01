import type { Datum } from "../charts/shared/datumTypes"

/**
 * Normalize a string-or-function accessor into a function. Recipes
 * consistently accept either form, so this collapses the type-check at
 * the boundary and lets the layout body call a single function.
 */
export function resolveAccessor<T = unknown>(a: string | ((d: Datum) => T)): (d: Datum) => T {
  if (typeof a === "function") return a
  return (d: Datum) => d[a] as T
}

/**
 * Build a datum object whose own-properties are safe to set from
 * user-supplied accessor names. `Object.create(null)` produces a
 * prototype-less object so adversarial keys like `__proto__`,
 * `constructor`, or `prototype` become normal own-properties instead of
 * invoking the prototype setter on a normal object literal (which
 * silently drops the assignment).
 *
 * The builder takes a callback that receives a `set(key, value)` writer
 * bound to the null-prototype object. This API forces every assignment
 * through the safe target — passing a plain `Record<string, unknown>`
 * instead would be unsafe, since constructing that intermediate via an
 * object literal lets `__proto__` hit the setter before we ever reach
 * the helper.
 *
 * Recipes funnel every datum-emit through this helper so the
 * prototype-pollution invariant is enforced in one place rather than
 * scattered across each recipe's inner loops.
 */
export function createSafeDatum(populate: (set: (key: string, value: unknown) => void) => void): Datum {
  const out = Object.create(null) as Datum
  populate((key, value) => { out[key] = value })
  return out
}
