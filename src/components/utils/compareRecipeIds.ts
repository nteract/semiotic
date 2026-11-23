/** Stable UTF-16 ordering, independent of host locale and ICU version. */
export function compareRecipeIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
