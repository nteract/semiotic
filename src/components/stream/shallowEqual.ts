/** Frame configs keep array elements reference-based; full geometry configs opt into deep comparison. */
export { equalConfig as shallowEqualTwoLevel }

/** Compare two record levels by default; Infinity also compares nested array values. */
export function equalConfig(a: unknown, b: unknown, depth = 2): boolean {
  if (Object.is(a, b)) return true
  if (depth === 0) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!equalConfig(a[i], b[i], depth === Infinity ? Infinity : 0))
        return false
    }
    return true
  }
  if (!isPlainObject(a) || !isPlainObject(b)) return false
  // Inline frame props pass through this comparison on every render. Enumerate
  // in place instead of allocating key arrays for each nested config record.
  let keys = 0
  for (const k in a) {
    if (!Object.prototype.propertyIsEnumerable.call(a, k)) continue
    if (!Object.prototype.propertyIsEnumerable.call(b, k)) return false
    if (!equalConfig(a[k], b[k], depth - 1)) return false
    keys++
  }
  for (const k in b) {
    if (Object.prototype.propertyIsEnumerable.call(b, k)) keys--
  }
  return keys === 0
}

/** Copy the acyclic plain-data configs used by themes and perspectives, keeping callbacks by identity. */
export function snapshotConfig<T>(value: T): T
export function snapshotConfig(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(snapshotConfig)
  if (value !== null && typeof value === "object") {
    const copy: Record<string, unknown> = { ...value }
    for (const key of Object.keys(copy)) copy[key] = snapshotConfig(copy[key])
    return copy
  }
  return value
}

/**
 * Strict plain-object check. We only want to recurse into bag-style
 * objects (`{ pulse: { duration: 600 } }`) — not class instances like
 * `Set`/`Map`/`Date`/etc. that would expose zero own enumerable keys
 * and falsely compare equal across distinct instances. The most
 * reliable signal is the prototype: literal objects and
 * `Object.create(null)` are the only legitimate "config bag" shapes.
 *
 * Concrete consequence: StreamXYFrame's `pipelineConfig.areaGroups` is
 * `new Set(areaGroups)`. Without this guard, two distinct Sets would
 * be compared as `Object.keys(set).length === 0` on both sides and
 * incorrectly stabilize, suppressing the `updateConfig` effect and
 * leaving the area-group filter stale.
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== "object") return false
  if (Array.isArray(v)) return false
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}
