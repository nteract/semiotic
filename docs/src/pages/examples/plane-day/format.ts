import { numeric } from "./time"
import type { AircraftDay, Flight, Pattern, PlaneSnapshot, PlaneState } from "./types"

export const STORY_PATH = "/examples/plane-day"
export const STORY_URL = `https://semiotic.nteract.io${STORY_PATH}`
export const QUALIFICATION =
  "Historical HA reporting-carrier records, July 2–30, 2025. Observed sequences do not establish causes or predict a departure."
export const PATTERNS: Record<Pattern, string> = {
  near: "Near schedule",
  recovered: "Delay, then recovery",
  persisted: "Delay that persists",
  other: "Other eligible patterns",
  ineligible: "Outside the comparison",
}
export const RULES: Record<Pattern, string> = {
  near: "Every departure is less than 15 minutes early or late.",
  recovered: "At least one departure is 60+ minutes late; the last is less than 15 minutes late.",
  persisted:
    "A departure is 60+ minutes late, with at least one later leg; every departure from that point is 30+ minutes late.",
  other: "A checked chain of three or more flights that meets none of the three named patterns.",
  ineligible:
    "Fewer than three flights, unresolved reporting fields, or a break in the observed sequence.",
}
export const signed = (value: number | null) =>
  value === null ? "Unavailable" : `${value > 0 ? "+" : ""}${value}`
export const deviation = (value: number | null) =>
  value === null
    ? "departure time unavailable"
    : value === 0
      ? "on schedule"
      : `${Math.abs(value)} min ${value < 0 ? "early" : "late"}`
export const flightName = (flight: Flight) =>
  `HA ${flight.raw.Flight_Number_Reporting_Airline} · ${flight.raw.Origin} → ${flight.raw.Dest}`

export function timeLabel(
  flight: Flight,
  field: "scheduledDeparture" | "actualDeparture" | "scheduledArrival" | "actualArrival",
  snapshot: PlaneSnapshot,
  basis: PlaneState["timeBasis"],
) {
  const instant = flight[field]
  if (instant === null || (field.startsWith("actual") && flight.issues.length)) return "Unavailable"
  if (basis === "utc")
    return (
      new Date(instant).toISOString().replace("2025-", "").replace("T", " ").slice(0, 11) + " UTC"
    )
  const airportId = field.endsWith("Departure")
    ? flight.raw.OriginAirportID
    : flight.raw.DestAirportID
  const zone = snapshot.airports.find((a) => a.id === airportId)?.zone
  if (!zone) return "Unresolved time zone"
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(instant)
}

export function daySummary(day: AircraftDay): string {
  const delays = day.flights.map((f) => numeric(f.raw.DepDelay))
  return `${day.tail}, ${day.date}: ${day.flights.length} reported flights. Departure deviations: ${delays.map(signed).join(", ")} minutes. ${PATTERNS[day.pattern]}.`
}

export function legObservation(day: AircraftDay, flight: Flight): string {
  const index = day.flights.findIndex((row) => row.id === flight.id)
  const current = numeric(flight.raw.DepDelay)
  if (flight.issues.length || current === null)
    return "The reporting fields cannot support a continuous-flight observation for this leg."
  if (index === 0)
    return `${flightName(flight)} departed ${deviation(current)}. This is the first flight in this scheduled-date window.`
  if (day.breaks.some((item) => item.before === flight.id))
    return "There is a break before this leg; a comparison across that gap does not establish continuity."
  const previous = numeric(day.flights[index - 1].raw.DepDelay)!
  const change = current - previous
  return `${flightName(flight)} departed ${deviation(current)}. Its signed departure deviation was ${Math.abs(change)} minutes ${change < 0 ? "lower" : change > 0 ? "higher" : "unchanged"} than the preceding departure (${signed(current)} − ${signed(previous)} = ${signed(change)} min). This compares schedules, not causes.`
}

export function reportedCauses(flight: Flight): string {
  const fields = ["CarrierDelay", "WeatherDelay", "NASDelay", "SecurityDelay", "LateAircraftDelay"]
  const supplied = fields.filter((field) => numeric(flight.raw[field]) !== null)
  if (!supplied.length)
    return "No delay-cause values were supplied on this row. Blank is not evidence of no cause."
  return `Reported categories on this row: ${supplied.map((field) => `${field} ${numeric(flight.raw[field])} min`).join("; ")}. These are reporting categories, not a reconstruction of the aircraft's whole day.`
}
