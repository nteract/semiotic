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
  boundaryOffset?: number
}

export type ProcessSankeyRibbonLaneInput = "source" | "target" | "both"
type XScale = (t: number) => number

const AUTO_MINIMUM_BEND_RADIUS = 8
const AUTO_MAXIMUM_RUN = 144

export interface ProcessSankeyRibbonInputOptions {
  /** Desired total ribbon run along the rendered time axis, in pixels.
   * `"auto"` derives the run needed for an 8px minimum endpoint bend
   * radius, capped at 144px. Omit to preserve exact attachment timing. */
  minRun?: number | "auto"
  /** Earliest proven time at which this feeder's source attachment can be
   * rendered. The caller owns feeder detection and stock validation; without
   * this value `minRun` deliberately has no effect. */
  sourceRunwayStart?: number
}

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
  lane: ProcessSankeyRibbonLaneInput,
  domain: [number, number] | null,
  options: ProcessSankeyRibbonInputOptions = {},
): RibbonGeometryInput {
  const S = valueScale
  const clampTime = (t: number): number => {
    if (!domain) return t
    return Math.max(domain[0], Math.min(domain[1], t))
  }

  let sx = xScale(clampTime(srcAtt.time))
  const tx = xScale(clampTime(tgtAtt.time))

  // attachmentYRange-equivalent — top/bottom y of the ribbon band at
  // each end. Source attachment reads sideMassBefore (mass stacked
  // above before this out-edge attaches); target reads sideMassAfter
  // (mass stacked after this in-edge attaches).
  const srcV = srcAtt.value * S
  const tgtV = tgtAtt.value * S
  const srcBoundary = srcCenterline + (srcAtt.boundaryOffset ?? 0) * S
  const tgtBoundary = tgtCenterline + (tgtAtt.boundaryOffset ?? 0) * S
  const srcBefore = srcAtt.sideMassBefore * S
  const tgtAfter = tgtAtt.sideMassAfter * S

  let sTop: number, sBot: number
  if (srcAtt.side === "top") {
    sTop = srcBoundary - srcBefore
    sBot = sTop + srcV
  } else {
    sBot = srcBoundary + srcBefore
    sTop = sBot - srcV
  }

  let tTop: number, tBot: number
  if (tgtAtt.side === "top") {
    tTop = tgtBoundary - tgtAfter
    tBot = tTop + tgtV
  } else {
    tBot = tgtBoundary + tgtAfter
    tTop = tBot - tgtV
  }

  // A feeder can have years of proven stock immediately before a very short
  // dated transaction. Rendering that transaction only between start/end can
  // compress a large cross-lane turn into a few pixels, which is smooth in a
  // calculus sense but reads as a right angle. Borrow only the source runway
  // the caller has explicitly proved; logical attachment times and mass
  // ranges remain untouched.
  const sourceRunwayStart = options.sourceRunwayStart
  const minRun = options.minRun
  const sourceCenter = (sTop + sBot) / 2
  const targetCenter = (tTop + tBot) / 2
  const laneDistance = Math.abs(targetCenter - sourceCenter)
  const logicalRun = tx - sx
  const hasRunway = typeof sourceRunwayStart === "number" && Number.isFinite(sourceRunwayStart)
  const numericRun = typeof minRun === "number" && Number.isFinite(minRun) && minRun > 0

  if (hasRunway && laneDistance > 1e-9 && logicalRun > 0 && (minRun === "auto" || numericRun)) {
    const control = lane === "source" ? 0.85 : lane === "target" ? 0.15 : 0.5
    // For P0=(0,0), P1=(cD,0), P2=(cD,L), P3=(D,L), the smaller
    // endpoint radius is 1.5*min(c²,(1-c)²)*D²/L. Solve for D.
    const radiusCoefficient = 1.5 * Math.min(control * control, (1 - control) * (1 - control))
    const desiredRun = minRun === "auto"
      ? Math.min(
          AUTO_MAXIMUM_RUN,
          Math.sqrt(AUTO_MINIMUM_BEND_RADIUS * laneDistance / radiusCoefficient),
        )
      : minRun

    if (desiredRun > logicalRun) {
      const runwayX = xScale(clampTime(Math.min(sourceRunwayStart, srcAtt.time)))
      if (Number.isFinite(runwayX)) {
        const earliestSourceX = Math.min(sx, runwayX)
        sx = Math.min(sx, Math.max(earliestSourceX, tx - desiredRun))
      }
    }
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

interface FeederBatchEdge {
  id: string
  source: string
  startTime: number
}

/**
 * Give every ribbon in one source/timestamp departure batch a shared visual
 * source. A band is a single contiguous silhouette, so independently pulling
 * an inner attachment ahead of its neighbors would require holes in that
 * silhouette. The latest runway floor in the batch remains authoritative;
 * an edge without proven runway conservatively keeps the whole batch exact.
 */
export function synchronizeProcessSankeyFeederBatches(
  edges: readonly FeederBatchEdge[],
  inputsByEdge: ReadonlyMap<string, RibbonGeometryInput>,
  runwayStartByEdge: ReadonlyMap<string, number>,
  xScale: XScale,
  lane: ProcessSankeyRibbonLaneInput,
  sourceGroupByNode?: ReadonlyMap<string, string>,
): Map<string, RibbonGeometryInput> {
  const synchronized = new Map(inputsByEdge)
  const batchesBySource = new Map<string, Map<number, FeederBatchEdge[]>>()

  for (const edge of edges) {
    const group = sourceGroupByNode?.get(edge.source)
    const batchOwner = group == null ? `node:${edge.source}` : `group:${group}`
    const byTime = batchesBySource.get(batchOwner) ?? new Map<number, FeederBatchEdge[]>()
    const batch = byTime.get(edge.startTime) ?? []
    batch.push(edge)
    byTime.set(edge.startTime, batch)
    batchesBySource.set(batchOwner, byTime)
  }

  for (const byTime of batchesBySource.values()) {
    for (const [startTime, batch] of byTime) {
      if (!batch.some((edge) => runwayStartByEdge.has(edge.id))) continue
      const batchInputs = batch.map((edge) => inputsByEdge.get(edge.id))
      if (batchInputs.some((input) => input == null)) continue

      const authoredX = xScale(startTime)
      const earliestRequestedX = Math.min(...batchInputs.map((input) => input!.sx))
      if (!(earliestRequestedX < authoredX - 1e-9)) continue
      const latestSafeX = Math.max(...batch.map((edge) => {
        const runwayStart = runwayStartByEdge.get(edge.id)
        return runwayStart == null ? authoredX : Math.min(authoredX, xScale(runwayStart))
      }))
      const sharedSourceX = Math.min(authoredX, Math.max(earliestRequestedX, latestSafeX))

      for (const edge of batch) {
        const input = inputsByEdge.get(edge.id)!
        const control = lane === "source" ? 0.85 : lane === "target" ? 0.15 : 0.5
        const cx = sharedSourceX + (input.tx - sharedSourceX) * control
        synchronized.set(edge.id, {
          ...input,
          sx: sharedSourceX,
          cp1X: cx,
          cp2X: cx,
        })
      }
    }
  }

  return synchronized
}
