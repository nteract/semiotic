#!/usr/bin/env node
/** Fail when either checked-in AI bundle is not built from its source. */
import { build } from "esbuild"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  mcpBuildOptions,
  diagnosisBuildOptions
} from "./lib/mcp-build-options.mjs"

const tempDir = mkdtempSync(join(tmpdir(), "semiotic-mcp-check-"))

try {
  for (const [filename, options] of [
    ["mcp-server.js", mcpBuildOptions],
    ["diagnose-operation.js", diagnosisBuildOptions]
  ]) {
    const output = join(tempDir, filename)
    await build(options({ outfile: output, production: true }))
    const generated = readFileSync(output)
    const committed = readFileSync(join("ai/dist", filename))
    if (!generated.equals(committed)) {
      console.error(
        `${filename} is stale: run npm run build:mcp and commit ai/dist outputs`
      )
      process.exitCode = 1
    } else {
      console.log(`✓ ${filename} is current`)
    }
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}
