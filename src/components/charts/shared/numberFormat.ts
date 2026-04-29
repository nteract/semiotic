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
 *     and exponential), or omitted (treated as `g` with default
 *     precision, matching d3).
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
  let s = value.toExponential(precision)
  if (trim) {
    // Trim trailing zeros from mantissa only.
    s = s.replace(/\.?0+e/, "e")
    // d3's `~` also strips the leading zero of a single-digit exponent
    // — emits `e+0` not `e+00`. JS's toExponential already gives the
    // unpadded form (`e+0`), so leave it alone in trim mode.
    return s
  }
  // d3 uses lowercase `e` and a 2-digit exponent like `1.0e+3`. JS's
  // toExponential matches `e±d+`; widen to 2 digits when single-digit.
  s = s.replace(/e([+-])(\d)$/, "e$10$2")
  return s
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

function formatSI(value: number, precision: number, trim: boolean): string {
  // SI prefix: divide by the largest 10^(3k) ≤ |value|, append
  // suffix. d3's precision = significant digits in the mantissa.
  // Clamp to ≥ 1 so a malformed `.0s` spec doesn't crash toPrecision.
  const safe = Math.max(1, precision)
  if (value === 0) return safe > 1 ? "0." + "0".repeat(safe - 1) : "0"
  const abs = Math.abs(value)
  const e = Math.floor(Math.log10(abs))
  const prefix = SI_PREFIXES.find((p) => e >= p.exp) || SI_PREFIXES[SI_PREFIXES.length - 1]
  const mantissa = value / Math.pow(10, prefix.exp)
  let s = mantissa.toPrecision(safe)
  if (s.includes("e")) s = Number(s).toString()
  if (trim) s = trimTrailingZeros(s)
  return s + prefix.suffix
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
        const s = Math.round(v).toString()
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
    case "g":
    case "": {
      // d3 default (no type) is `g` with precision 6.
      const p = precision ?? 6
      return (v: number) => formatGeneral(v, p, comma, trim)
    }
    default: {
      throw new Error(
        `Unsupported number format type: "${type}" (full spec: "${spec}"). ` +
          `Recognized types: {f, %, e, d, s, r, g}.`,
      )
    }
  }
}
