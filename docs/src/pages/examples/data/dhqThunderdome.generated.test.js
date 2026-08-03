import { describe, expect, it } from "vitest"
import {
  COLLABORATION_TREND,
  DH_HISTORY_TIMELINE,
  DHQ_CLASSIFICATION_COUNTS,
  DHQ_DOSSIER,
  DHQ_PROVENANCE,
  EDITORIAL_STATISTICS,
  METADATA_CLOCK_ITEMS,
  METADATA_CLOCK_SUMMARY,
  PUBLICATION_STRUCTURE,
  RECOMMENDATION_ARTICLE_INDEX,
  RECOMMENDATION_OVERLAPS,
  RECOMMENDATION_SUMMARY,
  RECOMMENDATION_WALKS,
  SOURCE_TAG_TRENDS,
  buildClassificationFlow,
} from "./dhqThunderdome.generated"

function expectValidGraph(graph) {
  const nodeIds = graph.nodes.map((node) => node.id)
  expect(new Set(nodeIds).size).toBe(nodeIds.length)
  expect(graph.edges.length).toBeGreaterThan(0)
  for (const edge of graph.edges) {
    expect(nodeIds).toContain(edge.source)
    expect(nodeIds).toContain(edge.target)
    expect(edge.value).toBeGreaterThan(0)
    expect(edge.sourceIds.length).toBeGreaterThan(0)
  }
}

function expectConservedFlow(flow) {
  const inbound = new Map()
  const outbound = new Map()
  for (const edge of flow.edges) {
    inbound.set(edge.target, (inbound.get(edge.target) ?? 0) + edge.value)
    outbound.set(edge.source, (outbound.get(edge.source) ?? 0) + edge.value)
  }

  for (const node of flow.nodes) {
    if (inbound.has(node.id) && outbound.has(node.id)) {
      expect(outbound.get(node.id), `${node.id} must conserve flow`).toBe(inbound.get(node.id))
    }
  }
}

describe("DHQ Thunderdome generated data", () => {
  it("pins a public published-record scope rather than a fictional dossier", () => {
    expect(DHQ_DOSSIER.title).toBe("Digital Humanities Quarterly")
    expect(DHQ_DOSSIER.sourceItems).toBe(806)
    expect(DHQ_PROVENANCE.scope).toContain("2007 through 2025")
    expect(DHQ_PROVENANCE.corpusUrl).toBe("https://dhq.digitalhumanities.org/data/dhq-xml.zip")
    expect(DHQ_PROVENANCE.corpusSha256).toHaveLength(64)
    expect(DHQ_PROVENANCE.repositoryCommit).toBe(
      "acda567f6b46d43f709449e8f71392a51e5286df",
    )
  })

  it("keeps the long history source-linked and makes AI one part of the tool history", () => {
    expect(DH_HISTORY_TIMELINE).toHaveLength(13)
    expect(DH_HISTORY_TIMELINE[0].id).toBe("index-thomisticus")
    expect(DH_HISTORY_TIMELINE.at(-1).id).toBe("dhq-ai-policy")
    expect(DH_HISTORY_TIMELINE.some((event) => event.id === "orbis")).toBe(true)
    expect(DH_HISTORY_TIMELINE.some((event) => event.id === "lda-special-issue")).toBe(true)
    expect(DH_HISTORY_TIMELINE.filter((event) => event.kind === "ai")).toHaveLength(2)
    expect(DH_HISTORY_TIMELINE.every((event) => event.sourceUrl.startsWith("https://"))).toBe(
      true,
    )
  })

  it("separates public TOC placement from aggregate regular/special statistics", () => {
    expectConservedFlow(PUBLICATION_STRUCTURE)
    expect(PUBLICATION_STRUCTURE.namedClusterCount).toBe(38)
    expect(PUBLICATION_STRUCTURE.placedInNamedClusters).toBe(353)
    expect(
      PUBLICATION_STRUCTURE.edges
        .filter((edge) => edge.source === "all")
        .reduce((sum, edge) => sum + edge.value, 0),
    ).toBe(806)
    expect(EDITORIAL_STATISTICS.peerReviewedPublished).toBe(710)
    expect(EDITORIAL_STATISTICS.regularPublished).toBe(386)
    expect(EDITORIAL_STATISTICS.specialPublished).toBe(324)
    expect(EDITORIAL_STATISTICS.note).toContain("not interchangeable acceptance rates")
  })

  it("keeps annual byline rates and source-tag trends explicitly multi-label", () => {
    expect(COLLABORATION_TREND).toHaveLength(38)
    for (let year = 2007; year <= 2025; year += 1) {
      const records = COLLABORATION_TREND.filter((row) => row.year === year)
      expect(records).toHaveLength(2)
      expect(records.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(100, 1)
    }
    expect(SOURCE_TAG_TRENDS).toHaveLength(32)
    expect(SOURCE_TAG_TRENDS.every((row) => row.sourceRecipe.includes("multi-label"))).toBe(true)
  })

  it("keeps the source-tag display policy explicit and conserved", () => {
    const defaultFlow = buildClassificationFlow("default")
    const preserveFlow = buildClassificationFlow("preserve")
    expectConservedFlow(defaultFlow)
    expectConservedFlow(preserveFlow)
    expect(defaultFlow.summary.total).toBe(806)
    expect(defaultFlow.summary.multiple).toBe(DHQ_CLASSIFICATION_COUNTS.multiple)
    expect(defaultFlow.summary.absent).toBe(DHQ_CLASSIFICATION_COUNTS.absent)
    expect(defaultFlow.summary.finding).toContain("reduced")
    expect(preserveFlow.summary.finding).toContain("retain")
    expect(() => buildClassificationFlow("fiction")).toThrow(RangeError)
  })

  it("records the archive's publication and metadata clocks separately", () => {
    expect(METADATA_CLOCK_SUMMARY.repositoryFilesTouched).toBe(697)
    expect(METADATA_CLOCK_SUMMARY.inScopeItems).toBe(METADATA_CLOCK_ITEMS.length)
    expect(METADATA_CLOCK_ITEMS).toHaveLength(697)
    expect(METADATA_CLOCK_ITEMS.every((item) => 2023 - item.publicationYear >= 0)).toBe(true)
    expect(METADATA_CLOCK_ITEMS.every((item) => item.observedChangeDate.startsWith("2023-07"))).toBe(
      true,
    )
    expect(METADATA_CLOCK_SUMMARY.note).toContain("not a claim")
  })

  it("filters recommendation evidence to public articles and preserves method disagreement", () => {
    expect(RECOMMENDATION_SUMMARY.indexedArticles).toBe(832)
    expect(RECOMMENDATION_SUMMARY.seed.articleId).toBe("000847")
    expect(RECOMMENDATION_SUMMARY.seed.distinctTopTenTargets).toBe(27)
    expect(RECOMMENDATION_SUMMARY.seed.targetsInAllThree).toBe(0)
    expect(RECOMMENDATION_SUMMARY.seed.distinctTopFiveTargets).toBe(15)
    expect(RECOMMENDATION_SUMMARY.unionDirectedEdges).toBe(22416)
    expect(RECOMMENDATION_SUMMARY.allThreeDirectedEdges).toBe(224)
    expect(RECOMMENDATION_SUMMARY.sourcesWithNoAllThreeTarget).toBe(646)
    expect(RECOMMENDATION_SUMMARY.thirtyDistinctArticles).toBe(74)
    expect(RECOMMENDATION_OVERLAPS).toHaveLength(832 * 3)
    expect(RECOMMENDATION_OVERLAPS.every((row) => row.articleId !== "000800")).toBe(true)
    expect(Object.keys(RECOMMENDATION_ARTICLE_INDEX)).toHaveLength(832)
    expect(RECOMMENDATION_ARTICLE_INDEX["000800"]).toBeUndefined()
    expect(RECOMMENDATION_ARTICLE_INDEX["000847"][0]).toContain("Facets of Friction")

    for (const method of ["keywords", "bm25", "specter"]) {
      const walk = RECOMMENDATION_WALKS[method]
      expect(walk.seedId).toBe("000847")
      expect(walk.nodes.some((node) => node.label === "Anna Sollazzo")).toBe(true)
      expectValidGraph(walk)
    }
  })
})
