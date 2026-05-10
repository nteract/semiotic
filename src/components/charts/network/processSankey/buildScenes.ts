// Pure helper that runs ProcessSankey's algorithm pipeline and produces
// the band/ribbon scene specs the customNetworkLayout will emit. Lives
// outside the HOC so the SSR config (`serverChartConfigs.ts`) can reuse
// the same computation without instantiating React state — keeps CSR
// and SSR paths byte-identical.

import { scaleTime } from "d3-scale"
import {
  computeProcessSankeyLayout,
  validateProcessSankey,
  buildBandPath,
  buildRibbonPath,
  clampSamples,
  type ProcessSankeyOptions,
  type ProcessSankeyLayout,
  type ProcessSankeyIssue,
} from "./algorithm.js"
import type {
  ProcessSankeyBandSpec,
  ProcessSankeyRibbonSpec,
  ProcessSankeyLayoutConfig,
} from "./streamingLayout"
import type { Datum } from "../../shared/datumTypes"

export interface ProcessSankeyNormalizedNode {
  id: string
  xExtent?: [number, number]
  __raw?: Datum
}

export interface ProcessSankeyNormalizedEdge {
  id: string
  source: string
  target: string
  value: number
  startTime: number
  endTime: number
  __raw?: Datum
}

export interface BuildScenesInput {
  nodes: ProcessSankeyNormalizedNode[]
  edges: ProcessSankeyNormalizedEdge[]
  domain: [number, number]
  plotW: number
  plotH: number
  ribbonLane: "source" | "target" | "both"
  edgeOpacity: number
  /** Resolves a node's color by id+index (lets the caller plug in
   *  the same theme/colorScheme/colorBy resolution the HOC uses). */
  colorOf: (id: string, idx: number) => string
  layoutOpts: Pick<ProcessSankeyOptions, "pairing" | "packing" | "laneOrder" | "lifetimeMode">
}

export interface BuildScenesResult {
  layout: ProcessSankeyLayout | null
  layoutConfig: ProcessSankeyLayoutConfig
  issues: ProcessSankeyIssue[]
  /** Used downstream for tooltips (mass-history) and overlays. */
  xScale: ReturnType<typeof scaleTime>
}

/**
 * Run the full ProcessSankey layout pipeline. Returns the algorithm
 * output, the bands/ribbons specs ready for `customNetworkLayout`, and
 * the validation issues (caller decides whether to render an error
 * gate or fall through). Pure: no DOM, no React, no rAF.
 */
export function buildProcessSankeyScenes(input: BuildScenesInput): BuildScenesResult {
  const { nodes, edges, domain, plotW, plotH, ribbonLane, edgeOpacity, colorOf, layoutOpts } = input

  const issues = validateProcessSankey(nodes, edges, domain)
  const xScale = scaleTime().domain(domain).range([0, plotW])

  if (issues.length > 0) {
    return {
      layout: null,
      layoutConfig: { bands: [], ribbons: [], showLabels: true },
      issues,
      xScale,
    }
  }

  const layout = computeProcessSankeyLayout(nodes, edges, { plotH, ...layoutOpts })
  const { centerlines, nodeData, valueScale: S } = layout

  const bands: ProcessSankeyBandSpec[] = []
  const ribbons: ProcessSankeyRibbonSpec[] = []

  nodes.forEach((n, idx) => {
    const data = nodeData[n.id]
    if (!data || data.samples.length === 0) return
    const path = buildBandPath(data.samples, centerlines[n.id], S, xScale, domain)
    if (!path) return
    const smSamples = clampSamples(data.samples, domain)
    const firstNonZero = smSamples.find((s) => s.topMass + s.botMass > 0) || smSamples[0]
    const visualOffset = ((firstNonZero.botMass - firstNonZero.topMass) * S) / 2
    const labelY = centerlines[n.id] + visualOffset
    const c = colorOf(n.id, idx)
    bands.push({
      id: n.id,
      pathD: path,
      fill: c,
      stroke: c,
      strokeWidth: 0.5,
      rawDatum: (n.__raw ?? (n as Datum)),
      labelX: xScale(firstNonZero.t) - 4,
      labelY,
      labelText: n.id,
    })
  })

  // O(1) source-color lookup; same map shape the HOC uses.
  const nodeIndexById = new Map<string, number>()
  nodes.forEach((n, i) => nodeIndexById.set(n.id, i))

  edges.forEach((e) => {
    const srcAtt = nodeData[e.source]?.localAttachments.get(e.id)
    const tgtAtt = nodeData[e.target]?.localAttachments.get(e.id)
    if (!srcAtt || !tgtAtt) return
    const sourceIdx = nodeIndexById.get(e.source) ?? 0
    const fill = colorOf(e.source, sourceIdx)
    const d = buildRibbonPath(
      srcAtt, centerlines[e.source],
      tgtAtt, centerlines[e.target],
      S, xScale, ribbonLane, domain,
    )
    ribbons.push({
      id: e.id,
      pathD: d,
      fill,
      opacity: edgeOpacity,
      rawDatum: (e.__raw ?? (e as Datum)),
    })
  })

  return {
    layout,
    layoutConfig: { bands, ribbons, showLabels: true },
    issues: [],
    xScale,
  }
}
