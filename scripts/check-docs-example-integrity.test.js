import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"

const run = promisify(execFile)

describe("docs example integrity", () => {
  it("keeps examples, routes, source loaders, previews, and architecture profiles aligned", async () => {
    const { stdout } = await run(process.execPath, ["scripts/check-docs-example-integrity.mjs"], {
      cwd: process.cwd(),
    })

    expect(stdout).toContain("32 examples, 32 routes, 32 previews, 32 profiles")
  })
})
