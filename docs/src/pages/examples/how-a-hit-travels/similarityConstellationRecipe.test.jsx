import { describe, expect, it } from "vitest"
import { getChartRecipe, getRecipeLayout } from "semiotic/ai"
import { HIT_TRAVELS_DATA } from "./hitTravelsData.generated"
import { similarityConstellationLayout } from "./SimilarityConstellation"
import {
  SIMILARITY_CONSTELLATION_LAYOUT_ID,
  SIMILARITY_CONSTELLATION_RECIPE_ID,
  serializedSimilarityConstellation,
  similarityConstellationRecipe,
} from "./similarityConstellationRecipe"

const HERO = HIT_TRAVELS_DATA.titles.find((title) => title.id === "crash-course-romance")
const CURSOR = 6

function layoutNodes() {
  const historyByCountry = new Map(
    HERO.countryHistory.map((country) => [country.countryId, country]),
  )
  return HIT_TRAVELS_DATA.countries.map((country) => {
    const history = historyByCountry.get(country.id)
    return {
      ...country,
      history,
      firstElapsedWeek: history?.firstElapsedWeek ?? null,
      activeWeeks: history?.activeWeeks ?? 0,
      bestRank: history?.bestRank ?? null,
      rankAtCursor: history?.ranks.find(([elapsedWeek]) => elapsedWeek === CURSOR)?.[1] ?? null,
    }
  })
}

function runLayout(layoutMode, { plotWidth = 720, plotHeight = 420 } = {}) {
  const layout = HIT_TRAVELS_DATA.similarityLayouts["distinctive-rank"]
  return similarityConstellationLayout({
    nodes: layoutNodes().map((country) => ({ id: country.id, data: country })),
    edges: layout.edges.map((edge) => ({ id: edge.id, data: edge })),
    dimensions: {
      width: plotWidth,
      height: plotHeight,
      plot: { x: 0, y: 0, width: plotWidth, height: plotHeight },
    },
    theme: {
      semantic: {},
      categorical: [],
    },
    resolveColor: () => "#000000",
    config: {
      positions: layout.positions,
      layoutMode,
      cursor: CURSOR,
      selectedCountryId: "KR",
      reducedMotion: false,
    },
    selection: null,
  })
}

function nodesByCountry(result) {
  return new Map(result.sceneNodes.map((node) => [node.datum.id, node]))
}

describe("similarityConstellationLayout", () => {
  it("is deterministic and preserves stable country identities between display modes", () => {
    const firstConstellation = runLayout("constellation")
    const secondConstellation = runLayout("constellation")
    const map = runLayout("map")

    expect(secondConstellation.sceneNodes).toEqual(firstConstellation.sceneNodes)
    expect(secondConstellation.overlays.props.nodes).toEqual(
      firstConstellation.overlays.props.nodes,
    )
    expect(secondConstellation.overlays.props.edges).toEqual(
      firstConstellation.overlays.props.edges,
    )

    const expectedIds = HIT_TRAVELS_DATA.countries.map((country) => `hit-country-${country.id}`)
    expect(firstConstellation.sceneNodes.map((node) => node.id)).toEqual(expectedIds)
    expect(map.sceneNodes.map((node) => node.id)).toEqual(expectedIds)
    expect(map.sceneNodes.map((node) => node.datum.id)).toEqual(
      firstConstellation.sceneNodes.map((node) => node.datum.id),
    )

    const mapByCountry = nodesByCountry(map)
    const constellationByCountry = nodesByCountry(firstConstellation)
    expect(
      HIT_TRAVELS_DATA.countries.some((country) => {
        const mapNode = mapByCountry.get(country.id)
        const constellationNode = constellationByCountry.get(country.id)
        return mapNode.cx !== constellationNode.cx || mapNode.cy !== constellationNode.cy
      }),
    ).toBe(true)

    const unitedStates = HIT_TRAVELS_DATA.countries.find((country) => country.id === "US")
    const usMapNode = mapByCountry.get("US")
    const usConstellationNode = constellationByCountry.get("US")
    const usPosition = HIT_TRAVELS_DATA.similarityLayouts["distinctive-rank"].positions.US
    expect(usMapNode.cx).toBeCloseTo(22 + ((unitedStates.longitude + 180) / 360) * (720 - 44))
    expect(usMapNode.cy).toBeCloseTo(24 + ((72 - unitedStates.latitude) / 132) * (420 - 48))
    expect(usConstellationNode.cx).toBeCloseTo(28 + usPosition.x * (720 - 56))
    expect(usConstellationNode.cy).toBeCloseTo(28 + usPosition.y * (420 - 56))
  })

  it("emits one data-bearing hit target for every visible country", () => {
    const result = runLayout("constellation", { plotWidth: 480, plotHeight: 420 })
    const expectedCountryIds = new Set(HIT_TRAVELS_DATA.countries.map((country) => country.id))

    expect(result.sceneEdges).toEqual([])
    expect(result.sceneNodes).toHaveLength(expectedCountryIds.size)
    expect(new Set(result.sceneNodes.map((node) => node.id)).size).toBe(expectedCountryIds.size)
    expect(new Set(result.sceneNodes.map((node) => node.datum.id))).toEqual(expectedCountryIds)

    for (const node of result.sceneNodes) {
      expect(node.type).toBe("circle")
      expect(node.id).toBe(`hit-country-${node.datum.id}`)
      expect(node.r * 2).toBeGreaterThanOrEqual(24)
      expect(node.style).toMatchObject({ opacity: 0 })
      expect(node.label).toContain(node.datum.name)
      expect(node.accessibility.label).toBe(node.label)
      expect(node.accessibility.tableFields).toMatchObject({
        Country: node.datum.name,
        Region: node.datum.region,
        "Ranked weeks": node.datum.activeWeeks,
      })
    }

    expect(result.overlays.props.nodes).toHaveLength(expectedCountryIds.size)
    expect(result.overlays.props.edges).toHaveLength(
      HIT_TRAVELS_DATA.similarityLayouts["distinctive-rank"].edges.length,
    )
  })
})

describe("similarity constellation recipe", () => {
  it("registers the named portable recipe and its runtime layout", () => {
    expect(getChartRecipe(SIMILARITY_CONSTELLATION_RECIPE_ID)).toBe(similarityConstellationRecipe)
    expect(getRecipeLayout(SIMILARITY_CONSTELLATION_LAYOUT_ID)).toBe(similarityConstellationLayout)
    expect(similarityConstellationRecipe).toMatchObject({
      id: SIMILARITY_CONSTELLATION_RECIPE_ID,
      version: "1",
      frameFamily: "NetworkCustomChart",
      portability: "portable",
      layout: { id: SIMILARITY_CONSTELLATION_LAYOUT_ID },
      accessibility: {
        accessibleTable: "required",
        dataBearingSceneNodes: "required",
      },
      audit: {
        requireStableIds: true,
        requireDatumCoverage: true,
        expectedSceneNodeTypes: ["circle"],
      },
    })
    expect(serializedSimilarityConstellation).toEqual({
      recipe: SIMILARITY_CONSTELLATION_RECIPE_ID,
      recipeVersion: 1,
      parameters: {
        layoutMode: "constellation",
        weightingMode: "distinctive-rank",
        edgeCount: 4,
      },
    })
    expect(JSON.stringify(serializedSimilarityConstellation)).not.toContain("function")
  })

  it("describes and navigates the complete reference set without causal language", () => {
    const description = similarityConstellationRecipe.description({
      data: HIT_TRAVELS_DATA.countries,
      config: { layoutMode: "constellation" },
    })
    const navigation = similarityConstellationRecipe.navigation({
      data: HIT_TRAVELS_DATA.countries,
      config: {},
    })
    const navigatedCountries = navigation.children.flatMap((region) => region.children)

    expect(description.text).toContain(
      `${HIT_TRAVELS_DATA.manifest.referenceCountryCount} entities`,
    )
    expect(description.text).toContain("do not show influence")
    expect(description.text).not.toMatch(/spread from|caused|transmitted by/i)
    expect(navigatedCountries).toHaveLength(HIT_TRAVELS_DATA.countries.length)
    expect(new Set(navigatedCountries.map((country) => country.datum.id))).toEqual(
      new Set(HIT_TRAVELS_DATA.countries.map((country) => country.id)),
    )
  })
})
