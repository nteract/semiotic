/** FNV-1a over UTF-16 code units, matching the library's existing string IDs.
 * Pass a previous hash to continue hashing without allocating a joined string.
 * This is a deterministic layout/cache helper, not a cryptographic hash.
 */
export function fnv1a32(value: string, seed = 0x811c9dc5): number {
  let hash = seed
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Deterministic unit-interval value for layout jitter and tie-breaking. */
export function hashUnit(value: string): number {
  return fnv1a32(value) / 4294967295
}
