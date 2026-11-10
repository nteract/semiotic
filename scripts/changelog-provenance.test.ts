import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync, copyFileSync, rmSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import {
  adoptionMarker,
  checkProvenance,
  parseChangelog
} from "./check-changelog-provenance.ts"
import { runReleasePreflight } from "./check-release-preflight.ts"
const changelog = (body: string) =>
  `${adoptionMarker}\n## [Unreleased]\n### Added\n${body}\n## [3.13.3]\n### Added\n- Legacy capability without attribution.\n`

for (const source of [
  "#1683",
  "https://github.com/nteract/semiotic/pull/123",
  "rfcs/001-proposal.md",
  "consumer: public reporting export workflow",
  "maintainer"
]) {
  test(`accepts explicit origin ${source}`, () =>
    assert.deepEqual(
      checkProvenance(
        changelog(`- Capability\n  with details. [source: ${source}]`)
      ),
      []
    ))
}
for (const source of [
  "",
  "[source:]",
  "[source: unknown]",
  "[source: #0]",
  "[source: consumer: x]",
  "[source: maintainer",
  "[source: #1] [source: #2]"
]) {
  test(`rejects missing/malformed source ${source}`, () =>
    assert.match(
      checkProvenance(changelog(`- Capability ${source}`))[0],
      /CHANGELOG.md:4: \[Unreleased\] Added/
    ))
}
test("empty Unreleased and historical releases are grandfathered without rewrites", () => {
  const input = changelog("")
  assert.deepEqual(checkProvenance(input), [])
  assert.equal(input, changelog(""))
})
test("parses headings, multiline roots, nested details, and fenced examples", () => {
  const entries = parseChangelog(
    changelog(
      "- First [source: #1]\n  continuation\n  - detail\n- Second [source: #2]\n```md\n## [99.0.0]\n### Added\n- Example\n```"
    )
  )
  assert.equal(entries.length, 3)
  assert.equal(entries[0].text, "First [source: #1] continuation")
  assert.equal(entries[1].text, "Second [source: #2]")
})
test("nested detail cannot attribute its parent", () =>
  assert.equal(
    checkProvenance(changelog("- Parent\n  - Detail [source: #1]")).length,
    1
  ))
test("moving Unreleased into a release retains comparison identity", () => {
  const base = changelog("- Capability [source: #1]")
  const moved = base.replace(
    "## [Unreleased]\n### Added",
    "## [Unreleased]\n\n## [3.14.0]\n### Added"
  )
  assert.deepEqual(checkProvenance(moved, base), [])
  assert.deepEqual(checkProvenance(moved), [])
  assert.match(
    checkProvenance(moved.replace(" [source: #1]", ""), base)[0],
    /\[3.14.0\] Added/
  )
})
test("explicit base compares multisets and does not exempt duplicate new bullets", () => {
  const base = changelog("- Existing")
  assert.deepEqual(checkProvenance(base, base), [])
  assert.equal(
    checkProvenance(changelog("- Existing\n- Existing"), base).length,
    1
  )
  assert.equal(
    checkProvenance(changelog("- Existing"), base.replace(adoptionMarker, ""))
      .length,
    1
  )
})
test("missing or malformed adoption boundary fails closed", () => {
  for (const marker of ["", "<!-- added-provenance: v2 -->"])
    assert.match(
      checkProvenance(changelog("").replace(adoptionMarker, marker))[0],
      /adoption marker/
    )
})
test("standalone source CLI works without dist, dependencies, or browsers and fails on missing base", () => {
  const root = mkdtempSync(join(tmpdir(), "semiotic-provenance-"))
  try {
    copyFileSync(
      new URL("./check-changelog-provenance.ts", import.meta.url),
      join(root, "check.ts")
    )
    writeFileSync(
      join(root, "CHANGELOG.md"),
      changelog("- Export [source: maintainer]")
    )
    const run = (...args: string[]) =>
      spawnSync(
        process.execPath,
        ["--experimental-strip-types", "check.ts", ...args],
        { cwd: root, encoding: "utf8" }
      )
    assert.equal(run().status, 0)
    assert.notEqual(run("--base-ref").status, 0)
    assert.notEqual(run("--base-ref", "missing").status, 0)
    execFileSync("git", ["init", "--quiet"], { cwd: root })
    execFileSync("git", ["add", "CHANGELOG.md"], { cwd: root })
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.org",
        "commit",
        "--quiet",
        "-m",
        "baseline"
      ],
      { cwd: root }
    )
    assert.equal(run("--base-ref", "HEAD").status, 0)
    writeFileSync(
      join(root, "CHANGELOG.md"),
      changelog("- Export [source: maintainer]\n- New without source")
    )
    const result = run("--base-ref", "HEAD")
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /CHANGELOG.md:5/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
test("current release harness skips only provenance on genuinely pre-adoption tags", () => {
  const root = mkdtempSync(join(tmpdir(), "semiotic-old-tag-"))
  try {
    for (const adopted of [false, true]) {
      writeFileSync(
        join(root, "CHANGELOG.md"),
        adopted ? changelog("") : "## [3.13.3]\n### Added\n- Legacy"
      )
      const commands: string[] = [],
        logs: string[] = []
      const status = runReleasePreflight({
        root,
        execute(_command, args) {
          commands.push(args.join(" "))
          return { status: args[1] === "check:changelog-provenance" ? 1 : 0 }
        },
        log: (message) => logs.push(message),
        error() {}
      })
      assert.equal(status, adopted ? 1 : 0)
      assert.equal(commands.includes("run check:changelog-provenance"), adopted)
      assert.equal(
        logs.some((message) => message.includes("predates adoption")),
        !adopted
      )
      assert.ok(commands.includes("run check:release-version-alignment"))
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("nested continuation and malformed extra marker do not bypass attribution", () => {
  assert.equal(
    checkProvenance(
      changelog("- Parent\n  - Detail\n    continuation [source: #1]")
    ).length,
    1
  )
  assert.equal(
    checkProvenance(changelog("- Parent [source: #1] [source typo]")).length,
    1
  )
})
test("PR provenance runs from an explicit fetched base before dependencies or builds", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/node.js.yml", import.meta.url),
    "utf8"
  )
  const step = workflow.indexOf("name: Check new Added entries")
  assert.ok(step > workflow.indexOf("name: Use Node.js"))
  assert.ok(step < workflow.indexOf("name: Install dependencies"))
  assert.match(
    workflow,
    /github\.event\.pull_request\.base\.sha \|\| github\.event\.before/
  )
  assert.match(workflow, /git fetch --no-tags origin "\$PROVENANCE_BASE"/)
  assert.match(
    workflow,
    /check-changelog-provenance\.ts --base-ref "\$PROVENANCE_BASE"/
  )
})

test("copying a grandfathered historical bullet into Unreleased is a new addition", () => {
  const base = changelog("")
  assert.equal(checkProvenance(changelog("- Legacy capability without attribution."), base).length, 1)
})
