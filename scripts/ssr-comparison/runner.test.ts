import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { test } from "node:test"
import { acquireArtifact } from "./artifacts"
import { compareFixture, runRenderer } from "./compare"
import { parseOptions } from "./options"
import { inspectSupport } from "./support"
import { writeReport, type Report } from "./report"
import type { Fixture } from "./types"

const root = resolve(import.meta.dirname, "../..")
const worker = join(root, "scripts/ssr-comparison/render-worker.ts")
const fixture: Fixture = {
  id: "fixture",
  component: "Chart",
  props: { data: [{ x: 1 }], frameProps: { extent: [0, 5] } },
  coveredProps: ["frameProps.extent"],
  sha256: "config"
}
function temporary(run: (dir: string) => void) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "ssr-comparison-test-")))
  try {
    run(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
function write(dir: string, file: string, contents: string) {
  mkdirSync(dirname(join(dir, file)), { recursive: true })
  writeFileSync(join(dir, file), contents)
}
function artifact(dir: string, label: string) {
  write(
    dir,
    "package.json",
    JSON.stringify({
      name: "semiotic",
      version: "1.0.0",
      type: "module",
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        "./server": "./dist/server.js",
        "./package.json": "./package.json"
      }
    })
  )
  write(dir, "dist/index.js", "export const Chart = () => null")
  write(
    dir,
    "dist/index.d.ts",
    "export declare function Chart(props: { data: unknown[]; frameProps?: Partial<{extent: number[]}> }): unknown"
  )
  write(
    dir,
    "dist/server.js",
    `
    export function renderChartWithEvidence(_name, props) {
      if (props.fail) throw new Error('fixture failure')
      const x = props.data[0].x++
      return {svg:'<svg xmlns="http://www.w3.org/2000/svg"><text>${label}</text><circle r="'+x+'"/></svg>', evidence:{markCount:1, xDomain:[0,5]}}
    }`
  )
  write(
    dir,
    "ai/schema.json",
    JSON.stringify({
      tools: [
        {
          function: {
            name: "Chart",
            parameters: {
              type: "object",
              properties: { data: { type: "array" } }
            }
          }
        }
      ]
    })
  )
}
function consumer(dir: string, label: string) {
  artifact(join(dir, "node_modules/semiotic"), label)
  for (const name of ["react", "react-dom"])
    write(
      dir,
      `node_modules/${name}/package.json`,
      JSON.stringify({ name, version: "19.3.0" })
    )
  write(dir, "package.json", '{"type":"module"}')
}

test("separate artifact processes render their own implementation and clone mutable inputs", () =>
  temporary((dir) => {
    const previous = join(dir, "previous"),
      current = join(dir, "current")
    consumer(previous, "old")
    consumer(current, "new")
    const old = runRenderer(previous, [fixture], worker)
    const next = runRenderer(current, [fixture], worker)
    assert.ok(old.entry.startsWith(join(previous, "node_modules/semiotic")))
    assert.ok(next.entry.startsWith(join(current, "node_modules/semiotic")))
    assert.match(old.results.fixture.renders![0].svg, />old</)
    assert.match(next.results.fixture.renders![0].svg, />new</)
    assert.equal(
      compareFixture(fixture, old.results.fixture, old.results.fixture).status,
      "equal"
    )
    assert.equal(
      compareFixture(fixture, old.results.fixture, next.results.fixture).status,
      "different"
    )
    const repeat = runRenderer(previous, [fixture], worker)
    assert.deepEqual(repeat.results, old.results)
    const failure = runRenderer(
      previous,
      [{ ...fixture, props: { ...fixture.props, fail: true } }],
      worker
    )
    assert.equal(failure.results.fixture.status, "error")
  }))

test("older render-only APIs record unavailable evidence explicitly", () =>
  temporary((dir) => {
    consumer(dir, "legacy")
    write(
      dir,
      "node_modules/semiotic/dist/server.js",
      'export function renderChart() { return \'<svg xmlns="http://www.w3.org/2000/svg"><circle r="2"/></svg>\' }'
    )
    const result = runRenderer(dir, [fixture], worker)
    assert.equal(result.evidenceAvailable, false)
    assert.equal(result.results.fixture.renders![0].evidence, null)
    assert.equal(
      compareFixture(fixture, result.results.fixture, result.results.fixture)
        .evidenceComparison,
      "unavailable"
    )
  }))

test("artifact declarations distinguish a new component/nested prop from supported cases", () =>
  temporary((dir) => {
    artifact(dir, "test")
    assert.deepEqual(inspectSupport(dir, [fixture]).get(fixture.id), [])
    assert.match(
      inspectSupport(dir, [{ ...fixture, component: "NewChart" }]).get(
        fixture.id
      )![0],
      /Component NewChart is absent/
    )
    const changed = {
      ...fixture,
      props: { ...fixture.props, newProp: true },
      coveredProps: ["frameProps.newExtent"]
    }
    assert.equal(inspectSupport(dir, [changed]).get(fixture.id)!.length, 2)
    write(
      dir,
      "dist/index.d.ts",
      "export declare const Chart: any; export interface ChartProps { data: unknown[]; frameProps?: Partial<{ extent: number[] }> }"
    )
    assert.deepEqual(
      inspectSupport(dir, [fixture]).get(fixture.id),
      [],
      "public Props types remain inspectable without ambient React wrappers"
    )
    rmSync(join(dir, "dist/index.d.ts"))
    assert.throws(
      () => inspectSupport(dir, [fixture]),
      /no public declarations/
    )
  }))

test("built and tarball acquisition uses a real archive even with inherited npm dry-run", () =>
  temporary((dir) => {
    const built = join(dir, "built")
    artifact(built, "packed")
    const prior = process.env.npm_config_dry_run
    process.env.npm_config_dry_run = "true"
    try {
      const current = acquireArtifact(
        built,
        "current",
        dir,
        "https://registry.npmjs.org"
      )
      const previous = acquireArtifact(
        current.tarball,
        "previous",
        dir,
        "https://registry.npmjs.org"
      )
      assert.equal(current.integrity, previous.integrity)
      assert.equal(current.sha256, previous.sha256)
      assert.equal(previous.version, "1.0.0")
      assert.match(
        readFileSync(join(previous.packageRoot, "dist/server.js"), "utf8"),
        /packed/
      )
      assert.throws(
        () =>
          acquireArtifact(
            join(dir, "missing.tgz"),
            "previous",
            dir,
            "https://registry.npmjs.org"
          ),
        /expected/
      )
    } finally {
      if (prior === undefined) delete process.env.npm_config_dry_run
      else process.env.npm_config_dry_run = prior
    }
  }))

test("reports preserve raw and normalized pairs and evidence when outputs differ or fail", () =>
  temporary((dir) => {
    consumer(join(dir, "a"), "before")
    consumer(join(dir, "b"), "after")
    const previous = runRenderer(join(dir, "a"), [fixture], worker).results
      .fixture
    const current = runRenderer(join(dir, "b"), [fixture], worker).results
      .fixture
    const report: Report = {
      schemaVersion: 1,
      startedAt: "now",
      mode: "report",
      status: "different",
      settings: {},
      tooling: {},
      artifacts: {},
      runtime: {},
      errors: [],
      fixtures: [compareFixture(fixture, previous, current)]
    }
    writeReport(report, dir)
    const saved = JSON.parse(readFileSync(join(dir, "report.json"), "utf8"))
    assert.equal(saved.summary.different, 1)
    assert.match(
      readFileSync(join(dir, saved.fixtures[0].previous.files.svg), "utf8"),
      />before</
    )
    assert.match(
      readFileSync(
        join(dir, saved.fixtures[0].current.files.normalized),
        "utf8"
      ),
      />after</
    )
    assert.equal(
      JSON.parse(
        readFileSync(
          join(dir, saved.fixtures[0].current.files.evidence),
          "utf8"
        )
      ).markCount,
      1
    )
    assert.match(
      readFileSync(join(dir, "report.md"), "utf8"),
      /previous\.raw\.svg/
    )
    current.renders!.forEach((render) => {
      render.svg = "<svg>broken"
    })
    report.fixtures = [compareFixture(fixture, previous, current)]
    report.status = "error"
    writeReport(report, dir)
    const failed = JSON.parse(readFileSync(join(dir, "report.json"), "utf8"))
    assert.equal(failed.summary.error, 1)
    assert.equal(failed.fixtures[0].current.files.normalized, undefined)
    assert.equal(
      existsSync(join(dir, "fixtures/fixture/current.normalized.svg")),
      false
    )
    assert.equal(
      readFileSync(join(dir, failed.fixtures[0].current.files.svg), "utf8"),
      "<svg>broken"
    )
  }))

test("CLI acquisition failures retain error reports and never count as rendering differences", () =>
  temporary((dir) => {
    const fakeBin = join(dir, "bin")
    write(
      fakeBin,
      "npm",
      "#!/bin/sh\necho 'Registry unavailable ENOTFOUND' >&2\nexit 1\n"
    )
    chmodSync(join(fakeBin, "npm"), 0o755)
    const out = join(dir, "out")
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/compare-ssr.ts",
        "--previous",
        "1.0.0",
        "--out-dir",
        out
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}` }
      }
    )
    assert.equal(result.status, 1, result.stderr)
    const report = JSON.parse(readFileSync(join(out, "report.json"), "utf8"))
    assert.equal(report.status, "error")
    assert.equal(report.errors[0].phase, "previous:acquisition")
    assert.match(report.errors[0].message, /Registry unavailable/)
    assert.equal(report.summary.equal, 0)
    assert.equal(report.summary.different, 0)
  }))

test("baseline selection is explicit and options reject ambiguous or unsafe inputs", () => {
  assert.throws(() => parseOptions([]), /--previous/)
  assert.throws(
    () => parseOptions(["--previous", "1.0.0", "--precision", "-1"]),
    /precision/
  )
  assert.throws(
    () => parseOptions(["--previous", "1.0.0", "--previous", "2.0.0"]),
    /repeated/
  )
  assert.throws(
    () =>
      parseOptions([
        "--previous",
        "1.0.0",
        "--registry",
        "https://token:secret@example.com"
      ]),
    /credentials/
  )
  assert.equal(parseOptions(["--previous", "1.0.0"]).precision, undefined)
})
