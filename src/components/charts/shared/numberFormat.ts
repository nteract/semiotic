/**
 * Inlined replacement for the subset of `d3-format` that semiotic and
 * its consumers actually exercise.
 *
 * Why this module exists: `d3-format` ships ~42KB unpacked plus a
 * full locale-data table we don't use. Internally semiotic only emits
 * three format strings (`,.0f`, `,.${n}f`, `.${n}%`) but the public
 * `xFormat` / `yFormat` / `valueFormat` props let consumers pass any
 * d3-format spec, so the parser needs to cover the realistic chart
 * subset, not just the strings semiotic emits itself.
 *
 * What's implemented (the chart-relevant subset):
 *
 *     [,][.precision][~][type]
 *
 *   - `,` — thousands grouping using a literal comma. Matches d3's
 *     default-locale behavior (en-US); intentionally not locale-aware,
 *     because chart axis labels need stable output across CI runners
 *     and SSR snapshots — a runtime-locale separator would shift to
 *     `1.234,56` under de-DE / fr-FR and break golden-file tests.
 *   - `.N` — fractional precision (digits after the decimal for
 *     `f`/`%`, significant digits for `s`/`r`/`g`/`e`)
 *   - `~` — trim trailing zeros (matches d3's `~` modifier)
 *   - type: `f` (fixed), `%` (percent ×100), `e` (exponential),
 *     `d` (integer; precision ignored), `s` (SI prefix), `r` (rounded
 *     to N significant digits), `g` (general — switches between fixed
 *     and exponential), or omitted (a trimmed `g` at precision 12,
 *     matching d3).
 *
 * What's NOT implemented (rare in chart axis labels):
 *
 *   - `[fill][align]` (`0`, `<`, `>`, `^`, `=`) — padding/alignment
 *   - `[sign]` (`+`, `-`, `(`, ` `) — sign behaviors
 *   - `[symbol]` (`$`, `#`) — currency / radix prefix
 *   - `[width]` — minimum field width
 *   - `b`/`o`/`x`/`X`/`c`/`n`/`p` types — binary/octal/hex/code-point/
 *     comma/percent-rounded
 *
 * If a consumer passes a spec with one of the un-implemented features
 * the parser falls through to a best-effort `Intl.NumberFormat` call
 * so we don't crash; if the input isn't even a recognized spec, the
 * caller's existing `try/catch` falls back to `String(value)`.
 */

const SI_PREFIXES = [
  { exp: 24, suffix: "Y" },
  { exp: 21, suffix: "Z" },
  { exp: 18, suffix: "E" },
  { exp: 15, suffix: "P" },
  { exp: 12, suffix: "T" },
  { exp: 9, suffix: "G" },
  { exp: 6, suffix: "M" },
  { exp: 3, suffix: "k" },
  { exp: 0, suffix: "" },
  { exp: -3, suffix: "m" },
  { exp: -6, suffix: "µ" },
  { exp: -9, suffix: "n" },
  { exp: -12, suffix: "p" },
  { exp: -15, suffix: "f" },
  { exp: -18, suffix: "a" },
  { exp: -21, suffix: "z" },
  { exp: -24, suffix: "y" },
]

interface FormatSpec {
  comma: boolean
  precision: number | null
  trim: boolean
  type: string
}

function parseSpec(spec: string): FormatSpec | null {
  // Pattern matches: [,][.precision][~][type]
  // Type is optional; default behaves like `g` with d3's default precision.
  const match = /^(,)?(?:\.(\d+))?(~)?([a-z%])?$/.exec(spec)
  if (!match) return null
  return {
    comma: match[1] === ",",
    precision: match[2] != null ? parseInt(match[2], 10) : null,
    trim: match[3] === "~",
    type: match[4] || "",
  }
}

function trimTrailingZeros(s: string): string {
  // Strip trailing zeros after a decimal, then a trailing decimal
  // point. Leaves `120` alone, turns `1.500` into `1.5`, `1.000`
  // into `1`. Mirrors d3-format's `~` semantics.
  if (!s.includes(".")) return s
  return s.replace(/\.?0+$/, "")
}

function applyGrouping(s: string): string {
  // Insert thousands separators in the integer part of `s`. Keeps
  // negative sign and decimal/fraction parts untouched.
  const negative = s.startsWith("-")
  const body = negative ? s.slice(1) : s
  const dotIdx = body.indexOf(".")
  const intPart = dotIdx === -1 ? body : body.slice(0, dotIdx)
  const fracPart = dotIdx === -1 ? "" : body.slice(dotIdx)
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return (negative ? "-" : "") + grouped + fracPart
}

function formatFixed(value: number, precision: number, comma: boolean, trim: boolean): string {
  let s = value.toFixed(precision)
  if (trim) s = trimTrailingZeros(s)
  if (comma) s = applyGrouping(s)
  return s
}

function formatPercent(value: number, precision: number, comma: boolean, trim: boolean): string {
  let s = (value * 100).toFixed(precision)
  if (trim) s = trimTrailingZeros(s)
  if (comma) s = applyGrouping(s)
  return s + "%"
}

function formatExponential(value: number, precision: number, trim: boolean): string {
  // toExponential(p) gives p digits after the decimal in mantissa,
  // matching d3-format's `e` type (precision = mantissa-digits).
  // JS's toExponential already matches d3's lowercase, unpadded exponent
  // (`1.0e+3`, `1.20e-4`).
  const s = value.toExponential(precision)
  // `~` trims trailing zeros from the mantissa only.
  return trim ? s.replace(/\.?0+e/, "e") : s
}

function formatRounded(value: number, precision: number, comma: boolean, trim: boolean): string {
  // d3's `r` type rounds to `precision` significant digits.
  // toPrecision throws on precision=0 — clamp to 1 so a malformed
  // `.0r` spec degrades to "round to 1 sig-fig" rather than crashing.
  const safe = Math.max(1, precision)
  if (value === 0) {
    // For zero, render a fixed-point representation that respects
    // sig-fig intent: precision=1 → "0", precision=3 → "0.00".
    let s = safe > 1 ? value.toFixed(safe - 1) : "0"
    if (trim) s = trimTrailingZeros(s)
    if (comma) s = applyGrouping(s)
    return s
  }
  let s = value.toPrecision(safe)
  // toPrecision can return exponential for very small/large numbers;
  // d3's `r` always renders fixed-point. Convert by widening.
  if (s.includes("e")) {
    s = Number(s).toString()
  }
  if (trim) s = trimTrailingZeros(s)
  if (comma) s = applyGrouping(s)
  return s
}

/**
 * `x.toExponential(p - 1)` split into its significant digits (no decimal
 * point) and exponent, as d3-format's `formatDecimalParts`. `p` of 0 keeps
 * every digit.
 */
function decimalParts(x: number, p: number): [string, number] {
  const s = p ? x.toExponential(p - 1) : x.toExponential()
  const e = s.indexOf("e")
  const coefficient = s.slice(0, e)
  return [coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient, Number(s.slice(e + 1))]
}

function formatSI(value: number, precision: number, trim: boolean): string {
  // SI prefix, as d3-format's `formatPrefixAuto`: round to `precision`
  // significant digits first, then pick the prefix from the rounded
  // exponent, so 999 999 at `.3s` reads `1.00M` rather than `1000k`.
  // Clamp to ≥ 1 so a malformed `.0s` spec doesn't crash toExponential.
  const safe = Math.max(1, precision)
  if (value === 0) return safe > 1 ? "0." + "0".repeat(safe - 1) : "0"
  const abs = Math.abs(value)
  const [coefficient, exponent] = decimalParts(abs, safe)
  const prefixExp = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3
  const prefix = SI_PREFIXES.find((p) => p.exp === prefixExp) ?? SI_PREFIXES[8]
  // Digits before the decimal point once scaled by the prefix.
  const i = exponent - prefixExp + 1
  const n = coefficient.length
  let s = i === n ? coefficient
    : i > n ? coefficient + "0".repeat(i - n)
      : i > 0 ? `${coefficient.slice(0, i)}.${coefficient.slice(i)}`
        : `0.${"0".repeat(-i)}${decimalParts(abs, Math.max(0, safe + i - 1))[0]}`
  if (trim) s = trimTrailingZeros(s)
  return (value < 0 ? "-" : "") + s + prefix.suffix
}

function formatGeneral(value: number, precision: number, comma: boolean, trim: boolean): string {
  // d3's `g` type chooses between exponential and fixed based on
  // whether the number's exponent fits within ±precision. JS's
  // toPrecision approximates this well enough for chart labels.
  // Clamp to ≥ 1 so a malformed `.0g` spec doesn't crash toPrecision.
  const safe = Math.max(1, precision)
  let s = value.toPrecision(safe)
  if (s.includes("e")) {
    s = formatExponential(value, Math.max(0, safe - 1), trim)
  } else {
    if (trim) s = trimTrailingZeros(s)
    if (comma) s = applyGrouping(s)
  }
  return s
}

/**
 * Build a number formatter from a d3-format-style spec string.
 * Mirrors `d3.format(spec)`: returns `(value: number) => string`.
 *
 * **Throws on unparseable specs and unimplemented types.** This
 * matches d3's contract — the existing `try/catch` in
 * `formatUtils.formatNumber` (and any consumer code that wraps a
 * `format(spec)` call) catches the throw and falls back to
 * `String(value)`. Earlier shim revisions silently fell back to
 * `Intl.NumberFormat`, which (a) suppressed bad-input errors that
 * the outer fallback was designed to handle, and (b) reintroduced a
 * runtime-locale dependency that would shift output across CI runners
 * and SSR snapshot baselines.
 */
export function format(spec: string): (value: number) => string {
  const parsed = parseSpec(spec)
  if (!parsed) {
    throw new Error(
      `Unsupported number format spec: "${spec}". Recognized form is ` +
        `[,][.precision][~][type] with type ∈ {f, %, e, d, s, r, g}.`,
    )
  }

  const { comma, precision, trim, type } = parsed

  switch (type) {
    case "f": {
      const p = precision ?? 6
      return (v: number) => formatFixed(v, p, comma, trim)
    }
    case "%": {
      const p = precision ?? 0
      return (v: number) => formatPercent(v, p, comma, trim)
    }
    case "e": {
      const p = precision ?? 6
      return (v: number) => formatExponential(v, p, trim)
    }
    case "d": {
      // d3's `d` ignores precision; emits integer with optional grouping.
      return (v: number) => {
        // At 1e21 and above toString switches to exponent form; d3 writes
        // every digit so grouping still applies.
        const rounded = Math.round(v)
        const s = Math.abs(rounded) >= 1e21
          ? rounded.toLocaleString("en").replace(/,/g, "")
          : rounded.toString()
        return comma ? applyGrouping(s) : s
      }
    }
    case "s": {
      const p = precision ?? 6
      return (v: number) => formatSI(v, p, trim)
    }
    case "r": {
      const p = precision ?? 6
      return (v: number) => formatRounded(v, p, comma, trim)
    }
    case "g": {
      const p = precision ?? 6
      return (v: number) => formatGeneral(v, p, comma, trim)
    }
    case "": {
      // d3 with no type is a trimmed `g` at precision 12, so `,` groups
      // 1234567.891 as "1,234,567.891" and 0.1 + 0.2 reads "0.3".
      const p = precision ?? 12
      return (v: number) => formatGeneral(v, p, comma, true)
    }
    default: {
      throw new Error(
        `Unsupported number format type: "${type}" (full spec: "${spec}"). ` +
          `Recognized types: {f, %, e, d, s, r, g}.`,
      )
    }
  }
}
