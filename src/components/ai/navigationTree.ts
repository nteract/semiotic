import type { Datum } from "../charts/shared/datumTypes"
import { resolveAccessor, resolveRawAccessor } from "../stream/accessorUtils"
import { describeChart, chartValueFormatter } from "./describeChart"
/**
 * buildNavigationTree — turn a chart config into a structured, labeled
 * navigation tree (chart → axes/series → data points), following the Olli /
 * Data Navigator model: a navigable *structure*, uncoupled from how the chart
 * is rendered (canvas, SVG, image). A screen-reader user descends the tree —
 * "Series sales" → "point 3 of 9: March, 6,800" — with spoken structural
 * context at each level, instead of wading through a flat point list.
 *
 * Pure and SSR-safe. Composes `describeChart()` for node labels so the tree and
 * the prose description speak the same language. Rendered by `AccessibleNavTree`
 * and surfaced as the opt-in ChartContainer `navigable` affordance.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NavTreeRole = "chart" | "axis" | "series" | "datum"

export interface NavTreeNode {
  /** Stable id within the tree. */
  id: string
  role: NavTreeRole
  /** What assistive tech announces for this node. */
  label: string
  /** 1-based depth (maps to aria-level). */
  level: number
  /** Measure value, for datum leaves. */
  value?: number
  /** Raw datum, for datum leaves. */
  datum?: Datum | null
  children?: NavTreeNode[]
}

export interface BuildNavigationTreeOptions {
  /** Cap leaves per branch (keeps a 50k-row chart from building a giant tree). Default 200. */
  maxLeaves?: number
  locale?: string
}

// ---------------------------------------------------------------------------
// Families + role resolution (kept in step with describeChart)
// ---------------------------------------------------------------------------

const XY_FAMILY = new Set([
  "LineChart", "AreaChart", "StackedAreaChart", "DifferenceChart", "Scatterplot",
  "BubbleChart", "ConnectedScatterplot", "QuadrantChart", "MultiAxisLineChart", "MinimapChart",
])
const BAR_FAMILY = new Set(["BarChart", "StackedBarChart", "GroupedBarChart", "DotPlot"])
const PART_TO_WHOLE = new Set(["PieChart", "DonutChart", "FunnelChart"])
const DISTRIBUTION = new Set(["Histogram", "BoxPlot", "ViolinPlot", "RidgelinePlot", "SwarmPlot"])

function roles(component: string, props: Datum): { measure?: string; measureFallback: string; dimension?: string; dimensionFallback: string } {
  if (BAR_FAMILY.has(component) || PART_TO_WHOLE.has(component)) {
    return {
      measure: props.valueAccessor as string | undefined, measureFallback: "value",
      dimension: (props.categoryAccessor ?? props.stepAccessor) as string | undefined, dimensionFallback: "category",
    }
  }
  return {
    measure: (props.yAccessor ?? props.valueAccessor) as string | undefined, measureFallback: "y",
    dimension: props.xAccessor as string | undefined, dimensionFallback: "x",
  }
}

function seriesField(props: Datum): string | undefined {
  for (const k of ["lineBy", "areaBy", "stackBy", "groupBy", "colorBy"]) {
    const v = props[k]
    if (typeof v === "string" && v) return v
  }
  return undefined
}

function fmtDim(v: unknown, fmtNum: (n: number) => string): string {
  if (v == null) return "—"
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === "number") return fmtNum(v)
  return String(v)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a structured navigation tree for a chart config. Full trees for XY,
 * bar, part-to-whole, and distribution families; for everything else (network,
 * hierarchy, geo, single value) it returns a root-only node with an L1 label
 * rather than inventing a structure.
 */
export function buildNavigationTree(
  component: string,
  props: Datum,
  options: BuildNavigationTreeOptions = {}
): NavTreeNode {
  const locale = options.locale ?? "en"
  const maxLeaves = Math.max(1, options.maxLeaves ?? 200)
  const fmtNum = chartValueFormatter(locale)

  const rootLabel = describeChart(component, props, { locale }).text || "Chart."
  const root: NavTreeNode = { id: "root", role: "chart", label: rootLabel, level: 1, children: [] }

  const data = Array.isArray(props.data) ? (props.data as Datum[]) : null
  const statsFamily = XY_FAMILY.has(component) || BAR_FAMILY.has(component) ||
    PART_TO_WHOLE.has(component) || DISTRIBUTION.has(component)
  if (!data || data.length === 0 || !statsFamily) return root

  const { measure, measureFallback, dimension, dimensionFallback } = roles(component, props)
  const getMeasure = resolveAccessor(measure, measureFallback)
  const getDim = resolveRawAccessor(dimension, dimensionFallback)
  // Only string accessors are human-readable labels; a function accessor is
  // truthy but would leak its source into node labels — fall back instead.
  const measureName = typeof measure === "string" && measure ? measure : measureFallback
  const dimName = typeof dimension === "string" && dimension ? dimension : dimensionFallback
  const series = seriesField(props)

  let counter = 0
  const nextId = (prefix: string) => `${prefix}-${counter++}`

  const leafFor = (d: Datum, level: number): NavTreeNode => {
    const m = getMeasure(d)
    const dimLabel = fmtDim(getDim(d), fmtNum)
    return {
      id: nextId("datum"),
      role: "datum",
      level,
      label: `${dimLabel}: ${Number.isFinite(m) ? fmtNum(m) : "—"}`,
      value: Number.isFinite(m) ? m : undefined,
      datum: d,
    }
  }

  // Cap leaves so a huge series can't build an unusable tree; note the elision.
  const leaves = (rows: Datum[], level: number): NavTreeNode[] => {
    const out = rows.slice(0, maxLeaves).map((d) => leafFor(d, level))
    if (rows.length > maxLeaves) {
      out.push({ id: nextId("more"), role: "datum", level, label: `…and ${rows.length - maxLeaves} more points` })
    }
    return out
  }

  // Axis-context nodes (childless) give orientation before the data.
  const axisNodes: NavTreeNode[] = []
  if (XY_FAMILY.has(component) || BAR_FAMILY.has(component)) {
    let minM = Infinity, maxM = -Infinity
    let minD = Infinity, maxD = -Infinity
    const dims: unknown[] = []
    let allNumericDim = true
    for (const d of data) {
      const m = getMeasure(d)
      if (Number.isFinite(m)) { if (m < minM) minM = m; if (m > maxM) maxM = m }
      const dv = getDim(d)
      dims.push(dv)
      if (typeof dv === "number" && Number.isFinite(dv)) {
        if (dv < minD) minD = dv
        if (dv > maxD) maxD = dv
      } else {
        allNumericDim = false
      }
    }
    // Distinct dimension values in encounter order, so a multi-series chart
    // (where x repeats per series) reads "Jan to Mar", not "Jan to Jan".
    const seen = new Set<string>()
    const distinct: unknown[] = []
    for (const dv of dims) {
      const key = String(dv)
      if (!seen.has(key)) { seen.add(key); distinct.push(dv) }
    }
    const dimDesc = allNumericDim
      ? `${fmtNum(minD)} to ${fmtNum(maxD)}`
      : `${fmtDim(distinct[0], fmtNum)} to ${fmtDim(distinct[distinct.length - 1], fmtNum)} (${BAR_FAMILY.has(component) ? `${distinct.length} categories` : `${data.length} points`})`
    axisNodes.push({ id: nextId("axis"), role: "axis", level: 2, label: `${BAR_FAMILY.has(component) ? "Category axis" : "X axis"}: ${dimName}, ${dimDesc}.` })
    if (maxM >= minM) {
      axisNodes.push({ id: nextId("axis"), role: "axis", level: 2, label: `Value axis: ${measureName}, ${fmtNum(minM)} to ${fmtNum(maxM)}.` })
    }
  }

  if (series) {
    const getSeries = resolveRawAccessor(series, series)
    const groups = new Map<string, Datum[]>()
    for (const d of data) {
      const key = String(getSeries(d) ?? "—")
      const bucket = groups.get(key)
      if (bucket) bucket.push(d)
      else groups.set(key, [d])
    }
    const seriesNodes: NavTreeNode[] = []
    for (const [name, rows] of groups) {
      const summary = describeChart(component, { ...props, data: rows }, { levels: ["l2", "l3"], locale }).text
      seriesNodes.push({
        id: nextId("series"),
        role: "series",
        level: 2,
        label: `Series ${name}: ${summary}`,
        children: leaves(rows, 3),
      })
    }
    root.children = [...axisNodes, ...seriesNodes]
  } else {
    root.children = [...axisNodes, ...leaves(data, 2)]
  }

  return root
}

/** Flatten a tree to its visible nodes given a set of expanded node ids, in DFS
 *  order. Used by the renderer for roving-tabindex keyboard navigation. */
export function flattenVisible(root: NavTreeNode, expanded: Set<string>): NavTreeNode[] {
  const out: NavTreeNode[] = []
  const walk = (node: NavTreeNode) => {
    out.push(node)
    if (node.children && node.children.length > 0 && expanded.has(node.id)) {
      for (const c of node.children) walk(c)
    }
  }
  walk(root)
  return out
}

/** Total descendant + self count — handy for tests and summaries. */
export function countNodes(root: NavTreeNode): number {
  let n = 1
  if (root.children) for (const c of root.children) n += countNodes(c)
  return n
}
