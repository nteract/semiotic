// Band path geometry for ProcessSankey — pure SVG path builders.

import type {
  ProcessSankeyAttachment,
  ProcessSankeyEdge,
  ProcessSankeyLayout,
  ProcessSankeySample,
} from "./processSankeyTypes"

type Domain = [number, number] | null | undefined

export function clampTime(t: number, domain: Domain): number {
  if (!domain) return t
  return Math.max(domain[0], Math.min(domain[1], t))
}

export function clampSamples(samples: readonly ProcessSankeySample[], domain: Domain): ProcessSankeySample[] {
  return samples.map((s) => ({
    t: clampTime(s.t, domain),
    topMass: s.topMass,
    botMass: s.botMass,
    ...(s.boundaryOffset != null && { boundaryOffset: s.boundaryOffset }),
  }))
}

export function attachmentYRange(att: ProcessSankeyAttachment, cl: number, S: number): [number, number] {
  const boundary = cl + (att.boundaryOffset ?? 0) * S
  const v = att.value * S
  if (att.kind === "out") {
    const before = att.sideMassBefore * S
    if (att.side === "top") {
      const oldTop = boundary - before
      return [oldTop, oldTop + v]
    }
    const oldBot = boundary + before
    return [oldBot - v, oldBot]
  }
  const after = att.sideMassAfter * S
  if (att.side === "top") {
    const newTop = boundary - after
    return [newTop, newTop + v]
  }
  const newBot = boundary + after
  return [newBot - v, newBot]
}

function collectEndpointPositions(
  edges: readonly ProcessSankeyEdge[],
  nodeData: Readonly<Record<string, ProcessSankeyNodeData>>,
  centerlines: Readonly<Record<string, number>>,
  valueScale: number,
): Map<string, ProcessSankeyEndpointPositions> {
  const positions = new Map<string, ProcessSankeyEndpointPositions>()
  for (const edge of edges) {
    const sourceAttachment = nodeData[edge.source]?.localAttachments.get(edge.id)
    const targetAttachment = nodeData[edge.target]?.localAttachments.get(edge.id)
    const sourceCenter = centerlines[edge.source]
    const targetCenter = centerlines[edge.target]
    if (!sourceAttachment || !targetAttachment ||
        !Number.isFinite(sourceCenter) || !Number.isFinite(targetCenter)) continue
    const sourceRange = attachmentYRange(sourceAttachment, sourceCenter, valueScale)
    const targetRange = attachmentYRange(targetAttachment, targetCenter, valueScale)
    positions.set(edge.id, {
      source: (sourceRange[0] + sourceRange[1]) / 2,
      target: (targetRange[0] + targetRange[1]) / 2,
    })
  }
  return positions
}

function hasResolvableAttachmentTies(
  edgeIndex: ProcessSankeyEdgeIndex,
  sides: ReadonlyMap<string, ProcessSankeySideRecord>,
): boolean {
  const containsTie = (
    edgeLists: readonly ProcessSankeyEdge[][],
    kind: "in" | "out",
  ): boolean => {
    for (const edgeList of edgeLists) {
      const seen = new Map<string, string>()
      for (const edge of edgeList) {
        const side = kind === "out" ? sides.get(edge.id)?.sourceSide : sides.get(edge.id)?.targetSide
        const localTime = kind === "out" ? edge.startTime : edge.endTime
        const localKey = `${side ?? ""}\u0000${localTime}`
        const farKey = kind === "out"
          ? `${edge.target}\u0000${edge.endTime}`
          : `${edge.source}\u0000${edge.startTime}`
        const previous = seen.get(localKey)
        if (previous != null && previous !== farKey) return true
        seen.set(localKey, farKey)
      }
    }
    return false
  }
  return containsTie(Object.values(edgeIndex.outgoing), "out") ||
    containsTie(Object.values(edgeIndex.incoming), "in")
}

export function buildBandPath(
  samples: readonly ProcessSankeySample[],
  cl: number,
  S: number,
  xScale: (t: number) => number,
  domain: Domain,
): string | null {
  if (samples.length === 0) return null
  const sm = clampSamples(samples, domain)
  const boundary = (i: number) => cl + (sm[i].boundaryOffset ?? 0) * S
  const yTop = (i: number) => boundary(i) - sm[i].topMass * S
  const yBot = (i: number) => boundary(i) + sm[i].botMass * S
  let path = `M${xScale(sm[0].t)},${yTop(0)}`
  for (let i = 1; i < sm.length; i++) {
    path += ` L${xScale(sm[i].t)},${yTop(i)}`
  }
  path += ` L${xScale(sm[sm.length - 1].t)},${yBot(sm.length - 1)}`
  for (let i = sm.length - 2; i >= 0; i--) {
    path += ` L${xScale(sm[i].t)},${yBot(i)}`
  }
  return path + " Z"
}

/**
 * One 20-px gradient stub at an attachment with `systemInTime` /
 * `systemOutTime`. Rendered as its own bezier scene-edge with a
 * horizontal gradient, painted underneath the band. The band
 * paints with `fill: none` whenever any stubs are present, so the
 * stub gradients are the only colored regions inside the band's
 * outline.
 */
export interface BandGradientStub {
  /** Rect path (M-L-L-L-Z). */
  pathD: string
  /** Gradient extent in screen pixels. */
  x0: number
  x1: number
  /** Color stops — 0 = transparent end, 1 = band-color end. */
  from: 0 | 1
  to: 0 | 1
}

/**
 * Build the per-edge 20-px gradient stubs that visualize
 * `systemInTime` / `systemOutTime` on a node band. Each stub is
 * a rect on the edge's attachment slot, painted with a horizontal
 * gradient that fades the band color in (or out) over 20 screen
 * pixels and saturates through the rest of the rect.
 *
 * The rect is clipped to the band's outline bounds (so cutouts don't
 * spill outside the node shape), but the gradient extent stays at
 * its natural range. In-domain entrances use
 * `[xSysIn - FADE_PX, xSysIn]`; entrances known to predate the visible
 * domain use `[domainStart, domainStart + FADE_PX]` so they blur inward
 * rather than completing their fade offscreen. Exits use
 * `[xSysOut, xSysOut + FADE_PX]`. The canvas renderer uses pad-mode
 * clamping for color stops outside the rect.
 *
 * Pure rendering hint — layout/mass-profile unchanged. Returns an
 * empty array when the node has no qualifying edges.
 */
export function buildBandCutoutsForNode(
  nodeId: string,
  edges: ProcessSankeyEdge[],
  layout: ProcessSankeyLayout,
  xScale: (t: number) => number,
  domain: Domain,
  visualDepartureByEdge?: ReadonlyMap<string, number>,
): BandGradientStub[] {
  const data = layout.nodeData[nodeId]
  if (!data || data.samples.length === 0) return []
  const S = layout.valueScale
  const cl = layout.centerlines[nodeId]
  const sm = clampSamples(data.samples, domain)
  const firstNonZero = sm.find((s) => s.topMass + s.botMass > 0) || sm[0]
  const lastNonZero = [...sm].reverse().find((s) => s.topMass + s.botMass > 0) || sm[sm.length - 1]
  const xLeft = xScale(firstNonZero.t)
  const xRight = xScale(lastNonZero.t)
  const clampX = (t: number): number => xScale(clampTime(t, domain))
  // 20 screen pixels of gradient — width-independent of zoom/domain.
  const FADE_PX = 20
  const stubs: BandGradientStub[] = []
  const rect = (x0: number, yT: number, x1: number, yB: number): string =>
    `M${x0},${yT} L${x1},${yT} L${x1},${yB} L${x0},${yB} Z`
  for (const e of edges) {
    if (e.source === nodeId && e.systemInTime != null && Number.isFinite(e.systemInTime)) {
      const att = data.localAttachments.get(e.id)
      const renderedStartTime = visualDepartureByEdge?.get(e.id) ?? e.startTime
      if (att && att.kind === "out" && e.systemInTime < renderedStartTime) {
        const xSysIn = clampX(e.systemInTime)
        const xStart = clampX(renderedStartTime)
        const predatesVisibleDomain = domain != null && e.systemInTime < domain[0]
        // An arrival inside the domain fades up to its event. An entity known
        // only to predate the visible domain instead fades inward from the
        // cropped boundary; placing its transparent stop outside the plot
        // would pad-clamp the entire visible band to an unintended solid fill.
        const xGradStart = predatesVisibleDomain ? xSysIn : xSysIn - FADE_PX
        const xGradEnd = predatesVisibleDomain
          ? Math.min(xStart, xSysIn + FADE_PX)
          : xSysIn
        // Rect extent is clipped to the band's visible span. Pre-domain
        // lifecycles deliberately put the transparent stop on that span's
        // boundary and fade inward; in-domain lifecycles retain the
        // conventional lead-in fade ending at `systemInTime`.
        const xRectStart = Math.max(xLeft, xGradStart)
        if (xStart > xRectStart) {
          const [yT, yB] = attachmentYRange(att, cl, S)
          stubs.push({
            pathD: rect(xRectStart, yT, xStart, yB),
            x0: xGradStart,
            x1: xGradEnd,
            from: 0,
            to: 1,
          })
        }
      }
    }
    if (e.target === nodeId && e.systemOutTime != null && Number.isFinite(e.systemOutTime)) {
      const att = data.localAttachments.get(e.id)
      if (att && att.kind === "in" && e.systemOutTime > e.endTime) {
        const xSysOut = clampX(e.systemOutTime)
        const xEnd = clampX(e.endTime)
        // Mirror of systemIn: gradient saturated at `xSysOut`,
        // transparent at `xSysOut + FADE_PX`. Rect clipped to the
        // band's right edge.
        const xGradEnd = xSysOut + FADE_PX
        const xRectEnd = Math.min(xRight, xGradEnd)
        if (xRectEnd > xEnd) {
          const [yT, yB] = attachmentYRange(att, cl, S)
          stubs.push({
            pathD: rect(xEnd, yT, xRectEnd, yB),
            x0: xSysOut,
            x1: xGradEnd,
            from: 1,
            to: 0,
          })
        }
      }
    }
  }
  return stubs
}
