import {
  readProp,
  stringValue,
  finiteValue,
  slug,
  hierarchyChildren
} from "./navigationValues"
import { isAIDataRecord } from "./aiData"
import type { Datum } from "../charts/shared/datumTypes"
import type { NavTreeNode } from "./navigationTree"

interface HierarchySummary {
  descendants: number
  depth: number
  leaves: number
  numericLeaves: number
  leafTotal: number
}

function countPhrase(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function rollupPhrase(
  summary: HierarchySummary,
  fmtNum: (number: number) => string
): string {
  if (summary.numericLeaves === 0) return ""
  const total = fmtNum(summary.leafTotal)
  if (summary.numericLeaves === summary.leaves) {
    return `, leaf total ${total}`
  }
  return `, known leaf total ${total} across ${countPhrase(
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
  const data = isAIDataRecord(props.data) ? props.data : null
  const childrenAccessor = props.childrenAccessor
  const valueAccessor = props.valueAccessor
  const labelAccessor = props.nodeLabel ?? props.nodeIdAccessor
  // A null entry marks an ancestor whose summary is still being computed.
  const summaryCache = new WeakMap<Datum, HierarchySummary | null>()

  const summarize = (node: Datum): HierarchySummary => {
    const cached = summaryCache.get(node)
    if (cached !== undefined) {
      return cached ?? {
        descendants: 0,
        depth: 0,
        leaves: 0,
        numericLeaves: 0,
        leafTotal: 0
      }
    }

    summaryCache.set(node, null)
    const children = hierarchyChildren(node, childrenAccessor)
    const isLeaf = children.length === 0
    const value =
      isLeaf
        ? finiteValue(readProp(node, valueAccessor, "value"))
        : undefined
    const result: HierarchySummary = {
      descendants: 0,
      depth: 1,
      leaves: isLeaf ? 1 : 0,
      numericLeaves: value == null ? 0 : 1,
      leafTotal: value ?? 0
    }
    for (const child of children) {
      const summary = summarize(child)
      result.descendants += 1 + summary.descendants
      result.depth = Math.max(result.depth, summary.depth + 1)
      result.leaves += summary.leaves
      result.numericLeaves += summary.numericLeaves
      result.leafTotal += summary.leafTotal
    }
    summaryCache.set(node, result)
    return result
  }

  let emittedLeaves = 0
  const ancestors = new WeakSet<Datum>()
  const buildNode = (
    node: Datum,
    level: number,
    path: string
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

    const children = hierarchyChildren(node, childrenAccessor)
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

    ancestors.add(node)
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
        `${path}-${index}`
      )
      if (childNode) childNodes.push(childNode)
    }
    ancestors.delete(node)
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
    const branch = buildNode(data, 2, "root")
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
