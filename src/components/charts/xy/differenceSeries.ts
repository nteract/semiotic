import type { Datum } from "../shared/datumTypes"
import { buildLineNode } from "../../stream/SceneGraph"
import { cacheMultiHoverScene } from "../../stream/xyMultiHover"
import type { LineSceneNode, StreamXYFrameProps } from "../../stream/types"

/** A vertex on one of the two continuous overlay lines. */
interface LineRow {
  __x: number
  __y: number
  /** Either `"line-A"` or `"line-B"`. Acts as the line group key. */
  __diffSegment: string
  /** Retained on line vertices so selection can match area and line marks. */
  __diffWinner: "A" | "B"
  /** Original source row for field-based styleRules. */
  __sourceDatum?: Datum
}

/**
 * Build the parallel line-data rows so we can render the two original
 * series as continuous lines on top of the difference fill in the same
 * frame. Returning two groups (`"line-A"` and `"line-B"`) keyed by
 * `__diffSegment` lets the mixed scene builder pick them up as line
 * groups while the segment groups go to the area builder.
 */
export function buildOverlayLineRows<TDatum extends Datum>(
  raw: TDatum[],
  getX: (d: TDatum) => number,
  getA: (d: TDatum) => number,
  getB: (d: TDatum) => number
): LineRow[] {
  const out: LineRow[] = []
  for (const datum of raw) {
    const x = getX(datum)
    if (!Number.isFinite(x)) continue
    const append = (series: "A" | "B", value: number) => {
      if (Number.isFinite(value)) out.push({
        __x: x, __y: value, __diffSegment: `line-${series}`, __diffWinner: series, __sourceDatum: datum
      })
    }
    append("A", getA(datum))
    append("B", getB(datum))
  }
  return out.sort((a, b) => a.__x - b.__x)
}

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
