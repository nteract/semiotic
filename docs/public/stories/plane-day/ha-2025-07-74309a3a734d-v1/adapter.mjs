// docs/src/pages/examples/plane-day/packet.ts
import {
  buildArtifactContract,
  fingerprintValue,
  requireSerializableArtifactContract
} from "semiotic/artifact";

// docs/src/pages/examples/plane-day/time.ts
function numeric(value) {
  if (value === void 0 || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// docs/src/pages/examples/plane-day/format.ts
var STORY_PATH = "/examples/plane-day";
var STORY_URL = `https://semiotic.nteract.io${STORY_PATH}`;
var QUALIFICATION = "Historical HA reporting-carrier records, July 2\u201330, 2025. Observed sequences do not establish causes or predict a departure.";
var PATTERNS = {
  near: "Near schedule",
  recovered: "Delay, then recovery",
  persisted: "Delay that persists",
  other: "Other eligible patterns",
  ineligible: "Outside the comparison"
};
var signed = (value) => value === null ? "Unavailable" : `${value > 0 ? "+" : ""}${value}`;
var deviation = (value) => value === null ? "departure time unavailable" : value === 0 ? "on schedule" : `${Math.abs(value)} min ${value < 0 ? "early" : "late"}`;
var flightName = (flight) => `HA ${flight.raw.Flight_Number_Reporting_Airline} \xB7 ${flight.raw.Origin} \u2192 ${flight.raw.Dest}`;
function timeLabel(flight, field, snapshot, basis) {
  const instant = flight[field];
  if (instant === null || field.startsWith("actual") && flight.issues.length) return "Unavailable";
  if (basis === "utc")
    return new Date(instant).toISOString().replace("2025-", "").replace("T", " ").slice(0, 11) + " UTC";
  const airportId = field.endsWith("Departure") ? flight.raw.OriginAirportID : flight.raw.DestAirportID;
  const zone = snapshot.airports.find((a) => a.id === airportId)?.zone;
  if (!zone) return "Unresolved time zone";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short"
  }).format(instant);
}
function daySummary(day) {
  const delays = day.flights.map((f) => numeric(f.raw.DepDelay));
  return `${day.tail}, ${day.date}: ${day.flights.length} reported flights. Departure deviations: ${delays.map(signed).join(", ")} minutes. ${PATTERNS[day.pattern]}.`;
}
function legObservation(day, flight) {
  const index = day.flights.findIndex((row) => row.id === flight.id);
  const current = numeric(flight.raw.DepDelay);
  if (flight.issues.length || current === null)
    return "The reporting fields cannot support a continuous-flight observation for this leg.";
  if (index === 0)
    return `${flightName(flight)} departed ${deviation(current)}. This is the first flight in this scheduled-date window.`;
  if (day.breaks.some((item) => item.before === flight.id))
    return "There is a break before this leg; a comparison across that gap does not establish continuity.";
  const previous = numeric(day.flights[index - 1].raw.DepDelay);
  const change = current - previous;
  return `${flightName(flight)} departed ${deviation(current)}. Its signed departure deviation was ${Math.abs(change)} minutes ${change < 0 ? "lower" : change > 0 ? "higher" : "unchanged"} than the preceding departure (${signed(current)} \u2212 ${signed(previous)} = ${signed(change)} min). This compares schedules, not causes.`;
}
function reportedCauses(flight) {
  const fields = ["CarrierDelay", "WeatherDelay", "NASDelay", "SecurityDelay", "LateAircraftDelay"];
  const supplied = fields.filter((field) => numeric(flight.raw[field]) !== null);
  if (!supplied.length)
    return "No delay-cause values were supplied on this row. Blank is not evidence of no cause.";
  return `Reported categories on this row: ${supplied.map((field) => `${field} ${numeric(flight.raw[field])} min`).join("; ")}. These are reporting categories, not a reconstruction of the aircraft's whole day.`;
}

// docs/src/pages/examples/plane-day/chart-config.ts
function delayProps(day) {
  let segment = 0;
  const data = day.flights.flatMap((flight, index) => {
    if (day.breaks.some((b) => b.before === flight.id)) segment++;
    if (flight.issues.length) {
      segment++;
      return [];
    }
    return [
      {
        eventId: flight.id,
        leg: index + 1,
        delay: numeric(flight.raw.DepDelay),
        segment: String(segment)
      }
    ];
  });
  return {
    data,
    xAccessor: "leg",
    yAccessor: "delay",
    lineBy: "segment",
    width: 740,
    height: 240,
    xLabel: "Reported flight, in sequence",
    yLabel: "Departure deviation (min)",
    showLegend: false,
    showPoints: true,
    title: "How the departure deviation changed",
    description: "Signed minutes relative to each flight's own scheduled departure. Negative means early. Lines stop at unresolved continuity.",
    summary: daySummary(day),
    accessibleTable: true
  };
}

// docs/src/pages/examples/plane-day/state.ts
function eventReference(snapshot, day, eventId) {
  return { editionId: snapshot.editionId, dayId: day.id, eventId };
}
function defaultState(snapshot) {
  const day = snapshot.cases.find((day2) => day2.pattern === "recovered");
  return {
    version: 1,
    selected: eventReference(snapshot, day, day.flights[1].id),
    view: "timeline",
    timeBasis: "local",
    notes: []
  };
}
function record(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid saved selection");
  return value;
}
function reference(value) {
  const item = record(value);
  if (["editionId", "dayId", "eventId"].some(
    (key) => typeof item[key] !== "string" || !item[key] || item[key].length > 250
  ))
    throw new Error("Invalid event reference");
  return {
    editionId: item.editionId,
    dayId: item.dayId,
    eventId: item.eventId
  };
}
function validateState(input) {
  const value = record(input);
  if (value.version !== 1)
    throw new Error("Unsupported saved-state version. Open it with a compatible story version.");
  if (!["timeline", "network"].includes(value.view) || !["local", "utc"].includes(value.timeBasis))
    throw new Error("Unknown layout or time basis");
  if (!Array.isArray(value.notes) || value.notes.length > 50)
    throw new Error("A packet supports at most 50 local notes");
  const notes = value.notes.map((item) => {
    const note = record(item);
    if (typeof note.text !== "string" || note.text.length > 2e3 || !note.text.trim() || note.authoredBy !== "reader" || note.status !== "unreviewed" || typeof note.createdAt !== "string" || !Number.isFinite(Date.parse(note.createdAt)))
      throw new Error(
        "Invalid local note or authorship. Imported notes must remain unreviewed reader notes."
      );
    return {
      target: reference(note.target),
      text: note.text,
      authoredBy: "reader",
      status: "unreviewed",
      createdAt: note.createdAt
    };
  });
  return {
    version: 1,
    selected: reference(value.selected),
    view: value.view,
    timeBasis: value.timeBasis,
    notes
  };
}
function resolveReference(target, snapshot, day) {
  if (target.editionId !== snapshot.editionId)
    return "The saved source edition is unavailable here. The selection has not been replaced.";
  if (!snapshot.days.some((row) => row.id === target.dayId))
    return "The saved aircraft-day is unresolved in this edition.";
  if (day && (day.id !== target.dayId || day.flights.filter((flight) => flight.id === target.eventId).length !== 1))
    return "The saved flight is missing or ambiguous in this aircraft-day.";
  return null;
}
function stateSearch(state) {
  return `?flight=${encodeURIComponent(JSON.stringify(validateState(state)))}`;
}
function readStateSearch(search, snapshot) {
  const params = new URLSearchParams(search);
  const value = params.get("flight");
  if (value === null) return defaultState(snapshot);
  if (params.getAll("flight").length !== 1 || value.length > 15e4)
    throw new Error("Invalid or oversized saved selection");
  return validateState(JSON.parse(value));
}

// docs/src/pages/examples/plane-day/packet.ts
function verifyDay(snapshot, day) {
  const expected = snapshot.days.find((item) => item.id === day.id);
  if (!expected || fingerprintValue(day).fingerprint !== expected.fingerprint)
    throw new Error("Aircraft-day values or identities differ from the pinned edition.");
  return day;
}
function dayValues(day) {
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
    changeFromPrecedingDepartureMinutes: index && !flight.issues.length && !day.breaks.some((b) => b.before === flight.id) ? numeric(flight.raw.DepDelay) - numeric(day.flights[index - 1].raw.DepDelay) : null,
    issues: [...flight.issues],
    observation: legObservation(day, flight),
    reportedCauses: reportedCauses(flight)
  }));
}
function numericalChecks(day) {
  return dayValues(day).map((row) => ({
    id: `departure:${row.eventId}`,
    operation: "difference",
    inputFields: ["actualDeparture", "scheduledDeparture"],
    unit: "minutes",
    baseline: "This flight's scheduled departure",
    eventId: row.eventId,
    expected: row.departureDeviationMinutes,
    computed: row.actualDeparture !== null && row.scheduledDeparture !== null ? (row.actualDeparture - row.scheduledDeparture) / 6e4 : null,
    status: row.actualDeparture === null || row.scheduledDeparture === null ? "unknown" : (row.actualDeparture - row.scheduledDeparture) / 6e4 === row.departureDeviationMinutes ? "pass" : "fail"
  }));
}
function buildNotePacket(snapshot, day, input) {
  verifyDay(snapshot, day);
  const state = validateState(input);
  const issue = resolveReference(state.selected, snapshot, day);
  if (issue) throw new Error(issue);
  const values = dayValues(day);
  const checks = numericalChecks(day);
  const chart = delayProps(day);
  const json = (value) => JSON.parse(JSON.stringify(value));
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
        "Airline-wide performance ranking"
      ]
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
        reportingCarrier: "HA"
      }
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
          publisher: "U.S. Bureau of Transportation Statistics"
        }
      }
    ],
    accountability: {
      generatedBy: snapshot.transformVersion,
      reviews: [
        {
          id: "editorial-review",
          status: "pending",
          rationale: "Arithmetic and continuity checks do not confer editorial approval. Independent source interpretation and reader acceptance remain pending."
        }
      ]
    },
    extensions: {
      "semiotic.e02.event-notes.v1": json({
        selected: state.selected,
        notes: state.notes,
        checks,
        breaks: day.breaks,
        scope: QUALIFICATION
      })
    }
  });
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
      const issue2 = resolveReference(
        note.target,
        snapshot,
        note.target.dayId === day.id ? day : void 0
      );
      return issue2 ? [{ index, reason: issue2 }] : note.target.dayId !== day.id ? [
        {
          index,
          reason: "Note retained; its flight is in another aircraft-day, outside this packet's row extract."
        }
      ] : [];
    }),
    omissions: [
      "Only the selected aircraft-day and adjacent context rows travel in this packet; the full cohort is linked at the source.",
      "Reader notes are unreviewed, unauthenticated text, separate from authored observations.",
      "This saved edition cannot update itself; reopen the source link for correction notes."
    ]
  };
}
function importNotePacket(input, snapshot) {
  if (!input || typeof input !== "object") throw new Error("Invalid note packet");
  const packet = input;
  if (packet.packetVersion !== 1 || packet.storyId !== "E02")
    throw new Error("Unsupported note-packet version. Use a compatible E02 reader.");
  const state = validateState(packet.state);
  const issue = resolveReference(state.selected, snapshot);
  if (issue) return { state, day: null, issue };
  if (!packet.day || packet.day.id !== state.selected.dayId)
    throw new Error("Packet and selected aircraft-day disagree");
  verifyDay(snapshot, packet.day);
  const eventIssue = resolveReference(state.selected, snapshot, packet.day);
  if (eventIssue) return { state, day: null, issue: eventIssue };
  const rebuilt = buildNotePacket(snapshot, packet.day, state);
  if (fingerprintValue(packet).fingerprint !== fingerprintValue(rebuilt).fingerprint)
    throw new Error(
      "The packet's source, calculations, annotations, or artifact differs from this edition."
    );
  return { state: rebuilt.state, day: rebuilt.day, issue: null };
}

// docs/src/pages/examples/plane-day/exports.ts
var escapeMarkup = (value) => String(value).replace(
  /[&<>"']/g,
  (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
);
function renderDayHTML(snapshot, day, state) {
  const values = dayValues(day);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Your plane has had a day \u2014 ${escapeMarkup(day.tail)}</title><style>body{max-width:950px;margin:2rem auto;padding:1rem;font:18px/1.6 system-ui;color:#1e3346;background:#fff}a{color:inherit}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:12px;border-bottom:1px solid #bbb}section{overflow-x:auto}li{margin:1rem 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}tr[data-selected=true]{outline:2px solid #1e3346}code{overflow-wrap:anywhere}@media print{body{font-size:11pt;margin:0}table{font-size:8pt}section{overflow:visible}a{overflow-wrap:anywhere}}</style></head><body>
  <h1>Your plane has had a day</h1><p>${escapeMarkup(daySummary(day))}</p><p>${QUALIFICATION}</p>
  <p>Selected: ${escapeMarkup(flightName(day.flights.find((f) => f.id === state.selected.eventId)))}. ${state.timeBasis === "utc" ? "All clocks use UTC." : "Departure clocks are origin-local; arrival clocks are destination-local, with dates and zone labels."}</p>
  <section tabindex="0" aria-label="Aircraft-day timetable"><table><caption>All ${day.flights.length} reported flights in this selected scheduled-date window. Unavailable means unresolved or excluded reporting fields.</caption><thead><tr><th>Flight</th><th>Scheduled departure</th><th>Actual departure</th><th>Scheduled arrival</th><th>Actual arrival</th><th>Departure / arrival deviation (min)</th></tr></thead><tbody>
  ${day.flights.map((flight, index) => `<tr data-event-id="${escapeMarkup(flight.id)}" data-selected="${flight.id === state.selected.eventId}"><th>${escapeMarkup(flightName(flight))}</th>${["scheduledDeparture", "actualDeparture", "scheduledArrival", "actualArrival"].map((field) => `<td>${escapeMarkup(timeLabel(flight, field, snapshot, state.timeBasis))}</td>`).join("")}<td>${signed(values[index].departureDeviationMinutes)} / ${signed(values[index].arrivalDeviationMinutes)}</td></tr>`).join("")}
  </tbody></table></section><h2>Observations and reporting limits</h2><ol>${values.map((row, index) => `<li><p>${escapeMarkup(row.observation)}</p><p>${escapeMarkup(reportedCauses(day.flights[index]))}</p><p>BTS archive CSV record line ${row.sourceRecordLine}; event <code>${escapeMarkup(row.eventId)}</code>.</p></li>`).join("")}</ol>
  <p>${day.breaks.length ? day.breaks.map((item) => escapeMarkup(item.reason)).join("; ") : "No internal continuity break was detected under the published checks."} The window starts and ends at the reported scheduled date. A shared tail number does not establish why a flight was late; unreported positioning, international flights, or aircraft changes can leave gaps.</p>
  <h2>Reader notes \xB7 unreviewed</h2>${state.notes.length ? state.notes.map((note) => `<p>Target: <code>${escapeMarkup(note.target.eventId)}</code>, edition ${escapeMarkup(note.target.editionId)}. Reader-authored, ${escapeMarkup(note.createdAt)}.</p><pre>${escapeMarkup(note.text)}</pre>`).join("") : "<p>No reader note saved.</p>"}
  <footer><p>Edition <code>${snapshot.editionId}</code>. Source retrieved ${snapshot.retrievedAt}. This saved file cannot update itself.</p><p><a href="${escapeMarkup(STORY_URL + stateSearch(state))}">Reopen this selection and notes</a> \xB7 <a href="${STORY_URL}#sources">Source and correction notes</a></p></footer></body></html>`;
}
export {
  buildNotePacket,
  daySummary,
  dayValues,
  defaultState,
  eventReference,
  importNotePacket,
  legObservation,
  numericalChecks,
  readStateSearch,
  renderDayHTML,
  resolveReference,
  stateSearch,
  validateState,
  verifyDay
};
