import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import type { NetworkLayoutContext } from "../../stream/networkCustomLayout"
import { assignedDenominator } from "./compare"
import { prepareMotifBraid, ribbonSupportsRoute } from "./braid"
import { motifBraidLayout } from "./motifBraidLayout"
import { prepareNetworkAtlas } from "./prepare"
import { followSupportedRoute, getMotifPrevalence } from "./queries"
import type { NetworkAtlasSource, NetworkAtlasSpec } from "./types"

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../scripts/network-atlas/fixtures"
)

function loadJson(name: string): {
  spec: NetworkAtlasSpec
  source: NetworkAtlasSource
} {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf8"))
}

function makeCtx(braid: ReturnType<typeof prepareMotifBraid>): NetworkLayoutContext<{
  braid: ReturnType<typeof prepareMotifBraid>
}> {
  return {
    nodes: [],
    edges: [],
    dimensions: {
      width: 800,
      height: 400,
      plot: { x: 0, y: 0, width: 800, height: 400 }
    },
    theme: {
      semantic: { primary: "#222", border: "#888", surface: "#fff" },
      categorical: ["#4e79a7", "#f28e2c"]
    },
    resolveColor: (key) => (key.includes("redirect") ? "#f28e2c" : "#4e79a7"),
    config: { braid }
  }
}

describe("Motif Braid checkout A/B", () => {
  const fixture = loadJson("checkout-ab-v1.json")
  const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
  if (!prepared.ok) {
    throw new Error(prepared.issues.map((issue) => issue.message).join("; "))
  }
  const { atlas } = prepared
  const braid = prepareMotifBraid(atlas)

  it("uses the assigned denominator, not episode totals", () => {
    expect(assignedDenominator(atlas, "mobile/control")).toBe(20000)
    expect(assignedDenominator(atlas, "mobile/treatment")).toBe(20000)
    const loop = getMotifPrevalence(atlas, { template: "repeated-state-episode" })
    expect(loop.value?.entityCount).toBe(1600 + 6000)
    expect(atlas.comparison?.rows[0].motifUsers["repeated-state-episode"]).toBe(1600)
    expect(atlas.comparison?.rows[1].motifUsers["repeated-state-episode"]).toBe(6000)
    expect(atlas.comparison?.rows[0].assigned).toBe(20000)
  })

  it("keeps journey-type counts on the assigned denominator", () => {
    const controlLoop = braid.groups.find((group) => group.id === "group:mc-loop")
    const treatmentLoop = braid.groups.find((group) => group.id === "group:mt-loop")
    expect(controlLoop?.entityCount).toBe(1600)
    expect(treatmentLoop?.entityCount).toBe(6000)
    expect(controlLoop?.signature).toBe(treatmentLoop?.signature)
    expect(controlLoop?.signature.split(">").slice(0, 2)).toEqual(["home", "catalog"])
  })

  it("shares leaf order across stacked partition dendrograms", () => {
    const controlOrder = braid.groups
      .filter((group) => group.partition === "mobile/control")
      .map((group) => group.signature)
    const treatmentOrder = braid.groups
      .filter((group) => group.partition === "mobile/treatment")
      .map((group) => group.signature)
    expect(controlOrder).toEqual(treatmentOrder)
    expect([...braid.signatureOrder].sort()).toEqual([...new Set([...controlOrder, ...treatmentOrder])].sort())
  })

  it("draws a stepped dendrogram of parallel tracks, not ribbons or a false root", () => {
    const scene = motifBraidLayout(makeCtx(braid))
    const edges = scene.sceneEdges ?? []
    expect(scene.labels?.some((label) => label.text === "mobile/control")).toBe(true)
    expect(scene.labels?.some((label) => label.text === "mobile/treatment")).toBe(true)
    expect(edges.length).toBeGreaterThan(0)
    expect(edges.every((edge) => edge.type === "curved")).toBe(true)
    expect(edges.every((edge) => edge.style.fill === "none")).toBe(true)
    expect(edges.every((edge) => (edge.datum as { falseRoot?: boolean }).falseRoot !== true)).toBe(
      true
    )
    expect(edges.some((edge) => String(edge.id).includes("__braid_root__"))).toBe(false)
    expect(edges.some((edge) => /^M[\d.-]+,[\d.-]+$/.test(edge.pathD) === false)).toBe(true)

    const sharedHome = edges.filter((edge) => String(edge.id).includes(":home") && String(edge.id).startsWith("lead:mobile/control:"))
    expect(sharedHome.length).toBe(2)
    const ordinary = braid.groups.find((group) => group.id === "group:mc-ordinary")!
    const loop = braid.groups.find((group) => group.id === "group:mc-loop")!
    const ordinaryTail = edges.find((edge) => edge.id === `tail:${ordinary.id}:${ordinary.id}`)
    const loopTail = edges.find((edge) => edge.id === `tail:${loop.id}:${loop.id}`)
    expect(ordinaryTail?.style.strokeWidth ?? 0).toBeGreaterThan(loopTail?.style.strokeWidth ?? 0)
  })
})

describe("Motif Braid search", () => {
  const fixture = loadJson("search-no-result-v1.json")
  const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
  if (!prepared.ok) {
    throw new Error(prepared.issues.map((issue) => issue.message).join("; "))
  }

  it("counts looping sessions as assigned entities, not 15-point uplift", () => {
    const loop = getMotifPrevalence(prepared.atlas, { template: "repeated-state-episode" })
    expect(loop.value?.entityCount).toBe(10000)
    expect(prepared.atlas.spec.motifs.denominatorRef).toBe("assigned")
  })
})

describe("Motif Braid ghost route", () => {
  const fixture = loadJson("ghost-route.json")
  const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
  if (!prepared.ok) {
    throw new Error(prepared.issues.map((issue) => issue.message).join("; "))
  }
  const braid = prepareMotifBraid(prepared.atlas)

  it("does not weave an unsupported A → X → D ribbon", () => {
    expect(ribbonSupportsRoute(braid, ["A", "X", "D"])).toBe(false)
    expect(ribbonSupportsRoute(braid, ["A", "X", "B"])).toBe(true)
    const composite = followSupportedRoute(prepared.atlas, { route: ["A", "X", "D"] })
    expect(composite.value?.supported).toBe(false)
    const prefixes = new Set(prepared.atlas.prefixForest?.nodes.map((node) => node.id))
    expect(prefixes.has("A>X>D")).toBe(false)
    expect(prefixes.has("A>X>B")).toBe(true)
  })
})

describe("Motif Braid missing traces", () => {
  it("does not invent journey ribbons from graph edges alone", () => {
    const fixture = loadJson("etl-snapshot-v1.json")
    const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    const braid = prepareMotifBraid(prepared.atlas)
    expect(braid.groups).toEqual([])
    expect(motifBraidLayout(makeCtx(braid)).sceneEdges ?? []).toEqual([])
    const route = followSupportedRoute(prepared.atlas, { fromNode: "ingest" })
    expect(route.status).toBe("unknown")
  })
})
