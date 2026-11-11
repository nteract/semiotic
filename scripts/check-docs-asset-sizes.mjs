#!/usr/bin/env node
/**
 * Keep route-lazy documentation chunks within explicit transfer budgets.
 *
 * Vite's default 500 kB warning measures uncompressed source and cannot tell a
 * route module from a deliberately lazy Natural Earth/data asset. These limits
 * preserve that signal in terms users actually download while still bounding
 * pathological generated modules.
 *
 * The per-asset limits say nothing about what every visitor pays before any
 * route loads, so the first-load script has its own, much tighter budget.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { dirname, resolve } from "node:path"

const buildDir = resolve(process.argv[2] || "docs/build/assets")
const MAX_RAW_BYTES = 900 * 1024
const MAX_GZIP_BYTES = 250 * 1024
// First-load script: the entry module in index.html plus the chunks Vite marks
// with <link rel="modulepreload"> (the entry's static imports). Measured at
// 122.6 kB gzip once the docs shell stopped importing the full example
// registry and the index pages with their inlined thumbnails (it was 168.9 kB
// with them). The limit sits about 3% above that measurement: enough for
// routine route additions, too little for another registry, dataset, image
// set, or chart import to land in the shell unnoticed. Lower it when the shell
// shrinks; raise it only with the reason recorded here.
const MAX_FIRST_LOAD_GZIP_BYTES = 126 * 1024

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

const siteDir = dirname(buildDir)
const indexPath = resolve(siteDir, "index.html")
if (!existsSync(indexPath)) {
  console.error(`Missing ${indexPath}; cannot measure the first-load script.`)
  process.exit(1)
}

const indexHtml = readFileSync(indexPath, "utf8")
const firstLoadSources = []
for (const tag of indexHtml.match(/<script\b[^>]*>/g) ?? []) {
  if (!/\btype=["']module["']/.test(tag)) continue
  const src = tag.match(/\bsrc=["']([^"']+)["']/)?.[1]
  if (src) firstLoadSources.push(src)
}
for (const tag of indexHtml.match(/<link\b[^>]*>/g) ?? []) {
  if (!/\brel=["']modulepreload["']/.test(tag)) continue
  const href = tag.match(/\bhref=["']([^"']+)["']/)?.[1]
  if (href) firstLoadSources.push(href)
}

if (firstLoadSources.length === 0) {
  console.error(`No module entry script found in ${indexPath}.`)
  process.exit(1)
}

const firstLoad = [...new Set(firstLoadSources)].map((source) => {
  const path = resolve(siteDir, source.replace(/^\//, ""))
  if (!existsSync(path)) {
    console.error(`First-load script ${source} referenced by index.html is missing from the build.`)
    process.exit(1)
  }
  return { source, gzipBytes: gzipSync(readFileSync(path), { level: 9 }).length }
})
const firstLoadGzipBytes = firstLoad.reduce((total, file) => total + file.gzipBytes, 0)

if (firstLoadGzipBytes > MAX_FIRST_LOAD_GZIP_BYTES) {
  console.error("Documentation first-load script budget exceeded:")
  for (const file of firstLoad) {
    console.error(`  ${file.source}: ${(file.gzipBytes / 1024).toFixed(1)} kB gzip`)
  }
  console.error(
    `  total ${(firstLoadGzipBytes / 1024).toFixed(1)} kB gzip; ` +
    `limit ${MAX_FIRST_LOAD_GZIP_BYTES / 1024} kB gzip.`,
  )
  console.error(
    "Every docs visitor downloads this before any route renders. Move the new " +
    "import behind a lazy route, or record the reason beside the limit.",
  )
  process.exit(1)
}

console.log(
  `✓ first-load script is ${(firstLoadGzipBytes / 1024).toFixed(1)} kB gzip across ` +
  `${firstLoad.length} file(s); limit ${MAX_FIRST_LOAD_GZIP_BYTES / 1024} kB gzip.`,
)
