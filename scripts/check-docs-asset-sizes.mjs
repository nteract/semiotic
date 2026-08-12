#!/usr/bin/env node
/**
 * Keep route-lazy documentation chunks within explicit transfer budgets.
 *
 * Vite's default 500 kB warning measures uncompressed source and cannot tell a
 * route module from a deliberately lazy Natural Earth/data asset. These limits
 * preserve that signal in terms users actually download while still bounding
 * pathological generated modules.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { resolve } from "node:path"

const buildDir = resolve(process.argv[2] || "docs/build/assets")
const MAX_RAW_BYTES = 900 * 1024
const MAX_GZIP_BYTES = 250 * 1024

if (!existsSync(buildDir)) {
  console.error(`Missing documentation assets at ${buildDir}. Run the website build first.`)
  process.exit(1)
}

const assets = readdirSync(buildDir)
  .filter((name) => name.endsWith(".js"))
  .map((name) => {
    const path = resolve(buildDir, name)
    const rawBytes = statSync(path).size
    const gzipBytes = gzipSync(readFileSync(path), { level: 9 }).length
    return { name, rawBytes, gzipBytes }
  })
  .sort((a, b) => b.gzipBytes - a.gzipBytes)

if (assets.length === 0) {
  console.error(`No JavaScript assets found at ${buildDir}.`)
  process.exit(1)
}

const failures = assets.filter(
  ({ rawBytes, gzipBytes }) => rawBytes > MAX_RAW_BYTES || gzipBytes > MAX_GZIP_BYTES,
)

if (failures.length > 0) {
  console.error("Documentation asset size budget exceeded:")
  for (const asset of failures) {
    console.error(
      `  ${asset.name}: ${(asset.rawBytes / 1024).toFixed(1)} kB raw, ` +
      `${(asset.gzipBytes / 1024).toFixed(1)} kB gzip`,
    )
  }
  console.error(
    `Limits: ${MAX_RAW_BYTES / 1024} kB raw and ${MAX_GZIP_BYTES / 1024} kB gzip per lazy asset.`,
  )
  process.exit(1)
}

const largest = assets[0]
console.log(
  `✓ ${assets.length} documentation JavaScript assets fit the per-asset budgets; ` +
  `largest transfer is ${largest.name} at ${(largest.gzipBytes / 1024).toFixed(1)} kB gzip.`,
)
