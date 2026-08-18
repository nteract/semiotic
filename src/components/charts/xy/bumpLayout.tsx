import * as React from "react"
import type {
  AreaSceneNode,
  PointSceneNode,
  SceneNode,
  Style,
} from "../../stream/types"
import type { LayoutContext, LayoutResult } from "../../stream/customLayout"
import { useCustomLayoutSelection } from "../../stream/customLayoutSelection"
import { buildBumpRibbonGeometry } from "../../geometry/bumpRibbonGeometry"
import { resolveExplicitColor } from "../shared/colorUtils"
import type { Datum } from "../shared/datumTypes"
import { resolveStyleRules, type StyleRule } from "../shared/styleRules"
import type { RankedBumpDatum } from "./bumpData"

export interface BumpLayoutConfig {
  ribbon: boolean
  curve: "smooth" | "linear"
  samplesPerSegment: number
  ribbonSizeRange: [number, number]
  valueExtent: [number, number]
  seriesOrder: string[]
  lineWidth: number
  ribbonOpacity: number
  lineOpacity: number
  neutralColor?: string
  color?: string
  colorMap?: Record<string, string>
  stroke?: string
  strokeWidth?: number
  opacity?: number
  styleRules?: ReadonlyArray<StyleRule>
  areaStyle?: (datum: Datum) => Style
  pointStyle?: (datum: Datum) => Style & { r?: number }
  labelStyle?: React.CSSProperties | ((datum: Datum) => React.CSSProperties)
  showPoints: boolean
  pointRadius: number
  showLabels: boolean | "start" | "end" | "both" | "auto"
  labelPriorityAccessor?: string | ((datum: Datum) => number)
  maxLabels?: number
}

export interface BumpLabelSelectionCandidate {
  id: string
  side: "start" | "end"
  y: number
  rank: number
  highlighted: boolean
  priority?: number
}

/** Keep endpoint labels readable in deterministic CSR and SSR layouts. */
export function selectBumpLabelCandidates(
  candidates: readonly BumpLabelSelectionCandidate[],
  plotHeight: number,
  mode: boolean | "auto",
  maxLabels?: number,
): Set<string> {
  const densityBudget = Math.max(1, Math.floor(plotHeight / 18))
  const autoBudget = mode === "auto"
    ? (Number.isFinite(maxLabels) && (maxLabels ?? 0) >= 0
      ? Math.min(densityBudget, Math.floor(maxLabels as number))
      : densityBudget)
    : Infinity
  const ranked = candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((left, right) => {
      const leftPriority = left.candidate.priority ?? 0
      const rightPriority = right.candidate.priority ?? 0
      return rightPriority - leftPriority
        || Number(right.candidate.highlighted) - Number(left.candidate.highlighted)
        || left.candidate.rank - right.candidate.rank
        || left.index - right.index
    })
  const selected: BumpLabelSelectionCandidate[] = []
  for (const { candidate } of ranked) {
    if (selected.length >= autoBudget) break
    if (selected.some((other) =>
      other.side === candidate.side && Math.abs(other.y - candidate.y) < 14,
    )) continue
    selected.push(candidate)
  }
  return new Set(selected.map((candidate) => candidate.id))
}

function BumpLabel({
  datum,
  x,
  y,
  side,
  color,
  highlighted,
  labelStyle,
}: {
  datum: RankedBumpDatum
  x: number
  y: number
  side: "start" | "end"
  color: string
  highlighted: boolean
  labelStyle?: React.CSSProperties | ((datum: Datum) => React.CSSProperties)
}): React.ReactElement {
  const selection = useCustomLayoutSelection()
  const dimmed = selection.isActive && !selection.predicate(datum)
  const customStyle = typeof labelStyle === "function"
    ? labelStyle(datum.__bumpRaw)
    : labelStyle
  return (
    <text
      className="semiotic-bump-label"
      x={x + (side === "end" ? 8 : -8)}
      y={y}
      dy="0.35em"
      textAnchor={side === "end" ? "start" : "end"}
      fill={color}
      fillOpacity={dimmed ? 0.16 : 1}
      fontWeight={highlighted ? 650 : 450}
      fontSize={12}
      style={{
        pointerEvents: "none",
        fontFamily: "var(--semiotic-font-family, sans-serif)",
        fontSize: "var(--semiotic-axis-label-font-size, 12px)",
        ...customStyle,
      }}
    >
      {datum.__bumpSeries}
    </text>
  )
}

function nodeBumpDatum(node: SceneNode): RankedBumpDatum | undefined {
  const datum = Array.isArray(node.datum) ? node.datum[0] : node.datum
  return datum && typeof datum === "object" && "__bumpSeries" in datum
    ? datum as RankedBumpDatum
    : undefined
}

function interpolateWidth(
  value: number,
  extent: [number, number],
  range: [number, number],
): number {
  const [domainMin, domainMax] = extent
  const [rangeMin, rangeMax] = range
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2
  const ratio = Math.max(0, Math.min(1, (value - domainMin) / (domainMax - domainMin)))
  return rangeMin + (rangeMax - rangeMin) * ratio
}

function ruleContext(datum: RankedBumpDatum) {
  const x = datum.__bumpXValue instanceof Date
    ? datum.__bumpXValue.getTime()
    : Number(datum.__bumpXValue)
  return {
    value: datum.__bumpValue,
    x: Number.isFinite(x) ? x : undefined,
    y: datum.__bumpValue,
    category: datum.__bumpSeries,
  }
}

/** Shared Bump scene layout for the React HOC and server renderer. */
export function bumpLayout(ctx: LayoutContext<BumpLayoutConfig>): LayoutResult {
  const config = ctx.config
  const bySeries = new Map<string, RankedBumpDatum[]>()
  for (const datum of ctx.data as RankedBumpDatum[]) {
    const rows = bySeries.get(datum.__bumpSeries) ?? []
    rows.push(datum)
    bySeries.set(datum.__bumpSeries, rows)
  }
  const orderedSeries = config.seriesOrder
    .filter((series) => bySeries.has(series))
    .sort((left, right) => {
      const leftHighlighted = bySeries.get(left)?.[0]?.__bumpHighlighted ? 1 : 0
      const rightHighlighted = bySeries.get(right)?.[0]?.__bumpHighlighted ? 1 : 0
      return leftHighlighted - rightHighlighted
        || config.seriesOrder.indexOf(left) - config.seriesOrder.indexOf(right)
    })
  const nodes: Array<AreaSceneNode | PointSceneNode> = []
  const labels: React.ReactNode[] = []
  const candidates: Array<BumpLabelSelectionCandidate & {
    datum: RankedBumpDatum
    x: number
    color: string
  }> = []

  for (const series of orderedSeries) {
    const rows = (bySeries.get(series) ?? []).sort((left, right) => left.x - right.x)
    if (rows.length < 2) continue
    const highlighted = rows[0].__bumpHighlighted
    const resolvedColor = (config.colorMap && resolveExplicitColor(config.colorMap, series))
      ?? ctx.resolveColor(rows[0].__bumpSeries, rows[0])
    const color = config.color ?? (highlighted
      ? resolvedColor
      : config.neutralColor ?? ctx.theme.semantic.textSecondary ?? ctx.theme.semantic.border ?? resolvedColor)
    const centers = rows.map((row) => ({
      x: ctx.scales.x(row.x),
      y: ctx.scales.y(row.y),
      radius: config.ribbon
        ? interpolateWidth(row.__bumpValue, config.valueExtent, config.ribbonSizeRange) / 2
        : Math.max(0.5, config.lineWidth / 2),
    }))
    const geometry = buildBumpRibbonGeometry(centers, {
      curve: config.curve,
      samplesPerSegment: config.samplesPerSegment,
    })
    const areaStyle: Style = {
      fill: color,
      fillOpacity: 1,
      opacity: highlighted
        ? (config.ribbon ? config.ribbonOpacity : config.lineOpacity)
        : Math.min(config.ribbon ? config.ribbonOpacity : config.lineOpacity, 0.58),
    }
    if (config.styleRules?.length) {
      Object.assign(areaStyle, resolveStyleRules(rows[0].__bumpRaw, config.styleRules, ruleContext(rows[0])))
    }
    if (config.areaStyle) Object.assign(areaStyle, config.areaStyle(rows[0].__bumpRaw) ?? {})
    if (config.stroke !== undefined) areaStyle.stroke = config.stroke
    if (config.strokeWidth !== undefined) areaStyle.strokeWidth = config.strokeWidth
    if (config.opacity !== undefined) areaStyle.opacity = config.opacity
    nodes.push({
      type: "area",
      topPath: geometry.topPath,
      bottomPath: geometry.bottomPath,
      style: areaStyle,
      datum: geometry.datumIndices.map((itemIndex) => rows[itemIndex]),
      accessibleDatum: rows.map((row) => row.__bumpRaw),
      accessibility: {
        label: `${series} ranking trajectory`,
        tableFields: rows.map((row) => row.__bumpRaw),
      },
      group: series,
      interactive: true,
    })
    if (config.showPoints) {
      rows.forEach((row, rowIndex) => {
        const pointStyle: Style & { r?: number } = {
          fill: color,
          stroke: "none",
          opacity: highlighted ? 1 : 0.75,
        }
        if (config.styleRules?.length) {
          Object.assign(pointStyle, resolveStyleRules(row.__bumpRaw, config.styleRules, ruleContext(row)))
        }
        if (config.pointStyle) Object.assign(pointStyle, config.pointStyle(row.__bumpRaw) ?? {})
        if (config.stroke !== undefined) pointStyle.stroke = config.stroke
        if (config.strokeWidth !== undefined) pointStyle.strokeWidth = config.strokeWidth
        if (config.opacity !== undefined) pointStyle.opacity = config.opacity
        nodes.push({
          type: "point",
          x: centers[rowIndex].x,
          y: centers[rowIndex].y,
          r: pointStyle.r ?? config.pointRadius,
          style: pointStyle,
          datum: row,
          accessibleDatum: row.__bumpRaw,
          accessibility: { label: `${series}, rank ${row.__bumpRank}, value ${row.__bumpValue}` },
          pointId: `${series}:${row.x}`,
        })
      })
    }
    const labelMode = config.showLabels === true ? "end" : config.showLabels
    const addLabel = (row: RankedBumpDatum, rowIndex: number, side: "start" | "end") => {
      const rawPriority = config.labelPriorityAccessor == null
        ? undefined
        : typeof config.labelPriorityAccessor === "function"
          ? config.labelPriorityAccessor(row.__bumpRaw)
          : Number(row.__bumpRaw[config.labelPriorityAccessor])
      candidates.push({
        id: `${series}\u0000${side}`,
        datum: row,
        x: centers[rowIndex].x,
        y: centers[rowIndex].y,
        side,
        rank: row.__bumpRank,
        highlighted,
        priority: Number.isFinite(rawPriority) ? rawPriority : undefined,
        color: typeof areaStyle.fill === "string" ? areaStyle.fill : color,
      })
    }
    if (labelMode === "start" || labelMode === "both") addLabel(rows[0], 0, "start")
    if (labelMode === "end" || labelMode === "both" || labelMode === "auto") {
      addLabel(rows.at(-1)!, rows.length - 1, "end")
    }
  }

  const labelMode = config.showLabels === true ? "end" : config.showLabels
  const visible = selectBumpLabelCandidates(
    candidates,
    ctx.dimensions.plot.height,
    labelMode === "auto" ? "auto" : true,
    config.maxLabels,
  )
  for (const candidate of candidates) {
    if (!visible.has(candidate.id)) continue
    labels.push(
      <BumpLabel
        key={candidate.id}
        datum={candidate.datum}
        x={candidate.x}
        y={candidate.y}
        side={candidate.side}
        color={candidate.color}
        highlighted={candidate.highlighted}
        labelStyle={config.labelStyle}
      />,
    )
  }
  return {
    nodes,
    overlays: labels.length ? <g className="semiotic-bump-labels">{labels}</g> : undefined,
    restyle: (node, selection) => {
      const datum = nodeBumpDatum(node)
      if (selection?.isActive && datum && !selection.predicate(datum)) return { opacity: 0.14 }
    },
  }
}
