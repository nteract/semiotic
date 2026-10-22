import type { PhysicsBodyState } from "./PhysicsKernel"

export interface PhysicsTravelPoint {
  x: number
  y: number
}

/** Serializable kinematic prelude, measured in simulation seconds. */
export interface PhysicsBodyTravel {
  points: PhysicsTravelPoint[]
  durationSeconds: number
  elapsedSeconds?: number
}

export function clonePhysicsTravel(
  travel: PhysicsBodyTravel
): PhysicsBodyTravel {
  return { ...travel, points: travel.points.map((point) => ({ ...point })) }
}

export function validatePhysicsTravel(travel: PhysicsBodyTravel): void {
  if (
    !Number.isFinite(travel.durationSeconds) ||
    travel.durationSeconds <= 0 ||
    !Array.isArray(travel.points) ||
    travel.points.length < 2 ||
    travel.points.some(
      (point) =>
        !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)
    ) ||
    (travel.elapsedSeconds != null &&
      (!Number.isFinite(travel.elapsedSeconds) ||
        travel.elapsedSeconds < 0 ||
        travel.elapsedSeconds > travel.durationSeconds))
  )
    throw new RangeError(
      "Physics travel requires two finite points, a positive duration and valid elapsed seconds"
    )
}

/** Preserve authored datum identity unless it opts into phase tracking. */
export function physicsPhaseDatum(datum: unknown, phase: string): unknown {
  if (
    !datum ||
    typeof datum !== "object" ||
    !("__phase" in datum) ||
    datum.__phase === phase
  )
    return datum
  return { ...datum, __phase: phase }
}

export function physicsBoardPhase(datum: unknown): "late" | "board" {
  return datum && typeof datum === "object" && "late" in datum && datum.late
    ? "late"
    : "board"
}

export function physicsTravelLength(
  points: readonly PhysicsTravelPoint[]
): number {
  let length = 0
  for (let i = 1; i < points.length; i++)
    length += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y
    )
  return length
}

export function physicsTravelHorizon(
  elapsed: number,
  bodies: readonly { travel?: PhysicsBodyTravel }[],
  queue: readonly { spawnAt: number; travel?: PhysicsBodyTravel }[]
): number {
  let horizon = elapsed
  for (const body of bodies)
    if (body.travel)
      horizon = Math.max(
        horizon,
        elapsed +
          body.travel.durationSeconds -
          (body.travel.elapsedSeconds ?? 0)
      )
  for (const spawn of queue)
    horizon = Math.max(
      horizon,
      spawn.spawnAt +
        (spawn.travel
          ? spawn.travel.durationSeconds - (spawn.travel.elapsedSeconds ?? 0)
          : 0)
    )
  return horizon
}

/** Advance at constant arc-length speed; release with zero velocity. */
export function advancePhysicsTravel(
  body: PhysicsBodyState,
  dt: number
): boolean {
  const travel = body.travel
  if (!travel) return false
  const elapsed = Math.min(
    travel.durationSeconds,
    (travel.elapsedSeconds ?? 0) + dt
  )
  travel.elapsedSeconds = elapsed
  let distance =
    (physicsTravelLength(travel.points) * elapsed) / travel.durationSeconds
  let point = travel.points[travel.points.length - 1]
  for (let i = 1; i < travel.points.length; i++) {
    const from = travel.points[i - 1]
    const to = travel.points[i]
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    if (length > 0 && distance < length) {
      point = {
        x: from.x + ((to.x - from.x) * distance) / length,
        y: from.y + ((to.y - from.y) * distance) / length
      }
      break
    }
    distance -= length
  }
  body.x = point.x
  body.y = point.y
  body.vx = body.vy = 0
  if (elapsed < travel.durationSeconds - 1e-9) return false
  const destination = travel.points[travel.points.length - 1]
  body.x = body.prevX = destination.x
  body.y = body.prevY = destination.y
  delete body.travel
  body.datum = physicsPhaseDatum(body.datum, physicsBoardPhase(body.datum))
  return true
}
