import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineTypes"
import {
  physicsTravelLength,
  validatePhysicsTravel,
  type PhysicsTravelPoint
} from "../../stream/physics/physicsBodyTravel"
import {
  eventDropSourcePositions,
  type EventDropSource,
  type EventDropSourceRail
} from "./eventDropSources"

export type EventDropArrival =
  | "drop"
  | {
      mode: "travel"
      /** Travel milliseconds, independent of timeUnit. Defaults to 800. */
      durationMs?: number
      /** Speed ceiling: the longest path sets one shared chart-wide duration. */
      speedPxPerSec?: number
      path?:
        | "straight"
        | "connector"
        | ((
            from: PhysicsTravelPoint,
            to: PhysicsTravelPoint
          ) => PhysicsTravelPoint[])
    }

/** Internal pacing coordinate; spawnAt retains its authored event-time value. */
export type EventDropSpawn = PhysicsQueuedSpawn & {
  __eventDropSpawnTime?: number
}

/** Compile all path callbacks on the host into portable, deterministic spawns. */
export function choreographEventDropArrival(
  spawns: EventDropSpawn[],
  options: {
    arrival?: EventDropArrival
    sources?: readonly EventDropSource[]
    sourceRail?: EventDropSourceRail
    size: [number, number]
    secondsPerUnit: number
    timeScale: number
    firstArrival: number
    closedWindowCount: number
  }
): void {
  const arrival = options.arrival
  if (arrival && arrival !== "drop") {
    if (arrival.mode !== "travel")
      throw new RangeError("arrival.mode must be travel")
    for (const value of [arrival.durationMs, arrival.speedPxPerSec])
      if (value != null && (!Number.isFinite(value) || value <= 0))
        throw new RangeError(
          "Travel duration and speed must be finite and positive"
        )
    if (arrival.durationMs != null && arrival.speedPxPerSec != null)
      throw new RangeError("Choose arrival.durationMs or arrival.speedPxPerSec")
    if (
      arrival.path != null &&
      typeof arrival.path !== "function" &&
      arrival.path !== "straight" &&
      arrival.path !== "connector"
    )
      throw new RangeError(
        "arrival.path must be straight, connector or a callback"
      )
  }
  const origins = new Map(
    eventDropSourcePositions(
      options.sources,
      options.sourceRail,
      options.size
    ).map(({ source, x, y }) => [source.id, { x, y: y - 6 }])
  )
  const scale =
    Number.isFinite(options.timeScale) && options.timeScale > 0
      ? options.timeScale
      : 1
  const historical: EventDropSpawn[] = []
  for (const spawn of spawns) {
    const datum = spawn.datum as {
      arrivalTime: number
      windowIndex: number
      late: boolean
      source: string
      __phase?: string
    }
    if (arrival && arrival !== "drop")
      datum.__phase = datum.late ? "late" : "board"
    const closed = datum.windowIndex < options.closedWindowCount
    const history = (closed && !datum.late) || (!closed && datum.late)
    if (history) historical.push(spawn)
    // Retained history is present at the start, as on the drop-only board.
    const boardTime =
      (history ? options.firstArrival : datum.arrivalTime) *
      options.secondsPerUnit
    spawn.__eventDropSpawnTime = boardTime
    const from = origins.get(datum.source)
    if (!arrival || arrival === "drop" || !from || history) continue
    const to = { x: spawn.x, y: spawn.y }
    const points =
      typeof arrival.path === "function"
        ? arrival.path({ ...from }, { ...to })
        : arrival.path === "connector"
          ? [
              from,
              { x: from.x, y: Math.min(from.y, to.y) - 24 },
              { x: to.x, y: Math.min(from.y, to.y) - 24 },
              to
            ]
          : [from, to]
    // Validate callback output before measuring, and require exact endpoints.
    validatePhysicsTravel({ points, durationSeconds: 1 })
    if (
      points[0].x !== from.x ||
      points[0].y !== from.y ||
      points.at(-1)!.x !== to.x ||
      points.at(-1)!.y !== to.y
    )
      throw new RangeError(
        "Travel paths must start at the source and end at the board entry"
      )
    const duration =
      arrival.speedPxPerSec != null
        ? Math.max(1 / 120, physicsTravelLength(points) / arrival.speedPxPerSec)
        : (arrival.durationMs ?? 800) / 1000
    spawn.travel = {
      points: points.map((point) => ({ ...point })),
      durationSeconds: duration / scale,
      elapsedSeconds: 0
    }
    spawn.x = from.x
    spawn.y = from.y
    spawn.__eventDropSpawnTime = boardTime - duration
    datum.__phase = "travel"
  }
  if (arrival && arrival !== "drop" && arrival.speedPxPerSec != null) {
    const duration = spawns.reduce(
      (max, spawn) => Math.max(max, spawn.travel?.durationSeconds ?? 0),
      0
    )
    for (const spawn of spawns) {
      if (!spawn.travel) continue
      spawn.__eventDropSpawnTime! +=
        (spawn.travel.durationSeconds - duration) * scale
      spawn.travel.durationSeconds = duration
    }
  }
  const start = spawns.reduce(
    (min, spawn) => Math.min(min, spawn.__eventDropSpawnTime!),
    Infinity
  )
  for (const spawn of historical) spawn.__eventDropSpawnTime = start
}
