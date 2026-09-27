import type { Datum } from "./datumTypes"
import { getColor, DEPTH_PALETTE_COLORS } from "./colorUtils"
import { resolveDefaultFill } from "./hooks"

/** Share hierarchy color encoding while preserving each chart's border style. */
export function createHierarchyStyle(
  baseStyle: Record<string, string | number>,
  colorBy: string | ((d: Datum) => string) | undefined,
  colorByDepth: boolean,
  colorScale: ((value: string) => string) | undefined,
  themeCategorical: string[] | undefined,
  colorScheme: Parameters<typeof resolveDefaultFill>[2]
): (d: Datum) => Record<string, string | number> {
  const categoryIndexMap = new Map<string, number>()
  return (d) => ({
    ...baseStyle,
    fill: colorByDepth
      ? DEPTH_PALETTE_COLORS[(d.depth || 0) % DEPTH_PALETTE_COLORS.length]
      : colorBy
        ? getColor(d.data || d, colorBy, colorScale)
        : resolveDefaultFill(
            undefined,
            themeCategorical,
            colorScheme,
            undefined,
            categoryIndexMap
          )
  })
}
