import type { LineColorThreshold } from "../types"

export interface ThresholdLineSegment {
  color: string
  path: [number, number][]
}

export function resolveThresholdColor(
  value: number,
  thresholds: LineColorThreshold[],
  baseColor: string,
): string {
  let color = baseColor
  for (const threshold of thresholds) {
    if (threshold.thresholdType === "lesser") {
      if (value < threshold.value) color = threshold.color
    } else if (value > threshold.value) {
      color = threshold.color
    }
  }
  return color
}

/**
 * Split a value-bearing polyline wherever it crosses a color threshold.
 * Adjacent intervals with the same resolved color are merged so canvas and
 * SVG can paint identical hard-edged bands with a minimal number of paths.
 */
export function buildThresholdLineSegments(
  path: [number, number][],
  rawValues: number[],
  thresholds: LineColorThreshold[],
  baseColor: string,
): ThresholdLineSegment[] {
  if (path.length < 2 || rawValues.length !== path.length || thresholds.length === 0) {
    return []
  }

  const segments: ThresholdLineSegment[] = []

  const appendInterval = (
    color: string,
    start: [number, number],
    end: [number, number],
  ) => {
    const previous = segments[segments.length - 1]
    if (previous?.color === color) {
      previous.path.push(end)
    } else {
      segments.push({ color, path: [start, end] })
    }
  }

  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1]
    const [x1, y1] = path[i]
    const value0 = rawValues[i - 1]
    const value1 = rawValues[i]
    const delta = value1 - value0

    const crossings = delta === 0
      ? []
      : thresholds
          .map(({ value }) => (value - value0) / delta)
          .filter((t) => t > 0 && t < 1 && Number.isFinite(t))
          .sort((a, b) => a - b)
          .filter((t, index, values) => index === 0 || t !== values[index - 1])

    const breakpoints = [0, ...crossings, 1]
    for (let j = 1; j < breakpoints.length; j++) {
      const startT = breakpoints[j - 1]
      const endT = breakpoints[j]
      const sampleT = (startT + endT) / 2
      const color = resolveThresholdColor(value0 + delta * sampleT, thresholds, baseColor)
      const start: [number, number] = [
        x0 + (x1 - x0) * startT,
        y0 + (y1 - y0) * startT,
      ]
      const end: [number, number] = [
        x0 + (x1 - x0) * endT,
        y0 + (y1 - y0) * endT,
      ]
      appendInterval(color, start, end)
    }
  }

  return segments
}
