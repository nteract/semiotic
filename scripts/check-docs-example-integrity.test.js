import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"

const run = promisify(execFile)

describe("docs example integrity", () => {
  it("keeps examples, routes, source loaders, previews, and architecture profiles aligned", async () => {
    const { stdout } = await run(
      process.execPath,
      ["scripts/check-docs-example-integrity.mjs"],
      {
        cwd: process.cwd()
      }
    )

    expect(stdout).toContain("31 examples, 31 routes, 31 previews, 31 profiles")
  })
})
