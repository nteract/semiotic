import type { Accessor } from "./types"

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
  strokeWidth
}: {
  data: any[]
  colorBy: Accessor<string>
  colorScale?: any
  getColor: (d: any, accessor: Accessor<string>, scale?: any) => string
  strokeColor?: string
  strokeWidth?: number
}) {
  // Get unique category values
  const uniqueValues = Array.from(
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
  const items = uniqueValues.map((value) => {
    const sampleData =
      typeof colorBy === "function"
        ? data.find((d) => colorBy(d) === value)
        : data.find((d) => d[colorBy as string] === value)

    const color = sampleData
      ? getColor(sampleData, colorBy, colorScale)
      : colorScale
      ? colorScale(value)
      : "#000000"

    return {
      label: String(value),
      color
    }
  })

  return {
    legendGroups: [
      {
        styleFn: (d: any) => {
          const style: any = { fill: d.color, stroke: d.color }
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
