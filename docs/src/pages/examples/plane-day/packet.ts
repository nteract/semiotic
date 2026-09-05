import {
  buildArtifactContract,
  fingerprintValue,
  requireSerializableArtifactContract,
} from "semiotic/artifact"
import type { JsonObject } from "semiotic/artifact"
import { delayProps } from "./chart-config"
import { daySummary, legObservation, QUALIFICATION, reportedCauses, STORY_URL } from "./format"
import { resolveReference, validateState } from "./state"
import { numeric } from "./time"
import type { AircraftDay, PlaneSnapshot, PlaneState } from "./types"

export function verifyDay(snapshot: PlaneSnapshot, day: AircraftDay) {
  const expected = snapshot.days.find((item) => item.id === day.id)
  if (!expected || fingerprintValue(day).fingerprint !== expected.fingerprint)
    throw new Error("Aircraft-day values or identities differ from the pinned edition.")
  return day
}

export function dayValues(day: AircraftDay) {
  return day.flights.map((flight, index) => ({
    eventId: flight.id,
    sourceRecordLine: Number(flight.raw.sourceRecordLine),
    originAirportId: flight.raw.OriginAirportID,
    destinationAirportId: flight.raw.DestAirportID,
    scheduledDeparture: flight.scheduledDeparture,
    actualDeparture: flight.issues.length ? null : flight.actualDeparture,
    scheduledArrival: flight.scheduledArrival,
    actualArrival: flight.issues.length ? null : flight.actualArrival,
    departureDeviationMinutes: flight.issues.length ? null : numeric(flight.raw.DepDelay),
    arrivalDeviationMinutes: flight.issues.length ? null : numeric(flight.raw.ArrDelay),
    precedingEventId: index ? day.flights[index - 1].id : null,
    changeFromPrecedingDepartureMinutes:
      index && !flight.issues.length && !day.breaks.some((b) => b.before === flight.id)
        ? numeric(flight.raw.DepDelay)! - numeric(day.flights[index - 1].raw.DepDelay)!
        : null,
    issues: [...flight.issues],
    observation: legObservation(day, flight),
    reportedCauses: reportedCauses(flight),
  }))
}

export function numericalChecks(day: AircraftDay) {
  return dayValues(day).map((row) => ({
    id: `departure:${row.eventId}`,
    operation: "difference",
    inputFields: ["actualDeparture", "scheduledDeparture"],
    unit: "minutes",
    baseline: "This flight's scheduled departure",
    eventId: row.eventId,
    expected: row.departureDeviationMinutes,
    computed:
      row.actualDeparture !== null && row.scheduledDeparture !== null
        ? (row.actualDeparture - row.scheduledDeparture) / 60_000
        : null,
    status:
      row.actualDeparture === null || row.scheduledDeparture === null
        ? "unknown"
        : (row.actualDeparture - row.scheduledDeparture) / 60_000 === row.departureDeviationMinutes
          ? "pass"
          : "fail",
  }))
}

export function buildNotePacket(snapshot: PlaneSnapshot, day: AircraftDay, input: PlaneState) {
  verifyDay(snapshot, day)
  const state = validateState(input)
  const issue = resolveReference(state.selected, snapshot, day)
  if (issue) throw new Error(issue)
  const values = dayValues(day)
  const checks = numericalChecks(day)
  const chart = delayProps(day)
  const json = (value: unknown): JsonObject => JSON.parse(JSON.stringify(value))
  const artifact = buildArtifactContract("LineChart", chart, {
    id: `E02:${day.id}`,
    revision: snapshot.editionId,
    createdAt: snapshot.retrievedAt,
    title: "Your plane has had a day",
    intents: ["compare", "explain"],
    purpose: {
      allowedUses: ["Inspect reported historical flight sequences"],
      prohibitedUses: [
        "Live departure prediction",
        "Causal attribution from adjacency",
        "Airline-wide performance ranking",
      ],
    },
    claims: checks.map((check) => ({
      id: check.id,
      kind: "observation",
      status: check.status === "unknown" ? "unknown" : "provisional",
      text: `${check.expected ?? "Unavailable"} minutes relative to this flight's scheduled departure.`,
      evidenceIds: ["bts-times"],
      authoredBy: { kind: "system", id: snapshot.transformVersion },
      scope: {
        eventId: check.eventId,
        unit: "minutes",
        baseline: check.baseline,
        date: day.date,
        reportingCarrier: "HA",
      },
    })),
    evidence: [
      {
        id: "bts-times",
        role: "source-data",
        dataVersion: snapshot.editionId,
        fingerprint: fingerprintValue(day).fingerprint,
        source: {
          name: "BTS Reporting Carrier On-Time Performance",
          uri: `${STORY_URL}#sources`,
          version: snapshot.editionId,
          retrievedAt: snapshot.retrievedAt,
          publisher: "U.S. Bureau of Transportation Statistics",
        },
      },
    ],
    accountability: {
      generatedBy: snapshot.transformVersion,
      reviews: [
        {
          id: "editorial-review",
          status: "pending",
          rationale:
            "Arithmetic and continuity checks do not confer editorial approval. Independent source interpretation and reader acceptance remain pending.",
        },
      ],
    },
    extensions: {
      "semiotic.e02.event-notes.v1": json({
        selected: state.selected,
        notes: state.notes,
        checks,
        breaks: day.breaks,
        scope: QUALIFICATION,
      }),
    },
  })
  return {
    packetVersion: 1,
    storyId: "E02",
    editionId: snapshot.editionId,
    sourceSHA256: snapshot.sourceSHA256,
    sourceURL: `${STORY_URL}#sources`,
    retrievedAt: snapshot.retrievedAt,
    state,
    day,
    values,
    checks,
    summary: daySummary(day),
    qualification: QUALIFICATION,
    artifact: requireSerializableArtifactContract(artifact),
    unresolvedNotes: state.notes.flatMap((note, index) => {
      const issue = resolveReference(
        note.target,
        snapshot,
        note.target.dayId === day.id ? day : undefined,
      )
      return issue
        ? [{ index, reason: issue }]
        : note.target.dayId !== day.id
          ? [
              {
                index,
                reason:
                  "Note retained; its flight is in another aircraft-day, outside this packet's row extract.",
              },
            ]
          : []
    }),
    omissions: [
      "Only the selected aircraft-day and adjacent context rows travel in this packet; the full cohort is linked at the source.",
      "Reader notes are unreviewed, unauthenticated text, separate from authored observations.",
      "This saved edition cannot update itself; reopen the source link for correction notes.",
    ],
  }
}

export function importNotePacket(input: unknown, snapshot: PlaneSnapshot) {
  if (!input || typeof input !== "object") throw new Error("Invalid note packet")
  const packet = input as ReturnType<typeof buildNotePacket>
  if (packet.packetVersion !== 1 || packet.storyId !== "E02")
    throw new Error("Unsupported note-packet version. Use a compatible E02 reader.")
  const state = validateState(packet.state)
  const issue = resolveReference(state.selected, snapshot)
  if (issue) return { state, day: null, issue }
  if (!packet.day || packet.day.id !== state.selected.dayId)
    throw new Error("Packet and selected aircraft-day disagree")
  verifyDay(snapshot, packet.day)
  const eventIssue = resolveReference(state.selected, snapshot, packet.day)
  if (eventIssue) return { state, day: null, issue: eventIssue }
  const rebuilt = buildNotePacket(snapshot, packet.day, state)
  if (fingerprintValue(packet).fingerprint !== fingerprintValue(rebuilt).fingerprint)
    throw new Error(
      "The packet's source, calculations, annotations, or artifact differs from this edition.",
    )
  return { state: rebuilt.state, day: rebuilt.day, issue: null }
}
