/**
 * Identity-preserving filter for sparse arrays of objects.
 *
 * Public chart props (`data`, `points`, `nodes`, `edges`, `flows`,
 * `series`, `areas`) get fed to ingestion, color extraction, scene
 * builders, and accessor lookups that read `d[field]` without
 * null-checking individual entries. CSV-parsed and lookup-failed
 * pipelines commonly emit `null` / `undefined` interlopers; without
 * upfront filtering, the HOC crashes the moment a hook iterates the
 * array.
 *
 * Returns the original array reference when nothing needs to be
 * dropped. Consumers doing identity checks against the input prop —
 * notably the cache keys inside `PipelineStore` and the `useMemo`
 * deps inside `useChartSetup` / `useColorScale` — keep their fast
 * paths in the common case where the input is already clean.
 */
/**
 * Singleton empty array. Use as a stable default when a caller needs
 * to satisfy a non-optional `T[]` parameter without allocating a fresh
 * `[]` on every render — which would invalidate any downstream
 * `useMemo` keyed on the array reference (e.g. `useChartSetup`'s
 * sparse-array filter, color-scale memos). Frozen so accidental
 * mutation throws in strict mode rather than corrupting later reads.
 */
export const EMPTY_ARRAY: readonly unknown[] = Object.freeze([])

export function filterSparseArray<T extends object>(
  input: readonly (T | null | undefined)[] | undefined | null
): T[] {
  if (!input) return EMPTY_ARRAY as T[]
  for (const value of input)
    if (value == null || typeof value !== "object")
      return input.filter((row): row is T => row != null && typeof row === "object")
  return input as T[]
}
