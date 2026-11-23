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
  return samples.map(sample => ({ ...sample, t: clampTime(sample.t, domain) }))
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

type BandSection = { x: number; top: number; bottom: number; boundary?: number }

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

export function projectBandSections(
  samples: readonly ProcessSankeySample[],
  cl: number,
  S: number,
  xScale: (t: number) => number,
  domain: Domain,
  curves: "straight" | "smooth" = "straight",
  hasIntervalSamples = false,
): BandSection[] {
  const sections = samples.map(sample => {
    const boundary = cl + (sample.boundaryOffset ?? 0) * S
    return {
      x: sample.t, boundary,
      top: boundary - sample.topMass * S,
      bottom: boundary + sample.botMass * S,
    }
  })
  const knots = curves === "smooth" ? continuousSections(sections, domain, hasIntervalSamples) : sections
  for (const knot of knots) knot.x = xScale(clampTime(knot.x, domain))
  return knots
}

export function buildBandPath(...args: Parameters<typeof projectBandSections>): string | null {
  return bandSectionPath(projectBandSections(...args), args[5] === "smooth")
}

export function bandSectionPath(knots: BandSection[], smooth: boolean): string | null {
  if (!knots.length) return null
  function side(points: BandSection[], edge: "top" | "bottom") {
    let path = `${points[0].x},${points[0][edge]}`
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1]
      const to = points[i]
      if (smooth && from.x !== to.x && from[edge] !== to[edge]) {
        const middle = (from.x + to.x) / 2
        path += ` C${middle},${from[edge]} ${middle},${to[edge]} ${to.x},${to[edge]}`
      } else {
        path += ` L${to.x},${to[edge]}`
      }
    }
    return path
  }
  return `M${side(knots, "top")} L${side(knots.slice().reverse(), "bottom")} Z`
}

/**
 * One 20-px gradient stub at an attachment with `systemInTime` /
 * `systemOutTime`. Rendered as its own bezier scene-edge with a
 * horizontal gradient, painted underneath the band. The band
 * uses a transparent fill whenever any stubs are present, so the
 * stub gradients are the only colored regions inside the band's
 * outline.
 */
export interface BandGradientStub {
  /** Closed shape of the inventory slot. */
  pathD: string
  /** Gradient extent in screen pixels. */
  x0: number
  x1: number
  /** Color stops — 0 = transparent end, 1 = band-color end. */
  from: 0 | 1
  to: 0 | 1
}

interface ContourRange {
  first: number
  last: number
  boundary?: number
  highestTop: number
  lowestBottom: number
  halves?: [ContourRange, ContourRange]
}

/** A slot inside these bounds stays flat across the whole range. */
function indexContour(knots: BandSection[], first: number, last: number): ContourRange {
  if (first === last) {
    const { top, bottom, boundary } = knots[first]
    return { first, last, boundary, highestTop: top, lowestBottom: bottom }
  }
  const middle = Math.floor((first + last) / 2)
  const left = indexContour(knots, first, middle)
  const right = indexContour(knots, middle + 1, last)
  return {
    first, last, halves: [left, right],
    boundary: left.boundary === right.boundary ? left.boundary : undefined,
    highestTop: Math.max(left.highestTop, right.highestTop),
    lowestBottom: Math.min(left.lowestBottom, right.lowestBottom)
  }
}

function lifecycleContour(
  knots: BandSection[], range: ContourRange, left: number, right: number,
  boundary: number, top: number, bottom: number
) {
  const slot: BandSection[] = []
  function append(x: number, top: number, bottom: number) {
    const last = slot.at(-1)
    const prior = slot.at(-2)
    if (last?.top === top && last.bottom === bottom && prior?.top === top && prior.bottom === bottom) {
      last.x = x
    } else {
      slot.push({ x, top, bottom })
    }
  }
  function visit(range: ContourRange) {
    const { first, last, halves } = range
    // Retain the adjacent knot so the cubic at either boundary keeps both control points.
    if ((knots[last + 1] ?? knots[last]).x < left || (knots[first - 1] ?? knots[first]).x > right) return
    const shift = (range.boundary ?? boundary) - boundary
    if (halves && range.boundary !== undefined && top + shift >= range.highestTop &&
        bottom + shift <= range.lowestBottom && knots[first].x >= left && knots[last].x <= right) {
      append(knots[first].x, top + shift, bottom + shift)
      append(knots[last].x, top + shift, bottom + shift)
    } else if (halves) {
      for (const half of halves) visit(half)
    } else {
      const knot = knots[first]
      const clamp = (y: number) => Math.max(knot.top, Math.min(knot.bottom, y + shift))
      append(knot.x, clamp(top), clamp(bottom))
    }
  }
  visit(range)
  return bandSectionPath(slot, true)
}

/** Fade each lifecycle slot over 20 screen pixels inside the band outline. */
export function buildBandCutoutsForNode(
  nodeId: string,
  edges: ProcessSankeyEdge[],
  layout: ProcessSankeyLayout,
  xScale: (t: number) => number,
  domain: Domain,
  visualDepartureByEdge?: ReadonlyMap<string, number>,
  smoothSections?: BandSection[],
): BandGradientStub[] {
  const data = layout.nodeData[nodeId]
  if (!data || data.samples.length === 0) return []
  const S = layout.valueScale
  const cl = layout.centerlines[nodeId]
  const clampX = (t: number): number => xScale(clampTime(t, domain))
  let first: ProcessSankeySample | undefined
  let last: ProcessSankeySample | undefined
  for (const sample of data.samples) if (hasInventory(sample)) {
    first ??= sample
    last = sample
  }
  const xLeft = clampX((first ?? data.samples[0]).t)
  const xRight = clampX((last ?? data.samples[data.samples.length - 1]).t)
  // 20 screen pixels of gradient — width-independent of zoom/domain.
  const FADE_PX = 20
  const stubs: BandGradientStub[] = []
  let contourIndex: ContourRange | undefined
  function addStub(att: ProcessSankeyAttachment, left: number, right: number, x0: number, x1: number, from: 0 | 1) {
    if (!(right > left)) return
    const [top, bottom] = attachmentYRange(att, cl, S)
    let pathD = `M${left},${top} L${right},${top} L${right},${bottom} L${left},${bottom} Z`
    if (smoothSections) {
      if (!smoothSections.length) return
      contourIndex ??= indexContour(smoothSections, 0, smoothSections.length - 1)
      const outline = lifecycleContour(smoothSections, contourIndex, left, right,
        cl + (att.boundaryOffset ?? 0) * S, top, bottom)
      if (!outline) return
      pathD = outline
    }
    stubs.push({
      pathD,
      x0, x1, from, to: from === 0 ? 1 : 0,
    })
  }
  for (const e of edges) {
    const att = data.localAttachments.get(e.id)
    if (!att) continue
    if (att.kind === "out" && e.source === nodeId && Number.isFinite(e.systemInTime)) {
      const renderedStart = visualDepartureByEdge?.get(e.id) ?? e.startTime
      if (e.systemInTime! >= renderedStart) continue
      const incoming = clampX(e.systemInTime!)
      const departure = clampX(renderedStart)
      const cropped = domain && e.systemInTime! < domain[0]
      const start = cropped ? incoming : incoming - FADE_PX
      const end = cropped ? Math.min(departure, incoming + FADE_PX) : incoming
      addStub(att, Math.max(xLeft, start), departure, start, end, 0)
    } else if (att.kind === "in" && e.target === nodeId && Number.isFinite(e.systemOutTime) && e.systemOutTime! > e.endTime) {
      const start = clampX(e.systemOutTime!)
      const end = start + FADE_PX
      addStub(att, clampX(e.endTime), Math.min(xRight, end), start, end, 1)
    }
  }
  return stubs
}
