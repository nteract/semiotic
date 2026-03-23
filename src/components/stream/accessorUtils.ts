// ── Accessor resolution ────────────────────────────────────────────────

/**
 * Compare two accessor specs for equivalence.
 * - Same reference: always equivalent (`===`)
 * - String accessors: exact string match
 * - Function accessors: `.toString()` comparison (catches inline arrow functions
 *   like `d => d.value` that are recreated on every render but have identical source)
 * - Mismatched types or undefined vs defined: not equivalent
 *
 * **Known limitation**: `.toString()` compares source text, not closure bindings.
 * Two functions with identical source but different captured variables will appear
 * equivalent. For closures that depend on changing values, use `useCallback` with
 * the variable in the dependency array so the reference changes when behavior changes.
 */
export function accessorsEquivalent(
  a: string | ((...args: any[]) => any) | undefined,
  b: string | ((...args: any[]) => any) | undefined
): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (typeof a === "function" && typeof b === "function") {
    return a.toString() === b.toString()
  }
  return false
}

export function resolveAccessor<T>(
  accessor: string | ((d: T) => number) | undefined,
  fallback: string
): (d: T) => number {
  if (typeof accessor === "function") return (d: T) => +accessor(d)
  const key = accessor || fallback
  return (d: T) => +(d as any)[key]
}

export function resolveRawAccessor<T>(
  accessor: string | ((d: T) => any) | undefined,
  fallback: string
): (d: T) => any {
  if (typeof accessor === "function") return accessor
  const key = accessor || fallback
  return (d: T) => (d as any)[key]
}

export function resolveStringAccessor<T>(
  accessor: string | ((d: T) => string) | undefined,
  fallback?: string
): ((d: T) => string) | undefined {
  if (typeof accessor === "function") return accessor
  if (accessor) return (d: T) => String((d as any)[accessor])
  if (fallback) return (d: T) => String((d as any)[fallback])
  return undefined
}
