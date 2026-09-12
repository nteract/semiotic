import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { NetworkCustomChart } from "../../charts/custom/NetworkCustomChart"
import { renderChart } from "../../server/renderToStaticSVG"
import { MotifBraidChart } from "./MotifBraidChart"
import { prepareMotifBraid } from "./braid"
import { motifBraidLayout } from "./motifBraidLayout"
import { prepareNetworkAtlas } from "./prepare"
import type { NetworkAtlasSource, NetworkAtlasSpec } from "./types"

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../scripts/network-atlas/fixtures"
)

function loadCheckout() {
  return JSON.parse(
    readFileSync(join(FIXTURE_DIR, "checkout-ab-v1.json"), "utf8")
  ) as { spec: NetworkAtlasSpec; source: NetworkAtlasSource }
}

describe("Motif Braid SSR", () => {
  const fixture = loadCheckout()
  const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
  if (!prepared.ok) {
    throw new Error(prepared.issues.map((issue) => issue.message).join("; "))
  }
  const braid = prepareMotifBraid(prepared.atlas)
  const props = {
    nodes: braid.sceneSeeds.nodes,
    edges: braid.sceneSeeds.edges,
    layout: motifBraidLayout,
    layoutConfig: { braid },
    width: 640,
    height: 360,
    animate: false as const,
    colorScheme: ["#4e79a7", "#f28e2c"],
    title: "SSR motif braid",
  }

  it("renderChart and live NetworkCustomChart emit ribbons, capsules, and profile marks", () => {
    const fromApi = renderChart("NetworkCustomChart", props)
    const live = renderToStaticMarkup(<NetworkCustomChart {...props} />)
    for (const svg of [fromApi, live]) {
      expect(svg).toContain("<svg")
      expect(svg).toMatch(/<path[^>]*d="M/)
      expect(svg).toContain('fill="none"')
      expect(svg).toContain("stroke-width")
      expect(svg).toContain("mobile/control")
      expect(svg).toContain("mobile/treatment")
      expect(svg).toContain(" Q")
    }
  })

  it("MotifBraidChart live SSR matches the NetworkCustomChart renderChart path for data marks", () => {
    const fromApi = renderChart("NetworkCustomChart", props)
    const fromHoc = renderToStaticMarkup(
      <MotifBraidChart
        atlas={prepared.atlas}
        width={640}
        height={360}
        colorScheme={["#4e79a7", "#f28e2c"]}
        title="SSR motif braid"
      />
    )
    const ribbonCount = (svg: string) => (svg.match(/<path[^>]*d="M/g) ?? []).length
    expect(ribbonCount(fromHoc)).toBe(ribbonCount(fromApi))
    expect(fromHoc).toContain('fill="none"')
    expect(fromHoc).toContain("mobile/control")
  })
})
