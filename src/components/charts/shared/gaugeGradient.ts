import type { Datum } from "./datumTypes"

export interface GaugeThresholdLike {
  value: number
  color: string
  label?: string
}

export interface GaugeGradientStop {
  offset: number
  color: string
}

export interface GaugeGradientFill {
  colorStops: GaugeGradientStop[]
}

export interface GaugeArcDatum extends Datum {
  category: string
  value: number
  _zone?: string
  _isFill: boolean
}

export interface GaugeArcModel {
  gaugeData: GaugeArcDatum[]
  pieceStyle: (d: Datum, category?: string) => { fill: string; opacity?: number }
  gaugeAnnotations: Datum[]
}

interface BuildGaugeArcModelOptions {
  min: number
  max: number
  value: number
  thresholds?: GaugeThresholdLike[]
  fillColor?: string
  backgroundColor: string
  fillZones: boolean
  showScaleLabels: boolean
  gradientFill?: GaugeGradientFill
  gradientSteps?: number
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function parseRgb(color: string): [number, number, number] | null {
  const hex = color.trim()
  if (hex.startsWith("#")) {
    let body = hex.slice(1)
    if (body.length === 3) {
      body = body.split("").map((c) => c + c).join("")
    }
    if (body.length === 6 && /^[0-9a-f]{6}$/i.test(body)) {
      return [
        parseInt(body.slice(0, 2), 16),
        parseInt(body.slice(2, 4), 16),
        parseInt(body.slice(4, 6), 16),
      ]
    }
  }

  const rgba = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgba) {
    const rgb: [number, number, number] = [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])]
    if (rgb.every(Number.isFinite)) return rgb
  }

  return null
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`
}

function interpolateColorStops(stops: GaugeGradientStop[], t: number): string {
  const validStops = stops
    .filter((stop) => Number.isFinite(stop.offset))
    .map((stop) => ({ offset: clamp01(stop.offset), color: stop.color }))
    .sort((a, b) => a.offset - b.offset)

  if (validStops.length === 0) return "#999999"
  if (validStops.length === 1) return validStops[0].color

  const clamped = clamp01(t)
  if (clamped <= validStops[0].offset) return validStops[0].color
  if (clamped >= validStops[validStops.length - 1].offset) return validStops[validStops.length - 1].color

  for (let i = 0; i < validStops.length - 1; i++) {
    const left = validStops[i]
    const right = validStops[i + 1]
    if (clamped < left.offset || clamped > right.offset) continue
    const span = right.offset - left.offset
    const localT = span <= 0 ? 0 : (clamped - left.offset) / span
    const leftRgb = parseRgb(left.color)
    const rightRgb = parseRgb(right.color)
    if (!leftRgb || !rightRgb) return localT < 0.5 ? left.color : right.color
    const [r0, g0, b0] = leftRgb
    const [r1, g1, b1] = rightRgb
    return rgbToHex(
      r0 + (r1 - r0) * localT,
      g0 + (g1 - g0) * localT,
      b0 + (b1 - b0) * localT,
    )
  }

  return validStops[validStops.length - 1].color
}

function makeZoneKey(kind: "fill" | "bg", zoneIndex: number, sliceIndex?: number): string {
  return sliceIndex == null ? `${kind}-${zoneIndex}` : `${kind}-${zoneIndex}-${sliceIndex}`
}

/**
 * Build the synthetic wedge data model used by GaugeChart.
 *
 * When `gradientFill` is provided, the visible fill is split into many thin
 * slices and sampled against the supplied color stops so color changes along
 * the arc length rather than by threshold zone.
 */
export function buildGaugeArcModel(options: BuildGaugeArcModelOptions): GaugeArcModel {
  const {
    min,
    max,
    value,
    thresholds,
    fillColor,
    backgroundColor,
    fillZones,
    showScaleLabels,
    gradientFill,
    gradientSteps = 48,
  } = options

  const clampedValue = Math.max(min, Math.min(max, value))
  const range = max - min || 1
  const pct = (clampedValue - min) / range

  let zones = thresholds && thresholds.length > 0
    ? [...thresholds].sort((a, b) => a.value - b.value)
    : [{ value: max, color: fillColor || "#007bff" }]

  zones = zones.map((zone) => ({
    ...zone,
    value: Math.max(min, Math.min(max, zone.value)),
  }))

  if (zones[zones.length - 1].value < max) {
    zones.push({ value: max, color: zones[zones.length - 1].color })
  }

  const hasGradient = !!gradientFill && gradientFill.colorStops.length >= 2
  const data: GaugeArcDatum[] = []
  const styles = new Map<string, { fill: string; opacity?: number }>()
  const scaleAnnotations: Datum[] = []

  if (hasGradient) {
    const fillEnd = fillZones ? pct : 1
    if (fillEnd > 0) {
      const sliceBudget = Math.max(1, Math.floor(gradientSteps))
      const slices = Math.max(1, Math.min(sliceBudget, Math.round(fillEnd * sliceBudget)))
      for (let s = 0; s < slices; s++) {
        const sliceStart = (fillEnd * s) / slices
        const sliceEnd = (fillEnd * (s + 1)) / slices
        const t = (sliceStart + sliceEnd) / 2
        const key = makeZoneKey("fill", 0, s)
        data.push({
          category: key,
          value: sliceEnd - sliceStart,
          _zone: "Gradient",
          _isFill: true,
        })
        styles.set(key, { fill: interpolateColorStops(gradientFill!.colorStops, t) })
      }
    }

    if (fillZones) {
      let prevBound = min
      for (let i = 0; i < zones.length; i++) {
        const zone = zones[i]
        const zoneStart = (prevBound - min) / range
        const zoneEnd = (zone.value - min) / range
        const bgPct = Math.max(0, zoneEnd - Math.max(fillEnd, zoneStart))
        if (bgPct > 0) {
          const key = makeZoneKey("bg", i)
          data.push({ category: key, value: bgPct, _zone: zone.label || `Zone ${i + 1}`, _isFill: false })
          styles.set(key, { fill: backgroundColor, opacity: 0.4 })
        }
        prevBound = zone.value
      }
    }
  } else {
    let prevBound = min
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i]
      const zonePct = (zone.value - prevBound) / range
      const zoneStart = (prevBound - min) / range
      const zoneEnd = (zone.value - min) / range
      const fillEnd = fillZones ? Math.min(pct, zoneEnd) : zoneEnd
      const fillPct = Math.max(0, fillEnd - zoneStart)
      const bgPct = fillZones ? Math.max(0, zonePct - fillPct) : 0

      if (fillPct > 0) {
        const key = makeZoneKey("fill", i)
        data.push({ category: key, value: fillPct, _zone: zone.label || `Zone ${i + 1}`, _isFill: true })
        styles.set(key, { fill: zone.color })
      }

      if (bgPct > 0) {
        const key = makeZoneKey("bg", i)
        data.push({ category: key, value: bgPct, _zone: zone.label || `Zone ${i + 1}`, _isFill: false })
        styles.set(key, { fill: backgroundColor, opacity: 0.4 })
      }

      prevBound = zone.value
    }
  }

  if (showScaleLabels && thresholds && thresholds.length > 0) {
    for (const threshold of thresholds) {
      if (threshold.value > min && threshold.value < max) {
        scaleAnnotations.push({
          type: "gauge-label",
          value: threshold.value,
          label: threshold.label || String(threshold.value),
        })
      }
    }
  }

  return {
    gaugeData: data,
    pieceStyle: (d: Datum, category?: string) => {
      const key = category || (d as GaugeArcDatum).category
      return styles.get(key) || { fill: backgroundColor }
    },
    gaugeAnnotations: scaleAnnotations,
  }
}
