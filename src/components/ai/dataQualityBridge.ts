/**
 * Data-quality → provenanced-annotation bridge.
 *
 * Ingests data-quality results — dbt source-freshness + test artifacts, Great
 * Expectations validation results, or a normalized form anyone can hand-build —
 * and maps them to **provenanced, lifecycled chart annotations**. A failed dbt
 * freshness check becomes a danger threshold on the chart that says *who* found
 * it (a system rule), *how* (a freshness rule), *when*, and against *which data
 * snapshot* — so the chart's communicative act flips from report to alert,
 * driven entirely by external metadata.
 *
 * Doctrine this module honors:
 * - Pure, no React, no new dependencies — it shapes plain JSON into the
 *   `Annotated[]` surface that already ships (`withProvenance` + the lifecycle
 *   helpers do the rest).
 * - **Read-only overlay.** It consumes a data-quality system's output and never
 *   writes back into it. Clicking the chart does not trigger a dbt run.
 * - **Refuse rather than mistranslate.** A check with no faithful chart
 *   coordinate (a `not_null` test, a uniqueness expectation) is NOT given a
 *   fabricated position — it is returned in `unplaced[]` with a reason, so the
 *   30% an adapter can't place is announced rather than hidden.
 *
 * The data-quality system owns query execution, governance, and the test
 * definitions; this bridge owns only the visual overlay and its provenance.
 */
import type { Datum } from "../charts/shared/datumTypes"
import type {
  AnnotationAnchor,
  AnnotationBasis,
  AnnotationStatus,
  Annotated,
} from "./annotationProvenance"
import { withProvenance } from "./annotationProvenance"

// ── Normalized input model ───────────────────────────────────────────────────

export type DataQualityStatus = "pass" | "fail" | "warn" | "error"

/**
 * How a check relates to a chart. Only the kinds with a clear visual analog
 * produce an annotation; the rest are reported as `unplaced`.
 */
export type DataQualityCheckKind =
  | "range" // value should fall within [min, max] → band
  | "min" // value should be ≥ min → threshold
  | "max" // value should be ≤ max → threshold
  | "threshold" // a single reference value → threshold
  | "freshness" // data fresh as of a deadline → time threshold
  | "not-null"
  | "unique"
  | "accepted-values"
  | "row-condition"
  | "custom"

/**
 * A single data-quality result, normalized across source systems. The dbt and
 * Great-Expectations parsers produce these; consumers can also hand-build them
 * (e.g. to bridge Monte Carlo or a bespoke checker).
 */
export interface DataQualityResult {
  /** Stable id of the check (test/expectation id). Becomes provenance.stableId. */
  id: string
  /** Human-readable check name; falls back to id. Doubles as the provenance author. */
  name?: string
  /** Concise phrase drawn on the chart. Falls back to `name`. Keep it short. */
  label?: string
  status: DataQualityStatus
  kind: DataQualityCheckKind
  /** Column/field the check applies to (mapped through `fieldMap`). */
  column?: string
  /** Lower bound (range/min). */
  min?: number
  /** Upper bound (range/max). */
  max?: number
  /** Single reference value (threshold/min/max). */
  value?: number
  /** Freshness deadline or observed event time (ISO string or epoch ms). */
  at?: string | number
  /** Free-form detail surfaced in the label. */
  message?: string
  /** Source system. */
  source?: "dbt" | "great-expectations" | (string & {})
  /** Evidence type. Defaults to "rule" (deterministic constraint). */
  basis?: AnnotationBasis
  /** 0–1; surfaced in the label only when < 1 (a hard rule needs no percent). */
  confidence?: number
  /** ISO timestamp the check ran. */
  createdAt?: string
  /** Data snapshot id (dbt invocation_id, GE run id). */
  dataVersion?: string
  /** Failing-row count etc., surfaced in the label. */
  observedCount?: number
}

export interface DataQualityAnnotationOptions {
  /** Map normalized column names → chart accessor field names. */
  fieldMap?: Record<string, string>
  /** Which axis numeric thresholds map onto. Default "y". (Ranges always band on y.) */
  valueAxis?: "x" | "y"
  /** TTL applied to every generated annotation's lifecycle — drives freshness decay. */
  ttlHint?: string | number
  /** Surface passing checks too (default false — only failures/warnings overlay). */
  includePassed?: boolean
  /** Editorial status stamped on generated notes. Default "proposed". */
  status?: AnnotationStatus
  /** Anchor mode. Default "semantic" so notes re-resolve through stableId on refresh. */
  anchor?: AnnotationAnchor
  /** Color for failing/erroring checks. Default CSS var --semiotic-danger. */
  failColor?: string
  /** Color for warnings. Default CSS var --semiotic-warning. */
  warnColor?: string
  /** Color for passing checks (only used when includePassed). Default --semiotic-success. */
  passColor?: string
}

/** A result the bridge declined to place, with the reason (the D7 honesty surface). */
export interface UnplacedDataQualityResult {
  result: DataQualityResult
  reason: string
}

export interface DataQualityAnnotationsResult {
  /** Annotations ready to pass to a chart's `annotations` prop. */
  annotations: Annotated<Datum>[]
  /** Results with no faithful chart coordinate, each with a reason. */
  unplaced: UnplacedDataQualityResult[]
}

// ── Core: normalized results → annotations ───────────────────────────────────

const DEFAULTS = {
  failColor: "var(--semiotic-danger)",
  warnColor: "var(--semiotic-warning)",
  passColor: "var(--semiotic-success)",
}

function toEpoch(at: string | number): number | undefined {
  if (typeof at === "number") return at
  const parsed = Date.parse(at)
  return Number.isNaN(parsed) ? undefined : parsed
}

function colorFor(status: DataQualityStatus, opts: DataQualityAnnotationOptions): string {
  if (status === "pass") return opts.passColor ?? DEFAULTS.passColor
  if (status === "warn") return opts.warnColor ?? DEFAULTS.warnColor
  return opts.failColor ?? DEFAULTS.failColor
}

/** Friendly short date for a timestamp (ISO or epoch ms); undefined if unparseable. */
function formatWhen(at: string | number | undefined): string | undefined {
  if (at == null) return undefined
  const ms = typeof at === "number" ? at : Date.parse(at)
  if (Number.isNaN(ms)) return undefined
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

/**
 * The concise text drawn on the chart. Prefers an explicit `label` (a short,
 * human-readable phrase the parser composed) over the `name` (which doubles as
 * the provenance author and may be more formal). Only confidence is appended,
 * and only when it's a non-deterministic claim (< 1) — a reader wants to see
 * "70%" on an AI/statistical flag, but "100%" on a hard rule is noise. Verbose
 * detail (full timestamps, observed counts, expectation ids) stays in
 * `provenance`/`message`, not on the chart.
 */
function labelFor(result: DataQualityResult): string {
  const base = result.label ?? result.name ?? result.id
  if (typeof result.confidence === "number" && result.confidence < 1) {
    return `${base} · ${Math.round(result.confidence * 100)}%`
  }
  return base
}

function provenanceFor(result: DataQualityResult) {
  return {
    author: result.name ?? result.id,
    authorKind: "system" as const,
    source: result.source,
    basis: result.basis ?? ("rule" as AnnotationBasis),
    confidence: result.confidence,
    createdAt: result.createdAt,
    dataVersion: result.dataVersion,
    stableId: result.id,
  }
}

/**
 * Map normalized data-quality results to provenanced annotations. The pure core
 * both the dbt and Great-Expectations parsers funnel through; call it directly
 * to bridge any other checker.
 */
export function dataQualityToAnnotations(
  results: ReadonlyArray<DataQualityResult>,
  options: DataQualityAnnotationOptions = {}
): DataQualityAnnotationsResult {
  const annotations: Annotated<Datum>[] = []
  const unplaced: UnplacedDataQualityResult[] = []
  const axis = options.valueAxis ?? "y"
  const status = options.status ?? "proposed"
  const anchor = options.anchor ?? "semantic"

  const lifecycle = {
    status,
    anchor,
    ...(options.ttlHint !== undefined ? { ttlHint: options.ttlHint } : {}),
  }

  for (const result of results) {
    if (result.status === "pass" && !options.includePassed) continue

    const color = colorFor(result.status, options)
    const label = labelFor(result)
    const blocks = { provenance: provenanceFor(result), lifecycle }

    const decline = (reason: string) => unplaced.push({ result, reason })
    const push = (annotation: Datum) => annotations.push(withProvenance(annotation, blocks))

    switch (result.kind) {
      case "range": {
        if (typeof result.min !== "number" || typeof result.max !== "number") {
          decline("range check is missing numeric min/max bounds")
          break
        }
        // band is a horizontal (y) shaded region; the field is implied by the
        // chart's yAccessor. fail/warn paints the band in its status color.
        push({ type: "band", y0: result.min, y1: result.max, fill: color, fillOpacity: 0.12, color, label })
        break
      }
      case "min":
      case "max":
      case "threshold": {
        const value = result.value ?? (result.kind === "min" ? result.min : result.max)
        if (typeof value !== "number") {
          decline(`${result.kind} check is missing a numeric value`)
          break
        }
        push({ type: axis === "x" ? "x-threshold" : "y-threshold", value, label, color })
        break
      }
      case "freshness": {
        const epoch = result.at !== undefined ? toEpoch(result.at) : undefined
        if (epoch === undefined) {
          decline("freshness check has no parseable timestamp (`at`); render as a chart-level status badge")
          break
        }
        // Freshness is a moment on the time (x) axis.
        push({ type: "x-threshold", value: epoch, label, color })
        break
      }
      default: {
        // not-null / unique / accepted-values / row-condition / custom — these
        // assert a property of a column with no single chart coordinate. Refuse
        // to fabricate a position; hand it back so the host can render it as a
        // chart-level badge or a row-level highlight it has the context to place.
        decline(
          `${result.kind} check on "${result.column ?? "?"}" has no single chart coordinate; ` +
            "surface it as a chart-level status badge or a row-level mark in your UI"
        )
      }
    }
  }

  return { annotations, unplaced }
}

// ── dbt parser ───────────────────────────────────────────────────────────────

/** Subset of a dbt artifact's `metadata` block we read. */
interface DbtMetadata {
  generated_at?: string
  invocation_id?: string
}

/** A `sources.json` (source-freshness) result entry. */
interface DbtFreshnessResult {
  unique_id?: string
  status?: string // "pass" | "warn" | "error" | "runtime error"
  max_loaded_at?: string
  snapshotted_at?: string
  criteria?: {
    warn_after?: { count?: number; period?: string }
    error_after?: { count?: number; period?: string }
  }
}

/** A `run_results.json` result entry (we read the test-relevant fields). */
interface DbtRunResult {
  unique_id?: string
  status?: string // tests: "pass" | "fail" | "warn" | "error" | "skipped"
  failures?: number | null
  message?: string | null
}

export interface DbtArtifacts {
  /** Parsed `sources.json` (dbt source freshness). */
  sources?: { metadata?: DbtMetadata; results?: ReadonlyArray<DbtFreshnessResult> }
  /** Parsed `run_results.json`. */
  runResults?: { metadata?: DbtMetadata; results?: ReadonlyArray<DbtRunResult> }
}

function dbtStatus(raw?: string): DataQualityStatus {
  switch (raw) {
    case "pass":
      return "pass"
    case "warn":
      return "warn"
    case "fail":
      return "fail"
    default:
      return "error" // "error" | "runtime error" | "skipped" | unknown
  }
}

function shortName(uniqueId?: string): string {
  if (!uniqueId) return "dbt check"
  const parts = uniqueId.split(".")
  return parts[parts.length - 1] || uniqueId
}

/**
 * Map dbt artifacts to provenanced annotations. The strongest mapping is source
 * freshness (`sources.json`) — a real timestamp + status becomes a time
 * threshold. Test results (`run_results.json`) carry pass/fail but not, without
 * `manifest.json`, the column/range semantics needed to place them; those land
 * in `unplaced[]` with a reason (D7).
 */
export function fromDbtArtifacts(
  artifacts: DbtArtifacts,
  options: DataQualityAnnotationOptions = {}
): DataQualityAnnotationsResult {
  const results: DataQualityResult[] = []

  const freshness = artifacts.sources
  if (freshness?.results) {
    const createdAt = freshness.metadata?.generated_at
    const dataVersion = freshness.metadata?.invocation_id
    for (const r of freshness.results) {
      const status = dbtStatus(r.status)
      const name = shortName(r.unique_id)
      const when = formatWhen(r.max_loaded_at)
      results.push({
        id: r.unique_id ?? name,
        name: `dbt freshness: ${name}`,
        // Short, plain phrase: "transactions stale since Jun 18".
        label:
          status === "pass"
            ? `${name} fresh`
            : `${name} stale${when ? ` since ${when}` : ""}`,
        status,
        kind: "freshness",
        at: r.max_loaded_at,
        message: `freshness ${status}${r.max_loaded_at ? ` — last load ${r.max_loaded_at}` : ""}`,
        source: "dbt",
        basis: "rule",
        createdAt,
        dataVersion,
      })
    }
  }

  const runResults = artifacts.runResults
  if (runResults?.results) {
    const createdAt = runResults.metadata?.generated_at
    const dataVersion = runResults.metadata?.invocation_id
    for (const r of runResults.results) {
      const status = dbtStatus(r.status)
      if (status === "pass" && !options.includePassed) continue
      const name = shortName(r.unique_id)
      results.push({
        id: r.unique_id ?? name,
        name: `dbt test · ${name}`,
        status,
        // run_results alone lacks the column/range semantics (those live in
        // manifest.json), so these are intentionally non-coordinate "custom"
        // checks — declined into unplaced with a reason rather than mis-placed.
        kind: "custom",
        message: r.message ?? undefined,
        observedCount: typeof r.failures === "number" ? r.failures : undefined,
        source: "dbt",
        basis: "rule",
        createdAt,
        dataVersion,
      })
    }
  }

  return dataQualityToAnnotations(results, options)
}

// ── Great Expectations parser ────────────────────────────────────────────────

interface GEExpectationConfig {
  expectation_type?: string
  kwargs?: {
    column?: string
    min_value?: number | null
    max_value?: number | null
    value?: number | null
    [key: string]: unknown
  }
}

interface GEResultEntry {
  success?: boolean
  expectation_config?: GEExpectationConfig
  result?: { observed_value?: number | string; element_count?: number; unexpected_count?: number }
}

export interface GEValidationResult {
  success?: boolean
  results?: ReadonlyArray<GEResultEntry>
  meta?: { run_id?: { run_name?: string; run_time?: string } | string; [key: string]: unknown }
  statistics?: { evaluated_expectations?: number; successful_expectations?: number }
}

function geRunInfo(meta?: GEValidationResult["meta"]): { createdAt?: string; dataVersion?: string } {
  const runId = meta?.run_id
  if (!runId) return {}
  if (typeof runId === "string") return { dataVersion: runId }
  return { createdAt: runId.run_time, dataVersion: runId.run_name ?? runId.run_time }
}

/** Number of decimals to keep when surfacing an observed numeric value. */
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

/** Turn a GE expectation_type into a short human phrase ("…to_be_between" → "between"). */
function friendlyExpectation(type: string): string {
  const t = type
    .replace(/^expect_/, "")
    .replace(/column_values_to_be_|column_values_to_|column_|to_be_|to_/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return t || type
}

/**
 * Map a Great Expectations validation result to provenanced annotations.
 * Range expectations (`expect_*_to_be_between`) become bands; single-bound
 * expectations become thresholds. Set/uniqueness/null expectations have no
 * single chart coordinate and are returned in `unplaced[]`. GE expectations are
 * statistical assertions, so `basis` defaults to "statistical-test".
 */
export function fromGreatExpectations(
  validation: GEValidationResult,
  options: DataQualityAnnotationOptions = {}
): DataQualityAnnotationsResult {
  const { createdAt, dataVersion } = geRunInfo(validation.meta)
  const results: DataQualityResult[] = []

  for (const [i, entry] of (validation.results ?? []).entries()) {
    const cfg = entry.expectation_config ?? {}
    const type = cfg.expectation_type ?? "unknown_expectation"
    const kwargs = cfg.kwargs ?? {}
    const column = kwargs.column
    const status: DataQualityStatus = entry.success ? "pass" : "fail"
    const min = num(kwargs.min_value)
    const max = num(kwargs.max_value)
    const single = num(kwargs.value)
    const observed = num(entry.result?.observed_value)

    const col = column ?? "value"
    const friendly = friendlyExpectation(type)
    const obs = observed !== undefined ? `${col}: ${observed} ` : ""
    const base = {
      id: `ge:${type}:${column ?? i}`,
      // `name` is the formal identity (provenance author); `label` is the short
      // observed-vs-expected phrase drawn on the chart.
      name: `GE ${friendly}${column ? ` (${column})` : ""}`,
      status,
      column,
      message: observed !== undefined ? `observed ${observed}` : undefined,
      observedCount: entry.result?.unexpected_count,
      source: "great-expectations" as const,
      basis: "statistical-test" as AnnotationBasis,
      createdAt,
      dataVersion,
    }

    const isBetween = /_to_be_between$/.test(type)
    if (isBetween && min !== undefined && max !== undefined) {
      // "value: 210 (expected 800–1200)"
      results.push({ ...base, kind: "range", min, max, label: `${obs}(expected ${min}–${max})` })
    } else if (isBetween && min !== undefined) {
      results.push({ ...base, kind: "min", value: min, label: `${obs}(min ${min})` })
    } else if (isBetween && max !== undefined) {
      results.push({ ...base, kind: "max", value: max, label: `${obs}(max ${max})` })
    } else if (single !== undefined) {
      results.push({ ...base, kind: "threshold", value: single, label: `${obs}(target ${single})` })
    } else {
      // set / null / uniqueness / regex etc. — assert a column property with no
      // single chart coordinate.
      results.push({ ...base, kind: "custom", label: `${col} ${friendly}` })
    }
  }

  return dataQualityToAnnotations(results, options)
}
