import assert from "node:assert/strict"
import {
  readFileSync,
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  copyFileSync
} from "node:fs"
import { execFileSync, spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import test from "node:test"
import {
  publicJavaScriptEntrypoints,
  stableApiEntrypoints
} from "./lib/public-entrypoints.mjs"

function documentationGateFixture(t) {
  const root = mkdtempSync(join(tmpdir(), "semiotic-entry-gates-"))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  for (const path of [
    "scripts/sync-bundle-sizes.mjs",
    "scripts/check-context7.mjs",
    "scripts/lib/public-entrypoints.mjs",
    "scripts/lib/context7-subpaths.mjs",
    "README.md",
    "ai/reference.md",
    "docs/src/pages/GettingStartedPage.jsx"
  ]) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    copyFileSync(new URL(`../${path}`, import.meta.url), join(root, path))
  }
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  )
  // The gate must not require preview artifacts or an exclusion-list update.
  pkg.exports["./experimental/future/react"] = {
    import: "./dist/future.module.min.js"
  }
  const manifest = JSON.parse(
    readFileSync(new URL("../context7.json", import.meta.url), "utf8")
  )
  writeFileSync(
    join(root, "context7.json"),
    JSON.stringify({ ...manifest, folders: [] })
  )
  for (const entry of publicJavaScriptEntrypoints(pkg).filter(
    (entry) => entry.stableApi
  )) {
    for (const target of entry.artifactTargets) {
      mkdirSync(dirname(join(root, target.path)), { recursive: true })
      writeFileSync(join(root, target.path), "export const fixture = 1\n")
    }
  }
  return {
    root,
    pkg,
    run(script, ...args) {
      writeFileSync(join(root, "package.json"), JSON.stringify(pkg))
      return spawnSync(
        process.execPath,
        [join(root, "scripts", script), ...args],
        { encoding: "utf8" }
      )
    }
  }
}

test("stable documentation gates exclude current and future experimental entries", (t) => {
  const fixture = documentationGateFixture(t)
  for (const [script, args] of [
    ["sync-bundle-sizes.mjs", []],
    ["sync-bundle-sizes.mjs", ["--check"]],
    ["check-context7.mjs", []]
  ]) {
    const result = fixture.run(script, ...args)
    assert.equal(result.status, 0, result.stdout + result.stderr)
  }
  const readme = readFileSync(join(fixture.root, "README.md"), "utf8")
  assert.match(readme, /\| `semiotic\/atlas\/core` \|/)
  assert.doesNotMatch(readme, /\| `semiotic\/experimental(?:\/|`)/)
})

test("stable documentation gates still reject unlisted stable exports, including similar names", (t) => {
  for (const subpath of ["./future-stable", "./experimental-tools"]) {
    const fixture = documentationGateFixture(t)
    fixture.pkg.exports[subpath] = { import: "./dist/future.module.min.js" }
    const sizes = fixture.run("sync-bundle-sizes.mjs", "--check")
    assert.equal(sizes.status, 1)
    assert.ok(sizes.stderr.includes(`Export ${subpath} is not listed in ORDER`))
    const context = fixture.run("check-context7.mjs")
    assert.equal(context.status, 1)
    assert.ok(
      context.stderr.includes(
        `sub-path rule is missing entries that package.json exports: ${subpath.slice(2)}`
      )
    )
  }
})

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
  assert.equal(entries.length, 43)
  assert.equal(
    entries.find(
      (entry) => entry.subpath === "./experimental/network-resolution"
    )?.stableApi,
    false
  )
  assert.equal(
    entries.find(
      (entry) => entry.subpath === "./experimental/network-resolution/react"
    )?.sourcePath,
    "src/components/semiotic-experimental-network-resolution-react.ts"
  )
  assert.equal(
    entries.find((entry) => entry.subpath === "./network/zoom")?.sourcePath,
    "src/components/semiotic-network-zoom.ts"
  )
  assert.equal(
    entries.find((entry) => entry.subpath === "./network/perspective")
      ?.sourcePath,
    "src/components/semiotic-network-perspective.ts"
  )
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
  assert.equal(stableApiEntrypoints().length, 39)
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
