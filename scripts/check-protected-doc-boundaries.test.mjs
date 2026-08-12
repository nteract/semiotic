import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import {
  discoverProtectedDocPaths,
  findProtectedDocReferenceLeaks,
  summarizeProtectedDocReferenceLeaks
} from "./check-protected-doc-boundaries.mjs"

function withFixture(run) {
  const root = mkdtempSync(join(tmpdir(), "semiotic-doc-boundary-"))
  try {
    mkdirSync(join(root, "docs", "internal-notes"), { recursive: true })
    mkdirSync(join(root, "docs", "public"), { recursive: true })
    mkdirSync(join(root, "src"), { recursive: true })
    writeFileSync(join(root, ".gitignore"), "/docs/internal-notes\n")
    writeFileSync(
      join(root, "docs", "internal-notes", "confidential-release-plan.md"),
      "private source\n"
    )
    run(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

test("derives protected documentation boundaries from ignore policy", () => {
  withFixture((root) => {
    assert.deepEqual(discoverProtectedDocPaths(root), ["docs/internal-notes"])
  })
})

test("finds tracked and generated references without scanning protected source", () => {
  withFixture((root) => {
    writeFileSync(
      join(root, "src", "leak.ts"),
      'export const source = "../../internal-notes/source.json"\n'
    )
    writeFileSync(
      join(root, "docs", "public", "api.json"),
      '{"comment":"confidential-release-plan.md"}\n'
    )
    writeFileSync(join(root, "src", "clean.ts"), "export const clean = true\n")

    const leaks = findProtectedDocReferenceLeaks({
      root,
      tracked: [
        ".gitignore",
        "src/clean.ts",
        "src/leak.ts"
      ]
    })

    assert.deepEqual(leaks, ["docs/public/api.json", "src/leak.ts"])
  })
})

test("fails generically when a protected source has been force-added", () => {
  withFixture((root) => {
    assert.throws(
      () =>
        findProtectedDocReferenceLeaks({
          root,
          tracked: [
            ".gitignore",
            "docs/internal-notes/confidential-release-plan.md"
          ]
        }),
      (error) => {
        assert.equal(
          error.message,
          "A tracked file exists inside a protected documentation boundary"
        )
        assert.doesNotMatch(error.message, /internal-notes|confidential/i)
        return true
      }
    )
  })
})

test("redacts protected identities found in generated output paths", () => {
  withFixture((root) => {
    mkdirSync(join(root, "docs", "public", "internal-notes"), {
      recursive: true
    })
    writeFileSync(
      join(root, "docs", "public", "internal-notes", "index.html"),
      '<a href="../../../internal-notes/source.md">source</a>\n'
    )

    const leaks = findProtectedDocReferenceLeaks({
      root,
      tracked: [".gitignore"]
    })

    assert.deepEqual(leaks, ["[generated output path redacted]"])
    assert.doesNotMatch(leaks.join("\n"), /internal-notes|confidential/i)
    assert.deepEqual(
      summarizeProtectedDocReferenceLeaks({ root, tracked: [".gitignore"] }),
      [
        {
          scope: "docs/public",
          reason: "content-reference",
          count: 1,
          redactedCount: 1
        },
        {
          scope: "docs/public",
          reason: "generated-path",
          count: 1,
          redactedCount: 1
        }
      ]
    )
  })
})

test("does not confuse a same-stem public asset with a protected document", () => {
  withFixture((root) => {
    writeFileSync(
      join(root, "docs", "public", "confidential-release-plan.png"),
      Buffer.from([0x89, 0x50, 0x4e, 0x47])
    )

    const leaks = findProtectedDocReferenceLeaks({
      root,
      tracked: [
        ".gitignore",
        "docs/public/confidential-release-plan.png"
      ]
    })

    assert.deepEqual(leaks, [])
  })
})

test("does not confuse a public generated filename with a private reference", () => {
  withFixture((root) => {
    writeFileSync(
      join(root, "docs", "internal-notes", "public-projection.generated.js"),
      "protected working copy\n"
    )
    writeFileSync(
      join(root, "docs", "public", "public-projection.generated.js"),
      "export const projection = []\n"
    )
    writeFileSync(
      join(root, "src", "registry.ts"),
      'export const moduleName = "public-projection.generated.js"\n'
    )

    const leaks = findProtectedDocReferenceLeaks({
      root,
      tracked: [
        ".gitignore",
        "docs/public/public-projection.generated.js",
        "src/registry.ts"
      ]
    })

    assert.deepEqual(leaks, [])
  })
})

test("CLI diagnostics redact protected paths and names", () => {
  withFixture((root) => {
    const scripts = join(root, "scripts")
    mkdirSync(scripts)
    copyFileSync(
      fileURLToPath(new URL("./check-protected-doc-boundaries.mjs", import.meta.url)),
      join(scripts, "check-protected-doc-boundaries.mjs")
    )
    mkdirSync(join(root, "docs", "public", "internal-notes"), {
      recursive: true
    })
    writeFileSync(
      join(root, "docs", "public", "internal-notes", "index.html"),
      '<a href="../../../internal-notes/source.md">source</a>\n'
    )

    const git = (...args) =>
      spawnSync("git", args, { cwd: root, encoding: "utf8" })
    assert.equal(git("init", "--quiet").status, 0)
    assert.equal(
      git(
        "add",
        ".gitignore",
        "docs/public/internal-notes/index.html"
      ).status,
      0
    )

    const run = () =>
      spawnSync(process.execPath, [join(scripts, "check-protected-doc-boundaries.mjs")], {
        cwd: root,
        encoding: "utf8"
      })
    const generatedLeak = run()
    assert.equal(generatedLeak.status, 1)
    assert.match(generatedLeak.stderr, /\[generated output path redacted\]/)
    assert.equal(
      /internal-notes|confidential-release-plan/i.test(
        generatedLeak.stdout + generatedLeak.stderr
      ),
      false,
      "CLI diagnostic exposed a protected identity"
    )

    assert.equal(
      git(
        "add",
        "--force",
        "docs/internal-notes/confidential-release-plan.md"
      ).status,
      0
    )
    const trackedLeak = run()
    assert.equal(trackedLeak.status, 1)
    assert.match(
      trackedLeak.stderr,
      /A tracked file exists inside a protected documentation boundary/
    )
    assert.equal(
      /internal-notes|confidential-release-plan/i.test(
        trackedLeak.stdout + trackedLeak.stderr
      ),
      false,
      "CLI diagnostic exposed a protected identity"
    )
  })
})
