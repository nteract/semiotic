import { clamp } from "../../../utils/clamp"
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
  return clamp(t, domain[0], domain[1])
}

export function clampSamples(samples: readonly ProcessSankeySample[], domain: Domain): ProcessSankeySample[] {
  return samples.map(sample => ({ ...sample, t: clampTime(sample.t, domain) }))
}

export function hasInventory(sample: ProcessSankeySample): boolean {
  return sample.topMass + sample.botMass > 0
}

export function attachmentOffset(
  attachment: ProcessSankeyAttachment,
  valueScale: number
): number {
  const boundary = (attachment.boundaryOffset ?? 0) * valueScale
  const mass = (attachment.kind === "out" ? attachment.sideMassBefore : attachment.sideMassAfter) * valueScale
  const half = attachment.value * valueScale / 2
  return boundary + (attachment.side === "top" ? -mass + half : mass - half)
}

export function attachmentYRange(
  attachment: ProcessSankeyAttachment,
  centerline: number,
  valueScale: number
): [number, number] {
  const center = centerline + attachmentOffset(attachment, valueScale)
  const half = (attachment.value * valueScale) / 2
  return [center - half, center + half]
}

/** Interior inventory checkpoints in the authored time coordinate. */
export function intervalTimes(start: number, end: number, domain: Domain, midpoint: boolean): number[] {
  const times = new Set((domain ?? []).filter(t => start < t && t < end))
  if (midpoint) times.add((start + end) / 2)
  return [...times].sort((a, b) => a - b)
}

type BandSection = { x: number; top: number; bottom: number; translation?: number }

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
      x: sample.t, translation: (sample.groupOffset ?? 0) * S,
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
  function side(edge: "top" | "bottom", start: number, step: number) {
    let from = knots[start]
    let path = `${from.x},${from[edge]}`
    for (let i = start + step; i >= 0 && i < knots.length; i += step) {
      const to = knots[i]
      const end = `${to.x},${to[edge]}`
      if (smooth && from.x !== to.x && from[edge] !== to[edge]) {
        const middle = (from.x + to.x) / 2
        path += ` C${middle},${from[edge]} ${middle},${to[edge]} ${end}`
      } else {
        path += ` L${end}`
      }
      from = to
    }
    return path
  }
  return `M${side("top", 0, 1)} L${side("bottom", knots.length - 1, -1)} Z`
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

type ContourBounds = Pick<BandSection, "top" | "bottom" | "translation">

/** Each branch bounds the slot that stays flat throughout its interval. */
function indexContour(knots: BandSection[]) {
  const bounds: ContourBounds[] = []
  function build(first: number, last: number, index: number): ContourBounds {
    if (first === last) return knots[first]
    const middle = Math.floor((first + last) / 2)
    const left = build(first, middle, index * 2)
    const right = build(middle + 1, last, index * 2 + 1)
    return bounds[index] = {
      translation: left.translation === right.translation ? left.translation : undefined,
      top: Math.max(left.top, right.top),
      bottom: Math.min(left.bottom, right.bottom)
    }
  }
  build(0, knots.length - 1, 1)
  return bounds
}

function lifecycleContour(
  knots: BandSection[], bounds: ContourBounds[], left: number, right: number,
  translation: number, top: number, bottom: number
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
  function visit(first: number, last: number, index: number) {
    // Include the adjacent knot to preserve the cubic at each fade boundary.
    if (knots[Math.min(last + 1, knots.length - 1)].x < left || knots[Math.max(0, first - 1)].x > right) return
    const range = bounds[index] ?? knots[first]
    const shift = (range.translation ?? translation) - translation
    if (first === last || (range.translation !== undefined && top + shift >= range.top &&
        bottom + shift <= range.bottom && knots[first].x >= left && knots[last].x <= right)) {
      const slotEdge = (y: number) => clamp(y + shift, range.top, range.bottom)
      append(knots[first].x, slotEdge(top), slotEdge(bottom))
      if (first !== last) append(knots[last].x, top + shift, bottom + shift)
    } else {
      const middle = Math.floor((first + last) / 2)
      visit(first, middle, index * 2)
      visit(middle + 1, last, index * 2 + 1)
    }
  }
  visit(0, knots.length - 1, 1)
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
  const samples = data.samples
  const xLeft = clampX((samples.find(hasInventory) ?? samples[0]).t)
  const xRight = clampX((samples.findLast(hasInventory) ?? samples[samples.length - 1]).t)
  // 20 screen pixels of gradient — width-independent of zoom/domain.
  const FADE_PX = 20
  const stubs: BandGradientStub[] = []
  let contourIndex: ContourBounds[] | undefined
  function addStub(att: ProcessSankeyAttachment, left: number, right: number, x0: number, x1: number, from: 0 | 1) {
    if (!(right > left)) return
    const [top, bottom] = attachmentYRange(att, cl, S)
    if (smoothSections && !smoothSections.length) return
    const pathD = smoothSections
      ? lifecycleContour(smoothSections, contourIndex ??= indexContour(smoothSections), left, right,
          (att.groupOffset ?? 0) * S, top, bottom)
      : bandSectionPath([{ x: left, top, bottom }, { x: right, top, bottom }], false)
    if (!pathD) return
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
