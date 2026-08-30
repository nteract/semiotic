import { describe, expect, it } from "vitest"
import { SOURCE_REGISTRY, TOTAL_ACTIONS } from "./data"
import {
  BOARD_CHART_ROWS,
  EVIDENCE_SUMMARY_ROWS,
  NEXT_QUESTIONS,
  projectStoryGeometry,
  STORY_CHAPTERS,
  STORY_CONNECTIONS,
  STORY_SECTION_IDS,
  STORY_STATIONS,
} from "./story"

describe("machine semiosphere reported story", () => {
  it("keeps six ordered chapters with one fixed visual apiece", () => {
    expect(STORY_CHAPTERS).toHaveLength(6)
    expect(new Set(STORY_CHAPTERS.map((chapter) => chapter.id)).size).toBe(6)
    expect(new Set(STORY_CHAPTERS.map((chapter) => chapter.visual)).size).toBe(6)
    expect(STORY_SECTION_IDS).toEqual(
      STORY_CHAPTERS.map((chapter) => `machine-semiosphere-chapter-${chapter.id}`),
    )
    expect(STORY_CHAPTERS[0].paragraphs.join(" ")).toContain("OpenAI cybersecurity evaluation")
    expect(STORY_CHAPTERS[0].paragraphs.join(" ")).toContain("Hugging Face")
  })

  it("keeps every chapter source in the checked-in registry", () => {
    const sourceIds = new Set(SOURCE_REGISTRY.map((source) => source.id))
    for (const chapter of STORY_CHAPTERS) {
      expect(chapter.sourceIds.length).toBeGreaterThan(0)
      for (const sourceId of chapter.sourceIds) expect(sourceIds.has(sourceId)).toBe(true)
    }
    expect(STORY_CHAPTERS.find((chapter) => chapter.id === "mechanism")?.sourceIds).toEqual(
      expect.arrayContaining(["salman-stigmergy-2024", "heylighen-stigmergy"]),
    )
    expect(STORY_CHAPTERS.find((chapter) => chapter.id === "meaning")?.sourceIds).toContain(
      "lotman-semiosphere",
    )
  })

  it("builds a valid authored transit map without treating routes as causation", () => {
    const stationIds = new Set(STORY_STATIONS.map((station) => station.id))
    expect(stationIds.size).toBe(STORY_STATIONS.length)
    for (const station of STORY_STATIONS) {
      expect(Number.isFinite(station.x)).toBe(true)
      expect(Number.isFinite(station.y)).toBe(true)
    }
    for (const connection of STORY_CONNECTIONS) {
      expect(stationIds.has(connection.source)).toBe(true)
      expect(stationIds.has(connection.target)).toBe(true)
      expect(connection.lines.length).toBeGreaterThan(0)
      if (connection.points) {
        for (const point of connection.points) {
          expect(Number.isFinite(point.x)).toBe(true)
          expect(Number.isFinite(point.y)).toBe(true)
        }
      }
    }
    expect(
      STORY_CONNECTIONS.some((connection) => /not a causal/i.test(connection.description)),
    ).toBe(true)
  })

  it("projects stations onto the actual rendered chapter heights", () => {
    const geometry = projectStoryGeometry([100, 200, 300, 400, 500, 600])
    const chapterStations = geometry.stations.filter((station) => station.kind === "chapter")

    expect(chapterStations).toHaveLength(6)
    expect(chapterStations[0].y).toBeLessThan(5)
    expect(chapterStations.at(-1).y).toBeGreaterThan(84)
    expect(geometry.connections.find((edge) => edge.points)?.points[0].y).not.toBe(12)
  })

  it("preserves exact counts, overlapping categories, bounded claims, and open questions", () => {
    expect(TOTAL_ACTIONS).toBe(17613)
    expect(BOARD_CHART_ROWS[0]).toMatchObject({
      label: "Messages + files (minimum)",
      value: 70000,
      displayValue: ">70,000",
    })
    expect(EVIDENCE_SUMMARY_ROWS.map((row) => row.status)).toEqual(
      expect.arrayContaining(["Supported", "Partly supported", "Testing", "Not established"]),
    )
    expect(NEXT_QUESTIONS.map((question) => question.id)).toEqual(
      expect.arrayContaining([
        "recognized-without-instruction",
        "crosses-model-family",
        "independently-reproduced",
      ]),
    )
  })
})
