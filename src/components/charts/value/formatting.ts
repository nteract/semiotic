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
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return String(ms)
  const sign = ms < 0 ? "-" : ""
  const v = Math.abs(ms)
  if (v < 1000) return `${sign}${Math.round(v)}ms`
  const s = v / 1000
  if (s < 60) return `${sign}${trimZero(s)}s`
  const m = s / 60
  if (m < 60) {
    const wholeM = Math.floor(m)
    const remS = Math.round(s - wholeM * 60)
    return remS === 0 ? `${sign}${wholeM}m` : `${sign}${wholeM}m ${remS}s`
  }
  const h = m / 60
  if (h < 24) {
    const wholeH = Math.floor(h)
    const remM = Math.round(m - wholeH * 60)
    return remM === 0 ? `${sign}${wholeH}h` : `${sign}${wholeH}h ${remM}m`
  }
  const d = h / 24
  const wholeD = Math.floor(d)
  const remH = Math.round(h - wholeD * 24)
  return remH === 0 ? `${sign}${wholeD}d` : `${sign}${wholeD}d ${remH}h`
}

function trimZero(n: number): string {
  // 1.0 → "1", 1.25 → "1.25"
  const r = Math.round(n * 100) / 100
  return Number.isInteger(r) ? String(r) : String(r)
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
 * Format a signed delta — always carry an explicit + on positive values
 * so the sign-as-information stays legible. Zero renders as `"0"`
 * unformatted-by-sign (no `+0`).
 */
export function formatSignedDelta(
  delta: number,
  formatter: (value: number) => string
): string {
  if (!Number.isFinite(delta)) return ""
  if (delta === 0) return formatter(0)
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
