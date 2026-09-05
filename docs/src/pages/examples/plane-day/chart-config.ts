import { daySummary } from "./format"
import { numeric } from "./time"
import type { AircraftDay, Pattern, PlaneSnapshot } from "./types"

export function delayProps(day: AircraftDay) {
  // Split groups at an unresolved flight or continuity break, never bridge a gap.
  let segment = 0
  const data = day.flights.flatMap((flight, index) => {
    if (day.breaks.some((b) => b.before === flight.id)) segment++
    if (flight.issues.length) {
      segment++
      return []
    }
    return [
      {
        eventId: flight.id,
        leg: index + 1,
        delay: numeric(flight.raw.DepDelay)!,
        segment: String(segment),
      },
    ]
  })
  return {
    data,
    xAccessor: "leg" as const,
    yAccessor: "delay" as const,
    lineBy: "segment" as const,
    width: 740,
    height: 240,
    xLabel: "Reported flight, in sequence",
    yLabel: "Departure deviation (min)",
    showLegend: false,
    showPoints: true,
    title: "How the departure deviation changed",
    description:
      "Signed minutes relative to each flight's own scheduled departure. Negative means early. Lines stop at unresolved continuity.",
    summary: daySummary(day),
    accessibleTable: true,
  }
}

export function distributionProps(snapshot: PlaneSnapshot, pattern: Pattern | "all") {
  const rows = snapshot.distribution.filter((row) =>
    pattern === "all" ? row.pattern !== "ineligible" : row.pattern === pattern,
  )
  const buckets = [...new Set(rows.map((row) => row.bucket))]
  return {
    data: buckets.map((bucket) => ({
      bucket,
      count: rows.filter((row) => row.bucket === bucket).reduce((sum, row) => sum + row.count, 0),
    })),
    categoryAccessor: "bucket" as const,
    valueAccessor: "count" as const,
    orientation: "horizontal" as const,
    sort: false as const,
    width: 700,
    height: 270,
    margin: { left: 115, right: 25, top: 10, bottom: 50 },
    title: "Departure deviations in the selected cohort",
    description:
      "Counts of checked flight rows in the selected aircraft-day pattern. Early minutes retain their sign. This is a flight denominator, distinct from the day percentages.",
    summary: "Historical HA records, July 2–30, 2025; unavailable actual times are excluded.",
    accessibleTable: true,
    enableHover: false,
  }
}
