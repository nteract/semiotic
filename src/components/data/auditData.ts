import type { Datum } from "../charts/shared/datumTypes"
import type { Diagnosis } from "../charts/shared/diagnoseTypes"
import { parseDateLikeString } from "../charts/shared/temporalStrings"
import {
  explicitEmptyNumericSources,
  rowsForNumericField,
} from "./dataAuditSources"
import {
  getNumericContracts,
  type NumericAggregateContract,
  type NumericContracts,
  type NumericFieldContract,
  type NumericFieldRole,
  type NumericRequirement,
} from "./numericContracts"
import { quantile } from "./numericFieldProfiler"

const MAX_AFFECTED_ROWS = 5

type Accessor = string | ((datum: Datum, index: number) => unknown)

export interface DataAuditDiagnosis extends Diagnosis {
  readonly domain: "data"
  readonly field?: string
  readonly role?: NumericFieldRole
  /** Bounded, zero-based row indices; `count` carries the full total. */
  readonly rows?: ReadonlyArray<number>
  readonly count?: number
}

export interface CheckedNumericContract {
  readonly role: NumericFieldRole
  readonly accessor: string
  readonly dataProp: string
  readonly requirements: ReadonlyArray<NumericRequirement>
  readonly allowMissing: boolean
  readonly missingValue?: number
  readonly domain: boolean
}

export interface DataAuditResult {
  readonly component: string
  readonly ok: boolean
  readonly rowCount: number
  readonly summary: {
    readonly fieldsChecked: number
    readonly errors: number
    readonly warnings: number
  }
  readonly contracts: ReadonlyArray<CheckedNumericContract>
  readonly diagnoses: ReadonlyArray<DataAuditDiagnosis>
}

export interface AuditDataOptions {
  /** Override the registered/built-in contract (useful for one-off custom charts). */
  readonly contracts?: NumericContracts
  /** Disable the conservative, 10×IQR scale-domination warning. */
  readonly checkOutliers?: boolean
}

interface NumericObservation {
  readonly field: string
  readonly numbers: number[]
  readonly finiteRows: number[]
  readonly missingRows: number[]
  readonly nonFiniteRows: number[]
  readonly nonNumericRows: number[]
  readonly accessorErrorRows: number[]
}

interface ResolvedField {
  readonly contract: NumericFieldContract
  readonly accessor: Accessor
  readonly accessorLabel: string
  readonly dataProp: string
  readonly rows: ReadonlyArray<Datum>
  readonly requirements: ReadonlyArray<NumericRequirement>
  readonly logScale: boolean
  readonly observation: NumericObservation
}

const INFERRED_ACCESSOR_ROLES: Readonly<Record<string, NumericFieldRole>> = {
  xAccessor: "x",
  yAccessor: "y",
  valueAccessor: "value",
  sizeBy: "size",
  sizeAccessor: "size",
  radiusAccessor: "size",
  countAccessor: "count",
  amountAccessor: "value",
  highAccessor: "high",
  lowAccessor: "low",
  openAccessor: "open",
  closeAccessor: "close",
  lowerAccessor: "lower",
  upperAccessor: "upper",
  positiveAccessor: "value",
  negativeAccessor: "value",
  progressAccessor: "value",
  confidenceAccessor: "value",
  costAccessor: "value",
  throughputAccessor: "value",
}

function inferredContracts(props: Datum): NumericContracts | undefined {
  const fields: NumericFieldContract[] = []
  for (const [accessor, role] of Object.entries(INFERRED_ACCESSOR_ROLES)) {
    if (typeof props[accessor] !== "string" && typeof props[accessor] !== "function") {
      continue
    }
    fields.push({
      role,
      accessor,
      ...(role === "size" ? { requirements: ["finite", "non-negative"] as const } : {}),
      ...(role === "x" || role === "y" ? { domain: true } : {}),
    })
  }
  return fields.length > 0 ? { fields } : undefined
}

function accessorValue(
  accessor: Accessor,
  datum: Datum,
  index: number,
): unknown {
  return typeof accessor === "function" ? accessor(datum, index) : datum[accessor]
}

function numericValue(
  value: unknown,
  temporalValues: "date" | "date-like" | undefined,
): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (value instanceof Date) {
    const time = value.getTime()
    return temporalValues && Number.isFinite(time) ? time : null
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    const number = Number(trimmed)
    if (trimmed && Number.isFinite(number)) return number
    if (temporalValues === "date-like") {
      const time = parseDateLikeString(trimmed)
      return Number.isFinite(time) ? time : null
    }
  }
  return null
}

function isExplicitNonFinite(value: unknown): boolean {
  return typeof value === "number" && !Number.isFinite(value)
}

function observe(
  rows: ReadonlyArray<Datum>,
  accessor: Accessor,
  field: string,
  temporalValues: "date" | "date-like" | undefined,
  missingValue?: number,
): NumericObservation {
  const observation: NumericObservation = {
    field,
    numbers: [],
    finiteRows: [],
    missingRows: [],
    nonFiniteRows: [],
    nonNumericRows: [],
    accessorErrorRows: [],
  }

  for (let index = 0; index < rows.length; index++) {
    let value: unknown
    try {
      value = accessorValue(accessor, rows[index], index)
    } catch {
      observation.accessorErrorRows.push(index)
      continue
    }

    const missing = value == null || value === ""
    if (missing && missingValue === undefined) {
      observation.missingRows.push(index)
      continue
    }
    const number = missing ? missingValue! : numericValue(value, temporalValues)
    if (number == null) {
      if (isExplicitNonFinite(value)) observation.nonFiniteRows.push(index)
      else observation.nonNumericRows.push(index)
      continue
    }

    observation.numbers.push(number)
    observation.finiteRows.push(index)
  }

  return observation
}

function requirementSet(
  field: NumericFieldContract,
  props: Datum,
): ReadonlyArray<NumericRequirement> {
  const requirements = new Set<NumericRequirement>(field.requirements ?? ["finite"])
  requirements.add("finite")
  if (
    (field.role === "x" && props.xScaleType === "log") ||
    (field.role === "y" && props.yScaleType === "log")
  ) {
    requirements.add("positive")
  }
  return [...requirements]
}

function numericExtent(values: ReadonlyArray<number>): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (value < min) min = value
    if (value > max) max = value
  }
  return [min, max]
}

function resolveFields(
  contracts: NumericContracts,
  props: Datum,
  data: ReadonlyArray<Datum> | undefined,
): ResolvedField[] {
  const out: ResolvedField[] = []
  const seen = new Set<string>()
  for (const contract of contracts.fields) {
    if (contract.whenProps?.some((prop) => props[prop] == null)) continue
    const configured = props[contract.accessor]
    const accessor =
      typeof configured === "string" || typeof configured === "function"
        ? configured
        : contract.defaultAccessor
    if (typeof accessor !== "string" && typeof accessor !== "function") continue

    const { dataProp, rows } = rowsForNumericField(contract, props, data)
    if (rows.length === 0) continue
    const accessorLabel =
      typeof accessor === "string" ? accessor : `${contract.accessor}()`
    const key = `${dataProp}:${contract.role}:${accessorLabel}`
    if (seen.has(key)) continue
    seen.add(key)
    const temporalValues =
      contract.temporalValues ??
      (contract.role === "time" ||
      (contract.role === "x" && props.xScaleType === "time")
        ? "date-like"
        : undefined)
    const logScale =
      (contract.role === "x" && props.xScaleType === "log") ||
      (contract.role === "y" && props.yScaleType === "log")
    const requirements = requirementSet(contract, props)
    out.push({
      contract,
      accessor,
      accessorLabel,
      dataProp,
      rows,
      requirements,
      logScale,
      observation: observe(
        rows,
        accessor,
        accessorLabel,
        temporalValues,
        contract.missingValue,
      ),
    })
  }
  return out
}

function bounded(rows: ReadonlyArray<number>): number[] {
  return rows.slice(0, MAX_AFFECTED_ROWS)
}

function rowEvidence(rows: ReadonlyArray<number>) {
  return { rows: bounded(rows), count: rows.length }
}

function diagnosis(
  value: Omit<DataAuditDiagnosis, "domain">,
): DataAuditDiagnosis {
  return { domain: "data", ...value }
}

function outlierRows(field: ResolvedField): number[] {
  const pairs = field.observation.numbers
    .map((value, index) => ({ value, row: field.observation.finiteRows[index] }))
    .sort((a, b) => a.value - b.value)
  if (pairs.length < 8) return []
  const values = pairs.map((pair) => pair.value)
  const q1 = quantile(values, 0.25)!
  const q3 = quantile(values, 0.75)!
  const median = quantile(values, 0.5)!
  const iqr = q3 - q1

  if (iqr > 0) {
    const low = q1 - 10 * iqr
    const high = q3 + 10 * iqr
    return pairs
      .filter((pair) => pair.value < low || pair.value > high)
      .map((pair) => pair.row)
  }

  const threshold = Math.max(1, Math.abs(median)) * 100
  return pairs
    .filter((pair) => Math.abs(pair.value - median) > threshold)
    .map((pair) => pair.row)
}

function rowCountText(count: number): string {
  return `${count} row${count === 1 ? "" : "s"}`
}

function fieldDiagnoses(
  field: ResolvedField,
  checkOutliers: boolean,
): DataAuditDiagnosis[] {
  const out: DataAuditDiagnosis[] = []
  const { observation, contract, accessorLabel, requirements } = field
  const base = { field: accessorLabel, role: contract.role }
  const invalidRows = [
    ...observation.nonFiniteRows,
    ...observation.nonNumericRows,
    ...observation.accessorErrorRows,
  ].sort((a, b) => a - b)

  if (observation.numbers.length === 0) {
    out.push(
      diagnosis({
        severity: "error",
        code: "DEGENERATE_EXTENT",
        message: `The ${contract.role} input needs a finite value from "${accessorLabel}". None of the ${rowCountText(field.rows.length)} supplied one.`,
        fix: `Ensure ${accessorLabel} contains finite numbers${contract.role === "x" ? " (or valid dates for a time scale)" : ""}.`,
        ...base,
        ...(invalidRows.length > 0 ? rowEvidence(invalidRows) : {}),
      }),
    )
    return out
  }

  if (observation.nonFiniteRows.length > 0) {
    out.push(
      diagnosis({
        severity: "error",
        code: "NON_FINITE_VALUE",
        message: `"${accessorLabel}" requires finite values. Found NaN or infinity in ${rowCountText(observation.nonFiniteRows.length)}.`,
        fix: `Filter or replace NaN/Infinity in ${accessorLabel} before rendering.`,
        ...base,
        ...rowEvidence(observation.nonFiniteRows),
      }),
    )
  }

  if (!contract.allowMissing && observation.missingRows.length > 0) {
    out.push(
      diagnosis({
        severity: "error",
        code: "MISSING_NUMERIC_VALUE",
        message: `The ${contract.role} input requires "${accessorLabel}". It is missing in ${rowCountText(observation.missingRows.length)}.`,
        fix: `Fill or filter missing ${accessorLabel} values before rendering.`,
        ...base,
        ...rowEvidence(observation.missingRows),
      }),
    )
  }

  const nonNumericRows = [
    ...observation.nonNumericRows,
    ...observation.accessorErrorRows,
  ].sort((a, b) => a - b)
  if (nonNumericRows.length > 0) {
    out.push(
      diagnosis({
        severity: "error",
        code: "NON_NUMERIC_VALUE",
        message: `The ${contract.role} input requires a number from "${accessorLabel}". Found non-numeric values in ${rowCountText(nonNumericRows.length)}.`,
        fix: `Bind ${contract.accessor} to a numeric field or return finite numbers from the accessor.`,
        ...base,
        ...rowEvidence(nonNumericRows),
      }),
    )
  }

  if (contract.domain && observation.numbers.length >= 2) {
    const [min, max] = numericExtent(observation.numbers)
    if (min === max) {
      out.push(
        diagnosis({
          severity: "warning",
          code: "ZERO_SPAN_DOMAIN",
          message: `The ${contract.role} scale needs variation in "${accessorLabel}" to infer a range. All ${rowCountText(observation.finiteRows.length)} have the value ${min}.`,
          fix: `Provide varying ${contract.role} values, set an explicit extent around ${min}, or use a single-value display.`,
          ...base,
          ...rowEvidence(observation.finiteRows),
        }),
      )
    }
  }

  const rowsWhere = (invalid: (value: number) => boolean) =>
    observation.finiteRows.filter((_, index) => invalid(observation.numbers[index]))

  if (requirements.includes("positive")) {
    const rows = rowsWhere(value => value <= 0)
    if (rows.length > 0) {
      const isLog = field.logScale
      out.push(
        diagnosis({
          severity: "error",
          code: isLog ? "LOG_NON_POSITIVE" : "NON_POSITIVE_VALUE",
          message: `${isLog ? `A log ${contract.role}-axis` : `The ${contract.role} input`} requires "${accessorLabel}" > 0. Found non-positive values in ${rowCountText(rows.length)}.`,
          fix: isLog
            ? `Remove or transform values ≤ 0, or use a linear/symlog scale.`
            : `Provide values greater than zero.`,
          ...base,
          ...rowEvidence(rows),
        }),
      )
    }
  }

  const negativeRows = requirements.includes("non-negative") ? rowsWhere(value => value < 0) : []
  if (negativeRows.length > 0) {
    out.push(
      diagnosis({
        severity: "error",
        code: contract.role === "size" ? "NEGATIVE_SIZE" : "NEGATIVE_VALUE",
        message: `The ${contract.role} input requires "${accessorLabel}" ≥ 0. Found negative values in ${rowCountText(negativeRows.length)}.`,
        fix: `Use a non-negative measure, clamp intentionally, or encode sign with position/color instead.`,
        ...base,
        ...rowEvidence(negativeRows),
      }),
    )
  }

  if (requirements.includes("integer")) {
    const invalid = rowsWhere(value => value < 1 || !Number.isInteger(value))
    if (invalid.length > 0) {
      out.push(
        diagnosis({
          severity: "error",
          code: "INVALID_COUNT",
          message: `"${accessorLabel}" requires positive integers. Found invalid counts in ${rowCountText(invalid.length)}.`,
          fix: `Counts must be integers ≥ 1; aggregate, round intentionally, or use a continuous-value encoding.`,
          ...base,
          ...rowEvidence(invalid),
        }),
      )
    }
  }

  if (requirements.includes("unit-interval")) {
    const rows = rowsWhere(value => value < 0 || value > 1)
    if (rows.length > 0) {
      out.push(
        diagnosis({
          severity: "error",
          code: "OUTSIDE_UNIT_INTERVAL",
          message: `"${accessorLabel}" must be within [0, 1]. Found out-of-range values in ${rowCountText(rows.length)}.`,
          fix: `Normalize ${accessorLabel} to [0, 1] before using it as ${contract.role}.`,
          ...base,
          ...rowEvidence(rows),
        }),
      )
    }
  }

  if (checkOutliers && contract.domain) {
    const rows = outlierRows(field)
    if (rows.length > 0) {
      out.push(
        diagnosis({
          severity: "warning",
          code: "OUTLIER_DOMINATED_DOMAIN",
          message: `${accessorLabel} has ${rows.length} extreme value${rows.length === 1 ? "" : "s"} beyond the 10×IQR guardrail; the main distribution may collapse visually.`,
          fix: `Verify the extreme values, then consider a log scale, robust extent, inset, or explicit annotation rather than silently clipping them.`,
          ...base,
          ...rowEvidence(rows),
        }),
      )
    }
  }

  return out
}

function groupKey(
  accessor: Accessor | undefined,
  row: Datum,
  index: number,
): string {
  if (!accessor) return "__all__"
  try {
    return String(accessorValue(accessor, row, index))
  } catch {
    return "__accessor_error__"
  }
}

function aggregateDiagnoses(
  aggregate: NumericAggregateContract,
  fields: ReadonlyArray<ResolvedField>,
  props: Datum,
): DataAuditDiagnosis[] {
  if (aggregate.whenProp && props[aggregate.whenProp] !== true) return []
  const field = fields.find((candidate) => candidate.contract.role === aggregate.role)
  if (!field || field.observation.numbers.length === 0) return []

  const configuredGroup = aggregate.groupAccessor
    ? props[aggregate.groupAccessor]
    : undefined
  const groupAccessor: Accessor | undefined =
    typeof configuredGroup === "string" || typeof configuredGroup === "function"
      ? configuredGroup
      : aggregate.defaultGroupAccessor

  const groups = new Map<
    string,
    {
      sum: number
      magnitude: number
      positive: boolean
      negative: boolean
      rows: number[]
      negativeRows: number[]
    }
  >()
  for (let index = 0; index < field.rows.length; index++) {
    let raw: unknown
    try {
      raw = accessorValue(field.accessor, field.rows[index], index)
    } catch {
      continue
    }
    const value = numericValue(raw, undefined)
    if (value == null) continue
    const key = groupKey(groupAccessor, field.rows[index], index)
    const current = groups.get(key) ?? {
      sum: 0,
      magnitude: 0,
      positive: false,
      negative: false,
      rows: [],
      negativeRows: [],
    }
    current.sum += value
    current.magnitude += Math.abs(value)
    current.positive ||= value > 0
    current.negative ||= value < 0
    current.rows.push(index)
    if (value < 0) current.negativeRows.push(index)
    groups.set(key, current)
  }

  const zeroGroups: string[] = []
  const mixedGroups: string[] = []
  const negativeGroups: string[] = []
  const zeroRows: number[] = []
  const mixedRows: number[] = []
  const negativeRows: number[] = []
  for (const [key, group] of groups) {
    const nearZero =
      Math.abs(group.sum) <= Number.EPSILON * Math.max(1, group.magnitude) * 10
    if (
      (aggregate.kind === "positive-total" && group.sum <= 0) ||
      (aggregate.kind === "normalized-total" && nearZero)
    ) {
      zeroGroups.push(key)
      zeroRows.push(...group.rows)
    }
    if (aggregate.kind === "normalized-total" && group.positive && group.negative) {
      mixedGroups.push(key)
      mixedRows.push(...group.rows)
    }
    if (aggregate.kind === "normalized-total" && group.negative) {
      negativeGroups.push(key)
      negativeRows.push(...group.negativeRows)
    }
  }

  const out: DataAuditDiagnosis[] = []
  if (zeroGroups.length > 0) {
    out.push(
      diagnosis({
        severity: "error",
        code:
          aggregate.kind === "normalized-total"
            ? "ZERO_NORMALIZED_TOTAL"
            : "NON_POSITIVE_TOTAL",
        message:
          aggregate.kind === "normalized-total"
            ? `${zeroGroups.length} normalization group${zeroGroups.length === 1 ? " has" : "s have"} a zero total, so division would be undefined.`
            : `The part-to-whole total is not positive, so meaningful shares cannot be computed.`,
        fix:
          aggregate.kind === "normalized-total"
            ? `Remove empty/zero-sum groups or disable normalization.`
            : `Provide at least one positive value and ensure the total is greater than zero.`,
        field: field.accessorLabel,
        role: aggregate.role,
        rows: bounded([...new Set(zeroRows)].sort((a, b) => a - b)),
        count: zeroGroups.length,
      }),
    )
  }
  if (negativeGroups.length > 0) {
    out.push(
      diagnosis({
        severity: "error",
        code: "NEGATIVE_NORMALIZED_VALUE",
        message: `${negativeGroups.length} normalization group${negativeGroups.length === 1 ? " contains" : "s contain"} negative contributions, so conventional percentage shares are not defined.`,
        fix: `Use non-negative contributions, a diverging stack, or disable normalization.`,
        field: field.accessorLabel,
        role: aggregate.role,
        rows: bounded([...new Set(negativeRows)].sort((a, b) => a - b)),
        count: negativeRows.length,
      }),
    )
  }
  if (mixedGroups.length > 0) {
    out.push(
      diagnosis({
        severity: "warning",
        code: "MIXED_SIGN_NORMALIZATION",
        message: `${mixedGroups.length} normalization group${mixedGroups.length === 1 ? " mixes" : "s mix"} positive and negative contributions; percentage shares may be unstable or misleading.`,
        fix: `Separate positive and negative contributions, use diverging stacks, or disable normalization.`,
        field: field.accessorLabel,
        role: aggregate.role,
        rows: bounded([...new Set(mixedRows)].sort((a, b) => a - b)),
        count: mixedGroups.length,
      }),
    )
  }
  return out
}

/**
 * Audit the intrinsic numeric safety of data for a selected chart.
 *
 * This is the input-side companion to `diagnoseConfig` (representation) and
 * `auditAccessibility` (reception). It is pure, deterministic, React-free, and
 * accepts function accessors without serializing or executing arbitrary code
 * outside the caller's own process.
 */
export function auditData(
  component: string,
  props: Datum,
  data?: ReadonlyArray<Datum>,
  options: AuditDataOptions = {},
): DataAuditResult {
  const contracts =
    options.contracts ?? getNumericContracts(component) ?? inferredContracts(props)
  if (!contracts) {
    return {
      component,
      ok: true,
      rowCount: data?.length ?? (Array.isArray(props.data) ? props.data.length : 0),
      summary: { fieldsChecked: 0, errors: 0, warnings: 0 },
      contracts: [],
      diagnoses: [],
    }
  }

  const fields = resolveFields(contracts, props, data)
  const diagnoses: DataAuditDiagnosis[] = []
  const checkOutliers = options.checkOutliers !== false

  for (const dataProp of explicitEmptyNumericSources(contracts, props, data)) {
    diagnoses.push(
      diagnosis({
        severity: "error",
        code: "EMPTY_DATA",
        message: `"${dataProp}" needs at least one row to render numeric inputs. It has 0 rows.`,
        fix: `Provide rows, render an empty state, or omit ${dataProp} for ref push mode.`,
        count: 0,
        rows: [],
      }),
    )
  }

  // A single row cannot establish a quantitative domain. Report this once per
  // source collection instead of emitting one zero-span warning per axis.
  const singleRowSources = new Set(
    fields
      .filter((field) => field.contract.domain && field.rows.length === 1)
      .map((field) => field.dataProp),
  )
  for (const dataProp of singleRowSources) {
    diagnoses.push(
      diagnosis({
        severity: "warning",
        code: "SINGLE_ROW_DOMAIN",
        message: `A quantitative domain needs at least two observations to show variation. "${dataProp}" has 1 row.`,
        fix: `Provide at least two observations or use a single-value display such as BigNumber.`,
        count: 1,
        rows: [0],
      }),
    )
  }

  for (const field of fields) {
    diagnoses.push(...fieldDiagnoses(field, checkOutliers))
  }
  for (const aggregate of contracts.aggregates ?? []) {
    diagnoses.push(...aggregateDiagnoses(aggregate, fields, props))
  }

  const errors = diagnoses.filter((item) => item.severity === "error").length
  const warnings = diagnoses.length - errors
  const rowCount = fields.reduce(
    (max, field) => Math.max(max, field.rows.length),
    data?.length ?? (Array.isArray(props.data) ? props.data.length : 0),
  )

  return {
    component,
    ok: errors === 0,
    rowCount,
    summary: { fieldsChecked: fields.length, errors, warnings },
    contracts: fields.map((field) => ({
      role: field.contract.role,
      accessor: field.accessorLabel,
      dataProp: field.dataProp,
      requirements: field.requirements,
      allowMissing: field.contract.allowMissing === true,
      ...(field.contract.missingValue !== undefined
        ? { missingValue: field.contract.missingValue }
        : {}),
      domain: field.contract.domain === true,
    })),
    diagnoses,
  }
}

export { profileNumericFields } from "./numericFieldProfiler"
export type { NumericFieldProfile, ProfileNumericFieldsOptions } from "./numericFieldProfiler"
export { formatDataAudit, formatNumericRequirements, toDataAuditNotifications } from "./dataAuditPresentation"
export type { DataAuditChartNotification, DataAuditNotificationOptions } from "./dataAuditPresentation"
