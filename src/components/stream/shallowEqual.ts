/** Shared pure equality for frame configs and retained custom-layout inputs. */
export function shallowEqualTwoLevel(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) return shallowEqualArray(a, b)
  if (!isPlainObject(a) || !isPlainObject(b)) return false
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  for (const k of ak) {
    // Confirm `b` actually has this own key — `{ a: undefined }` and
    // `{ b: undefined }` share key counts but the values would both
    // read as `undefined` without an explicit hasOwnProperty guard.
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false
    const va = (a as Record<string, unknown>)[k]
    const vb = (b as Record<string, unknown>)[k]
    if (Object.is(va, vb)) continue
    if (Array.isArray(va) && Array.isArray(vb)) {
      if (!shallowEqualArray(va, vb)) return false
      continue
    }
    if (!isPlainObject(va) || !isPlainObject(vb)) return false
    if (!shallowEqualKeys(va, vb)) return false
  }
  return true
}

function shallowEqualKeys(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false
    if (!Object.is(a[k], b[k])) return false
  }
  return true
}

/**
 * Per-index `Object.is` for arrays. Inline array literals (xExtent,
 * yExtent, sizeRange, colorScheme, areaGroups, etc.) shed identity
 * every render the same way inline objects do, and the pipelineConfig
 * memo deps include them, so without array-aware comparison the
 * stabilizer would still let the loop reform on those props. We don't
 * recurse into array elements — the typical shape is arrays of
 * primitives (numbers, strings) where `Object.is` is the right test.
 */
function shallowEqualArray(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false
  }
  return true
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
