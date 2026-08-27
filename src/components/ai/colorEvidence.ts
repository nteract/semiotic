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

  const rgb = input.match(
    /^rgba?\(\s*(-?(?:\d+|\d*\.\d+))\s*,\s*(-?(?:\d+|\d*\.\d+))\s*,\s*(-?(?:\d+|\d*\.\d+))(?:\s*,\s*(-?(?:\d+|\d*\.\d+)))?\s*\)$/
  )
  if (!rgb) return null
  const channels = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  const opacity = rgb[4] === undefined ? 1 : Number(rgb[4])
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
