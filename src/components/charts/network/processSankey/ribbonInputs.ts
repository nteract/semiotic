/**
 * Compute the `RibbonGeometryInput` shape for a ProcessSankey ribbon
 * from its source/target attachment data. Both the HOC (CSR) and the
 * pure scene builder (SSR) call this so the coords feeding into the
 * shared `buildRibbonGeometry` helper match between the two paths.
 *
 * Replaces `algorithm.js`'s `buildRibbonPath` — the path-D formula
 * itself moved into `buildRibbonGeometry` so SankeyDiagram and
 * ProcessSankey emit identical M-C-L-C-Z shapes.
 */
import type { RibbonGeometryInput } from "../../../geometry/ribbonGeometry"

type Side = "top" | "bot"
type Kind = "in" | "out"

interface AttachmentLike {
  side: Side
  time: number
  sideMassBefore: number
  sideMassAfter: number
  kind: Kind
  value: number
}

type RibbonLane = "source" | "target" | "both"
type XScale = (t: number) => number

/**
 * Build the geometry inputs for a single ProcessSankey ribbon. The
 * source attachment is assumed to be `kind: "out"` (the value leaves
 * the source on its outgoing side); the target attachment is
 * `kind: "in"`. attachmentYRange's formula is inlined here to keep
 * this module pure TS (the `algorithm.js` version is JS-only).
 */
export function computeProcessSankeyRibbonInputs(
  srcAtt: AttachmentLike,
  srcCenterline: number,
  tgtAtt: AttachmentLike,
  tgtCenterline: number,
  valueScale: number,
  xScale: XScale,
  lane: RibbonLane,
  domain: [number, number] | null,
): RibbonGeometryInput {
  const S = valueScale
  const clampTime = (t: number): number => {
    if (!domain) return t
    return Math.max(domain[0], Math.min(domain[1], t))
  }

  const sx = xScale(clampTime(srcAtt.time))
  const tx = xScale(clampTime(tgtAtt.time))

  // attachmentYRange-equivalent — top/bottom y of the ribbon band at
  // each end. Source attachment reads sideMassBefore (mass stacked
  // above before this out-edge attaches); target reads sideMassAfter
  // (mass stacked after this in-edge attaches).
  const srcV = srcAtt.value * S
  const tgtV = tgtAtt.value * S
  const srcBefore = srcAtt.sideMassBefore * S
  const tgtAfter = tgtAtt.sideMassAfter * S

  let sTop: number, sBot: number
  if (srcAtt.side === "top") {
    sTop = srcCenterline - srcBefore
    sBot = sTop + srcV
  } else {
    sBot = srcCenterline + srcBefore
    sTop = sBot - srcV
  }

  let tTop: number, tBot: number
  if (tgtAtt.side === "top") {
    tTop = tgtCenterline - tgtAfter
    tBot = tTop + tgtV
  } else {
    tBot = tgtCenterline + tgtAfter
    tTop = tBot - tgtV
  }

  // `cp1X === cp2X` for ProcessSankey — the lane choice picks a
  // single x position where the bend concentrates, in contrast to
  // Sankey's two-point curvature-based S-curve.
  const cx = lane === "source" ? sx + (tx - sx) * 0.85
           : lane === "target" ? sx + (tx - sx) * 0.15
           : (sx + tx) / 2

  return {
    sx, sTop, sBot,
    tx, tTop, tBot,
    cp1X: cx,
    cp2X: cx,
  }
}
