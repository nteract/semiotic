import type { Datum } from "./datumTypes"

// The Wong colorblind-safe palette Semiotic ships
// (COLOR_BLIND_SAFE_CATEGORICAL), mirrored here so the static audit remains
// dependency-free.
const CVD_SAFE_PALETTE = new Set([
  "#0072b2",
  "#e69f00",
  "#009e73",
  "#cc79a7",
  "#56b4e9",
  "#d55e00",
  "#f0e442",
  "#000000"
])

/**
 * Statically detect the serializable HatchFill form styleRules can carry.
 * Function-valued rule styles may also return hatches at runtime, but the
 * config-only audit cannot inspect those honestly.
 */
export function hasDeclaredHatchFill(props: Datum): boolean {
  if (!Array.isArray(props.styleRules)) return false
  return props.styleRules.some((rule: unknown) => {
    if (typeof rule !== "object" || rule === null) return false
    const style = (rule as Datum).style
    if (typeof style !== "object" || style === null || Array.isArray(style)) {
      return false
    }
    const fill = (style as Datum).fill
    return (
      typeof fill === "object" &&
      fill !== null &&
      (fill as Datum).type === "hatch"
    )
  })
}

/** True only when every declared hex color belongs to the safe palette. */
export function usesCvdSafePalette(colorScheme: unknown): boolean {
  if (!Array.isArray(colorScheme)) return false
  const schemeHexes = colorScheme
    .filter(
      (color: unknown): color is string =>
        typeof color === "string" && color.startsWith("#")
    )
    .map((color) => color.toLowerCase())
  return (
    schemeHexes.length > 0 &&
    schemeHexes.every((color) => CVD_SAFE_PALETTE.has(color))
  )
}
