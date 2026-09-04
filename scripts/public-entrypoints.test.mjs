import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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
  assert.equal(entries.length, 36)
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
  assert.equal(stableApiEntrypoints().length, 34)
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
