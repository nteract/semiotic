export { generateGaltonMechanicalSamples } from "./physicsGaltonData"
export type { GaltonMechanicalSampleOptions } from "./physicsGaltonData"
import { createPhysicsSourceState } from "./physicsSourceRows"
import { scaleLinear } from "d3-scale"
import type { Datum } from "../shared/datumTypes"
import type { ChartAccessor } from "../shared/types"
import {
  collidersFromPlotBounds,
  collidersFromXScaleBins,
  type PhysicsQueuedSpawn
} from "../../stream/physics/PhysicsPipelineStore"
import {
  type PhysicsChartArea,
  type PhysicsChartLayout,
  baseConfig,
  finiteNumber,
  normalizedFiniteExtent,
  physicsChartArea,
  readAccessor
} from "./physicsChartShared"

export interface GaltonBoardPhysicsOptions<TDatum extends Datum = Datum> {
  data: readonly TDatum[]
  valueAccessor: ChartAccessor<TDatum, number>
  bins: number
  ballRadius: number
  seed: number
  size: [number, number]
  valueExtent?: [number, number]
}

export interface GaltonBoardProjectionMetadata {
  kind: "galton-board"
  bins: number
  plot: PhysicsChartArea["plot"]
  valueExtent: [number, number]
}

export function buildGaltonBoardPhysics<TDatum extends Datum>(
  options: GaltonBoardPhysicsOptions<TDatum>
): PhysicsChartLayout {
  const { data: sourceRows, valueAccessor, bins, ballRadius, seed, size, valueExtent } = options
  const { rows: data } = createPhysicsSourceState(sourceRows, "galton")
  const area = physicsChartArea(size)
  const values = data
    .map((datum, index) => finiteNumber(readAccessor(datum, index, valueAccessor)))
    .filter((value): value is number => value != null)
  const normalizedExtent = normalizedFiniteExtent(valueExtent)
  const min = normalizedExtent?.[0] ?? (values.length ? Math.min(...values) : 0)
  const max = normalizedExtent?.[1] ?? (values.length ? Math.max(...values) : 1)
  const span = max === min ? 1 : max - min
  const xScale = scaleLinear()
    .domain([0, bins])
    .range([area.plot.x, area.plot.x + area.plot.width])
  const binCounts = Array.from({ length: bins }, () => 0)
  const spawns: PhysicsQueuedSpawn[] = []

  data.forEach((datum, index) => {
    const value = finiteNumber(readAccessor(datum, index, valueAccessor))
    if (value == null) return
    const bin = Math.max(
      0,
      Math.min(bins - 1, Math.floor(((value - min) / span) * bins))
    )
    binCounts[bin] += 1
    spawns.push({
      id: String((datum as Datum).id ?? `galton-${index}`),
      x: xScale(bin + 0.5),
      y: area.plot.y + ballRadius + 2,
      vx: ((index % 5) - 2) * 8,
      vy: 0,
      mass: 1,
      shape: { type: "circle", radius: ballRadius },
      datum: { ...datum, value, bin }
    })
  })

  const yBottom = area.plot.y + area.plot.height
  const colliders = [
    ...collidersFromPlotBounds(
      {
        x: area.plot.x,
        y: area.plot.y,
        width: area.plot.width,
        height: area.plot.height
      },
      { idPrefix: "galton", wallThickness: 20, floorThickness: 20 }
    ),
    ...collidersFromXScaleBins({
      idPrefix: "galton-bin",
      count: bins,
      domainStart: 0,
      domainStep: 1,
      xScale,
      // Walls extend well above the viewport so a transient crowd can never
      // squeeze a unit over a wall top (there is no reachable ledge); units are
      // channeled into their bin and stack into a column instead of spilling.
      yTop: area.plot.y - 400,
      yBottom,
      wallThickness: 6
    })
  ]

  return {
    config: baseConfig(seed, colliders, "GaltonBoardChart"),
    initialSpawns: spawns,
    // Rain the units in rather than dumping them: the board animates as it
    // fills and each unit settles before the next crowds its bin.
    initialSpawnPacing: { pacing: { ratePerSec: 55 } },
    projectionRows: binCounts.map((value, index) => ({
      label: String(index + 1),
      value
    })),
    metadata: {
      kind: "galton-board",
      bins,
      plot: area.plot,
      valueExtent: [min, max]
    } satisfies GaltonBoardProjectionMetadata
  }
}

