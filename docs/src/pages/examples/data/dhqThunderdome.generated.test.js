import { describe, expect, it } from "vitest"
import * as generated from "./dhqThunderdome.generated"
import {
  COLLABORATION_TREND,
  CRITICAL_AI_ISSUE_PROFILE,
  CRITICAL_AI_ISSUE_SUMMARY,
  DH_HISTORY_TIMELINE,
  DHQ_DATA_NOTE,
  DHQ_DOSSIER,
  DHQ_PROVENANCE,
  EDITORIAL_STATISTICS,
  FIELD_RISERS,
  FIELD_RISERS_SUMMARY,
  MEDIA_FIELD_SUMMARY,
  MEDIA_FIELD_TRENDS,
  MEDIA_STUDIES_CONNECTIONS,
  MEDIA_STUDIES_CONNECTIONS_SUMMARY,
  PUBLICATION_STRUCTURE,
  SOURCE_TAG_TRENDS,
  THUNDERDOME_SCENES_META,
  TOOLS_PRACTICE_SUMMARY,
  TOOLS_PRACTICE_TRENDS,
} from "./dhqThunderdome.generated"

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
    expect(DHQ_PROVENANCE.repositoryCommit).toBe("acda567f6b46d43f709449e8f71392a51e5286df")
  })

  it("keeps the long history source-linked and makes AI one part of the tool history", () => {
    expect(DH_HISTORY_TIMELINE).toHaveLength(13)
    expect(DH_HISTORY_TIMELINE[0].id).toBe("index-thomisticus")
    expect(DH_HISTORY_TIMELINE.at(-1).id).toBe("dhq-ai-policy")
    expect(DH_HISTORY_TIMELINE.some((event) => event.id === "orbis")).toBe(true)
    expect(DH_HISTORY_TIMELINE.some((event) => event.id === "lda-special-issue")).toBe(true)
    expect(DH_HISTORY_TIMELINE.filter((event) => event.kind === "ai")).toHaveLength(2)
    expect(DH_HISTORY_TIMELINE.every((event) => event.sourceUrl.startsWith("https://"))).toBe(true)
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

  it("shows media studies receding even under a conservative media-field union", () => {
    expect(MEDIA_FIELD_TRENDS).toHaveLength(8)
    expect(
      MEDIA_FIELD_TRENDS.find(
        (row) => row.measure === "Explicit media studies" && row.period === "2007–11",
      ),
    ).toEqual({
      measure: "Explicit media studies",
      period: "2007–11",
      share: 36.7,
      taggedItems: 40,
      items: 109,
    })
    expect(
      MEDIA_FIELD_TRENDS.find(
        (row) => row.measure === "Explicit media studies" && row.period === "2022–25",
      ),
    ).toMatchObject({ share: 3.4, taggedItems: 8, items: 236 })
    expect(
      MEDIA_FIELD_TRENDS.find(
        (row) => row.measure === "Any media field" && row.period === "2007–11",
      ),
    ).toMatchObject({ share: 45, taggedItems: 49, items: 109 })
    expect(
      MEDIA_FIELD_TRENDS.find(
        (row) => row.measure === "Any media field" && row.period === "2022–25",
      ),
    ).toMatchObject({ share: 13.1, taggedItems: 31, items: 236 })
    expect(MEDIA_FIELD_SUMMARY.explicit.delta).toBe(-33.3)
    expect(MEDIA_FIELD_SUMMARY.anyMediaField.delta).toBe(-31.9)
    expect(MEDIA_FIELD_SUMMARY.tagIds).toEqual([
      "media_studies",
      "media_history",
      "moving_images",
      "social_media",
      "games",
      "sound",
      "music",
      "comics",
    ])
  })

  it("finds that media studies also disappears from its former DHQ connections", () => {
    expect(MEDIA_STUDIES_CONNECTIONS).toHaveLength(10)
    expect(
      MEDIA_STUDIES_CONNECTIONS.find((row) => row.context === "Tools" && row.period === "2007–11"),
    ).toEqual({
      context: "Tools",
      period: "2007–11",
      share: 42.9,
      mediaItems: 6,
      contextItems: 14,
    })
    expect(
      MEDIA_STUDIES_CONNECTIONS.find((row) => row.context === "Tools" && row.period === "2022–25"),
    ).toMatchObject({ share: 0, mediaItems: 0, contextItems: 32 })
    expect(
      MEDIA_STUDIES_CONNECTIONS.find(
        (row) => row.context === "Project report" && row.period === "2022–25",
      ),
    ).toMatchObject({ share: 2.5, mediaItems: 1, contextItems: 40 })
    expect(MEDIA_STUDIES_CONNECTIONS_SUMMARY.contexts.digitalHumanities).toMatchObject({
      earlyMediaItems: 11,
      earlyContextItems: 27,
      earlyShare: 40.7,
      lateMediaItems: 0,
      lateContextItems: 46,
      lateShare: 0,
    })
    expect(MEDIA_STUDIES_CONNECTIONS_SUMMARY.contexts.culturalCriticism.lateMediaItems).toBe(0)
  })

  it("distinguishes explicit tools and project reports from technical practice", () => {
    expect(TOOLS_PRACTICE_TRENDS).toHaveLength(12)
    expect(
      TOOLS_PRACTICE_TRENDS.find((row) => row.measure === "Either" && row.period === "2017–21"),
    ).toEqual({
      measure: "Either",
      period: "2017–21",
      share: 44.1,
      taggedItems: 127,
      items: 288,
    })
    expect(
      TOOLS_PRACTICE_TRENDS.find((row) => row.measure === "Either" && row.period === "2022–25"),
    ).toMatchObject({ share: 26.3, taggedItems: 62, items: 236 })
    expect(TOOLS_PRACTICE_SUMMARY.audit2024To2025).toEqual({
      items: 91,
      tools: 5,
      projectReport: 3,
      methodItems: 28,
      methodAndTools: 1,
    })
    expect(TOOLS_PRACTICE_SUMMARY.lateCaseStudies).toEqual({
      items: 13,
      tools: 0,
      projectReport: 1,
    })
  })

  it("identifies the humanities-facing fields that gained the most ground", () => {
    expect(FIELD_RISERS).toHaveLength(16)
    expect(FIELD_RISERS_SUMMARY.leaders.map((row) => row.tagId)).toEqual([
      "race",
      "ethics",
      "minimal_computing",
      "history",
      "social_justice",
      "globalDH",
      "archives",
      "gender",
    ])
    expect(FIELD_RISERS_SUMMARY.leaders[0]).toEqual({
      tagId: "race",
      tag: "Race",
      earlyShare: 0.9,
      lateShare: 14.4,
      delta: 13.5,
    })
    expect(
      FIELD_RISERS.find((row) => row.tagId === "history" && row.period === "2022–25"),
    ).toMatchObject({ share: 21.2, taggedItems: 50, items: 236, delta: 5.6 })
  })

  it("profiles the code-and-AI issue with article-level deduplicated tags", () => {
    expect(CRITICAL_AI_ISSUE_PROFILE).toHaveLength(8)
    expect(CRITICAL_AI_ISSUE_SUMMARY).toMatchObject({
      volume: 17,
      issue: 2,
      publicationYear: 2023,
      items: 26,
      tools: 9,
      codeStudies: 9,
      machineLearning: 3,
      mediaStudies: 0,
    })
    expect(CRITICAL_AI_ISSUE_PROFILE.find((row) => row.tagId === "cultural_criticism")).toEqual({
      tagId: "cultural_criticism",
      tag: "Cultural criticism",
      count: 4,
      share: 15.4,
      items: 26,
    })
    expect(CRITICAL_AI_ISSUE_PROFILE.find((row) => row.tagId === "media_studies")).toMatchObject({
      count: 0,
      share: 0,
      items: 26,
    })
    expect(DHQ_DATA_NOTE).toContain("at most once per item")
  })

  it("replaces the old metadata and recommendation scenes and exports", () => {
    expect(THUNDERDOME_SCENES_META.slice(4).map((scene) => scene.id)).toEqual([
      "media-exit",
      "tools-practice",
      "field-risers",
      "critical-ai",
    ])
    for (const oldExport of [
      "DHQ_CLASSIFICATION_COUNTS",
      "METADATA_CLOCK_ITEMS",
      "METADATA_CLOCK_SUMMARY",
      "RECOMMENDATION_ARTICLE_INDEX",
      "RECOMMENDATION_OVERLAPS",
      "RECOMMENDATION_SUMMARY",
      "RECOMMENDATION_WALKS",
      "buildClassificationFlow",
    ]) {
      expect(generated).not.toHaveProperty(oldExport)
    }
  })
})
