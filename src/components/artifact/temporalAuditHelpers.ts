import type { ObligationResult, TemporalContext } from "./types"
import { parseAbsoluteTime } from "./temporalPresentation"

export interface ParsedClock {
  name: string
  path: string
  value: string
  time: number
}

function findingSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
}

export function parseClock(
  name: string,
  path: string,
  value: string | undefined,
  findings: ObligationResult[]
): ParsedClock | undefined {
  if (value === undefined) return undefined
  const time = parseAbsoluteTime(value)
  if (!Number.isFinite(time)) {
    findings.push({
      id: `time.clock.invalid.${findingSegment(name)}`,
      relation: "time",
      status: "fail",
      path,
      message: `${name} is not a parseable timestamp.`,
      repair: "Supply an absolute ISO 8601 timestamp or omit the unknown clock."
    })
    return undefined
  }
  return { name, path, value, time }
}

export function parseFixedDurationMs(value: string): number {
  const normalized = value.trim()
  const match =
    /^P(?:(\d+(?:\.\d+)?)W|(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?)$/i.exec(
      normalized
    )
  if (
    !match ||
    /T$/i.test(normalized) ||
    !match.slice(1).some((part) => part !== undefined)
  ) {
    return Number.NaN
  }
  const [, weeks = "0", days = "0", hours = "0", minutes = "0", seconds = "0"] =
    match
  const duration =
    Number(weeks) * 7 * 24 * 60 * 60 * 1000 +
    Number(days) * 24 * 60 * 60 * 1000 +
    Number(hours) * 60 * 60 * 1000 +
    Number(minutes) * 60 * 1000 +
    Number(seconds) * 1000
  return Number.isFinite(duration) && duration >= 0 ? duration : Number.NaN
}

export function normalizedTimezone(value: string): string {
  const normalized = value.trim().toLowerCase()
  return ["z", "utc", "gmt", "+00:00", "etc/utc"].includes(normalized)
    ? "utc"
    : normalized
}

export function normalizedGranularity(value: string): string {
  return value.trim().toLowerCase()
}

export function finalPresentation(context: TemporalContext): boolean {
  const label = context.presentation?.label ?? ""
  if (
    /\b(?:not|never|no\s+longer)\b(?:\s+[a-z'-]+){0,3}\s+(?:final|settled|complete)\b/i.test(
      label
    ) ||
    /\b(?:incomplete|unsettled|provisional|draft|pending)\b/i.test(label)
  ) {
    return false
  }
  return /\b(final|settled|complete)\b/i.test(label)
}
