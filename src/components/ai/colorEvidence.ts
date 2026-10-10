export interface ColorEvidenceRGBA {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly a: number
}

function byte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

/** Parse the deterministic solid-color subset accepted by theme tokens. */
export function parseColorEvidence(value: unknown): ColorEvidenceRGBA | null {
  if (typeof value !== "string") return null
  const input = value.trim().toLowerCase()
  const hex = input.match(/^#([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i)?.[1]
  if (hex) {
    const expanded =
      hex.length <= 4
        ? hex
            .split("")
            .map((part) => `${part}${part}`)
            .join("")
        : hex
    return {
      r: Number.parseInt(expanded.slice(0, 2), 16),
      g: Number.parseInt(expanded.slice(2, 4), 16),
      b: Number.parseInt(expanded.slice(4, 6), 16),
      a:
        expanded.length === 8
          ? Number.parseInt(expanded.slice(6, 8), 16) / 255
          : 1
    }
  }

  const fn = input.match(/^(rgba?|hsla?)\(([^()]*)\)$/)
  if (!fn) return null
  const comma = fn[2].includes(",")
  const sections = fn[2].split("/")
  if (sections.length > 2 || (comma && sections.length > 1)) return null
  const parts = comma
    ? fn[2].split(",").map((part) => part.trim())
    : sections[0].trim().split(/\s+/)
  if (!comma) {
    if (parts.length !== 3) return null
    if (sections.length === 2) parts.push(sections[1].trim())
  }
  if (parts.length !== 3 && parts.length !== 4) return null
  const number = (value: string, percentScale: number): number => {
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)%?$/.test(value)) return NaN
    return parseFloat(value) * (value.endsWith("%") ? percentScale / 100 : 1)
  }
  const opacity = parts[3] === undefined ? 1 : number(parts[3], 1)
  let channels: number[]
  if (fn[1].startsWith("hsl")) {
    const hue = parts[0].match(
      /^([+-]?(?:\d+\.?\d*|\.\d+))(deg|grad|rad|turn)?$/
    )
    if (!hue || !parts[1].endsWith("%") || !parts[2].endsWith("%")) return null
    const degrees =
      Number(hue[1]) *
      (hue[2] === "turn"
        ? 360
        : hue[2] === "rad"
          ? 180 / Math.PI
          : hue[2] === "grad"
            ? 0.9
            : 1)
    const h = (((degrees % 360) + 360) % 360) / 60
    const s = number(parts[1], 1)
    const l = number(parts[2], 1)
    if (!Number.isFinite(h) || s < 0 || s > 1 || l < 0 || l > 1) return null
    const c = (1 - Math.abs(2 * l - 1)) * s
    const x = c * (1 - Math.abs((h % 2) - 1))
    const m = l - c / 2
    const rgb =
      h < 1
        ? [c, x, 0]
        : h < 2
          ? [x, c, 0]
          : h < 3
            ? [0, c, x]
            : h < 4
              ? [0, x, c]
              : h < 5
                ? [x, 0, c]
                : [c, 0, x]
    channels = rgb.map((channel) => (channel + m) * 255)
  } else {
    channels = parts.slice(0, 3).map((part) => number(part, 255))
  }
  if (
    channels.some(
      (channel) => !Number.isFinite(channel) || channel < 0 || channel > 255
    ) ||
    !Number.isFinite(opacity) ||
    opacity < 0 ||
    opacity > 1
  ) {
    return null
  }
  return { r: channels[0], g: channels[1], b: channels[2], a: opacity }
}

export function compositeColorEvidence(
  foreground: ColorEvidenceRGBA,
  background: ColorEvidenceRGBA
): ColorEvidenceRGBA | null {
  if (background.a < 1) return null
  return {
    r: byte(foreground.r * foreground.a + background.r * (1 - foreground.a)),
    g: byte(foreground.g * foreground.a + background.g * (1 - foreground.a)),
    b: byte(foreground.b * foreground.a + background.b * (1 - foreground.a)),
    a: 1
  }
}

export function colorEvidenceToHex(color: ColorEvidenceRGBA): string | null {
  if (color.a < 1) return null
  return `#${[color.r, color.g, color.b]
    .map((channel) => byte(channel).toString(16).padStart(2, "0"))
    .join("")}`
}

/** Canonical identity for authored/theme vocabulary comparisons. */
export function canonicalColorEvidence(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined
  const parsed = parseColorEvidence(value)
  if (!parsed) return value.trim().toLowerCase()
  const opaque = colorEvidenceToHex(parsed)
  return (
    opaque ??
    `rgba(${byte(parsed.r)},${byte(parsed.g)},${byte(parsed.b)},${parsed.a})`
  )
}
