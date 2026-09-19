import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { assessStableHealth } from "./lib/mcp-registry-live.mjs"
import { checkRegistryPublication } from "./check-mcp-registry-publication.mjs"

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

// Publication checks run after npm and hosted deployment have succeeded.
const manifest = {
  name: "io.github.nteract/semiotic",
  version: "3.10.2",
  packages: [{ registryType: "npm", identifier: "semiotic", version: "3.10.2" }],
  remotes: [{ type: "streamable-http", url: "https://example.test/mcp" }],
}
const published = (official = {}) => ({
  server: manifest,
  _meta: { "io.modelcontextprotocol.registry/official": { status: "active", isLatest: true, ...official } },
})
function probe(responses, mode = "verify") {
  let time = 0
  const urls = []
  const logs = []
  const pending = checkRegistryPublication(manifest, {
    mode,
    now: () => time,
    sleep: async (ms) => { time += ms },
    timeoutMs: 30,
    retryMs: 10,
    log: (message) => logs.push(message),
    fetchImpl: async (url) => {
      urls.push(url)
      const response = responses[Math.min(urls.length - 1, responses.length - 1)]
      if (response instanceof Error) throw response
      return typeof response === "number"
        ? { ok: false, status: response }
        : { ok: true, json: async () => response }
    },
  })
  return { pending, urls, logs }
}

describe("MCP Registry publication visibility", () => {
  it("waits for an exact version after publication instead of searching one page", async () => {
    const run = probe([404, 404, published()])
    const result = await run.pending
    assert.equal(result.attempts, 3)
    assert.equal(result.publishRequired, false)
    assert.ok(run.urls.every((url) => url.endsWith("/servers/io.github.nteract%2Fsemiotic/versions/3.10.2")))
    assert.equal(run.logs.length, 2)
  })

  it("only an exact-version 404 permits publication in preflight", async () => {
    assert.equal((await probe([404], "preflight").pending).publishRequired, true)
    const existing = probe([published()], "preflight")
    assert.equal((await existing.pending).publishRequired, false)
    assert.equal(existing.urls.length, 1)
  })

  it("compares metadata independently of JSON object key order", async () => {
    const entry = published()
    entry.server = Object.fromEntries(Object.entries(manifest).reverse())
    assert.equal((await probe([entry], "preflight").pending).publishRequired, false)
  })

  it("retries rate limits, server failures, and network errors in both modes", async () => {
    for (const mode of ["preflight", "verify"]) {
      for (const failure of [429, 503, new Error("connection reset")]) {
        assert.equal((await probe([failure, published()], mode).pending).attempts, 2)
      }
    }
  })

  it("waits for active/latest metadata to become visible", async () => {
    assert.equal((await probe([published({ isLatest: false }), published()]).pending).attempts, 2)
    await assert.rejects(probe([published({ status: "deleted" })]).pending, /not active and latest/)
  })

  it("fails conflicting identities, packages, or remotes immediately in both modes", async () => {
    for (const mode of ["preflight", "verify"]) {
      for (const change of [{ version: "3.10.1" }, { packages: [] }, { remotes: [] }]) {
        const run = probe([{ ...published(), server: { ...manifest, ...change } }], mode)
        await assert.rejects(run.pending, /metadata differs/)
        assert.equal(run.urls.length, 1)
      }
    }
  })

  it("does not retry authorization failures or interpret them as absence", async () => {
    for (const mode of ["preflight", "verify"]) {
      const run = probe([403], mode)
      await assert.rejects(run.pending, /HTTP 403/)
      assert.equal(run.urls.length, 1)
    }
  })

  it("bounds retries and reports the final failure instead of claiming success", async () => {
    for (const [mode, status] of [["verify", 404], ["preflight", 503]]) {
      const run = probe([status], mode)
      await assert.rejects(run.pending, new RegExp(`within 30 ms after 3 attempts.*HTTP ${status}`))
      assert.equal(run.urls.length, 3)
    }
  })
})
