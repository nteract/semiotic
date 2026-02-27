import { useMemo } from "react"
import { createColorScale } from "./colorUtils"
import type { Accessor } from "./types"

/**
 * Default fill color used when no colorBy is specified
 */
export const DEFAULT_COLOR = "#007bff"

/**
 * Hook to create a color scale from data and colorBy configuration.
 * Returns undefined when colorBy is absent or is a function accessor.
 */
export function useColorScale(
  data: any[],
  colorBy: Accessor<string> | undefined,
  colorScheme: string | string[] = "category10"
): ((v: any) => string) | undefined {
  return useMemo(() => {
    if (!colorBy || typeof colorBy === "function") return undefined
    return createColorScale(data, colorBy as string, colorScheme)
  }, [data, colorBy, colorScheme])
}

/**
 * Hook to sort data by a value accessor.
 * Used by BarChart and DotPlot.
 */
export function useSortedData(
  data: any[],
  sort: boolean | "asc" | "desc" | ((a: any, b: any) => number),
  valueAccessor: Accessor<number>
): any[] {
  return useMemo(() => {
    if (!sort) return data
    const copy = [...data]
    if (typeof sort === "function") return copy.sort(sort)
    const getValue =
      typeof valueAccessor === "function"
        ? valueAccessor
        : (d: any) => d[valueAccessor]
    return sort === "asc"
      ? copy.sort((a, b) => getValue(a) - getValue(b))
      : copy.sort((a, b) => getValue(b) - getValue(a))
  }, [data, sort, valueAccessor])
}
