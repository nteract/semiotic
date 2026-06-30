import { describe, expect, it } from "vitest"
import {
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

  it("reduces raw signals into legible daily backlog changes", () => {
    const daily = aggregateBacklogEvents(PORT_REPLAY_EVENTS)

    expect(daily.length).toBeLessThan(PORT_REPLAY_EVENTS.length / 2)
    expect(daily.reduce((sum, event) => sum + event.value, 0)).toBe(0)
    expect(daily.every((event) => event.signalCount >= 0)).toBe(true)
    expect(daily.some((event) => event.signalCount === 0)).toBe(true)
  })
})
