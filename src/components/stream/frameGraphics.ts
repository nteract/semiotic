import type { ReactNode } from "react"
import type { FrameGraphicsContext, FrameGraphicsProp } from "./types"
import { resolveFrameSurfaceBackground } from "./canvasBackground"

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

export interface ResolveFrameLayersOptions<S> {
  foregroundGraphics?: FrameGraphicsProp<S>
  backgroundGraphics?: FrameGraphicsProp<S>
  size: number[]
  margin: FrameGraphicsContext<S>["margin"]
  scales: S | null
  background?: string
  themeBackgroundColor: string
  /** A subscribed wrapper owns function-form resolution when false. */
  resolveScaleAwareGraphics?: boolean
}

/** Resolve both authored SVG layers and the full-frame themed surface once. */
export function resolveFrameLayers<S>({
  foregroundGraphics,
  backgroundGraphics,
  size,
  margin,
  scales,
  background,
  themeBackgroundColor,
  resolveScaleAwareGraphics = true
}: ResolveFrameLayersOptions<S>): {
  resolvedForeground: ReactNode
  resolvedBackground: ReactNode
  themeBackground: string
  surfaceBackground: string | null
} {
  const themeBackground = `var(--semiotic-bg, ${themeBackgroundColor})`
  return {
    resolvedForeground: !resolveScaleAwareGraphics && typeof foregroundGraphics === "function"
      ? null
      : resolveFrameGraphics(foregroundGraphics, size, margin, scales),
    resolvedBackground: !resolveScaleAwareGraphics && typeof backgroundGraphics === "function"
      ? null
      : resolveFrameGraphics(backgroundGraphics, size, margin, scales),
    themeBackground,
    surfaceBackground: resolveFrameSurfaceBackground({
      background,
      hasBackgroundGraphics: Boolean(backgroundGraphics),
      themeBackground
    })
  }
}
