import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import type { PhysicsColliderSpec } from "../../stream/physics/PhysicsKernel"
import {
  collidersFromPlotBounds,
  type PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import {
  type PhysicsChartLayout,
  baseConfig,
  finiteNumber,
  physicsChartArea,
  positiveNumber,
  readAccessor,
  seededRandom
} from "./physicsChartShared"

export interface PhysicsPileMechanicalSampleOptions {
  categories?: readonly string[]
  count?: number
  idPrefix?: string
  seed?: number
  unitValue?: number
}
export interface PhysicsPileOptions<TDatum extends Datum = Datum> {
  data: readonly TDatum[]
  categoryAccessor: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  unitValue: number
  ballRadius: number
  seed: number
  size: [number, number]
}
export function generatePhysicsPileMechanicalSamples(
  options: PhysicsPileMechanicalSampleOptions = {}
): Datum[] {
  const categories = (options.categories?.length
    ? options.categories
    : ["Intake", "Review", "Build", "Ship"]
  )
    .map((category) => String(category).trim())
    .filter(Boolean)
  const resolvedCategories = categories.length ? categories : ["Intake"]
  const count = Math.max(
    resolvedCategories.length,
    Math.round(options.count ?? Math.max(48, resolvedCategories.length * 12))
  )
  const unitValue = positiveNumber(options.unitValue, 1)
  const random = seededRandom(options.seed ?? 1)
  const idPrefix = options.idPrefix ?? "mechanical-pile"
  const weights = resolvedCategories.map(() => 0.65 + random() * 0.9)
  const weightTotal = weights.reduce((sum, value) => sum + value, 0) || 1
  const remaining = count - resolvedCategories.length
  const rawShares = weights.map((weight) => (weight / weightTotal) * remaining)
  const counts = rawShares.map((share) => 1 + Math.floor(share))
  let remainder = count - counts.reduce((sum, value) => sum + value, 0)
  const order = rawShares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction)
  for (let index = 0; remainder > 0; index = (index + 1) % order.length) {
    counts[order[index].index] += 1
    remainder -= 1
  }

  return resolvedCategories.map((category, index) => ({
    id: `${idPrefix}-${index}`,
    category,
    value: counts[index] * unitValue,
    mechanical: true,
    unitCount: counts[index],
    unitValue,
    share: counts[index] / count
  }))
}

export interface PileTubeGeometry {
  laneWidth: number
  tubeWidth: number
  ballDiameter: number
  perRow: number
  centerX: (index: number) => number
  pileHeight: (count: number) => number
}

/**
 * Column geometry shared by the pile builder and its projection overlay so the
 * ghost bar's height is exactly the fill target the stacked units rise to reach.
 * Units drop into a narrow tube (a few balls wide) so their count reads as
 * height — a bar chart assembled from falling units, not a spreading heap.
 */
export function pileTubeGeometry(
  plot: { x: number; y: number; width: number; height: number },
  categoryCount: number,
  ballRadius: number
): PileTubeGeometry {
  const count = Math.max(1, categoryCount)
  const laneWidth = plot.width / count
  const ballDiameter = Math.max(2, ballRadius * 2)
  const tubeWidth = Math.min(
    laneWidth * 0.7,
    Math.max(ballDiameter * 3.2, ballDiameter + 8)
  )
  const perRow = Math.max(1, Math.floor(tubeWidth / ballDiameter))
  return {
    laneWidth,
    tubeWidth,
    ballDiameter,
    perRow,
    centerX: (index) => plot.x + (index + 0.5) * laneWidth,
    pileHeight: (value) => Math.ceil(Math.max(0, value) / perRow) * ballDiameter
  }
}

export function buildPhysicsPile<TDatum extends Datum>(
  options: PhysicsPileOptions<TDatum>
): PhysicsChartLayout {
  const {
    data,
    categoryAccessor,
    valueAccessor,
    unitValue,
    ballRadius,
    seed,
    size
  } = options
  const safeUnitValue = positiveNumber(unitValue, 1)
  const area = physicsChartArea(size)
  const categories: string[] = []
  const categoryIndex = new Map<string, number>()
  const rows = new Map<string, number>()
  const spawns: PhysicsQueuedSpawn[] = []

  function indexFor(category: string): number {
    let index = categoryIndex.get(category)
    if (index == null) {
      index = categories.length
      categories.push(category)
      categoryIndex.set(category, index)
    }
    return index
  }

  data.forEach((datum, index) => {
    const category = String(readAccessor(datum, index, categoryAccessor) ?? "unknown")
    indexFor(category)
  })
  const categoryCount = Math.max(1, categories.length)
  const geom = pileTubeGeometry(area.plot, categoryCount, ballRadius)
  const spawnOffset = Math.max(0, geom.tubeWidth / 2 - ballRadius - 1)

  // Collect each category's units separately, then interleave them round-robin
  // so paced spawning trickles into every tube at once instead of hammering one
  // tube with a concentrated burst (which squeezes units up and out).
  const perCategory: PhysicsQueuedSpawn[][] = categories.map(() => [])
  data.forEach((datum, index) => {
    const category = String(readAccessor(datum, index, categoryAccessor) ?? "unknown")
    const catIndex = indexFor(category)
    const rawValue = valueAccessor
      ? finiteNumber(readAccessor(datum, index, valueAccessor))
      : 1
    const count = Math.max(0, Math.round((rawValue ?? 0) / safeUnitValue))
    const centerX = geom.centerX(catIndex)
    for (let unitIndex = 0; unitIndex < count; unitIndex += 1) {
      const running = rows.get(category) ?? 0
      // Fan units across the tube's columns so they settle into rows rather
      // than a single toppling stack.
      const column = geom.perRow > 1 ? running % geom.perRow : 0
      const columnOffset =
        geom.perRow > 1
          ? ((column / (geom.perRow - 1)) * 2 - 1) * spawnOffset
          : 0
      rows.set(category, running + 1)
      perCategory[catIndex].push({
        id: `${String((datum as Datum).id ?? `pile-${index}`)}-${unitIndex}`,
        x: centerX + columnOffset,
        y: area.plot.y + ballRadius + 2,
        vx: (((unitIndex % 3) - 1) * ballRadius) / 2,
        vy: 0,
        mass: 1,
        shape: { type: "circle", radius: ballRadius },
        datum: { ...datum, category, unitIndex }
      })
    }
  })
  const maxUnits = perCategory.reduce((max, list) => Math.max(max, list.length), 0)
  for (let round = 0; round < maxUnits; round += 1) {
    for (const list of perCategory) {
      if (round < list.length) spawns.push(list[round])
    }
  }

  const floorY = area.plot.y + area.plot.height
  const colliders: PhysicsColliderSpec[] = [
    ...collidersFromPlotBounds(
      {
        x: area.plot.x,
        y: area.plot.y,
        width: area.plot.width,
        height: area.plot.height
      },
      { idPrefix: "pile", wallThickness: 20, floorThickness: 20 }
    )
  ]
  // A narrow tube per category confines its units into a column so pile height
  // encodes the count and rises to meet the projection bar.
  const tubeTop = area.plot.y - 400
  for (let index = 0; index < categoryCount; index += 1) {
    const centerX = geom.centerX(index)
    for (const side of [-1, 1] as const) {
      colliders.push({
        id: `pile-tube-${index}-${side < 0 ? "l" : "r"}`,
        shape: {
          type: "aabb",
          x: centerX + (side * geom.tubeWidth) / 2,
          y: (tubeTop + floorY) / 2,
          width: 6,
          height: floorY - tubeTop
        }
      })
    }
  }

  return {
    config: baseConfig(seed, colliders, "PhysicsPileChart"),
    initialSpawns: spawns,
    // Rain units in so each tube fills from the bottom without a mouth jam.
    initialSpawnPacing: { pacing: { ratePerSec: 20 } },
    projectionRows: categories.map((category) => ({
      label: category,
      value: rows.get(category) ?? 0
    }))
  }
}

