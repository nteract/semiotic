import assert from "node:assert/strict"
import { readFileSync, mkdtempSync, rmSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import {
  publicJavaScriptEntrypoints,
  stableApiEntrypoints
} from "./lib/public-entrypoints.mjs"

test("README entry counts agree with the canonical stable package inventory", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8")
  const counts = readme.match(
    /Semiotic ships (\d+) stable JavaScript entry points \((\d+) subpaths plus the root\)/
  )
  assert.ok(counts, "README must document both stable entry counts")
  const entries = stableApiEntrypoints()
  assert.equal(Number(counts[1]), entries.length)
  assert.equal(
    Number(counts[2]),
    entries.filter((entry) => entry.subpath !== ".").length
  )
})

test("only the experimental namespace is excluded, not similarly named stable entries", () => {
  const entries = publicJavaScriptEntrypoints({
    name: "semiotic",
    exports: Object.fromEntries(
      ["./experimental", "./experimental/nested", "./experimental-tools"].map(
        (subpath) => [subpath, "./dist/example.js"]
      )
    )
  })
  assert.deepEqual(
    entries.map((entry) => entry.stableApi),
    [false, false, true]
  )
})

test("derives every importable package subpath and keeps previews out of API snapshots", () => {
  const entries = publicJavaScriptEntrypoints()
  assert.equal(entries.length, 39)
  assert.equal(
    entries.find((entry) => entry.subpath === "./atlas")?.sourcePath,
    "src/components/semiotic-atlas.ts"
  )
  assert.equal(
    entries.find((entry) => entry.subpath === "./atlas/core")?.sourcePath,
    "src/components/semiotic-atlas-core.ts"
  )
  assert.equal(
    entries.find((entry) => entry.subpath === "./text")?.sourcePath,
    "src/components/semiotic-text.ts"
  )
  assert.equal(
    entries.find((entry) => entry.subpath === "./xy")?.sourcePath,
    "src/components/semiotic-xy.ts"
  )
  assert.equal(
    entries.find((entry) => entry.subpath === "./server/edge")?.bundleName,
    "semiotic-server-edge"
  )
  assert.equal(
    entries.find((entry) => entry.subpath === "./artifact")?.sourcePath,
    "src/components/semiotic-artifact.ts"
  )
  assert.equal(
    entries.find((entry) => entry.subpath === "./artifact/react")?.sourcePath,
    "src/components/semiotic-artifact-react.ts"
  )
  assert.equal(
    entries.find((entry) => entry.subpath === "./experimental")?.stableApi,
    false
  )
  assert.equal(
    entries.find((entry) => entry.subpath === "./experimental/vacp")?.stableApi,
    false
  )
  assert.equal(stableApiEntrypoints().length, 37)
})

test("retains condition-only JavaScript exports in the inventory", () => {
  const entries = publicJavaScriptEntrypoints({
    name: "semiotic",
    exports: {
      "./node-only": {
        node: {
          import: "./dist/semiotic-node-only.module.min.js",
          require: "./dist/semiotic-node-only.min.js"
        },
        types: "./dist/semiotic-node-only.d.ts"
      }
    }
  })

  assert.deepEqual(entries, [
    {
      subpath: "./node-only",
      specifier: "semiotic/node-only",
      sourceName: "semiotic-node-only",
      sourcePath: "src/components/semiotic-node-only.ts",
      bundleName: "semiotic-node-only",
      declarationPath: "dist/semiotic-node-only.d.ts",
      artifactTargets: [
        {
          condition: "node.import",
          path: "dist/semiotic-node-only.module.min.js"
        },
        {
          condition: "node.require",
          path: "dist/semiotic-node-only.min.js"
        }
      ],
      apiSnapshotName: "semiotic-node-only",
      stableApi: true
    }
  ])
})

test("records nested Node export conditions in the generated package surface", () => {
  const manifest = JSON.parse(
    readFileSync("package-surface.manifest.json", "utf8")
  )
  const edge = manifest.entries.find(
    (entry) => entry.subpath === "./server/edge"
  )
  const experimental = manifest.entries.find(
    (entry) => entry.subpath === "./experimental"
  )

  assert.ok(edge?.artifacts.some((artifact) => artifact.kind === "node.import"))
  assert.ok(
    experimental?.artifacts.some((artifact) => artifact.kind === "node.import")
  )
})

test("npm packs CommonJS metadata declaration sidecars alongside their modules", () => {
  const cache = mkdtempSync(join(tmpdir(), "semiotic-package-sidecars-"))
  try {
    const [pack] = JSON.parse(
      execFileSync(
        "npm",
        ["pack", "--dry-run", "--json", "--ignore-scripts", "--cache", cache],
        { encoding: "utf8", cwd: new URL("..", import.meta.url) }
      )
    )
    const files = new Set(pack.files.map(({ path }) => path))
    for (const module of ["componentMetadata", "behaviorContracts"]) {
      assert.ok(
        files.has(`ai/${module}.cjs`),
        `${module} runtime must be packed`
      )
      assert.ok(
        files.has(`ai/${module}.d.cts`),
        `${module} declaration must be packed`
      )
    }
  } finally {
    rmSync(cache, { recursive: true, force: true })
  }
})
