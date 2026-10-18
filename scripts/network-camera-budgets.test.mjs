import assert from "node:assert/strict"
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import {
  cameraScenarios,
  cameraScales,
  cameraScriptBudgetMs,
  cameraBudgetFailures,
  validateCameraReports,
  validatePointerReport,
  pointerBudgetFailures
} from "./lib/network-camera-budgets.ts"

function capture(profiling = false) {
  const reports = cameraScenarios.map((scenario) => ({
    browser: "149.0.7827.55",
    cpuThrottle: 4,
    productionProfiling: profiling,
    machine: { platform: "linux", arch: "x64", cpu: "test CPU" },
    rows: cameraScales.map((scale) => ({
      ...scenario,
      scale,
      frames: 50,
      cameraPaints: 50,
      layoutRuns: 0,
      mounted: scale === "fit" ? scenario.nodes : 50,
      scriptMs: 0.5,
      layoutMs: 0.1
    }))
  }))
  const pointer = {
    browser: reports[0].browser,
    cpu: "test CPU",
    cpuThrottle: 4,
    profiling,
    rows: [0.3, 1, 2].flatMap((k) =>
      ["edge", "node", "miss", "alternating"].map((scenario) => ({
        k,
        scenario,
        scriptMs: 0.5,
        layoutMs: 0.1,
        counts: {
          queries: 100,
          layouts: 0,
          renders: 0,
          layers: 0,
          calls: scenario === "miss" ? 1 : 100
        }
      }))
    )
  }
  return { reports, pointer }
}

test("the complete production matrix passes the unchanged S3/S4 boundaries", () => {
  const { reports, pointer } = capture()
  const gated = []
  for (const report of reports)
    for (const row of report.rows) {
      const budget = cameraScriptBudgetMs(row)
      if (budget !== null) {
        row.scriptMs = budget
        gated.push([row.nodes, row.cards, row.edgeHits, row.scale, budget])
      }
    }
  assert.deepEqual(gated, [
    [1000, "compact", false, 1, 4],
    [3000, "compact", false, "fit", 16],
    [1000, "pipeline", false, 1, 4],
    [3000, "compact", true, "fit", 16]
  ])
  for (const row of pointer.rows) row.layoutMs = 0.5
  validateCameraReports(reports)
  validatePointerReport(pointer, reports[0])
  assert.deepEqual(cameraBudgetFailures(reports), [])
  assert.deepEqual(pointerBudgetFailures(pointer), [])
  for (const report of reports)
    for (const row of report.rows) row.scriptMs += 0.001
  pointer.rows[0].layoutMs += 0.001
  assert.equal(cameraBudgetFailures(reports).length, 4)
  assert.equal(pointerBudgetFailures(pointer).length, 1)
})

test("profiling retains structural checks but never supplies timing acceptance", () => {
  const { reports, pointer } = capture(true)
  for (const report of reports)
    for (const row of report.rows) row.scriptMs = 1000
  pointer.rows[0].scriptMs = 1000
  validateCameraReports(reports)
  validatePointerReport(pointer, reports[0])
  assert.deepEqual(cameraBudgetFailures(reports), [])
  assert.deepEqual(pointerBudgetFailures(pointer), [])
  reports[0].rows[0].layoutRuns = 1
  assert.throws(() => validateCameraReports(reports), /no layout reruns/)
})

for (const [name, mutate] of [
  ["missing scenario", (reports) => reports.pop()],
  [
    "duplicate scenario",
    (reports) => {
      reports[1] = structuredClone(reports[0])
    }
  ],
  [
    "duplicate scale",
    (reports) => {
      reports[0].rows[1] = { ...reports[0].rows[0] }
    }
  ],
  [
    "mixed modes",
    (reports) => {
      reports[0].productionProfiling = true
    }
  ],
  [
    "wrong CPU throttle",
    (reports) => {
      reports[0].cpuThrottle = 1
    }
  ],
  [
    "mixed browsers",
    (reports) => {
      reports[0].browser = "other"
    }
  ],
  [
    "mixed CPUs",
    (reports) => {
      reports[0].machine.cpu = "other"
    }
  ],
  [
    "missing frames",
    (reports) => {
      reports[0].rows[0].frames = 49
    }
  ],
  [
    "missing paints",
    (reports) => {
      reports[0].rows[0].cameraPaints = 0
    }
  ],
  [
    "disabled culling",
    (reports) => {
      reports[0].rows[2].mounted = 300
    }
  ],
  [
    "missing fit cards",
    (reports) => {
      reports[0].rows[0].mounted = 299
    }
  ],
  [
    "invalid timing",
    (reports) => {
      reports[0].rows[0].scriptMs = NaN
    }
  ]
]) {
  test(`rejects ${name} instead of recording an apparently complete baseline`, () => {
    const { reports } = capture()
    mutate(reports)
    assert.throws(
      () => validateCameraReports(reports),
      /Invalid camera measurements/
    )
  })
}

test("pointer captures require every scale/scenario and no retained renders", () => {
  for (const mutate of [
    (pointer) => pointer.rows.pop(),
    (pointer) => {
      pointer.rows[0] = { ...pointer.rows[1] }
    },
    (pointer) => {
      pointer.rows[0].counts.queries = 99
    },
    (pointer) => {
      pointer.rows[0].counts.renders = 1
    },
    (pointer) => {
      pointer.rows[0].counts.layers = 1
    },
    (pointer) => {
      pointer.rows[0].scriptMs = Infinity
    },
    (pointer) => {
      pointer.profiling = true
    }
  ]) {
    const { reports, pointer } = capture()
    mutate(pointer)
    assert.throws(() => validatePointerReport(pointer, reports[0]))
  }
})

test("collector preserves failed production evidence when adding profiling diagnostics", (t) => {
  const root = mkdtempSync(join(tmpdir(), "semiotic-camera-gate-"))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const commit = "1234567890abcdef1234567890abcdef12345678"
  // Exercise CI metadata without relying on this machine's checkout/trust
  // configuration. A Git lookup must fail even when the test runs locally.
  const childOptions = {
    encoding: "utf8",
    cwd: root,
    env: {
      ...process.env,
      GITHUB_SHA: commit,
      GIT_DIR: join(root, "missing.git")
    }
  }
  const { reports, pointer } = capture()
  reports[1].rows[2].scriptMs = 4.001
  pointer.rows[0].scriptMs = 1
  for (const [index, report] of reports.entries()) {
    const dir = join(root, `network-camera-scale-measure-${index}`)
    mkdirSync(dir)
    writeFileSync(join(dir, "measurements.json"), JSON.stringify(report))
  }
  const edgeDir = join(root, "network-edge-performance-pointer")
  mkdirSync(edgeDir)
  writeFileSync(join(edgeDir, "edge-pointer.json"), JSON.stringify(pointer))
  const destination = join(root, "capture.json")
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      fileURLToPath(
        new URL("./collect-network-camera-baseline.mjs", import.meta.url)
      ),
      root,
      destination,
      "synthetic failing capture"
    ],
    childOptions
  )
  assert.ifError(result.error)
  assert.equal(result.status, 1, result.stdout + result.stderr)
  assert.match(
    result.stdout,
    /Recorded production camera measurements/,
    result.stderr
  )
  assert.match(result.stderr, /exceeds 4 ms scripting budget/)
  const recorded = JSON.parse(readFileSync(destination, "utf8"))
  assert.equal(recorded.production.sourceCommit, commit)
  assert.equal(recorded.production.timingBudgets.status, "failed")
  assert.equal(recorded.production.timingBudgets.failures.length, 2)
  assert.equal(recorded.production.reports.length, 5)
  for (const [index, report] of reports.entries()) {
    report.productionProfiling = true
    for (const row of report.rows) row.scriptMs = 1000
    writeFileSync(
      join(root, `network-camera-scale-measure-${index}`, "measurements.json"),
      JSON.stringify(report)
    )
  }
  pointer.profiling = true
  pointer.rows[0].scriptMs = 1000
  writeFileSync(join(edgeDir, "edge-pointer.json"), JSON.stringify(pointer))
  const profiled = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      fileURLToPath(
        new URL("./collect-network-camera-baseline.mjs", import.meta.url)
      ),
      root,
      destination,
      "synthetic profiling capture"
    ],
    childOptions
  )
  assert.ifError(profiled.error)
  assert.equal(profiled.status, 0, profiled.stdout + profiled.stderr)
  const combined = JSON.parse(readFileSync(destination, "utf8"))
  assert.deepEqual(combined.production, recorded.production)
  assert.equal(combined.profiling.timingBudgets.status, "diagnostic")
  assert.equal(combined.profiling.sourceCommit, commit)
})

test("aggregate testing waits for the camera matrix and rejects every required non-success result", (t) => {
  const workflow = readFileSync(
    new URL("../.github/workflows/node.js.yml", import.meta.url),
    "utf8"
  )
  const aggregate = workflow.match(
    /^ {2}testing:\n([\s\S]*?)(?=^ {2}[\w-]+:)/m
  )?.[1]
  assert.ok(aggregate, "testing aggregate must exist")
  assert.match(aggregate, /^ {4}if: always\(\)/m)
  const dependencies = [...aggregate.matchAll(/^ {6}- ([\w-]+)$/gm)].map(
    (match) => match[1]
  )
  assert.ok(
    dependencies.includes("network-camera"),
    "aggregate must wait for both camera modes"
  )
  const shell = aggregate.split("        run: |\n")[1].replace(/^ {10}/gm, "")
  const root = mkdtempSync(join(tmpdir(), "semiotic-camera-aggregate-"))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const summary = join(root, "summary.md")
  const run = (failedJob, status = "success") => {
    writeFileSync(summary, "")
    const expanded = shell.replace(
      /\$\{\{ needs\['([\w-]+)'\]\.result \}\}/g,
      (_expression, job) => {
        assert.ok(
          dependencies.includes(job),
          `${job} result requires a dependency`
        )
        return job === failedJob ? status : "success"
      }
    )
    const result = spawnSync("bash", ["-c", expanded], {
      encoding: "utf8",
      env: { ...process.env, GITHUB_STEP_SUMMARY: summary }
    })
    assert.ifError(result.error)
    return { ...result, summary: readFileSync(summary, "utf8") }
  }
  assert.equal(run().status, 0)
  for (const job of dependencies)
    for (const status of ["failure", "cancelled", "skipped"]) {
      const result = run(job, status)
      assert.equal(
        result.status,
        1,
        `${job}/${status}: ${result.stdout}${result.stderr}`
      )
      if (job === "network-camera") {
        assert.ok(
          result.summary.includes(`Network camera result: \`${status}\``)
        )
        assert.ok(result.stdout.includes(`network camera: ${status}`))
      }
    }
})
