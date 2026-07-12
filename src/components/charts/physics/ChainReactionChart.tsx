"use client"

import * as React from "react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react"
import type { Datum } from "../shared/datumTypes"
import type { PhysicsBodyState, PhysicsColliderSpec } from "../../stream/physics/PhysicsKernel"
import type {
  PhysicsPipelineControlSurface,
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import StreamPhysicsFrame, {
  type PhysicsSemanticItem,
  type StreamPhysicsBodyForceContext,
  type StreamPhysicsFrameHandle
} from "../../stream/physics/StreamPhysicsFrame"
import {
  calculateBlockerAmplification,
  compileDependencyMachine,
  routeDependencyTracks,
  type BlockerAmplification,
  type DependencyAccessor,
  type DependencyMachine,
  type DependencyMachineEdge,
  type DependencyMachineNode,
  type DependencyPoint,
  type DependencyTaskStatus,
  type DependencyTrackLayout,
  type DependencyTrackRoute
} from "./dependencyMachine"

export type ChainReactionMode = "snapshot" | "replay" | "mechanical"
export type ChainReactionInsight = "none" | "blocker-amplification"
export type ChainReactionControl = "play" | "pause" | "step" | "reset" | "settle"

export type ChainReactionObservation<TDatum extends Datum = Datum> =
  | { type: "task-completed"; taskID: string; datum: TDatum }
  | { type: "dependency-delivered"; sourceID: string; targetID: string }
  | { type: "task-armed"; taskID: string }
  | {
      type: "machine-stalled"
      blockerID: string
      downstreamTaskCount: number
      affectedLaneCount: number
    }
  | { type: "blocker-previewed"; blockerID: string; downstreamTaskIDs: string[] }
  | { type: "machine-settled" }

export interface ChainReactionTaskState {
  taskID: string
  completed: boolean
  armed: boolean
  blocked: boolean
  blockerReason?: string
}

export interface ChainReactionDependencyState {
  edgeID: string
  sourceID: string
  targetID: string
  state: "waiting" | "in-flight" | "delivered"
}

export interface ChainReactionMachineState {
  currentTime: number
  playing: boolean
  previewTaskID: string | null
  selectedTaskIDs: string[]
  tasks: ChainReactionTaskState[]
  dependencies: ChainReactionDependencyState[]
}

export interface ChainReactionChartHandle {
  play: () => void
  pause: () => void
  step: () => void
  reset: () => void
  settle: () => void
  previewResolve: (taskID: string) => void
  clearPreview: () => void
  completeTask: (taskID: string) => void
  blockTask: (taskID: string, reason: string) => void
  unblockTask: (taskID: string) => void
  getAmplification: (taskID: string) => BlockerAmplification
  getMachineState: () => ChainReactionMachineState
}

export interface ChainReactionChartProps<TDatum extends Datum = Datum> {
  data: readonly TDatum[]
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
  mechanism?: "domino-ball"
  orientation?: "vertical"
  mode?: ChainReactionMode
  insight?: ChainReactionInsight
  currentTime?: number | Date
  controls?: boolean | readonly ChainReactionControl[]
  selectedTaskIDs?: readonly string[]
  onSelectionChange?: (ids: string[]) => void
  onObservation?: (event: ChainReactionObservation<TDatum>) => void
  reducedMotion?: "settle"
  seed?: number
  width?: number
  height?: number
  responsiveWidth?: boolean
  responsiveHeight?: boolean
  title?: string
  description?: string
  className?: string
  accessibleTable?: boolean
  enableHover?: boolean
}

interface RuntimeState {
  currentTime: number
  playing: boolean
  completed: Set<string>
  delivered: Set<string>
  inFlight: Set<string>
  armed: Set<string>
  blockers: Map<string, string>
  previewTaskID: string | null
}

interface DependencyBallDatum {
  kind: "dependency-ball"
  edgeID: string
  sourceID: string
  targetID: string
  route: DependencyPoint[]
}

const EMPTY_SPAWNS: PhysicsQueuedSpawn[] = []

function numericTime(value: number | Date | undefined, fallback = 0): number {
  if (value instanceof Date) return value.getTime()
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function taskCompletionTime<TDatum extends Datum>(
  node: DependencyMachineNode<TDatum>
): number | null {
  if (node.completionTime == null) return null
  const value = numericTime(node.completionTime, Number.NaN)
  return Number.isFinite(value) ? value : null
}

function resolvedArmed<TDatum extends Datum>(
  machine: DependencyMachine<TDatum>,
  delivered: ReadonlySet<string>,
  blockers: ReadonlyMap<string, string>,
  completed: ReadonlySet<string>
): Set<string> {
  const armed = new Set<string>()
  for (const node of machine.nodes) {
    const incoming = machine.incoming.get(node.id) ?? []
    if (
      completed.has(node.id) ||
      (!blockers.has(node.id) && incoming.every((edge) => delivered.has(edge.id)))
    ) {
      armed.add(node.id)
    }
  }
  return armed
}

function initialRuntime<TDatum extends Datum>(
  machine: DependencyMachine<TDatum>,
  mode: ChainReactionMode,
  currentTime: number,
  reducedMotion: boolean
): RuntimeState {
  const recordedTimes = machine.nodes
    .map(taskCompletionTime)
    .filter((value): value is number => value != null)
  const replayStart = recordedTimes.length ? Math.min(...recordedTimes) - 1 : 0
  const effectiveTime = mode === "replay" && !reducedMotion ? replayStart : currentTime
  const completed = new Set<string>()
  const blockers = new Map<string, string>()
  for (const node of machine.nodes) {
    const completionTime = taskCompletionTime(node)
    const completedAtClock = completionTime != null && completionTime <= effectiveTime
    const authoredDone = node.status === "done" && mode !== "replay"
    if (completedAtClock || authoredDone) completed.add(node.id)
    if (node.blockerReason && !completed.has(node.id)) {
      blockers.set(node.id, node.blockerReason)
    }
  }
  const delivered = new Set<string>()
  if (mode !== "replay" || reducedMotion) {
    for (const edge of machine.edges) {
      if (completed.has(edge.sourceID)) delivered.add(edge.id)
    }
  }
  return {
    currentTime: effectiveTime,
    playing: false,
    completed,
    delivered,
    inFlight: new Set(),
    armed: resolvedArmed(machine, delivered, blockers, completed),
    blockers,
    previewTaskID: null
  }
}

function copyRuntime(runtime: RuntimeState): RuntimeState {
  return {
    ...runtime,
    completed: new Set(runtime.completed),
    delivered: new Set(runtime.delivered),
    inFlight: new Set(runtime.inFlight),
    armed: new Set(runtime.armed),
    blockers: new Map(runtime.blockers)
  }
}

function routeLength(points: readonly DependencyPoint[]): number {
  let length = 0
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y
    )
  }
  return length
}

function pointAtDistance(
  points: readonly DependencyPoint[],
  targetDistance: number
): { point: DependencyPoint; tangent: DependencyPoint } {
  if (points.length < 2) {
    return { point: points[0] ?? { x: 0, y: 0 }, tangent: { x: 0, y: 1 } }
  }
  let traveled = 0
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const dx = current.x - previous.x
    const dy = current.y - previous.y
    const length = Math.hypot(dx, dy)
    if (length <= 0) continue
    if (traveled + length >= targetDistance) {
      const local = Math.max(0, Math.min(1, (targetDistance - traveled) / length))
      return {
        point: { x: previous.x + dx * local, y: previous.y + dy * local },
        tangent: { x: dx / length, y: dy / length }
      }
    }
    traveled += length
  }
  const previous = points[points.length - 2]
  const current = points[points.length - 1]
  const dx = current.x - previous.x
  const dy = current.y - previous.y
  const length = Math.hypot(dx, dy) || 1
  return { point: current, tangent: { x: dx / length, y: dy / length } }
}

function projectDistanceAlongRoute(
  body: PhysicsBodyState,
  points: readonly DependencyPoint[]
): number {
  let bestDistance = Number.POSITIVE_INFINITY
  let bestProgress = 0
  let traveled = 0
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const dx = current.x - previous.x
    const dy = current.y - previous.y
    const lengthSquared = dx * dx + dy * dy
    const length = Math.sqrt(lengthSquared)
    if (length <= 0) continue
    const local = Math.max(
      0,
      Math.min(1, ((body.x - previous.x) * dx + (body.y - previous.y) * dy) / lengthSquared)
    )
    const x = previous.x + dx * local
    const y = previous.y + dy * local
    const distance = Math.hypot(body.x - x, body.y - y)
    if (distance < bestDistance) {
      bestDistance = distance
      bestProgress = traveled + local * length
    }
    traveled += length
  }
  return bestProgress
}

function dependencyBallDatum(body: PhysicsBodyState): DependencyBallDatum | null {
  const datum = body.datum as Partial<DependencyBallDatum> | undefined
  return datum?.kind === "dependency-ball" && Array.isArray(datum.route)
    ? (datum as DependencyBallDatum)
    : null
}

function dependencyBodyForce(
  context: StreamPhysicsBodyForceContext
): { x: number; y: number } | null {
  const datum = dependencyBallDatum(context.body)
  if (!datum || datum.route.length < 2) return null
  const length = routeLength(datum.route)
  const progress = projectDistanceAlongRoute(context.body, datum.route)
  const lookahead = pointAtDistance(datum.route, Math.min(length, progress + 22))
  const speed = 78
  const targetVX = lookahead.tangent.x * speed
  const targetVY = lookahead.tangent.y * speed
  return {
    x: (targetVX - context.body.vx) * 2.5 + (lookahead.point.x - context.body.x) * 8,
    y: (targetVY - context.body.vy) * 2.5 + (lookahead.point.y - context.body.y) * 8
  }
}

function ballSpawn(edge: DependencyMachineEdge, route: DependencyTrackRoute): PhysicsQueuedSpawn {
  const start = route.points[0] ?? { x: 0, y: 0 }
  const next = route.points[1] ?? start
  const dx = next.x - start.x
  const dy = next.y - start.y
  const length = Math.hypot(dx, dy) || 1
  return {
    id: `dependency-ball:${edge.id}`,
    x: start.x,
    y: start.y,
    vx: (dx / length) * 42,
    vy: (dy / length) * 42,
    mass: 0.7,
    restitution: 0.02,
    friction: 0.12,
    bodyCollisions: false,
    shape: { type: "circle", radius: 5 },
    datum: {
      kind: "dependency-ball",
      edgeID: edge.id,
      sourceID: edge.sourceID,
      targetID: edge.targetID,
      route: route.points
    } satisfies DependencyBallDatum
  }
}

function statusColor<TDatum extends Datum>(
  node: DependencyMachineNode<TDatum>,
  runtime: RuntimeState
): string {
  if (runtime.completed.has(node.id)) return "var(--semiotic-success, #2b8a66)"
  if (runtime.blockers.has(node.id)) return "var(--semiotic-error, #c64035)"
  if (node.status === "in-progress") return "var(--semiotic-warning, #d18a22)"
  if (runtime.armed.has(node.id)) return "var(--semiotic-primary, #2474a6)"
  return "var(--semiotic-muted, #75818a)"
}

function machineSemanticItems<TDatum extends Datum>(
  machine: DependencyMachine<TDatum>,
  layout: DependencyTrackLayout,
  runtime: RuntimeState
): PhysicsSemanticItem[] {
  return machine.nodes.flatMap((node) => {
    const placement = layout.taskByID.get(node.id)
    if (!placement) return []
    const incoming = machine.incoming.get(node.id) ?? []
    const deliveredCount = incoming.filter((edge) => runtime.delivered.has(edge.id)).length
    const blocker = runtime.blockers.get(node.id)
    const state = runtime.completed.has(node.id)
      ? "completed"
      : blocker
        ? `blocked: ${blocker}`
        : runtime.armed.has(node.id)
          ? "armed"
          : "waiting"
    return [{
      id: node.id,
      label: `${node.label}, ${node.lane}, ${Math.round(node.progress * 100)}%, ${state}`,
      description: `${deliveredCount} of ${incoming.length} prerequisites delivered.`,
      datum: node.datum,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      shape: "rect" as const,
      group: node.lane
    }]
  })
}

const hiddenTableStyle: React.CSSProperties = {
  border: 0,
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  margin: -1,
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: 1
}

export const ChainReactionChart = forwardRef(function ChainReactionChart<
  TDatum extends Datum = Datum
>(
  props: ChainReactionChartProps<TDatum>,
  ref: React.Ref<ChainReactionChartHandle>
) {
  const {
    data,
    taskIDAccessor,
    labelAccessor,
    laneAccessor,
    dependencyAccessor,
    startAccessor,
    endAccessor,
    progressAccessor,
    statusAccessor,
    completionTimeAccessor,
    blockerAccessor,
    milestoneAccessor,
    mode = "snapshot",
    insight = "blocker-amplification",
    currentTime,
    controls = false,
    selectedTaskIDs: controlledSelection,
    onSelectionChange,
    onObservation,
    reducedMotion,
    seed = 31,
    width = 920,
    height = 620,
    responsiveWidth,
    responsiveHeight,
    title = "Dependency chain reaction",
    description,
    className,
    accessibleTable = true,
    enableHover = true
  } = props
  const frameRef = useRef<StreamPhysicsFrameHandle>(null)
  const [internalSelection, setInternalSelection] = useState<string[]>([])
  const selectedTaskIDs = controlledSelection
    ? Array.from(controlledSelection)
    : internalSelection
  const selectedSet = useMemo(() => new Set(selectedTaskIDs), [selectedTaskIDs])
  const now = numericTime(currentTime, Number.POSITIVE_INFINITY)
  const reduced = reducedMotion === "settle"

  const machine = useMemo(
    () => compileDependencyMachine({
      data,
      taskIDAccessor,
      labelAccessor,
      laneAccessor,
      dependencyAccessor,
      startAccessor,
      endAccessor,
      progressAccessor,
      statusAccessor,
      completionTimeAccessor,
      blockerAccessor,
      milestoneAccessor
    }),
    [
      data,
      taskIDAccessor,
      labelAccessor,
      laneAccessor,
      dependencyAccessor,
      startAccessor,
      endAccessor,
      progressAccessor,
      statusAccessor,
      completionTimeAccessor,
      blockerAccessor,
      milestoneAccessor
    ]
  )
  const layout = useMemo(
    () => routeDependencyTracks(machine, { width, height }),
    [machine, width, height]
  )
  const [runtime, setRuntime] = useState<RuntimeState>(() =>
    initialRuntime(machine, mode, now, reduced)
  )
  const runtimeRef = useRef(runtime)
  const commitRuntime = useCallback((next: RuntimeState) => {
    runtimeRef.current = next
    setRuntime(next)
  }, [])

  const emit = useCallback(
    (event: ChainReactionObservation<TDatum>) => onObservation?.(event),
    [onObservation]
  )

  useEffect(() => {
    const next = initialRuntime(machine, mode, now, reduced)
    frameRef.current?.clear()
    runtimeRef.current = next
    setRuntime(next)
  }, [machine, mode, now, reduced])

  const selectTask = useCallback((taskID: string) => {
    const next = selectedSet.has(taskID)
      ? selectedTaskIDs.filter((id) => id !== taskID)
      : [taskID]
    if (!controlledSelection) setInternalSelection(next)
    onSelectionChange?.(next)
  }, [controlledSelection, onSelectionChange, selectedSet, selectedTaskIDs])

  const releaseOutgoing = useCallback((taskID: string) => {
    if (reduced) return
    const current = copyRuntime(runtimeRef.current)
    const spawns: PhysicsQueuedSpawn[] = []
    for (const edge of machine.outgoing.get(taskID) ?? []) {
      if (current.delivered.has(edge.id) || current.inFlight.has(edge.id)) continue
      const route = layout.routeByEdgeID.get(edge.id)
      if (!route) continue
      current.inFlight.add(edge.id)
      spawns.push(ballSpawn(edge, route))
    }
    if (spawns.length) {
      commitRuntime(current)
      frameRef.current?.pushMany(spawns, { pacing: { ratePerSec: 8 } })
    }
  }, [commitRuntime, layout, machine, reduced])

  const performComplete = useCallback((taskID: string, completedAt?: number) => {
    const node = machine.byID.get(taskID)
    const current = runtimeRef.current
    if (!node || current.completed.has(taskID)) return
    const next = copyRuntime(current)
    next.completed.add(taskID)
    next.blockers.delete(taskID)
    next.armed.add(taskID)
    if (completedAt != null) next.currentTime = completedAt
    commitRuntime(next)
    emit({ type: "task-completed", taskID, datum: node.datum })
    releaseOutgoing(taskID)
  }, [commitRuntime, emit, machine, releaseOutgoing])

  const deliverEdges = useCallback((edgeIDs: readonly string[]) => {
    const current = runtimeRef.current
    const next = copyRuntime(current)
    const newlyDelivered: DependencyMachineEdge[] = []
    const newlyArmed: string[] = []
    for (const edgeID of edgeIDs) {
      if (next.delivered.has(edgeID)) continue
      const edge = machine.edges.find((candidate) => candidate.id === edgeID)
      if (!edge) continue
      next.delivered.add(edgeID)
      next.inFlight.delete(edgeID)
      newlyDelivered.push(edge)
    }
    for (const edge of newlyDelivered) {
      const target = machine.byID.get(edge.targetID)
      if (!target || next.blockers.has(target.id) || next.armed.has(target.id)) continue
      const incoming = machine.incoming.get(target.id) ?? []
      if (incoming.every((candidate) => next.delivered.has(candidate.id))) {
        next.armed.add(target.id)
        newlyArmed.push(target.id)
      }
    }
    if (!newlyDelivered.length) return
    commitRuntime(next)
    for (const edge of newlyDelivered) {
      emit({
        type: "dependency-delivered",
        sourceID: edge.sourceID,
        targetID: edge.targetID
      })
    }
    for (const taskID of newlyArmed) emit({ type: "task-armed", taskID })
  }, [commitRuntime, emit, machine])

  const handleTick = useCallback((
    _result: unknown,
    controlsSurface: PhysicsPipelineControlSurface
  ) => {
    const arrived: string[] = []
    const removeIDs: string[] = []
    for (const body of controlsSurface.readBodies()) {
      const datum = dependencyBallDatum(body)
      if (!datum || runtimeRef.current.delivered.has(datum.edgeID)) continue
      const end = datum.route[datum.route.length - 1]
      if (end && Math.hypot(body.x - end.x, body.y - end.y) <= 9) {
        arrived.push(datum.edgeID)
        removeIDs.push(body.id)
      }
    }
    if (removeIDs.length) controlsSurface.remove(removeIDs)
    if (arrived.length) deliverEdges(arrived)
  }, [deliverEdges])

  const settle = useCallback(() => {
    const next = copyRuntime(runtimeRef.current)
    for (const edge of machine.edges) {
      if (next.completed.has(edge.sourceID)) next.delivered.add(edge.id)
    }
    next.inFlight.clear()
    next.armed = resolvedArmed(machine, next.delivered, next.blockers, next.completed)
    next.playing = false
    frameRef.current?.settle()
    commitRuntime(next)
    emit({ type: "machine-settled" })
  }, [commitRuntime, emit, machine])

  const pause = useCallback(() => {
    const next = copyRuntime(runtimeRef.current)
    next.playing = false
    commitRuntime(next)
  }, [commitRuntime])

  const step = useCallback(() => {
    const current = runtimeRef.current
    const nextRecorded = machine.nodes
      .map((node) => ({ node, time: taskCompletionTime(node) }))
      .filter(
        (row): row is { node: DependencyMachineNode<TDatum>; time: number } =>
          row.time != null &&
          row.time > current.currentTime &&
          !current.completed.has(row.node.id)
      )
      .sort((a, b) => a.time - b.time || a.node.index - b.node.index)[0]
    if (nextRecorded) {
      performComplete(nextRecorded.node.id, nextRecorded.time)
      return
    }
    pause()
    const blockers = [...current.blockers.keys()]
      .map((taskID) => calculateBlockerAmplification(machine, taskID, {
        completedTaskIDs: current.completed
      }))
      .sort(
        (a, b) =>
          b.affectedLaneCount - a.affectedLaneCount ||
          b.downstreamTaskCount - a.downstreamTaskCount
      )
    if (blockers[0]) {
      emit({
        type: "machine-stalled",
        blockerID: blockers[0].blockerID,
        downstreamTaskCount: blockers[0].downstreamTaskCount,
        affectedLaneCount: blockers[0].affectedLaneCount
      })
    }
  }, [emit, machine, pause, performComplete])

  const play = useCallback(() => {
    if (reduced) {
      settle()
      return
    }
    const next = copyRuntime(runtimeRef.current)
    next.playing = true
    commitRuntime(next)
  }, [commitRuntime, reduced, settle])

  useEffect(() => {
    if (!runtime.playing || mode !== "replay" || reduced) return undefined
    const timer = window.setInterval(step, 760)
    return () => window.clearInterval(timer)
  }, [mode, reduced, runtime.playing, step])

  const reset = useCallback(() => {
    frameRef.current?.clear()
    commitRuntime(initialRuntime(machine, mode, now, reduced))
  }, [commitRuntime, machine, mode, now, reduced])

  const previewResolve = useCallback((taskID: string) => {
    if (!machine.byID.has(taskID)) return
    const next = copyRuntime(runtimeRef.current)
    next.previewTaskID = taskID
    commitRuntime(next)
    const amplification = calculateBlockerAmplification(machine, taskID, {
      completedTaskIDs: next.completed
    })
    emit({
      type: "blocker-previewed",
      blockerID: taskID,
      downstreamTaskIDs: amplification.downstreamTaskIDs
    })
  }, [commitRuntime, emit, machine])

  const clearPreview = useCallback(() => {
    const next = copyRuntime(runtimeRef.current)
    next.previewTaskID = null
    commitRuntime(next)
  }, [commitRuntime])

  const blockTask = useCallback((taskID: string, reason: string) => {
    if (!machine.byID.has(taskID)) return
    const next = copyRuntime(runtimeRef.current)
    next.blockers.set(taskID, reason)
    next.armed.delete(taskID)
    commitRuntime(next)
  }, [commitRuntime, machine])

  const unblockTask = useCallback((taskID: string) => {
    if (!machine.byID.has(taskID)) return
    const next = copyRuntime(runtimeRef.current)
    next.blockers.delete(taskID)
    const incoming = machine.incoming.get(taskID) ?? []
    if (incoming.every((edge) => next.delivered.has(edge.id))) {
      next.armed.add(taskID)
    }
    commitRuntime(next)
  }, [commitRuntime, machine])

  const getAmplification = useCallback((taskID: string) =>
    calculateBlockerAmplification(machine, taskID, {
      completedTaskIDs: runtimeRef.current.completed
    }), [machine])

  const getMachineState = useCallback((): ChainReactionMachineState => {
    const current = runtimeRef.current
    return {
      currentTime: current.currentTime,
      playing: current.playing,
      previewTaskID: current.previewTaskID,
      selectedTaskIDs: [...selectedTaskIDs],
      tasks: machine.nodes.map((node) => ({
        taskID: node.id,
        completed: current.completed.has(node.id),
        armed: current.armed.has(node.id),
        blocked: current.blockers.has(node.id),
        blockerReason: current.blockers.get(node.id)
      })),
      dependencies: machine.edges.map((edge) => ({
        edgeID: edge.id,
        sourceID: edge.sourceID,
        targetID: edge.targetID,
        state: current.delivered.has(edge.id)
          ? "delivered"
          : current.inFlight.has(edge.id)
            ? "in-flight"
            : "waiting"
      }))
    }
  }, [machine, selectedTaskIDs])

  useImperativeHandle(ref, () => ({
    play,
    pause,
    step,
    reset,
    settle,
    previewResolve,
    clearPreview,
    completeTask: performComplete,
    blockTask,
    unblockTask,
    getAmplification,
    getMachineState
  }), [
    blockTask,
    clearPreview,
    getAmplification,
    getMachineState,
    pause,
    performComplete,
    play,
    previewResolve,
    reset,
    settle,
    step,
    unblockTask
  ])

  const selectedInsightID = runtime.previewTaskID ?? selectedTaskIDs[0] ?? null
  const amplification = selectedInsightID
    ? calculateBlockerAmplification(machine, selectedInsightID, {
        completedTaskIDs: runtime.completed
      })
    : null
  const downstreamSet = useMemo(
    () => new Set(amplification?.downstreamTaskIDs ?? []),
    [amplification?.downstreamTaskIDs.join("|")]
  )
  const semanticItems = useMemo(
    () => machineSemanticItems(machine, layout, runtime),
    [layout, machine, runtime]
  )

  const overlay = useMemo(() => (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
    >
      <defs>
        <filter id={`chain-shadow-${seed}`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
        </filter>
      </defs>
      {machine.lanes.map((lane, laneIndex) => {
        const laneTasks = layout.tasks.filter((task) => task.laneIndex === laneIndex)
        const x = laneTasks[0]?.x ?? 0
        return (
          <g key={lane}>
            <line
              x1={x}
              x2={x}
              y1={32}
              y2={height - 24}
              stroke="var(--semiotic-grid, #d7dde0)"
              strokeWidth={1}
              strokeDasharray="3 7"
            />
            <text
              x={x}
              y={23}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill="var(--semiotic-text, #243039)"
            >
              {lane}
            </text>
          </g>
        )
      })}
      {layout.routes.map((route) => {
        const delivered = runtime.delivered.has(route.edgeID)
        const active = runtime.inFlight.has(route.edgeID)
        const highlighted = downstreamSet.has(route.targetID) || downstreamSet.has(route.sourceID)
        const points = route.points.map((point) => `${point.x},${point.y}`).join(" ")
        return (
          <polyline
            key={route.edgeID}
            points={points}
            fill="none"
            stroke={highlighted
              ? "var(--semiotic-highlight, #e08a1e)"
              : delivered
                ? "var(--semiotic-success, #2b8a66)"
                : "var(--semiotic-grid, #aeb8bd)"}
            strokeWidth={highlighted ? 4 : active ? 3 : 2}
            strokeOpacity={delivered || active || highlighted ? 0.95 : 0.48}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      })}
      {layout.sockets.map((socket) => {
        const delivered = runtime.delivered.has(socket.edgeID)
        return (
          <g key={socket.id}>
            <circle
              cx={socket.x}
              cy={socket.y}
              r={socket.radius + 2}
              fill="var(--semiotic-background, #fff)"
              stroke="var(--semiotic-text, #243039)"
              strokeWidth={1.5}
            />
            {delivered && (
              <circle
                cx={socket.x}
                cy={socket.y}
                r={socket.radius - 0.5}
                fill="var(--semiotic-success, #2b8a66)"
              />
            )}
          </g>
        )
      })}
      {machine.nodes.map((node) => {
        const task = layout.taskByID.get(node.id)
        if (!task) return null
        const completed = runtime.completed.has(node.id)
        const blocked = runtime.blockers.has(node.id)
        const previewed = runtime.previewTaskID === node.id
        const selected = selectedSet.has(node.id) || previewed
        const downstream = downstreamSet.has(node.id)
        const color = statusColor(node, runtime)
        const x = task.x - task.width / 2
        const y = task.y - task.height / 2
        const progressHeight = Math.max(2, task.height * node.progress)
        return (
          <g key={node.id}>
            <g
              style={{
                transform: `rotate(${completed ? 76 : 0}deg)`,
                transformBox: "fill-box",
                transformOrigin: "50% 100%",
                transition: reduced ? "none" : "transform 520ms cubic-bezier(.2,.8,.25,1)",
                filter: "url(#chain-shadow-" + seed + ")"
              }}
            >
              <rect
                x={x}
                y={y}
                width={task.width}
                height={task.height}
                rx={node.milestone ? 12 : 4}
                fill="var(--semiotic-background, #fff)"
                stroke={selected || downstream ? "var(--semiotic-highlight, #e08a1e)" : color}
                strokeWidth={selected ? 4 : downstream ? 3 : 2}
              />
              <rect
                x={x + 3}
                y={y + task.height - progressHeight + 1}
                width={task.width - 6}
                height={Math.max(0, progressHeight - 4)}
                rx={2}
                fill={color}
                opacity={completed ? 0.86 : 0.46}
              />
            </g>
            {blocked && (
              <g opacity={previewed ? 0.28 : 1}>
                <line
                  x1={x - 8}
                  x2={x + 14}
                  y1={task.y + 9}
                  y2={task.y - 9}
                  stroke="var(--semiotic-error, #c64035)"
                  strokeWidth={7}
                  strokeLinecap="round"
                />
                <circle cx={x - 8} cy={task.y + 9} r={3} fill="var(--semiotic-error, #c64035)" />
              </g>
            )}
            <g
              onPointerDown={() => selectTask(node.id)}
              style={{ cursor: "pointer", pointerEvents: "auto" }}
            >
              <rect x={x} y={y} width={task.width} height={task.height} fill="transparent" />
              <text
                x={task.x}
                y={task.y - 4}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={700}
                fill="var(--semiotic-text, #243039)"
              >
                {node.label.length > 24 ? `${node.label.slice(0, 22)}…` : node.label}
              </text>
              <text
                x={task.x}
                y={task.y + 12}
                textAnchor="middle"
                fontSize={9.5}
                fill="var(--semiotic-text-muted, #5f6b72)"
              >
                {Math.round(node.progress * 100)}% · {completed ? "done" : blocked ? "blocked" : runtime.armed.has(node.id) ? "ready" : "waiting"}
              </text>
            </g>
          </g>
        )
      })}
    </svg>
  ), [
    downstreamSet,
    height,
    layout,
    machine,
    reduced,
    runtime,
    seed,
    selectTask,
    selectedSet,
    width
  ])

  const blockerSummary = useMemo(() => {
    const blockerInsights = [...runtime.blockers.keys()]
      .map((taskID) => calculateBlockerAmplification(machine, taskID, {
        completedTaskIDs: runtime.completed
      }))
      .sort(
        (a, b) =>
          b.affectedLaneCount - a.affectedLaneCount ||
          b.downstreamTaskCount - a.downstreamTaskCount
      )
    if (!blockerInsights.length) return "No explicit blockers are active."
    return blockerInsights
      .map((item) => {
        const label = machine.byID.get(item.blockerID)?.label ?? item.blockerID
        return `${label} affects ${item.downstreamTaskCount} unfinished tasks across ${item.affectedLaneCount} lanes.`
      })
      .join(" ")
  }, [machine, runtime.blockers, runtime.completed])

  const colliders = useMemo<PhysicsColliderSpec[]>(() => [
    { id: "chain-left", shape: { type: "segment", x1: 2, y1: 0, x2: 2, y2: height, thickness: 4 } },
    { id: "chain-right", shape: { type: "segment", x1: width - 2, y1: 0, x2: width - 2, y2: height, thickness: 4 } },
    { id: "chain-top", shape: { type: "segment", x1: 0, y1: 2, x2: width, y2: 2, thickness: 4 } },
    { id: "chain-bottom", shape: { type: "segment", x1: 0, y1: height - 2, x2: width, y2: height - 2, thickness: 4 } }
  ], [height, width])

  const controlList: readonly ChainReactionControl[] = controls === true
    ? ["play", "pause", "step", "reset", "settle"]
    : controls || []

  if (!machine.valid) {
    return (
      <div className={className} role="alert" style={{ width, maxWidth: "100%" }}>
        <strong>ChainReactionChart could not compile this dependency graph.</strong>
        <ul>
          {machine.diagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${index}`}>{diagnostic.message}</li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className={className} style={{ width, maxWidth: "100%", position: "relative" }}>
      {controlList.length > 0 && (
        <div
          aria-label="Chain reaction replay controls"
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}
        >
          {controlList.map((control) => (
            <button
              key={control}
              type="button"
              onClick={control === "play"
                ? play
                : control === "pause"
                  ? pause
                  : control === "step"
                    ? step
                    : control === "reset"
                      ? reset
                      : settle}
              aria-pressed={control === "play" ? runtime.playing : undefined}
            >
              {control[0].toUpperCase() + control.slice(1)}
            </button>
          ))}
        </div>
      )}
      <StreamPhysicsFrame
        ref={frameRef}
        size={[width, height]}
        responsiveWidth={responsiveWidth}
        responsiveHeight={responsiveHeight}
        title={title}
        description={description ?? "Tasks are arranged by workstream and dependency depth. Balls represent satisfied prerequisites; task completion remains an explicit data event."}
        summary={`${blockerSummary}${amplification && insight === "blocker-amplification" ? ` Selected task reaches ${amplification.downstreamTaskCount} unfinished tasks across ${amplification.affectedLaneCount} lanes.` : ""}`}
        accessibleTable={false}
        enableHover={enableHover}
        initialSpawns={EMPTY_SPAWNS}
        bodyForces={dependencyBodyForce}
        bodyStyle={{
          fill: "var(--semiotic-accent, #f0a329)",
          stroke: "var(--semiotic-text, #243039)",
          strokeWidth: 1.25
        }}
        bodySemanticItems={false}
        semanticItems={semanticItems}
        onSemanticItemActivate={(item) => item.id && selectTask(item.id)}
        foregroundGraphics={() => overlay}
        paused={reduced}
        continuous={runtime.inFlight.size > 0}
        onTick={handleTick as never}
        config={{
          bodyLimit: Math.max(16, machine.edges.length + 4),
          colliders,
          settleStepLimit: 2200,
          kernel: {
            seed,
            gravity: { x: 0, y: 7 },
            fixedDt: 1 / 60,
            cellSize: 28,
            collisionIterations: 2,
            velocityDamping: 0.992,
            restitution: 0.02,
            friction: 0.12,
            maxVelocity: 150,
            sleepSpeed: 1.1,
            sleepAfter: 0.8
          },
          observation: {
            chartType: "ChainReactionChart"
          }
        }}
      />
      {accessibleTable && (
        <table style={hiddenTableStyle}>
          <caption>{blockerSummary}</caption>
          <thead>
            <tr>
              <th>Task</th>
              <th>Lane</th>
              <th>Progress</th>
              <th>State</th>
              <th>Waiting on</th>
              <th>Downstream reach</th>
            </tr>
          </thead>
          <tbody>
            {machine.nodes.map((node) => {
              const nodeAmplification = calculateBlockerAmplification(machine, node.id, {
                completedTaskIDs: runtime.completed
              })
              return (
                <tr key={node.id}>
                  <th scope="row">{node.label}</th>
                  <td>{node.lane}</td>
                  <td>{Math.round(node.progress * 100)}%</td>
                  <td>{runtime.completed.has(node.id) ? "Completed" : runtime.blockers.has(node.id) ? "Blocked" : runtime.armed.has(node.id) ? "Armed" : "Waiting"}</td>
                  <td>{runtime.blockers.get(node.id) ?? (node.dependencyIDs.filter((id) => !runtime.completed.has(id)).join(", ") || "None")}</td>
                  <td>{nodeAmplification.downstreamTaskCount} tasks / {nodeAmplification.affectedLaneCount} lanes</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}) as unknown as {
  <TDatum extends Datum = Datum>(
    props: ChainReactionChartProps<TDatum> & React.RefAttributes<ChainReactionChartHandle>
  ): React.ReactElement | null
  displayName?: string
}

ChainReactionChart.displayName = "ChainReactionChart"

export default ChainReactionChart
