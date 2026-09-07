import { dateTime } from "./calendar"
import type { PreparedGuide, Reading } from "./types"

export const number = (value: number | null, decimals = 0) =>
  value === null
    ? "Unavailable"
    : value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
export const percent = (value: number | null) =>
  value === null ? "Unavailable" : `${number(value, 1)}%`
export const dateLabel = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(dateTime(date))
    : "No such calendar date in this water year"
export const monthDayLabel = (monthDay: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    dateTime(`2000-${monthDay}`),
  )

export function readingLabel(reading: Reading | null) {
  if (!reading || reading.storageAcreFeet === null) return "Unavailable"
  return `${number(reading.storageAcreFeet)} acre-feet${reading.status === "reported" ? "" : ` (${reading.status})`}`
}

export function guideSummary(guide: PreparedGuide) {
  const prefix = `${guide.reservoir.name}, ${dateLabel(guide.date)}: `
  if (!guide.reading?.eligible)
    return `${prefix}${readingLabel(guide.reading)}. Missing or estimated readings are not used in the comparisons.`
  const capacity =
    guide.capacity.percent === null
      ? "No supported capacity comparison."
      : `${percent(guide.capacity.percent)} of ${guide.capacity.mode === "dated" ? "documented capacity" : "the July 30, 2025 capacity reference"}.`
  const average =
    guide.baseline.percentOfMean === null
      ? "A compatible seasonal average is unavailable."
      : `${percent(guide.baseline.percentOfMean)} of the mean of ${guide.baseline.count} eligible 1991–2020 observations for this month and day.`
  const rank =
    guide.baseline.percentile === null
      ? (guide.baseline.reason ?? "A percentile is unavailable.")
      : `Historical percentile ${number(guide.baseline.percentile, 1)}; ${guide.baseline.less} of ${guide.baseline.count} values were lower, with ${guide.baseline.equal} ties.`
  return `${prefix}${readingLabel(guide.reading)}. ${capacity} ${average} ${rank}`
}

export function collectionSummary(guide: PreparedGuide) {
  const { collection } = guide
  const included = collection.members
    .filter((item) => collection.includedIds.includes(item.reservoir.id))
    .map((item) => item.reservoir.name)
    .join(", ")
  const missing = collection.members
    .filter((item) => collection.excludedIds.includes(item.reservoir.id))
    .map((item) => item.reservoir.name)
    .join(", ")
  if (!collection.includedIds.length)
    return "No eligible reservoir/capacity pairs for this date; the collection is unavailable."
  return `${collection.status === "partial" ? "Partial collection" : "These six reservoirs"}: ${number(collection.storage)} acre-feet / ${number(collection.capacity)} acre-feet = ${percent(collection.percent)}${collection.mode === "reference" ? " of the July 30, 2025 capacity references" : " of their documented capacity"}. Included: ${included}.${missing ? ` Excluded: ${missing}.` : ""} This is not a statewide total.`
}

export const escapeMarkup = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  )
