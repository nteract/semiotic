#!/usr/bin/env node
/** Fail when the visual-baseline browser package and container versions drift. */
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)))
const readJson = (path) => JSON.parse(readFileSync(join(repoRoot, path), "utf8"))
const packageJson = readJson("package.json")
const packageLock = readJson("package-lock.json")
const failures = []

const expected = packageJson.devDependencies?.["@playwright/test"]
if (!/^\d+\.\d+\.\d+$/.test(expected || "")) {
  failures.push(`@playwright/test must be pinned exactly, received ${JSON.stringify(expected)}`)
}
if (packageJson.devDependencies?.["playwright-chromium"] !== expected) {
  failures.push(
    `playwright-chromium must equal @playwright/test ${expected}, received ` +
      JSON.stringify(packageJson.devDependencies?.["playwright-chromium"]),
  )
}

const lockRoot = packageLock.packages?.[""]?.devDependencies ?? {}
for (const name of ["@playwright/test", "playwright-chromium"]) {
  if (lockRoot[name] !== expected) {
    failures.push(`package-lock root ${name} must equal ${expected}, received ${lockRoot[name]}`)
  }
}
for (const name of ["@playwright/test", "playwright", "playwright-chromium", "playwright-core"]) {
  const locked = packageLock.packages?.[`node_modules/${name}`]?.version
  if (locked !== expected) {
    failures.push(`package-lock ${name} must resolve to ${expected}, received ${locked}`)
  }
}

const imageFiles = [
  ".github/workflows/node.js.yml",
  ".github/workflows/release.yml",
  "scripts/run-playwright-linux-bootstrap.mjs",
]
for (const path of imageFiles) {
  const source = readFileSync(join(repoRoot, path), "utf8")
  const versions = [...source.matchAll(/mcr\.microsoft\.com\/playwright:v([0-9.]+)-noble/g)]
    .map((match) => match[1])
  if (versions.length === 0) {
    failures.push(`${path} has no pinned noble Playwright image`)
    continue
  }
  for (const version of versions) {
    if (version !== expected) {
      failures.push(`${path} pins Playwright image ${version}; expected ${expected}`)
    }
  }
}

if (failures.length > 0) {
  console.error("✗ Playwright package/container version drift:")
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}

console.log(
  `✓ Playwright ${expected} is aligned across package.json, package-lock.json, CI, and Docker bootstrap`,
)
