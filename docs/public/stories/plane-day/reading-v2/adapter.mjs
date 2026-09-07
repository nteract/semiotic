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
    view: "time-space",
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
  if (!["timeline", "network", "time-space"].includes(value.view) || !["local", "utc"].includes(value.timeBasis))
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
function renderDayHTML(snapshot, day, state, charts = "") {
  const values = dayValues(day);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Your plane has had a day \u2014 ${escapeMarkup(day.tail)}</title><style>body{max-width:950px;margin:2rem auto;padding:1rem;font:18px/1.6 system-ui;color:#1e3346;background:#fff}a{color:inherit}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:12px;border-bottom:1px solid #bbb}section{overflow-x:auto}li{margin:1rem 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}tr[data-selected=true]{outline:2px solid #1e3346}code{overflow-wrap:anywhere}@media print{body{font-size:11pt;margin:0}table{font-size:8pt}section{overflow:visible}a{overflow-wrap:anywhere}}</style></head><body>
  <h1>Your plane has had a day</h1><p>${escapeMarkup(daySummary(day))}</p><p>${QUALIFICATION}</p>
  ${charts}
  <p>Selected: ${escapeMarkup(flightName(day.flights.find((f) => f.id === state.selected.eventId)))}. ${state.timeBasis === "utc" ? "All clocks use UTC." : "Departure clocks are origin-local; arrival clocks are destination-local, with dates and zone labels."}</p>
  <section tabindex="0" aria-label="Aircraft-day timetable"><table><caption>All ${day.flights.length} reported flights in this selected scheduled-date window. Unavailable means unresolved or excluded reporting fields.</caption><thead><tr><th>Flight</th><th>Scheduled departure</th><th>Actual departure</th><th>Scheduled arrival</th><th>Actual arrival</th><th>Departure / arrival deviation (min)</th></tr></thead><tbody>
  ${day.flights.map((flight, index) => `<tr data-event-id="${escapeMarkup(flight.id)}" data-selected="${flight.id === state.selected.eventId}"><th>${escapeMarkup(flightName(flight))}</th>${["scheduledDeparture", "actualDeparture", "scheduledArrival", "actualArrival"].map((field) => `<td>${escapeMarkup(timeLabel(flight, field, snapshot, state.timeBasis))}</td>`).join("")}<td>${signed(values[index].departureDeviationMinutes)} / ${signed(values[index].arrivalDeviationMinutes)}</td></tr>`).join("")}
  </tbody></table></section><h2>Observations and reporting limits</h2><ol>${values.map((row, index) => `<li><p>${escapeMarkup(row.observation)}</p><p>${escapeMarkup(reportedCauses(day.flights[index]))}</p><p>BTS archive CSV record line ${row.sourceRecordLine}; event <code>${escapeMarkup(row.eventId)}</code>.</p></li>`).join("")}</ol>
  <p>${day.breaks.length ? day.breaks.map((item) => escapeMarkup(item.reason)).join("; ") : "No internal continuity break was detected under the published checks."} The window starts and ends at the reported scheduled date. A shared tail number does not establish why a flight was late; unreported positioning, international flights, or aircraft changes can leave gaps.</p>
  <h2>Reader notes \xB7 unreviewed</h2>${state.notes.length ? state.notes.map((note) => `<p>Target: <code>${escapeMarkup(note.target.eventId)}</code>, edition ${escapeMarkup(note.target.editionId)}. Reader-authored, ${escapeMarkup(note.createdAt)}.</p><pre>${escapeMarkup(note.text)}</pre>`).join("") : "<p>No reader note saved.</p>"}
  <footer><p>Edition <code>${snapshot.editionId}</code>. Source retrieved ${snapshot.retrievedAt}. This saved file cannot update itself.</p><p><a href="${escapeMarkup(STORY_URL + stateSearch(state))}">Reopen this selection and notes</a> \xB7 <a href="${STORY_URL}#sources">Source and correction notes</a></p></footer></body></html>`;
}

// docs/src/pages/examples/plane-day/layouts.tsx
import { jsx, jsxs } from "react/jsx-runtime";
function ribbonGeometry(day, width) {
  const values = day.flights.flatMap((f) => [
    f.scheduledDeparture,
    f.scheduledArrival,
    ...!f.issues.length ? [f.actualDeparture, f.actualArrival] : []
  ]).filter((v) => v !== null);
  const fallback = Date.parse(`${day.date}T00:00:00Z`);
  const start = values.length ? Math.floor(Math.min(...values) / 36e5) * 36e5 : fallback;
  const end = values.length ? Math.ceil(Math.max(...values) / 36e5) * 36e5 : fallback + 864e5;
  const x = (instant) => (instant - start) / (end - start || 1) * width;
  return {
    start,
    end,
    x,
    rows: day.flights.map((flight, index) => ({ flight, y: index * 68 + 30 }))
  };
}
var ribbonLayout = ({
  dimensions,
  config,
  resolveColor,
  theme
}) => {
  const geometry = ribbonGeometry(config.day, dimensions.width);
  const nodes = geometry.rows.flatMap(
    ({ flight, y }) => ["scheduled", "actual"].flatMap((kind, index) => {
      const start = flight[kind === "scheduled" ? "scheduledDeparture" : "actualDeparture"];
      const end = flight[kind === "scheduled" ? "scheduledArrival" : "actualArrival"];
      if (start === null || end === null || kind === "actual" && flight.issues.length) return [];
      const color = resolveColor(kind);
      return [
        {
          type: "rect",
          x: geometry.x(start),
          y: y + index * 16,
          w: Math.max(1, geometry.x(end) - geometry.x(start)),
          h: 10,
          style: {
            fill: kind === "scheduled" ? scheduledFill : color,
            stroke: flight.id === config.selected ? theme.semantic.text : color,
            strokeWidth: flight.id === config.selected ? 2.5 : 1
          },
          datum: {
            eventId: flight.id,
            flight: flightName(flight),
            kind,
            startUTC: new Date(start).toISOString(),
            endUTC: new Date(end).toISOString()
          },
          _transitionKey: `${flight.id}:${kind}`
        }
      ];
    })
  );
  const ticks = [];
  for (let instant = geometry.start; instant <= geometry.end; instant += 4 * 36e5)
    ticks.push(instant);
  return {
    nodes,
    overlays: /* @__PURE__ */ jsxs("g", { fill: theme.semantic.text, fontFamily: "monospace", fontSize: 11, children: [
      geometry.rows.map(({ flight, y }, index) => /* @__PURE__ */ jsxs("text", { x: -12, y: y + 14, textAnchor: "end", children: [
        index + 1,
        ". ",
        flight.raw.Origin,
        " \u2192 ",
        flight.raw.Dest
      ] }, flight.id)),
      ticks.map((tick) => /* @__PURE__ */ jsxs("g", { children: [
        /* @__PURE__ */ jsx(
          "line",
          {
            x1: geometry.x(tick),
            x2: geometry.x(tick),
            y1: 0,
            y2: dimensions.height - 12,
            stroke: "currentColor",
            opacity: 0.12
          }
        ),
        /* @__PURE__ */ jsx("text", { x: geometry.x(tick), y: dimensions.height + 10, textAnchor: "middle", children: new Date(tick).toISOString().slice(5, 16).replace("T", " ") })
      ] }, tick))
    ] })
  };
};
function ribbonProps(day, selected) {
  return {
    data: day.flights.flatMap(
      (f) => ["scheduled", "actual"].map((kind) => ({ eventId: f.id, kind }))
    ),
    colorBy: "kind",
    showLegend: false,
    layout: ribbonLayout,
    layoutConfig: { day, selected },
    width: 850,
    height: day.flights.length * 68 + 100,
    margin: { left: 150, right: 35, top: 20, bottom: 50 },
    title: "Scheduled and actual flight intervals",
    description: "Hatched: scheduled gate-to-gate interval. Solid: actual interval. Gaps between flights are ground time. Horizontal axis is UTC.",
    summary: daySummary(day),
    accessibleTable: true,
    colorScheme: { scheduled: "#8d939c", actual: "#287a79" },
    enableHover: true
  };
}
var scheduledFill = {
  type: "hatch",
  background: "#f2f0e9",
  stroke: "#596674",
  spacing: 5,
  lineWidth: 1.5,
  angle: 45
};

// docs/src/pages/examples/plane-day/time-space.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function airportLanes(day) {
  return [...new Set(day.flights.flatMap((f) => [f.raw.Origin, f.raw.Dest]))];
}
var timeSpaceLayout = ({
  dimensions,
  config: { day, selected },
  resolveColor,
  theme
}) => {
  const { start, end, x } = ribbonGeometry(day, dimensions.width);
  const airports = airportLanes(day);
  const y = (airport) => 35 + airports.indexOf(airport) * (dimensions.height - 70) / Math.max(1, airports.length - 1);
  const nodes = [];
  for (const kind of ["scheduled", "actual"]) {
    const halfWidth = kind === "scheduled" ? 7 : 3;
    for (const [index, flight] of day.flights.entries()) {
      const departure = flight[kind === "scheduled" ? "scheduledDeparture" : "actualDeparture"];
      const arrival = flight[kind === "scheduled" ? "scheduledArrival" : "actualArrival"];
      if (departure === null || arrival === null || flight.issues.length) continue;
      const previous = day.flights[index - 1];
      const previousArrival = previous?.[kind === "scheduled" ? "scheduledArrival" : "actualArrival"];
      if (previous && !previous.issues.length && previousArrival != null && previousArrival <= departure && previous.raw.Dest === flight.raw.Origin && !day.breaks.some((b) => b.before === flight.id)) {
        nodes.push({
          type: "rect",
          x: x(previousArrival),
          y: y(flight.raw.Origin) - halfWidth,
          w: x(departure) - x(previousArrival),
          h: halfWidth * 2,
          style: { fill: kind === "scheduled" ? scheduledFill : resolveColor(kind) },
          datum: { eventId: flight.id, kind, phase: "Ground interval before this flight" },
          _transitionKey: `${flight.id}:${kind}:ground`
        });
      }
      nodes.push({
        type: "area",
        topPath: [
          [x(departure), y(flight.raw.Origin) - halfWidth],
          [x(arrival), y(flight.raw.Dest) - halfWidth]
        ],
        bottomPath: [
          [x(departure), y(flight.raw.Origin) + halfWidth],
          [x(arrival), y(flight.raw.Dest) + halfWidth]
        ],
        style: {
          fill: kind === "scheduled" ? scheduledFill : resolveColor(kind),
          stroke: flight.id === selected ? theme.semantic.text : "none",
          strokeWidth: flight.id === selected ? 1.8 : 0
        },
        datum: [
          {
            eventId: flight.id,
            flight: flightName(flight),
            kind,
            departureUTC: new Date(departure).toISOString(),
            arrivalUTC: new Date(arrival).toISOString()
          }
        ],
        _transitionKey: `${flight.id}:${kind}:flight`
      });
    }
  }
  const ticks = Array.from({ length: 5 }, (_, i) => start + (end - start) * i / 4);
  return {
    nodes,
    overlays: /* @__PURE__ */ jsxs2("g", { fontFamily: "system-ui", fontSize: 11, fill: "#1e3346", children: [
      airports.map((airport) => /* @__PURE__ */ jsxs2("g", { children: [
        /* @__PURE__ */ jsx2(
          "line",
          {
            x1: 0,
            x2: dimensions.width,
            y1: y(airport),
            y2: y(airport),
            stroke: "#1e3346",
            opacity: 0.15
          }
        ),
        /* @__PURE__ */ jsx2("text", { x: -10, y: y(airport) + 4, textAnchor: "end", children: airport })
      ] }, airport)),
      ticks.map((tick, index) => /* @__PURE__ */ jsxs2("g", { children: [
        /* @__PURE__ */ jsx2(
          "line",
          {
            x1: x(tick),
            x2: x(tick),
            y1: 0,
            y2: dimensions.height,
            stroke: "#1e3346",
            opacity: 0.1
          }
        ),
        /* @__PURE__ */ jsx2(
          "text",
          {
            x: x(tick),
            y: dimensions.height + 20,
            textAnchor: index === 0 ? "start" : index === 4 ? "end" : "middle",
            children: new Date(tick).toISOString().slice(11, 16)
          }
        ),
        /* @__PURE__ */ jsx2(
          "text",
          {
            x: x(tick),
            y: dimensions.height + 35,
            textAnchor: index === 0 ? "start" : index === 4 ? "end" : "middle",
            children: new Date(tick).toISOString().slice(5, 10)
          }
        )
      ] }, tick))
    ] })
  };
};
function timeSpaceProps(day, selected) {
  return {
    data: day.flights.flatMap(
      (f) => ["scheduled", "actual"].map((kind) => ({ eventId: f.id, kind }))
    ),
    colorBy: "kind",
    colorScheme: { scheduled: "#596674", actual: "#287a79" },
    showLegend: false,
    layout: timeSpaceLayout,
    layoutConfig: { day, selected },
    width: 850,
    height: Math.max(340, airportLanes(day).length * 85 + 85),
    margin: { left: 52, right: 20, top: 24, bottom: 65 },
    title: "One aircraft\u2019s day",
    description: "Time runs left to right in UTC. Airport lanes are categorical, not geographic distance. Hatched bands trace scheduled gate-to-gate intervals; solid bands trace actual intervals. Horizontal stretches are ground intervals. The pinned flight is outlined. Unresolved continuity is never joined.",
    summary: daySummary(day),
    accessibleTable: true,
    enableHover: true
  };
}

// docs/src/pages/examples/plane-day/export-runtime.ts
import { renderChartWithEvidence } from "semiotic/server";
function renderFlightHTML(snapshot, day, state) {
  const timeSpace = renderChartWithEvidence("XYCustomChart", {
    ...timeSpaceProps(day, state.selected.eventId),
    _idPrefix: "flight-path"
  });
  const ribbon = renderChartWithEvidence("XYCustomChart", {
    ...ribbonProps(day, state.selected.eventId),
    _idPrefix: "flight-ribbon"
  });
  return renderDayHTML(
    snapshot,
    day,
    state,
    `<style>svg{width:100%;height:auto}</style>
    <h2>An aircraft through time and airports</h2>${timeSpace.svg}
    <p>Read left to right in UTC. Hatched bands show scheduled intervals; solid bands show actual intervals. Horizontal stretches show ground intervals only where continuity is checked. Airport spacing does not encode distance or speed. The pinned flight is outlined.</p>
    <h2>Scheduled and actual flight intervals</h2>${ribbon.svg}
    <p>Scheduled intervals are hatched; actual intervals are solid. Both charts use UTC; the table retains your chosen clock labels. A shared tail number does not establish the cause of a delay.</p>`
  );
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
  renderFlightHTML,
  resolveReference,
  ribbonProps,
  stateSearch,
  timeSpaceProps,
  validateState,
  verifyDay
};
