import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { csvParse } from "d3-dsv"
import { fingerprintValue } from "../../src/components/artifact/fingerprint"
import zones from "./airport-zones.json"
import { prepareDays } from "../../docs/src/pages/examples/plane-day/prepare"
import { numeric } from "../../docs/src/pages/examples/plane-day/time"
import type {
  Pattern,
  PlaneSnapshot,
  RawFlight
} from "../../docs/src/pages/examples/plane-day/types"

export const TRANSFORM = "e02-bts-aircraft-day-v1"
export const FIELDS = [
  "FlightDate",
  "Reporting_Airline",
  "DOT_ID_Reporting_Airline",
  "Tail_Number",
  "Flight_Number_Reporting_Airline",
  "OriginAirportID",
  "Origin",
  "DestAirportID",
  "Dest",
  "CRSDepTime",
  "DepTime",
  "DepDelay",
  "CRSArrTime",
  "ArrTime",
  "ArrDelay",
  "CRSElapsedTime",
  "ActualElapsedTime",
  "Cancelled",
  "CancellationCode",
  "Diverted",
  "CarrierDelay",
  "WeatherDelay",
  "NASDelay",
  "SecurityDelay",
  "LateAircraftDelay"
]
export const sha256 = (input: string | Buffer) =>
  createHash("sha256").update(input).digest("hex")

export function ingest(source: string) {
  const retrieval = JSON.parse(
    readFileSync(join(source, "retrieval.json"), "utf8")
  )
  for (const file of retrieval.files) {
    if (sha256(readFileSync(join(source, file.file))) !== file.sha256)
      throw new Error(`Source checksum mismatch: ${file.file}`)
  }
  if (process.versions.tz !== "2025c")
    throw new Error(
      "This edition requires Node ICU tzdb 2025c. Use the pinned Node 22.22.1 runtime."
    )
  const csv = readFileSync(join(source, "ha-july-2025.csv"), "utf8")
  const parsed = csvParse(csv)
  if (FIELDS.some((field) => !parsed.columns.includes(field)))
    throw new Error("Required BTS field missing")
  if (
    parsed.length !== retrieval.carrierRows ||
    parsed.length !== retrieval.sourceRecordLines.length
  )
    throw new Error("Source row count mismatch")
  const rows: RawFlight[] = parsed.map((row, i) => {
    if (
      row.Reporting_Airline !== "HA" ||
      !row.FlightDate.startsWith("2025-07-")
    )
      throw new Error("Unexpected carrier or month")
    return {
      ...Object.fromEntries(FIELDS.map((field) => [field, row[field]])),
      sourceRecordLine: String(retrieval.sourceRecordLines[i])
    }
  })
  const allDays = prepareDays(rows, zones.airports)
  const days = allDays.filter(
    (day) => day.date > "2025-07-01" && day.date < "2025-07-31"
  )
  const patterns: Pattern[] = [
    "near",
    "recovered",
    "persisted",
    "other",
    "ineligible"
  ]
  const cases = patterns.slice(0, 3).map((pattern) => {
    const candidates = days
      .filter((day) => day.pattern === pattern)
      .sort(
        (a, b) =>
          a.flights.length - b.flights.length || a.id.localeCompare(b.id)
      )
    if (!candidates.length)
      throw new Error(`No admitted ${pattern} case; revise the story`)
    return candidates[0]
  })
  const snapshot: PlaneSnapshot = {
    version: 1,
    editionId: `ha-2025-07-${retrieval.archiveSHA256.slice(0, 12)}-v1`,
    retrievedAt: retrieval.retrievedAt,
    transformVersion: TRANSFORM,
    sourceSHA256: retrieval.archiveSHA256,
    zonesVersion: zones.version,
    tzdbVersion: process.versions.tz,
    airports: zones.airports,
    counts: {
      archiveRows: retrieval.archiveRows,
      carrierRows: rows.length,
      otherCarrierRows: retrieval.archiveRows - rows.length,
      missingTailRows: rows.filter((row) => !row.Tail_Number).length,
      boundaryRows: rows.filter((row) =>
        ["2025-07-01", "2025-07-31"].includes(row.FlightDate)
      ).length,
      windowRows: rows.filter(
        (row) => row.FlightDate > "2025-07-01" && row.FlightDate < "2025-07-31"
      ).length,
      aircraftDays: days.length,
      shortDays: days.filter((day) => day.flights.length < 3).length,
      brokenDays: days.filter((day) => day.breaks.length > 0).length,
      eligibleDays: days.filter((day) => day.pattern !== "ineligible").length,
      ...Object.fromEntries(
        patterns.map((pattern) => [
          pattern,
          days.filter((day) => day.pattern === pattern).length
        ])
      )
    },
    days: days.map((day) => ({
      id: day.id,
      fingerprint: fingerprintValue(day).fingerprint,
      firstEventId: day.flights[0].id,
      date: day.date,
      tail: day.tail,
      pattern: day.pattern,
      legs: day.flights.length,
      peak: day.flights.some((f) => numeric(f.raw.DepDelay) === null)
        ? null
        : Math.max(...day.flights.map((f) => numeric(f.raw.DepDelay)!)),
      final: numeric(day.flights.at(-1)!.raw.DepDelay)
    })),
    cases,
    distribution: patterns.flatMap((pattern) => {
      const delays = days
        .filter((day) => day.pattern === pattern)
        .flatMap((day) => day.flights)
        .filter((flight) => !flight.issues.length)
        .map((f) => numeric(f.raw.DepDelay)!)
      return [
        { bucket: "Early (<0)", count: delays.filter((d) => d < 0).length },
        {
          bucket: "0–14 min",
          count: delays.filter((d) => d >= 0 && d < 15).length
        },
        {
          bucket: "15–59 min",
          count: delays.filter((d) => d >= 15 && d < 60).length
        },
        {
          bucket: "60–119 min",
          count: delays.filter((d) => d >= 60 && d < 120).length
        },
        { bucket: "120+ min", count: delays.filter((d) => d >= 120).length }
      ].map((bucket) => ({ pattern, ...bucket }))
    })
  }
  return { snapshot, days, retrieval, rows }
}
