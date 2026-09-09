import { createPhysicsSourceState } from "./physicsSourceRows"
import { scaleLinear } from "d3-scale"
import { packSwarmLane } from "./collisionSwarmPacking"
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import {
  collidersFromPlotBounds,
  type PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import {
  type PhysicsChartArea,
  type PhysicsChartLayout,
  baseConfig,
  clampNumber,
  finiteNumber,
  physicsChartArea,
  readAccessor,
  seededRandom
} from "./physicsChartShared"

export interface CollisionSwarmPhysicsOptions<TDatum extends Datum = Datum> {
  data: readonly TDatum[]
  xAccessor: ChartAccessor<TDatum, number>
  groupAccessor?: ChartAccessor<TDatum, string>
  radiusAccessor?: ChartAccessor<TDatum, number>
  pointRadius: number
  seed: number
  size: [number, number]
  xExtent?: [number, number]
  collisionIterations?: number
  settle?: boolean
}

export interface CollisionSwarmProjectionMetadata {
  kind: "collision-swarm"
  xExtent: [number, number]
  xRange: [number, number]
  groups: Array<{ label: string; y: number; count: number; overlapping?: boolean }>
  plot: PhysicsChartArea["plot"]
}
export function buildCollisionSwarmPhysics<TDatum extends Datum>(
  options: CollisionSwarmPhysicsOptions<TDatum>
): PhysicsChartLayout {
  const {
    data: sourceRows,
    xAccessor,
    groupAccessor,
    radiusAccessor,
    pointRadius,
    seed,
    size,
    xExtent,
    collisionIterations,
    settle
  } = options
  const { rows: data } = createPhysicsSourceState(sourceRows, "collision-swarm")
  const area = physicsChartArea(size)
  const random = seededRandom(seed)
  const rows: Array<{
    datum: TDatum
    index: number
    value: number
    group: string
    radius: number
  }> = []
  const groups: string[] = []
  const groupIndex = new Map<string, number>()

  function indexFor(group: string): number {
    let index = groupIndex.get(group)
    if (index == null) {
      index = groups.length
      groups.push(group)
      groupIndex.set(group, index)
    }
    return index
  }

  data.forEach((datum, index) => {
    const value = finiteNumber(readAccessor(datum, index, xAccessor))
    if (value == null) return
    const group = groupAccessor
      ? String(readAccessor(datum, index, groupAccessor) ?? "All")
      : "All"
    const radiusValue = radiusAccessor
      ? finiteNumber(readAccessor(datum, index, radiusAccessor))
      : null
    const radius = clampNumber(
      radiusValue != null && radiusValue > 0 ? radiusValue : pointRadius,
      2,
      18
    )
    indexFor(group)
    rows.push({ datum, index, value, group, radius })
  })

  const values = rows.map((row) => row.value)
  const extentMin = xExtent ? finiteNumber(xExtent[0]) : null
  const extentMax = xExtent ? finiteNumber(xExtent[1]) : null
  const valueMin = values.length ? Math.min(...values) : 0
  const valueMax = values.length ? Math.max(...values) : 1
  let min = extentMin ?? valueMin
  let max = extentMax ?? valueMax
  if (min === max) {
    min -= 0.5
    max += 0.5
  }
  if (min > max) {
    const nextMin = max
    max = min
    min = nextMin
  }

  const maxRadius = Math.max(pointRadius, ...rows.map((row) => row.radius))
  const xRangeStart = area.plot.x + maxRadius + 8
  const xRangeEnd = area.plot.x + area.plot.width - maxRadius - 8
  const xScale = scaleLinear().domain([min, max]).range([xRangeStart, xRangeEnd])
  const groupCount = Math.max(1, groups.length)
  const laneHeight = area.plot.height / groupCount
  const laneGap = Math.min(6, laneHeight * 0.05)
  const yForGroup = (group: string): number =>
    area.plot.y + ((groupIndex.get(group) ?? 0) + 0.5) * laneHeight
  const counts = new Map<string, number>()
  const overlappingGroups = new Set<string>()
  const targets = new Map<number, { x: number; y: number; entryOffset: number }>()
  for (const group of groups) {
    const members = rows.filter((row) => row.group === group)
    const center = yForGroup(group)
    const points = members.map((row) => ({ x: xScale(row.value), radius: row.radius }))
    const packed = packSwarmLane(points, center - laneHeight / 2 + laneGap, center + laneHeight / 2 - laneGap, random)
    counts.set(group, members.length)
    if (packed.overlapping) overlappingGroups.add(group)
    members.forEach((row, index) => targets.set(row.index, {
      x: points[index].x,
      y: packed.positions[index],
      entryOffset: packed.entryOffset
    }))
  }
  const spawns: PhysicsQueuedSpawn[] = rows.map((row, orderedIndex) => {
    const target = targets.get(row.index)!
    const targetX = target.x
    const targetY = target.y
    const overlapping = overlappingGroups.has(row.group)
    return {
      id: String((row.datum as Datum).id ?? `collision-swarm-${orderedIndex}`),
      x: targetX,
      y: targetY - (settle ? 0 : target.entryOffset),
      vx: 0,
      vy: 0,
      fixedPosition: { x: targetX },
      // An overfull lane cannot preserve radius, x, and non-overlap together.
      // Keep its data encodings and disclose overlap in the projection.
      bodyCollisions: !overlapping,
      mass: 1,
      shape: { type: "circle", radius: row.radius },
      datum: {
        ...row.datum,
        xValue: row.value,
        group: row.group,
        radius: row.radius,
        targetX,
        targetY,
        overlapping
      },
      springs: [
        {
          target: { type: "point", x: targetX, y: targetY },
          restLength: 0,
          stiffness: 34,
          damping: 12
        }
      ]
    }
  })

  const colliders = collidersFromPlotBounds(
    {
      x: area.plot.x,
      y: area.plot.y,
      width: area.plot.width,
      height: area.plot.height
    },
    {
      idPrefix: "collision-swarm",
      includeCeiling: false,
      wallThickness: 20,
      floorThickness: 20
    }
  )

  return {
    config: baseConfig(seed, colliders, "CollisionSwarmChart", {
      gravity: { x: 0, y: 0 },
      cellSize: Math.max(24, maxRadius * 4),
      collisionIterations: Math.max(1, Math.round(collisionIterations ?? 6)),
      velocityDamping: 0.992,
      restitution: 0.02,
      friction: 0.18,
      sleepSpeed: 3,
      sleepAfter: 0.5
    }),
    initialSpawns: spawns,
    projectionRows: groups.map((group) => ({
      label: group,
      value: counts.get(group) ?? 0
    })),
    metadata: {
      kind: "collision-swarm",
      xExtent: [min, max],
      xRange: [xRangeStart, xRangeEnd],
      groups: groups.map((group) => ({
        label: group,
        y: yForGroup(group),
        count: counts.get(group) ?? 0,
        overlapping: overlappingGroups.has(group)
      })),
      plot: area.plot
    } satisfies CollisionSwarmProjectionMetadata
  }
}
