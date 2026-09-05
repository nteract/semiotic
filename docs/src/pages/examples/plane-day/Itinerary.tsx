import React from "react"
import { connectionIssue } from "./prepare"
import { deviation, flightName, reportedCauses, signed, timeLabel } from "./format"
import { numeric } from "./time"
import type { AircraftDay, Flight, PlaneSnapshot, PlaneState } from "./types"

export default function Itinerary({
  day,
  snapshot,
  state,
  onSelect,
}: {
  day: AircraftDay
  snapshot: PlaneSnapshot
  state: PlaneState
  onSelect: (id: string) => void
}) {
  const clock = (
    flight: Flight,
    field: "scheduledDeparture" | "actualDeparture" | "scheduledArrival" | "actualArrival",
  ) => timeLabel(flight, field, snapshot, state.timeBasis)
  const previous = day.context.previous
  return (
    <div className="plane-itinerary">
      <p className="plane-boundary">
        Before this window:{" "}
        {previous
          ? `${flightName(previous)}, scheduled date ${previous.raw.FlightDate}. ${connectionIssue(previous, day.flights[0]) ?? "Tail, airport and chronology are consistent with the first leg shown."}`
          : "No preceding reported flight is available in the pinned month."}
      </p>
      <ol aria-label="Aircraft itinerary">
        {day.flights.map((flight, index) => {
          const selected = flight.id === state.selected.eventId
          const breakBefore = day.breaks.find((item) => item.before === flight.id)
          const preceding = day.flights[index - 1]
          const ground =
            preceding &&
            !breakBefore &&
            preceding.actualArrival !== null &&
            flight.actualDeparture !== null
              ? (flight.actualDeparture - preceding.actualArrival) / 60_000
              : null
          return (
            <li key={flight.id} data-event-id={flight.id} data-selected={selected}>
              {breakBefore && (
                <p className="plane-break">Observed chain breaks here: {breakBefore.reason}.</p>
              )}
              {ground !== null && (
                <p className="plane-ground">
                  {ground} min on the ground at {flight.raw.Origin} between the reported flights
                </p>
              )}
              <div className="plane-flight-card">
                <button
                  className="plane-pin"
                  aria-pressed={selected}
                  onClick={() => onSelect(flight.id)}
                  aria-label={`Pin ${flightName(flight)}`}
                >
                  <span className="plane-leg-number">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>
                      {flight.raw.Origin} <span aria-hidden="true">→</span> {flight.raw.Dest}
                    </strong>
                    <small>
                      HA {flight.raw.Flight_Number_Reporting_Airline}{" "}
                      {selected ? "· Pinned" : "· Pin this flight"}
                    </small>
                  </span>
                  <b className="plane-deviation">
                    {flight.issues.length ? "Unresolved" : deviation(numeric(flight.raw.DepDelay))}
                  </b>
                </button>
                <div className="plane-clock-pair">
                  <div>
                    <small>Scheduled departure</small>
                    <b>{clock(flight, "scheduledDeparture")}</b>
                  </div>
                  <div>
                    <small>Actual departure</small>
                    <b>{clock(flight, "actualDeparture")}</b>
                  </div>
                </div>
                <details>
                  <summary>Arrivals and original reporting fields</summary>
                  <p>
                    Scheduled arrival: {clock(flight, "scheduledArrival")}
                    <br />
                    Actual arrival: {clock(flight, "actualArrival")}
                  </p>
                  <p>
                    Signed arrival deviation: {signed(numeric(flight.raw.ArrDelay))} min. Scheduled
                    / actual gate-to-gate durations:{" "}
                    {numeric(flight.raw.CRSElapsedTime) ?? "unavailable"} /{" "}
                    {numeric(flight.raw.ActualElapsedTime) ?? "unavailable"} min.
                  </p>
                  <p>{reportedCauses(flight)}</p>
                  <p>
                    Cancellation flag: {flight.raw.Cancelled}; diversion flag: {flight.raw.Diverted}
                    . BTS archive CSV record line {flight.raw.sourceRecordLine}.
                  </p>
                  <code>{flight.id}</code>
                </details>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="plane-boundary">
        After this window:{" "}
        {day.context.next
          ? `${flightName(day.context.next)}, scheduled date ${day.context.next.raw.FlightDate}. ${connectionIssue(day.flights.at(-1)!, day.context.next) ?? "Tail, airport and chronology are consistent with the last leg shown."}`
          : "No following reported flight is available in the pinned month."}{" "}
        This window does not describe every use of the aircraft.
      </p>
    </div>
  )
}
