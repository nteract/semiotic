// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// `scripts/build.mjs` publishes `semiotic/server/node` as a re-export of
// `semiotic/server` in both module formats instead of bundling the renderer
// twice. That is only correct while the two entries export the same surface.
// If this fails, either align `src/components/semiotic-server-node.ts` with
// `semiotic-server.ts` or give the node entry its own bundles again.
function surface(name) {
  const text = readFileSync(`etc/api-surface/${name}.api.md`, "utf8")
  const start = text.indexOf("```")
  if (start === -1) throw new Error(`${name}.api.md has no surface block`)
  return text.slice(start)
}

describe("server/node facade", () => {
  it("exports exactly what semiotic/server exports", () => {
    expect(surface("semiotic-server-node")).toBe(surface("semiotic-server"))
  })

  it("has a non-trivial surface to compare", () => {
    expect(surface("semiotic-server")).toMatch(/function renderChart\(/)
    expect(surface("semiotic-server")).toMatch(/function renderToImage\(/)
  })
})
