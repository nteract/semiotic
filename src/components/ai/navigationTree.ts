import type { Datum } from "../charts/shared/datumTypes"
import { resolveAccessor, resolveRawAccessor } from "../stream/accessorUtils"
import {
  describeChart,
  chartValueFormatter,
  annotationPhrase
} from "./describeChart"
import {
  XY_FAMILY,
  BAR_FAMILY,
  PART_TO_WHOLE,
  DISTRIBUTION,
  roles,
  seriesField,
  fmtDim
} from "./chartRoles"
import { filterAnnotationsByStatus } from "./annotationProvenance"
import type { ChartRecipe } from "./chartRecipes"
import { buildRecipeNavigationTree } from "./recipeNavigation"
import { resolveRecipeForChart } from "./recipeSemantics"
import { buildHierarchyNavigationTree } from "./hierarchyNavigation"
import { buildGeoNavigationTree } from "./geoNavigation"
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

export type NavTreeRole = "chart" | "axis" | "series" | "datum" | "annotation"

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
  /** Raw authored datum for any actionable mark node, including hierarchy parents. */
  datum?: Datum | null
  children?: NavTreeNode[]
}

export interface BuildNavigationTreeOptions {
  /** Cap leaves per branch (keeps a 50k-row chart from building a giant tree). Default 200. */
  maxLeaves?: number
  locale?: string
  /** Explicit recipe; otherwise props/registry dispatch is used. */
  recipe?: ChartRecipe
}

const NETWORK_FAMILY = new Set([
  "ForceDirectedGraph",
  "SankeyDiagram",
  "ProcessSankey",
  "ChordDiagram"
])
const HIERARCHY_FAMILY = new Set([
  "TreeDiagram",
  "Treemap",
  "CirclePack",
  "OrbitDiagram"
])
const GEO_FAMILY = new Set([
  "ChoroplethMap",
  "ProportionalSymbolMap",
  "FlowMap",
  "DistanceCartogram"
])
/**
 * Whether the runtime navigation builder owns a datum-level structure for the
 * supplied chart. This is the authoritative capability check used by
 * ChartAccessContract; callers should not maintain a parallel chart-name set.
 */
export function supportsStructuredNavigation(
  component: string,
  props: Datum = {},
  options: Pick<BuildNavigationTreeOptions, "recipe"> = {}
): boolean {
  if (resolveRecipeForChart(component, props, options.recipe)) return true
  return (
    NETWORK_FAMILY.has(component) ||
    HIERARCHY_FAMILY.has(component) ||
    GEO_FAMILY.has(component) ||
    XY_FAMILY.has(component) ||
    BAR_FAMILY.has(component) ||
    PART_TO_WHOLE.has(component) ||
    DISTRIBUTION.has(component)
  )
}

function readProp(datum: Datum, accessor: unknown, fallback: string): unknown {
  if (typeof accessor === "function") return accessor(datum)
  const key = typeof accessor === "string" && accessor ? accessor : fallback
  return datum[key]
}

function stringValue(value: unknown, fallback = "—"): string {
  if (value == null || value === "") return fallback
  if (typeof value === "object") {
    const record = value as Datum
    return stringValue(record.id ?? record.name ?? record.label, fallback)
  }
  return String(value)
}

function finiteValue(value: unknown): number | undefined {
  if (value == null || value === "") return undefined
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number : undefined
}

function slug(value: unknown): string {
  const normalized = stringValue(value, "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return normalized || "unknown"
}

function interactionCue(props: Datum, family: "network" | "geo"): string {
  const cues: string[] = []
  if (props.linkedHover || props.selection || props.linkedBrush) {
    cues.push(
      family === "network"
        ? "Use linked highlighting to trace related marks."
        : "Use linked highlighting to compare related locations."
    )
  }
  if (props.enableHover || props.tooltip) {
    cues.push("Hover or focus a mark for its details.")
  }
  return cues.length > 0 ? ` ${cues.join(" ")}` : ""
}

function appendAnnotationBranch(
  root: NavTreeNode,
  branch: NavTreeNode | null
): void {
  if (branch) root.children?.push(branch)
}

function buildNetworkNavigationTree(
  component: string,
  props: Datum,
  maxLeaves: number,
  fmtNum: (n: number) => string
): NavTreeNode {
  const nodes = Array.isArray(props.nodes) ? (props.nodes as Datum[]) : []
  const edges = Array.isArray(props.edges)
    ? (props.edges as Datum[])
    : Array.isArray(props.flows)
      ? (props.flows as Datum[])
      : []
  const nodeIdAccessor = props.nodeIdAccessor ?? props.nodeIDAccessor
  const sourceAccessor = props.sourceAccessor ?? "source"
  const targetAccessor = props.targetAccessor ?? "target"
  const valueAccessor = props.valueAccessor ?? "value"
  const nodeId = (node: Datum) =>
    stringValue(readProp(node, nodeIdAccessor, "id"), "unknown")
  const endpoint = (edge: Datum, accessor: unknown) =>
    stringValue(readProp(edge, accessor, ""), "unknown")

  const inferredIds = new Set<string>()
  for (const edge of edges) {
    inferredIds.add(endpoint(edge, sourceAccessor))
    inferredIds.add(endpoint(edge, targetAccessor))
  }
  const effectiveNodes =
    nodes.length > 0 ? nodes : [...inferredIds].map((id) => ({ id }))
  const degrees = new Map<string, { links: number; value: number }>()
  for (const node of effectiveNodes)
    degrees.set(nodeId(node), { links: 0, value: 0 })
  for (const edge of edges) {
    const source = endpoint(edge, sourceAccessor)
    const target = endpoint(edge, targetAccessor)
    const value = finiteValue(readProp(edge, valueAccessor, "value")) ?? 0
    for (const id of [source, target]) {
      const current = degrees.get(id) ?? { links: 0, value: 0 }
      current.links += 1
      current.value += value
      degrees.set(id, current)
    }
  }

  const kind =
    component === "SankeyDiagram" || component === "ProcessSankey"
      ? "flow diagram"
      : component === "ChordDiagram"
        ? "chord diagram"
        : "network graph"
  const root: NavTreeNode = {
    id: "root",
    role: "chart",
    level: 1,
    label: `A ${kind} with ${effectiveNodes.length} nodes and ${edges.length} links.${interactionCue(props, "network")}`,
    children: []
  }
  let emitted = 0
  const nodeGroups = new Map<string, Datum[]>()
  const nodeGroupAccessor = props.colorBy ?? "group"
  for (const node of effectiveNodes) {
    const group = stringValue(
      readProp(node, nodeGroupAccessor, "group"),
      "Ungrouped"
    )
    const bucket = nodeGroups.get(group)
    if (bucket) bucket.push(node)
    else nodeGroups.set(group, [node])
  }
  const nodeBranches = [...nodeGroups].map(
    ([group, groupNodes], groupIndex) => {
      const children: NavTreeNode[] = []
      for (const [nodeIndex, node] of groupNodes.entries()) {
        if (emitted >= maxLeaves) break
        emitted += 1
        const id = nodeId(node)
        const stats = degrees.get(id) ?? { links: 0, value: 0 }
        const valueLabel =
          stats.value > 0 ? `, ${fmtNum(stats.value)} total flow` : ""
        children.push({
          id: `node-${groupIndex}-${nodeIndex}-${slug(id)}`,
          role: "datum",
          level: 3,
          label: `${id}: ${stats.links} ${stats.links === 1 ? "link" : "links"}${valueLabel}.`,
          value: stats.value > 0 ? stats.value : undefined,
          datum: node
        })
      }
      return {
        id: `nodes-${groupIndex}-${slug(group)}`,
        role: "series" as const,
        level: 2,
        label: `${group}: ${groupNodes.length} ${groupNodes.length === 1 ? "node" : "nodes"}.`,
        children
      }
    }
  )
  if (nodeBranches.length > 0) root.children?.push(...nodeBranches)

  const edgeChildren: NavTreeNode[] = edges
    .slice(0, maxLeaves)
    .map((edge, index) => {
      const source = endpoint(edge, sourceAccessor)
      const target = endpoint(edge, targetAccessor)
      const value = finiteValue(readProp(edge, valueAccessor, "value"))
      return {
        id: `link-${slug(source)}-${slug(target)}-${index}`,
        role: "datum" as const,
        level: 3,
        label: `${source} to ${target}${value == null ? "" : `: ${fmtNum(value)}`}.`,
        value,
        datum: edge
      }
    })
  if (edges.length > maxLeaves) {
    edgeChildren.push({
      id: "links-more",
      role: "datum",
      level: 3,
      label: `…and ${edges.length - maxLeaves} more links.`,
      value: undefined
    })
  }
  if (edgeChildren.length > 0) {
    root.children?.push({
      id: "links",
      role: "series",
      level: 2,
      label: `Links: ${edges.length} ${edges.length === 1 ? "connection" : "connections"}.`,
      children: edgeChildren
    })
  }
  return root
}

// Families + role resolution (XY_FAMILY/BAR_FAMILY/PART_TO_WHOLE/DISTRIBUTION,
// roles, seriesField, fmtDim) are shared with describeChart via ./chartRoles.

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/**
 * Build the "Annotations" branch — a grouped node whose children announce each
 * author-placed note, so a screen-reader user *encounters* author intent during
 * traversal (not only when an external `focusAnnotation` fires). Reuses
 * `annotationPhrase` so the tree and the prose description speak the same
 * language, and surfaces editorial `status` (M7) inline. Retracted and
 * superseded notes are skipped. Returns null when there's nothing to surface.
 */
function buildAnnotationBranch(
  props: Datum,
  maxLeaves: number
): NavTreeNode | null {
  const raw = Array.isArray(props.annotations)
    ? (props.annotations as Datum[])
    : null
  if (!raw) return null
  const items = filterAnnotationsByStatus(
    raw.filter((a): a is Datum => !!a && typeof a === "object")
  )
  if (items.length === 0) return null

  let counter = 0
  const children: NavTreeNode[] = items.slice(0, maxLeaves).map((a) => {
    const status = a.lifecycle?.status as string | undefined
    const statusSuffix = status && status !== "accepted" ? ` (${status})` : ""
    return {
      id: `annotation-${counter++}`,
      role: "annotation",
      level: 3,
      label: `${capitalize(annotationPhrase(a))}${statusSuffix}.`,
      datum: a
    }
  })
  if (items.length > maxLeaves) {
    children.push({
      id: `annotation-${counter++}`,
      role: "annotation",
      level: 3,
      label: `…and ${items.length - maxLeaves} more annotations.`
    })
  }

  const n = items.length
  return {
    id: "annotations",
    role: "annotation",
    level: 2,
    label: `Annotations: ${n === 1 ? "one marked feature" : `${n} marked features`}.`,
    children
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a structured navigation tree for a chart config. Full trees for XY,
 * bar, part-to-whole, distribution, network, hierarchy, and geo families;
 * unknown or single-value components retain a concise root-level description
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

  const recipe = resolveRecipeForChart(component, props, options.recipe)
  if (recipe) {
    return buildRecipeNavigationTree(recipe, props, { maxLeaves, locale })
  }

  const rootLabel = describeChart(component, props, { locale }).text || "Chart."
  const root: NavTreeNode = {
    id: "root",
    role: "chart",
    label: rootLabel,
    level: 1,
    children: []
  }

  // Author annotations become a first-class branch in every family, including
  // the topology, hierarchy, and geographic structures built below.
  const annotationBranch = buildAnnotationBranch(props, maxLeaves)

  if (NETWORK_FAMILY.has(component)) {
    const tree = buildNetworkNavigationTree(component, props, maxLeaves, fmtNum)
    appendAnnotationBranch(tree, annotationBranch)
    return tree
  }
  if (HIERARCHY_FAMILY.has(component)) {
    const tree = buildHierarchyNavigationTree(
      component,
      props,
      maxLeaves,
      fmtNum
    )
    appendAnnotationBranch(tree, annotationBranch)
    return tree
  }
  if (GEO_FAMILY.has(component)) {
    const tree = buildGeoNavigationTree(component, props, maxLeaves, fmtNum)
    appendAnnotationBranch(tree, annotationBranch)
    return tree
  }

  const data = Array.isArray(props.data) ? (props.data as Datum[]) : null
  const statsFamily = supportsStructuredNavigation(component, props, options)
  if (!data || data.length === 0 || !statsFamily) {
    if (annotationBranch) root.children = [annotationBranch]
    return root
  }

  const { measure, measureFallback, dimension, dimensionFallback } = roles(
    component,
    props
  )
  const getMeasure = resolveAccessor(measure, measureFallback)
  const getDim = resolveRawAccessor(dimension, dimensionFallback)
  // Only string accessors are human-readable labels; a function accessor is
  // truthy but would leak its source into node labels — fall back instead.
  const measureName =
    typeof measure === "string" && measure ? measure : measureFallback
  const dimName =
    typeof dimension === "string" && dimension ? dimension : dimensionFallback
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
      datum: d
    }
  }

  // Cap leaves so a huge series can't build an unusable tree; note the elision.
  const leaves = (rows: Datum[], level: number): NavTreeNode[] => {
    const out = rows.slice(0, maxLeaves).map((d) => leafFor(d, level))
    if (rows.length > maxLeaves) {
      out.push({
        id: nextId("more"),
        role: "datum",
        level,
        label: `…and ${rows.length - maxLeaves} more points`
      })
    }
    return out
  }

  // Axis-context nodes (childless) give orientation before the data.
  const axisNodes: NavTreeNode[] = []
  if (XY_FAMILY.has(component) || BAR_FAMILY.has(component)) {
    let minM = Infinity,
      maxM = -Infinity
    let minD = Infinity,
      maxD = -Infinity
    const dims: unknown[] = []
    let allNumericDim = true
    for (const d of data) {
      const m = getMeasure(d)
      if (Number.isFinite(m)) {
        if (m < minM) minM = m
        if (m > maxM) maxM = m
      }
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
      if (!seen.has(key)) {
        seen.add(key)
        distinct.push(dv)
      }
    }
    const dimDesc = allNumericDim
      ? `${fmtNum(minD)} to ${fmtNum(maxD)}`
      : `${fmtDim(distinct[0], fmtNum)} to ${fmtDim(distinct[distinct.length - 1], fmtNum)} (${BAR_FAMILY.has(component) ? `${distinct.length} categories` : `${data.length} points`})`
    axisNodes.push({
      id: nextId("axis"),
      role: "axis",
      level: 2,
      label: `${BAR_FAMILY.has(component) ? "Category axis" : "X axis"}: ${dimName}, ${dimDesc}.`
    })
    if (maxM >= minM) {
      axisNodes.push({
        id: nextId("axis"),
        role: "axis",
        level: 2,
        label: `Value axis: ${measureName}, ${fmtNum(minM)} to ${fmtNum(maxM)}.`
      })
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
      const summary = describeChart(
        component,
        { ...props, data: rows },
        { levels: ["l2", "l3"], locale }
      ).text
      seriesNodes.push({
        id: nextId("series"),
        role: "series",
        level: 2,
        label: `Series ${name}: ${summary}`,
        children: leaves(rows, 3)
      })
    }
    root.children = [...axisNodes, ...seriesNodes]
  } else {
    root.children = [...axisNodes, ...leaves(data, 2)]
  }
  if (annotationBranch) root.children.push(annotationBranch)

  return root
}

/** Flatten a tree to its visible nodes given a set of expanded node ids, in DFS
 *  order. Used by the renderer for roving-tabindex keyboard navigation. */
export function flattenVisible(
  root: NavTreeNode,
  expanded: Set<string>
): NavTreeNode[] {
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
