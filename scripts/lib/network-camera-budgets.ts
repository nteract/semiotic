// S3/S4 acceptance budgets at 4× CPU throttle. These are fixed targets, not
// thresholds regenerated from whichever machine last captured a baseline.
export const cameraScenarios = [
  { nodes: 300, cards: "compact", edgeHits: false },
  { nodes: 1000, cards: "compact", edgeHits: false },
  { nodes: 3000, cards: "compact", edgeHits: false },
  { nodes: 1000, cards: "pipeline", edgeHits: false },
  { nodes: 3000, cards: "compact", edgeHits: true }
] as const
export const cameraScales = ["fit", 0.5, 1, 2] as const
export const pointerBudgetMs = 1

export interface CameraRow {
  nodes: number
  cards: string
  edgeHits: boolean
  scale: string | number
  frames: number
  cameraPaints: number
  layoutRuns: number
  mounted: number
  scriptMs: number
  layoutMs: number
}

export interface CameraReport {
  browser: string
  cpuThrottle: number
  productionProfiling: boolean
  machine: { platform: string; arch: string; cpu: string }
  rows: CameraRow[]
}

export function cameraScriptBudgetMs(row: Pick<CameraRow, "nodes" | "scale">) {
  if (row.nodes === 1000 && row.scale === 1) return 4
  if (row.nodes === 3000 && row.scale === "fit") return 16
  return null
}

export function cameraBudgetFailures(reports: CameraReport[]): string[] {
  return reports.flatMap((report) =>
    report.productionProfiling
      ? []
      : report.rows.flatMap((row) => {
          const budget = cameraScriptBudgetMs(row)
          return budget !== null && row.scriptMs > budget
            ? [
                `${row.nodes}/${row.cards}/edges=${row.edgeHits}/${row.scale}: ${row.scriptMs.toFixed(3)} ms exceeds ${budget} ms scripting budget`
              ]
            : []
        })
  )
}

// A partial or duplicated capture must never masquerade as a complete matrix.
// Old v1 captures remain readable, but only the complete original matrix can
// become a newly collected baseline.
export function validateCameraReports(reports: CameraReport[]): void {
  const fail = (message: string): never => {
    throw new Error(`Invalid camera measurements: ${message}`)
  }
  if (reports.length !== cameraScenarios.length) fail("expected five scenarios")
  const first = reports[0]
  const key = (row: Pick<CameraRow, "nodes" | "cards" | "edgeHits">) =>
    `${row.nodes}/${row.cards}/${row.edgeHits}`
  const expected = new Set<string>(cameraScenarios.map(key))
  for (const report of reports) {
    if (
      typeof report.productionProfiling !== "boolean" ||
      report.productionProfiling !== first.productionProfiling
    )
      fail("mixed or missing production/profiling modes")
    if (report.cpuThrottle !== 4) fail("CPU throttle must be 4")
    if (
      !report.browser ||
      report.browser !== first.browser ||
      !report.machine?.cpu ||
      !report.machine.platform ||
      !report.machine.arch ||
      (["platform", "arch", "cpu"] as const).some(
        (key) => report.machine[key] !== first.machine[key]
      )
    )
      fail("browser and machine must agree across scenarios")
    if (
      !Array.isArray(report.rows) ||
      report.rows.length !== cameraScales.length
    )
      fail("expected four scales per scenario")
    const scenario = key(report.rows[0])
    if (!expected.delete(scenario))
      fail(`unexpected or duplicate scenario ${scenario}`)
    const scales = new Set<string | number>(cameraScales)
    for (const row of report.rows) {
      if (key(row) !== scenario || !scales.delete(row.scale))
        fail("unexpected or duplicate scale/scenario row")
      if (
        row.frames !== 50 ||
        !Number.isInteger(row.cameraPaints) ||
        row.cameraPaints < 50 ||
        row.layoutRuns !== 0
      )
        fail("expected 50 camera frames/paints and no layout reruns")
      if (
        !Number.isInteger(row.mounted) ||
        row.mounted <= 0 ||
        row.mounted > row.nodes ||
        (row.scale === "fit" && row.mounted !== row.nodes) ||
        (row.scale === 1 && row.mounted === row.nodes)
      )
        fail("invalid mounted-card count or missing culling")
      for (const metric of ["scriptMs", "layoutMs"] as const)
        if (!Number.isFinite(row[metric]) || row[metric] < 0)
          fail(`${metric} must be finite and nonnegative`)
    }
  }
}

export interface PointerReport {
  browser: string
  cpu: string
  cpuThrottle: number
  profiling: boolean
  rows: {
    k: number
    scenario: string
    scriptMs: number
    layoutMs: number
    counts: {
      queries: number
      layouts: number
      renders: number
      layers: number
      calls: number
    }
  }[]
}

export function validatePointerReport(
  report: PointerReport,
  camera: CameraReport
): void {
  if (
    !report ||
    report.browser !== camera.browser ||
    report.cpu !== camera.machine.cpu ||
    report.cpuThrottle !== 4 ||
    report.profiling !== camera.productionProfiling
  )
    throw new Error("Pointer and camera measurement environments must agree")
  const expected = new Set(
    [0.3, 1, 2].flatMap((k) =>
      ["edge", "node", "miss", "alternating"].map(
        (scenario) => `${k}/${scenario}`
      )
    )
  )
  if (!Array.isArray(report.rows) || report.rows.length !== expected.size)
    throw new Error("Expected twelve pointer scenarios")
  for (const row of report.rows) {
    if (!expected.delete(`${row.k}/${row.scenario}`))
      throw new Error("Unexpected or duplicate pointer scenario")
    if (
      !row.counts ||
      row.counts.queries !== 100 ||
      row.counts.layouts !== 0 ||
      row.counts.renders !== 0 ||
      row.counts.layers !== 0 ||
      row.counts.calls !== (row.scenario === "miss" ? 1 : 100)
    )
      throw new Error(
        "Expected 100 coalesced pointer queries without retained frame/layer updates"
      )
    if (
      ![row.scriptMs, row.layoutMs].every(
        (ms) => Number.isFinite(ms) && ms >= 0
      )
    )
      throw new Error("Pointer timings must be finite and nonnegative")
  }
}

export function pointerBudgetFailures(report: PointerReport): string[] {
  return report.profiling
    ? []
    : report.rows.flatMap((row) =>
        row.scriptMs + row.layoutMs > pointerBudgetMs
          ? [
              `pointer ${row.k}/${row.scenario}: ${(row.scriptMs + row.layoutMs).toFixed(3)} ms exceeds ${pointerBudgetMs} ms script + layout budget`
            ]
          : []
      )
}
