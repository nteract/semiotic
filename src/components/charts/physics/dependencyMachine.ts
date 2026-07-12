import type { Datum } from "../shared/datumTypes"
import { resolveMotionAccessor } from "../shared/motionEncoding"
import { buildDirectedAdjacency, reachableFrom } from "../../recipes/networkAnalysis"

export type DependencyAccessor<TDatum, TValue> =
  | keyof TDatum
  | ((datum: TDatum, index: number) => TValue)

export type DependencyTaskStatus =
  | "done"
  | "in-progress"
  | "blocked"
  | "waiting"

export interface DependencyMachineAccessors<TDatum extends Datum = Datum> {
  taskIDAccessor: DependencyAccessor<TDatum, string | number>
  labelAccessor: DependencyAccessor<TDatum, string>
  laneAccessor: DependencyAccessor<TDatum, string>
  dependencyAccessor: DependencyAccessor<TDatum, readonly (string | number)[]>
  startAccessor?: DependencyAccessor<TDatum, number | Date | undefined>
  endAccessor?: DependencyAccessor<TDatum, number | Date | undefined>
  progressAccessor?: DependencyAccessor<TDatum, number | undefined>
  statusAccessor?: DependencyAccessor<TDatum, DependencyTaskStatus | undefined>
  completionTimeAccessor?: DependencyAccessor<TDatum, number | Date | undefined>
  blockerAccessor?: DependencyAccessor<TDatum, string | undefined>
  milestoneAccessor?: DependencyAccessor<TDatum, boolean | undefined>
}

export interface CompileDependencyMachineOptions<TDatum extends Datum = Datum>
  extends DependencyMachineAccessors<TDatum> {
  data: readonly TDatum[]
  /** Defaults to first-seen lane order. */
  laneOrder?: readonly string[]
}

export type DependencyMachineDiagnosticCode =
  | "duplicate-task-id"
  | "missing-dependency"
  | "cycle"

export interface DependencyMachineDiagnostic {
  code: DependencyMachineDiagnosticCode
  message: string
  taskIDs: string[]
}

export interface DependencyMachineNode<TDatum extends Datum = Datum> {
  id: string
  label: string
  lane: string
  laneIndex: number
  level: number
  index: number
  datum: TDatum
  dependencyIDs: string[]
  incomingEdgeIDs: string[]
  outgoingEdgeIDs: string[]
  socketIDs: string[]
  start?: number | Date
  end?: number | Date
  progress: number
  status: DependencyTaskStatus
  completionTime?: number | Date
  blockerReason?: string
  milestone: boolean
}

export interface DependencyMachineEdge {
  id: string
  sourceID: string
  targetID: string
  sourceIndex: number
  targetIndex: number
  socketID: string
  socketIndex: number
}

export interface DependencyMachine<TDatum extends Datum = Datum> {
  nodes: DependencyMachineNode<TDatum>[]
  edges: DependencyMachineEdge[]
  byID: Map<string, DependencyMachineNode<TDatum>>
  incoming: Map<string, DependencyMachineEdge[]>
  outgoing: Map<string, DependencyMachineEdge[]>
  lanes: string[]
  maxLevel: number
  diagnostics: DependencyMachineDiagnostic[]
  valid: boolean
}

export interface DependencyPoint {
  x: number
  y: number
}

export interface DependencyTrackDimensions {
  width: number
  height: number
  paddingX?: number
  paddingTop?: number
  paddingBottom?: number
}

export interface DependencyTrackOptions {
  taskWidth?: number
  taskHeight?: number
  gutterCount?: number
  socketRadius?: number
}

export interface DependencyTaskPlacement extends DependencyPoint {
  taskID: string
  lane: string
  laneIndex: number
  level: number
  width: number
  height: number
}

export interface DependencySocketPlacement extends DependencyPoint {
  id: string
  edgeID: string
  taskID: string
  index: number
  radius: number
}

export interface DependencyTrackRoute {
  edgeID: string
  sourceID: string
  targetID: string
  socketID: string
  points: DependencyPoint[]
}

export interface DependencyTrackLayout {
  tasks: DependencyTaskPlacement[]
  sockets: DependencySocketPlacement[]
  routes: DependencyTrackRoute[]
  taskByID: Map<string, DependencyTaskPlacement>
  socketByID: Map<string, DependencySocketPlacement>
  routeByEdgeID: Map<string, DependencyTrackRoute>
}

export interface LogicalJoinSnapshot {
  taskID: string
  mode: "all"
  incomingEdgeIDs: string[]
  deliveredEdgeIDs: string[]
  satisfied: boolean
}

export interface LogicalJoin {
  taskID: string
  mode: "all"
  incomingEdgeIDs: readonly string[]
  deliver: (edgeID: string) => boolean
  reset: (deliveredEdgeIDs?: Iterable<string>) => void
  isSatisfied: () => boolean
  getSnapshot: () => LogicalJoinSnapshot
}

export type DependencyReplayEvent =
  | { type: "task-completed"; taskID: string; at: number | Date }
  | { type: "task-blocked"; taskID: string; reason: string; at: number | Date }
  | { type: "task-unblocked"; taskID: string; at: number | Date }
  | { type: "dependency-delivered"; edgeID: string; at: number | Date }
  | { type: "task-armed"; taskID: string; at: number | Date }

export type DependencyReplayClock =
  | number
  | Date
  | { currentTime: number | Date }

export interface DependencyReplayState {
  currentTime: number
  appliedEvents: DependencyReplayEvent[]
  completedTaskIDs: Set<string>
  blockedByTaskID: Map<string, string>
  deliveredEdgeIDs: Set<string>
  armedTaskIDs: Set<string>
}

export interface BlockerAmplification {
  blockerID: string
  downstreamTaskCount: number
  affectedLaneCount: number
  downstreamTaskIDs: string[]
  affectedLanes: string[]
}

export interface BlockerAmplificationOptions<TDatum extends Datum = Datum> {
  completedTaskIDs?: Iterable<string>
  isComplete?: (node: DependencyMachineNode<TDatum>) => boolean
}

// `DependencyAccessor` is the constant-less subset of `MotionEncodingAccessor`,
// so the shared eager resolver covers it exactly — this adapter only reorders
// args to the (datum, index, accessor) convention the call sites read best in.
function readAccessor<TDatum, TValue>(
  datum: TDatum,
  index: number,
  accessor: DependencyAccessor<TDatum, TValue> | undefined
): TValue | undefined {
  return resolveMotionAccessor(accessor, datum, index)
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function stableEdgeID(sourceID: string, targetID: string): string {
  return `dependency:${encodeURIComponent(sourceID)}:${encodeURIComponent(targetID)}`
}

function stableSocketID(targetID: string, index: number): string {
  return `socket:${encodeURIComponent(targetID)}:${index}`
}

function clamp01(value: unknown): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(1, number))
}

/**
 * Compile task records into deterministic directed-DAG structure. Invalid
 * graphs are returned with explicit diagnostics so a chart can render a useful
 * failure state rather than silently inventing dependency order.
 */
export function compileDependencyMachine<TDatum extends Datum = Datum>(
  options: CompileDependencyMachineOptions<TDatum>
): DependencyMachine<TDatum> {
  const diagnostics: DependencyMachineDiagnostic[] = []
  const byID = new Map<string, DependencyMachineNode<TDatum>>()
  const firstSeenLanes: string[] = []
  const seenLanes = new Set<string>()

  options.data.forEach((datum, index) => {
    const id = String(readAccessor(datum, index, options.taskIDAccessor) ?? "")
    if (!id) {
      diagnostics.push({
        code: "duplicate-task-id",
        message: `Task row ${index} has an empty id.`,
        taskIDs: []
      })
      return
    }
    if (byID.has(id)) {
      diagnostics.push({
        code: "duplicate-task-id",
        message: `Task id "${id}" occurs more than once.`,
        taskIDs: [id]
      })
      return
    }
    const lane = String(readAccessor(datum, index, options.laneAccessor) ?? "Unassigned")
    if (!seenLanes.has(lane)) {
      seenLanes.add(lane)
      firstSeenLanes.push(lane)
    }
    const rawDependencies =
      readAccessor(datum, index, options.dependencyAccessor) ?? []
    const dependencyIDs = Array.from(
      new Set(Array.from(rawDependencies, (value) => String(value)))
    ).sort(compareText)
    const blockerReason = readAccessor(datum, index, options.blockerAccessor)
    const authoredStatus = readAccessor(datum, index, options.statusAccessor)
    const status = authoredStatus ?? (blockerReason ? "blocked" : "waiting")
    byID.set(id, {
      id,
      label: String(readAccessor(datum, index, options.labelAccessor) ?? id),
      lane,
      laneIndex: 0,
      level: 0,
      index,
      datum,
      dependencyIDs,
      incomingEdgeIDs: [],
      outgoingEdgeIDs: [],
      socketIDs: [],
      start: readAccessor(datum, index, options.startAccessor),
      end: readAccessor(datum, index, options.endAccessor),
      progress: clamp01(readAccessor(datum, index, options.progressAccessor)),
      status,
      completionTime: readAccessor(
        datum,
        index,
        options.completionTimeAccessor
      ),
      blockerReason: blockerReason || undefined,
      milestone: Boolean(readAccessor(datum, index, options.milestoneAccessor))
    })
  })

  const laneOrder = options.laneOrder
    ? [
        ...options.laneOrder,
        ...firstSeenLanes.filter((lane) => !options.laneOrder?.includes(lane))
      ]
    : firstSeenLanes
  const laneIndex = new Map(laneOrder.map((lane, index) => [lane, index]))
  for (const node of byID.values()) node.laneIndex = laneIndex.get(node.lane) ?? 0

  const incoming = new Map<string, DependencyMachineEdge[]>()
  const outgoing = new Map<string, DependencyMachineEdge[]>()
  for (const id of byID.keys()) {
    incoming.set(id, [])
    outgoing.set(id, [])
  }

  const edges: DependencyMachineEdge[] = []
  const orderedTargets = [...byID.values()].sort((a, b) => a.index - b.index)
  for (const target of orderedTargets) {
    target.dependencyIDs.forEach((sourceID, socketIndex) => {
      const source = byID.get(sourceID)
      if (!source) {
        diagnostics.push({
          code: "missing-dependency",
          message: `Task "${target.id}" depends on missing task "${sourceID}".`,
          taskIDs: [target.id, sourceID]
        })
        return
      }
      const edge: DependencyMachineEdge = {
        id: stableEdgeID(sourceID, target.id),
        sourceID,
        targetID: target.id,
        sourceIndex: source.index,
        targetIndex: target.index,
        socketID: stableSocketID(target.id, socketIndex),
        socketIndex
      }
      edges.push(edge)
      incoming.get(target.id)?.push(edge)
      outgoing.get(sourceID)?.push(edge)
      target.incomingEdgeIDs.push(edge.id)
      target.socketIDs.push(edge.socketID)
      source.outgoingEdgeIDs.push(edge.id)
    })
  }

  for (const edgeList of incoming.values()) {
    edgeList.sort((a, b) => compareText(a.sourceID, b.sourceID))
    edgeList.forEach((edge, index) => {
      edge.socketIndex = index
      edge.socketID = stableSocketID(edge.targetID, index)
    })
  }
  for (const edgeList of outgoing.values()) {
    edgeList.sort((a, b) => compareText(a.targetID, b.targetID))
  }
  for (const node of byID.values()) {
    const incomingEdges = incoming.get(node.id) ?? []
    node.incomingEdgeIDs = incomingEdges.map((edge) => edge.id)
    node.socketIDs = incomingEdges.map((edge) => edge.socketID)
    node.outgoingEdgeIDs = (outgoing.get(node.id) ?? []).map((edge) => edge.id)
  }

  const indegree = new Map<string, number>()
  const levels = new Map<string, number>()
  for (const id of byID.keys()) {
    indegree.set(id, incoming.get(id)?.length ?? 0)
    levels.set(id, 0)
  }
  const queue = [...byID.keys()]
    .filter((id) => indegree.get(id) === 0)
    .sort(compareText)
  let visited = 0
  while (queue.length) {
    const sourceID = queue.shift() as string
    visited += 1
    for (const edge of outgoing.get(sourceID) ?? []) {
      const nextLevel = Math.max(
        levels.get(edge.targetID) ?? 0,
        (levels.get(sourceID) ?? 0) + 1
      )
      levels.set(edge.targetID, nextLevel)
      const nextIndegree = (indegree.get(edge.targetID) ?? 0) - 1
      indegree.set(edge.targetID, nextIndegree)
      if (nextIndegree === 0) {
        const insertion = queue.findIndex((candidate) => candidate > edge.targetID)
        if (insertion < 0) queue.push(edge.targetID)
        else queue.splice(insertion, 0, edge.targetID)
      }
    }
  }

  if (visited !== byID.size) {
    const cycleTaskIDs = [...byID.keys()]
      .filter((id) => (indegree.get(id) ?? 0) > 0)
      .sort(compareText)
    diagnostics.push({
      code: "cycle",
      message: `Dependency graph contains a cycle involving: ${cycleTaskIDs.join(", ")}.`,
      taskIDs: cycleTaskIDs
    })
  }

  let maxLevel = 0
  const nodes = [...byID.values()].sort((a, b) => a.index - b.index)
  for (const node of nodes) {
    node.level = levels.get(node.id) ?? 0
    maxLevel = Math.max(maxLevel, node.level)
  }

  return {
    nodes,
    edges,
    byID,
    incoming,
    outgoing,
    lanes: laneOrder,
    maxLevel,
    diagnostics,
    valid: diagnostics.length === 0
  }
}

function distinctPoints(points: DependencyPoint[]): DependencyPoint[] {
  return points.filter((point, index) => {
    const previous = points[index - 1]
    return !previous || previous.x !== point.x || previous.y !== point.y
  })
}

/** Resolve task tiles, receiving sockets, and shared point-based track routes. */
export function routeDependencyTracks<TDatum extends Datum = Datum>(
  machine: DependencyMachine<TDatum>,
  dimensions: DependencyTrackDimensions,
  options: DependencyTrackOptions = {}
): DependencyTrackLayout {
  const width = Math.max(240, dimensions.width)
  const height = Math.max(220, dimensions.height)
  const paddingX = dimensions.paddingX ?? 48
  const paddingTop = dimensions.paddingTop ?? 48
  const paddingBottom = dimensions.paddingBottom ?? 44
  const laneCount = Math.max(1, machine.lanes.length)
  const laneWidth = Math.max(70, (width - paddingX * 2) / laneCount)
  const levelCount = Math.max(1, machine.maxLevel + 1)
  const levelStep = Math.max(
    76,
    (height - paddingTop - paddingBottom) / levelCount
  )
  const taskWidth = Math.min(
    options.taskWidth ?? 112,
    Math.max(58, laneWidth * 0.78)
  )
  const taskHeight = Math.min(options.taskHeight ?? 58, levelStep * 0.64)
  const socketRadius = options.socketRadius ?? 5
  const gutterCount = Math.max(1, Math.round(options.gutterCount ?? 3))
  const grouped = new Map<string, DependencyMachineNode<TDatum>[]>()
  for (const node of machine.nodes) {
    const key = `${node.laneIndex}:${node.level}`
    const group = grouped.get(key) ?? []
    group.push(node)
    grouped.set(key, group)
  }
  for (const group of grouped.values()) group.sort((a, b) => compareText(a.id, b.id))

  const tasks: DependencyTaskPlacement[] = machine.nodes.map((node) => {
    const group = grouped.get(`${node.laneIndex}:${node.level}`) ?? [node]
    const slot = Math.max(0, group.findIndex((candidate) => candidate.id === node.id))
    const centeredSlot = slot - (group.length - 1) / 2
    const slotOffset = centeredSlot * Math.min(18, taskHeight * 0.3)
    return {
      taskID: node.id,
      lane: node.lane,
      laneIndex: node.laneIndex,
      level: node.level,
      x: paddingX + laneWidth * (node.laneIndex + 0.5),
      y: paddingTop + levelStep * (node.level + 0.5) + slotOffset,
      width: taskWidth,
      height: taskHeight
    }
  })
  const taskByID = new Map(tasks.map((task) => [task.taskID, task]))
  const sockets: DependencySocketPlacement[] = []
  const routes: DependencyTrackRoute[] = []

  machine.edges.forEach((edge, edgeIndex) => {
    const source = taskByID.get(edge.sourceID)
    const target = taskByID.get(edge.targetID)
    if (!source || !target) return
    const targetIncoming = machine.incoming.get(edge.targetID) ?? []
    const socketSpan = Math.min(target.width * 0.72, Math.max(1, targetIncoming.length - 1) * 14)
    const socketX = targetIncoming.length <= 1
      ? target.x
      : target.x - socketSpan / 2 + (socketSpan * edge.socketIndex) / (targetIncoming.length - 1)
    const socketY = target.y - target.height / 2 - socketRadius - 2
    const socket: DependencySocketPlacement = {
      id: edge.socketID,
      edgeID: edge.id,
      taskID: target.taskID,
      index: edge.socketIndex,
      x: socketX,
      y: socketY,
      radius: socketRadius
    }
    sockets.push(socket)
    const start = { x: source.x, y: source.y + source.height / 2 + 3 }
    const availableGap = Math.max(18, socketY - start.y)
    const gutterOffset = ((edgeIndex % gutterCount) - (gutterCount - 1) / 2) * 7
    const transferY = Math.min(
      socketY - 10,
      start.y + availableGap * 0.48 + gutterOffset
    )
    routes.push({
      edgeID: edge.id,
      sourceID: edge.sourceID,
      targetID: edge.targetID,
      socketID: edge.socketID,
      points: distinctPoints([
        start,
        { x: start.x, y: transferY },
        { x: socketX, y: transferY },
        { x: socketX, y: socketY }
      ])
    })
  })

  const socketByID = new Map(sockets.map((socket) => [socket.id, socket]))
  const routeByEdgeID = new Map(routes.map((route) => [route.edgeID, route]))
  return { tasks, sockets, routes, taskByID, socketByID, routeByEdgeID }
}

/** Stateful exact logical join. Physics contacts may call `deliver`; they never define the rule. */
export function createLogicalJoin(
  taskID: string,
  incomingEdgeIDs: readonly string[],
  mode: "all" = "all"
): LogicalJoin {
  const expected = Array.from(new Set(incomingEdgeIDs)).sort(compareText)
  const delivered = new Set<string>()
  const isSatisfied = () => expected.every((edgeID) => delivered.has(edgeID))
  return {
    taskID,
    mode,
    incomingEdgeIDs: expected,
    deliver: (edgeID) => {
      if (!expected.includes(edgeID)) return isSatisfied()
      delivered.add(edgeID)
      return isSatisfied()
    },
    reset: (deliveredEdgeIDs = []) => {
      delivered.clear()
      for (const edgeID of deliveredEdgeIDs) {
        if (expected.includes(edgeID)) delivered.add(edgeID)
      }
    },
    isSatisfied,
    getSnapshot: () => ({
      taskID,
      mode,
      incomingEdgeIDs: [...expected],
      deliveredEdgeIDs: [...delivered].sort(compareText),
      satisfied: isSatisfied()
    })
  }
}

function timeNumber(value: number | Date): number {
  return value instanceof Date ? value.getTime() : Number(value)
}

/** Deterministically fold recorded process events through a supplied clock. */
export function replayStateTransitions(
  events: readonly DependencyReplayEvent[],
  clock: DependencyReplayClock
): DependencyReplayState {
  const authoredClock = typeof clock === "object" && !(clock instanceof Date)
    ? clock.currentTime
    : clock
  const currentTime = timeNumber(authoredClock as number | Date)
  const indexed = events
    .map((event, index) => ({ event, index, time: timeNumber(event.at) }))
    .filter((row) => Number.isFinite(row.time) && row.time <= currentTime)
    .sort((a, b) => a.time - b.time || a.index - b.index)
  const completedTaskIDs = new Set<string>()
  const blockedByTaskID = new Map<string, string>()
  const deliveredEdgeIDs = new Set<string>()
  const armedTaskIDs = new Set<string>()
  for (const { event } of indexed) {
    if (event.type === "task-completed") {
      completedTaskIDs.add(event.taskID)
      blockedByTaskID.delete(event.taskID)
    } else if (event.type === "task-blocked") {
      blockedByTaskID.set(event.taskID, event.reason)
    } else if (event.type === "task-unblocked") {
      blockedByTaskID.delete(event.taskID)
    } else if (event.type === "dependency-delivered") {
      deliveredEdgeIDs.add(event.edgeID)
    } else if (event.type === "task-armed") {
      armedTaskIDs.add(event.taskID)
    }
  }
  return {
    currentTime,
    appliedEvents: indexed.map((row) => row.event),
    completedTaskIDs,
    blockedByTaskID,
    deliveredEdgeIDs,
    armedTaskIDs
  }
}

/** Directed unfinished-descendant reach, deliberately not a critical-path claim. */
export function calculateBlockerAmplification<TDatum extends Datum = Datum>(
  machine: DependencyMachine<TDatum>,
  blockerID: string,
  options: BlockerAmplificationOptions<TDatum> = {}
): BlockerAmplification {
  const completed = new Set(options.completedTaskIDs ?? [])
  // Reuse the shared directed-graph reach primitive rather than hand-rolling a
  // BFS — the dependency graph's "which tasks does this blocker sit upstream
  // of" question is exactly a directed reachable set.
  const adjacency = buildDirectedAdjacency(
    machine.nodes,
    machine.edges.map((edge) => ({ source: edge.sourceID, target: edge.targetID }))
  )
  const downstream = [...reachableFrom(adjacency, blockerID)]
    .map((taskID) => machine.byID.get(taskID))
    .filter((node): node is DependencyMachineNode<TDatum> => node != null)
    .filter((node) => {
      const isComplete = options.isComplete
        ? options.isComplete(node)
        : completed.has(node.id) || node.status === "done"
      return !isComplete
    })
    .sort((a, b) => a.index - b.index)
  const affectedLanes = Array.from(new Set(downstream.map((node) => node.lane)))
  return {
    blockerID,
    downstreamTaskCount: downstream.length,
    affectedLaneCount: affectedLanes.length,
    downstreamTaskIDs: downstream.map((node) => node.id),
    affectedLanes
  }
}

