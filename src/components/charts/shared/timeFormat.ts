/**
 * Inlined replacement for the subset of `d3-time-format` semiotic
 * uses (the `timeFormat(spec)` factory).
 *
 * Why this module exists: `d3-time-format` (~86KB) plus its `d3-time`
 * peer (~40KB) ship a complete strftime engine with locale-data
 * bundles we don't use. semiotic only consumes the strftime token
 * parser — locale formatting can defer to `Intl.DateTimeFormat`,
 * which is built into every modern runtime.
 *
 * What's implemented (the chart-axis-relevant subset):
 *
 *   - `%Y` — 4-digit year
 *   - `%y` — 2-digit year (zero-padded)
 *   - `%m` — 2-digit month (01–12)
 *   - `%d` — 2-digit day (01–31)
 *   - `%e` — day of month, space-padded (matches d3)
 *   - `%H` — 2-digit hour, 24-hr (00–23)
 *   - `%I` — 2-digit hour, 12-hr (01–12)
 *   - `%M` — 2-digit minute (00–59)
 *   - `%S` — 2-digit second (00–59)
 *   - `%L` — 3-digit millisecond (000–999)
 *   - `%p` — AM/PM
 *   - `%b` — short month name (Jan, Feb …)
 *   - `%B` — long month name (January, February …)
 *   - `%a` — short weekday name (Mon, Tue …)
 *   - `%A` — long weekday name (Monday, Tuesday …)
 *   - `%j` — day of year (001–366)
 *   - `%%` — literal `%`
 *
 * What's NOT implemented (rare in chart axis labels):
 *
 *   - `%U` / `%W` — week of year (Sunday/Monday-based)
 *   - `%Z` / `%z` — timezone name / offset
 *   - `%c` / `%x` / `%X` — locale-default date/time/full forms
 *   - `%f` — microseconds (always 0 in JS Date anyway)
 *
 * Localized name forms (`%b`/`%B`/`%a`/`%A`) defer to
 * `Intl.DateTimeFormat` so they match the user's locale, matching
 * d3-time-format's `formatLocale` behavior under the default locale.
 *
 * This shim uses the local timezone (matching `d3-time-format`'s
 * `timeFormat`); for UTC equivalence we'd add a `utcFormat` factory
 * that mirrors `getUTC*` accessors. Add it to this module rather than
 * re-introducing the dependency if a UTC formatter becomes necessary.
 */

const PAD2 = (n: number) => (n < 10 ? `0${n}` : String(n))
const PAD3 = (n: number) => (n < 10 ? `00${n}` : n < 100 ? `0${n}` : String(n))

// Cached Intl formatters — instantiating these is non-trivial and the
// chart-axis use case calls the formatter once per tick. The locale
// is the runtime default; users wanting a specific locale should pass
// pre-formatted strings rather than rely on the chart's tick formatter.
let monthShort: Intl.DateTimeFormat | null = null
let monthLong: Intl.DateTimeFormat | null = null
let weekdayShort: Intl.DateTimeFormat | null = null
let weekdayLong: Intl.DateTimeFormat | null = null

function fmtMonthShort(d: Date): string {
  if (!monthShort) monthShort = new Intl.DateTimeFormat(undefined, { month: "short" })
  return monthShort.format(d)
}
function fmtMonthLong(d: Date): string {
  if (!monthLong) monthLong = new Intl.DateTimeFormat(undefined, { month: "long" })
  return monthLong.format(d)
}
function fmtWeekdayShort(d: Date): string {
  if (!weekdayShort) weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: "short" })
  return weekdayShort.format(d)
}
function fmtWeekdayLong(d: Date): string {
  if (!weekdayLong) weekdayLong = new Intl.DateTimeFormat(undefined, { weekday: "long" })
  return weekdayLong.format(d)
}

function dayOfYear(d: Date): number {
  // Compute from local calendar components, not a millisecond delta.
  // A naive `(d - Jan1) / 86400000` reads the local-tz wall-clock
  // span, which is off by one across a DST boundary (a 23h or 25h
  // local day skews the integer division). Reading the local
  // year/month/date and projecting onto a UTC integer day count
  // avoids the issue — UTC has no DST, so day-counting in UTC of
  // the local calendar position is exact. Result is 1-based to
  // match d3's `%j` range (001–366).
  const startUtc = Date.UTC(d.getFullYear(), 0, 1)
  const todayUtc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const dayMs = 24 * 60 * 60 * 1000
  return Math.floor((todayUtc - startUtc) / dayMs) + 1
}

function applyToken(token: string, d: Date): string {
  switch (token) {
    case "Y": return String(d.getFullYear())
    case "y": return PAD2(d.getFullYear() % 100)
    case "m": return PAD2(d.getMonth() + 1)
    case "d": return PAD2(d.getDate())
    case "e": {
      const day = d.getDate()
      return day < 10 ? ` ${day}` : String(day)
    }
    case "H": return PAD2(d.getHours())
    case "I": {
      const h = d.getHours() % 12
      return PAD2(h === 0 ? 12 : h)
    }
    case "M": return PAD2(d.getMinutes())
    case "S": return PAD2(d.getSeconds())
    case "L": return PAD3(d.getMilliseconds())
    case "p": return d.getHours() < 12 ? "AM" : "PM"
    case "b": return fmtMonthShort(d)
    case "B": return fmtMonthLong(d)
    case "a": return fmtWeekdayShort(d)
    case "A": return fmtWeekdayLong(d)
    case "j": return PAD3(dayOfYear(d))
    case "%": return "%"
    default:
      // Unknown token — preserve `%X` literally so the user sees what
      // they typed and can fix it. d3 throws here; we degrade to a
      // visible string instead so a chart axis doesn't blank out.
      return `%${token}`
  }
}

/**
 * Build a date formatter from a strftime-style spec string.
 * Mirrors `d3.timeFormat(spec)`: returns `(date: Date) => string`.
 *
 * Tokens are scanned left-to-right; literal text between tokens
 * passes through unchanged. The returned function uses the local
 * timezone (matching d3-time-format's `timeFormat`).
 */
export function timeFormat(spec: string): (date: Date) => string {
  // Pre-tokenize so each call to the returned function only walks
  // the resolved program, not the spec string. Important when the
  // formatter fires once per axis tick on a streaming chart.
  type Op =
    | { type: "literal"; text: string }
    | { type: "token"; token: string }

  const program: Op[] = []
  let i = 0
  let buf = ""
  while (i < spec.length) {
    const c = spec[i]
    if (c === "%" && i + 1 < spec.length) {
      if (buf) { program.push({ type: "literal", text: buf }); buf = "" }
      program.push({ type: "token", token: spec[i + 1] })
      i += 2
    } else {
      buf += c
      i += 1
    }
  }
  if (buf) program.push({ type: "literal", text: buf })

  return (date: Date) => {
    let out = ""
    for (const op of program) {
      out += op.type === "literal" ? op.text : applyToken(op.token, date)
    }
    return out
  }
}
