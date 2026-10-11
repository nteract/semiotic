const { createHash } = require("node:crypto")
const {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync
} = require("node:fs")
const path = require("node:path")

const artifacts = {
  library: ["dist/semiotic-ai.min.js", "dist/geo.min.js", "dist/server.min.js"],
  mcp: ["ai/dist/mcp-server.js", "ai/dist/diagnose-operation.js"]
}
const stampPath = (kind) =>
  kind === "library"
    ? "dist/.source-fingerprint.json"
    : "ai/dist/.source-fingerprint.json"

function sourceFingerprint(root, kind) {
  const files = [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    kind === "library" ? "scripts/build.mjs" : "scripts/build-mcp.mjs"
  ]
  function visit(dir) {
    if (!existsSync(path.join(root, dir))) return
    for (const entry of readdirSync(path.join(root, dir), {
      withFileTypes: true
    })) {
      const relative = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (
          !["dist", "__tests__", "test-utils", "__fixtures__"].includes(
            entry.name
          )
        )
          visit(relative)
      } else if (
        /\.(?:[jt]sx?|cjs|mjs|json)$/.test(entry.name) &&
        !/\.(?:test|spec)\./.test(entry.name)
      )
        files.push(relative)
    }
  }
  visit(kind === "library" ? "src" : "ai")
  visit("scripts/lib")
  const hash = createHash("sha256")
  for (const file of files.sort()) {
    if (existsSync(path.join(root, file)))
      hash
        .update(file)
        .update("\0")
        .update(readFileSync(path.join(root, file)))
        .update("\0")
  }
  return hash.digest("hex")
}

function artifactFingerprint(root, kind) {
  const hash = createHash("sha256")
  const files = new Set(artifacts[kind])
  function visit(dir) {
    if (!existsSync(path.join(root, dir))) return
    for (const entry of readdirSync(path.join(root, dir), {
      withFileTypes: true
    })) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) visit(file)
      else if (/\.(?:js|mjs|cjs)$/.test(entry.name)) files.add(file)
    }
  }
  visit(kind === "library" ? "dist" : "ai/dist")
  for (const file of [...files].sort())
    hash.update(file).update(readFileSync(path.join(root, file)))
  return hash.digest("hex")
}

function writeBuildFingerprint(root, kind, expectedSource) {
  const source = sourceFingerprint(root, kind)
  if (expectedSource && source !== expectedSource)
    throw new Error(
      `Source changed during the ${kind} build. Rebuild before running MCP tests.`
    )
  writeFileSync(
    path.join(root, stampPath(kind)),
    JSON.stringify({
      source,
      artifacts: artifactFingerprint(root, kind)
    }) + "\n"
  )
}

function assertFreshMcpBundles(root) {
  const problems = []
  for (const kind of ["library", "mcp"]) {
    const missing = artifacts[kind].filter(
      (file) => !existsSync(path.join(root, file))
    )
    if (missing.length) {
      problems.push(`missing ${missing.join(", ")}`)
      continue
    }
    try {
      const stamp = JSON.parse(
        readFileSync(path.join(root, stampPath(kind)), "utf8")
      )
      if (
        stamp.source !== sourceFingerprint(root, kind) ||
        stamp.artifacts !== artifactFingerprint(root, kind)
      )
        problems.push(`stale ${kind} bundles`)
    } catch {
      problems.push(`missing or invalid ${kind} source fingerprint`)
    }
  }
  if (problems.length)
    throw new Error(
      `[mcp-protocol.test] ${problems.join("; ")}. Run npm run dist:prod and npm run build:mcp before running MCP tests.`
    )
}

module.exports = {
  assertFreshMcpBundles,
  writeBuildFingerprint,
  sourceFingerprint,
  artifacts
}
