import type { Datum } from "../charts/shared/datumTypes"
import { glyphHitGeometry, type GlyphDef } from "./glyphDef"
import { symbolRadius } from "./symbolPath"

export type NetworkAnnotationAnchorNode = {
  type: string
  datum: Datum | null
  id?: string
  x?: number
  y?: number
  cx?: number
  cy?: number
  w?: number
  h?: number
  /** Circle nodes (NetworkCircleNode, force/tree/orbit marks) carry an explicit radius. */
  r?: number
  /** Arc nodes (chord, radial) carry an outer radius. */
  outerR?: number
  /** Symbol nodes carry a d3-symbol area; glyph nodes reuse `size` as rendered height. */
  size?: number
  /** Glyph nodes (the composite-pictogram channel) carry a definition. */
  glyph?: GlyphDef
}

export type NetworkAnnotationAnchor = {
  pointId?: string
  x: number
  y: number
  r: number
}

/** Anchor id for a scene node — resolves `pointId` annotations to a mark. */
export function nodeAnchorId(node: NetworkAnnotationAnchorNode): string | undefined {
  const id = node.id ?? node.datum?.id ?? node.datum?.data?.id ?? node.datum?.data?.name
  return id == null ? undefined : String(id)
}

/** Center + effective radius of a network scene node for annotation anchoring. */
export function nodeCenter(
  node: NetworkAnnotationAnchorNode,
): { x: number; y: number; r: number } | null {
  // Composite glyphs have a rendered-bounds center that may differ from cx/cy.
  if (node.type === "glyph" && node.glyph && typeof node.size === "number") {
    const cx = node.cx ?? node.x
    const cy = node.cy ?? node.y
    if (typeof cx !== "number" || typeof cy !== "number") return null
    const geometry = glyphHitGeometry(node.glyph, node.size)
    return {
      x: cx + geometry.centerDx,
      y: cy + geometry.centerDy,
      r: Math.max(1, geometry.radius),
    }
  }
  const x = node.cx ?? (node.x != null && node.w != null ? node.x + node.w / 2 : node.x)
  const y = node.cy ?? (node.y != null && node.h != null ? node.y + node.h / 2 : node.y)
  if (typeof x !== "number" || typeof y !== "number") return null
  const r =
    typeof node.r === "number"
      ? Math.max(1, node.r)
      : typeof node.outerR === "number"
        ? Math.max(1, node.outerR)
        : typeof node.size === "number"
          ? Math.max(1, symbolRadius(node.size))
          : Math.max(1, node.w ?? 0, node.h ?? 0) / 2
  return { x, y, r }
}

/** Collect the stable annotation anchors exposed by a laid-out network scene. */
export function collectNetworkAnnotationAnchors(
  nodes: ReadonlyArray<NetworkAnnotationAnchorNode> | undefined,
): NetworkAnnotationAnchor[] | undefined {
  if (!nodes) return undefined
  const anchors: NetworkAnnotationAnchor[] = []
  for (const node of nodes) {
    const center = nodeCenter(node)
    if (center) anchors.push({ pointId: nodeAnchorId(node), ...center })
  }
  return anchors
}
