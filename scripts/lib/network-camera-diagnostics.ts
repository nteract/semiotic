import {
  cameraScriptBudgetMs,
  pointerBudgetMs,
  validateCameraReports,
  validatePointerReport,
  type CameraReport,
  type PointerReport
} from "./network-camera-budgets.ts"

/** Select replays from saved acceptance evidence, never from profiler timings. */
export function networkCameraDiagnostics(capture: {
  production?: { reports: CameraReport[]; edgePointer: PointerReport }
}) {
  const production = capture.production
  if (!production) throw new Error("Diagnostics require a production capture")
  validateCameraReports(production.reports)
  validatePointerReport(production.edgePointer, production.reports[0])
  if (production.reports[0].productionProfiling)
    throw new Error("Diagnostics require unprofiled production measurements")
  return [
    ...production.reports.flatMap(({ rows }) =>
      rows.flatMap((row) => {
        const budget = cameraScriptBudgetMs(row)
        return budget !== null && row.scriptMs > budget
          ? [{ kind: "camera" as const, row, budget }]
          : []
      })
    ),
    ...production.edgePointer.rows
      .filter((row) => row.scriptMs + row.layoutMs > pointerBudgetMs)
      .map((row) => ({
        kind: "pointer" as const,
        row,
        budget: pointerBudgetMs
      }))
  ]
}
