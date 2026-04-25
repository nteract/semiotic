import type { Datum } from "../charts/shared/datumTypes"

export type CategoryDomainAccessor<T = Datum> = string | ((d: T) => unknown)

export function extractCategoryDomain<T extends Datum>(
  data: T[],
  accessor: CategoryDomainAccessor<T> | undefined
): string[] {
  if (!accessor) return []
  const seen = new Set<string>()
  const categories: string[] = []

  for (const d of data) {
    if (!d || typeof d !== "object") continue
    const raw = typeof accessor === "function" ? accessor(d) : d[accessor]
    if (raw == null) continue
    const category = String(raw)
    if (seen.has(category)) continue
    seen.add(category)
    categories.push(category)
  }

  return categories
}

export function sameCategoryDomain(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}
