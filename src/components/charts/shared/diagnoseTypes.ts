import type { ValidationIssue } from "./validateProps"

/**
 * The structured half of a `validateProps` finding. A `VALIDATION` diagnosis
 * already carries the sentence in `message`, so it is left out here.
 */
export type DiagnosisValidationDetail = Omit<ValidationIssue, "message">

export interface Diagnosis {
  severity: "error" | "warning"
  code: string
  message: string
  fix: string
  /** Optional evaluator domain; omitted by legacy configuration checks. */
  domain?: "data" | "configuration" | "accessibility" | "render"
  /** Numeric/data checks attach the resolved accessor label. */
  field?: string
  /** Numeric/data checks attach the semantic encoding role. */
  role?: string
  /** Bounded zero-based row indices for actionable data findings. */
  rows?: ReadonlyArray<number>
  /** Full affected-row/group count when `rows` is truncated. */
  count?: number
  /**
   * `VALIDATION` diagnoses only: the issue's stable code, prop path, offending
   * and accepted types, and a suggestion or patch when one exists.
   */
  validation?: DiagnosisValidationDetail
}

export interface DiagnosisResult {
  ok: boolean
  diagnoses: Diagnosis[]
}
