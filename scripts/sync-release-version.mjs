#!/usr/bin/env node
/** Synchronize repository metadata that must exactly match package.json. */
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const requested = process.argv[2]
if (!requested || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(requested)) {
  throw new Error("Usage: node scripts/sync-release-version.mjs <semver>")
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"))
}

function writeJson(path, value) {
  writeFileSync(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`)
}

const pkg = readJson("package.json")
const lock = readJson("package-lock.json")
if (pkg.version !== requested || lock.version !== requested || lock.packages?.[""]?.version !== requested) {
  throw new Error(
    `npm version must update package.json and package-lock.json to ${requested} before metadata sync`,
  )
}

const schema = readJson("ai/schema.json")
schema.version = requested
writeJson("ai/schema.json", schema)

const server = readJson("server.json")
server.version = requested
const npmEntry = server.packages?.find((entry) => entry.registryType === "npm")
if (!npmEntry || npmEntry.identifier !== pkg.name) {
  throw new Error(`server.json must contain the ${pkg.name} npm package entry`)
}
npmEntry.version = requested
writeJson("server.json", server)

console.log(`✓ synchronized ai/schema.json and server.json to ${requested}`)
