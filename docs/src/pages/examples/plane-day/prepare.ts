import { localInstant, matchesClock, numeric } from "./time"
import type { AircraftDay, Airport, Flight, Pattern, RawFlight } from "./types"

export function flightIdentity(row: RawFlight): string {
  const fields = [
    "FlightDate",
    "Reporting_Airline",
    "Flight_Number_Reporting_Airline",
    "OriginAirportID",
    "DestAirportID",
    "CRSDepTime",
  ]
  if (fields.some((key) => !row[key])) throw new Error("Incomplete flight identity")
  return fields
    .map((key) =>
      encodeURIComponent(
        key === "FlightDate"
          ? row[key].slice(0, 10)
          : key === "CRSDepTime"
            ? row[key].padStart(4, "0")
            : row[key],
      ),
    )
    .join("~")
}

export function prepareFlight(row: RawFlight, airports: Airport[]): Flight {
  const flight: Flight = {
    id: flightIdentity(row),
    raw: { ...row },
    scheduledDeparture: null,
    scheduledArrival: null,
    actualDeparture: null,
    actualArrival: null,
    issues: [],
  }
  try {
    const origin = airports.find((a) => a.id === row.OriginAirportID && a.code === row.Origin)
    const destination = airports.find((a) => a.id === row.DestAirportID && a.code === row.Dest)
    if (!origin || !destination) throw new Error("Unknown airport identity or time zone")
    flight.scheduledDeparture = localInstant(
      row.FlightDate.slice(0, 10),
      row.CRSDepTime,
      origin.zone,
    )
    const scheduledElapsed = numeric(row.CRSElapsedTime)
    if (scheduledElapsed === null || scheduledElapsed <= 0)
      throw new Error("Missing or invalid scheduled duration")
    flight.scheduledArrival = flight.scheduledDeparture + scheduledElapsed * 60_000
    if (!matchesClock(flight.scheduledArrival, row.CRSArrTime, destination.zone))
      throw new Error("Scheduled arrival clock disagrees with duration")
    if (!row.Tail_Number) throw new Error("Missing tail number")
    if (row.Cancelled !== "0.00" && numeric(row.Cancelled) !== 0)
      throw new Error("Cancelled or unknown cancellation status")
    if (row.Diverted !== "0.00" && numeric(row.Diverted) !== 0)
      throw new Error("Diverted or unknown diversion status")
    const delay = numeric(row.DepDelay),
      elapsed = numeric(row.ActualElapsedTime),
      arrivalDelay = numeric(row.ArrDelay)
    if (delay === null || elapsed === null || arrivalDelay === null || elapsed <= 0)
      throw new Error("Missing or invalid actual time fields")
    if (Math.abs(delay) > 1440) throw new Error("Departure outside the one-day boundary allowance")
    flight.actualDeparture = flight.scheduledDeparture + delay * 60_000
    flight.actualArrival = flight.actualDeparture + elapsed * 60_000
    if (!matchesClock(flight.actualDeparture, row.DepTime, origin.zone))
      throw new Error("Actual departure clock disagrees with signed delay")
    if (!matchesClock(flight.actualArrival, row.ArrTime, destination.zone))
      throw new Error("Actual arrival clock disagrees with duration")
    if ((flight.actualArrival - flight.scheduledArrival) / 60_000 !== arrivalDelay)
      throw new Error("Arrival delay disagrees with derived instants")
  } catch (error) {
    flight.issues.push(error instanceof Error ? error.message : "Unresolved time")
  }
  return flight
}

export function connectionIssue(previous: Flight, next: Flight): string | null {
  if (previous.issues.length || next.issues.length)
    return "A flight has unresolved reporting fields"
  if (!previous.raw.Tail_Number || previous.raw.Tail_Number !== next.raw.Tail_Number)
    return "Tail identity changes"
  if (previous.raw.DestAirportID !== next.raw.OriginAirportID)
    return "Airport continuity is missing; an unreported leg or aircraft change is possible"
  if (
    previous.actualArrival! > next.actualDeparture! ||
    previous.scheduledArrival! > next.scheduledDeparture!
  )
    return "Impossible connection: flights overlap"
  if (next.actualDeparture! - previous.actualArrival! > 12 * 3_600_000)
    return "More than 12 hours unobserved; continuity is not asserted"
  return null
}

export function classifyDay(flights: Flight[], broken: boolean): Pattern {
  if (broken || flights.length < 3 || flights.some((f) => f.issues.length)) return "ineligible"
  const delays = flights.map((f) => numeric(f.raw.DepDelay)!)
  const peak = Math.max(...delays)
  if (delays.every((delay) => Math.abs(delay) < 15)) return "near"
  if (peak >= 60 && delays.at(-1)! < 15) return "recovered"
  const firstLate = delays.findIndex((delay) => delay >= 60)
  if (
    firstLate >= 0 &&
    firstLate < delays.length - 1 &&
    delays.slice(firstLate).every((delay) => delay >= 30)
  )
    return "persisted"
  return "other"
}

export function prepareDays(rows: RawFlight[], airports: Airport[]): AircraftDay[] {
  const flights = rows.map((row) => prepareFlight(row, airports))
  const identities = new Set<string>()
  for (const flight of flights) {
    if (identities.has(flight.id)) throw new Error(`Duplicate flight identity: ${flight.id}`)
    identities.add(flight.id)
  }
  const tails = new Map<string, Flight[]>()
  for (const flight of flights) {
    if (!flight.raw.Tail_Number) continue
    const key = flight.raw.Tail_Number
    if (!tails.has(key)) tails.set(key, [])
    tails.get(key)!.push(flight)
  }
  const result: AircraftDay[] = []
  for (const [tail, sequence] of tails) {
    sequence.sort(
      (a, b) =>
        (a.scheduledDeparture ?? Date.parse(a.raw.FlightDate)) -
          (b.scheduledDeparture ?? Date.parse(b.raw.FlightDate)) || a.id.localeCompare(b.id),
    )
    const groups = new Map<string, Flight[]>()
    for (const flight of sequence) {
      const date = flight.raw.FlightDate.slice(0, 10)
      if (!groups.has(date)) groups.set(date, [])
      groups.get(date)!.push(flight)
    }
    for (const [date, legs] of groups) {
      const breaks: AircraftDay["breaks"] = []
      legs.forEach((flight, index) => {
        let issue = flight.issues.join("; ")
        if (index > 0) {
          issue ||= connectionIssue(legs[index - 1], flight) ?? ""
          if (sequence.indexOf(flight) !== sequence.indexOf(legs[index - 1]) + 1)
            issue ||= "A flight with another scheduled date intervenes"
        }
        if (issue) breaks.push({ before: flight.id, reason: issue })
      })
      result.push({
        id: `${date}~${tail}`,
        date,
        tail,
        flights: legs,
        breaks,
        pattern: classifyDay(legs, breaks.length > 0),
        context: {
          previous: sequence[sequence.indexOf(legs[0]) - 1] ?? null,
          next: sequence[sequence.indexOf(legs.at(-1)!) + 1] ?? null,
        },
      })
    }
  }
  return result.sort((a, b) => a.id.localeCompare(b.id))
}
