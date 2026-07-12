import { describe, expect, it } from "vitest"
import {
  AUTHORED_DOORS,
  ROOM_ORDER,
  TEAM_TRANSITIONS,
  TEAM_TRIPS,
  aggregateTransitions,
  deriveSessionPath,
  summarizeTravel,
} from "./insightForgeTravel"

describe("insight forge travel model", () => {
  it("keeps authored doors within the known room set", () => {
    const known = new Set(ROOM_ORDER)
    for (const door of AUTHORED_DOORS) {
      expect(known.has(door.from)).toBe(true)
      expect(known.has(door.to)).toBe(true)
      expect(typeof door.question).toBe("string")
      expect(door.question.length).toBeGreaterThan(0)
    }
  })

  it("aggregates consecutive room pairs into directed transitions", () => {
    const transitions = aggregateTransitions([{ rooms: ["a", "b", "c", "a", "b"] }])
    const byId = Object.fromEntries(transitions.map((t) => [t.id, t.count]))
    expect(byId["a->b"]).toBe(2)
    expect(byId["b->c"]).toBe(1)
    expect(byId["c->a"]).toBe(1)
    // Self-transitions are dropped.
    expect(aggregateTransitions([{ rooms: ["a", "a", "b"] }])).toHaveLength(1)
  })

  it("derives the session path and counts loops from room-entered events", () => {
    const events = [
      { type: "room-entered", roomId: "watchtower", fromRoomId: null },
      { type: "artifact-collected", artifactId: "x" },
      { type: "room-entered", roomId: "sorting-shelf", fromRoomId: "watchtower" },
      { type: "room-entered", roomId: "inspection-bench", fromRoomId: "sorting-shelf" },
      { type: "room-entered", roomId: "sorting-shelf", fromRoomId: "inspection-bench" },
    ]
    const { path, transitions, loops } = deriveSessionPath(events)
    expect(path).toEqual(["watchtower", "sorting-shelf", "inspection-bench", "sorting-shelf"])
    // Returning to sorting-shelf (already visited) counts as one loop.
    expect(loops).toBe(1)
    const byId = Object.fromEntries(transitions.map((t) => [t.id, t.count]))
    expect(byId["watchtower->sorting-shelf"]).toBe(1)
    expect(byId["inspection-bench->sorting-shelf"]).toBe(1)
  })

  it("falls back to previous room when fromRoomId is absent", () => {
    const events = [
      { type: "room-entered", roomId: "watchtower" },
      { type: "room-entered", roomId: "route-ledger" },
    ]
    const { transitions } = deriveSessionPath(events)
    expect(transitions.map((t) => t.id)).toContain("watchtower->route-ledger")
  })

  it("seeds a deterministic team aggregate spanning contrasting roles", () => {
    expect(TEAM_TRIPS.length).toBeGreaterThanOrEqual(2)
    // Support lead and packaging engineer start from different rooms.
    const support = TEAM_TRIPS.find((t) => t.actorId === "support-lead")
    const packaging = TEAM_TRIPS.find((t) => t.actorId === "packaging-engineer")
    expect(support.rooms[0]).not.toBe(packaging.rooms[0])
    // Both reach the Knowledge Lab.
    expect(support.rooms.at(-1)).toBe("knowledge-lab")
    expect(packaging.rooms.at(-1)).toBe("knowledge-lab")
    // The aggregate is stable and non-empty.
    expect(TEAM_TRANSITIONS.length).toBeGreaterThan(0)
    expect(TEAM_TRANSITIONS.every((t) => t.count >= 1)).toBe(true)
  })

  it("summarizes travel without implying causality", () => {
    const empty = summarizeTravel({ sessionTransitions: [] })
    expect(empty.onSpine).toBe(0)
    expect(empty.text).toMatch(/No room-to-room moves yet/)

    const summary = summarizeTravel({
      sessionTransitions: [
        { id: "watchtower->sorting-shelf", from: "watchtower", to: "sorting-shelf", count: 1 },
        {
          id: "inspection-bench->sorting-shelf",
          from: "inspection-bench",
          to: "sorting-shelf",
          count: 1,
        },
      ],
    })
    expect(summary.onSpine).toBe(1)
    expect(summary.backward).toBe(1)
    // The caveat language is present whenever routes are compared.
    expect(summary.text.toLowerCase()).toMatch(/decision point|plural routes/)
    expect(summary.text.toLowerCase()).not.toMatch(/caused the next action/)
  })
})
