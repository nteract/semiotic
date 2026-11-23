import { clamp } from "../../../utils/clamp"
import { appendToGroup } from "../../../utils/appendToGroup"
import { attachmentYRange, clampTime } from "./bandPaths"
import type { ProcessSankeyAttachment } from "./processSankeyTypes"
import type { RibbonGeometryInput } from "../../../geometry/ribbonGeometry"

export type ProcessSankeyRibbonLaneInput = "source" | "target" | "both"
type XScale = (t: number) => number

export function laneControl(lane?: ProcessSankeyRibbonLaneInput) {
  return lane === "source" ? 0.85 : lane === "target" ? 0.15 : 0.5
}

const AUTO_MINIMUM_BEND_RADIUS = 8
const AUTO_MAXIMUM_RUN = 144

export interface ProcessSankeyRibbonInputOptions {
  /** Desired total ribbon run along the rendered time axis, in pixels.
   * `"auto"` derives the run needed for an 8px minimum endpoint bend
   * radius, capped at 144px. Omit to preserve exact attachment timing. */
  minRun?: number | "auto"
  /** Earliest proven time at which this feeder's source attachment can be
   * rendered. The caller owns feeder detection and stock validation; without
   * this value `minRun` has no effect. */
  sourceRunwayStart?: number
}

export function computeProcessSankeyRibbonInputs(
  srcAtt: ProcessSankeyAttachment,
  srcCenterline: number,
  tgtAtt: ProcessSankeyAttachment,
  tgtCenterline: number,
  valueScale: number,
  xScale: XScale,
  lane: ProcessSankeyRibbonLaneInput,
  domain: [number, number] | null,
  options: ProcessSankeyRibbonInputOptions = {},
): RibbonGeometryInput {
  const timeToX = (t: number) => xScale(clampTime(t, domain))
  let sx = timeToX(srcAtt.time)
  const tx = timeToX(tgtAtt.time)
  const [sTop, sBot] = attachmentYRange(srcAtt, srcCenterline, valueScale)
  const [tTop, tBot] = attachmentYRange(tgtAtt, tgtCenterline, valueScale)

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
  const control = laneControl(lane)
  const logicalRun = tx - sx
  const hasRunway = typeof sourceRunwayStart === "number" && Number.isFinite(sourceRunwayStart)
  const numericRun = typeof minRun === "number" && Number.isFinite(minRun) && minRun > 0

  if (hasRunway && laneDistance > 1e-9 && logicalRun > 0 && (minRun === "auto" || numericRun)) {
    // For P0=(0,0), P1=(cD,0), P2=(cD,L), P3=(D,L), the smaller
    // endpoint radius is 1.5*min(c²,(1-c)²)*D²/L. Solve for D.
    const radiusCoefficient = 1.5 * Math.min(control * control, (1 - control) * (1 - control))
    const desiredRun = minRun === "auto"
      ? Math.min(
          AUTO_MAXIMUM_RUN,
          Math.sqrt(
              (AUTO_MINIMUM_BEND_RADIUS * laneDistance) / radiusCoefficient),
        )
      : minRun

    if (desiredRun > logicalRun) {
      const runwayX = timeToX(Math.min(sourceRunwayStart, srcAtt.time))
      if (Number.isFinite(runwayX)) {
        const earliestSourceX = Math.min(sx, runwayX)
        sx = clamp(tx - desiredRun, earliestSourceX, sx)
      }
    }
  }

  // `cp1X === cp2X` for ProcessSankey — the lane choice picks a
  // single x position where the bend concentrates, in contrast to
  // Sankey's two-point curvature-based S-curve.
  const cx = sx + (tx - sx) * control

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
  const batches = new Map<string, FeederBatchEdge[]>()
  for (const edge of edges) {
    const group = sourceGroupByNode?.get(edge.source)
    const owner = group == null ? `node:${edge.source}` : `group:${group}`
    appendToGroup(batches, `${edge.startTime}/${owner}`, edge)
  }

  const control = laneControl(lane)
  for (const batch of batches.values()) {
    if (!batch.some(edge => runwayStartByEdge.has(edge.id))) continue
    const authoredX = xScale(batch[0].startTime)
    let earliest = Infinity
    let latest = -Infinity
    for (const edge of batch) {
      const input = inputsByEdge.get(edge.id)
      if (!input) {
        earliest = Infinity
        break
      }
      if (input.sx < earliest) earliest = input.sx
      const runway = runwayStartByEdge.get(edge.id)
      const safe = runway == null ? authoredX : xScale(runway)
      if (safe > latest) latest = safe
    }
    if (!(earliest < authoredX - 1e-9)) continue
    const sx = Math.min(authoredX, Math.max(earliest, latest))
    for (const edge of batch) {
      const input = inputsByEdge.get(edge.id)!
      const cx = sx + (input.tx - sx) * control
      synchronized.set(edge.id, { ...input, sx, cp1X: cx, cp2X: cx })
    }
  }

  return synchronized
}
