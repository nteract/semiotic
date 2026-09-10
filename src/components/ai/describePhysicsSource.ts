import type { Datum } from "../charts/shared/datumTypes"
import {
  finiteNumber,
  normalizedFiniteExtent,
  readAccessor
} from "../charts/physics/physicsChartShared"
import { createPhysicsSourceState } from "../charts/physics/physicsSourceRows"
import { generatePhysicsPileMechanicalSamples } from "../charts/physics/physicsPileData"
import { generateGaltonMechanicalSamples } from "../charts/physics/physicsGaltonData"
import { resolveEventDropAdmissions } from "../charts/physics/eventDropAdmission"

type SourceProjectionRow = {
  label: string
  value: number
  secondary?: number
  secondaryLabel?: string
}

/** Source statistics only: no world allocation, stepping, or implied process completion. */
export function describePhysicsSource(
  component: string,
  props: Datum
): {
  rows: SourceProjectionRow[]
  generated: boolean
} | null {
  const generated =
    (props.simulationMode ?? props.mode) === "mechanical" &&
    (component === "GaltonBoardChart" || component === "UnitPileChart")
  if (!Array.isArray(props.data) && !generated) return null
  let data = Array.isArray(props.data) ? props.data : []
  const bins = Math.max(2, Math.round(finiteNumber(props.bins) ?? 21))
  const pegRows = Math.max(
    1,
    Math.round(finiteNumber(props.pegRows) ?? bins - 1)
  )
  if (generated) {
    data =
      component === "GaltonBoardChart"
        ? generateGaltonMechanicalSamples({
            bins,
            count: props.mechanicalCount,
            pegRows,
            branchProbability: props.branchProbability,
            seed: props.seed
          })
        : generatePhysicsPileMechanicalSamples({
            count: props.mechanicalCount,
            categories: props.mechanicalCategories,
            unitValue: props.unitValue,
            seed: props.seed
          })
  }
  const idPrefix =
    component === "UnitPileChart"
      ? "pile"
      : component === "GaltonBoardChart"
        ? "galton"
        : component === "EventDropChart"
          ? "event"
          : "collision-swarm"
  data = createPhysicsSourceState(data, idPrefix).rows

  if (component === "UnitPileChart") {
    const totals = new Map<string, number>()
    const valueAccessor =
      props.valueAccessor ?? (generated ? "value" : undefined)
    data.forEach((datum, index) => {
      const category = String(
        readAccessor(datum, index, props.categoryAccessor ?? "category") ??
          "unknown"
      )
      const value = valueAccessor
        ? finiteNumber(readAccessor(datum, index, valueAccessor))
        : 1
      totals.set(
        category,
        (totals.get(category) ?? 0) + Math.max(0, value ?? 0)
      )
    })
    return {
      generated,
      rows: Array.from(totals, ([label, value]) => ({ label, value }))
    }
  }

  if (component === "GaltonBoardChart") {
    const values = data
      .map((datum, index) =>
        finiteNumber(readAccessor(datum, index, props.valueAccessor ?? "value"))
      )
      .filter((value): value is number => value != null)
    const extent = generated
      ? [0, pegRows]
      : normalizedFiniteExtent(props.valueExtent)
    const min = extent?.[0] ?? (values.length ? Math.min(...values) : 0)
    const max = extent?.[1] ?? (values.length ? Math.max(...values) : 1)
    const span = min === max ? 1 : max - min
    const rows = Array.from({ length: bins }, (_, index) => ({
      label: String(index + 1),
      value: 0
    }))
    for (const value of values) {
      rows[
        Math.max(
          0,
          Math.min(bins - 1, Math.floor(((value - min) / span) * bins))
        )
      ].value += 1
    }
    return { generated, rows }
  }

  if (component === "CollisionSwarmChart") {
    const groups = new Map<string, number>()
    data.forEach((datum, index) => {
      if (
        finiteNumber(readAccessor(datum, index, props.xAccessor ?? "x")) == null
      )
        return
      const group = props.groupAccessor
        ? String(readAccessor(datum, index, props.groupAccessor) ?? "All")
        : "All"
      groups.set(group, (groups.get(group) ?? 0) + 1)
    })
    return {
      generated,
      rows: Array.from(groups, ([label, value]) => ({ label, value }))
    }
  }

  if (component === "EventDropChart") {
    const windowSize = finiteNumber(props.windows?.size ?? 10)
    if (windowSize == null || windowSize <= 0) return null
    const { events } = resolveEventDropAdmissions({
      data,
      timeAccessor: props.timeAccessor ?? "time",
      arrivalAccessor: props.arrivalAccessor ?? "arrivalTime",
      windowSize,
      watermark: props.watermark,
      watermarkAtArrivalAccessor: props.watermarkAtArrivalAccessor
    })
    const times = events.map((event) => event.eventTime)
    const dataMin = times.length ? Math.min(...times) : 0
    const dataMax = times.length ? Math.max(...times) : dataMin + windowSize
    const min = Math.min(
      finiteNumber(props.timeExtent?.[0]) ?? dataMin,
      dataMin
    )
    const max = Math.max(
      finiteNumber(props.timeExtent?.[1]) ?? dataMax,
      dataMax
    )
    const start = Math.floor(min / windowSize) * windowSize
    const count = Math.max(
      1,
      Math.ceil((max - start + windowSize) / windowSize)
    )
    const rows = Array.from({ length: count }, (_, index) => ({
      label: `${start + index * windowSize}-${start + (index + 1) * windowSize}`,
      value: 0,
      secondary: 0,
      secondaryLabel: "late"
    }))
    for (const event of events) {
      const row =
        rows[
          Math.max(
            0,
            Math.min(
              count - 1,
              Math.floor((event.eventTime - start) / windowSize)
            )
          )
        ]
      if (event.late) row.secondary += 1
      else row.value += 1
    }
    return { generated, rows }
  }
  return null
}
