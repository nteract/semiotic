/**
 * Validate the artifacts which make a checked-out Semiotic MCP image runnable.
 *
 * This deliberately emits only fixed filenames and status messages. It never
 * prints build metadata, environment values, chart inputs, or server output.
 */
import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { createRequire } from "node:module"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "../..")
const requireFromRoot = createRequire(resolve(root, "package.json"))
const requireBuildIdentity = process.argv.includes("--require-nightly-build-info")

const requiredFiles = [
  // The MCP executable itself and the three source-built package subpaths that
  // it externalizes for server rendering and component lookup.
  "ai/dist/mcp-server.js",
  "dist/server.min.js",
  "dist/server.module.min.js",
  "dist/semiotic-ai.min.js",
  "dist/semiotic-ai.module.min.js",
  "dist/geo.min.js",
  "dist/geo.module.min.js",
  // Worker artifacts are part of the package build and prevent a partial
  // library output from being mistaken for a deployable repository build.
  "dist/forceLayoutWorker.js",
  "dist/physicsWorker.js",
  // These resources are read by MCP resources and the interactive widget.
  "ai/schema.json",
  "ai/capabilities.json",
  "ai/surface-manifest.json",
  "ai/system-prompt.md",
  "ai/examples.md",
]

const failures = []
for (const relativePath of requiredFiles) {
  const absolutePath = resolve(root, relativePath)
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile() || statSync(absolutePath).size === 0) {
    failures.push(`missing-or-empty:${relativePath}`)
  }
}

// The nightly implementation must use package self-reference to the source
// artifacts in /app/dist, never an installed published semiotic dependency.
if (existsSync(resolve(root, "node_modules/semiotic"))) {
  failures.push("unexpected-published-semiotic-package")
}

try {
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
  if (packageJson.name !== "semiotic" || typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    failures.push("invalid-package-identity")
  }
} catch {
  failures.push("invalid-package-json")
}

try {
  const server = requireFromRoot("semiotic/server")
  if (typeof server.renderChartWithEvidence !== "function") failures.push("invalid-semiotic-server-self-import")

  const ai = requireFromRoot("semiotic/ai")
  if (typeof ai.validateProps !== "function") failures.push("invalid-semiotic-ai-self-import")

  const geo = requireFromRoot("semiotic/geo")
  if (typeof geo.ChoroplethMap !== "function") failures.push("invalid-semiotic-geo-self-import")

  requireFromRoot.resolve("@modelcontextprotocol/sdk/server/mcp.js")
  requireFromRoot.resolve("jsdom")
  requireFromRoot.resolve("react")
  requireFromRoot.resolve("react-dom/server")
} catch {
  failures.push("unresolvable-mcp-runtime-dependency")
}

const syntaxCheck = spawnSync(process.execPath, ["--check", resolve(root, "ai/dist/mcp-server.js")], {
  encoding: "utf8",
})
if (syntaxCheck.status !== 0) failures.push("invalid-mcp-server-syntax")

if (requireBuildIdentity) {
  if (process.env.SEMIOTIC_DEPLOYMENT_CHANNEL !== "nightly") {
    failures.push("invalid-deployment-channel")
  }
  if (!/^[0-9a-f]{40}$/.test(process.env.SEMIOTIC_GIT_SHA || "")) {
    failures.push("invalid-git-sha")
  }
  if (!(process.env.SEMIOTIC_BUILD_ID || "").trim()) {
    failures.push("missing-build-id")
  }
  const builtAt = process.env.SEMIOTIC_BUILD_TIME || ""
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(builtAt) || Number.isNaN(Date.parse(builtAt))) {
    failures.push("invalid-build-time")
  }
}

if (failures.length > 0) {
  console.error(`Nightly runtime artifact verification failed: ${failures.join(", ")}`)
  process.exit(1)
}

console.log("Nightly runtime artifact verification passed.")
