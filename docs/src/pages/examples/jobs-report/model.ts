import { fingerprintValue } from "semiotic/artifact"

export interface Vintage {
  releaseDate: string
  featuredMonth: string
  file: string
  url: string
  sha256: string
  retrievedAt: string
  levels: Record<string, number>
}
export interface JobsSnapshot {
  schemaVersion: 1
  id: string
  sourceDigest: string
  capturedAt: string
  vintages: Vintage[]
}
export interface Estimate {
  referenceMonth: string
  releaseDate: string
  level: number
  previousLevel: number
  change: number
  file: string
}
export const firstEdition = "2026-01-09"
export const laterEdition = "2026-03-06"
export const months = Array.from({ length: 24 }, (_, i) => shiftMonth("2024-01", i))
export function shiftMonth(month: string, offset: number): string {
  const [year, part] = month.split("-").map(Number)
  return new Date(Date.UTC(year, part - 1 + offset, 1)).toISOString().slice(0, 7)
}
export function monthName(month: string): string {
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}
export function dateName(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}
export function jobs(thousands: number): number {
  if (!Number.isFinite(thousands)) throw new Error("A jobs value must be finite")
  return thousands * 1000
}
export function signed(value: number | null): string {
  if (value === null) return "Unavailable"
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toLocaleString("en-US")}`
}
export function estimate(snapshot: JobsSnapshot, month: string, date: string): Estimate | null {
  const vintage = snapshot.vintages.find((entry) => entry.releaseDate === date)
  if (!vintage) return null
  const level = vintage.levels[month]
  const previousLevel = vintage.levels[shiftMonth(month, -1)]
  if (level === undefined || previousLevel === undefined) return null
  return {
    referenceMonth: month,
    releaseDate: date,
    level,
    previousLevel,
    change: jobs(level - previousLevel),
    file: vintage.file,
  }
}
export function stageDate(snapshot: JobsSnapshot, month: string, stage: "first" | "third") {
  if (stage === "first" && month === "2025-10") return undefined
  // The canceled October release delayed August's third estimate to December.
  if (stage === "third" && month === "2025-08") return "2025-12-16"
  return snapshot.vintages.find(
    ({ featuredMonth }) => featuredMonth === shiftMonth(month, stage === "first" ? 0 : 2),
  )?.releaseDate
}
export function prepareMonth(snapshot: JobsSnapshot, month: string, asOf = laterEdition) {
  if (!months.includes(month)) throw new Error("Choose a reference month in 2024–2025")
  if (!snapshot.vintages.some(({ releaseDate }) => releaseDate === asOf))
    throw new Error("Choose a captured publication date")
  const stage = (kind: "first" | "third") => {
    const date = stageDate(snapshot, month, kind)
    return date && date <= asOf ? estimate(snapshot, month, date) : null
  }
  const first = stage("first")
  const third = stage("third")
  const latest = estimate(snapshot, month, asOf)
  const reversal = first && latest && first.change * latest.change < 0
  return {
    month,
    asOf,
    first,
    third,
    latest,
    revision: first && latest ? latest.change - first.change : null,
    reversal: Boolean(reversal),
    summary: `${monthName(month)} employment change: first ${signed(first?.change ?? null)}; third ${signed(third?.change ?? null)}; ${dateName(asOf)} vintage ${signed(latest?.change ?? null)} jobs.`,
  }
}
export type PreparedMonth = ReturnType<typeof prepareMonth>

/** A coherent annual change uses both December levels from ONE dated export. */
export function annualChange(snapshot: JobsSnapshot, year: number, asOf: string): number | null {
  const levels = snapshot.vintages.find(({ releaseDate }) => releaseDate === asOf)?.levels
  const end = levels?.[`${year}-12`]
  const start = levels?.[`${year - 1}-12`]
  return end === undefined || start === undefined ? null : jobs(end - start)
}
export function canonicalRows(snapshot: JobsSnapshot, asOf = laterEdition) {
  return snapshot.vintages
    .filter((v) => v.releaseDate <= asOf)
    .flatMap((v) =>
      Object.entries(v.levels).flatMap(([referenceMonth, level]) => {
        const estimateKind =
          stageDate(snapshot, referenceMonth, "first") === v.releaseDate
            ? "first"
            : stageDate(snapshot, referenceMonth, "third") === v.releaseDate
              ? "third"
              : "dated-vintage"
        const base = {
          seriesId: "CES0000000001",
          referenceMonth,
          releaseDate: v.releaseDate,
          seasonalAdjustment: "seasonally adjusted",
          estimateKind,
          unit: "thousand jobs",
          snapshotId: snapshot.id,
          sourceFile: v.file,
        }
        const change = estimate(snapshot, referenceMonth, v.releaseDate)
        return [
          { ...base, measure: "employment-level", value: level },
          ...(change ? [{ ...base, measure: "monthly-change", value: change.change / 1000 }] : []),
        ]
      }),
    )
}
export function snapshotDigest(vintages: Vintage[]) {
  return fingerprintValue(vintages).fingerprint
}
