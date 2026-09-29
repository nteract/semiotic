/**
 * Number-format cascade for BigNumber.
 *
 * Resolves a `BigNumberFormat` shortcut (or custom fn) against the
 * card's locale + currency + precision props and returns a memoizable
 * formatter. All built-ins use `Intl.NumberFormat` so locale + grouping
 * behave correctly without bundling a separate number-format library.
 */
import type { BigNumberFormat } from "./types"

export interface FormatContext {
  locale?: string
  currency?: string
  precision?: number
  notation?: Intl.NumberFormatOptions["notation"]
}

/**
 * Build a `(value) => string` formatter from a shortcut + context.
 * Custom-function shortcuts are returned as-is.
 */
export function buildFormatter(
  format: BigNumberFormat | undefined,
  ctx: FormatContext = {}
): (value: number) => string {
  if (typeof format === "function") return format

  const locale = ctx.locale ?? "en-US"
  const currency = ctx.currency ?? "USD"

  if (format === "currency") {
    const precision = ctx.precision ?? 2
    const nf = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: precision,
      minimumFractionDigits: precision,
    })
    return (v) => nf.format(v)
  }

  if (format === "percent") {
    const precision = ctx.precision ?? 1
    const nf = new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: precision,
      minimumFractionDigits: 0,
    })
    return (v) => nf.format(v)
  }

  if (format === "compact") {
    const precision = ctx.precision ?? 1
    const nf = new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: precision,
      minimumFractionDigits: 0,
    })
    return (v) => nf.format(v)
  }

  if (format === "duration") {
    return (v) => formatDuration(v)
  }

  // Default — plain number with grouping.
  const precision = ctx.precision ?? 0
  const nf = new Intl.NumberFormat(locale, {
    notation: ctx.notation ?? "standard",
    maximumFractionDigits: precision,
    minimumFractionDigits: 0,
  })
  return (v) => nf.format(v)
}

/**
 * Format a millisecond duration as a short human string:
 * `2h 14m`, `45s`, `12ms`. Useful for latency-style KPIs.
 *
 * Each form rounds to its display precision before splitting into units,
 * carrying into the larger unit, so 59 999ms reads `1m` rather than `60s`
 * and 3 599 600ms reads `1h` rather than `59m 60s`.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return String(ms)
  const sign = ms < 0 ? "-" : ""
  const v = Math.abs(ms)
  const wholeMs = Math.round(v)
  if (wholeMs < 1000) return `${sign}${wholeMs}ms`
  const seconds = Math.round(v / 10) / 100
  if (seconds < 60) return `${sign}${trimZero(seconds)}s`
  const totalS = Math.round(v / 1000)
  if (totalS < 3600) return `${sign}${unitPair(Math.floor(totalS / 60), "m", totalS % 60, "s")}`
  const totalM = Math.round(v / 60_000)
  if (totalM < 1440) return `${sign}${unitPair(Math.floor(totalM / 60), "h", totalM % 60, "m")}`
  const totalH = Math.round(v / 3_600_000)
  return `${sign}${unitPair(Math.floor(totalH / 24), "d", totalH % 24, "h")}`
}

function unitPair(major: number, majorUnit: string, minor: number, minorUnit: string): string {
  return minor === 0 ? `${major}${majorUnit}` : `${major}${majorUnit} ${minor}${minorUnit}`
}

function trimZero(n: number): string {
  // Round to 2dp; JS's `String(n)` already trims trailing zeros
  // (`String(1.0) === "1"`, `String(1.25) === "1.25"`).
  return String(Math.round(n * 100) / 100)
}

/**
 * Decorate a formatted number with prefix/suffix. Empty strings are
 * skipped without padding.
 */
export function decorate(
  formatted: string,
  prefix: string | undefined,
  suffix: string | undefined
): string {
  return `${prefix ?? ""}${formatted}${suffix ?? ""}`
}

/**
 * True when `delta` formats the same as zero, including a small non-zero
 * delta that rounds away (0.0004 under a one-decimal percent formatter), so
 * it reads, and is colored, as no change.
 */
export function isFormattedZero(
  delta: number,
  formatter: (value: number) => string
): boolean {
  return delta === 0 || formatter(Math.abs(delta)) === formatter(0)
}

/**
 * Format a signed delta — always carry an explicit + on positive values
 * so the sign-as-information stays legible. Zero, including a delta that
 * rounds to zero, renders as the formatter's zero with no sign (no `+0`
 * or `−0%`).
 */
export function formatSignedDelta(
  delta: number,
  formatter: (value: number) => string
): string {
  if (!Number.isFinite(delta)) return ""
  if (isFormattedZero(delta, formatter)) return formatter(0)
  const sign = delta > 0 ? "+" : "−"
  // Use the formatter on the absolute value so currency symbols /
  // percent signs / grouping all render before we prepend the sign.
  return `${sign}${formatter(Math.abs(delta))}`
}

/**
 * Format a percent change. `from` of 0 yields `null` (undefined ratio).
 */
export function formatDeltaPercent(
  from: number,
  to: number,
  locale = "en-US",
  precision = 1
): string | null {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null
  if (from === 0) return null
  const ratio = (to - from) / Math.abs(from)
  const nf = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: precision,
    minimumFractionDigits: 0,
    signDisplay: "exceptZero",
  })
  return nf.format(ratio)
}
