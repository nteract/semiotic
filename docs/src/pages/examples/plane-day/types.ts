export type RawFlight = Record<string, string>

export interface Airport {
  id: string
  code: string
  city: string
  zone: string
}

export interface Flight {
  id: string
  raw: RawFlight
  scheduledDeparture: number | null
  scheduledArrival: number | null
  actualDeparture: number | null
  actualArrival: number | null
  issues: string[]
}

export type Pattern = "near" | "recovered" | "persisted" | "other" | "ineligible"

export interface AircraftDay {
  id: string
  date: string
  tail: string
  flights: Flight[]
  breaks: { before: string; reason: string }[]
  pattern: Pattern
  context: { previous: Flight | null; next: Flight | null }
}

export interface DaySummary {
  id: string
  fingerprint: string
  firstEventId: string
  date: string
  tail: string
  pattern: Pattern
  legs: number
  peak: number | null
  final: number | null
}

export interface PlaneSnapshot {
  version: 1
  editionId: string
  retrievedAt: string
  transformVersion: string
  sourceSHA256: string
  zonesVersion: string
  tzdbVersion: string
  airports: Airport[]
  counts: Record<string, number>
  days: DaySummary[]
  cases: AircraftDay[]
  distribution: { pattern: Pattern; bucket: string; count: number }[]
}

export interface EventReference {
  editionId: string
  dayId: string
  eventId: string
}

export interface ReaderNote {
  target: EventReference
  text: string
  authoredBy: "reader"
  status: "unreviewed"
  createdAt: string
}

export interface PlaneState {
  version: 1
  selected: EventReference
  view: "timeline" | "network"
  timeBasis: "local" | "utc"
  notes: ReaderNote[]
}
