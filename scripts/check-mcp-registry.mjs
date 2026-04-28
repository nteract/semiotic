#!/usr/bin/env node
/**
 * MCP Registry submission freshness check.
 *
 * The official MCP Registry (registry.modelcontextprotocol.io) validates
 * publishes against a strict set of cross-references between three files:
 *
 *   1. `server.json` declares the canonical server name + version + npm
 *      identifier.
 *   2. `package.json` must carry an `mcpName` field that exactly matches
 *      `server.json`'s `name` — this is how the publisher proves the
 *      npm package and the registry entry are the same artifact.
 *   3. `README.md` must contain a literal `mcp-name: <SERVER_NAME>`
 *      string. The validator does a substring search; missing this is
 *      the most common publish-time rejection.
 *
 * Drift between these three is silently fine in development (nothing
 * else reads them at build time) but fails the publish step, which is
 * an awkward place to discover the problem since the publisher CLI
 * runs after CI has long since gone green. This gate moves that
 * discovery to the same checks that already block release.
 *
 * Run via `npm run check:mcp-registry`. Wired into release/prepublish
 * and the CI workflow.
 */
import { readFileSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

const errors = []
function fail(msg) { errors.push(msg) }

// ── Load all three sources ────────────────────────────────────────────
const serverPath = join(repoRoot, "server.json")
const packagePath = join(repoRoot, "package.json")
const readmePath = join(repoRoot, "README.md")

if (!existsSync(serverPath)) {
  console.error("✗ server.json missing — required for MCP Registry publishes")
  process.exit(1)
}

let server, pkg, readme
try {
  server = JSON.parse(readFileSync(serverPath, "utf8"))
} catch (e) {
  console.error(`✗ server.json is not valid JSON: ${e.message}`)
  process.exit(1)
}
try {
  pkg = JSON.parse(readFileSync(packagePath, "utf8"))
} catch (e) {
  console.error(`✗ package.json is not valid JSON: ${e.message}`)
  process.exit(1)
}
try {
  readme = readFileSync(readmePath, "utf8")
} catch (e) {
  console.error(`✗ README.md not readable: ${e.message}`)
  process.exit(1)
}

// ── server.json shape ─────────────────────────────────────────────────
for (const field of ["$schema", "name", "version", "packages"]) {
  if (server[field] === undefined) {
    fail(`server.json is missing required field "${field}"`)
  }
}

if (server.name && !/^[a-z0-9.-]+\/[a-z0-9.-]+$/i.test(server.name)) {
  fail(
    `server.json#name "${server.name}" must follow the reverse-DNS format ` +
      `(e.g. io.github.nteract/semiotic) — the registry publisher rejects free-form names.`,
  )
}

// ── package.json#mcpName matches server.json#name ─────────────────────
if (pkg.mcpName == null) {
  fail(
    `package.json is missing "mcpName" — the registry publisher requires it ` +
      `to match server.json#name (currently "${server.name}").`,
  )
} else if (pkg.mcpName !== server.name) {
  fail(
    `package.json#mcpName "${pkg.mcpName}" does not match server.json#name "${server.name}".`,
  )
}

// ── server.json version + npm identifier match package.json ───────────
if (server.version && server.version !== pkg.version) {
  fail(
    `server.json#version "${server.version}" does not match package.json#version "${pkg.version}". ` +
      `The publisher CLI rejects mismatched versions; bump server.json on every release.`,
  )
}

if (Array.isArray(server.packages)) {
  const npmEntry = server.packages.find((p) => p.registryType === "npm")
  if (!npmEntry) {
    fail(`server.json#packages must include an entry with registryType "npm".`)
  } else {
    if (npmEntry.identifier !== pkg.name) {
      fail(
        `server.json npm package identifier "${npmEntry.identifier}" does not match ` +
          `package.json#name "${pkg.name}".`,
      )
    }
    if (npmEntry.version !== pkg.version) {
      fail(
        `server.json npm package version "${npmEntry.version}" does not match ` +
          `package.json#version "${pkg.version}".`,
      )
    }
  }
}

// ── README.md contains the literal `mcp-name: <name>` string ─────────
// The registry validator substring-matches this — `## mcp-name: …` works,
// `<!-- mcp-name: … -->` works, but you must literally include the line.
if (server.name) {
  const required = `mcp-name: ${server.name}`
  if (!readme.includes(required)) {
    fail(
      `README.md is missing the literal string "${required}". ` +
        `The MCP Registry publisher requires this anywhere in the file as proof ` +
        `that the README and the registry entry refer to the same package.`,
    )
  }
}

// ── Output ────────────────────────────────────────────────────────────
if (errors.length) {
  console.error("\n✗ MCP Registry submission would fail:\n")
  for (const msg of errors) console.error(`  - ${msg}`)
  console.error(
    "\nFix the cross-references between server.json, package.json, and README.md " +
      "before running the `mcp-publisher publish` step. See DISCOVERABILITY.md Task 1.",
  )
  process.exit(1)
}

console.log(
  `✓ MCP Registry prereqs clean (server "${server.name}" v${server.version}; npm "${pkg.name}"; README cross-reference present)`,
)
