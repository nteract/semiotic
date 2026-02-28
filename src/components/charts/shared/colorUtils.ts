import { scaleOrdinal, scaleSequential } from "d3-scale"
import {
  schemeCategory10,
  schemeTableau10,
  schemeSet3,
  interpolateBlues,
  interpolateReds,
  interpolateGreens,
  interpolateOranges,
  interpolatePurples,
  interpolateViridis,
  interpolatePlasma
} from "d3-scale-chromatic"

/**
 * Predefined color schemes
 */
export const COLOR_SCHEMES = {
  // Categorical schemes
  category10: schemeCategory10,
  tableau10: schemeTableau10,
  set3: schemeSet3,

  // Sequential schemes (for continuous data)
  blues: interpolateBlues,
  reds: interpolateReds,
  greens: interpolateGreens,
  oranges: interpolateOranges,
  purples: interpolatePurples,
  viridis: interpolateViridis,
  plasma: interpolatePlasma
}

/**
 * Default colors for charts
 */
export const DEFAULT_COLORS = schemeCategory10

/**
 * Gets a color for a data point based on the colorBy configuration
 *
 * @param dataPoint - The data point
 * @param colorBy - Field name or function to determine color
 * @param colorScale - Optional custom color scale
 * @returns Color string
 *
 * @example
 * ```ts
 * // Using a field name
 * getColor({category: 'A', value: 10}, 'category', colorScale)
 *
 * // Using a function
 * getColor({value: 10}, d => d.value > 5 ? 'red' : 'blue')
 * ```
 */
export function getColor(
  dataPoint: any,
  colorBy: string | ((d: any) => string),
  colorScale?: (v: any) => string
): string {
  if (typeof colorBy === "function") {
    return colorBy(dataPoint)
  }

  const colorValue = dataPoint[colorBy]

  if (colorScale) {
    return colorScale(colorValue)
  }

  // Default: return a hash-based color
  return DEFAULT_COLORS[Math.abs(hashString(String(colorValue))) % DEFAULT_COLORS.length]
}

/**
 * Creates a color scale function from data
 *
 * @param data - Array of data points
 * @param colorBy - Field name to use for coloring
 * @param scheme - Color scheme name or custom palette
 * @returns Color scale function
 *
 * @example
 * ```ts
 * const colorScale = createColorScale(data, 'category')
 * const color = colorScale('A') // Returns color for category 'A'
 * ```
 */
export function createColorScale(
  data: Array<Record<string, any>>,
  colorBy: string,
  scheme: string | string[] = "category10"
): (v: string) => string {
  // Get unique values
  const uniqueValues = Array.from(new Set(data.map(d => d[colorBy])))

  // Check if values are numeric for sequential scale
  const isNumeric = uniqueValues.every(v => typeof v === "number" || !isNaN(Number(v)))

  // Handle custom color array
  if (Array.isArray(scheme)) {
    return scaleOrdinal<any, string>()
      .domain(uniqueValues)
      .range(scheme)
      .unknown("#999") as (v: any) => string
  }

  const colorScheme = COLOR_SCHEMES[scheme] || COLOR_SCHEMES.category10

  if (isNumeric && typeof colorScheme === "function") {
    // Use sequential scale for numeric data
    return (v: any) => colorScheme(Number(v) / Math.max(...uniqueValues.map(Number)))
  } else {
    // Use ordinal scale for categorical data
    const colors = Array.isArray(colorScheme) ? colorScheme : DEFAULT_COLORS
    return scaleOrdinal<any, string>()
      .domain(uniqueValues)
      .range(colors)
      .unknown("#999") as (v: any) => string
  }
}

/**
 * Simple string hash function for deterministic color assignment
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Generates a size function based on sizeBy configuration
 *
 * @param dataPoint - The data point
 * @param sizeBy - Field name or function to determine size
 * @param sizeRange - Min and max size range [min, max]
 * @param domain - Optional domain for scaling [minValue, maxValue]
 * @returns Size value
 */
export function getSize(
  dataPoint: any,
  sizeBy: string | ((d: any) => number),
  sizeRange: [number, number] = [3, 20],
  domain?: [number, number]
): number {
  let value: number

  if (typeof sizeBy === "function") {
    value = sizeBy(dataPoint)
  } else {
    value = dataPoint[sizeBy]
  }

  if (!domain) {
    return value
  }

  // Scale value to size range
  const [minDomain, maxDomain] = domain
  const [minSize, maxSize] = sizeRange

  if (maxDomain === minDomain) {
    return (minSize + maxSize) / 2
  }

  const normalized = (value - minDomain) / (maxDomain - minDomain)
  return minSize + normalized * (maxSize - minSize)
}
