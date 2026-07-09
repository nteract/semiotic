export interface Diagnosis {
  severity: "error" | "warning"
  code: string
  message: string
  fix: string
}

export interface DiagnosisResult {
  ok: boolean
  diagnoses: Diagnosis[]
}
