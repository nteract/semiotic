// Band path geometry for ProcessSankey — pure SVG path builders.

import type {
  ProcessSankeyAttachment,
  ProcessSankeyEdge,
  ProcessSankeyLayout,
  ProcessSankeySample,
} from "./processSankeyTypes"

type Domain = readonly [number, number] | null | undefined

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

export function hasInventory(sample: ProcessSankeySample): boolean {
  return sample.topMass + sample.botMass > 0
}

export function attachmentYRange(att: ProcessSankeyAttachment, cl: number, S: number): [number, number] {
  const boundary = cl + (att.boundaryOffset ?? 0) * S
  const width = att.value * S
  const sideMass = (att.kind === "out" ? att.sideMassBefore : att.sideMassAfter) * S
  if (att.side === "top") {
    const top = boundary - sideMass
    return [top, top + width]
  }
  const bottom = boundary + sideMass
  return [bottom - width, bottom]
}

/** Interior inventory checkpoints in the authored time coordinate. */
export function intervalTimes(start: number, end: number, domain: Domain, midpoint: boolean): number[] {
  const times = new Set((domain ?? []).filter(t => start < t && t < end))
  if (midpoint) times.add((start + end) / 2)
  return [...times].sort((a, b) => a - b)
}

type BandSection = { x: number; top: number; bottom: number }

/** Keep every attachment covered at its event time and the observed thickness midway between events. */
function continuousSections(sections: BandSection[], domain: Domain, hasIntervalSamples: boolean): BandSection[] {
  const knots: BandSection[] = []
  for (let i = 0; i < sections.length;) {
    const first = sections[i]
    let end = i + 1
    let widest = first
    while (end < sections.length && sections[end].x === first.x) {
      const section = sections[end++]
      if (section.bottom - section.top > widest.bottom - widest.top) widest = section
    }
    const group = sections.slice(i, end)
    const last = sections[end - 1]
    if (group.every(s => s.top >= widest.top && s.bottom <= widest.bottom)) {
      if (first.top === first.bottom && first !== widest) knots.push(first)
      knots.push(widest)
      if (last.bottom === last.top && last !== widest) knots.push(last)
    } else {
      // Simultaneous attachments on opposite sides can have no containing section.
      for (const section of group) knots.push(section)
    }
    const next = sections[end]
    if (next && !hasIntervalSamples) {
      const stable = last.top === next.top && last.bottom === next.bottom
      for (const x of intervalTimes(last.x, next.x, domain, stable)) knots.push({ ...last, x })
    }
    i = end
  }
  return knots
}

export function buildBandPath(
  samples: readonly ProcessSankeySample[],
  cl: number,
  S: number,
  xScale: (t: number) => number,
  domain: Domain,
  curves: "straight" | "smooth" = "straight",
  hasIntervalSamples = false,
): string | null {
  if (samples.length === 0) return null
  const sections = samples.map(sample => {
    const boundary = cl + (sample.boundaryOffset ?? 0) * S
    return {
      x: sample.t,
      top: boundary - sample.topMass * S,
      bottom: boundary + sample.botMass * S,
    }
  })
  const knots = curves === "smooth" ? continuousSections(sections, domain, hasIntervalSamples) : sections
  for (const knot of knots) knot.x = xScale(clampTime(knot.x, domain))
  function side(points: BandSection[], edge: "top" | "bottom") {
    let path = `${points[0].x},${points[0][edge]}`
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1]
      const to = points[i]
      if (curves === "smooth" && from.x !== to.x && from[edge] !== to[edge]) {
        const middle = (from.x + to.x) / 2
        path += ` C${middle},${from[edge]} ${middle},${to[edge]} ${to.x},${to[edge]}`
      } else {
        path += ` L${to.x},${to[edge]}`
      }
    }
    return path
  }
  return `M${side(knots, "top")} L${side(knots.reverse(), "bottom")} Z`
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
  const clampX = (t: number): number => xScale(clampTime(t, domain))
  const first = data.samples.find(hasInventory) ?? data.samples[0]
  const last = data.samples.findLast(hasInventory) ?? data.samples[data.samples.length - 1]
  const xLeft = clampX(first.t)
  const xRight = clampX(last.t)
  // 20 screen pixels of gradient — width-independent of zoom/domain.
  const FADE_PX = 20
  const stubs: BandGradientStub[] = []
  function addStub(att: ProcessSankeyAttachment, left: number, right: number, x0: number, x1: number, from: 0 | 1) {
    if (!(right > left)) return
    const [top, bottom] = attachmentYRange(att, cl, S)
    stubs.push({
      pathD: `M${left},${top} L${right},${top} L${right},${bottom} L${left},${bottom} Z`,
      x0, x1, from, to: from === 0 ? 1 : 0,
    })
  }
  for (const e of edges) {
    const att = data.localAttachments.get(e.id)
    if (!att) continue
    if (e.source === nodeId && e.systemInTime != null && Number.isFinite(e.systemInTime)) {
      const renderedStartTime = visualDepartureByEdge?.get(e.id) ?? e.startTime
      if (att.kind === "out" && e.systemInTime < renderedStartTime) {
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
        addStub(att, Math.max(xLeft, xGradStart), xStart, xGradStart, xGradEnd, 0)
      }
    }
    if (e.target === nodeId && e.systemOutTime != null && Number.isFinite(e.systemOutTime)) {
      if (att.kind === "in" && e.systemOutTime > e.endTime) {
        const xSysOut = clampX(e.systemOutTime)
        const xEnd = clampX(e.endTime)
        // Mirror of systemIn: gradient saturated at `xSysOut`,
        // transparent at `xSysOut + FADE_PX`. Rect clipped to the
        // band's right edge.
        const xGradEnd = xSysOut + FADE_PX
        addStub(att, xEnd, Math.min(xRight, xGradEnd), xSysOut, xGradEnd, 1)
      }
    }
  }
  return stubs
}
