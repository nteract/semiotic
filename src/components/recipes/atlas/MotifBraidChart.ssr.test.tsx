import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { NetworkCustomChart } from "../../charts/custom/NetworkCustomChart"
import {
  renderChart,
  renderChartWithEvidence
} from "../../server/renderToStaticSVG"
import { auditAccessibility } from "../../charts/shared/auditAccessibility"
import { MotifBraidChart } from "./MotifBraidChart"
import {
  prepareMotifBraid,
  prepareNetworkAtlasAsync,
  motifBraidLayout,
  type NetworkAtlasSource,
  type NetworkAtlasSpec,
  type MotifBraidProjection
} from "../../semiotic-recipes-core"
import * as recipes from "../../semiotic-recipes"
import { prepareNetworkAtlas } from "./prepare"
import { prepareMotifBraid as projectBraid } from "./braid"

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
  const braid: MotifBraidProjection = projectBraid(prepared.atlas)
  const props = {
    nodes: braid.sceneSeeds.nodes,
    edges: braid.sceneSeeds.edges,
    layout: motifBraidLayout,
    layoutConfig: { braid },
    width: 640,
    height: 360,
    animate: false as const,
    colorScheme: ["#4e79a7", "#b75b08"],
    title: "SSR motif braid"
  }

  it("exposes preparation and layout through both public recipe facades", async () => {
    expect(recipes.prepareNetworkAtlasAsync).toBe(prepareNetworkAtlasAsync)
    expect(
      await prepareNetworkAtlasAsync(fixture.spec, fixture.source)
    ).toEqual(prepared)
    expect(recipes.prepareMotifBraid).toBe(prepareMotifBraid)
    expect(await prepareMotifBraid(prepared.atlas)).toEqual(braid)
    expect(recipes.motifBraidLayout).toBe(motifBraidLayout)
  })

  it("preserves validation failures and generation options through async preparation", async () => {
    const invalid = {
      ...fixture.spec,
      schemaVersion: "unsupported"
    } as unknown as NetworkAtlasSpec
    expect(await prepareNetworkAtlasAsync(invalid, fixture.source)).toEqual(
      prepareNetworkAtlas(invalid, fixture.source)
    )
    const generated = await prepareNetworkAtlasAsync(
      fixture.spec,
      fixture.source,
      { generation: 5 }
    )
    expect(generated).toEqual(
      prepareNetworkAtlas(fixture.spec, fixture.source, { generation: 5 })
    )
  })

  it("renderChart and live NetworkCustomChart emit curved journey tracks and partition labels", () => {
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
      expect(svg).toContain("Step 1")
      expect(svg).toContain("catalog")
      expect(svg).toContain("redirect")
    }
  })

  it("renders tapered traffic and every step through the public server and React paths", async () => {
    const trafficFixture = loadCheckout()
    for (const occurrence of trafficFixture.source.occurrences!) {
      occurrence.stepEntityCounts = occurrence.nodePath.map(
        (_, step) =>
          (occurrence.entityCount ?? 1) *
          (1 - step / occurrence.nodePath.length)
      )
    }
    const preparedTraffic = await prepareNetworkAtlasAsync(
      trafficFixture.spec,
      trafficFixture.source
    )
    if (!preparedTraffic.ok)
      throw new Error(JSON.stringify(preparedTraffic.issues))
    const trafficBraid = await prepareMotifBraid(preparedTraffic.atlas)
    const trafficProps = {
      ...props,
      nodes: trafficBraid.sceneSeeds.nodes,
      edges: trafficBraid.sceneSeeds.edges,
      layoutConfig: { braid: trafficBraid },
      description:
        "Synthetic journeys with labeled steps and per-step traffic.",
      summary: "Both cohorts share a prefix before checkout redirects diverge."
    }
    const { svg, evidence } = renderChartWithEvidence(
      "NetworkCustomChart",
      trafficProps
    )
    const expectedSteps =
      2 *
      new Set(
        trafficBraid.ribbons.flatMap((ribbon) => [
          ribbon.fromPrefixId,
          ribbon.toPrefixId
        ])
      ).size
    expect(evidence.markCountByType["node:glyph"]).toBe(expectedSteps)
    expect(evidence.markCountByType["edge:curved"]).toBeGreaterThan(0)
    expect(
      auditAccessibility("NetworkCustomChart", trafficProps).findings.filter(
        (finding) => finding.critical && finding.status === "fail"
      )
    ).toEqual([])
    const live = renderToStaticMarkup(<NetworkCustomChart {...trafficProps} />)
    const hoc = renderToStaticMarkup(
      <MotifBraidChart
        atlas={preparedTraffic.atlas}
        width={640}
        height={360}
        colorScheme={props.colorScheme}
      />
    )
    const filledTracks = (markup: string) =>
      markup.match(/<path[^>]*d="M[^"\n]* Z"[^>]*fill="#[^>]+/g) ?? []
    expect(filledTracks(svg).length).toBeGreaterThan(0)
    expect(filledTracks(live)).toHaveLength(filledTracks(svg).length)
    expect(filledTracks(hoc)).toHaveLength(filledTracks(svg).length)
    for (const markup of [svg, live, hoc]) {
      expect(markup).toContain("catalog")
      expect(markup).toContain("redirect")
      expect(markup).toContain("Step 3")
    }
  })

  it("MotifBraidChart live SSR matches the NetworkCustomChart renderChart path for data marks", () => {
    const fromApi = renderChart("NetworkCustomChart", props)
    const fromHoc = renderToStaticMarkup(
      <MotifBraidChart
        atlas={prepared.atlas}
        width={640}
        height={360}
        colorScheme={["#4e79a7", "#b75b08"]}
        title="SSR motif braid"
      />
    )
    const ribbonCount = (svg: string) =>
      (svg.match(/<path[^>]*d="M/g) ?? []).length
    expect(ribbonCount(fromHoc)).toBe(ribbonCount(fromApi))
    expect(fromHoc).toContain('fill="none"')
    expect(fromHoc).toContain("mobile/control")
  })
})
