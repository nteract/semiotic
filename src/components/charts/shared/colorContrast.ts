/** Compute relative luminance of a hex color (WCAG formula).
 *  Accepts 6-digit (#1f77b4) and 3-digit shorthand (#333) hex. */
function luminance(hex: string): number | null {
  let h = hex.replace(/^#/, "")
  if (/^[a-f\d]{3}$/i.test(h)) {
    h = h.split("").map((c) => c + c).join("")
  }
  const m = h.match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return null
  const [r, g, b] = [
    parseInt(m[1], 16) / 255,
    parseInt(m[2], 16) / 255,
    parseInt(m[3], 16) / 255,
  ]
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/** WCAG contrast ratio between two hex colors.
 *  Returns null if either color isn't a parseable hex. */
export function contrastRatio(hex1: string, hex2: string): number | null {
  const l1 = luminance(hex1)
  const l2 = luminance(hex2)
  if (l1 === null || l2 === null) return null
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}
