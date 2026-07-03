import type { GlyphSceneNode } from "../types"
import type { NetworkGlyphNode, NetworkSceneNode } from "../networkTypes"
import type { StreamRendererFn } from "./types"
import { resolveCanvasFill } from "./canvasRenderHelpers"
import {
  drawGlyphParts,
  glyphFractionClipRect,
  glyphPlacement,
} from "../glyphDef"

/**
 * Canvas painter for `GlyphSceneNode` — the composite-pictogram channel. The
 * sibling of `symbolCanvasRenderer` for multi-part signs: it stamps a
 * `GlyphDef` at the node's position with the node's `color`/`accent` paints,
 * honoring anchor, rotation, and partial fill (`fraction`/`fractionStart`,
 * with an optional full-extent `ghostColor` silhouette underneath so partial
 * unit signs stay countable). Part geometry parses once into cached `Path2D`s
 * (`glyphDef.getGlyphPath2D`), so a unit chart stamping one definition
 * hundreds of times pays the parse once.
 *
 * Alpha honors the incoming canvas alpha (chart-wide staleness dim) times the
 * node's own opacity and decay, matching every other mark renderer.
 */
function paintGlyph(
  ctx: CanvasRenderingContext2D,
  node: GlyphSceneNode | NetworkGlyphNode,
  x: number,
  y: number,
  baseAlpha: number
): void {
  if (node.size <= 0) return
  const def = node.glyph
  if (!def || !def.parts?.length) return
  const placement = glyphPlacement(def, node.size)
  if (placement.scale <= 0) return

  const decay = (node as GlyphSceneNode)._decayOpacity ?? 1
  const nodeAlpha = (node.style.opacity ?? 1) * decay
  if (nodeAlpha <= 0) return

  const resolvePaint = (paint: string) => {
    const resolved = resolveCanvasFill(ctx, paint, paint)
    return typeof resolved === "string" ? resolved : paint
  }
  const color =
    node.color ?? (typeof node.style.fill === "string" ? node.style.fill : undefined)

  ctx.save()
  ctx.translate(x, y)
  if (node.rotation) ctx.rotate(node.rotation)
  ctx.translate(placement.offsetX, placement.offsetY)
  ctx.scale(placement.scale, placement.scale)
  ctx.globalAlpha = baseAlpha * nodeAlpha * (node.style.fillOpacity ?? 1)

  const clip = glyphFractionClipRect(
    def,
    node.fraction ?? 1,
    node.fractionStart ?? 0,
    node.fractionDirection ?? "horizontal"
  )
  if (clip && node.ghostColor) {
    drawGlyphParts(ctx, def, color, node.accent, node.ghostColor, resolvePaint)
  }
  if (clip) {
    ctx.beginPath()
    ctx.rect(clip.x, clip.y, clip.width, clip.height)
    ctx.clip()
  }
  drawGlyphParts(ctx, def, color, node.accent, undefined, resolvePaint)
  ctx.restore()
}

/** XY / ordinal / geo painter (x/y-positioned glyph nodes). */
export const glyphCanvasRenderer: StreamRendererFn = (ctx, nodes) => {
  const baseAlpha = ctx.globalAlpha
  for (const node of nodes) {
    if (node.type !== "glyph") continue
    const g = node as GlyphSceneNode
    paintGlyph(ctx, g, g.x, g.y, baseAlpha)
  }
  ctx.globalAlpha = baseAlpha
}

/** Network painter (cx/cy-positioned glyph nodes). */
export function networkGlyphRenderer(
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[]
): void {
  const baseAlpha = ctx.globalAlpha
  for (const node of nodes) {
    if (node.type !== "glyph") continue
    paintGlyph(ctx, node, node.cx, node.cy, baseAlpha)
  }
  ctx.globalAlpha = baseAlpha
}
