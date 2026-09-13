import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import type { NetworkLayoutContext } from "../../stream/networkCustomLayout"
import { assignedDenominator } from "./compare"
import { prepareMotifBraid, ribbonSupportsRoute } from "./braid"
import { buildMotifProfile } from "./profile"
import { selectCapsules } from "./capsules"
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

function makeCtx(
  braid: ReturnType<typeof prepareMotifBraid>
): NetworkLayoutContext<{
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
    const loop = getMotifPrevalence(atlas, {
      template: "repeated-state-episode"
    })
    expect(loop.value?.entityCount).toBe(1600 + 6000)
    expect(atlas.comparison?.rows[0].motifUsers["repeated-state-episode"]).toBe(
      1600
    )
    expect(atlas.comparison?.rows[1].motifUsers["repeated-state-episode"]).toBe(
      6000
    )
    expect(atlas.comparison?.rows[0].assigned).toBe(20000)
  })

  it("keeps journey-type counts on the assigned denominator", () => {
    const controlLoop = braid.groups.find(
      (group) => group.id === "group:mc-loop"
    )
    const treatmentLoop = braid.groups.find(
      (group) => group.id === "group:mt-loop"
    )
    expect(controlLoop?.entityCount).toBe(1600)
    expect(treatmentLoop?.entityCount).toBe(6000)
    expect(controlLoop?.signature).toBe(treatmentLoop?.signature)
    expect(controlLoop?.signature.split(">").slice(0, 2)).toEqual([
      "home",
      "catalog"
    ])
  })

  it("shares leaf order across stacked partition dendrograms", () => {
    const controlOrder = braid.groups
      .filter((group) => group.partition === "mobile/control")
      .map((group) => group.signature)
    const treatmentOrder = braid.groups
      .filter((group) => group.partition === "mobile/treatment")
      .map((group) => group.signature)
    expect(controlOrder).toEqual(treatmentOrder)
    expect([...braid.signatureOrder].sort()).toEqual(
      [...new Set([...controlOrder, ...treatmentOrder])].sort()
    )
  })

  it("draws a stepped dendrogram of parallel tracks, not ribbons or a false root", () => {
    const scene = motifBraidLayout(makeCtx(braid))
    const edges = scene.sceneEdges ?? []
    expect(scene.labels?.some((label) => label.text === "mobile/control")).toBe(
      true
    )
    expect(
      scene.labels?.some((label) => label.text === "mobile/treatment")
    ).toBe(true)
    expect(edges.length).toBeGreaterThan(0)
    expect(edges.every((edge) => edge.type === "curved")).toBe(true)
    expect(edges.every((edge) => edge.style.fill === "none")).toBe(true)
    expect(
      edges.every(
        (edge) => (edge.datum as { falseRoot?: boolean }).falseRoot !== true
      )
    ).toBe(true)
    expect(
      edges.some((edge) => String(edge.id).includes("__braid_root__"))
    ).toBe(false)
    expect(
      edges.some(
        (edge) =>
          edge.type === "curved" &&
          /^M[\d.-]+,[\d.-]+$/.test(edge.pathD) === false
      )
    ).toBe(true)

    const sharedHome = edges.filter(
      (edge) =>
        String(edge.id).includes(":home>catalog:") &&
        String(edge.id).startsWith("step:mobile/control:")
    )
    expect(sharedHome.length).toBe(2)
    const ordinary = braid.groups.find(
      (group) => group.id === "group:mc-ordinary"
    )!
    const loop = braid.groups.find((group) => group.id === "group:mc-loop")!
    const ordinaryTrack = sharedHome.find(
      (edge) => (edge.datum as { groupId: string }).groupId === ordinary.id
    )
    const loopTrack = sharedHome.find(
      (edge) => (edge.datum as { groupId: string }).groupId === loop.id
    )
    expect(ordinaryTrack?.style.strokeWidth ?? 0).toBeGreaterThan(
      loopTrack?.style.strokeWidth ?? 0
    )
  })
})

describe("Motif Braid search", () => {
  const fixture = loadJson("search-no-result-v1.json")
  const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
  if (!prepared.ok) {
    throw new Error(prepared.issues.map((issue) => issue.message).join("; "))
  }

  it("counts looping sessions as assigned entities, not 15-point uplift", () => {
    const loop = getMotifPrevalence(prepared.atlas, {
      template: "repeated-state-episode"
    })
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
    const composite = followSupportedRoute(prepared.atlas, {
      route: ["A", "X", "D"]
    })
    expect(composite.value?.supported).toBe(false)
    const prefixes = new Set(
      prepared.atlas.prefixForest?.nodes.map((node) => node.id)
    )
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

function prepareFixture(fixture: ReturnType<typeof loadJson>) {
  const result = prepareNetworkAtlas(fixture.spec, fixture.source)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.atlas
}

function journeys(paths: string[][]) {
  const fixture = loadJson("search-no-result-v1.json")
  const states = [...new Set(paths.flat())]
  fixture.spec.coordinate = { kind: "ordinal", sectionIds: states }
  fixture.spec.forest.display = { kind: "observed-prefix" }
  fixture.source.nodes = states.map((id) => ({ id, sectionId: id }))
  fixture.source.edges = []
  fixture.source.occurrences = paths.map((nodePath, i) => ({
    id: `occurrence-${i}`,
    entityId: `entity-${i}`,
    entityCount: 7,
    nodePath,
    complete: true
  }))
  return fixture
}

describe("Motif Braid review regressions", () => {
  it("anchors checkout episodes to the second checkout visit", () => {
    const atlas = prepareFixture(loadJson("checkout-ab-v1.json"))
    const match = atlas.motifs.matches.find(
      (m) => m.roles.occurrence === "mc-loop"
    )!
    expect(match.nodePath).toEqual(["checkout", "redirect", "checkout"])
    expect(match.startSectionId).toBe("checkout")
    expect(match.completionSectionId).toBe("checkout")
    expect(match.intersectSectionIds).toEqual(["checkout", "retry"])
    expect(
      getMotifPrevalence(atlas, {
        template: "repeated-state-episode",
        window: { kind: "completion", sectionId: "outcome" }
      }).value?.entityCount
    ).toBe(0)
    const profile = buildMotifProfile(atlas, { partition: "mobile/control" })
    expect(
      profile.cells.find((cell) => cell.sectionId === "checkout")
        ?.completionCount
    ).toBe(1600)
    expect(
      profile.cells.find((cell) => cell.sectionId === "outcome")
        ?.intersectionCount
    ).toBe(0)
  })

  it("keeps the first-to-second episode when a state is visited three times", () => {
    const atlas = prepareFixture(journeys([["A", "B", "A", "C", "A", "D"]]))
    const matches = atlas.motifs.matches.filter(
      (m) => m.template === "repeated-state-episode"
    )
    expect(matches).toHaveLength(1)
    expect(matches[0].nodePath).toEqual(["A", "B", "A"])
    expect(matches[0].completionSectionId).toBe("A")
  })

  it("uses the declared global denominator without a comparison", () => {
    const fixture = loadJson("search-no-result-v1.json")
    fixture.spec.measures.population = fixture.spec.measures.assigned
    fixture.spec.motifs.denominatorRef = "population"
    fixture.source.measureValues.find(
      (m) => m.measureId === "assigned"
    )!.measureId = "population"
    expect(
      buildMotifProfile(prepareFixture(fixture)).cells.every(
        (c) => c.denominator === 50000
      )
    ).toBe(true)
  })

  it.each([undefined, "control"])(
    "deduplicates entity weights across episodes and occurrences (%s)",
    (partition) => {
      const fixture = journeys([
        ["A", "B", "A", "B"],
        ["A", "B", "A", "B"]
      ])
      for (const occurrence of fixture.source.occurrences!) {
        occurrence.entityId = "__proto__"
        occurrence.partition = "control"
      }
      const atlas = prepareFixture(fixture)
      const profile = buildMotifProfile(atlas, { partition })
      expect(profile.cells.map((c) => c.completionCount)).toEqual([7, 7])
      expect(profile.cells.map((c) => c.intersectionCount)).toEqual([7, 7])
    }
  )

  it("keeps an entity's episode in its originating partition", () => {
    const fixture = journeys([
      ["A", "B", "A"],
      ["A", "B"]
    ])
    fixture.spec.comparison = {
      partitions: ["control", "treatment"],
      denominatorMeasureId: "assigned"
    }
    fixture.source.occurrences![0].partition = "control"
    fixture.source.occurrences![1].partition = "treatment"
    fixture.source.occurrences![1].entityId = "entity-0"
    const atlas = prepareFixture(fixture)
    expect(
      buildMotifProfile(atlas, { partition: "treatment" }).cells.map(
        (c) => c.intersectionCount
      )
    ).toEqual([0, 0])
    expect(atlas.comparison?.rows[1].motifUsers["repeated-state-episode"]).toBe(
      0
    )
    expect(atlas.comparison?.rows[0].motifUsers["repeated-state-episode"]).toBe(
      7
    )
  })

  it("uses stable, unambiguous spec revisions", () => {
    const fixture = loadJson("checkout-ab-v1.json")
    const first = prepareFixture(fixture).analysisRevision
    fixture.spec = Object.fromEntries(
      Object.entries(fixture.spec).reverse()
    ) as NetworkAtlasSpec
    expect(prepareFixture(fixture).analysisRevision).toBe(first)
    fixture.source.revision = "a|b"
    fixture.spec.dataRevision = "c"
    const second = prepareFixture(fixture).analysisRevision
    fixture.source.revision = "a"
    fixture.spec.dataRevision = "b|c"
    expect(prepareFixture(fixture).analysisRevision).not.toBe(second)
  })

  it("selects capsules by occurrence identity even when entities recur", () => {
    const fixture = journeys([
      ["A", "B", "A"],
      ["A", "B", "A"]
    ])
    fixture.source.occurrences![1].entityId =
      fixture.source.occurrences![0].entityId
    const capsules = selectCapsules(prepareFixture(fixture).motifs.matches)
    expect(capsules.map((c) => c.occurrenceIds)).toEqual([
      ["occurrence-0"],
      ["occurrence-1"]
    ])
    expect(capsules.every((c) => c.selected)).toBe(true)
  })

  it("orders complete journeys by the reference partition's prefix forest", () => {
    const fixture = journeys([
      ["A", "B"],
      ["A", "Z"]
    ])
    fixture.spec.forest.display = {
      kind: "observed-prefix",
      referencePartition: "reference"
    }
    fixture.source.occurrences![1].partition = "reference"
    const braid = prepareMotifBraid(prepareFixture(fixture))
    expect(braid.signatureOrder).toEqual(["A>Z", "A>B"])
  })

  it("matches contiguous route segments, including IDs containing separators", () => {
    const atlas = prepareFixture(
      journeys([
        ["AB", "C", "D"],
        ["X>Y", "Z"]
      ])
    )
    const braid = prepareMotifBraid(atlas)
    for (const route of [[], ["B"], ["AB", "D"], ["X", "Y"], ["Y", "Z"]]) {
      expect(ribbonSupportsRoute(braid, route)).toBe(false)
    }
    expect(ribbonSupportsRoute(braid, ["C", "D"])).toBe(true)
    expect(ribbonSupportsRoute(braid, ["X>Y", "Z"])).toBe(true)
    expect(
      followSupportedRoute(atlas, { route: ["AB", "D"] }).value?.supported
    ).toBe(false)
  })

  it("does not draw a sibling strand through a state with a shared name prefix", () => {
    const braid = prepareMotifBraid(
      prepareFixture(
        journeys([
          ["A", "B"],
          ["A", "BC"]
        ])
      )
    )
    const edges = motifBraidLayout(makeCtx(braid)).sceneEdges!
    expect(
      edges.filter((edge) => edge.id === "step:all:A>B:group:occurrence-1")
    ).toHaveLength(0)
    expect(
      edges.filter((edge) => edge.id === "step:all:A>BC:group:occurrence-1")
    ).toHaveLength(1)
  })

  it("keeps separator-containing state IDs distinct from multi-state paths", () => {
    const braid = prepareMotifBraid(
      prepareFixture(
        journeys([
          ["A>B", "C"],
          ["A", "B", "C"],
          ["A%3EB", "C"]
        ])
      )
    )
    expect(new Set(braid.signatureOrder).size).toBe(3)
    expect(new Set(braid.prefixForest.order).size).toBe(
      braid.prefixForest.nodes.length
    )
    const edges = motifBraidLayout(makeCtx(braid)).sceneEdges!
    expect(new Set(edges.map((edge) => edge.id)).size).toBe(edges.length)
    for (const group of braid.groups) {
      expect(
        edges.filter(
          (edge) => (edge.datum as { groupId: string }).groupId === group.id
        )
      ).toHaveLength(group.nodePath.length - 1)
    }
  })

  it("keeps all visible geometry and styling independent of hidden partitions", () => {
    const fixture = loadJson("checkout-ab-v1.json")
    const beforeProfile = buildMotifProfile(prepareFixture(fixture))
    const before = motifBraidLayout(
      makeCtx(prepareMotifBraid(prepareFixture(fixture)))
    )
    fixture.source.nodes.push({ id: "hidden", sectionId: "home" })
    fixture.source.occurrences!.push({
      id: "hidden",
      entityId: "hidden",
      partition: "desktop/hidden",
      entityCount: 1000000,
      complete: true,
      nodePath: ["hidden", ...Array<string>(20).fill("home")]
    })
    const after = motifBraidLayout(
      makeCtx(prepareMotifBraid(prepareFixture(fixture)))
    )
    expect(after).toEqual(before)
    expect(buildMotifProfile(prepareFixture(fixture))).toEqual(beforeProfile)
  })

  it.each([
    [
      "comparison denominator",
      (s: NetworkAtlasSpec) => {
        s.comparison!.denominatorMeasureId = "purchases"
      }
    ],
    [
      "comparison reference",
      (s: NetworkAtlasSpec) => {
        s.comparison!.referencePartition = "mobile/treatment"
      }
    ],
    [
      "display reference",
      (s: NetworkAtlasSpec) => {
        s.forest.display = {
          kind: "observed-prefix",
          referencePartition: "mobile/treatment"
        }
      }
    ],
    [
      "motif budget",
      (s: NetworkAtlasSpec) => {
        s.motifs.matchBudget = 1
      }
    ],
    [
      "motif denominator",
      (s: NetworkAtlasSpec) => {
        s.motifs.denominatorRef = "purchases"
      }
    ],
    [
      "temporal window",
      (s: NetworkAtlasSpec) => {
        s.temporal = { kind: "window", start: 0, end: 100 }
      }
    ],
    [
      "evidence policy",
      (s: NetworkAtlasSpec) => {
        s.evidencePolicyId = "different"
      }
    ]
  ] as const)("revises prepared analysis for %s", (_, change) => {
    const fixture = loadJson("checkout-ab-v1.json")
    const revision = prepareFixture(fixture).analysisRevision
    change(fixture.spec)
    expect(prepareFixture(fixture).analysisRevision).not.toBe(revision)
  })
})
