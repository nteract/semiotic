/**
 * Mix a CSS color toward black (amount < 0) or white (amount > 0). Hex and
 * rgb()/rgba() are computed exactly; other colors (named, `var(...)`) fall
 * back to CSS `color-mix`. Canvas callers normalize colors first.
 */
export function shadeColor(color: string, amount: number): string {
  if (!amount) return color
  const t = Math.min(1, Math.abs(amount))
  const s = color.trim()
  let rgb: number[] | null = null
  let alpha = 1
  const hex = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.exec(s)
  if (hex) {
    const h = hex[1].length < 6 ? hex[1].replace(/./g, "$&$&") : hex[1]
    rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
    if (h.length === 8) alpha = parseInt(h.slice(6), 16) / 255
  } else {
    const fn = /^rgba?\(([^)]+)\)$/i.exec(s)
    const parts = fn?.[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat)
    if (parts && parts.length >= 3 && !parts.slice(0, 3).some(isNaN)) {
      rgb = parts.slice(0, 3)
      if (parts.length > 3 && !isNaN(parts[3])) alpha = parts[3]
    }
  }
  if (!rgb) return `color-mix(in srgb, ${s} ${Math.round((1 - t) * 100)}%, ${amount < 0 ? "black" : "white"})`
  const to = amount < 0 ? 0 : 255
  const [r, g, b] = rgb.map((v) => Math.round(v + (to - v) * t))
  return alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`
}
