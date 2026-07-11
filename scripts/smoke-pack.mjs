#!/usr/bin/env node
/* global console, process */
/**
 * Pack-and-import smoke test.
 *
 * Runs `npm pack`, installs the resulting tarball into a throwaway temp
 * project, and imports every published module sub-path entry point under both
 * ESM (`import`) and CJS (`require`). Metadata-only exports such as
 * `semiotic/package.json` are resolved and parsed separately. This catches
 * packaging bugs the build itself can't see — missing `files` entries, broken
 * `exports` map keys, `.d.ts` files that don't actually exist on disk, missing
 * chunk stubs, a NodeNext TypeScript consumer that cannot resolve public props,
 * and worker URLs that silently fall back in one module format.
 *
 * Run locally via `npm run check:pack`. Requires the dist bundles to be
 * built (`npm run dist`). Exits non-zero on any import failure.
 */
import { execSync } from "node:child_process"
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, readdirSync, existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const packedConsumerFixture = join(__dirname, "fixtures", "packed-typescript-consumer")
const publicNpmRegistry = process.env.SEMIOTIC_PACK_REGISTRY || "https://registry.npmjs.org"
const sourcePackage = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"))

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

/**
 * `./package.json` is intentionally an exported metadata resource, not a
 * JavaScript entry point. Keep it in the pack contract, but don't try to
 * import it as a module. Every other export must describe a module through
 * conditional `import`/`require`/`default` and is smoke-tested below.
 */
function splitExports(exportsMap, failures) {
  if (!exportsMap || typeof exportsMap !== "object") {
    failures.push("package.json: missing exports map")
    return { modules: [], packageJson: null }
  }

  const modules = []
  let packageJson = null

  for (const [entry, exportEntry] of Object.entries(exportsMap)) {
    if (entry === "./package.json") {
      packageJson = exportEntry
      continue
    }

    if (!exportEntry || typeof exportEntry !== "object") {
      failures.push(`${entry}: expected a conditional module export in package.json`)
      continue
    }

    const esmPath = exportEntry.import ?? exportEntry.default
    if (typeof esmPath !== "string" && typeof exportEntry.require !== "string") {
      failures.push(`${entry}: no import, default, or require condition in package.json`)
      continue
    }

    modules.push({ entry, exportEntry, esmPath })
  }

  return { modules, packageJson }
}

function checkPackageJsonExport(packageRoot, packageJsonExport, proj, failures) {
  if (typeof packageJsonExport !== "string") {
    failures.push("semiotic/package.json: missing metadata-only export")
    return
  }

  const metadataPath = join(packageRoot, packageJsonExport.replace(/^\.\//, ""))
  if (!existsSync(metadataPath)) {
    failures.push(`semiotic/package.json: ${packageJsonExport} not found in installed package`)
    return
  }

  try {
    JSON.parse(readFileSync(metadataPath, "utf8"))
  } catch (err) {
    failures.push(`semiotic/package.json: invalid JSON (${err.message})`)
    return
  }

  try {
    const code = "const pkg = require('semiotic/package.json'); if (!pkg || typeof pkg !== 'object' || !pkg.name) { throw new Error('invalid package metadata') } console.log(pkg.name)"
    const out = run(`node --input-type=commonjs -e ${JSON.stringify(code)}`, { cwd: proj })
    if (out.trim() !== "semiotic") {
      failures.push(`semiotic/package.json: resolved unexpected package name ${JSON.stringify(out.trim())}`)
      return
    }
    console.log("  ✓ semiotic/package.json (metadata): resolves and parses")
  } catch (err) {
    failures.push(`semiotic/package.json (metadata): ${firstLine(err)}`)
  }
}

function quoted(value) {
  return JSON.stringify(String(value))
}

function runFixtureScript(fixtureDir, script, args = []) {
  const command = [
    quoted(process.execPath),
    quoted(join(fixtureDir, script)),
    ...args.map(quoted),
  ].join(" ")
  return run(command, { cwd: fixtureDir })
}

/**
 * Compile real TypeScript source from a fresh consumer project. Merely finding
 * a .d.ts file does not prove its package-export resolution or public props
 * type-check under NodeNext.
 */
function checkTypeScriptConsumer(proj, packageRoot, failures) {
  const fixtureDir = join(proj, "packed-typescript-consumer")
  cpSync(packedConsumerFixture, fixtureDir, { recursive: true })

  const tsc = join(
    proj,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsc.cmd" : "tsc",
  )
  if (!existsSync(tsc)) {
    failures.push("TypeScript consumer: local tsc was not installed")
    return
  }

  try {
    run(`${quoted(tsc)} --project ${quoted(join(fixtureDir, "tsconfig.json"))} --pretty false`, {
      cwd: fixtureDir,
    })
    console.log("  ✓ TypeScript consumer: NodeNext public imports compile")
  } catch (err) {
    failures.push(`TypeScript consumer: ${firstLine(err)}`)
  }

  // The force recipe is a public API that actually creates the worker. Run it
  // through ESM and CJS entry conditions with a Web Worker-shaped fake, then
  // execute each shipped worker module itself through a worker_threads bridge.
  // This catches a CJS import.meta transform that would otherwise silently
  // force the synchronous fallback despite all module-import checks passing.
  for (const script of ["run-force-worker-client.mjs", "run-force-worker-client.cjs"]) {
    try {
      const out = runFixtureScript(fixtureDir, script)
      console.log(`  ✓ ${out.trim()}`)
    } catch (err) {
      failures.push(`TypeScript consumer ${script}: ${firstLine(err)}`)
    }
  }

  for (const [kind, asset] of [["force", "forceLayoutWorker.js"], ["physics", "physicsWorker.js"]]) {
    const workerPath = join(packageRoot, "dist", asset)
    if (!existsSync(workerPath)) {
      failures.push(`worker:${kind}: ${asset} not found in installed package`)
      continue
    }
    try {
      const out = runFixtureScript(fixtureDir, "run-worker-module.mjs", [
        kind,
        pathToFileURL(workerPath).href,
      ])
      console.log(`  ✓ ${out.trim()}`)
    } catch (err) {
      failures.push(`worker:${kind}: ${firstLine(err)}`)
    }
  }
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
    // These are deliberately consumer-owned dependencies. Semiotic has React
    // runtime peers, while its public declarations import React types; a clean
    // TypeScript app needs both rather than borrowing this repository's tree.
    dependencies: {
      react: sourcePackage.devDependencies.react,
      "react-dom": sourcePackage.devDependencies["react-dom"],
    },
    devDependencies: {
      "@types/react": sourcePackage.devDependencies["@types/react"],
      "@types/react-dom": sourcePackage.devDependencies["@types/react-dom"],
      typescript: sourcePackage.devDependencies.typescript,
    },
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
  // Explicitly use the public registry rather than inheriting a developer's
  // private mirror/token. The fixture installs only public npm dependencies;
  // SEMIOTIC_PACK_REGISTRY can point at an approved CI mirror when needed.
  run(
    `npm install --no-save --include=dev --ignore-scripts --no-legacy-peer-deps --registry=${quoted(publicNpmRegistry)} ${quoted(tarball)}`,
    { cwd: proj },
  )

  // Verify each entry resolves under ESM and CJS, and that its `types`
  // file (per package.json `exports`) actually exists on disk.
  const pkg = JSON.parse(run(`node -e "console.log(JSON.stringify(require('semiotic/package.json')))"`, { cwd: proj }))
  const packageRoot = join(proj, "node_modules/semiotic")
  const { modules: entryPoints, packageJson: packageJsonExport } = splitExports(pkg.exports, failures)
  console.log(`▶ checking ${entryPoints.length} importable entry points from package.json#exports (semiotic@${pkg.version})`)
  checkPackageJsonExport(packageRoot, packageJsonExport, proj, failures)

  for (const { entry, exportEntry, esmPath } of entryPoints) {
    const importPath = entry === "." ? "semiotic" : `semiotic${entry.slice(1)}`

    if (typeof esmPath === "string") {
      assertLocalChunksExist(packageRoot, esmPath, failures)
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

  checkTypeScriptConsumer(proj, packageRoot, failures)
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

if (exitCode === 0) console.log("\n✅ pack smoke test passed (all package.json#exports entries)")
process.exit(exitCode)
