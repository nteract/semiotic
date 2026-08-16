export function resolveHorizontalTickAnchor(
  mode: "middle" | "edges" | undefined,
  isLeftmost: boolean,
  isRightmost: boolean
): "start" | "middle" | "end" {
  if (mode === "edges") {
    if (isLeftmost) return "start"
    if (isRightmost) return "end"
  }
  return "middle"
}

export function resolveVerticalTickBaseline(
  mode: "middle" | "edges" | undefined,
  isTopmost: boolean,
  isBottommost: boolean
): "hanging" | "middle" | "auto" {
  if (mode === "edges") {
    if (isTopmost) return "hanging"
    if (isBottommost) return "auto"
  }
  return "middle"
}

export function tickPixelExtent(ticks: Array<{ pixel: number }>): {
  min: number | null
  max: number | null
} {
  if (ticks.length === 0) return { min: null, max: null }
  let min = Infinity
  let max = -Infinity
  for (const tick of ticks) {
    if (tick.pixel < min) min = tick.pixel
    if (tick.pixel > max) max = tick.pixel
  }
  return { min, max }
}

export function resolveGridDash(
  style: "dashed" | "dotted" | string | { strokeDasharray?: string } | undefined
): string | undefined {
  if (!style) return undefined
  if (typeof style === "object") return style.strokeDasharray
  if (style === "dashed") return "6,4"
  if (style === "dotted") return "2,4"
  return style
}

/**
 * Normalize the line-style forms shared by live SVG and static rendering.
 * This returns presentation attributes, not CSS, so consumers can still use
 * CSS variables in `stroke` and the generated SVG remains self-contained.
 */
export function resolveAxisLineStyle(
  style: string | { stroke?: string; strokeWidth?: number; strokeOpacity?: number; strokeDasharray?: string } | undefined,
  fallback: { stroke: string; strokeWidth: number },
): { stroke: string; strokeWidth: number; strokeOpacity?: number; strokeDasharray?: string } {
  if (!style || typeof style === "string") {
    return {
      ...fallback,
      ...(typeof style === "string" && { strokeDasharray: resolveGridDash(style) }),
    }
  }
  return {
    stroke: style.stroke ?? fallback.stroke,
    strokeWidth: style.strokeWidth ?? fallback.strokeWidth,
    ...(style.strokeOpacity != null && { strokeOpacity: style.strokeOpacity }),
    ...(style.strokeDasharray && { strokeDasharray: style.strokeDasharray }),
  }
}

export function jaggedBaselinePath(
  orient: "left" | "right" | "top" | "bottom",
  width: number,
  height: number
): string {
  const toothWidth = 8
  const toothHeight = 4

  if (orient === "left" || orient === "right") {
    const y = orient === "left" ? height : 0
    const mod = orient === "left" ? -1 : 1
    const teeth = Math.ceil(width / toothWidth)
    let path = `M0,${y}`
    for (let index = 0; index < teeth; index++) {
      const x1 = index * toothWidth + toothWidth / 2
      const x2 = (index + 1) * toothWidth
      path += `L${Math.min(x1, width)},${y + toothHeight * mod}`
      path += `L${Math.min(x2, width)},${y}`
    }
    return path
  }

  const x = orient === "bottom" ? 0 : width
  const mod = orient === "bottom" ? 1 : -1
  const teeth = Math.ceil(height / toothWidth)
  let path = `M${x},0`
  for (let index = 0; index < teeth; index++) {
    const y1 = index * toothWidth + toothWidth / 2
    const y2 = (index + 1) * toothWidth
    path += `L${x + toothHeight * mod},${Math.min(y1, height)}`
    path += `L${x},${Math.min(y2, height)}`
  }
  return path
}
