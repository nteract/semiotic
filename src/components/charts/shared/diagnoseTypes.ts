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
}

export interface DiagnosisResult {
  ok: boolean
  diagnoses: Diagnosis[]
}
