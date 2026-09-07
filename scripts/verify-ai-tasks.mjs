#!/usr/bin/env node
// Records observed source checks, never installed/deployed parity or adoption.
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { buildTaskPackets, EVIDENCE_PATH } from "./lib/ai-task-packets.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function reportPath(repository, base, file) {
  if (typeof file !== "string" || !file)
    throw new Error("Verification report is missing its source file")
  const path = relative(repository, resolve(base, file)).split(sep).join("/")
  if (!path || path.startsWith("../"))
    throw new Error(
      `Verification report file is outside the repository: ${file}`
    )
  return path
}

/** Bind observed assertions to the declared files, not merely a green aggregate. */
export function normalizeTaskRunReport(
  kind,
  report,
  targets,
  repository = root
) {
  const passedByFile = {}
  let reportedPassed
  const add = (file, count) => {
    passedByFile[file] = (passedByFile[file] ?? 0) + count
  }
  if (kind === "unit") {
    reportedPassed = report.numPassedTests
    if (
      report.success !== true ||
      report.numFailedTests !== 0 ||
      report.numFailedTestSuites !== 0 ||
      report.numPendingTests !== 0 ||
      report.numPendingTestSuites !== 0 ||
      report.numTodoTests !== 0 ||
      report.numTotalTests !== reportedPassed ||
      !Array.isArray(report.testResults)
    )
      throw new Error("Unit verification report did not fully pass")
    for (const file of report.testResults) {
      if (
        file.status !== "passed" ||
        !Array.isArray(file.assertionResults) ||
        !file.assertionResults.length ||
        file.assertionResults.some((assertion) => assertion.status !== "passed")
      )
        throw new Error(
          `Unit verification has failed, skipped or empty assertions: ${file.name}`
        )
      add(
        reportPath(repository, repository, file.name),
        file.assertionResults.length
      )
    }
  } else if (kind === "browser") {
    reportedPassed = report.stats?.expected
    if (
      report.stats?.unexpected !== 0 ||
      report.stats?.flaky !== 0 ||
      report.stats?.skipped !== 0 ||
      !Array.isArray(report.errors) ||
      report.errors.length ||
      !Array.isArray(report.suites) ||
      typeof report.config?.rootDir !== "string"
    )
      throw new Error("Browser verification report did not fully pass")
    const visit = (suites) => {
      for (const suite of suites) {
        for (const spec of suite.specs ?? []) {
          if (!spec.ok || !Array.isArray(spec.tests) || !spec.tests.length)
            throw new Error(
              `Browser verification has failed or empty assertions: ${spec.title}`
            )
          for (const observed of spec.tests) {
            if (
              observed.status !== "expected" ||
              observed.expectedStatus !== "passed" ||
              !Array.isArray(observed.results) ||
              !observed.results.length ||
              observed.results.some(
                (result) =>
                  result.status !== "passed" ||
                  result.error ||
                  result.errors?.length
              )
            )
              throw new Error(
                `Browser verification has skipped, flaky or expected-failure assertions: ${spec.title}`
              )
          }
          add(
            reportPath(
              repository,
              report.config.rootDir,
              spec.file ?? suite.file
            ),
            spec.tests.length
          )
        }
        visit(suite.suites ?? [])
      }
    }
    visit(report.suites)
  } else {
    throw new Error(`Unknown task verification kind: ${kind}`)
  }
  const passed = Object.values(passedByFile).reduce(
    (sum, count) => sum + count,
    0
  )
  if (
    !Number.isInteger(reportedPassed) ||
    reportedPassed < 1 ||
    passed !== reportedPassed
  )
    throw new Error(
      "Verification aggregate does not match the observed passing assertions"
    )
  for (const target of targets) {
    if (!Number.isInteger(passedByFile[target]) || passedByFile[target] < 1)
      throw new Error(
        `Verification did not run the declared ${kind} check: ${target}`
      )
  }
  return { passed, skipped: 0, passedByFile }
}

export function verifyTasks() {
  const temp = mkdtempSync(resolve(tmpdir(), "semiotic-task-checks-"))
  try {
    if (process.argv.length > 2)
      throw new Error("Usage: node scripts/verify-ai-tasks.mjs")
    // The browser must exercise the current generated guidance as well as its JSX.
    execFileSync(process.execPath, ["scripts/generate-ai-task-packets.mjs"], {
      cwd: root,
      stdio: "inherit"
    })
    const before = buildTaskPackets(root, { verification: null })
    const unitReport = resolve(temp, "unit.json")
    const browserReport = resolve(temp, "browser.json")
    const targets = (kind) =>
      [...new Set(before.map((packet) => packet.evidence.checks[kind]))].sort()
    const unitTargets = targets("unit")
    const browserTargets = targets("browser")
    const commands = [
      {
        kind: "unit",
        name: "Task source units",
        targets: unitTargets,
        args: [
          "node_modules/vitest/vitest.mjs",
          "run",
          ...unitTargets.map((path) => `./${path}`),
          "--reporter=default",
          "--reporter=json",
          `--outputFile=${unitReport}`,
          "--allowOnly=false"
        ],
        report: unitReport
      },
      {
        kind: "browser",
        name: "Task browser behavior",
        targets: browserTargets,
        args: [
          "node_modules/@playwright/test/cli.js",
          "test",
          "--config",
          "playwright.docs-examples.config.ts",
          ...browserTargets.map((path) => `./${path}`),
          "--reporter=list,json",
          "--forbid-only"
        ],
        report: browserReport
      }
    ]
    const runs = commands.map((command) => {
      console.log(`Running ${command.name}…`)
      execFileSync(process.execPath, command.args, {
        cwd: root,
        stdio: "inherit",
        timeout: 600_000,
        env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: browserReport }
      })
      const report = JSON.parse(readFileSync(command.report, "utf8"))
      const observed = normalizeTaskRunReport(
        command.kind,
        report,
        command.targets
      )
      return {
        kind: command.kind,
        targets: command.targets,
        name: command.name,
        command: `node ${command.args.join(" ")}`.replaceAll(
          temp,
          "<temporary-report-directory>"
        ),
        exitCode: 0,
        ...observed
      }
    })
    const taskRevisions = Object.fromEntries(
      before.map((task) => [task.id, task.identity.sourceRevision])
    )
    const after = buildTaskPackets(root, { verification: null })
    if (
      after.some(
        (task) => task.identity.sourceRevision !== taskRevisions[task.id]
      )
    )
      throw new Error(
        "Task sources changed during verification. Rerun before recording evidence."
      )
    const record = {
      schemaVersion: 1,
      scope: "source-only",
      verifiedAt: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
        browser: "Playwright Chromium"
      },
      taskRevisions,
      runs,
      limits: [
        "No paid model runs or measured adoption improvement.",
        "No published package/deployment or independent human review is established."
      ]
    }
    writeFileSync(
      resolve(root, EVIDENCE_PATH),
      JSON.stringify(record, null, 2) + "\n"
    )
    execFileSync(process.execPath, ["scripts/generate-ai-task-packets.mjs"], {
      cwd: root,
      stdio: "inherit"
    })
    console.log(
      "Recorded passing source checks and regenerated evidence-scoped task views."
    )
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  verifyTasks()
