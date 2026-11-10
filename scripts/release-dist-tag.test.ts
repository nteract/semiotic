import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import test from "node:test"
import type { TestContext } from "node:test"
import { resolveReleaseDistTag } from "./release-dist-tag.ts"

const root = new URL("../", import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), "utf8")
const workflow = read(".github/workflows/release.yml")
const supported = [
  ["3.14.0", "latest"],
  ["0.0.0", "latest"],
  ["3.14.0+build.001", "latest"],
  ["3.14.0+next.1", "latest"],
  ["3.14.0+build-alpha.1", "latest"],
  ["3.14.0-alpha", "beta"],
  ["3.14.0-alpha.0", "beta"],
  ["3.14.0-beta.1", "beta"],
  ["3.14.0-rc.2+build.001", "beta"],
  ["3.14.0-next", "next"],
  ["3.14.0-next.1", "next"],
  ["3.14.0-next.1+build.001", "next"]
] as const

test("release versions map only to their supported dist-tag", () => {
  for (const [version, expected] of supported) {
    assert.equal(resolveReleaseDistTag(version), expected, version)
  }
})

test("unknown channels and channel prefixes never become stable releases", () => {
  for (const channel of [
    "preview.1",
    "nextish.1",
    "next-1",
    "alphabeta.1",
    "betaish.1",
    "rc1",
    "NEXT.1",
    "1",
    "constructor",
    "toString"
  ]) {
    assert.throws(
      () => resolveReleaseDistTag(`3.14.0-${channel}`),
      /Unsupported prerelease channel/,
      channel
    )
  }
})

test("rejects incomplete or malformed versions including prerelease and build identifiers", () => {
  for (const version of [
    undefined,
    null,
    314,
    {},
    "",
    "3.14",
    "3.14.0.1",
    "v3.14.0",
    "=3.14.0",
    " 3.14.0",
    "3.14.0\n",
    "03.14.0",
    "3.014.0",
    "3.14.00",
    "9007199254740992.0.0",
    "3.14.0-",
    "3.14.0-next.",
    "3.14.0-next..1",
    "3.14.0-next.01",
    "3.14.0-next_1",
    "3.14.0-next.1+",
    "3.14.0+build..1",
    "3.14.0+build_1",
    "3.14.0+build+1",
    `3.14.0+${"a".repeat(256)}`
  ]) {
    assert.throws(
      () => resolveReleaseDistTag(version),
      /Invalid release version/,
      JSON.stringify(version)
    )
  }
})

function stepScript(name: string) {
  const step = workflow
    .split(`      - name: ${name}\n`)[1]
    ?.split(/\n {6}- name:|\n {2}[\w-]+:/)[0]
  const script = step?.match(/ {8}run: \|\n((?: {10}.*\n|\n)+)/)?.[1]
  assert.ok(script, `Missing workflow script: ${name}`)
  return script.replace(/^ {10}/gm, "")
}

function runWorkflowStep(
  t: TestContext,
  phase: "preflight" | "publish",
  version: unknown,
  { recovery = false, releaseTag = `v${version}` } = {}
) {
  const directory = mkdtempSync(join(tmpdir(), "semiotic-release-routing-"))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const script =
    phase === "preflight"
      ? "scripts/release-dist-tag.ts"
      : ".release-routing/scripts/release-dist-tag.ts"
  mkdirSync(dirname(join(directory, script)), { recursive: true })
  copyFileSync(
    new URL("scripts/release-dist-tag.ts", root),
    join(directory, script)
  )
  // Preflight runs in the workflow checkout; publication runs in tagged source.
  // Recovery deliberately gives the tooling checkout a different stable version.
  const toolingVersion = recovery ? "9.0.0" : version
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({
      version: phase === "preflight" ? toolingVersion : version
    })
  )
  writeFileSync(
    join(directory, "tagged-package.json"),
    JSON.stringify({ version })
  )
  if (phase === "publish") {
    writeFileSync(
      join(directory, ".release-routing/package.json"),
      JSON.stringify({
        version: toolingVersion
      })
    )
    assert.equal(
      existsSync(join(directory, "scripts/release-dist-tag.ts")),
      false
    )
  }
  assert.equal(existsSync(join(directory, "node_modules")), false)

  const bin = join(directory, "bin")
  mkdirSync(bin)
  // Execute the workflow's real shell and helper without network or real tags.
  // Only git's read/fetch boundary is replaced with the selected tag fixture.
  writeFileSync(
    join(bin, "git"),
    `#!${process.execPath}
const assert = require("node:assert/strict")
const fs = require("node:fs")
const args = process.argv.slice(2)
const tag = process.env.RELEASE_TAG
fs.appendFileSync("git-calls.jsonl", JSON.stringify(args) + "\\n")
switch (args[0]) {
  case "fetch":
    assert.deepEqual(args, ["fetch", "--force", "origin", "+refs/heads/main:refs/remotes/origin/main", "+refs/tags/" + tag + ":refs/tags/" + tag])
    break
  case "show":
    assert.deepEqual(args, ["show", "refs/tags/" + tag + ":package.json"])
    process.stdout.write(fs.readFileSync("tagged-package.json", "utf8"))
    break
  case "rev-list":
    assert.deepEqual(args, ["rev-list", "-n", "1", tag])
    console.log("tagged-sha")
    break
  case "merge-base":
    assert.deepEqual(args, ["merge-base", "--is-ancestor", "tagged-sha", "origin/main"])
    break
  default:
    throw new Error("Unexpected git operation: " + args.join(" "))
}
`,
    { mode: 0o755 }
  )
  const output = join(directory, "github-output")
  const result = spawnSync(
    "bash",
    [
      "-e",
      "-o",
      "pipefail",
      "-c",
      stepScript(
        phase === "preflight"
          ? "Verify release tag before expensive jobs"
          : "Determine npm dist-tag"
      )
    ],
    {
      cwd: directory,
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        RELEASE_TAG: releaseTag,
        GITHUB_OUTPUT: output
      },
      encoding: "utf8",
      timeout: 10_000
    }
  )
  assert.ifError(result.error)
  return {
    ...result,
    output: existsSync(output) ? readFileSync(output, "utf8") : ""
  }
}

for (const recovery of [false, true]) {
  test(`${recovery ? "recovery" : "normal tag"} workflow validates the selected manifest and emits the correct publish tag`, (t) => {
    for (const [version, expected] of supported) {
      if (version.includes("+")) continue // Classified above; not an exact npm identity.
      for (const phase of ["preflight", "publish"] as const) {
        const result = runWorkflowStep(t, phase, version, { recovery })
        assert.equal(result.status, 0, `${phase}: ${result.stderr}`)
        if (phase === "preflight") {
          assert.match(result.stdout, new RegExp(`^tag=${expected}\\n`))
          assert.match(result.stdout, /Verified .* at tagged-sha/)
        } else {
          assert.equal(result.output, `tag=${expected}\n`)
        }
      }
    }
  })
}

test("normal and recovery workflows reject npm version normalization before publication", (t) => {
  for (const [version] of supported.filter(([version]) =>
    version.includes("+")
  )) {
    for (const recovery of [false, true]) {
      for (const phase of ["preflight", "publish"] as const) {
        const result = runWorkflowStep(t, phase, version, { recovery })
        assert.equal(result.status, 1, `${phase}: ${result.stderr}`)
        assert.match(result.stderr, /npm removes build metadata/)
        assert.equal(result.output, "")
        assert.doesNotMatch(result.stdout, /tag=|Verified/)
      }
    }
  }
})

test("workflow rejects unknown, malformed, or mismatched tagged versions without publish outputs", (t) => {
  for (const [version, releaseTag, error] of [
    ["3.14.0-preview.1", "v3.14.0-preview.1", /Unsupported prerelease/],
    ["3.14.0-nextish.1", "v3.14.0-nextish.1", /Unsupported prerelease/],
    ["3.14.0-next.01", "v3.14.0-next.01", /Invalid release version/],
    ["03.14.0", "v03.14.0", /Invalid release version/],
    ["3.14.0-next.1", "v3.14.0", /Release tag mismatch/],
    [undefined, "v3.14.0", /Invalid release version/]
  ] as const) {
    for (const phase of ["preflight", "publish"] as const) {
      const result = runWorkflowStep(t, phase, version, {
        recovery: true,
        releaseTag
      })
      assert.equal(result.status, 1, `${phase}: ${result.stderr}`)
      assert.match(result.stderr, error)
      assert.equal(result.output, "")
      assert.doesNotMatch(result.stdout, /tag=|Verified/)
    }
  }
})

test("routing checks gate expensive work and preserve exact-artifact publishing and stable-only jobs", () => {
  const preflight = workflow
    .split("  npm-publish-preflight:")[1]
    .split("  source-preflight:")[0]
  const publish = workflow.split("  publish:")[1].split("  github-release:")[0]
  assert.match(preflight, /name: Checkout release tooling/)
  assert.doesNotMatch(preflight, /ref: \$\{\{ env.RELEASE_TAG \}\}/)
  assert.match(
    preflight,
    /node --experimental-strip-types --test scripts\/release-dist-tag.test.ts/
  )
  const ci = read(".github/workflows/node.js.yml")
    .split("  fast-contracts:")[1]
    .split("  coverage-shards:")[0]
  assert.ok(ci.indexOf("npm run test:release-preflight") >= 0)
  assert.ok(
    ci.indexOf("npm run test:release-preflight") <
      ci.indexOf("npm run typescript")
  )
  const { scripts } = JSON.parse(read("package.json"))
  assert.match(
    scripts["test:release-preflight"],
    /--test .*scripts\/release-dist-tag.test.ts/
  )
  assert.ok(
    preflight.indexOf("Verify release tag before expensive jobs") <
      preflight.indexOf("Verify npm trusted-publisher authentication")
  )
  assert.doesNotMatch(preflight, /npm ci|npm install/)
  assert.match(workflow, /source-preflight:\n {4}needs: npm-publish-preflight/)
  assert.match(workflow, /docs-examples:\n {4}needs: source-preflight/)
  assert.match(workflow, /publish:\n {4}needs: docs-examples/)
  assert.match(publish, /ref: \$\{\{ env.RELEASE_TAG \}\}/)
  assert.match(
    publish,
    /name: Checkout release routing tooling[\s\S]*?ref: \$\{\{ github.sha \}\}[\s\S]*?path: \.release-routing\n {10}sparse-checkout: scripts\/release-dist-tag.ts/
  )
  assert.match(publish, /dist_tag: \$\{\{ steps.dist-tag.outputs.tag \}\}/)
  assert.ok(
    publish.indexOf("Determine npm dist-tag") <
      publish.indexOf("Create immutable release artifact")
  )
  for (const command of [
    'npm run check:pack -- --tarball "${{ steps.release-artifact.outputs.tarball }}"',
    'npm run check:consumer-compatibility -- --tarball "${{ steps.release-artifact.outputs.tarball }}"',
    'node scripts/create-release-artifact.mjs --out-dir "${{ steps.release-artifact.outputs.directory }}" --verify',
    'npm publish "${{ steps.release-artifact.outputs.tarball }}" --provenance --access public --tag ${{ steps.dist-tag.outputs.tag }}'
  ])
    assert.ok(publish.includes(command), command)
  for (const job of [
    "deploy-stable-mcp",
    "verify-stable-mcp",
    "publish-mcp-registry"
  ]) {
    const body = workflow.split(`  ${job}:`)[1]?.split(/\n {2}[\w-]+:/)[0]
    assert.ok(body, `Missing stable-only job: ${job}`)
    assert.match(body, /if: needs.publish.outputs.dist_tag == 'latest'/)
  }
  const local = read("scripts/publish-release.sh")
  assert.ok(
    local.indexOf("scripts/release-dist-tag.ts") < local.indexOf("npm ci")
  )
  assert.ok(
    local.includes('scripts/release-dist-tag.ts "$RELEASE_TAG" < package.json')
  )
})
