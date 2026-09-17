import * as React from "react"
import type { Datum } from "./datumTypes"
import {
  estimateLabel,
  type LabelMeasurer,
  type LabelFont
} from "../../text/labelMeasurement"
import {
  LABEL_REMEDIES,
  placeLabels,
  type LabelLayoutEvidence
} from "../../text/labelPlacement"

export interface DirectLabelLayoutContext {
  width: number
  height: number
  margin?: { left: number; right: number }
  scales: {
    x?: (value: number) => number
    y?: (value: number) => number
  } | null
  fontFamily?: string
  measure?: LabelMeasurer
  fontVersion?: number
  renderLabel?: (
    annotation: Datum,
    index: number,
    defaultNode: React.ReactNode
  ) => React.ReactNode
}

/** Generated labels have their own final render pass; author rules/offsets stay intact. */
export function renderDirectLabels(
  annotations: readonly Datum[],
  context: DirectLabelLayoutContext
): {
  node: React.ReactNode
  evidence?: LabelLayoutEvidence
} {
  const labels = annotations.filter((a) => a._directLabel)
  if (!labels.length) return { node: null }
  const side = labels[0]._directLabel.position as "start" | "end"
  const measure = context.measure ?? estimateLabel
  const fonts: LabelFont[] = labels.map((a) => ({
    family: context.fontFamily || "sans-serif",
    version: context.fontVersion ?? 0,
    weight: 400,
    size: a.fontSize || 11
  }))
  const candidates = labels.map((a, i) => {
    const project = (value: unknown, scale?: (value: number) => number) => {
      if (value == null || !scale) return NaN
      try {
        return scale(Number(value))
      } catch {
        return NaN
      }
    }
    return {
      id: String(a._directLabel.id),
      anchor: {
        x: project(a.x, context.scales?.x),
        y: project(a.y, context.scales?.y)
      },
      measurement: measure(String(a.label), fonts[i])
    }
  })
  const railWidth = Math.max(
    0,
    (context.margin?.[side === "end" ? "right" : "left"] ?? 0) - 10
  )
  const result = placeLabels(
    candidates,
    {
      x: side === "end" ? context.width + 6 : -railWidth - 6,
      y: 0,
      width: railWidth,
      height: context.height
    },
    side
  )
  const nodes = result.dispositions.map((disposition, i) => {
    if (disposition.status === "omitted") return null
    const box = disposition.box!
    const connector = disposition.connector
    const label = labels[i]
    const defaultNode = (
      <g key={disposition.id} data-direct-label-id={disposition.id}>
        {connector && (
          <line {...connector} stroke={label.color} strokeWidth={0.75} />
        )}
        <text
          x={box.x + (candidates[i].measurement.left ?? 0)}
          y={box.y + candidates[i].measurement.ascent}
          fontFamily={fonts[i].family}
          fontWeight={fonts[i].weight}
          fontSize={fonts[i].size}
          fill={label.color}
          textAnchor="start"
        >
          {label.label}
        </text>
      </g>
    )
    const node = context.renderLabel
      ? context.renderLabel(
          {
            ...label,
            dx:
              box.x +
              (candidates[i].measurement.left ?? 0) -
              candidates[i].anchor.x,
            dy:
              box.y + candidates[i].measurement.ascent - candidates[i].anchor.y,
            fontFamily: fonts[i].family
          },
          i,
          defaultNode
        )
      : defaultNode
    if (!node) {
      const evidence = result.evidence
      evidence.rendered--
      evidence.omitted++
      if (evidence.omittedIds.length < 20)
        evidence.omittedIds.push(disposition.id)
      if (Math.abs(disposition.offset!.y) > 0.01) evidence.displaced--
      evidence.displacedIds = evidence.displacedIds.filter(
        (id) => id !== disposition.id
      )
      for (const code of ["RENDER_FAILURE", "LABEL_OMITTED"] as const) {
        let finding = evidence.findings.find((f) => f.code === code)
        if (!finding) {
          finding = {
            code,
            count: 0,
            labelIds: [],
            remedy: LABEL_REMEDIES[code]
          }
          evidence.findings.push(finding)
        }
        finding.count++
        if (finding.labelIds.length < 20) finding.labelIds.push(disposition.id)
      }
    }
    if (node !== defaultNode) {
      result.evidence.status = "incomplete"
      if (node) {
        let finding = result.evidence.findings.find(
          (f) => f.code === "UNSUPPORTED_GEOMETRY"
        )
        if (!finding) {
          finding = {
            code: "UNSUPPORTED_GEOMETRY",
            count: 0,
            labelIds: [],
            remedy: LABEL_REMEDIES.UNSUPPORTED_GEOMETRY
          }
          result.evidence.findings.push(finding)
        }
        finding.count++
        if (finding.labelIds.length < 20) finding.labelIds.push(disposition.id)
      }
    }
    return node ? (
      <React.Fragment key={disposition.id}>{node}</React.Fragment>
    ) : null
  })
  // This list is retained even if every visible label is omitted. It carries
  // series identity and full endpoint values, independently of legend settings.
  const fallback = (
    <g
      role="list"
      aria-label="Series endpoints"
      data-direct-label-fallback="accessible-series-list"
    >
      {labels.map((label, i) => (
        <g
          key={candidates[i].id}
          role="listitem"
          aria-label={`${label.label}: x ${String(label.x)}, y ${String(label.y)}`}
        >
          <title>{`${label.label}: x ${String(label.x)}, y ${String(label.y)}`}</title>
        </g>
      ))}
    </g>
  )
  return {
    evidence: result.evidence,
    node: (
      <g
        key="direct-labels"
        className="semiotic-direct-labels"
        data-label-layout={JSON.stringify(result.evidence)}
      >
        {nodes}
        {fallback}
      </g>
    )
  }
}
