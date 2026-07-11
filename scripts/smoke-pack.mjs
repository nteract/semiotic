#!/usr/bin/env node
/**
 * Pack-and-import smoke test.
 *
 * Runs `npm pack`, installs the resulting tarball into a throwaway temp
 * project, and imports every published sub-path entry point under both
 * ESM (`import`) and CJS (`require`). Catches packaging bugs the build
 * itself can't see — missing `files` entries, broken `exports` map keys,
 * `.d.ts` files that don't actually exist on disk, missing chunk stubs.
 *
 * Run locally via `npm run check:pack`. Requires the dist bundles to be
 * built (`npm run dist`). Exits non-zero on any import failure.
 */
import { execSync } from "node:child_process"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readdirSync, existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

const ENTRY_POINTS = [
  ".",
  "./xy",
  "./ordinal",
  "./network",
  "./realtime",
  "./physics",
  "./physics/matter",
  "./physics/rapier",
  "./server",
  "./ai",
  "./ai/core",
  "./data",
  "./geo",
  "./themes",
  "./utils",
]

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8", ...opts })
}

// `execSync` errors carry `stderr`/`stdout` as Buffers when no encoding is
// applied to the failing channel. Coerce explicitly so `.split` etc. don't
// crash while we're already in an error path.
// Prefer the real Error line (ERR_MODULE_NOT_FOUND, etc.) over stack frames
// like `node:internal/modules/package_json_reader:314`.
function firstLine(err) {
  const raw = String(err?.stderr ?? err?.stdout ?? err?.message ?? err)
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean)
  const meaningful = lines.find(
    (l) =>
      /ERR_[A-Z_]+|Cannot find (?:package|module)|Error:|SyntaxError:|TypeError:/.test(l)
      && !l.startsWith("node:internal/")
      && !l.startsWith("at ")
  )
  return meaningful ?? lines.find((l) => !l.startsWith("node:internal/") && !l.startsWith("at ")) ?? lines[0] ?? ""
}

function findTarball(dir) {
  const files = readdirSync(dir)
  const tarball = files.find((f) => f.startsWith("semiotic-") && f.endsWith(".tgz"))
  if (!tarball) {
    // Surface what's actually in the dir so CI logs aren't a dead end —
    // npm pack returning 0 without producing a tarball is rare enough
    // that the directory listing is the single most useful breadcrumb.
    throw new Error(
      `no tarball produced in ${dir} (contents: ${files.length === 0 ? "<empty>" : files.join(", ")})`,
    )
  }
  return join(dir, tarball)
}

function localModuleSpecifiers(text) {
  const specifiers = new Set()
  const patterns = [
    /\b(?:import|export)\s*[^"'()]*?\s*from\s*["'](\.\/[^"']+)["']/g,
    /\bimport\s*["'](\.\/[^"']+)["']/g,
    /\bimport\(\s*["'](\.\/[^"']+)["']\s*\)/g,
  ]
  for (const re of patterns) {
    let match
    while ((match = re.exec(text)) !== null) {
      specifiers.add(match[1])
    }
  }
  return specifiers
}

function assertLocalChunksExist(packageRoot, entryRel, failures) {
  const seen = new Set()
  const visit = (relPath) => {
    if (seen.has(relPath)) return
    seen.add(relPath)
    const absPath = join(packageRoot, relPath.replace(/^\.\//, ""))
    if (!existsSync(absPath)) {
      failures.push(`${entryRel}: missing local ESM chunk ${relPath}`)
      return
    }
    const text = readFileSync(absPath, "utf8")
    const baseDir = dirname(relPath)
    for (const specifier of localModuleSpecifiers(text)) {
      const nextRel = `./${resolve(packageRoot, baseDir, specifier).slice(packageRoot.length + 1)}`
      visit(nextRel)
    }
  }
  visit(entryRel)
}

const tmp = mkdtempSync(join(tmpdir(), "semiotic-smoke-"))
console.log(`▶ smoke dir: ${tmp}`)

let exitCode = 0
const failures = []

try {
  // Pack the working repo into a tarball inside the temp dir.
  // `--pack-destination` lands the tarball next to our temp consumer
  // project; capturing combined output keeps CI logs useful when npm
  // pack exits 0 but produces nothing (rare, but seen on some runners
  // when --pack-destination is silently ignored).
  console.log("▶ npm pack")
  const packOut = run(`npm pack --pack-destination "${tmp}" 2>&1`, { cwd: repoRoot })
  if (packOut?.trim()) console.log(packOut.trim().split("\n").map((l) => `  ${l}`).join("\n"))
  const tarball = findTarball(tmp)
  console.log(`  tarball: ${tarball}`)

  // Set up a throwaway project that consumes it. Use Node's mkdir rather
  // than spawning a shell builtin so this runs on Windows too.
  const proj = join(tmp, "consumer")
  mkdirSync(proj, { recursive: true })
  writeFileSync(join(proj, "package.json"), JSON.stringify({
    name: "semiotic-smoke-consumer",
    version: "0.0.0",
    private: true,
    type: "module",
  }, null, 2) + "\n")

  console.log("▶ npm install <tarball>")
  // --no-save avoids dirtying the throwaway package.json with a tarball path.
  // --ignore-scripts skips lifecycle hooks of transitive deps; we only care
  // about whether the tarball's files resolve.
  // --no-legacy-peer-deps forces npm to install peerDependencies (react,
  // react-dom). The repo `.npmrc` sets `legacy-peer-deps=true` for the
  // eslint-plugin-react / ESLint 10 peer mismatch, and that npm_config_*
  // flag is inherited by child installs — without this override the smoke
  // consumer never gets React and every React entry point fails to import.
  run(`npm install --no-save --ignore-scripts --no-legacy-peer-deps "${tarball}"`, { cwd: proj })

  // Verify each entry resolves under ESM and CJS, and that its `types`
  // file (per package.json `exports`) actually exists on disk.
  const pkg = JSON.parse(run(`node -e "console.log(JSON.stringify(require('semiotic/package.json')))"`, { cwd: proj }))
  console.log(`▶ checking ${ENTRY_POINTS.length} entry points (semiotic@${pkg.version})`)

  for (const entry of ENTRY_POINTS) {
    const importPath = entry === "." ? "semiotic" : `semiotic${entry.slice(1)}`
    const exportEntry = pkg.exports[entry]
    if (!exportEntry) {
      failures.push(`${importPath}: missing entry in package.json exports`)
      continue
    }

    if (exportEntry.import) {
      assertLocalChunksExist(join(proj, "node_modules/semiotic"), exportEntry.import, failures)
    }

    // ESM import
    try {
      const code = `import * as m from "${importPath}"; if (!m || typeof m !== "object") { throw new Error("empty module") } console.log(Object.keys(m).length)`
      const out = run(`node --input-type=module -e ${JSON.stringify(code)}`, { cwd: proj })
      const exportCount = parseInt(out.trim(), 10)
      if (!Number.isFinite(exportCount) || exportCount === 0) {
        failures.push(`${importPath} (ESM): no exports`)
      } else {
        console.log(`  ✓ ${importPath} (ESM): ${exportCount} exports`)
      }
    } catch (err) {
      failures.push(`${importPath} (ESM): ${firstLine(err)}`)
    }

    // CJS require — many entries publish a `require` field.
    if (exportEntry.require) {
      try {
        const code = `const m = require("${importPath}"); if (!m || typeof m !== "object") { throw new Error("empty module") } console.log(Object.keys(m).length)`
        const out = run(`node --input-type=commonjs -e ${JSON.stringify(code)}`, { cwd: proj })
        const exportCount = parseInt(out.trim(), 10)
        if (!Number.isFinite(exportCount) || exportCount === 0) {
          failures.push(`${importPath} (CJS): no exports`)
        } else {
          console.log(`  ✓ ${importPath} (CJS): ${exportCount} exports`)
        }
      } catch (err) {
        failures.push(`${importPath} (CJS): ${firstLine(err)}`)
      }
    }

    // Types path resolves to a real .d.ts file.
    if (exportEntry.types) {
      const typesPath = join(proj, "node_modules/semiotic", exportEntry.types.replace(/^\.\//, ""))
      if (!existsSync(typesPath)) {
        failures.push(`${importPath} (types): ${exportEntry.types} not found in installed package`)
      } else {
        console.log(`  ✓ ${importPath} (types): ${exportEntry.types}`)
      }
    }
  }
} catch (err) {
  console.error("✗ smoke test crashed:", err.message)
  exitCode = 2
} finally {
  // Clean up — best-effort.
  try { rmSync(tmp, { recursive: true, force: true }) } catch { /* noop */ }
}

if (failures.length > 0) {
  console.error("\n✗ pack smoke test failures:")
  for (const f of failures) console.error(`  - ${f}`)
  exitCode = exitCode || 1
}

if (exitCode === 0) console.log(`\n✅ pack smoke test passed (${ENTRY_POINTS.length} entries)`)
process.exit(exitCode)
