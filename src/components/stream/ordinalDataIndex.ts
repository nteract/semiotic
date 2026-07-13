import type { Datum } from "../charts/shared/datumTypes"

type CategoryAccessor = string | ((datum: Datum) => string) | undefined

/** Build the source-data category index used by aggregate pulse marks. */
export function buildOrdinalCategoryIndex(
  data: readonly Datum[],
  categoryAccessor: CategoryAccessor
): Map<string, number[]> {
  const isFunction = typeof categoryAccessor === "function"
  const key = isFunction ? null : (categoryAccessor || "category")
  const index = new Map<string, number[]>()

  for (let position = 0; position < data.length; position++) {
    const datum = data[position]
    const category = isFunction
      ? categoryAccessor(datum)
      : datum[key as string]
    const positions = index.get(category)
    if (positions) {
      positions.push(position)
    } else {
      index.set(category, [position])
    }
  }
  return index
}
