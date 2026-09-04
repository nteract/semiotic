import type { ObligationResult, TemporalContext } from "./types"

const CURRENT_LANGUAGE =
  /\b(?:now|current(?:ly)?|latest|live|real[ -]?time|up[ -]?to[ -]?date)\b/i
const BOUNDED_LANGUAGE =
  /\b(?:as of|through|up to(?!\s+date\b)|event time|observed (?:at|through)|data (?:from|through|as of))\b/i
const NEGATED_CURRENT_LANGUAGE =
  /\b(?:not|isn['’]?t|is not|no longer|never)\b(?:\s+[a-z'-]+){0,3}\s+(?:now|current|latest|live|real[ -]?time|up[ -]?to[ -]?date)\b/i

export function parseAbsoluteTime(value: string): number {
  const trimmed = value.trim()
  const date = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  if (date) {
    const year = Number(date[1])
    const month = Number(date[2])
    const day = Number(date[3])
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
      return Number.NaN
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return Date.parse(`${trimmed}T00:00:00Z`)
  }
  if (!/(?:z|[+-]\d{2}:\d{2})$/i.test(trimmed)) return Number.NaN
  return Date.parse(trimmed)
}

function absoluteTime(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = parseAbsoluteTime(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Detect presentation language that turns an older event-time fact into a
 * claim about the wall-clock present. The comparison uses only declared
 * clocks, so the result is deterministic and replayable.
 */
export function eventTimePresentationFinding(
  context: TemporalContext,
  referenceTime?: string
): ObligationResult | undefined {
  const label = context.presentation?.label?.trim()
  if (
    !label ||
    !CURRENT_LANGUAGE.test(label) ||
    BOUNDED_LANGUAGE.test(label) ||
    NEGATED_CURRENT_LANGUAGE.test(label)
  ) {
    return undefined
  }

  const eventTime = absoluteTime(context.eventTime?.value)
  if (eventTime === undefined) return undefined
  const comparisonTimes = [
    referenceTime,
    context.observedAt,
    context.ingestedAt,
    context.processedAt,
    context.publishedAt,
    context.snapshotAt
  ]
    .map(absoluteTime)
    .filter((time): time is number => time !== undefined)
  if (
    comparisonTimes.length === 0 ||
    eventTime >= Math.max(...comparisonTimes)
  ) {
    return undefined
  }

  return {
    id: "time.presentation.event-time-as-now",
    relation: "time",
    status: "fail",
    path: "time.presentation.label",
    message:
      "The presentation describes older event-time data as current wall-clock state.",
    repair:
      "State the exact event time or use bounded language such as ‘as of’ or ‘through’."
  }
}
