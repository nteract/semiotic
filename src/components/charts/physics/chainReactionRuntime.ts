import type { PhysicsBodyState } from "../../stream/physics/PhysicsKernel"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineStore"
import type {
  PhysicsSemanticItem,
  StreamPhysicsBodyForceContext
} from "../../stream/physics/StreamPhysicsFrame"
import type { Datum } from "../shared/datumTypes"
import type {
  DependencyMachine,
  DependencyMachineEdge,
  DependencyMachineNode,
  DependencyPoint,
  DependencyTrackLayout,
  DependencyTrackRoute
} from "./dependencyMachine"
import type { ChainReactionMode } from "./chainReactionTypes"

export interface RuntimeState {
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

export const EMPTY_SPAWNS: PhysicsQueuedSpawn[] = []

export function numericTime(value: number | Date | undefined, fallback = 0): number {
  if (value instanceof Date) return value.getTime()
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function taskCompletionTime<TDatum extends Datum>(
  node: DependencyMachineNode<TDatum>
): number | null {
  if (node.completionTime == null) return null
  const value = numericTime(node.completionTime, Number.NaN)
  return Number.isFinite(value) ? value : null
}

export function resolvedArmed<TDatum extends Datum>(
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

export function initialRuntime<TDatum extends Datum>(
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

export function copyRuntime(runtime: RuntimeState): RuntimeState {
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

export function dependencyBallDatum(body: PhysicsBodyState): DependencyBallDatum | null {
  const datum = body.datum as Partial<DependencyBallDatum> | undefined
  return datum?.kind === "dependency-ball" && Array.isArray(datum.route)
    ? (datum as DependencyBallDatum)
    : null
}

export function dependencyBodyForce(
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

export function ballSpawn(
  edge: DependencyMachineEdge,
  route: DependencyTrackRoute
): PhysicsQueuedSpawn {
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

export function machineSemanticItems<TDatum extends Datum>(
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
