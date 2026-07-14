export interface ExecutiveTelemetryRow {
  id: string
  timestamp: Date
  source: "badge" | "elevator"
  floor: number
  observedAt: Date
  cacheAgeMinutes: number
  trusted: boolean
}

export interface SlideEditEvent {
  id: string
  timestamp: Date
  actor: "CEOAccount"
  slide: number
  trusted: boolean
}

const at = (time: string) => new Date(`1984-06-04T${time}:00.000Z`)

export const executiveTelemetry: ExecutiveTelemetryRow[] = [
  {
    id: "elevator-0856",
    timestamp: at("08:56"),
    source: "elevator",
    floor: 0,
    observedAt: at("08:56"),
    cacheAgeMinutes: 0,
    trusted: true,
  },
  {
    id: "elevator-0900",
    timestamp: at("09:00"),
    source: "elevator",
    floor: 4,
    observedAt: at("09:00"),
    cacheAgeMinutes: 0,
    trusted: true,
  },
  {
    id: "badge-0904",
    timestamp: at("09:04"),
    source: "badge",
    floor: 0,
    observedAt: at("08:56"),
    cacheAgeMinutes: 8,
    trusted: true,
  },
  {
    id: "elevator-0904",
    timestamp: at("09:04"),
    source: "elevator",
    floor: -2,
    observedAt: at("09:04"),
    cacheAgeMinutes: 0,
    trusted: true,
  },
  {
    id: "badge-0908",
    timestamp: at("09:08"),
    source: "badge",
    floor: 4,
    observedAt: at("09:00"),
    cacheAgeMinutes: 8,
    trusted: true,
  },
  {
    id: "elevator-0908",
    timestamp: at("09:08"),
    source: "elevator",
    floor: -2,
    observedAt: at("09:08"),
    cacheAgeMinutes: 0,
    trusted: true,
  },
  {
    id: "badge-0912",
    timestamp: at("09:12"),
    source: "badge",
    floor: -2,
    observedAt: at("09:04"),
    cacheAgeMinutes: 8,
    trusted: true,
  },
  {
    id: "elevator-0912",
    timestamp: at("09:12"),
    source: "elevator",
    floor: -2,
    observedAt: at("09:12"),
    cacheAgeMinutes: 0,
    trusted: true,
  },
  {
    id: "badge-roof-0914",
    timestamp: at("09:14"),
    source: "badge",
    floor: 10,
    observedAt: at("09:06"),
    cacheAgeMinutes: 8,
    trusted: false,
  },
  {
    id: "badge-roof-0918",
    timestamp: at("09:18"),
    source: "badge",
    floor: 10,
    observedAt: at("09:06"),
    cacheAgeMinutes: 12,
    trusted: false,
  },
]

export const executiveSlideEdits: SlideEditEvent[] = [
  {
    id: "slide-edit-0913",
    timestamp: at("09:13"),
    actor: "CEOAccount",
    slide: 17,
    trusted: false,
  },
  {
    id: "slide-edit-0917",
    timestamp: at("09:17"),
    actor: "CEOAccount",
    slide: 3,
    trusted: false,
  },
  {
    id: "slide-edit-0920",
    timestamp: at("09:20"),
    actor: "CEOAccount",
    slide: 42,
    trusted: false,
  },
]

export function floorLabel(floor: number): string {
  return floor < 0 ? `B${Math.abs(floor)}` : `${floor}`
}

export function deriveExecutiveFacts(
  telemetry: readonly ExecutiveTelemetryRow[] = executiveTelemetry,
  edits: readonly SlideEditEvent[] = executiveSlideEdits,
) {
  const disappearanceAt = at("09:12").getTime()
  const elevatorByTimestamp = new Map(
    telemetry
      .filter((row) => row.source === "elevator")
      .map((row) => [row.timestamp.getTime(), row] as const),
  )
  const preDisappearanceBadgeRows = telemetry.filter(
    (row) => row.source === "badge" && row.timestamp.getTime() < disappearanceAt,
  )
  const lags = preDisappearanceBadgeRows.map(
    (row) => (row.timestamp.getTime() - row.observedAt.getTime()) / 60_000,
  )
  const matchingLagRows = preDisappearanceBadgeRows.filter((row) => {
    const elevator = elevatorByTimestamp.get(row.observedAt.getTime())
    return elevator?.floor === row.floor
  })
  const exactLagMinutes = lags.length > 0 && lags.every((lag) => lag === lags[0]) ? lags[0] : null
  const cachedRoofPing = telemetry.find((row) => row.id === "badge-roof-0914")
  const lastContemporaneousElevator = telemetry
    .filter((row) => row.source === "elevator" && row.trusted)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
  const slideEditsAfterTrustworthyActivity = edits.filter(
    (edit) => edit.timestamp > lastContemporaneousElevator.timestamp,
  )

  if (!cachedRoofPing || !lastContemporaneousElevator) {
    throw new Error("Executive telemetry fixture is missing its decisive rows")
  }

  return {
    exactLagMinutes,
    allPreDisappearanceBadgeRowsMatchElevator:
      matchingLagRows.length === preDisappearanceBadgeRows.length,
    cachedRoofPing,
    cachedRoofObservedAt: cachedRoofPing.observedAt,
    lastContemporaneousElevator,
    lastTrustworthyFloor: lastContemporaneousElevator.floor,
    lastTrustworthyFloorLabel: floorLabel(lastContemporaneousElevator.floor),
    slideEditsAfterTrustworthyActivity,
  }
}

export const executiveFacts = deriveExecutiveFacts()
