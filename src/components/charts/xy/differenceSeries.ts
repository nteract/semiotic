import type { LineRow } from "./differenceSegments"
import { buildLineNode } from "../../stream/SceneGraph"
import { cacheMultiHoverScene } from "../../stream/xyMultiHover"
import type { LineSceneNode, StreamXYFrameProps } from "../../stream/types"

/** Only the two source series supply tooltip samples. Crossovers belong to the fill. */
export function differenceHoverScene(
  showLines: boolean,
  getRows: () => LineRow[],
  colorA: string,
  colorB: string,
  curve: LineSceneNode["curve"]
): NonNullable<StreamXYFrameProps["multiHoverScene"]> {
  return cacheMultiHoverScene((scene, scales) => {
    if (showLines) return scene.filter(node => node.type === "line")
    // With the strokes hidden, project the source rows only when hover needs them.
    const rows = getRows()
    return [colorA, colorB].map((stroke, index) => {
      const group = index === 0 ? "line-A" : "line-B"
      const node = buildLineNode(rows.filter(d => d.__diffSegment === group),
        scales, d => d.__x, d => d.__y, { stroke }, group)
      node.curve = curve
      return node
    })
  })
}
