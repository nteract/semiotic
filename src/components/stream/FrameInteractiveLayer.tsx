import * as React from "react"
import { useCallback, useRef } from "react"
import type { InteractiveGraphicsContext, InteractiveGraphicsProp } from "./types"
import { pointerToLocalPoint } from "../controls/controlPointer"

interface FrameInteractiveLayerProps<S> {
  graphics: InteractiveGraphicsProp<S> | undefined
  size: number[]
  margin: InteractiveGraphicsContext<S>["margin"]
  scales: S | null
  label?: string
}

/**
 * The frame's control layer. It is a sibling of the chart's `role="img"`
 * overlay (whose children are presentational and would hide a slider from
 * assistive technology, and where a focusable element is an axe violation),
 * so it gets its own `role="group"`. The root ignores pointer events;
 * controls opt back in, leaving hover and brushing on the rest of the plot.
 */
export function FrameInteractiveLayer<S>({
  graphics,
  size,
  margin,
  scales,
  label = "Chart controls"
}: FrameInteractiveLayerProps<S>): React.ReactElement | null {
  const plotRef = useRef<SVGGElement | null>(null)
  const pointerToPlot = useCallback(
    (event: { clientX: number; clientY: number }) =>
      pointerToLocalPoint({ clientX: event.clientX, clientY: event.clientY, currentTarget: null }, plotRef.current),
    []
  )
  if (graphics == null || graphics === false) return null
  const content = typeof graphics === "function"
    ? (graphics as (context: InteractiveGraphicsContext<S>) => React.ReactNode)({ size, margin, scales, pointerToPlot })
    : graphics
  if (content == null || content === false) return null
  return (
    <svg
      className="stream-frame-interactive-layer"
      role="group"
      aria-label={label}
      width={size[0]}
      height={size[1]}
      overflow="visible"
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}
    >
      <g ref={plotRef} transform={`translate(${margin.left},${margin.top})`}>
        {content}
      </g>
    </svg>
  )
}
