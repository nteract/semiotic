/**
 * Insight Forge — navigation model.
 *
 * The essay "Designing a Data Visualization Dashboard Like It Was a Game"
 * distinguishes two maps of the same world:
 *
 *   1. The AUTHORED map — how the dashboard designer expects rooms to connect.
 *   2. The TRAVELED map — how analysts actually move through the rooms,
 *      derived from observability events.
 *
 * This module holds the pure, deterministic pieces of both: the authored door
 * graph, a small pre-seeded team of fictional analysts with their own trips,
 * and the reducers that turn a workbench event stream into room-to-room
 * transitions. Nothing here renders — the React chart reads these outputs.
 *
 * A repeated sequence is evidence of a possible decision point, not proof that
 * one room caused the next action. The summary text below is written to honor
 * that distinction.
 */

// Canonical room order. Mirrors the `ROOMS` array in the page (kept as bare ids
// here so the travel model stays pure and independently testable). The
// `guards Sankey/travel order` test locks this against drift.
export const ROOM_ORDER = Object.freeze([
  "watchtower",
  "sorting-shelf",
  "route-ledger",
  "inspection-bench",
  "knowledge-lab",
])

export const ROOM_TITLES = Object.freeze({
  watchtower: "Watchtower",
  "sorting-shelf": "Sorting Shelf",
  "route-ledger": "Route Ledger",
  "inspection-bench": "Inspection Bench",
  "knowledge-lab": "Knowledge Lab",
})

/**
 * The authored doors — the route the designer expects. The spine is the linear
 * observe → decompose → trace → weigh → preserve sequence; one lateral door
 * lets an analyst jump from a suspicious route straight to the evidence bench.
 * `question` is what the destination room can answer (a doorway states its
 * question, not just its title).
 */
export const AUTHORED_DOORS = Object.freeze([
  {
    id: "watch-sort",
    from: "watchtower",
    to: "sorting-shelf",
    label: "Decompose the spike",
    question: "What kind of return grew, and for which product?",
  },
  {
    id: "sort-route",
    from: "sorting-shelf",
    to: "route-ledger",
    label: "Trace the fulfillment path",
    question: "Through which fulfillment path did it travel?",
  },
  {
    id: "route-inspect",
    from: "route-ledger",
    to: "inspection-bench",
    label: "Weigh rate against volume",
    question: "Which rates are both high and supported?",
  },
  {
    id: "inspect-lab",
    from: "inspection-bench",
    to: "knowledge-lab",
    label: "Preserve the conclusion",
    question: "Can the conclusion survive one more translation?",
  },
  {
    id: "route-inspect-lateral",
    from: "route-ledger",
    to: "sorting-shelf",
    label: "Re-check the decomposition",
    question: "Does the categorical split still hold for this route?",
  },
])

/**
 * Pre-seeded fictional collaborators. Not a full Guild Hall — just enough to
 * source a team travel aggregate and to make the point that different roles
 * reach compatible evidence through different room sequences.
 */
export const TEAM_ACTORS = Object.freeze([
  { id: "ops-analyst", name: "Operations analyst", role: "ops", icon: "abacus" },
  { id: "support-lead", name: "Customer-support lead", role: "support", icon: "bell" },
  { id: "packaging-engineer", name: "Packaging engineer", role: "packaging", icon: "crate" },
])

/**
 * The room sequence each fictional analyst actually walked. The support lead
 * begins from return reasons and weighs rates before tracing the path; the
 * packaging engineer begins from package and warehouse. Both reach the
 * Knowledge Lab. The ops analyst happens to follow the authored spine.
 */
export const TEAM_TRIPS = Object.freeze([
  {
    actorId: "ops-analyst",
    rooms: ["watchtower", "sorting-shelf", "route-ledger", "inspection-bench", "knowledge-lab"],
  },
  {
    actorId: "support-lead",
    rooms: [
      "watchtower",
      "sorting-shelf",
      "inspection-bench",
      "sorting-shelf",
      "route-ledger",
      "knowledge-lab",
    ],
  },
  {
    actorId: "packaging-engineer",
    rooms: ["route-ledger", "sorting-shelf", "inspection-bench", "knowledge-lab"],
  },
])

/** Sum consecutive room pairs across a set of trips into directed transitions. */
export function aggregateTransitions(trips) {
  const counts = new Map()
  for (const trip of trips) {
    const rooms = trip.rooms ?? trip
    for (let i = 0; i < rooms.length - 1; i += 1) {
      const from = rooms[i]
      const to = rooms[i + 1]
      if (from === to) continue
      const key = `${from}->${to}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split("->")
      return { id: key, from, to, count }
    })
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
}

/** The team's common route as a directed transition aggregate. */
export const TEAM_TRANSITIONS = Object.freeze(aggregateTransitions(TEAM_TRIPS))

/**
 * Turn the durable workbench event stream into a traveled path. Only
 * `room-entered` events count as navigation. Returns the ordered room path,
 * the directed transition aggregate, and a loop count (a transition into a
 * room already visited earlier in the path).
 */
export function deriveSessionPath(events = []) {
  const entries = events.filter((event) => event.type === "room-entered")
  const path = []
  const transitions = []
  const counts = new Map()
  let loops = 0
  const seen = new Set()

  for (const entry of entries) {
    const to = entry.roomId
    if (!to) continue
    const from = entry.fromRoomId ?? (path.length ? path[path.length - 1] : null)
    path.push(to)
    if (from && from !== to) {
      const key = `${from}->${to}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
      if (seen.has(to)) loops += 1
    }
    seen.add(to)
  }

  for (const [key, count] of counts.entries()) {
    const [from, to] = key.split("->")
    // The method of the *last* traversal of this edge, when recorded.
    const lastMethod = [...entries]
      .reverse()
      .find((entry) => (entry.fromRoomId ?? null) === from && entry.roomId === to)?.method
    transitions.push({ id: key, from, to, count, method: lastMethod ?? "world-map" })
  }
  transitions.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))

  return { path, transitions, loops }
}

/** Directed edges of the authored spine (excludes the lateral re-check door). */
function authoredSpineEdges() {
  const spine = []
  for (let i = 0; i < ROOM_ORDER.length - 1; i += 1) {
    spine.push(`${ROOM_ORDER[i]}->${ROOM_ORDER[i + 1]}`)
  }
  return new Set(spine)
}

/**
 * Compare the analyst's session against the authored spine and the team
 * aggregate. Returns counts plus a caveat-bearing sentence — deliberately
 * refusing to imply that a common route is a correct one.
 */
export function summarizeTravel({ sessionTransitions = [], teamTransitions = TEAM_TRANSITIONS }) {
  const spine = authoredSpineEdges()
  const sessionKeys = new Set(sessionTransitions.map((t) => t.id))
  const teamKeys = new Set(teamTransitions.map((t) => t.id))

  const onSpine = sessionTransitions.filter((t) => spine.has(t.id)).length
  const offSpine = sessionTransitions.filter((t) => !spine.has(t.id))
  const sharedWithTeam = [...sessionKeys].filter((id) => teamKeys.has(id)).length
  const backward = offSpine.filter((t) => {
    const fromIndex = ROOM_ORDER.indexOf(t.from)
    const toIndex = ROOM_ORDER.indexOf(t.to)
    return toIndex >= 0 && fromIndex >= 0 && toIndex < fromIndex
  })

  let text
  if (sessionTransitions.length === 0) {
    text =
      "No room-to-room moves yet. Enter another room and the traveled map will chart your path against the authored spine and the team's aggregate."
  } else {
    const parts = []
    parts.push(
      `You followed the authored spine for ${onSpine} of ${sessionTransitions.length} transition${sessionTransitions.length === 1 ? "" : "s"}.`,
    )
    if (backward.length) {
      parts.push(
        `${backward.length} move${backward.length === 1 ? "" : "s"} doubled back — a loop the team also walks.`,
      )
    }
    if (sharedWithTeam) {
      parts.push(
        `${sharedWithTeam} of your transitions match the team's common route, but a shared sequence is a decision point worth noticing, not proof one room caused the next.`,
      )
    } else {
      parts.push(
        "Your route diverges from the team's common path; plural routes to the same evidence are expected, not errors.",
      )
    }
    text = parts.join(" ")
  }

  return {
    text,
    onSpine,
    offSpine: offSpine.length,
    backward: backward.length,
    sharedWithTeam,
  }
}
