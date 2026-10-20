import type { Style } from "../types"
import type { GlyphDef } from "../glyphDef"
import type { PhysicsBodyState } from "./PhysicsKernel"

/** Shared vertices keep the canvas and settled SVG polygon paths identical. */
export function physicsPolygonVertices(
  x: number,
  y: number,
  radius: number,
  sides: number
): [number, number][] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = (2 * Math.PI * index) / sides - Math.PI / 2
    return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius]
  })
}

export function resolveBodyGlyph(
  body: PhysicsBodyState,
  style: Style
): GlyphDef | undefined {
  return typeof style.glyph === "function"
    ? style.glyph(
        body.datum && typeof body.datum === "object"
          ? (body.datum as Record<string, unknown>)
          : {}
      )
    : style.glyph
}
