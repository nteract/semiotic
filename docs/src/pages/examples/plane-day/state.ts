import type { AircraftDay, PlaneSnapshot, PlaneState, EventReference } from "./types"

export function eventReference(
  snapshot: PlaneSnapshot,
  day: AircraftDay,
  eventId: string,
): EventReference {
  return { editionId: snapshot.editionId, dayId: day.id, eventId }
}

export function defaultState(snapshot: PlaneSnapshot): PlaneState {
  const day = snapshot.cases.find((day) => day.pattern === "recovered")!
  return {
    version: 1,
    selected: eventReference(snapshot, day, day.flights[1].id),
    view: "timeline",
    timeBasis: "local",
    notes: [],
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid saved selection")
  return value as Record<string, unknown>
}

function reference(value: unknown): EventReference {
  const item = record(value)
  if (
    ["editionId", "dayId", "eventId"].some(
      (key) => typeof item[key] !== "string" || !item[key] || (item[key] as string).length > 250,
    )
  )
    throw new Error("Invalid event reference")
  return {
    editionId: item.editionId as string,
    dayId: item.dayId as string,
    eventId: item.eventId as string,
  }
}

// Structural validation is separate from resolution: an unknown event remains
// unresolved, and is never replaced by the row at a remembered array index.
export function validateState(input: unknown): PlaneState {
  const value = record(input)
  if (value.version !== 1)
    throw new Error("Unsupported saved-state version. Open it with a compatible story version.")
  if (
    !["timeline", "network"].includes(value.view as string) ||
    !["local", "utc"].includes(value.timeBasis as string)
  )
    throw new Error("Unknown layout or time basis")
  if (!Array.isArray(value.notes) || value.notes.length > 50)
    throw new Error("A packet supports at most 50 local notes")
  const notes = value.notes.map((item) => {
    const note = record(item)
    if (
      typeof note.text !== "string" ||
      note.text.length > 2000 ||
      !note.text.trim() ||
      note.authoredBy !== "reader" ||
      note.status !== "unreviewed" ||
      typeof note.createdAt !== "string" ||
      !Number.isFinite(Date.parse(note.createdAt))
    )
      throw new Error(
        "Invalid local note or authorship. Imported notes must remain unreviewed reader notes.",
      )
    return {
      target: reference(note.target),
      text: note.text,
      authoredBy: "reader" as const,
      status: "unreviewed" as const,
      createdAt: note.createdAt,
    }
  })
  return {
    version: 1,
    selected: reference(value.selected),
    view: value.view as PlaneState["view"],
    timeBasis: value.timeBasis as PlaneState["timeBasis"],
    notes,
  }
}

export function resolveReference(
  target: EventReference,
  snapshot: PlaneSnapshot,
  day?: AircraftDay | null,
) {
  if (target.editionId !== snapshot.editionId)
    return "The saved source edition is unavailable here. The selection has not been replaced."
  if (!snapshot.days.some((row) => row.id === target.dayId))
    return "The saved aircraft-day is unresolved in this edition."
  if (
    day &&
    (day.id !== target.dayId ||
      day.flights.filter((flight) => flight.id === target.eventId).length !== 1)
  )
    return "The saved flight is missing or ambiguous in this aircraft-day."
  return null
}

export function stateSearch(state: PlaneState): string {
  return `?flight=${encodeURIComponent(JSON.stringify(validateState(state)))}`
}

export function readStateSearch(search: string, snapshot: PlaneSnapshot): PlaneState {
  const params = new URLSearchParams(search)
  const value = params.get("flight")
  if (value === null) return defaultState(snapshot)
  if (params.getAll("flight").length !== 1 || value.length > 150_000)
    throw new Error("Invalid or oversized saved selection")
  return validateState(JSON.parse(value))
}
