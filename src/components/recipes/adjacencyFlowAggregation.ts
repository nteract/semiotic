import type { Datum } from "../charts/shared/datumTypes"
import { readField } from "./recipeUtils"

export type AdjacencyFlowNodeAccessor =
  string | ((node: Datum) => string | undefined)
export type AdjacencyFlowEdgeAccessor =
  string | ((edge: Datum) => string | undefined)
export type AdjacencyFlowValueAccessor =
  string | ((edge: Datum) => number | undefined)

export interface AggregateAdjacencyFlowOptions {
  /** Node field (or callback) that names the ordered step. @default "id" */
  nodeIdAccessor?: AdjacencyFlowNodeAccessor
  /** Node field (or callback) that supplies the collapsed group. @default "group" */
  groupAccessor?: AdjacencyFlowNodeAccessor
  /** Node field (or callback) used for group/member labels. @default "label" */
  labelAccessor?: AdjacencyFlowNodeAccessor
  /** Edge endpoint fields (or callbacks). @default "source" / "target" */
  sourceAccessor?: AdjacencyFlowEdgeAccessor
  targetAccessor?: AdjacencyFlowEdgeAccessor
  /** Edge weight field (or callback). @default "value" */
  valueAccessor?: AdjacencyFlowValueAccessor
  /** Groups left at member-level detail while every other multi-node group collapses. */
  expandedGroups?: Iterable<string>
  /** Keep one-node groups as aggregate nodes too. @default false */
  collapseSingletons?: boolean
  /** Preserve within-group movement as a self-flow on a collapsed node. @default true */
  includeInternalFlows?: boolean
  /** Prefix for generated collapsed-node ids. @default "group:" */
  groupIdPrefix?: string
}

export type AggregatedAdjacencyFlowNode = Datum & {
  id: string
  label: string
  group: string
  aggregate: boolean
  memberIds: string[]
  memberCount: number
  internalValue: number
  incomingValue: number
  outgoingValue: number
}

export type AggregatedAdjacencyFlowEdge = Datum & {
  source: string
  target: string
  value: number
  edgeCount: number
  internal: boolean
  memberEdges: Datum[]
}

export interface AdjacencyFlowGroupSummary {
  group: string
  nodeId: string | null
  label: string
  collapsed: boolean
  memberIds: string[]
  internalValue: number
  incomingValue: number
  outgoingValue: number
}

export interface AggregatedAdjacencyFlowResult {
  nodes: AggregatedAdjacencyFlowNode[]
  edges: AggregatedAdjacencyFlowEdge[]
  groups: AdjacencyFlowGroupSummary[]
  /** Edges with missing endpoints, non-positive values, or non-finite values. */
  omittedEdgeCount: number
}

interface MemberNode {
  id: string
  label: string
  group: string
  datum: Datum
}

function stringFromAccessor(
  datum: Datum,
  accessor: string | ((datum: Datum) => string | undefined),
  fallback: string
): string {
  const value =
    typeof accessor === "function"
      ? accessor(datum)
      : readField(datum, accessor, fallback)
  return value == null || value === "" ? fallback : String(value)
}

function edgeEndpoint(
  edge: Datum,
  accessor: AdjacencyFlowEdgeAccessor
): string | undefined {
  const value =
    typeof accessor === "function"
      ? accessor(edge)
      : readField(edge, accessor, undefined)
  if (value == null) return undefined
  if (typeof value === "object") {
    const id = (value as { id?: unknown }).id
    return id == null ? undefined : String(id)
  }
  return String(value)
}

function edgeValue(edge: Datum, accessor: AdjacencyFlowValueAccessor): number {
  const value =
    typeof accessor === "function"
      ? accessor(edge)
      : readField(edge, accessor, 1)
  return Number(value)
}

function uniqueGroupId(base: string, occupied: Set<string>): string {
  if (!occupied.has(base)) {
    occupied.add(base)
    return base
  }
  let suffix = 2
  while (occupied.has(`${base}-${suffix}`)) suffix += 1
  const id = `${base}-${suffix}`
  occupied.add(id)
  return id
}

/**
 * Collapse an ordered flow network into group-level steps while retaining the
 * weighted movement needed by {@link adjacencyFlowLayout}. The transform is
 * deliberately headless: use it for a static summary, or change
 * `expandedGroups` in application state for expand/collapse exploration.
 *
 * Parallel cross-group edges are summed. Within-group edges become a self-flow
 * by default, so a summary does not silently discard the activity that made the
 * detail view substantial.
 */
export function aggregateAdjacencyFlow(
  inputNodes: readonly Datum[],
  inputEdges: readonly Datum[],
  options: AggregateAdjacencyFlowOptions = {}
): AggregatedAdjacencyFlowResult {
  const nodeIdAccessor = options.nodeIdAccessor ?? "id"
  const groupAccessor = options.groupAccessor ?? "group"
  const labelAccessor = options.labelAccessor ?? "label"
  const sourceAccessor = options.sourceAccessor ?? "source"
  const targetAccessor = options.targetAccessor ?? "target"
  const valueAccessor = options.valueAccessor ?? "value"
  const expanded = new Set(options.expandedGroups ?? [])
  const includeInternal = options.includeInternalFlows ?? true

  const members: MemberNode[] = []
  const memberById = new Map<string, MemberNode>()
  const grouped = new Map<string, MemberNode[]>()

  for (const datum of inputNodes) {
    const fallbackId = String(members.length)
    const id = stringFromAccessor(datum, nodeIdAccessor, fallbackId)
    if (memberById.has(id)) continue
    const label = stringFromAccessor(datum, labelAccessor, id)
    const group = stringFromAccessor(datum, groupAccessor, id)
    const member = { id, label, group, datum }
    members.push(member)
    memberById.set(id, member)
    const bucket = grouped.get(group)
    if (bucket) bucket.push(member)
    else grouped.set(group, [member])
  }

  const occupiedIds = new Set(members.map((member) => member.id))
  const outputNodes: AggregatedAdjacencyFlowNode[] = []
  const outputNodeById = new Map<string, AggregatedAdjacencyFlowNode>()
  const memberToOutput = new Map<string, string>()
  const groupSummaries: AdjacencyFlowGroupSummary[] = []

  for (const [group, groupMembers] of grouped) {
    const collapsed =
      !expanded.has(group) &&
      (options.collapseSingletons === true || groupMembers.length > 1)
    if (collapsed) {
      const id = uniqueGroupId(
        `${options.groupIdPrefix ?? "group:"}${group}`,
        occupiedIds
      )
      const node: AggregatedAdjacencyFlowNode = {
        id,
        label: group,
        group,
        aggregate: true,
        memberIds: groupMembers.map((member) => member.id),
        memberCount: groupMembers.length,
        internalValue: 0,
        incomingValue: 0,
        outgoingValue: 0
      }
      outputNodes.push(node)
      outputNodeById.set(id, node)
      for (const member of groupMembers) memberToOutput.set(member.id, id)
      groupSummaries.push({
        group,
        nodeId: id,
        label: group,
        collapsed: true,
        memberIds: [...node.memberIds],
        internalValue: 0,
        incomingValue: 0,
        outgoingValue: 0
      })
      continue
    }

    for (const member of groupMembers) {
      const node: AggregatedAdjacencyFlowNode = {
        ...member.datum,
        id: member.id,
        label: member.label,
        group,
        aggregate: false,
        memberIds: [member.id],
        memberCount: 1,
        internalValue: 0,
        incomingValue: 0,
        outgoingValue: 0
      }
      outputNodes.push(node)
      outputNodeById.set(node.id, node)
      memberToOutput.set(member.id, node.id)
    }
    groupSummaries.push({
      group,
      nodeId: null,
      label: group,
      collapsed: false,
      memberIds: groupMembers.map((member) => member.id),
      internalValue: 0,
      incomingValue: 0,
      outgoingValue: 0
    })
  }

  const summaryByGroup = new Map(
    groupSummaries.map((summary) => [summary.group, summary])
  )
  const edgeMap = new Map<string, Map<string, AggregatedAdjacencyFlowEdge>>()
  let omittedEdgeCount = 0

  for (const datum of inputEdges) {
    const sourceMember = edgeEndpoint(datum, sourceAccessor)
    const targetMember = edgeEndpoint(datum, targetAccessor)
    const value = edgeValue(datum, valueAccessor)
    const source =
      sourceMember == null ? undefined : memberToOutput.get(sourceMember)
    const target =
      targetMember == null ? undefined : memberToOutput.get(targetMember)
    if (!source || !target || !Number.isFinite(value) || value <= 0) {
      omittedEdgeCount += 1
      continue
    }

    const sourceGroup = memberById.get(sourceMember as string)?.group
    const targetGroup = memberById.get(targetMember as string)?.group
    if (sourceGroup && targetGroup && sourceGroup === targetGroup) {
      const summary = summaryByGroup.get(sourceGroup)
      if (summary) summary.internalValue += value
    } else {
      if (sourceGroup) {
        const summary = summaryByGroup.get(sourceGroup)
        if (summary) summary.outgoingValue += value
      }
      if (targetGroup) {
        const summary = summaryByGroup.get(targetGroup)
        if (summary) summary.incomingValue += value
      }
    }

    let targets = edgeMap.get(source)
    if (!targets) {
      targets = new Map()
      edgeMap.set(source, targets)
    }
    const existing = targets.get(target)
    if (existing) {
      existing.value += value
      existing.edgeCount += 1
      existing.memberEdges.push(datum)
    } else {
      targets.set(target, {
        source,
        target,
        value,
        edgeCount: 1,
        internal: source === target,
        memberEdges: [datum]
      })
    }
  }

  const allEdges = [...edgeMap.values()].flatMap((targets) => [
    ...targets.values()
  ])
  for (const edge of allEdges) {
    const sourceNode = outputNodeById.get(edge.source)
    const targetNode = outputNodeById.get(edge.target)
    if (edge.internal) {
      if (sourceNode) sourceNode.internalValue += edge.value
    } else {
      if (sourceNode) sourceNode.outgoingValue += edge.value
      if (targetNode) targetNode.incomingValue += edge.value
    }
  }

  return {
    nodes: outputNodes,
    edges: includeInternal
      ? allEdges
      : allEdges.filter((edge) => !edge.internal),
    groups: groupSummaries,
    omittedEdgeCount
  }
}
