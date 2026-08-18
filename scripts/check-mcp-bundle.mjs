#!/usr/bin/env node
/** Fail when the checked-in MCP executable is not built from its source. */
import { build } from "esbuild"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { mcpBuildOptions } from "./lib/mcp-build-options.mjs"

const tempDir = mkdtempSync(join(tmpdir(), "semiotic-mcp-check-"))
const output = join(tempDir, "mcp-server.js")

try {
  await build(mcpBuildOptions({ outfile: output }))
  const generated = readFileSync(output)
  const committed = readFileSync("ai/dist/mcp-server.js")
  if (!generated.equals(committed)) {
    console.error(
      "MCP executable is stale: run npm run build:mcp and commit ai/dist/mcp-server.js"
    )
    process.exitCode = 1
  } else {
    console.log("✓ MCP executable is current")
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
