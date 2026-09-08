import { createHash } from "node:crypto"
import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import {
  months,
  shiftMonth,
  snapshotDigest,
  type JobsSnapshot,
  type Vintage
} from "../../docs/src/pages/examples/jobs-report/model"
import calendar from "./calendar.json"

interface Capture {
  file: string
  url: string
  referenceMonth: string
  releaseDate: string
  retrievedAt: string
  bytes: number
  sha256: string
}
export function ingest(directory: string): JobsSnapshot {
  const raw = readFileSync(resolve(directory, "retrieval.json"), "utf8")
  const manifest = JSON.parse(raw)
  if (
    manifest.schemaVersion !== 1 ||
    manifest.seriesId !== "CES0000000001" ||
    manifest.distributorSeriesId !== "PAYEMS" ||
    manifest.unit !== "thousand jobs" ||
    manifest.seasonalAdjustment !== "seasonally adjusted" ||
    manifest.files?.length !== 25
  )
    throw new Error(
      "Unexpected source series, unit, adjustment or capture count"
    )
  const dates = new Set<string>()
  const vintages: Vintage[] = manifest.files.map((entry: Capture) => {
    if (
      !/^PAYEMS-\d{4}-\d{2}-\d{2}\.csv$/.test(entry.file) ||
      entry.file !== `PAYEMS-${entry.releaseDate}.csv` ||
      dates.has(entry.releaseDate)
    )
      throw new Error("Invalid or duplicate source filename/date")
    dates.add(entry.releaseDate)
    if (
      !calendar.some(
        ([month, date]) =>
          month === entry.referenceMonth && date === entry.releaseDate
      )
    )
      throw new Error(
        "Source reference month and publication date disagree with the BLS calendar"
      )
    const expectedURL = `https://alfred.stlouisfed.org/graph/alfredgraph.csv?id=PAYEMS&cosd=2023-12-01&coed=2025-12-01&vintage_date=${entry.releaseDate}`
    if (entry.url !== expectedURL)
      throw new Error("Unexpected source URL or vintage parameter")
    if (!Number.isFinite(Date.parse(entry.retrievedAt)))
      throw new Error("Missing retrieval time")
    const bytes = readFileSync(resolve(directory, entry.file))
    if (
      bytes.length !== entry.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== entry.sha256
    )
      throw new Error(`Source checksum mismatch: ${entry.file}`)
    const [header, ...rows] = bytes.toString("utf8").trim().split(/\r?\n/)
    if (
      header !==
      `observation_date,PAYEMS_${entry.releaseDate.replaceAll("-", "")}`
    )
      throw new Error(
        `Source did not identify requested vintage: ${entry.file}`
      )
    const levels: Record<string, number> = {}
    for (const row of rows) {
      const match = /^(\d{4}-\d{2})-01,(\d+)$/.exec(row)
      if (
        !match ||
        !["2023-12", ...months].includes(match[1]) ||
        levels[match[1]] !== undefined
      )
        throw new Error(`Invalid, duplicate or unexpected level: ${row}`)
      const month = match[1]
      if (month > entry.referenceMonth)
        throw new Error("An export contains a future reference month")
      levels[month] = Number(match[2])
    }
    const last =
      entry.referenceMonth > "2025-12" ? "2025-12" : entry.referenceMonth
    for (let month = "2023-12"; month <= last; month = shiftMonth(month, 1)) {
      if (levels[month] === undefined)
        throw new Error(`Missing level ${month} in ${entry.file}`)
    }
    return {
      releaseDate: entry.releaseDate,
      featuredMonth: entry.referenceMonth,
      file: entry.file,
      url: entry.url,
      sha256: entry.sha256,
      retrievedAt: entry.retrievedAt,
      levels
    }
  })
  if (
    readdirSync(directory).filter((file) => file.endsWith(".csv")).length !==
    vintages.length
  )
    throw new Error("Every CSV must have a retrieval checksum")
  vintages.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
  const sourceDigest = snapshotDigest(vintages)
  return {
    schemaVersion: 1,
    id: `ces-2024-2025-${sourceDigest.slice(7, 19)}-v1`,
    sourceDigest,
    capturedAt: manifest.captureStartedAt,
    vintages
  }
}
