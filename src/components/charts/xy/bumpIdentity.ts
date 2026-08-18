/** Stable type-aware identity for a BumpChart ranking column. */
export function bumpXIdentity(value: unknown): string {
  if (value instanceof Date) return `date:${value.getTime()}`
  return `${typeof value}:${String(value)}`
}
