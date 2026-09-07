import { collectionSummary, guideSummary } from "./format"
import type { PreparedGuide } from "./types"
import { SEASON_DAYS } from "./calendar"
import { monthDayLabel } from "./format"

/** React/server callback; deliberately separate from the serializable config. */
export function seasonRenderProps(guide: PreparedGuide) {
  return {
    ...seasonChartProps(guide),
    xFormat: (value: unknown) => {
      const day = SEASON_DAYS[Math.round(Number(value))]
      return day ? monthDayLabel(day) : ""
    },
  }
}

export function seasonChartProps(guide: PreparedGuide) {
  const roles = [
    `Selected WY ${guide.state.waterYear}`,
    `Compare WY ${guide.state.comparisonYear}`,
    "1991–2020 compatible mean",
  ]
  const data: {
    day: number
    storageMAF: number
    role: string
    segment: string
    monthDay: string
    rowId: string | null
  }[] = []
  for (const [index, role] of roles.entries()) {
    let segment = 0
    for (const point of guide.season) {
      const reading = index === 0 ? point.active : point.comparison
      const value =
        index === 2 ? point.baselineMean : reading?.eligible ? reading.storageAcreFeet : null
      if (value === null || value === undefined) {
        // A nonexistent leap day is skipped; a missing real observation breaks
        // the line in every renderer, including one that filters null values.
        if (index === 2 || reading !== null) segment++
        continue
      }
      data.push({
        day: point.day,
        storageMAF: value / 1_000_000,
        role,
        segment: `${role}:${segment}`,
        monthDay: point.monthDay,
        rowId: index === 2 ? null : (reading?.id ?? null),
      })
    }
  }
  return {
    data,
    xAccessor: "day" as const,
    yAccessor: "storageMAF" as const,
    lineBy: "segment" as const,
    colorBy: "role" as const,
    colorScheme: { [roles[0]]: "#096d76", [roles[1]]: "#9c4525", [roles[2]]: "#666452" },
    width: 740,
    height: 340,
    margin: { left: 64, right: 30, top: 28, bottom: 56 },
    yExtent: [0, undefined] as [number, undefined],
    xExtent: [0, 365] as [number, number],
    xLabel: "Water year · October through September",
    yLabel: "Million acre-feet",
    title: `${guide.reservoir.name}: two water years`,
    description: guideSummary(guide),
    summary:
      "Lines compare reported storage volume. Gaps mark missing or estimated observations; February 29 keeps its own calendar slot. The historical mean uses only compatible measurement regimes.",
    accessibleTable: true,
    showLegend: false,
    enableHover: false,
    curve: "linear" as const,
  }
}

export function collectionChartProps(guide: PreparedGuide) {
  return {
    data: guide.collection.members
      .filter((item) => item.reading?.eligible)
      .map((item) => ({
        stationId: item.reservoir.id,
        reservoir: item.reservoir.name,
        storageMAF: item.reading!.storageAcreFeet! / 1_000_000,
      })),
    categoryAccessor: "reservoir" as const,
    valueAccessor: "storageMAF" as const,
    orientation: "horizontal" as const,
    width: 740,
    height: 320,
    margin: { left: 115, right: 35, top: 20, bottom: 48 },
    title: "Stored volume (million AF)",
    description: collectionSummary(guide),
    summary:
      "Bars compare stored volume in million acre-feet. Their percentages of capacity use different denominators; the collection calculation pairs storage and capacity for the identical eligible membership.",
    accessibleTable: true,
    enableHover: false,
    sort: false as const,
    colorScheme: ["#096d76"],
  }
}

export function distributionReferences(guide: PreparedGuide) {
  return [
    {
      name: "Selected reading",
      value: guide.reading?.eligible ? guide.reading.storageAcreFeet : null,
      color: "#096d76",
      dash: "none",
    },
    { name: "Compatible seasonal mean", value: guide.baseline.mean, color: "#9c4525", dash: "8,4" },
    {
      name:
        guide.capacity.mode === "dated"
          ? "Documented capacity"
          : "July 30, 2025 capacity reference",
      value: guide.capacity.capacity?.acreFeet ?? null,
      color: "#50534c",
      dash: "2,4",
    },
  ]
}

export function distributionDescription(guide: PreparedGuide) {
  return `Each dot is one of ${guide.baseline.count} eligible readings for ${monthDayLabel(guide.state.monthDay)} in water years 1991–2020, using the selected measurement regime. Dots spread vertically only to avoid overlap; height has no numerical meaning. Reference lines mark the selected reading, compatible mean and capacity when available. ${guide.baseline.excluded.length} baseline years are excluded. ${guide.baseline.reason ?? `${guide.baseline.less} observations are lower and ${guide.baseline.equal} tie the selected value.`}`
}

export function distributionChartProps(guide: PreparedGuide) {
  const references = distributionReferences(guide)
  const data = guide.baseline.samples.map((s) => ({
    year: s.year,
    rowId: s.rowId,
    population: "1991–2020",
    storageMAF: s.value / 1_000_000,
  }))
  const maximum = Math.max(
    1,
    ...data.map((d) => d.storageMAF),
    ...references.map((r) => (r.value ?? 0) / 1_000_000),
  )
  return {
    data,
    categoryAccessor: "population" as const,
    valueAccessor: "storageMAF" as const,
    orientation: "horizontal" as const,
    width: 740,
    height: 260,
    margin: { left: 28, right: 28, top: 24, bottom: 58 },
    pointRadius: 4,
    pointOpacity: 1,
    colorScheme: ["#626857"],
    showCategoryTicks: false,
    showLegend: false,
    valueExtent: [0, maximum * 1.06] as [number, number],
    valueLabel: "Stored volume (million AF)",
    title: "Where this reading sits",
    description: distributionDescription(guide),
    summary: guideSummary(guide),
    accessibleTable: true,
    annotations: references
      .filter((r) => r.value !== null)
      .map((r) => ({
        type: "x-threshold",
        value: r.value! / 1_000_000,
        color: r.color,
        strokeDasharray: r.dash,
        strokeWidth: 2,
      })),
  }
}
