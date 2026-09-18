import type { Datum } from "../charts/shared/datumTypes"
import { extractCategoryDomain } from "../stream/categoryDomain"
import {
  resolveExplicitColor,
  STREAMING_PALETTE
} from "../charts/shared/colorUtils"
import { resolveTheme } from "./themeResolver"

/** Mirror the controlled-data path of useRealtimeCategoryColors. */
export function realtimeCategoryColors(
  rows: Datum[],
  common: Datum,
  rest: Datum,
  order: "discovery" | "explicit-then-alpha"
): Record<string, string> | undefined {
  if (!rest.categoryAccessor) return undefined
  const categories = extractCategoryDomain(rows, rest.categoryAccessor)
  const explicit = rest.colors as Record<string, string> | undefined
  const ordered =
    order === "explicit-then-alpha"
      ? [
          ...Object.keys(explicit ?? {}).filter((key) =>
            categories.includes(key)
          ),
          ...categories
            .filter((key) => !Object.hasOwn(explicit ?? {}, key))
            .sort()
        ]
      : categories
  const themePalette = resolveTheme(common.theme).colors.categorical
  const palette = themePalette?.length ? themePalette : STREAMING_PALETTE
  return Object.fromEntries(
    ordered.map((category, index) => [
      category,
      (explicit && resolveExplicitColor(explicit, category)) ||
        rest.fill ||
        palette[index % palette.length]
    ])
  )
}
