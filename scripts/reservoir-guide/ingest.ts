import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { csvParse } from "d3-dsv"
import { JSDOM } from "jsdom"
import { fingerprintValue } from "../../src/components/artifact/fingerprint"
import {
  addDays,
  cdecStamp,
  dateIndex
} from "../../docs/src/pages/examples/reservoir-guide/calendar"
import type {
  PackedReading,
  Reservoir,
  ReservoirSnapshot,
  SourceFile
} from "../../docs/src/pages/examples/reservoir-guide/types"

export const TRANSFORM = "e03-cdec-storage-v1"
export const START = "1990-10-01"
export const END = "2025-09-30"
export const REFERENCE = "2025-07-30"
export const STATIONS = [
  ["SHA", "Shasta"],
  ["ORO", "Oroville"],
  ["FOL", "Folsom"],
  ["NML", "New Melones"],
  ["DNP", "Don Pedro"],
  ["CLE", "Trinity"]
] as const
export const sha256 = (input: string | Buffer) =>
  createHash("sha256").update(input).digest("hex")

export function parseStorageCSV(
  text: string,
  stationId: string,
  start = START,
  end = END
) {
  const rows = csvParse(text)
  const expected = [
    "STATION_ID",
    "DURATION",
    "SENSOR_NUMBER",
    "SENSOR_TYPE",
    "DATE TIME",
    "OBS DATE",
    "VALUE",
    "DATA_FLAG",
    "UNITS"
  ]
  if (expected.some((field) => !rows.columns.includes(field)))
    throw new Error("CDEC CSV field is missing")
  const days = dateIndex(end, start) + 1
  const packed = Array.from({ length: days }, (): PackedReading => [null, null])
  const overrides: Record<string, number> = {}
  const seen = new Set<string>()
  for (const [line, row] of rows.entries()) {
    if (
      row.STATION_ID !== stationId ||
      row.SENSOR_NUMBER !== "15" ||
      row.DURATION !== "D" ||
      row.SENSOR_TYPE !== "STORAGE" ||
      row.UNITS !== "AF"
    )
      throw new Error(
        `Wrong CDEC station, sensor, duration or units at source line ${line + 2}`
      )
    const timestamp = cdecStamp(row["DATE TIME"])
    if (!row["DATE TIME"].endsWith(" 0000"))
      throw new Error("Unexpected daily reporting clock")
    const date = new Date(timestamp).toISOString().slice(0, 10)
    const index = dateIndex(date, start)
    if (index < 0 || index >= days)
      throw new Error("CDEC row outside the requested period")
    if (seen.has(date))
      throw new Error(`Duplicate storage identity: ${stationId}:${date}`)
    seen.add(date)
    const rawValue = row.VALUE.trim()
    if (rawValue !== "---" && !/^\d+(\.\d+)?$/.test(rawValue))
      throw new Error(`Unsupported storage value at ${stationId}:${date}`)
    const value = rawValue === "---" ? null : Number(rawValue)
    const offset = (cdecStamp(row["OBS DATE"]) - timestamp) / 60_000
    const flag = row.DATA_FLAG.trim()
    packed[index] = flag ? [value, offset, flag] : [value, offset]
    if (index !== line) overrides[date] = line + 2
  }
  return { packed, overrides, count: rows.length }
}

export function ingest(directory: string): ReservoirSnapshot {
  const { sources } = JSON.parse(
    readFileSync(join(directory, "retrieval.json"), "utf8")
  ) as { sources: SourceFile[] }
  const required = [
    ...STATIONS.flatMap(([id]) => [`${id}.csv`, `${id}-metadata.html`]),
    "reference-capacities-2025.html",
    "data-flags.html",
    "webservice-guide.html",
    "water-watch-guide.html",
    "conditions-of-use.html"
  ]
  if (
    !Array.isArray(sources) ||
    new Set(sources.map((item) => item.file)).size !== sources.length ||
    required.some((file) => !sources.some((item) => item.file === file))
  )
    throw new Error("Missing or duplicate source inventory entry")
  sources.sort((a, b) => a.file.localeCompare(b.file))
  for (const source of sources) {
    if (!/^[A-Za-z0-9._-]+$/.test(source.file))
      throw new Error("Unsafe source filename")
    if (
      !Number.isFinite(Date.parse(source.retrievedAt)) ||
      !/^https:\/\//.test(source.url)
    )
      throw new Error("Invalid source retrieval metadata")
    const bytes = readFileSync(join(directory, source.file))
    if (sha256(bytes) !== source.sha256 || bytes.length !== source.bytes)
      throw new Error(`Source checksum mismatch: ${source.file}`)
  }
  const html = (name: string) =>
    new JSDOM(readFileSync(join(directory, name), "utf8")).window.document
  const flags = html("data-flags.html").body.textContent!.replace(/\s+/g, " ")
  if (!/e\s*Estimated/.test(flags) || !/r\s*Revised/.test(flags))
    throw new Error("Source flag definitions changed")
  const capacitiesDoc = html("reference-capacities-2025.html")
  if (
    ![...capacitiesDoc.querySelectorAll("h3")].some((item) =>
      item.textContent?.includes("Ending at midnight - 07/30/2025")
    )
  )
    throw new Error(
      "Capacity report date differs from the pinned reference date"
    )
  const source = sources.find(
    (item) => item.file === "reference-capacities-2025.html"
  )!
  const sourceDigest = sha256(
    JSON.stringify({
      transformVersion: TRANSFORM,
      sources: [...sources].sort((a, b) => a.file.localeCompare(b.file))
    })
  )
  const snapshot: ReservoirSnapshot = {
    version: 1,
    storyId: "E03",
    editionId: `cdec-wy1991-2025-${sourceDigest.slice(0, 12)}-v1`,
    fingerprint: "",
    retrievedAt: sources
      .map((item) => item.retrievedAt)
      .sort()
      .at(-1)!,
    transformVersion: TRANSFORM,
    startDate: START,
    endDate: END,
    baseline: {
      id: "wy1991-2020-month-day-regime-v1",
      startWaterYear: 1991,
      endWaterYear: 2020,
      minimumPercentileYears: 20
    },
    reservoirs: [],
    capacities: [],
    referenceCapacityDate: REFERENCE,
    series: {},
    sourceLineOverrides: {},
    sources,
    counts: {}
  }
  for (const [id, name] of STATIONS) {
    const metadata = html(`${id}-metadata.html`)
    const text = metadata.body.textContent!.replace(/\s+/g, " ")
    const sensor = [...metadata.querySelectorAll("tr")]
      .map((row) => row.textContent!.replace(/\s+/g, " ").trim())
      .find((row) => /RESERVOIR STORAGE, AF\s*15\s*\(daily\)/.test(row))
    if (!sensor || !text.includes(`Station ID${id}`))
      throw new Error(`Daily AF storage metadata is not verified for ${id}`)
    const latitude = Number(text.match(/Latitude\s*(-?[\d.]+)/)?.[1])
    const longitude = Number(text.match(/Longitude\s*(-?[\d.]+)/)?.[1])
    const river = text.match(/River Basin\s*(.*?)County/)?.[1]?.trim()
    if (![latitude, longitude].every(Number.isFinite) || !river)
      throw new Error(`Missing location metadata: ${id}`)
    const reservoir: Reservoir = {
      id,
      name,
      river,
      latitude,
      longitude,
      sourceFile: `${id}.csv`,
      metadataFile: `${id}-metadata.html`,
      changes: []
    }
    if (id === "ORO") {
      if (!text.includes("storage values starting on 7/1/2024"))
        throw new Error("Oroville rating-curve metadata changed")
      reservoir.changes.push({
        from: "2024-07-01",
        id: "oroville-2024-rating-curve",
        explanation:
          "CDEC recalculated the capacity rating curve. Storage from July 1, 2024 uses that curve. This guide withholds a baseline comparison across the documented change."
      })
    }
    snapshot.reservoirs.push(reservoir)
    const { packed, overrides, count } = parseStorageCSV(
      readFileSync(join(directory, `${id}.csv`), "utf8"),
      id
    )
    snapshot.series[id] = packed
    snapshot.sourceLineOverrides[id] = overrides
    snapshot.counts[id] = {
      rows: count,
      missing: packed.filter((item) => item[0] === null).length,
      estimated: packed.filter((item) => item[0] !== null && item[2] === "e")
        .length,
      revised: packed.filter((item) => item[0] !== null && item[2] === "r")
        .length,
      eligible: packed.filter(
        (item) => item[0] !== null && (!item[2] || item[2] === "r")
      ).length
    }
    const reportRow = [...capacitiesDoc.querySelectorAll("tr")]
      .map((row) =>
        [...row.querySelectorAll("td")].map((cell) =>
          cell.textContent!.replace(/\s+/g, " ").trim()
        )
      )
      .find((cells) => cells[1] === id)
    const capacity = Number(reportRow?.[2].replaceAll(",", ""))
    const reportStorage = Number(reportRow?.[4].replaceAll(",", ""))
    if (!Number.isFinite(capacity) || capacity <= 0)
      throw new Error(`Missing dated capacity for ${id}`)
    if (reportStorage !== packed[dateIndex(REFERENCE, START)][0])
      throw new Error(
        `Archived report and daily CSV disagree for ${id} on ${REFERENCE}`
      )
    snapshot.capacities.push({
      id: `${id}-capacity-${REFERENCE}`,
      stationId: id,
      acreFeet: capacity,
      validFrom: REFERENCE,
      validTo: REFERENCE,
      sourceFile: source.file,
      sourceURL: source.url
    })
  }
  if (addDays(START, snapshot.series.SHA.length - 1) !== END)
    throw new Error("Incomplete date range")
  snapshot.fingerprint = fingerprintValue({
    ...snapshot,
    fingerprint: ""
  }).fingerprint
  return snapshot
}
