import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import test from "node:test"
import { runInNewContext } from "node:vm"

const repo = new URL("../", import.meta.url)
const read = (path) => readFileSync(new URL(path, repo), "utf8")
const versions = [
  "3.14.0",
  "3.14.0-beta.1",
  "3.14.0+build.001",
  "3.14.0+build-alpha.1",
  "3.14.0-alpha.1+build.001",
  "3.14.0-rc.2+Build.001",
  "3.14.0-next.1+build.001"
]
const malformed = [
  "3.14.0+",
  "3.14.0+build..001",
  "3.14.0+.build",
  "3.14.0+build.",
  "3.14.0+build_001",
  "3.14.0+build+001"
]
const readJson = (directory, path) =>
  JSON.parse(readFileSync(join(directory, path), "utf8"))
const writeJson = (directory, path, value) => {
  mkdirSync(dirname(join(directory, path)), { recursive: true })
  writeFileSync(join(directory, path), `${JSON.stringify(value, null, 2)}\n`)
}

function fixture(t, version) {
  const directory = mkdtempSync(join(tmpdir(), "semiotic-release-version-"))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  for (const path of [
    "scripts/check-release-version-alignment.mjs",
    "scripts/sync-release-version.mjs",
    "scripts/prepare-cloud-run-release.mjs",
    "scripts/lib/cloud-run-manifest.mjs",
    "deploy/cloud-run/package.json",
    "deploy/cloud-run/.gcloudignore"
  ]) {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    copyFileSync(new URL(path, repo), join(directory, path))
  }
  const scripts = JSON.parse(read("package.json")).scripts
  writeJson(directory, "package.json", {
    name: "semiotic",
    version,
    scripts: {
      "docs:api": scripts["docs:api"],
      "docs:api:json": scripts["docs:api:json"]
    }
  })
  writeJson(directory, "package-lock.json", {
    version,
    packages: { "": { version } }
  })
  writeJson(directory, "ai/schema.json", { version, preserved: "schema" })
  writeJson(directory, "server.json", {
    version,
    packages: [{ registryType: "npm", identifier: "semiotic", version }],
    preserved: "server"
  })
  writeJson(directory, "ai/surface-manifest.json", { version })
  for (const path of [
    "package-surface.manifest.json",
    "benchmarks/setup/cold-consumer-imports.json"
  ]) {
    writeJson(directory, path, { package: { version } })
  }
  writeFileSync(join(directory, "README.md"), `## What's New in ${version}\n`)
  writeFileSync(
    join(directory, "CHANGELOG.md"),
    `## [${version}] - 2026-11-08\n`
  )
  return directory
}

function runScript(directory, script, args = [], env = process.env) {
  const result = spawnSync(
    process.execPath,
    [join(directory, "scripts", script), ...args],
    {
      cwd: directory,
      env,
      encoding: "utf8",
      timeout: 10_000
    }
  )
  assert.ifError(result.error)
  return result
}

test("metadata synchronization and source validation retain complete release versions", (t) => {
  for (const version of versions) {
    const directory = fixture(t, version)
    const schema = readJson(directory, "ai/schema.json")
    const server = readJson(directory, "server.json")
    writeJson(directory, "ai/schema.json", { ...schema, version: "3.13.3" })
    writeJson(directory, "server.json", {
      ...server,
      version: "3.13.3",
      packages: [{ ...server.packages[0], version: "3.13.3" }]
    })
    const sync = runScript(directory, "sync-release-version.mjs", [version])
    assert.equal(sync.status, 0, sync.stderr)
    assert.deepEqual(readJson(directory, "ai/schema.json"), schema)
    assert.deepEqual(readJson(directory, "server.json"), server)
    for (const suffix of ["", " - 2026-11-08"]) {
      writeFileSync(
        join(directory, "CHANGELOG.md"),
        `## [${version}]${suffix}\n`
      )
      const check = runScript(directory, "check-release-version-alignment.mjs")
      assert.equal(check.status, 0, check.stderr)
      assert.ok(check.stdout.includes(`identify ${version}`))
    }
  }
})

test("downstream guards reject malformed build metadata before synchronization", (t) => {
  for (const version of malformed) {
    const directory = fixture(t, version)
    const before = readJson(directory, "ai/schema.json")
    for (const [script, args, error] of [
      ["sync-release-version.mjs", [version], /Usage:/],
      ["check-release-version-alignment.mjs", [], /invalid release version/],
      ["prepare-cloud-run-release.mjs", [], /Invalid release version/]
    ]) {
      const result = runScript(directory, script, args)
      assert.equal(result.status, 1, `${script}: ${result.stderr}`)
      assert.match(result.stderr, error)
    }
    assert.deepEqual(readJson(directory, "ai/schema.json"), before)
  }
})

test("build metadata identity and exact changelog headings remain enforced", (t) => {
  const version = "3.14.0+build.001"
  const directory = fixture(t, version)
  for (const heading of [
    "## [3.14.0] - 2026-11-08",
    "## [3.14.0+build.002] - 2026-11-08",
    "## [3.14.0build.001] - 2026-11-08",
    `## [${version}] - invalid-date`,
    `## [${version}] extra text`
  ]) {
    writeFileSync(join(directory, "CHANGELOG.md"), `${heading}\n`)
    const check = runScript(directory, "check-release-version-alignment.mjs")
    assert.equal(check.status, 1)
    assert.match(check.stderr, /CHANGELOG.md must contain/)
  }
  writeFileSync(join(directory, "CHANGELOG.md"), `## [${version}]\n`)
  const lock = readJson(directory, "package-lock.json")
  writeJson(directory, "package-lock.json", {
    ...lock,
    version: "3.14.0+build.002"
  })
  const sync = runScript(directory, "sync-release-version.mjs", [version])
  assert.equal(sync.status, 1)
  assert.match(sync.stderr, /npm version must update/)
  const check = runScript(directory, "check-release-version-alignment.mjs")
  assert.equal(check.status, 1)
  assert.match(check.stderr, /package-lock.json#version must be/)
})

test("Cloud Run preparation preserves build metadata in the exact dependency and evidence", (t) => {
  const version = "3.14.0+build.001"
  const directory = fixture(t, version)
  const bin = join(directory, "bin")
  mkdirSync(bin)
  // Only npm is stubbed: execute the actual preparation and manifest validator
  // with a locally supplied public-registry response and generated lock fixture.
  writeFileSync(
    join(bin, "npm"),
    `#!${process.execPath}
const assert = require("node:assert/strict")
const fs = require("node:fs")
const args = process.argv.slice(2)
const version = ${JSON.stringify(version)}
assert.ok(args.includes("--registry=https://registry.npmjs.org"))
if (args[0] === "install") {
  assert.ok(args.includes("--package-lock-only"))
  assert.ok(args.includes("--ignore-scripts"))
  const { dependencies } = JSON.parse(fs.readFileSync("package.json", "utf8"))
  assert.equal(dependencies.semiotic, version)
  const packages = { "": { dependencies } }
  for (const [name, dependencyVersion] of Object.entries(dependencies)) {
    packages["node_modules/" + name] = {
      version: dependencyVersion,
      resolved: "https://registry.npmjs.org/" + name + "/fixture.tgz",
      integrity: "sha512-fixture"
    }
  }
  fs.writeFileSync("package-lock.json", JSON.stringify({ lockfileVersion: 3, packages }))
} else {
  assert.deepEqual(args.slice(0, 2), ["view", "semiotic@" + version])
  assert.ok(["version", "dist.integrity"].includes(args[2]))
  console.log(JSON.stringify(args[2] === "version" ? version : "sha512-fixture"))
}
`,
    { mode: 0o755 }
  )
  const result = runScript(
    directory,
    "prepare-cloud-run-release.mjs",
    [
      "--output-dir",
      join(directory, "prepared"),
      "--expected-integrity",
      "sha512-fixture"
    ],
    { ...process.env, PATH: `${bin}:${process.env.PATH}` }
  )
  assert.equal(result.status, 0, result.stderr)
  assert.equal(
    readJson(directory, "prepared/package.json").dependencies.semiotic,
    version
  )
  const evidence = readJson(
    directory,
    "prepared/semiotic-cloud-run-release.provenance.json"
  )
  assert.equal(evidence.package, `semiotic@${version}`)
  assert.equal(evidence.npmIntegrity, "sha512-fixture")
})

test("previous-release selectors retain build metadata and reject malformed tags", () => {
  const compatibility = read("scripts/check-api-compatibility.mjs").match(
    / {2}const versionMatch = [\s\S]*? {2}const previousVersion = versionMatch\[1\]/
  )?.[0]
  assert.ok(compatibility)
  const benchmark = read("scripts/bench-pr-vs-main.mjs").match(
    /function previousReleaseTag\(\) \{[\s\S]*?\n\}/
  )?.[0]
  assert.ok(benchmark)
  for (const version of versions) {
    for (const against of [version, `v${version}`]) {
      assert.equal(
        runInNewContext(`${compatibility}\npreviousVersion`, { against }),
        version
      )
    }
    const tags = [
      `v${version}`,
      "v3.14.0+broken..build",
      "v3.13.3+build.001",
      "v3.13.2"
    ]
    const previous = runInNewContext(`${benchmark}\npreviousReleaseTag()`, {
      packageVersion: version,
      console: { log() {} },
      run() {},
      output(_command, args) {
        if (args[0] === "tag") return tags.join("\n")
        if (args[0] === "rev-parse")
          return args[1] === "HEAD" ? "head-sha" : "false"
        assert.equal(args[0], "rev-list")
        return args[3] === tags[0] ? "head-sha" : "older-sha"
      }
    })
    assert.equal(previous, tags[2])
  }
  for (const version of malformed) {
    assert.throws(
      () => runInNewContext(compatibility, { against: `v${version}` }),
      /requires a published semver tag/
    )
  }
})

test("release-branch calculation accepts a current build version and produces the next stable version", () => {
  const calculation = read("scripts/create-release-branch.sh").match(
    /VERSION="\$\(node -e '\n([\s\S]*?)\n' "\$CURRENT_VERSION" "\$BUMP_TYPE"\)"/
  )?.[1]
  assert.ok(calculation)
  for (const version of versions) {
    for (const [bump, expected] of [
      ["major", "4.0.0"],
      ["minor", "3.15.0"],
      ["patch", "3.14.1"]
    ]) {
      let actual
      runInNewContext(calculation, {
        process: {
          argv: ["node", version, bump],
          stdout: {
            write(value) {
              actual = value
            }
          }
        }
      })
      assert.equal(actual, expected)
    }
  }
  for (const version of malformed) {
    assert.throws(
      () =>
        runInNewContext(calculation, {
          process: { argv: ["node", version, "patch"] }
        }),
      /Unsupported current version/
    )
  }
})

test("GitHub Release notes match the complete version literally", () => {
  const extraction = read(".github/workflows/release.yml").match(
    /awk -v ver="\$VERSION" '([\s\S]*?)' CHANGELOG.md/
  )?.[1]
  assert.ok(extraction)
  for (const version of versions) {
    const changelog = [
      `## [${version.replaceAll(".", "x").replace("+", "")}]`,
      "wrong release",
      `## [${version}] - 2026-11-08`,
      "expected release notes",
      "## [3.13.3] - 2026-11-01",
      "old release notes"
    ].join("\n")
    const result = spawnSync("awk", ["-v", `ver=${version}`, extraction], {
      input: changelog,
      encoding: "utf8"
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout, "expected release notes\n")
  }
})
