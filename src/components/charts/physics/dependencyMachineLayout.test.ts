/**
 * Dependency-machine placement geometry.
 *
 * Tasks that share a lane *and* a dependency depth stack inside their level
 * band. The original code nudged them by `min(18, taskHeight * 0.3)` while
 * leaving them at full height, so a 58px tile shifted 17px overlapped its
 * neighbour by 41px — visible as stacked, unreadable tiles in any real project
 * plan (several lanes there have 2–3 tasks at the same depth).
 */
import { describe, expect, it } from "vitest"
import { compileDependencyMachine, routeDependencyTracks } from "./dependencyMachine"

/** Two Data tasks at depth 1, three Quality tasks at depth 1. */
const TASKS = [
  { id: "brief", title: "Brief", lane: "Product", dependsOn: [] },
  { id: "ingest", title: "Ingest", lane: "Data", dependsOn: ["brief"] },
  { id: "api", title: "API", lane: "Data", dependsOn: ["brief"] },
  { id: "nav", title: "Nav", lane: "Quality", dependsOn: ["brief"] },
  { id: "ssr", title: "SSR", lane: "Quality", dependsOn: ["brief"] },
  { id: "threat", title: "Threat", lane: "Quality", dependsOn: ["brief"] }
]

function layout(size: { width: number; height: number }) {
  const machine = compileDependencyMachine({
    data: TASKS,
    taskIDAccessor: "id",
    labelAccessor: "title",
    laneAccessor: "lane",
    dependencyAccessor: "dependsOn"
  })
  expect(machine.valid).toBe(true)
  return { machine, tracks: routeDependencyTracks(machine, size) }
}

function overlaps(
  a: { y: number; height: number },
  b: { y: number; height: number }
): boolean {
  return Math.abs(a.y - b.y) < (a.height + b.height) / 2
}

describe("routeDependencyTracks task placement", () => {
  it("never overlaps tasks that share a lane and a depth", () => {
    const { machine, tracks } = layout({ width: 900, height: 620 })
    const byKey = new Map<string, typeof tracks.tasks>()
    for (const task of tracks.tasks) {
      const key = `${task.laneIndex}:${task.level}`
      byKey.set(key, [...(byKey.get(key) ?? []), task])
    }

    // Sanity: the fixture really does produce multi-task groups.
    const groups = [...byKey.values()].filter((group) => group.length > 1)
    expect(groups.length).toBeGreaterThan(0)
    expect(Math.max(...groups.map((group) => group.length))).toBe(3)

    for (const group of groups) {
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          expect(
            overlaps(group[i], group[j]),
            `${group[i].taskID} overlaps ${group[j].taskID}`
          ).toBe(false)
        }
      }
    }
    expect(machine.nodes).toHaveLength(TASKS.length)
  })

  it("keeps a stacked group inside its level band", () => {
    const { tracks } = layout({ width: 900, height: 620 })
    const quality = tracks.tasks.filter((task) => task.lane === "Quality" && task.level === 1)
    expect(quality).toHaveLength(3)

    const singles = tracks.tasks.filter((task) => task.lane === "Product")
    const bandCenter = singles[0].y
    const step = quality[1].y - quality[0].y
    // The three tiles are evenly stepped and centered on their own band, so the
    // group cannot drift into the neighbouring depth.
    expect(quality[2].y - quality[1].y).toBeCloseTo(step, 5)
    const groupCenter = (quality[0].y + quality[2].y) / 2
    expect(groupCenter).toBeGreaterThan(bandCenter)
    expect(Math.abs(groupCenter - quality[1].y)).toBeLessThan(0.001)
  })

  it("keeps stacked tiles full height when the band allows, shrinks when it doesn't", () => {
    // Roomy: the band is tall enough for three full-height tiles plus gaps, so
    // nothing needs to shrink — the step alone separates them.
    const roomy = layout({ width: 900, height: 620 }).tracks
    const roomySolo = roomy.tasks.find((task) => task.taskID === "brief")!
    const roomyStacked = roomy.tasks.find((task) => task.taskID === "nav")!
    expect(roomyStacked.height).toBeLessThanOrEqual(roomySolo.height)

    // Cramped: three tiles can't fit at full height, so they shrink rather than
    // overlap — and stay tall enough to carry a label and a progress row.
    const tight = layout({ width: 360, height: 300 }).tracks
    const tightSolo = tight.tasks.find((task) => task.taskID === "brief")!
    const tightStacked = tight.tasks.find((task) => task.taskID === "nav")!
    expect(tightStacked.height).toBeLessThan(tightSolo.height)
    expect(tightStacked.height).toBeGreaterThanOrEqual(22)
  })

  it("holds at a cramped size", () => {
    const { tracks } = layout({ width: 360, height: 320 })
    const quality = tracks.tasks.filter((task) => task.lane === "Quality" && task.level === 1)
    for (let i = 0; i < quality.length; i += 1) {
      for (let j = i + 1; j < quality.length; j += 1) {
        expect(overlaps(quality[i], quality[j])).toBe(false)
      }
    }
  })
})
