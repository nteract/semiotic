// ── Accessor resolution ────────────────────────────────────────────────

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
