import type { Accessor } from "./types"
import type { LegendItem } from "../../types/legendTypes"
import { STREAMING_PALETTE } from "./colorUtils"

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
  data: Array<Record<string, any>>
  colorBy: Accessor<string>
  colorScale?: ((v: string) => string)
  getColor: (d: Record<string, any>, accessor: Accessor<string>, scale?: ((v: string) => string)) => string
  strokeColor?: string
  strokeWidth?: number
  categories?: string[]
}) {
  // Get unique category values — prefer explicit categories (from push API tracking)
  const uniqueValues = categories && categories.length > 0
    ? categories
    : Array.from(
      new Set(
        data.map((d) => {
          if (typeof colorBy === "function") {
            return colorBy(d)
          }
          return d[colorBy as string]
        })
      )
    )

  // Create items array for the legend
  const items = uniqueValues.map((value, i) => {
    const sampleData =
      typeof colorBy === "function"
        ? data.find((d) => colorBy(d) === value)
        : data.find((d) => d[colorBy as string] === value)

    const color = sampleData
      ? getColor(sampleData, colorBy, colorScale)
      : colorScale
      ? colorScale(value)
      : STREAMING_PALETTE[i % STREAMING_PALETTE.length]

    return {
      label: String(value),
      color
    }
  })

  return {
    legendGroups: [
      {
        styleFn: (d: LegendItem) => {
          const c = d.color || "#333"
          const style: Record<string, string | number> = { fill: c, stroke: c }
          if (strokeColor !== undefined) {
            style.stroke = strokeColor
          }
          if (strokeWidth !== undefined) {
            style.strokeWidth = strokeWidth
          }
          return style
        },
        type: "fill" as const,
        items,
        label: "" // Required by LegendGroup interface
      }
    ]
  }
}
