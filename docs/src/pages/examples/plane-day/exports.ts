import {
  daySummary,
  flightName,
  QUALIFICATION,
  reportedCauses,
  signed,
  STORY_URL,
  timeLabel,
} from "./format"
import { dayValues } from "./packet"
import { stateSearch } from "./state"
import type { AircraftDay, PlaneSnapshot, PlaneState } from "./types"

export const escapeMarkup = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  )

export function renderDayHTML(snapshot: PlaneSnapshot, day: AircraftDay, state: PlaneState) {
  const values = dayValues(day)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Your plane has had a day — ${escapeMarkup(day.tail)}</title><style>body{max-width:950px;margin:2rem auto;padding:1rem;font:18px/1.6 system-ui;color:#1e3346;background:#fff}a{color:inherit}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:12px;border-bottom:1px solid #bbb}section{overflow-x:auto}li{margin:1rem 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}tr[data-selected=true]{outline:2px solid #1e3346}code{overflow-wrap:anywhere}@media print{body{font-size:11pt;margin:0}table{font-size:8pt}section{overflow:visible}a{overflow-wrap:anywhere}}</style></head><body>
  <h1>Your plane has had a day</h1><p>${escapeMarkup(daySummary(day))}</p><p>${QUALIFICATION}</p>
  <p>Selected: ${escapeMarkup(flightName(day.flights.find((f) => f.id === state.selected.eventId)!))}. ${state.timeBasis === "utc" ? "All clocks use UTC." : "Departure clocks are origin-local; arrival clocks are destination-local, with dates and zone labels."}</p>
  <section tabindex="0" aria-label="Aircraft-day timetable"><table><caption>All ${day.flights.length} reported flights in this selected scheduled-date window. Unavailable means unresolved or excluded reporting fields.</caption><thead><tr><th>Flight</th><th>Scheduled departure</th><th>Actual departure</th><th>Scheduled arrival</th><th>Actual arrival</th><th>Departure / arrival deviation (min)</th></tr></thead><tbody>
  ${day.flights.map((flight, index) => `<tr data-event-id="${escapeMarkup(flight.id)}" data-selected="${flight.id === state.selected.eventId}"><th>${escapeMarkup(flightName(flight))}</th>${(["scheduledDeparture", "actualDeparture", "scheduledArrival", "actualArrival"] as const).map((field) => `<td>${escapeMarkup(timeLabel(flight, field, snapshot, state.timeBasis))}</td>`).join("")}<td>${signed(values[index].departureDeviationMinutes)} / ${signed(values[index].arrivalDeviationMinutes)}</td></tr>`).join("")}
  </tbody></table></section><h2>Observations and reporting limits</h2><ol>${values.map((row, index) => `<li><p>${escapeMarkup(row.observation)}</p><p>${escapeMarkup(reportedCauses(day.flights[index]))}</p><p>BTS archive CSV record line ${row.sourceRecordLine}; event <code>${escapeMarkup(row.eventId)}</code>.</p></li>`).join("")}</ol>
  <p>${day.breaks.length ? day.breaks.map((item) => escapeMarkup(item.reason)).join("; ") : "No internal continuity break was detected under the published checks."} The window starts and ends at the reported scheduled date. A shared tail number does not establish why a flight was late; unreported positioning, international flights, or aircraft changes can leave gaps.</p>
  <h2>Reader notes · unreviewed</h2>${state.notes.length ? state.notes.map((note) => `<p>Target: <code>${escapeMarkup(note.target.eventId)}</code>, edition ${escapeMarkup(note.target.editionId)}. Reader-authored, ${escapeMarkup(note.createdAt)}.</p><pre>${escapeMarkup(note.text)}</pre>`).join("") : "<p>No reader note saved.</p>"}
  <footer><p>Edition <code>${snapshot.editionId}</code>. Source retrieved ${snapshot.retrievedAt}. This saved file cannot update itself.</p><p><a href="${escapeMarkup(STORY_URL + stateSearch(state))}">Reopen this selection and notes</a> · <a href="${STORY_URL}#sources">Source and correction notes</a></p></footer></body></html>`
}
