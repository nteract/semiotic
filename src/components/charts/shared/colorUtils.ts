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
 * Pastel palette for depth-based hierarchy coloring (Treemap, CirclePack, TreeDiagram).
 * Index corresponds to hierarchy depth, wraps via modulo.
 */
export const DEPTH_PALETTE_COLORS = [
  "#f0f0f0", "#b5d4ea", "#f4c2a1", "#b8dab2", "#d4b5e0", "#f9e0a2", "#a8d8d8"
]

// CSS named color keywords (all 148 from CSS Color Level 4 + "transparent").
// Used to distinguish category names from literal color values returned by colorBy functions.
const CSS_NAMED_COLORS = new Set([
  "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure",
  "beige", "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood",
  "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk", "crimson", "cyan",
  "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki",
  "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon",
  "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise", "darkviolet",
  "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue",
  "firebrick", "floralwhite", "forestgreen", "fuchsia",
  "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey",
  "honeydew", "hotpink",
  "indianred", "indigo", "ivory",
  "khaki",
  "lavender", "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral",
  "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey", "lightpink",
  "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray", "lightslategrey",
  "lightsteelblue", "lightyellow", "lime", "limegreen", "linen",
  "magenta", "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple",
  "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise", "mediumvioletred",
  "midnightblue", "mintcream", "mistyrose", "moccasin",
  "navajowhite", "navy",
  "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid",
  "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff",
  "peru", "pink", "plum", "powderblue", "purple",
  "rebeccapurple", "red", "rosybrown", "royalblue",
  "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue",
  "slateblue", "slategray", "slategrey", "snow", "springgreen", "steelblue",
  "tan", "teal", "thistle", "tomato", "transparent", "turquoise",
  "violet",
  "wheat", "white", "whitesmoke",
  "yellow", "yellowgreen"
])

/** Returns true if the string looks like a CSS color value (hex, rgb/a, hsl/a, or named keyword). */
function isCssColor(value: string): boolean {
  const v = value.toLowerCase()
  return v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl") || CSS_NAMED_COLORS.has(v)
}

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
    const value = colorBy(dataPoint)
    // If the function returned a category name (not a CSS color), map through colorScale
    if (colorScale && value && typeof value === "string" && !isCssColor(value)) {
      return colorScale(value)
    }
    return value
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
  const uniqueValues = Array.from(new Set(data.map(d => d?.[colorBy]).filter(v => v != null)))

  // Check if values are numeric for sequential scale
  const isNumeric = uniqueValues.every(v => typeof v === "number" || !isNaN(Number(v)))

  // Handle custom color array
  if (Array.isArray(scheme)) {
    return scaleOrdinal<any, string>()
      .domain(uniqueValues)
      .range(scheme)
      .unknown("#999") as (v: any) => string
  }

  const colorScheme = COLOR_SCHEMES[scheme as keyof typeof COLOR_SCHEMES] || COLOR_SCHEMES.category10

  if (isNumeric && typeof colorScheme === "function") {
    // Use sequential scale for numeric data
    let maxVal = -Infinity
    for (const v of uniqueValues) { const n = Number(v); if (n > maxVal) maxVal = n }
    return (v: any) => colorScheme(Number(v) / maxVal)
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
