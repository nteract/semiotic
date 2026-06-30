import { describe, expect, it } from "vitest"
import {
  PORT_COHORT_SUMMARIES,
  PORT_COHORTS,
  PORT_LOCATIONS,
  PORT_PROCESS_EDGES,
  PORT_PROCESS_NODES,
  PORT_REPLAY_EVENTS,
  PORT_ROUTES,
  aggregateBacklogEvents,
  backlogAtCursor,
  flowsAtTime,
  processEdgesAtTime,
  replayTimeForCursor,
} from "./portCongestionData"

describe("port congestion example data", () => {
  it("has unique identifiers and valid references", () => {
    const locationIds = new Set(PORT_LOCATIONS.map((location) => location.id))
    const routeIds = new Set(PORT_ROUTES.map((route) => route.id))
    const stageIds = new Set(PORT_PROCESS_NODES.map((node) => node.id))

    expect(locationIds.size).toBe(PORT_LOCATIONS.length)
    expect(routeIds.size).toBe(PORT_ROUTES.length)
    expect(new Set(PORT_COHORTS.map((cohort) => cohort.id)).size).toBe(PORT_COHORTS.length)
    expect(new Set(PORT_PROCESS_EDGES.map((edge) => edge.id)).size).toBe(PORT_PROCESS_EDGES.length)
    expect(new Set(PORT_REPLAY_EVENTS.map((event) => event.id)).size).toBe(PORT_REPLAY_EVENTS.length)

    for (const route of PORT_ROUTES) {
      expect(locationIds.has(route.origin)).toBe(true)
      expect(locationIds.has(route.destination)).toBe(true)
      expect(route.waypoints[0]).toBe(route.origin)
      expect(route.waypoints[route.waypoints.length - 1]).toBe(route.destination)
      expect(route.waypoints.length).toBeGreaterThanOrEqual(4)
      route.waypoints.forEach((waypoint) => {
        expect(locationIds.has(waypoint)).toBe(true)
      })
    }

    expect(new Set(PORT_ROUTES.map((route) => route.bottleneck)).size).toBe(
      PORT_ROUTES.length
    )

    for (const edge of PORT_PROCESS_EDGES) {
      expect(stageIds.has(edge.source)).toBe(true)
      expect(stageIds.has(edge.target)).toBe(true)
      expect(routeIds.has(edge.routeId)).toBe(true)
      expect(edge.endTime).toBeGreaterThan(edge.startTime)
    }
  })

  it("keeps the replay chronological and returns the backlog to zero", () => {
    for (let index = 1; index < PORT_REPLAY_EVENTS.length; index += 1) {
      expect(PORT_REPLAY_EVENTS[index].time).toBeGreaterThanOrEqual(
        PORT_REPLAY_EVENTS[index - 1].time
      )
    }

    expect(backlogAtCursor(PORT_REPLAY_EVENTS.length)).toBe(0)
    for (const route of PORT_ROUTES) {
      expect(backlogAtCursor(PORT_REPLAY_EVENTS.length, route.id)).toBe(0)
    }
  })

  it("derives stable map and process snapshots from the replay clock", () => {
    const time = replayTimeForCursor(PORT_REPLAY_EVENTS.length)
    const flows = flowsAtTime(time)
    expect(new Set(flows.map((flow) => flow.routeId)).size).toBe(PORT_ROUTES.length)
    expect(flows.length).toBeGreaterThan(PORT_ROUTES.length * 3)
    expect(flows.every((flow) => flow.sourceName && flow.targetName)).toBe(true)
    expect(processEdgesAtTime(time)).toHaveLength(PORT_PROCESS_EDGES.length)
  })

  it("summarizes every cohort with the four matrix measures", () => {
    // One row per cohort so the scatterplot matrix is a real cloud, not a
    // 5-route sketch.
    expect(PORT_COHORT_SUMMARIES.length).toBe(PORT_COHORTS.length)
    expect(PORT_COHORT_SUMMARIES.length).toBe(15)

    const routeIds = new Set(PORT_ROUTES.map((route) => route.id))
    for (const summary of PORT_COHORT_SUMMARIES) {
      expect(routeIds.has(summary.routeId)).toBe(true)
      for (const field of ["seaDays", "anchorageHours", "carbonTons", "teu"]) {
        expect(Number.isFinite(summary[field])).toBe(true)
        expect(summary[field]).toBeGreaterThan(0)
      }
    }

    // Rows are grouped by lane so colorBy="route" + ROUTE_COLORS assigns each
    // cohort its canonical lane color (d3 ordinal domain follows first
    // encounter). The first appearance of each lane must match PORT_ROUTES
    // order.
    const firstSeen = []
    const seen = new Set()
    for (const summary of PORT_COHORT_SUMMARIES) {
      if (!seen.has(summary.route)) {
        seen.add(summary.route)
        firstSeen.push(summary.route)
      }
    }
    expect(firstSeen).toEqual(PORT_ROUTES.map((route) => route.shortLabel))
  })

  it("keeps the matrix measure-key ranges honest", () => {
    // These bounds are printed verbatim as the manifest's axis key, so guard
    // them against future data tweaks.
    const range = (field) => {
      const values = PORT_COHORT_SUMMARIES.map((summary) => summary[field])
      return [Math.min(...values), Math.max(...values)]
    }
    expect(range("seaDays")).toEqual([11, 33.3])
    expect(range("anchorageHours")).toEqual([25, 82])
    expect(range("carbonTons")).toEqual([34, 81])
    expect(range("teu")).toEqual([374, 720])

    // The headline claim: ranked by sea days, the two longest-haul lanes wait
    // less than the two quickest, and Shanghai is the lone exception that
    // tops the anchorage queue from mid-ocean.
    const byLane = new Map()
    for (const summary of PORT_COHORT_SUMMARIES) {
      const lane = byLane.get(summary.route) || { sea: summary.seaDays, waits: [] }
      lane.waits.push(summary.anchorageHours)
      byLane.set(summary.route, lane)
    }
    const lanes = [...byLane.entries()]
      .map(([route, { sea, waits }]) => ({
        route,
        sea,
        meanWait: waits.reduce((sum, w) => sum + w, 0) / waits.length,
        maxWait: Math.max(...waits),
      }))
      .sort((a, b) => a.sea - b.sea)

    const quickest = lanes.slice(0, 2) // Rotterdam, Santos
    const longest = lanes.slice(-2) // Mumbai, Singapore
    const meanOf = (group) =>
      group.reduce((sum, lane) => sum + lane.meanWait, 0) / group.length
    expect(meanOf(longest)).toBeLessThan(meanOf(quickest))

    const topWait = [...lanes].sort((a, b) => b.maxWait - a.maxWait)[0]
    expect(topWait.route).toBe("Shanghai")
  })

  it("reduces raw signals into legible daily backlog changes", () => {
    const daily = aggregateBacklogEvents(PORT_REPLAY_EVENTS)

    expect(daily.length).toBeLessThan(PORT_REPLAY_EVENTS.length / 2)
    expect(daily.reduce((sum, event) => sum + event.value, 0)).toBe(0)
    expect(daily.every((event) => event.signalCount >= 0)).toBe(true)
    expect(daily.some((event) => event.signalCount === 0)).toBe(true)
  })
})
