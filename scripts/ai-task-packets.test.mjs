import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import {
  assertTaskVersion,
  buildTaskPackets,
  compareOutputs,
  digest,
  evidenceFor,
  GENERATOR,
  readSource,
  TASK_IDS,
  taskEvidenceIdentity,
  taskOutputs
} from "./lib/ai-task-packets.mjs"
import {
  docsTaskPackets,
  listTaskPacketFiles
} from "./lib/docs-task-packets.mjs"
import { normalizeTaskRunReport } from "./verify-ai-tasks.mjs"

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const fixtureInputs = [
  "package.json",
  "ai/schema.json",
  "ai/componentMetadata.cjs",
  "ai/behaviorContracts.cjs",
  "ai/surface-manifest.json",
  "ai/mcp-server.ts",
  "ai/mcp-task-resources.ts",
  "ai/mcp-task-resources.test.ts",
  "package-surface.manifest.json",
  ...TASK_IDS.map((id) => `ai/tasks/${id}.json`),
  "docs/src/pages/tasks",
  "integration-tests/docs-examples-tasks.spec.ts",
  "integration-tests/docs-examples-task-live.spec.ts",
  "playwright.docs-examples.config.ts",
  "vitest.config.mts",
  GENERATOR,
  "scripts/lib/ai-task-packets.mjs",
  "scripts/lib/docs-task-packets.mjs",
  "scripts/verify-ai-tasks.mjs",
  "docs/src/App.jsx",
  "docs/src/components/PageLayout.jsx",
  "docs/src/components/CodeBlock.jsx",
  "vite.shared.mjs",
  "vite.docs.config.mjs",
  "package-lock.json",
  "src/setupTests.ts",
  "scripts/ai-tasks/tsconfig.json"
]

function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), "semiotic-task-packets-"))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  for (const path of fixtureInputs) {
    mkdirSync(dirname(resolve(root, path)), { recursive: true })
    cpSync(resolve(repository, path), resolve(root, path), { recursive: true })
  }
  put(root, "src/runtime.ts", "export const retainedRecordLimit = 4\n")
  return root
}

function put(root, path, content) {
  mkdirSync(dirname(resolve(root, path)), { recursive: true })
  writeFileSync(resolve(root, path), content)
}

function changeJSON(root, path, change) {
  const value = JSON.parse(readSource(root, path))
  change(value)
  put(root, path, JSON.stringify(value, null, 2) + "\n")
}

function verification(root, packets = buildTaskPackets(root)) {
  const identity = taskEvidenceIdentity(root)
  const targets = (kind) =>
    [...new Set(packets.map((packet) => packet.evidence.checks[kind]))].sort()
  return {
    schemaVersion: 1,
    scope: "source-only",
    verifiedAt: "2026-09-08T12:00:00.000Z",
    environment: {
      node: "v22.22.1",
      platform: "linux",
      architecture: "x64",
      browser: "Playwright Chromium"
    },
    taskRevisions: identity.revisions,
    runtime: identity.runtime,
    harness: identity.harness,
    runs: ["unit", "browser"].map((kind) => ({
      kind,
      targets: targets(kind),
      name: `Task ${kind} checks`,
      command: `node ${kind === "unit" ? "node_modules/vitest/vitest.mjs run" : "node_modules/@playwright/test/cli.js test"} ${targets(kind).join(" ")}`,
      passedByFile: Object.fromEntries(targets(kind).map((path) => [path, 1])),
      exitCode: 0,
      passed: targets(kind).length,
      skipped: 0
    }))
  }
}

test("task packets preserve exact authored sources in one deterministic human/machine copy", (t) => {
  const root = fixture(t)
  const packets = buildTaskPackets(root)
  assert.deepEqual(
    packets.map((packet) => packet.id),
    TASK_IDS
  )
  const outputs = taskOutputs(packets)
  assert.deepEqual(outputs, taskOutputs(buildTaskPackets(root)))
  assert.equal(outputs.size, 7)
  for (const [path, content] of outputs) {
    assert.ok(path.startsWith("ai/task-packets/"), path)
    put(root, path, content)
  }
  assert.deepEqual(compareOutputs(root, outputs), [])
  for (const packet of packets) {
    assert.equal(packet.evidence.status, "proposed")
    assert.equal(packet.evidence.observed, null)
    for (const example of packet.examples) {
      const source = readSource(root, example.path)
      assert.equal(example.source, source)
      assert.equal(example.digest, digest(source))
    }
  }
  const live = packets.find((packet) => packet.id === "update-live-chart")
  assert.equal(live.api.component, "LineChart")
  assert.equal(live.api.importPath, "semiotic/line")
  assert.equal(live.api.dataRequired, false)
  assert.equal(
    packets.find((packet) => packet.id === "compare-category-totals").api
      .dataRequired,
    true
  )
  const damagedPath = "ai/task-packets/update-live-chart.md"
  put(root, damagedPath, "outdated guidance\n")
  assert.deepEqual(compareOutputs(root, outputs), [damagedPath])
  assert.equal(readSource(root, damagedPath), "outdated guidance\n")
})

// `guidance` sources are part of the packet identity. The rest are what a
// recorded run executed: they invalidate that run without rewriting the packet.
for (const [label, path, scope] of [
  ["runtime behavior", "src/runtime.ts", "runtime"],
  ["dependency manifest", "package.json", "runtime"],
  ["shared fixture", "docs/src/pages/tasks/examples/live-chart.ts", "guidance"],
  [
    "browser assertions",
    "integration-tests/docs-examples-task-live.spec.ts",
    "guidance"
  ],
  ["generation logic", "scripts/lib/ai-task-packets.mjs", "guidance"],
  ["verification runner", "scripts/verify-ai-tasks.mjs", "guidance"],
  ["task page host", "docs/src/pages/tasks/TaskPage.tsx", "guidance"],
  ["route registration", "docs/src/App.jsx", "harness"],
  ["shared page layout", "docs/src/components/PageLayout.jsx", "harness"],
  ["code presentation", "docs/src/components/CodeBlock.jsx", "harness"],
  ["source import aliases", "vite.shared.mjs", "harness"],
  ["docs Vite configuration", "vite.docs.config.mjs", "harness"],
  ["served packet route", "scripts/lib/docs-task-packets.mjs", "harness"],
  ["installed dependency lock", "package-lock.json", "harness"],
  ["test environment setup", "src/setupTests.ts", "harness"],
  [
    "task TypeScript configuration",
    "scripts/ai-tasks/tsconfig.json",
    "guidance"
  ]
]) {
  test(`changing ${label} invalidates recorded execution instead of retaining a success claim`, (t) => {
    const root = fixture(t)
    const before = buildTaskPackets(root)
    const record = verification(root, before)
    assert.ok(
      buildTaskPackets(root, { verification: record }).every(
        (packet) => packet.evidence.status === "supported-in-scope"
      )
    )
    if (path === "package-lock.json") {
      changeJSON(root, path, (lock) => {
        lock.packages["node_modules/react"].version =
          "0.0.0-source-drift-fixture"
      })
    } else if (path === "package.json") {
      // A lifecycle script is not part of any packet's selected contract.
      changeJSON(root, path, (pkg) => {
        pkg.scripts["source-drift-fixture"] = "true"
      })
    } else if (path.endsWith("tsconfig.json")) {
      changeJSON(root, path, (config) => {
        config.compilerOptions.strict = false
      })
    } else {
      put(
        root,
        path,
        readSource(root, path) + "\n// Changed after the observed run.\n"
      )
    }
    const after = buildTaskPackets(root, { verification: record })
    assert.ok(
      after.every(
        (packet) =>
          packet.evidence.status === "stale" &&
          packet.evidence.observed === null
      )
    )
    if (scope === "guidance") {
      assert.notEqual(
        after[0].identity.sourceRevision,
        before[0].identity.sourceRevision
      )
    } else {
      // The claim is withdrawn, but the packet's own identity is untouched.
      assert.deepEqual(
        after.map((packet) => packet.identity),
        before.map((packet) => packet.identity)
      )
    }
  })
}

test("runtime and harness edits leave committed packets byte-identical once evidence is not current", (t) => {
  const root = fixture(t)
  for (const record of [null, { schemaVersion: 1, taskRevisions: {} }]) {
    put(root, "src/runtime.ts", "export const retainedRecordLimit = 4\n")
    const before = taskOutputs(buildTaskPackets(root, { verification: record }))
    put(root, "src/runtime.ts", "export const retainedRecordLimit = 5\n")
    put(root, "src/another-module.ts", "export const added = true\n")
    changeJSON(root, "package-lock.json", (lock) => {
      lock.packages["node_modules/react"].version = `0.0.0-${record ? "b" : "a"}`
    })
    put(
      root,
      "docs/src/App.jsx",
      readSource(root, "docs/src/App.jsx") + "\n// Unrelated route.\n"
    )
    assert.deepEqual(
      taskOutputs(buildTaskPackets(root, { verification: record })),
      before
    )
  }
})

test("only the public contract a packet copies can change its identity", (t) => {
  const root = fixture(t)
  const before = buildTaskPackets(root)
  const live = (packets) =>
    packets.find((packet) => packet.id === "update-live-chart")
  const totals = (packets) =>
    packets.find((packet) => packet.id === "compare-category-totals")
  // A property the BarChart task does not select, and a component no task uses.
  changeJSON(root, "ai/schema.json", (schema) => {
    const list = Array.isArray(schema) ? schema : schema.tools ?? schema.components
    const bar = list.find(
      (entry) => (entry.name ?? entry.function?.name) === "BarChart"
    )
    const parameters = bar.parameters ?? bar.function.parameters
    parameters.properties.unselectedFixtureProp = { type: "string" }
    list.push({
      ...structuredClone(bar),
      ...(bar.function
        ? { function: { ...structuredClone(bar.function), name: "FixtureChart" } }
        : { name: "FixtureChart" })
    })
  })
  const unrelated = buildTaskPackets(root)
  assert.deepEqual(
    unrelated.map((packet) => packet.identity.sourceRevision),
    before.map((packet) => packet.identity.sourceRevision)
  )
  // A selected property changes that task alone.
  changeJSON(root, "ai/schema.json", (schema) => {
    const list = Array.isArray(schema) ? schema : schema.tools ?? schema.components
    const bar = list.find(
      (entry) => (entry.name ?? entry.function?.name) === "BarChart"
    )
    const parameters = bar.parameters ?? bar.function.parameters
    parameters.properties.valueAccessor.description =
      "Changed contract wording."
  })
  const selected = buildTaskPackets(root)
  assert.notEqual(
    totals(selected).identity.sourceRevision,
    totals(before).identity.sourceRevision
  )
  assert.equal(
    live(selected).identity.sourceRevision,
    live(before).identity.sourceRevision
  )
})

test("the docs server and build expose the single committed copy at /tasks/", (t) => {
  const root = fixture(t)
  for (const [path, content] of taskOutputs(buildTaskPackets(root)))
    put(root, path, content)
  put(root, "ai/task-packets/.DS_Store", "ignored")
  put(root, "ai/task-packets/Not A Packet.txt", "ignored")
  assert.deepEqual(listTaskPacketFiles(root), [
    "compare-category-totals.json",
    "compare-category-totals.md",
    "correct-published-chart.json",
    "correct-published-chart.md",
    "index.json",
    "update-live-chart.json",
    "update-live-chart.md"
  ])
  const outDir = resolve(root, "docs/build")
  const plugin = docsTaskPackets({ root, outDir })
  plugin.closeBundle()
  for (const name of listTaskPacketFiles(root))
    assert.equal(
      readFileSync(resolve(outDir, "tasks", name), "utf8"),
      readSource(root, `ai/task-packets/${name}`)
    )
  let handler
  plugin.configureServer({ middlewares: { use: (fn) => (handler = fn) } })
  const request = (url, method = "GET") => {
    const response = { headers: {}, body: undefined, statusCode: undefined }
    let passed = false
    handler(
      { url, method },
      {
        setHeader: (name, value) => (response.headers[name] = value),
        end: (body) => (response.body = body),
        set statusCode(value) {
          response.statusCode = value
        }
      },
      () => (passed = true)
    )
    return { ...response, passed }
  }
  const served = request("/tasks/update-live-chart.md?download=1")
  assert.equal(served.statusCode, 200)
  assert.match(served.headers["Content-Type"], /^text\/markdown/)
  assert.equal(
    served.body.toString("utf8"),
    readSource(root, "ai/task-packets/update-live-chart.md")
  )
  assert.match(
    request("/tasks/index.json").headers["Content-Type"],
    /^application\/json/
  )
  // Page routes, unknown names, traversal, and writes fall through to Vite.
  for (const [url, method] of [
    ["/tasks/update-live-chart"],
    ["/tasks/missing.json"],
    ["/tasks/../package.json"],
    ["/tasks/%2e%2e/package.json"],
    ["/tasks/Not A Packet.txt"],
    ["/other/index.json"],
    ["/tasks/index.json", "POST"]
  ])
    assert.equal(request(url, method).passed, true, url)
})

for (const kind of ["example", "unit", "browser"]) {
  test(`a declared ${kind} outside the conventional folders still invalidates its task evidence`, (t) => {
    const root = fixture(t)
    const path = `extra/${kind}.ts`
    put(root, path, "export const expected = 17\n")
    changeJSON(root, "ai/tasks/update-live-chart.json", (task) => {
      if (kind === "example")
        task.examples.push({
          title: "Additional fixture",
          environment: "Node",
          path
        })
      else task.checks[kind] = path
    })
    const before = buildTaskPackets(root)
    const record = verification(root, before)
    put(root, path, "export const expected = 19\n")
    const after = buildTaskPackets(root, { verification: record }).find(
      (packet) => packet.id === "update-live-chart"
    )
    assert.equal(after.evidence.status, "stale")
    assert.equal(after.evidence.observed, null)
  })
}

for (const [label, change, error] of [
  [
    "unknown component",
    (task) => {
      task.component = "InventedChart"
    },
    /Unknown task component/
  ],
  [
    "unknown prop",
    (task) => {
      task.props.push("pushRows")
    },
    /Unknown task prop/
  ],
  [
    "unknown contract",
    (task) => {
      task.contracts.push("streaming.invented")
    },
    /Unknown behavior contract/
  ],
  [
    "undeclared recovery contract",
    (task) => {
      task.recovery[0].contractId = "streaming.serialized-proposal-snapshot"
    },
    /undeclared contract/
  ],
  [
    "unpublished import",
    (task) => {
      task.importPath = "semiotic/not-published"
    },
    /import|public/i
  ],
  [
    "wrong chart family",
    (task) => {
      task.importPath = "semiotic/ordinal"
    },
    /import|component|export/i
  ],
  [
    "relative package alias",
    (task) => {
      task.importPath = "./line"
    },
    /import|public/i
  ],
  [
    "example traversal",
    (task) => {
      task.examples[0].path = "../outside.ts"
    },
    /Invalid task source path/
  ],
  [
    "check traversal",
    (task) => {
      task.checks.unit = "docs/../../../outside.ts"
    },
    /Invalid task source path/
  ],
  [
    "missing example",
    (task) => {
      task.examples[0].path = "not-present.ts"
    },
    /Missing task source/
  ]
]) {
  test(`task admission rejects ${label}`, (t) => {
    const root = fixture(t)
    changeJSON(root, "ai/tasks/update-live-chart.json", change)
    assert.throws(() => buildTaskPackets(root), error)
  })
}

test("source paths reject POSIX and Windows escapes before reading", (t) => {
  const root = fixture(t)
  for (const path of [
    "/etc/passwd",
    "C:\\secret.txt",
    "c:/secret.txt",
    "C:secret.txt",
    "\\\\server\\share\\secret.txt",
    "\\secret.txt",
    "\\\\?\\C:\\secret.txt",
    "//server/share/secret.txt",
    "../outside.ts",
    "..\\outside.ts",
    "docs\\..\\outside.ts",
    "docs/../outside.ts",
    "docs/secret\0.txt",
    "",
    null
  ]) {
    assert.throws(() => readSource(root, path), /Invalid task source path/)
  }
})

test("source paths keep file and directory symlinks inside the checkout", (t) => {
  const parent = mkdtempSync(resolve(tmpdir(), "semiotic-task-source-"))
  t.after(() => rmSync(parent, { recursive: true, force: true }))
  const root = resolve(parent, "checkout")
  const outside = resolve(parent, "checkout-sibling")
  put(root, "docs/example.ts", "export const total = 60\n")
  put(outside, "secret.txt", "Do not embed outside files")
  symlinkSync(resolve(outside, "secret.txt"), resolve(root, "external.ts"))
  symlinkSync(outside, resolve(root, "external"), "junction")
  for (const path of ["external.ts", "external/secret.txt"]) {
    assert.throws(() => readSource(root, path), /Invalid task source path/)
  }
  symlinkSync(resolve(root, "docs/example.ts"), resolve(root, "internal.ts"))
  symlinkSync(root, resolve(parent, "checkout-link"), "junction")
  assert.equal(readSource(root, "docs/example.ts"), "export const total = 60\n")
  assert.equal(readSource(root, "internal.ts"), "export const total = 60\n")
  assert.equal(
    readSource(resolve(parent, "checkout-link"), "docs/example.ts"),
    "export const total = 60\n"
  )
})

test("release and direct publish check generated task freshness", () => {
  const { scripts } = JSON.parse(readSource(repository, "package.json"))
  assert.ok(
    scripts["release:check"].split(" && ").includes("npm run check:ai-tasks"),
    "release:check must refuse stale task packets"
  )
  // A direct `npm publish` runs the same gate list instead of a second,
  // hand-maintained copy of it.
  assert.equal(scripts.prepublishOnly, "npm run release:check")
})

for (const [path, change] of [
  [
    "ai/schema.json",
    (value) => {
      value.version = "0.0.0"
    }
  ],
  [
    "package-surface.manifest.json",
    (value) => {
      value.package.version = "0.0.0"
    }
  ],
  [
    "ai/surface-manifest.json",
    (value) => {
      value.version = "0.0.0"
    }
  ]
]) {
  test(`version skew in ${path} cannot produce apparently current guidance`, (t) => {
    const root = fixture(t)
    changeJSON(root, path, change)
    assert.throws(() => buildTaskPackets(root), /version/i)
  })
}

test("installed-version comparison rejects mismatches and keeps the packed/deployed parity boundary", (t) => {
  const packet = buildTaskPackets(fixture(t))[0]
  assert.throws(
    () => assertTaskVersion(packet, "0.0.0"),
    /Retrieve matching guidance and revalidate/
  )
  const result = assertTaskVersion(packet, packet.identity.packageVersion)
  assert.equal(result.packageVersionMatches, true)
  assert.match(
    result.availability,
    /does not establish packed or deployed parity/
  )
})

test("verification must match the task revision, include real passing counts and name its environment", (t) => {
  const root = fixture(t)
  const packets = buildTaskPackets(root)
  const packet = packets[0]
  const record = verification(root, packets)
  const revision = taskEvidenceIdentity(root).revisions[packet.id]
  assert.equal(
    evidenceFor(record, packet.id, revision, packet.evidence.checks).status,
    "supported-in-scope"
  )
  assert.notEqual(
    revision,
    packet.identity.sourceRevision,
    "a recorded run is bound to more than the packet identity"
  )
  assert.equal(
    evidenceFor(record, packet.id, "sha256:changed", packet.evidence.checks)
      .status,
    "stale"
  )
  assert.equal(
    evidenceFor(null, packet.id, revision, packet.evidence.checks).status,
    "proposed"
  )
  for (const change of [
    (value) => {
      value.runs[0].exitCode = 1
    },
    (value) => {
      value.runs[0].passed = 0
    },
    (value) => {
      delete value.runs[0].passed
    },
    (value) => {
      value.runs[0].passed = Number.NaN
    },
    (value) => {
      value.runs[0].skipped = 1
    },
    (value) => {
      value.runs = []
    },
    (value) => {
      delete value.runs[0].command
    },
    (value) => {
      delete value.environment
    },
    (value) => {
      value.verifiedAt = "not a date"
    },
    (value) => {
      value.runs[1].kind = "unit"
    },
    (value) => {
      delete value.runs[0].targets
    },
    (value) => {
      delete value.runs[0].passedByFile
    },
    (value) => {
      delete value.runs[0].passedByFile[packet.evidence.checks.unit]
    },
    (value) => {
      value.runs[0].targets = ["extra/other.test.ts"]
      value.runs[0].passedByFile = { "extra/other.test.ts": 5 }
    }
  ]) {
    const invalid = structuredClone(record)
    change(invalid)
    assert.throws(
      () =>
        evidenceFor(invalid, packet.id, revision, packet.evidence.checks),
      /verification|environment|run|command/i
    )
  }
})

function unitReport(root) {
  return {
    success: true,
    numPassedTests: 2,
    numTotalTests: 2,
    numFailedTests: 0,
    numFailedTestSuites: 0,
    numPendingTests: 0,
    numPendingTestSuites: 0,
    numTodoTests: 0,
    testResults: ["tests/values.test.ts", "tests/corrections.test.ts"].map(
      (file) => ({
        name: resolve(root, file),
        status: "passed",
        assertionResults: [{ title: "checks values", status: "passed" }]
      })
    )
  }
}

function browserReport(root) {
  return {
    config: { rootDir: resolve(root, "integration-tests") },
    errors: [],
    stats: { expected: 2, unexpected: 0, flaky: 0, skipped: 0 },
    suites: [
      {
        title: "live.spec.ts",
        file: "live.spec.ts",
        specs: [],
        suites: [
          {
            title: "live lifecycle",
            file: "live.spec.ts",
            specs: ["correction", "reconnect"].map((title) => ({
              title,
              file: "live.spec.ts",
              ok: true,
              tests: [
                {
                  expectedStatus: "passed",
                  status: "expected",
                  results: [{ status: "passed", errors: [] }]
                }
              ]
            }))
          }
        ]
      }
    ]
  }
}

test("report normalization binds unit assertions and nested browser results to repository file paths", (t) => {
  const root = fixture(t)
  assert.deepEqual(
    normalizeTaskRunReport(
      "unit",
      unitReport(root),
      ["tests/values.test.ts", "tests/corrections.test.ts"],
      root
    ),
    {
      passed: 2,
      skipped: 0,
      passedByFile: {
        "tests/values.test.ts": 1,
        "tests/corrections.test.ts": 1
      }
    }
  )
  assert.deepEqual(
    normalizeTaskRunReport(
      "browser",
      browserReport(root),
      ["integration-tests/live.spec.ts"],
      root
    ),
    {
      passed: 2,
      skipped: 0,
      passedByFile: { "integration-tests/live.spec.ts": 2 }
    }
  )
})

test("an entirely green report cannot support a declared check that did not run", (t) => {
  const root = fixture(t)
  assert.throws(
    () =>
      normalizeTaskRunReport(
        "unit",
        unitReport(root),
        ["extra/never-executed.test.ts"],
        root
      ),
    /did not run the declared unit check/
  )
  assert.throws(
    () =>
      normalizeTaskRunReport(
        "browser",
        browserReport(root),
        ["integration-tests/never-executed.spec.ts"],
        root
      ),
    /did not run the declared browser check/
  )
})

test("unit receipt rejects hidden skips, empty files and inaccurate aggregate counters", (t) => {
  const root = fixture(t)
  for (const change of [
    (report) => {
      report.testResults[0].assertionResults[0].status = "pending"
    },
    (report) => {
      report.testResults[0].assertionResults = []
    },
    (report) => {
      report.testResults[0].status = "failed"
    },
    (report) => {
      report.numPassedTests = 3
      report.numTotalTests = 3
    },
    (report) => {
      delete report.numPassedTests
    },
    (report) => {
      report.numPendingTests = 1
    },
    (report) => {
      report.success = false
    }
  ]) {
    const report = unitReport(root)
    change(report)
    assert.throws(
      () =>
        normalizeTaskRunReport("unit", report, ["tests/values.test.ts"], root),
      /verification|Verification/
    )
  }
})

test("expected browser failures and successful retries are not reported as verified passing behavior", (t) => {
  const root = fixture(t)
  for (const change of [
    (report) => {
      const result = report.suites[0].suites[0].specs[0].tests[0]
      result.expectedStatus = "failed"
      result.results[0].status = "failed"
    },
    (report) => {
      report.suites[0].suites[0].specs[0].tests[0].status = "flaky"
    },
    (report) => {
      report.suites[0].suites[0].specs[0].tests[0].results.unshift({
        status: "timedOut"
      })
    },
    (report) => {
      report.errors.push({ message: "Unhandled worker error" })
    },
    (report) => {
      report.stats.skipped = 1
    },
    (report) => {
      report.stats.expected = 3
    }
  ]) {
    const report = browserReport(root)
    change(report)
    assert.throws(
      () =>
        normalizeTaskRunReport(
          "browser",
          report,
          ["integration-tests/live.spec.ts"],
          root
        ),
      /verification|Verification/
    )
  }
})

test("verification runner executes relocated declared checks and records their individual results", (t) => {
  const root = fixture(t)
  const outsideUnit = "extra/relocated.test.ts"
  const outsideBrowser = "extra/relocated.spec.ts"
  put(root, outsideUnit, "// Test fixture for runner target selection.\n")
  put(root, outsideBrowser, "// Test fixture for runner target selection.\n")
  changeJSON(root, "ai/tasks/update-live-chart.json", (task) => {
    task.checks.unit = outsideUnit
    task.checks.browser = outsideBrowser
  })
  // Stub processes exercise orchestration and report admission without starting
  // real browsers or portraying these fixture receipts as observed product tests.
  put(
    root,
    "node_modules/vitest/vitest.mjs",
    `
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
const targets = process.argv.slice(2).filter(argument => argument.startsWith("./"))
const report = ${JSON.stringify(unitReport(root))}
report.testResults = targets.map(file => ({ name: resolve(file), status: "passed", assertionResults: [{ status: "passed" }] }))
report.numTotalTests = report.numPassedTests = targets.length
writeFileSync(process.argv.find(argument => argument.startsWith("--outputFile=")).slice(13), JSON.stringify(report))
`
  )
  put(
    root,
    "node_modules/@playwright/test/cli.js",
    `
const { writeFileSync } = require("node:fs")
const targets = process.argv.slice(2).filter(argument => argument.startsWith("./"))
const report = ${JSON.stringify(browserReport(root))}
report.config.rootDir = process.cwd()
report.stats.expected = targets.length
report.suites = targets.map(file => ({ file, specs: [{ file, ok: true, tests: [{ expectedStatus: "passed", status: "expected", results: [{ status: "passed" }] }] }] }))
writeFileSync(process.env.PLAYWRIGHT_JSON_OUTPUT_NAME, JSON.stringify(report))
`
  )
  const result = spawnSync(process.execPath, ["scripts/verify-ai-tasks.mjs"], {
    cwd: root,
    encoding: "utf8"
  })
  assert.equal(result.status, 0, result.stderr)
  const receipt = JSON.parse(readSource(root, "ai/tasks/verification.json"))
  const unit = receipt.runs.find((run) => run.kind === "unit")
  const browser = receipt.runs.find((run) => run.kind === "browser")
  assert.ok(unit.targets.includes(outsideUnit))
  assert.ok(browser.targets.includes(outsideBrowser))
  assert.equal(unit.passedByFile[outsideUnit], 1)
  assert.equal(browser.passedByFile[outsideBrowser], 1)
})

test("CLI generation is reproducible and --check detects drift without overwriting it", (t) => {
  const root = fixture(t)
  const run = (...args) =>
    spawnSync(process.execPath, [GENERATOR, ...args], {
      cwd: root,
      encoding: "utf8"
    })
  const generated = run()
  assert.equal(generated.status, 0, generated.stderr)
  assert.equal(run("--check").status, 0)
  const path = "ai/task-packets/update-live-chart.md"
  const original = readFileSync(resolve(root, path), "utf8")
  const repeated = run()
  assert.equal(repeated.status, 0, repeated.stderr)
  assert.equal(readSource(root, path), original)
  put(root, path, "Manual stale edit.\n")
  const checked = run("--check")
  assert.equal(checked.status, 1)
  assert.match(checked.stderr, /Task packets are stale/)
  assert.equal(readSource(root, path), "Manual stale edit.\n")
  const unknown = run("--force")
  assert.equal(unknown.status, 1)
  assert.match(unknown.stderr, /Usage:/)
  assert.equal(readSource(root, path), "Manual stale edit.\n")
  assert.equal(run().status, 0)
  assert.equal(readSource(root, path), original)
})
