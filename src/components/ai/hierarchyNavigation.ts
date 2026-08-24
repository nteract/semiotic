import type { Datum } from "../charts/shared/datumTypes"
import type { NavTreeNode } from "./navigationTree"

interface HierarchySummary {
  descendants: number
  depth: number
  leaves: number
  numericLeaves: number
  leafTotal: number
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

function childrenFor(datum: Datum, accessor: unknown): Datum[] {
  const children = readProp(datum, accessor, "children")
  return Array.isArray(children) ? (children as Datum[]) : []
}

function countPhrase(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function rollupPhrase(
  summary: HierarchySummary,
  fmtNum: (number: number) => string
): string {
  if (summary.numericLeaves === 0) return ""
  if (summary.numericLeaves === summary.leaves) {
    return `, leaf total ${fmtNum(summary.leafTotal)}`
  }
  return `, known leaf total ${fmtNum(summary.leafTotal)} across ${countPhrase(
    summary.numericLeaves,
    "valued leaf",
    "valued leaves"
  )}`
}

function hierarchyKind(component: string): string {
  if (component === "TreeDiagram") return "tree"
  if (component === "Treemap") return "treemap"
  if (component === "CirclePack") return "circle-packing"
  return "orbit"
}

/** Build the authored parent/child reading used by hierarchy chart navigation. */
export function buildHierarchyNavigationTree(
  component: string,
  props: Datum,
  maxLeaves: number,
  fmtNum: (number: number) => string
): NavTreeNode {
  const data =
    props.data && typeof props.data === "object" ? (props.data as Datum) : null
  const childrenAccessor = props.childrenAccessor ?? "children"
  const valueAccessor = props.valueAccessor ?? "value"
  const labelAccessor = props.nodeLabel ?? props.nodeIdAccessor
  const summaryCache = new WeakMap<Datum, HierarchySummary>()
  const summarizing = new WeakSet<Datum>()

  const summarize = (node: Datum): HierarchySummary => {
    const cached = summaryCache.get(node)
    if (cached) return cached
    if (summarizing.has(node)) {
      return {
        descendants: 0,
        depth: 0,
        leaves: 0,
        numericLeaves: 0,
        leafTotal: 0
      }
    }

    summarizing.add(node)
    const children = childrenFor(node, childrenAccessor)
    let result: HierarchySummary
    if (children.length === 0) {
      const value = finiteValue(readProp(node, valueAccessor, "value"))
      result = {
        descendants: 0,
        depth: 1,
        leaves: 1,
        numericLeaves: value == null ? 0 : 1,
        leafTotal: value ?? 0
      }
    } else {
      result = children.reduce<HierarchySummary>(
        (total, child) => {
          const childSummary = summarize(child)
          return {
            descendants: total.descendants + 1 + childSummary.descendants,
            depth: Math.max(total.depth, childSummary.depth + 1),
            leaves: total.leaves + childSummary.leaves,
            numericLeaves: total.numericLeaves + childSummary.numericLeaves,
            leafTotal: total.leafTotal + childSummary.leafTotal
          }
        },
        {
          descendants: 0,
          depth: 1,
          leaves: 0,
          numericLeaves: 0,
          leafTotal: 0
        }
      )
    }
    summarizing.delete(node)
    summaryCache.set(node, result)
    return result
  }

  let emittedLeaves = 0
  const buildNode = (
    node: Datum,
    level: number,
    path: string,
    ancestors: ReadonlySet<Datum>
  ): NavTreeNode | null => {
    const label = stringValue(
      readProp(node, labelAccessor, "name"),
      `item ${path}`
    )
    if (ancestors.has(node)) {
      return {
        id: `hierarchy-${slug(path)}-cycle`,
        role: "datum",
        level,
        label: `Repeated hierarchy reference to ${label}; branch omitted.`
      }
    }

    const children = childrenFor(node, childrenAccessor)
    const summary = summarize(node)
    if (children.length === 0) {
      if (emittedLeaves >= maxLeaves) return null
      emittedLeaves += 1
      const value = finiteValue(readProp(node, valueAccessor, "value"))
      return {
        id: `hierarchy-${slug(path)}-${slug(label)}`,
        role: "datum",
        level,
        label: `${label}${value == null ? "" : `: ${fmtNum(value)}`}.`,
        ...(value == null ? {} : { value }),
        datum: node
      }
    }

    const nextAncestors = new Set(ancestors)
    nextAncestors.add(node)
    const childNodes: NavTreeNode[] = []
    let omittedLeaves = 0
    for (const [index, child] of children.entries()) {
      if (emittedLeaves >= maxLeaves) {
        omittedLeaves += summarize(child).leaves
        continue
      }
      const childNode = buildNode(
        child,
        level + 1,
        `${path}-${index}`,
        nextAncestors
      )
      if (childNode) childNodes.push(childNode)
    }
    if (omittedLeaves > 0) {
      childNodes.push({
        id: `hierarchy-${slug(path)}-more`,
        role: "datum",
        level: level + 1,
        label: `${countPhrase(
          omittedLeaves,
          "more leaf",
          "more leaves"
        )} in ${label} not shown; navigation is capped at ${maxLeaves}.`
      })
    }

    return {
      id: `hierarchy-${slug(path)}-${slug(label)}`,
      role: "series",
      level,
      label: `${label}: ${countPhrase(
        children.length,
        "direct child",
        "direct children"
      )}, ${countPhrase(
        summary.descendants,
        "total descendant",
        "total descendants"
      )}, ${countPhrase(summary.leaves, "leaf", "leaves")}${rollupPhrase(
        summary,
        fmtNum
      )}.`,
      datum: node,
      children: childNodes
    }
  }

  const summary = data ? summarize(data) : null
  const root: NavTreeNode = {
    id: "root",
    role: "chart",
    level: 1,
    label: data
      ? `A ${hierarchyKind(component)} chart with ${countPhrase(
          summary!.leaves,
          "leaf",
          "leaves"
        )} and ${countPhrase(
          summary!.descendants,
          "total descendant",
          "total descendants"
        )} across ${countPhrase(
          summary!.depth,
          "hierarchy level",
          "hierarchy levels"
        )}${rollupPhrase(summary!, fmtNum)}.`
      : "A hierarchy chart with no hierarchy data loaded.",
    children: []
  }

  if (data) {
    const branch = buildNode(data, 2, "root", new Set())
    if (branch) {
      const authoredRootLabel = stringValue(
        readProp(data, labelAccessor, "name"),
        ""
      )
      root.children =
        branch.role === "series" && authoredRootLabel === ""
          ? branch.children
          : [branch]
    }
  }
  return root
}
