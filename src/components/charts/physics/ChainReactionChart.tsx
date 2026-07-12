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
import type { PhysicsColliderSpec } from "../../stream/physics/PhysicsKernel"
import type {
  PhysicsPipelineControlSurface,
  PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import StreamPhysicsFrame, {
  type StreamPhysicsFrameHandle
} from "../../stream/physics/StreamPhysicsFrame"
import {
  calculateBlockerAmplification,
  compileDependencyMachine,
  routeDependencyTracks,
  type DependencyMachineEdge,
  type DependencyMachineNode
} from "./dependencyMachine"
import type {
  ChainReactionChartHandle,
  ChainReactionChartProps,
  ChainReactionControl,
  ChainReactionMachineState,
  ChainReactionObservation
} from "./chainReactionTypes"
import {
  ballSpawn,
  copyRuntime,
  dependencyBallDatum,
  dependencyBodyForce,
  EMPTY_SPAWNS,
  initialRuntime,
  machineSemanticItems,
  numericTime,
  resolvedArmed,
  taskCompletionTime,
  type RuntimeState
} from "./chainReactionRuntime"
import { ChainReactionOverlay } from "./chainReactionOverlay"

export type * from "./chainReactionTypes"

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

  const overlay = useMemo(
    () => (
      <ChainReactionOverlay
        machine={machine}
        layout={layout}
        runtime={runtime}
        downstreamSet={downstreamSet}
        selectedSet={selectedSet}
        width={width}
        height={height}
        seed={seed}
        reduced={reduced}
        onSelectTask={selectTask}
      />
    ),
    [
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
    ]
  )

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
