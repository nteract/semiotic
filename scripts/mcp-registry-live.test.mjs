import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { assessStableHealth } from "./lib/mcp-registry-live.mjs"

describe("MCP Registry live preflight sequencing", () => {
  it("requires exact current npm parity in strict monitoring mode", () => {
    assert.throws(
      () => assessStableHealth(
        { channel: "stable", packageVersion: "3.8.7" },
        "3.8.9",
      ),
      /serves packageVersion.*public npm latest/,
    )
  })

  it("reports version skew only in the explicit pre-deploy mode", () => {
    assert.deepEqual(
      assessStableHealth(
        { channel: "stable", packageVersion: "3.8.7" },
        "3.8.9",
        { allowStaleRemote: true },
      ),
      { packageVersion: "3.8.7", stale: true },
    )
  })

  it("never allows wrong-channel or malformed health identities", () => {
    assert.throws(
      () => assessStableHealth(
        { channel: "nightly", packageVersion: "3.8.7" },
        "3.8.9",
        { allowStaleRemote: true },
      ),
      /channel must be "stable"/,
    )
    assert.throws(
      () => assessStableHealth(
        { channel: "stable", packageVersion: null },
        "3.8.9",
        { allowStaleRemote: true },
      ),
      /invalid packageVersion/,
    )
  })
})
