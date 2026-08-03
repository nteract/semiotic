// Pure helper that runs ProcessSankey's algorithm pipeline and produces
// the band/ribbon scene specs the customNetworkLayout will emit. Lives
// outside the HOC so the SSR config (`serverChartConfigs.ts`) can reuse
// the same computation without instantiating React state — keeps CSR
// and SSR paths byte-identical.

import { scaleTime } from "d3-scale"
import {
  computeProcessSankeyLayout,
  partitionProcessSankeyIssues,
  validateProcessSankey,
  applyProcessSankeyValidationPolicy,
  buildBandPath,
  buildBandCutoutsForNode,
  clampSamples,
  type ProcessSankeyOptions,
  type ProcessSankeyLayout,
  type ProcessSankeyIssue,
} from "./algorithm"
import type {
  ProcessSankeyBandSpec,
  ProcessSankeyRibbonSpec,
  ProcessSankeyLayoutConfig,
} from "./streamingLayout"
import type { Datum } from "../../shared/datumTypes"
import { buildRibbonGeometry } from "../../../geometry/ribbonGeometry"
import {
  computeProcessSankeyRibbonInputs,
  synchronizeProcessSankeyFeederBatches,
} from "./ribbonInputs"
import {
  computeFeederRibbonRunwayStarts,
  computeFeederVisualDepartureTimes,
  indexFeederVisualDepartures,
  projectFeederBandSamples,
} from "./ribbonRunway"
import {
  applyProcessSankeyLabelDensity,
  staggerProcessSankeyLabels,
  staggerVerticalProcessSankeyLabels,
} from "./labelPlacement"
import {
  orientProcessSankeyBand,
  orientProcessSankeyRibbon,
  type ProcessSankeyOrientation,
} from "./orientation"
import {
  makeNodeRuleContext,
  resolveStyleRules,
  type StyleRule,
} from "../../shared/styleRules"
import { isHatchFill, type HatchFill } from "../../shared/hatchFill"

export interface ProcessSankeyNormalizedNode {
  id: string
  label?: string
  group?: string
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
  /** Optional render-only hint: when this unit of mass actually
   *  entered the source node. Triggers a cutout in the source band. */
  systemInTime?: number
  /** Optional render-only hint: when this unit of mass left the
   *  target node. Triggers a cutout in the target band. */
  systemOutTime?: number
  __raw?: Datum
}

export interface BuildScenesInput {
  nodes: ProcessSankeyNormalizedNode[]
  edges: ProcessSankeyNormalizedEdge[]
  domain: [number, number]
  plotW: number
  plotH: number
  orientation?: ProcessSankeyOrientation
  ribbonLane: "source" | "target" | "both"
  /**
   * Minimum rendered run along the time axis for **source-only feeder**
   * ribbons (not a general minimum ribbon length). A number is a pixel
   * minimum; `"auto"` adapts to lateral lane distance. Only source-only
   * feeders with proven stock/runway are affected.
   */
  ribbonMinRun?: number | "auto"
  edgeOpacity: number
  /** Resolves a node's color by id+index (lets the caller plug in
   *  the same theme/colorScheme/colorBy resolution the HOC uses). */
  colorOf: (id: string, idx: number) => string
  layoutOpts: Pick<ProcessSankeyOptions,
    "pairing" | "packing" | "laneOrder" | "lifetimeMode" | "maxValueScale" |
    "lanePlacement" | "groupPadding"
  >
  /** Render node labels: true, false, or density-budgeted `"auto"`. */
  showLabels?: boolean | "auto"
  /**
   * Author priority for `showLabels="auto"`. Higher values survive density
   * shedding first. String field name or function over the raw node datum.
   */
  labelPriorityAccessor?: string | ((d: Datum) => number)
  /** Optional hard cap on visible auto labels (after area budget). */
  maxLabels?: number
  /**
   * Which datum selection/linkedHover predicates receive.
   * Default `"raw"` unwraps author records from the scene payload.
   */
  selectionDatum?: "raw" | "scene"
  /** Declarative style rules applied to band fills (raw node datum). */
  styleRules?: StyleRule[]
  colorBy?: string | ((d: Datum) => unknown)
  valueAccessor?: string | ((d: Datum) => unknown)
  /**
   * Validation policy mode (M6). `static`/`mcp` hard-fail duplicate ids;
   * `push` warns and strips invalid system times. Default `static`.
   */
  usageMode?: import("./validation").ProcessSankeyUsageMode
}

export interface BuildScenesResult {
  layout: ProcessSankeyLayout | null
  layoutConfig: ProcessSankeyLayoutConfig
  issues: ProcessSankeyIssue[]
  /** Non-fatal validation issues; layout still runs when only these remain. */
  warnings: ProcessSankeyIssue[]
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
  const {
    nodes, edges, domain, plotW, plotH, ribbonLane, ribbonMinRun = 0,
    edgeOpacity, colorOf, layoutOpts,
    orientation = "horizontal",
    showLabels = true,
    labelPriorityAccessor,
    maxLabels,
    selectionDatum = "raw",
    styleRules,
    colorBy,
    valueAccessor,
    usageMode = "static",
  } = input
  const timelineExtent = orientation === "vertical" ? plotH : plotW
  const laneExtent = orientation === "vertical" ? plotW : plotH

  const allIssues = validateProcessSankey(nodes, edges, domain, { usageMode })
  const { fatal, warnings } = partitionProcessSankeyIssues(allIssues)
  const layoutEdges = applyProcessSankeyValidationPolicy(edges, allIssues, usageMode)
  const xScale = scaleTime().domain(domain).range([0, timelineExtent])

  if (fatal.length > 0) {
    return {
      layout: null,
      layoutConfig: { bands: [], ribbons: [], showLabels: showLabels !== false },
      issues: fatal,
      warnings,
      xScale,
    }
  }

  const layout = computeProcessSankeyLayout(nodes, layoutEdges, {
    plotH: laneExtent, ...layoutOpts, ribbonLane, domain,
  })
  const { centerlines, nodeData, valueScale: S } = layout
  const ruleContext = makeNodeRuleContext(colorBy, valueAccessor)

  const bands: ProcessSankeyBandSpec[] = []
  const ribbons: ProcessSankeyRibbonSpec[] = []
  const feederRunwayStarts = ribbonMinRun === 0
    ? new Map<string, number>()
    : computeFeederRibbonRunwayStarts(nodes, layoutEdges, domain)
  const sourceGroupByNode = new Map(
    nodes.filter((node) => node.group).map((node) => [node.id, node.group!]),
  )

  // Resolve ribbons before bands so both marks share the exact same visual
  // feeder departure. The analytical layout remains on authored timestamps.
  const initialRibbonInputs = new Map<string, ReturnType<typeof computeProcessSankeyRibbonInputs>>()
  for (const edge of layoutEdges) {
    const srcAtt = nodeData[edge.source]?.localAttachments.get(edge.id)
    const tgtAtt = nodeData[edge.target]?.localAttachments.get(edge.id)
    if (!srcAtt || !tgtAtt) continue
    initialRibbonInputs.set(edge.id, computeProcessSankeyRibbonInputs(
      srcAtt, centerlines[edge.source],
      tgtAtt, centerlines[edge.target],
      S, xScale, ribbonLane, domain,
      {
        minRun: ribbonMinRun,
        sourceRunwayStart: feederRunwayStarts.get(edge.id),
      },
    ))
  }
  const ribbonInputsByEdge = synchronizeProcessSankeyFeederBatches(
    layoutEdges, initialRibbonInputs, feederRunwayStarts, xScale, ribbonLane,
    sourceGroupByNode,
  )
  const visualDepartureByEdge = computeFeederVisualDepartureTimes(
    layoutEdges,
    ribbonInputsByEdge,
    feederRunwayStarts,
    xScale,
    (pixel) => domain[0] + (pixel / timelineExtent) * (domain[1] - domain[0]),
  )
  const visualDeparturesByNode = indexFeederVisualDepartures(
    layoutEdges, visualDepartureByEdge, sourceGroupByNode,
  )

  nodes.forEach((n, idx) => {
    const data = nodeData[n.id]
    if (!data || data.samples.length === 0) return
    const renderedSamples = projectFeederBandSamples(
      data.samples, visualDeparturesByNode.get(n.id),
    )
    const path = buildBandPath(renderedSamples, centerlines[n.id], S, xScale, domain)
    if (!path) return
    const smSamples = clampSamples(renderedSamples, domain)
    const firstNonZero = smSamples.find((s) => s.topMass + s.botMass > 0) || smSamples[0]
    const visualOffset = (
      firstNonZero.botMass - firstNonZero.topMass + 2 * (firstNonZero.boundaryOffset ?? 0)
    ) * S / 2
    const labelY = centerlines[n.id] + visualOffset
    let c = colorOf(n.id, idx)
    let stroke = c
    let strokeWidth = 0.5
    let fillOpacity: number | undefined
    let hatchFill: HatchFill | undefined
    const raw = (n.__raw ?? (n as Datum)) as Datum
    if (styleRules && styleRules.length > 0) {
      const ruled = resolveStyleRules(raw, styleRules, ruleContext(raw))
      if (typeof ruled.fill === "string") c = ruled.fill
      else if (ruled.fill != null && isHatchFill(ruled.fill)) {
        // Keep hatch for canvas + SSR band fills; solid stroke for outline.
        hatchFill = ruled.fill
        c = ruled.fill.background && ruled.fill.background !== "transparent"
          ? ruled.fill.background
          : c
      }
      if (typeof ruled.stroke === "string") stroke = ruled.stroke
      if (typeof ruled.strokeWidth === "number") strokeWidth = ruled.strokeWidth
      if (typeof ruled.fillOpacity === "number") fillOpacity = ruled.fillOpacity
      if (typeof ruled.opacity === "number" && fillOpacity == null) fillOpacity = ruled.opacity
    }
    const stubs = buildBandCutoutsForNode(
      n.id, layoutEdges, layout, xScale, domain, visualDepartureByEdge,
    )
    bands.push({
      id: n.id,
      pathD: path,
      fill: c,
      stroke,
      strokeWidth,
      ...(fillOpacity != null && { fillOpacity }),
      ...(hatchFill && { hatchFill }),
      ...(stubs.length > 0 && { gradientStubs: stubs }),
      rawDatum: raw,
      // In a vertical history river, an explicit node extent usually marks
      // the historical opening the label names. Incoming ribbons can begin
      // much earlier than that opening, so anchoring to firstNonZero would
      // mislabel the preceding era. Horizontal process views retain their
      // established first-visible-band anchor.
      labelX: xScale(orientation === "vertical" && n.xExtent ? n.xExtent[0] : firstNonZero.t) - 4,
      labelY,
      labelText: n.label ?? n.id,
    })
  })

  // O(1) source-color lookup; same map shape the HOC uses.
  const nodeIndexById = new Map<string, number>()
  nodes.forEach((n, i) => nodeIndexById.set(n.id, i))

  layoutEdges.forEach((e) => {
    const ribbonInputs = ribbonInputsByEdge.get(e.id)
    if (!ribbonInputs) return
    const sourceIdx = nodeIndexById.get(e.source) ?? 0
    const fill = colorOf(e.source, sourceIdx)
    const { pathD, bezier } = buildRibbonGeometry(ribbonInputs)
    ribbons.push({
      id: e.id,
      pathD,
      fill,
      opacity: edgeOpacity,
      rawDatum: (e.__raw ?? (e as Datum)),
      bezier,
    })
  })

  const packedBands = staggerProcessSankeyLabels(bands, layout.slotByNode, laneExtent)
    .map((band) => orientProcessSankeyBand(band, orientation))
  const orientedBands = orientation === "vertical"
    ? staggerVerticalProcessSankeyLabels(packedBands, plotW, plotH)
    : packedBands
  const priorityById = new Map<string, number>()
  if (labelPriorityAccessor != null) {
    for (const n of nodes) {
      const raw = (n.__raw ?? (n as unknown as Datum)) as Datum
      const value = typeof labelPriorityAccessor === "function"
        ? labelPriorityAccessor(raw)
        : Number((raw as Record<string, unknown>)[labelPriorityAccessor])
      if (Number.isFinite(value)) priorityById.set(n.id, value as number)
    }
  }
  const densityBands = applyProcessSankeyLabelDensity(
    orientedBands, plotW, plotH, showLabels,
    {
      ...(priorityById.size > 0 && { priorityById }),
      ...(maxLabels != null && { maxLabels }),
    },
  )

  return {
    layout,
    layoutConfig: {
      bands: densityBands,
      ribbons: ribbons.map((ribbon) => orientProcessSankeyRibbon(ribbon, orientation)),
      showLabels: showLabels !== false,
      selectionDatum,
    },
    issues: [],
    warnings,
    xScale,
  }
}
