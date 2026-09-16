import { placeWithMinGap } from "../recipes/minGapPlacement"
import type { LabelMeasurement } from "./labelMeasurement"

export interface LabelBox {
  x: number
  y: number
  width: number
  height: number
}
export interface LabelCandidate {
  id: string
  anchor: { x: number; y: number }
  measurement: LabelMeasurement
}
export type LabelReason =
  | "INVALID_PROJECTION"
  | "INSUFFICIENT_SPACE"
  | "TIED_ENDPOINTS"
  | "LABEL_OMITTED"
  | "ESTIMATED_METRICS"
  | "RENDER_FAILURE"
  | "UNSUPPORTED_GEOMETRY"
  | "LABEL_COLLISION"
  | "LABEL_OVERFLOW"
export interface LabelFinding {
  code: LabelReason
  count: number
  labelIds: string[]
  remedy: string
}
export interface LabelDisposition {
  id: string
  status: "placed" | "omitted"
  reason?: LabelReason
  box?: LabelBox
  offset?: { x: number; y: number }
  connector?: { x1: number; y1: number; x2: number; y2: number }
}
export interface LabelLayoutEvidence {
  status: "complete" | "incomplete" | "not-assessed"
  requested: number
  rendered: number
  displaced: number
  omitted: number
  omittedIds: string[]
  displacedIds: string[]
  measurement: { measured: number; estimated: number }
  collisions: number
  overflows: number
  fallback: "accessible-series-list"
  findings: LabelFinding[]
  coverage: { directLabels: "assessed"; axisLabels: "not-assessed" }
}

export const LABEL_REMEDIES: Record<LabelReason, string> = {
  INVALID_PROJECTION:
    "Check endpoint values and the scale domain, especially log-scale values.",
  INSUFFICIENT_SPACE:
    "Increase chart height or the label-side margin, or reduce the label font size.",
  TIED_ENDPOINTS:
    "Use connectors or a legend to distinguish series sharing an endpoint.",
  LABEL_OMITTED:
    "Consult the accessible series list; increase the label rail space to restore visible labels.",
  ESTIMATED_METRICS:
    "Load the intended font and remeasure before asserting collision-free text.",
  RENDER_FAILURE:
    "Inspect the annotation renderer; the placed label did not produce a node.",
  UNSUPPORTED_GEOMETRY:
    "Inspect custom-rendered text; its geometry has not been measured by the label solver.",
  LABEL_COLLISION: "Increase spacing or shorten the affected labels.",
  LABEL_OVERFLOW:
    "Increase the allocated bounds or shorten the affected labels."
}

/**
 * Vertical rail packing in CSS pixels. Objective: minimum squared vertical
 * movement, preserving anchor order, subject to box gaps and hard bounds.
 * Pool-adjacent-violators solves the transformed isotonic regression in O(n)
 * after sorting. Feasible, already separated labels stay at their anchors.
 * Impossible fits retain labels in anchor/ID order; every loss is explicit.
 */
export function placeLabels(
  candidates: readonly LabelCandidate[],
  bounds: LabelBox,
  side: "start" | "end" = "end",
  gap = 2
): { dispositions: LabelDisposition[]; evidence: LabelLayoutEvidence } {
  const dispositions = new Map<string, LabelDisposition>()
  const findings = new Map<LabelReason, { count: number; labelIds: string[] }>()
  const record = (code: LabelReason, id: string) => {
    const finding = findings.get(code) ?? { count: 0, labelIds: [] }
    finding.count++
    if (finding.labelIds.length < 20) finding.labelIds.push(id)
    findings.set(code, finding)
  }
  const omit = (id: string, reason: LabelReason) => {
    dispositions.set(id, { id, status: "omitted", reason })
    record(reason, id)
    record("LABEL_OMITTED", id)
  }
  const sorted = [...candidates].sort(
    (a, b) =>
      (Number.isFinite(a.anchor.y) ? a.anchor.y : Infinity) -
        (Number.isFinite(b.anchor.y) ? b.anchor.y : Infinity) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  )
  const retained: LabelCandidate[] = []
  let used = 0
  let previousY: number | undefined
  for (const candidate of sorted) {
    const { id, anchor, measurement: m } = candidate
    if (m.source === "estimated") record("ESTIMATED_METRICS", id)
    if (
      ![anchor.x, anchor.y, m.width, m.height, m.ascent].every(
        Number.isFinite
      ) ||
      m.width < 0 ||
      m.height <= 0
    ) {
      omit(id, "INVALID_PROJECTION")
      continue
    }
    if (previousY === anchor.y) record("TIED_ENDPOINTS", id)
    previousY = anchor.y
    const required = m.height + (retained.length ? gap : 0)
    if (
      ![bounds.x, bounds.y, bounds.width, bounds.height, gap].every(
        Number.isFinite
      ) ||
      gap < 0 ||
      m.width > bounds.width ||
      used + required > bounds.height
    ) {
      omit(id, "INSUFFICIENT_SPACE")
      continue
    }
    retained.push(candidate)
    used += required
  }
  const positions = placeWithMinGap({
    desired: retained.map((c) => c.anchor.y - c.measurement.height / 2),
    minGaps: retained.slice(0, -1).map((c) => c.measurement.height + gap),
    min: bounds.y,
    max: bounds.y + bounds.height - (retained.at(-1)?.measurement.height ?? 0)
  })
  retained.forEach((c, i) => {
    const box = {
      x:
        side === "end"
          ? bounds.x
          : bounds.x + bounds.width - c.measurement.width,
      y: positions[i],
      width: c.measurement.width,
      height: c.measurement.height
    }
    const x = side === "end" ? box.x : box.x + box.width
    const y = box.y + box.height / 2
    const offset = { x: x - c.anchor.x, y: y - c.anchor.y }
    dispositions.set(c.id, {
      id: c.id,
      status: "placed",
      box,
      offset,
      ...(Math.abs(offset.y) > 0.01 || Math.abs(offset.x) > 6.01
        ? { connector: { x1: c.anchor.x, y1: c.anchor.y, x2: x, y2: y } }
        : {})
    })
  })
  const result = candidates.map((c) => dispositions.get(c.id)!)
  const displaced = result.filter(
    (d) => d.status === "placed" && Math.abs(d.offset!.y) > 0.01
  )
  const omitted = result.filter((d) => d.status === "omitted")
  const estimated = candidates.filter(
    (c) => c.measurement.source === "estimated"
  ).length
  return {
    dispositions: result,
    evidence: {
      status: estimated || omitted.length ? "incomplete" : "complete",
      requested: candidates.length,
      rendered: retained.length,
      displaced: displaced.length,
      omitted: omitted.length,
      omittedIds: omitted.slice(0, 20).map((d) => d.id),
      displacedIds: displaced.slice(0, 20).map((d) => d.id),
      measurement: { measured: candidates.length - estimated, estimated },
      collisions: 0,
      overflows: 0,
      fallback: "accessible-series-list",
      findings: [...findings].map(([code, finding]) => ({
        code,
        ...finding,
        remedy: LABEL_REMEDIES[code]
      })),
      coverage: { directLabels: "assessed", axisLabels: "not-assessed" }
    }
  }
}
