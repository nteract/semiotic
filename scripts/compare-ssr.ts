import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { loadConsumerContracts } from "./check-consumer-contracts"
import {
  acquireArtifact,
  checkoutIdentity,
  digest,
  installConsumer,
  runtimePins
} from "./ssr-comparison/artifacts"
import { compareFixture, runRenderer } from "./ssr-comparison/compare"
import { normalizationVersion, stableJson } from "./ssr-comparison/normalize"
import { parseOptions } from "./ssr-comparison/options"
import { writeReport, type Report } from "./ssr-comparison/report"
import { inspectSupport } from "./ssr-comparison/support"
import type { Fixture, SideResult } from "./ssr-comparison/types"

async function main() {
  const options = parseOptions(process.argv.slice(2))
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
  const work = mkdtempSync(join(tmpdir(), "semiotic-ssr-comparison-"))
  mkdirSync(options.outDir, { recursive: true })
  const report: Report = {
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    status: "running",
    mode: "report",
    settings: {
      registry: options.registry,
      precision: options.precision ?? null,
      normalizationVersion,
      repetitions: 2,
      environment: { NODE_ENV: "production", TZ: "UTC", LANG: "en_US.UTF-8" }
    },
    tooling: {
      ...checkoutIdentity(root),
      node: process.version,
      lockSha256: digest(readFileSync(join(root, "package-lock.json")))
    },
    artifacts: {},
    runtime: {},
    fixtures: [],
    errors: []
  }
  let phase = "fixtures"
  try {
    const fixtures: Fixture[] = loadConsumerContracts(root)
      .map(({ contract, config }) => ({
        id: contract.id,
        component: config.component,
        props: config.props,
        coveredProps: contract.coveredProps,
        sha256: digest(stableJson(config))
      }))
      .filter(
        (fixture) => !options.fixtures || options.fixtures.includes(fixture.id)
      )
    if (
      !fixtures.length ||
      options.fixtures?.some(
        (id) => !fixtures.some((fixture) => fixture.id === id)
      )
    )
      throw new Error("Empty or unknown fixture selection")
    writeFileSync(
      join(options.outDir, "fixtures.json"),
      JSON.stringify(fixtures, null, 2) + "\n"
    )
    const pins = runtimePins(root)
    report.runtime.pins = pins
    const results: Record<string, Record<string, SideResult>> = {}
    let previousRuntime: unknown
    for (const side of ["previous", "current"] as const) {
      phase = `${side}:acquisition`
      console.log(`${phase}: ${options[side]}`)
      const artifact = acquireArtifact(
        options[side],
        side,
        work,
        options.registry
      )
      // Preserve exact archives and lockfiles alongside the report, even when a
      // later render fails. Local evidence never depends on a deleted temp path.
      cpSync(artifact.tarball, join(options.outDir, `${side}.tgz`))
      report.artifacts[side] = { ...artifact, tarball: `${side}.tgz` }
      phase = `${side}:runtime-installation`
      const { consumer, runtime } = installConsumer(
        artifact,
        work,
        side,
        options.registry,
        pins
      )
      cpSync(
        join(consumer, "package-lock.json"),
        join(options.outDir, `${side}.runtime-lock.json`)
      )
      report.runtime[side] = { packages: runtime }
      if (side === "previous") previousRuntime = runtime
      else if (stableJson(previousRuntime) !== stableJson(runtime))
        throw new Error(
          "Artifacts resolved different runtime dependency trees; choose a baseline compatible with the pinned runtime (see both lockfiles)"
        )
      phase = `${side}:support-inspection`
      const support = inspectSupport(
        join(consumer, "node_modules/semiotic"),
        fixtures
      )
      phase = `${side}:render`
      const supported = fixtures.filter(
        (fixture) => !support.get(fixture.id)!.length
      )
      results[side] = Object.fromEntries(
        fixtures
          .filter((fixture) => support.get(fixture.id)!.length)
          .map((fixture) => [
            fixture.id,
            { status: "unsupported", reasons: support.get(fixture.id) }
          ])
      )
      try {
        const rendered = runRenderer(
          consumer,
          supported,
          join(root, "scripts/ssr-comparison/render-worker.ts")
        )
        Object.assign(results[side], rendered.results)
        report.runtime[side] = {
          packages: runtime,
          ...rendered.runtime,
          evidenceAvailable: rendered.evidenceAvailable,
          resolvedEntry: rendered.entry,
          packageRoot: rendered.packageRoot
        }
      } catch (error) {
        for (const fixture of supported)
          results[side][fixture.id] = { status: "error", error: String(error) }
      } finally {
        if (existsSync(join(consumer, "render.log")))
          cpSync(
            join(consumer, "render.log"),
            join(options.outDir, `${side}.render.log`)
          )
      }
    }
    phase = "comparison"
    report.fixtures = fixtures.map((fixture) =>
      compareFixture(
        fixture,
        results.previous[fixture.id],
        results.current[fixture.id],
        options.precision
      )
    )
    report.status = report.fixtures.some(
      (fixture) => fixture.status === "error"
    )
      ? "error"
      : report.fixtures.some((fixture) => fixture.status === "different")
        ? "different"
        : report.fixtures.some((fixture) => fixture.status === "unsupported")
          ? "unsupported"
          : "equal"
  } catch (error) {
    report.errors.push({ phase, message: String(error) })
    report.status = "error"
  } finally {
    writeReport(report, options.outDir)
    rmSync(work, { recursive: true, force: true })
  }
  console.log(
    `SSR comparison: ${report.status}; ${join(options.outDir, "report.md")}`
  )
  for (const error of report.errors)
    console.error(`${error.phase}: ${error.message}`)
  process.exitCode = report.status === "error" ? 1 : 0
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
