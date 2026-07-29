import type { Datum } from "../charts/shared/datumTypes"

// ── Accessor resolution ────────────────────────────────────────────────

/**
 * Compare two accessor specs for equivalence, using **identity** semantics.
 * - String accessors: compared by value (`"value" === "value"`).
 * - Function accessors: compared by reference. Two distinct function objects are
 *   NOT equivalent, even when their source text matches.
 * - Mismatched types or `undefined` vs defined: not equivalent.
 *
 * **Why identity, not source text.** A previous implementation compared
 * `a.toString() === b.toString()` to treat re-created inline arrows
 * (`d => d.value`) as equivalent across renders. That was a correctness bug:
 * `.toString()` compares source text, not captured variables, so two closures
 * with identical source but different bindings — `makeAccessor(1)` vs
 * `makeAccessor(10)` — compared equal, and the store retained a stale
 * domain/scene against a genuinely different accessor. Identity comparison also
 * matches how the frames already decide a config changed
 * (`useStableShallow` compares function props by identity), so the store no
 * longer second-guesses a change the frame already detected.
 *
 * **Consumer contract.** Passing a *new* function accessor (a fresh inline
 * arrow every render) now triggers a rebuild, because the library can no longer
 * prove the new closure is semantically identical. Use a string accessor
 * (always referentially stable) or memoize the function with `useCallback`. For
 * the rare case where a stable function's captured semantics change *without*
 * its identity changing, bump the pipeline config's `accessorRevision` to force
 * re-derivation.
 */
export function accessorsEquivalent<TDatum, TResult>(
  a: string | ((datum: TDatum, index?: number) => TResult) | undefined,
  b: string | ((datum: TDatum, index?: number) => TResult) | undefined
): boolean {
  // Value equality for strings, reference equality for functions, and correct
  // handling of `undefined`/type-mismatch all collapse to a single `===`.
  return a === b
}

export type CoercibleNumber = number | Date | string

export function resolveAccessor<T extends Record<string, unknown>>(
  accessor: string | ((d: T) => CoercibleNumber) | undefined,
  fallback: string
): (d: T) => number {
  if (typeof accessor === "function") return (d: T) => +accessor(d)
  const key = accessor || fallback
  return (d: T) => +(d[key] as number)
}

export function resolveRawAccessor<T extends Record<string, unknown>, TResult>(
  accessor: string | ((d: T) => TResult) | undefined,
  fallback: string
): (d: T) => TResult {
  if (typeof accessor === "function") return accessor
  const key = accessor || fallback
  return (d: T) => d[key] as TResult
}

export function resolveStringAccessor<T extends Record<string, unknown>>(
  accessor: string | ((d: T) => string) | undefined,
  fallback?: string
): ((d: T) => string) | undefined {
  if (typeof accessor === "function") return accessor
  if (accessor) return (d: T) => String(d[accessor])
  if (fallback) return (d: T) => String(d[fallback])
  return undefined
}

/**
 * Resolve a `nodeLabel` accessor (string key or function) into a label
 * function, or `null` when unset — the network layout plugins' shared
 * convention for "no label configured" (as opposed to `resolveStringAccessor`'s
 * `undefined`). A string accessor falls back to `d.id` when the field is
 * missing/empty. Shared by the chord/force/sankey layout plugins; hierarchy
 * layouts use their own `resolveLabelFn` in `layouts/hierarchyUtils.ts`
 * instead, since a hierarchy scene node nests the original datum under
 * `.data` and must unwrap it before calling a user accessor.
 */
export function resolveLabelFn(
  nodeLabel: string | ((d: Datum) => string) | undefined
): ((d: Datum) => string) | null {
  if (!nodeLabel) return null
  if (typeof nodeLabel === "function") return nodeLabel
  return (d: Datum) => d[nodeLabel] || d.id
}

/**
 * Resolve a d3-force-style edge endpoint (`source`/`target`) to its node id.
 * Before a force/sankey/chord simulation resolves string ids into node
 * object references, an edge endpoint is `string | { id: string }`; this
 * reads the id either way. Shared by the chord/force/sankey layout plugins.
 */
export function resolveNodeRefId(ref: string | { id: string }): string {
  return typeof ref === "string" ? ref : ref.id
}
