import type { Datum } from "./datumTypes"

/**
 * Plot-relative anchors for serializable chart-adjacent text. Coordinates are
 * resolved against the final plot rectangle, so the same annotation survives
 * responsive layout and SSR without parsing SVG transforms.
 */
export const FRAME_TEXT_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right"
] as const

export type FrameTextPosition = (typeof FRAME_TEXT_POSITIONS)[number]

export interface FrameTextAnnotationBase {
  type: "frame-text"
  position?: FrameTextPosition
  dx?: number
  dy?: number
  textAnchor?: "start" | "middle" | "end"
  dominantBaseline?: "auto" | "middle" | "hanging"
  fill?: string
  color?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string | number
  fontStyle?: string
  letterSpacing?: string | number
  opacity?: number
  className?: string
}

export type FrameTextAnnotation = FrameTextAnnotationBase &
  (
    | { label: string | number; text?: string | number }
    | { text: string | number; label?: string | number }
  )

export interface ResolvedFrameTextPosition {
  x: number
  y: number
  textAnchor: "start" | "middle" | "end"
  dominantBaseline: "auto" | "middle" | "hanging"
}

export interface FrameTextStyleDefaults {
  fill: string
  fontSize: number
  fontFamily: string
}

const POSITION_SET = new Set<string>(FRAME_TEXT_POSITIONS)

/** Resolve a `frame-text` annotation without consulting data scales. */
export function resolveFrameTextPosition(
  annotation: Datum,
  width: number,
  height: number
): ResolvedFrameTextPosition {
  const requested = annotation.position
  const position: FrameTextPosition =
    typeof requested === "string" && POSITION_SET.has(requested)
      ? (requested as FrameTextPosition)
      : "bottom-left"

  const horizontal = position.endsWith("left")
    ? "left"
    : position.endsWith("right")
      ? "right"
      : "center"
  const vertical = position.startsWith("top")
    ? "top"
    : position.startsWith("bottom")
      ? "bottom"
      : "middle"

  const baseX =
    horizontal === "left" ? 0 : horizontal === "right" ? width : width / 2
  const baseY =
    vertical === "top" ? 0 : vertical === "bottom" ? height : height / 2
  const dx =
    typeof annotation.dx === "number" && Number.isFinite(annotation.dx)
      ? annotation.dx
      : 0
  const dy =
    typeof annotation.dy === "number" && Number.isFinite(annotation.dy)
      ? annotation.dy
      : 0

  return {
    x: baseX + dx,
    y: baseY + dy,
    textAnchor:
      annotation.textAnchor === "start" ||
      annotation.textAnchor === "middle" ||
      annotation.textAnchor === "end"
        ? annotation.textAnchor
        : horizontal === "left"
          ? "start"
          : horizontal === "right"
            ? "end"
            : "middle",
    dominantBaseline:
      annotation.dominantBaseline === "auto" ||
      annotation.dominantBaseline === "middle" ||
      annotation.dominantBaseline === "hanging"
        ? annotation.dominantBaseline
        : vertical === "top"
          ? "hanging"
          : vertical === "bottom"
            ? "auto"
            : "middle"
  }
}

/** Shared SVG attributes keep live and static frame-text output in lockstep. */
export function resolveFrameTextAttributes(
  annotation: Datum,
  width: number,
  height: number,
  defaults: FrameTextStyleDefaults
) {
  const position = resolveFrameTextPosition(annotation, width, height)
  return {
    ...position,
    fill: annotation.fill ?? annotation.color ?? defaults.fill,
    fontSize: annotation.fontSize ?? defaults.fontSize,
    fontFamily: annotation.fontFamily ?? defaults.fontFamily,
    fontWeight: annotation.fontWeight,
    fontStyle: annotation.fontStyle,
    letterSpacing: annotation.letterSpacing,
    opacity: annotation.opacity,
    className: annotation.className,
    style: { pointerEvents: "none" as const }
  }
}
