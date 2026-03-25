/**
 * Lightweight color manipulation helpers.
 * Extracted from statisticalOverlays to avoid pulling the heavy module
 * into the main barrel import graph.
 */

/**
 * Darken a CSS hex color by a factor (0–1). factor=0.5 darkens by 50%.
 * Returns the original string unchanged if it's not a valid hex color.
 */
export function darkenColor(hex: string, factor: number = 0.5): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return hex
  const r = Math.round(parseInt(m[1], 16) * (1 - factor))
  const g = Math.round(parseInt(m[2], 16) * (1 - factor))
  const b = Math.round(parseInt(m[3], 16) * (1 - factor))
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

/**
 * Lighten a CSS hex color by a factor (0–1). factor=0.5 lightens by 50%.
 * Returns the original string unchanged if it's not a valid hex color.
 */
export function lightenColor(hex: string, factor: number = 0.5): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return hex
  const r = Math.round(parseInt(m[1], 16) + (255 - parseInt(m[1], 16)) * factor)
  const g = Math.round(parseInt(m[2], 16) + (255 - parseInt(m[2], 16)) * factor)
  const b = Math.round(parseInt(m[3], 16) + (255 - parseInt(m[3], 16)) * factor)
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}
