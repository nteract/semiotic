import type { ReactNode } from "react"
import type { FrameGraphicsContext, FrameGraphicsProp } from "./types"

/** Resolve a static or scale-aware SVG graphics layer for a frame family. */
export function resolveFrameGraphics<S>(
  graphics: FrameGraphicsProp<S> | undefined,
  size: number[],
  margin: FrameGraphicsContext<S>["margin"],
  scales: S | null,
): ReactNode {
  return typeof graphics === "function"
    ? (graphics as (context: FrameGraphicsContext<S>) => ReactNode)({ size, margin, scales })
    : graphics
}
