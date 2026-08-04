import { describe, expect, it } from "vitest"
import {
  APOLLO_MISSIONS,
  APOLLO_MAX_DOMAIN_HOURS,
  APOLLO_PROCESS_EDGES,
  APOLLO_PROCESS_NODES,
  APOLLO_SUMMARY,
  axisTicksForMissionHours,
  elapsedHours,
  processDataForFocus,
} from "./apolloLunarChoreography"

describe("Apollo lunar choreography fixture", () => {
  it("parses NASA Ground Elapsed Time", () => {
    expect(elapsedHours("102:45:40")).toBeCloseTo(102.7611, 4)
    expect(elapsedHours("78:32")).toBeCloseTo(78.5333, 4)
    expect(() => elapsedHours("not-a-time")).toThrow("Invalid Apollo elapsed time")
  })

  it("preserves the nine-mission, 27-seat, 24-person story", () => {
    expect(APOLLO_MISSIONS).toHaveLength(9)
    expect(APOLLO_SUMMARY).toMatchObject({
      missions: 9,
      crewSeats: 27,
      uniquePeople: 24,
      lunarSurfacePeople: 12,
      soloOrbiters: 6,
      landingMissions: 6,
    })
    expect(APOLLO_SUMMARY.repeatVoyagers.map((row) => row.name).sort()).toEqual([
      "Gene Cernan",
      "Jim Lovell",
      "John Young",
    ])
  })

  it("keeps every process edge valid and every id unique", () => {
    const nodeIds = new Set(APOLLO_PROCESS_NODES.map((row) => row.id))
    const edgeIds = APOLLO_PROCESS_EDGES.map((row) => row.id)
    expect(new Set(edgeIds).size).toBe(edgeIds.length)
    for (const row of APOLLO_PROCESS_EDGES) {
      expect(nodeIds.has(row.source)).toBe(true)
      expect(nodeIds.has(row.target)).toBe(true)
      expect(row.value).toBeGreaterThan(0)
      expect(row.endTime).toBeGreaterThan(row.startTime)
      expect(row.people).toHaveLength(row.value)
    }
  })

  it("splits two surface crew from one solo orbiter and reunites all three", () => {
    for (const mission of APOLLO_MISSIONS.filter((row) => row.kind === "landing")) {
      const rows = APOLLO_PROCESS_EDGES.filter((row) => row.missionId === mission.id)
      expect(rows.find((row) => row.target === "SURFACE")?.value).toBe(2)
      expect(rows.find((row) => row.source === "SURFACE")?.value).toBe(2)
      expect(rows.find((row) => row.target === "RECOVERY")?.value).toBe(3)
    }
  })

  it("returns stable, bounded focus slices", () => {
    const all = processDataForFocus("all")
    const landings = processDataForFocus("landings")
    const apollo13 = processDataForFocus("apollo-13")
    expect(all.missions).toHaveLength(9)
    expect(all.domain).toEqual([0, 312])
    expect(landings.missions).toHaveLength(6)
    expect(landings.domain).toEqual(all.domain)
    expect(apollo13.missions.map((row) => row.id)).toEqual(["apollo-13"])
    expect(apollo13.domain).toEqual(all.domain)
    expect(apollo13.nodes.map((row) => row.id)).toEqual(["LAUNCH", "LIFEBOAT", "RECOVERY"])
    expect(APOLLO_MAX_DOMAIN_HOURS).toBe(312)
    expect(APOLLO_PROCESS_NODES.find((row) => row.id === "RECOVERY")?.xExtent).toEqual([0, 312])
    expect(axisTicksForMissionHours(APOLLO_MAX_DOMAIN_HOURS).at(-1)).toEqual({
      date: 312,
      label: "Day 13",
    })
  })
})
