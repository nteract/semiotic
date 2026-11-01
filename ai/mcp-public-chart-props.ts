import { isSensitiveField } from "./mcp-render-output-limits"
import { isChartDataProp } from "../src/components/charts/shared/chartDataProps"

// Public suggestions describe presentation settings; they are not replayable
// artifacts. Unknown object-valued props are excluded so new prepared readers
// cannot introduce another channel for source rows or derived per-row records.
const presentationBags = new Set([
  "margin",
  "colorScheme",
  "legend",
  "xAxis",
  "yAxis",
  "oAxis",
  "rAxis",
  "frameProps",
  "networkFrameProps",
  "selection",
  "linkedHover"
])
const presentationArrays = new Set([
  "size",
  "fields",
  "colorScheme",
  "xDomain",
  "yDomain",
  "rDomain",
  "oDomain",
  "sizeRange",
  "nodeSizeRange",
  "fontSizeRange",
  "rotate",
  "categoryOrder"
])
const sourceProps = new Set([
  "data",
  "nodes",
  "edges",
  "links",
  "source",
  "rows"
])
const scalar = (value: unknown) =>
  value === null || ["string", "number", "boolean"].includes(typeof value)

export function compactPublicChartProps(
  props: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).flatMap(([key, value]) => {
      if (
        isChartDataProp(key, value) ||
        sourceProps.has(key) ||
        isSensitiveField(key)
      )
        return []
      if (scalar(value)) return [[key, value]]
      if (Array.isArray(value)) {
        return presentationArrays.has(key) && value.every(scalar)
          ? [[key, [...value]]]
          : []
      }
      if (value && typeof value === "object" && presentationBags.has(key)) {
        return [
          [key, compactPublicChartProps(value as Record<string, unknown>)]
        ]
      }
      return []
    })
  )
}
