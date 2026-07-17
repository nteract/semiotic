#!/usr/bin/env node
/**
 * Multi-subpath import budget gate.
 *
 * Pre-shared-chunk packaging inlined Stream frames into every family entry, so
 * `semiotic/ai` + `semiotic/xy` + `semiotic/network` + `semiotic/geo` +
 * `semiotic/realtime` cost roughly the sum of each cold import (~1 MB gz).
 * Multi-entry ESM with shared chunks makes that cost closer to the union of
 * the graphs (~300 KB gz).
 *
 * This gate re-packs the current dist as a temporary package, bundles a
 * representative multi-subpath consumer with esbuild (tree-shaking on,
 * sideEffects:false honored), and fails if the gzip total regresses past the
 * budget. Single-file size-limit cannot see this because entry facades are now
 * tiny re-export shells.
 *
 * Usage (after `npm run dist:prod`):
 *   node scripts/check-multi-import-size.mjs
 *   node scripts/check-multi-import-size.mjs --print
 */

import { build } from "esbuild"
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { constants as zlibConstants, gzipSync } from "node:zlib"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, "..")
const printOnly = process.argv.includes("--print")

// Budget for the "someone uses AI tooling + several chart families" path that
// previously paid the full fat-entry tax. Allow headroom for d3/platform noise
// without letting the old ~800KB–1MB regression return.
const MULTI_IMPORT_GZIP_BUDGET = 380 * 1024

const MULTI_IMPORT_SOURCE = `
export { LineChart } from "semiotic/xy"
export { SankeyDiagram } from "semiotic/network"
export { ChoroplethMap } from "semiotic/geo"
export { RealtimeLineChart } from "semiotic/realtime"
export { suggestCharts, describeChart } from "semiotic/ai"
`

const EXTERNAL = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "world-atlas",
  "roughjs",
  "matter-js",
  "@dimforge/rapier2d-compat",
]

function linkWorkspaceNodeModules(consumerNodeModules) {
  const workspaceNm = join(REPO_ROOT, "node_modules")
  for (const name of readdirSync(workspaceNm)) {
    if (name.startsWith(".")) continue
    try {
      symlinkSync(join(workspaceNm, name), join(consumerNodeModules, name))
    } catch {
      // Skip collisions / non-linkable entries.
    }
  }
}

async function measureMultiImportGzip() {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"))
  const packageRoot = mkdtempSync(join(tmpdir(), "semiotic-multi-import-pkg-"))
  const consumerRoot = mkdtempSync(join(tmpdir(), "semiotic-multi-import-consumer-"))

  try {
    cpSync(join(REPO_ROOT, "dist"), join(packageRoot, "dist"), { recursive: true })
    writeFileSync(
      join(packageRoot, "package.json"),
      JSON.stringify(
        {
          name: "semiotic",
          version: pkg.version,
          type: "module",
          sideEffects: false,
          exports: pkg.exports,
          dependencies: pkg.dependencies,
        },
        null,
        2
      )
    )

    const consumerNm = join(consumerRoot, "node_modules")
    mkdirSync(consumerNm)
    symlinkSync(packageRoot, join(consumerNm, "semiotic"))
    linkWorkspaceNodeModules(consumerNm)

    writeFileSync(join(consumerRoot, "entry.js"), MULTI_IMPORT_SOURCE)
    const outDir = join(consumerRoot, "out")
    mkdirSync(outDir)

    await build({
      entryPoints: [join(consumerRoot, "entry.js")],
      bundle: true,
      minify: true,
      format: "esm",
      splitting: true,
      outdir: outDir,
      absWorkingDir: consumerRoot,
      nodePaths: [consumerNm, join(REPO_ROOT, "node_modules")],
      external: EXTERNAL,
      logLevel: "silent",
    })

    let totalGzip = 0
    let totalRaw = 0
    const files = readdirSync(outDir).filter((name) => name.endsWith(".js"))
    for (const name of files) {
      const buf = readFileSync(join(outDir, name))
      totalRaw += buf.length
      totalGzip += gzipSync(buf, { level: zlibConstants.Z_BEST_COMPRESSION }).length
    }

    return { totalGzip, totalRaw, fileCount: files.length }
  } finally {
    rmSync(packageRoot, { recursive: true, force: true })
    rmSync(consumerRoot, { recursive: true, force: true })
  }
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

const result = await measureMultiImportGzip()
const { totalGzip, totalRaw, fileCount } = result

console.log("Multi-subpath consumer (ai + xy + network + geo + realtime):")
console.log(`  files: ${fileCount}`)
console.log(`  raw:   ${formatKb(totalRaw)}`)
console.log(`  gzip:  ${formatKb(totalGzip)}`)
console.log(`  budget: ${formatKb(MULTI_IMPORT_GZIP_BUDGET)}`)

if (printOnly) process.exit(0)

if (totalGzip > MULTI_IMPORT_GZIP_BUDGET) {
  console.error(
    `\n✗ multi-import gzip ${formatKb(totalGzip)} exceeds budget ${formatKb(MULTI_IMPORT_GZIP_BUDGET)}.\n` +
      "  Shared ESM chunks may have regressed to fat per-entry bundling.\n" +
      "  Check scripts/build.mjs multi-entry groups and dist/chunk-*.module.min.js."
  )
  process.exit(1)
}

console.log("\n✓ multi-import size within budget")
