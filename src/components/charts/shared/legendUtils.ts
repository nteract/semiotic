import type { Accessor } from "./types"
import type { LegendItem } from "../../types/legendTypes"
import { STREAMING_PALETTE } from "./colorUtils"
import type { Datum } from "./datumTypes"

export { distinctCategories } from "./colorUtils"

// Bind only paint overrides below. A nested style closure shares createLegend's
// context with its item callback and can retain the entire source dataset.
function legendItemStyle(
  strokeColor: string | undefined,
  strokeWidth: number | undefined,
  item: LegendItem
): Record<string, string | number> {
  const color = item.color || "#333"
  const style: Record<string, string | number> = { fill: color, stroke: color }
  if (strokeColor !== undefined) style.stroke = strokeColor
  if (strokeWidth !== undefined) style.strokeWidth = strokeWidth
  return style
}

/**
 * Create a legend configuration for HOC components
 *
 * @param data - Array of data points
 * @param colorBy - Field or function to determine color categories
 * @param colorScale - Optional d3 color scale function
 * @param getColor - Function to get color for a data point
 * @param strokeColor - Optional stroke color for legend items
 * @param strokeWidth - Optional stroke width for legend items
 * @returns Legend configuration object for Semiotic frames
 */
export function createLegend({
  data,
  colorBy,
  colorScale,
  getColor,
  strokeColor,
  strokeWidth,
  categories
}: {
  data: Array<Datum>
  colorBy: Accessor<string>
  colorScale?: (v: string) => string
  getColor: (
    d: Datum,
    accessor: Accessor<string>,
    scale?: (v: string) => string
  ) => string
  strokeColor?: string
  strokeWidth?: number
  categories?: string[]
}) {
  const firstIndex = new Map<unknown, number>()
  // Explicit subsets retain only requested keys. -1 distinguishes a missing
  // sample from a first row that is itself nullish for a function accessor.
  if (categories) {
    for (const value of categories) firstIndex.set(value, -1)
  }
  // Implicit domains visit every row; explicit domains finish once all keys
  // have samples. Grouped input no longer restarts a search for each category.
  let remaining = categories === undefined ? data.length : firstIndex.size
  for (let index = 0; index < data.length && remaining > 0; index++) {
    const datum = data[index]
    const value =
      typeof colorBy === "function" ? colorBy(datum) : datum[colorBy]
    const previousIndex = firstIndex.get(value)
    if (
      previousIndex === -1 ||
      (categories === undefined && previousIndex === undefined)
    ) {
      firstIndex.set(value, index)
      if (categories !== undefined) remaining--
    }
  }
  const uniqueValues = categories ?? (Array.from(firstIndex.keys()) as string[])
  const items = uniqueValues.map((value, i) => {
    const sampleIndex = firstIndex.get(value) ?? -1
    // Map matches NaN keys, but the original strict-equality search did not.
    const sampleData =
      sampleIndex >= 0 && !Number.isNaN(value) ? data[sampleIndex] : undefined

    const color = sampleData
      ? getColor(sampleData, colorBy, colorScale)
      : colorScale
        ? colorScale(value)
        : STREAMING_PALETTE[i % STREAMING_PALETTE.length]

    return {
      label: String(value),
      color,
      __semioticCategory: true
    }
  })

  return {
    legendGroups: [
      {
        styleFn: legendItemStyle.bind(null, strokeColor, strokeWidth),
        type: "fill" as const,
        items,
        label: "" // Required by LegendGroup interface
      }
    ]
  }
}
