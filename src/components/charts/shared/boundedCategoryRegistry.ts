/**
 * Bound retained category strings for long-running charts. Categories below
 * this limit keep first-seen sequential palette assignment. Higher-cardinality
 * categories use a deterministic hash and are not retained.
 */
export const MAX_RETAINED_CATEGORY_ASSIGNMENTS = 4096

function hashCategory(category: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < category.length; index++) {
    hash ^= category.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Resolve a stable palette index while keeping the discovery registry bounded. */
export function resolveBoundedCategoryIndex(
  registry: Map<string, number>,
  category: string
): number {
  const existing = registry.get(category)
  if (existing !== undefined) return existing
  if (registry.size >= MAX_RETAINED_CATEGORY_ASSIGNMENTS) {
    return hashCategory(category)
  }
  const index = registry.size
  registry.set(category, index)
  return index
}
