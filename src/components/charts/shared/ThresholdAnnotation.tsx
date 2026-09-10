import * as React from "react"
import type { Datum } from "./datumTypes"
import {
  AnnotationLabel,
  type AnnotationLabelBackground
} from "./AnnotationLabel"
import { renderThresholdEndCap } from "./ThresholdEndCap"
import { TOP_LABEL_BASELINE } from "./annotationLabelLayout"

/** Shared threshold geometry; callers retain their renderer-specific theme defaults. */
export function ThresholdAnnotation({
  ann,
  position,
  vertical,
  width,
  height,
  color,
  fontSize = 12,
  fontFamily,
  bold,
  background,
  dash = "6,3",
  labelGap = 4
}: {
  ann: Datum
  position: number
  vertical: boolean
  width: number
  height: number
  color: string
  fontSize?: number
  fontFamily?: string
  bold?: boolean
  background?: AnnotationLabelBackground
  dash?: string
  labelGap?: number
}) {
  const side = ann.labelPosition
  const nearRight = position > width * 0.6
  const x = vertical
    ? position + (nearRight ? -4 : 4)
    : side === "left"
      ? 4
      : side === "center"
        ? width / 2
        : width - 4
  const y = vertical
    ? side === "bottom"
      ? height - 4
      : side === "center"
        ? height / 2
        : TOP_LABEL_BASELINE
    : position < 20
      ? Math.min(height - 4, position + TOP_LABEL_BASELINE)
      : position - labelGap
  const anchor = vertical
    ? nearRight
      ? "end"
      : "start"
    : side === "left"
      ? "start"
      : side === "center"
        ? "middle"
        : "end"
  const start: [number, number] = vertical ? [position, 0] : [0, position]
  const end: [number, number] = vertical
    ? [position, height]
    : [width, position]
  return (
    <g opacity={ann.opacity}>
      <line
        x1={start[0]}
        y1={start[1]}
        x2={end[0]}
        y2={end[1]}
        stroke={color}
        strokeWidth={ann.strokeWidth ?? 1.5}
        strokeDasharray={ann.strokeDasharray || dash}
      />
      {renderThresholdEndCap(ann.endCap, start, color)}
      {ann.label && (
        <AnnotationLabel
          x={x}
          y={y}
          text={ann.label}
          textAnchor={anchor}
          fill={color}
          fontSize={fontSize}
          fontFamily={fontFamily}
          fontWeight={bold ? "bold" : undefined}
          background={background ?? ann.labelBackground ?? "halo"}
        />
      )}
    </g>
  )
}
