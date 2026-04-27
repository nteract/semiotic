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
export function filterSparseArray<T>(input: readonly T[] | undefined | null): T[] {
  if (!input) return []
  let hasInvalid = false
  for (let i = 0; i < input.length; i++) {
    const v = input[i]
    if (v == null || typeof v !== "object") {
      hasInvalid = true
      break
    }
  }
  if (!hasInvalid) return input as T[]
  const out: T[] = []
  for (const v of input) {
    if (v != null && typeof v === "object") out.push(v)
  }
  return out
}
