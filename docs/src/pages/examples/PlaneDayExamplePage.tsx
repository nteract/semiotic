import React, { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import ExamplePageLayout from "./ExamplePageLayout"
import rawSnapshot from "./plane-day/snapshot.json"
import Itinerary from "./plane-day/Itinerary"
import {
  defaultState,
  eventReference,
  readStateSearch,
  resolveReference,
  stateSearch,
} from "./plane-day/state"
import {
  daySummary,
  flightName,
  legObservation,
  PATTERNS,
  QUALIFICATION,
  RULES,
  STORY_PATH,
} from "./plane-day/format"
import type { AircraftDay, Pattern, PlaneSnapshot, PlaneState } from "./plane-day/types"
import "./PlaneDayExamplePage.css"

const FlightCharts = lazy(() =>
  import("./plane-day/PlaneCharts").then((module) => ({ default: module.FlightCharts })),
)
const CohortChart = lazy(() =>
  import("./plane-day/PlaneCharts").then((module) => ({ default: module.CohortChart })),
)
const snapshot = rawSnapshot as PlaneSnapshot
const editionPath = `/stories/plane-day/${snapshot.editionId}`

function loadState(search: string) {
  try {
    const state = readStateSearch(search, snapshot)
    return { state, issue: resolveReference(state.selected, snapshot) }
  } catch (error) {
    return {
      state: null,
      issue: error instanceof Error ? error.message : "Invalid saved selection",
    }
  }
}

export default function PlaneDayExamplePage() {
  const { search } = useLocation()
  const [saved, setSaved] = useState(() => loadState(search))
  const [loadedDay, setLoadedDay] = useState<AircraftDay | null>(null)
  const [loadError, setLoadError] = useState("")
  const [message, setMessage] = useState("")
  const [note, setNote] = useState("")
  const [pattern, setPattern] = useState<Pattern | "all">("all")
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => setSaved(loadState(search)), [search])
  const state = saved.state
  const selectedDayId = state?.selected.dayId
  const day =
    state && !saved.issue
      ? (snapshot.cases.find((day) => day.id === state.selected.dayId) ??
        (loadedDay?.id === state.selected.dayId ? loadedDay : null))
      : null
  const resolvedIssue =
    saved.issue || (state && day ? resolveReference(state.selected, snapshot, day) : null)
  const selectedFlight =
    !resolvedIssue && day?.flights.find((flight) => flight.id === state?.selected.eventId)
  useEffect(() => setNote(""), [state?.selected.eventId])

  useEffect(() => {
    setLoadError("")
    if (
      !selectedDayId ||
      saved.issue ||
      snapshot.cases.some((day) => day.id === selectedDayId) ||
      loadedDay?.id === selectedDayId
    )
      return
    const controller = new AbortController()
    let active = true
    Promise.all([
      fetch(`${editionPath}/days/${selectedDayId.slice(0, 10)}.json`, {
        signal: controller.signal,
      }).then((response) => {
        if (!response.ok)
          throw new Error("This saved aircraft-day could not be loaded. Its selection is retained.")
        return response
          .json()
          .then((days: AircraftDay[]) => days.find((day) => day.id === selectedDayId))
      }),
      import("./plane-day/packet"),
    ])
      .then(([value, { verifyDay }]) => {
        if (active) {
          if (!value)
            throw new Error("The selected aircraft-day is missing from this edition file.")
          setLoadedDay(verifyDay(snapshot, value))
        }
      })
      .catch((error) => {
        if (active) setLoadError(error.message)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [selectedDayId, saved.issue, loadedDay?.id, retry])

  function update(next: PlaneState) {
    setSaved({ state: next, issue: resolveReference(next.selected, snapshot) })
  }
  function selectDay(nextDay: AircraftDay) {
    const initial = state ?? defaultState(snapshot)
    update({ ...initial, selected: eventReference(snapshot, nextDay, nextDay.flights[0].id) })
    setMessage("")
  }
  function selectFlight(id: string) {
    if (!state || !day || !day.flights.some((flight) => flight.id === id)) return
    update({ ...state, selected: eventReference(snapshot, day, id) })
  }
  function saveNote() {
    if (!state || !day || !note.trim()) return
    if (state.notes.length >= 50) {
      setMessage("This packet already has 50 notes. Export it before starting another.")
      return
    }
    update({
      ...state,
      notes: [
        ...state.notes,
        {
          target: { ...state.selected },
          text: note.trim(),
          authoredBy: "reader",
          status: "unreviewed",
          createdAt: new Date().toISOString(),
        },
      ],
    })
    setNote("")
    setMessage("Note attached to this flight. Keep it using the link or note packet below.")
  }
  async function download(format: "json" | "html") {
    if (!state || !day) return
    setBusy(true)
    try {
      const { buildNotePacket } = await import("./plane-day/packet")
      const packet = buildNotePacket(snapshot, day, state)
      const body =
        format === "json"
          ? JSON.stringify(packet, null, 2)
          : (await import("./plane-day/export-runtime")).renderFlightHTML(snapshot, day, state)
      const url = URL.createObjectURL(
        new Blob([body], { type: format === "json" ? "application/json" : "text/html" }),
      )
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `plane-${day.id}.${format}`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage(
        format === "json"
          ? "Note packet downloaded. Open it in another session using Import note packet."
          : "Printable day sheet downloaded. Open it in a browser and print.",
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export unavailable")
    } finally {
      setBusy(false)
    }
  }
  async function importFile(file?: File) {
    if (!file) return
    setBusy(true)
    try {
      if (file.size > 2_000_000) throw new Error("This note packet exceeds the 2 MB import limit.")
      const { importNotePacket } = await import("./plane-day/packet")
      const result = importNotePacket(JSON.parse(await file.text()), snapshot)
      setSaved({ state: result.state, issue: result.issue })
      setLoadedDay(result.day)
      setMessage(result.issue ?? "Imported the same flight and unreviewed reader notes.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import unavailable")
    } finally {
      setBusy(false)
    }
  }
  const cohort = useMemo(
    () =>
      snapshot.days.filter((day) =>
        pattern === "all" ? day.pattern !== "ineligible" : day.pattern === pattern,
      ),
    [pattern],
  )
  const activeNotes =
    state?.notes.filter(
      (note) =>
        note.target.editionId === snapshot.editionId &&
        note.target.dayId === day?.id &&
        note.target.eventId === state.selected.eventId,
    ) ?? []

  return (
    <ExamplePageLayout
      prevPage={undefined}
      nextPage={undefined}
      title="Your plane has had a day"
      showPageHeader={false}
      showContractPanels={false}
      showViewToggle={false}
    >
      <article className="plane-story">
        <header className="plane-opening" data-server-opening>
          <p className="plane-kicker">The aircraft before your flight / July 2025</p>
          <h1>
            Your plane
            <br />
            has had <em>a day.</em>
          </h1>
          <p className="plane-deck">
            One aircraft left San Francisco two and a half hours late. Its next departure was
            only eleven minutes late. What happened between those flights?
          </p>
          <div
            className="plane-opening-numbers"
            aria-label="Authored recovery case: departure delays of 150, 11, and 12 minutes"
          >
            <div>
              <span>SFO → HNL</span>
              <strong>
                +150<small>min</small>
              </strong>
            </div>
            <span aria-hidden="true">→</span>
            <div>
              <span>HNL → PPG</span>
              <strong>
                +11<small>min</small>
              </strong>
            </div>
            <span aria-hidden="true">→</span>
            <div>
              <span>PPG → HNL</span>
              <strong>
                +12<small>min</small>
              </strong>
            </div>
          </div>
          <p className="plane-caption">
            Tail N393HA · flights scheduled July 10, 2025 · minutes relative to each departure’s own
            schedule
          </p>
          <a className="plane-jump" href="#follow-the-plane">
            Follow its day ↓
          </a>
        </header>

        <section className="plane-section plane-introduction">
          <p className="plane-chapter">01 / BEFORE YOUR FLIGHT</p>
          <h2>There is another timetable behind your boarding pass.</h2>
          <p>
            The plane at your gate may already have made several trips. Every stop gives it a
            chance to lose time or catch up: a late arrival might use up a long layover, or leave
            the next flight waiting. Following the aircraft shows how its delay changes through
            the day.
          </p>
          <p>
            These three journeys come from Hawaiian’s July 2025 flight records, reported to the
            Bureau of Transportation Statistics. Each illustrates a pattern: staying near
            schedule, recovering from a delay, or remaining late. We chose short journeys so you
            can follow every leg; the full comparison appears below.
          </p>
          <div className="plane-cases">
            {snapshot.cases.map((example, index) => (
              <div key={example.id}>
                <span className="plane-case-index">0{index + 1}</span>
                <h3>{PATTERNS[example.pattern]}</h3>
                <p>
                  {index === 0
                    ? "Los Angeles to Maui, then Seattle and Anchorage: departures 4 minutes early, 5 early, and 9 late. At the last arrival, the aircraft was 13 minutes early."
                    : index === 1
                      ? "San Francisco to Honolulu, then Pago Pago and back: 150 minutes late became 11, then 12. The last arrival was on July 11, two minutes early."
                      : "Honolulu to San Diego and back, then another San Diego flight: 2 minutes early, 62 late, then 35 late. Some delay was absorbed; a late departure remained."}
                </p>
                <button onClick={() => selectDay(example)} aria-pressed={day?.id === example.id}>
                  Explore {PATTERNS[example.pattern].toLowerCase()}
                </button>
              </div>
            ))}
          </div>
          <p>
            The third aircraft recovered 27 minutes between departures and still left 35 minutes
            late. Catching up can take more than one stop.
          </p>
        </section>

        <section
          className="plane-section"
          id="follow-the-plane"
          aria-labelledby="itinerary-heading"
        >
          <p className="plane-chapter">02 / FOLLOW THE SAME AIRCRAFT</p>
          <h2 id="itinerary-heading">The day, leg by leg.</h2>
          {resolvedIssue && (
            <div role="alert" className="plane-break">
              <p>{resolvedIssue}</p>
              <button onClick={() => setSaved({ state: defaultState(snapshot), issue: null })}>
                Reset to the authored recovery case
              </button>
            </div>
          )}
          {loadError && (
            <div role="alert">
              <p>{loadError}</p>
              <button onClick={() => setRetry((value) => value + 1)}>
                Retry loading this aircraft-day
              </button>
            </div>
          )}
          {state && !day && !resolvedIssue && !loadError && (
            <p role="status">Loading the selected aircraft-day from this saved edition…</p>
          )}
          {state && day && selectedFlight && (
            <>
              <p className="plane-current-summary" data-testid="day-summary">
                {daySummary(day)}
              </p>
              <div className="plane-controls">
                <label>
                  View
                  <select
                    aria-label="View"
                    value={state.view}
                    onChange={(event) =>
                      update({ ...state, view: event.target.value as PlaneState["view"] })
                    }
                  >
                    <option value="time-space">Time–space diagram</option>
                    <option value="timeline">Timetable ribbon</option>
                    <option value="network">Airport network</option>
                  </select>
                </label>
                <label>
                  Clock labels
                  <select
                    aria-label="Clock labels"
                    value={state.timeBasis}
                    onChange={(event) =>
                      update({ ...state, timeBasis: event.target.value as PlaneState["timeBasis"] })
                    }
                  >
                    <option value="local">Local to each airport</option>
                    <option value="utc">UTC — common time basis</option>
                  </select>
                </label>
              </div>
              <p className="plane-caption">
                {state.view === "time-space"
                  ? "Read left to right through airport lanes. Sloping bands are flights; horizontal stretches are ground intervals. Their separation shows where the schedule and reported day diverge or converge. Airport spacing does not encode distance or speed. Both paths use UTC; clock labels below can change independently."
                  : state.view === "timeline"
                    ? "Hatched: scheduled flight interval. Solid: actual interval. The ribbon uses UTC; the itinerary below offers local clocks. On a phone, follow the vertical itinerary."
                    : "Each curve is a reported leg; the thicker curve is pinned. Use the numbered flight buttons below for direction and sequence. This network is a route overview, not a geographic map."}
              </p>
              {state.view !== "network" && (
                <p className="plane-interval-key">
                  <span>
                    <i className="plane-scheduled-swatch" aria-hidden="true" /> Scheduled · hatched
                  </span>
                  <span>
                    <i className="plane-actual-swatch" aria-hidden="true" /> Actual · solid
                  </span>
                </p>
              )}
              <Suspense
                fallback={
                  <p>Loading the chart enhancement. All times are in the itinerary below.</p>
                }
              >
                <FlightCharts day={day} state={state} onSelect={selectFlight} />
              </Suspense>
              <Itinerary day={day} snapshot={snapshot} state={state} onSelect={selectFlight} />
              <aside
                className="plane-observation"
                aria-labelledby="pinned-heading"
                data-testid="pinned-flight"
                data-event-id={selectedFlight.id}
              >
                <p className="plane-chapter">SELECTED FLIGHT</p>
                <h3 id="pinned-heading">{flightName(selectedFlight)}</h3>
                <p>{legObservation(day, selectedFlight)}</p>
                <p className="plane-caption">
                  This comparison uses the reported departure delays. The flight details below
                  include BTS delay categories where available.
                </p>
                <label htmlFor="plane-note">Your local note about this flight</label>
                <textarea
                  id="plane-note"
                  maxLength={2000}
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What do you notice? What would you need to explain it?"
                />
                <button onClick={saveNote} disabled={!note.trim()}>
                  Attach note to this flight
                </button>
                {activeNotes.map((note, index) => (
                  <blockquote key={`${note.createdAt}-${index}`}>
                    <p>{note.text}</p>
                    <footer>Reader note · unreviewed · {note.createdAt.slice(0, 10)}</footer>
                  </blockquote>
                ))}
                <div className="plane-identity-demo" data-testid="plane-identity-demo">
                  <h4>Try it: make the note travel</h4>
                  <ol>
                    <li>Attach your own note to the pinned flight above.</li>
                    <li>
                      Switch the view and clocks below. Check that the same flight and note remain
                      pinned.
                    </li>
                    <li>
                      <a href="#plane-save">Reopen the link or saved note packet</a> in another
                      session.
                    </li>
                  </ol>
                  <button
                    onClick={() => {
                      update({
                        ...state,
                        view: state.view === "network" ? "time-space" : "network",
                        timeBasis: state.timeBasis === "utc" ? "local" : "utc",
                      })
                      setMessage(
                        "Changed the layout and clock labels. The pinned flight and its attached notes kept their identities.",
                      )
                    }}
                  >
                    Switch view and clocks; keep this flight
                  </button>
                  <p>
                    {activeNotes.length}{" "}
                    {activeNotes.length === 1 ? "note attached" : "notes attached"} to{" "}
                    {flightName(selectedFlight)}.
                  </p>
                  <details>
                    <summary>The identity that stays with your note</summary>
                    <code>{selectedFlight.id}</code>
                    <p>Edition: {snapshot.editionId}</p>
                  </details>
                </div>
              </aside>
            </>
          )}
        </section>

        <section className="plane-section" aria-labelledby="cohort-heading">
          <p className="plane-chapter">03 / THE REST OF THE MONTH</p>
          <h2 id="cohort-heading">How often did these patterns appear?</h2>
          <p>
            Of <b>660 aircraft-days with at least three connected flights</b>, 334 stayed near schedule, 11 met our recovery rule, and 24 met our persistence rule. The other 291 followed different patterns. Use the controls to explore the journeys behind those counts.
          </p>
          <div className="plane-pattern-counts">
            {(["near", "recovered", "persisted", "other"] as Pattern[]).map((key) => (
              <div key={key}>
                <strong>
                  {snapshot.counts[key]}
                  <small> / {snapshot.counts.eligibleDays}</small>
                </strong>
                <span>
                  {PATTERNS[key]} ·{" "}
                  {((snapshot.counts[key] / snapshot.counts.eligibleDays) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          <p>
            The July 2–30 records contain 1,627 aircraft-days with a tail number. Of these, 941
            have fewer than three flights and 48 have a reporting or continuity break; 22 fall
            into both groups. Excluding them leaves 660 days. This favors longer itineraries, so
            the counts describe that group rather than Hawaiian’s overall on-time performance.
          </p>
          <label className="plane-cohort-filter">
            Comparison pattern
            <select
              value={pattern}
              onChange={(event) => setPattern(event.target.value as Pattern | "all")}
            >
              <option value="all">All eligible aircraft-days</option>
              {Object.entries(PATTERNS).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p>
            {pattern === "all"
              ? "All checked, internally continuous sequences of at least three reported flights."
              : RULES[pattern]}{" "}
            <b>{cohort.length} aircraft-days selected.</b>
          </p>
          <Suspense fallback={<p>Departure distribution is loading.</p>}>
            <CohortChart snapshot={snapshot} pattern={pattern} />
          </Suspense>
          <details>
            <summary>Read the distribution counts</summary>
            <ul>
              {[...new Set(snapshot.distribution.map((row) => row.bucket))].map((bucket) => (
                <li key={bucket}>
                  {bucket}:{" "}
                  {snapshot.distribution
                    .filter(
                      (row) =>
                        row.bucket === bucket &&
                        (pattern === "all"
                          ? row.pattern !== "ineligible"
                          : row.pattern === pattern),
                    )
                    .reduce((sum, row) => sum + row.count, 0)}{" "}
                  checked flight rows
                </li>
              ))}
            </ul>
            <p>
              Each flight contributes once. Missing actual times are excluded; other flights on an
              ineligible day can still have valid reported times.
            </p>
          </details>
          <label className="plane-cohort-filter">
            Explore an aircraft-day
            <select
              value={
                cohort.some((row) => row.id === state?.selected.dayId) ? state!.selected.dayId : ""
              }
              onChange={(event) => {
                const next = snapshot.days.find((row) => row.id === event.target.value)
                if (!next) return
                update({
                  ...(state ?? defaultState(snapshot)),
                  selected: {
                    editionId: snapshot.editionId,
                    dayId: next.id,
                    eventId: next.firstEventId,
                  },
                })
              }}
              disabled={busy}
            >
              <option value="">Choose a day to follow</option>
              {cohort.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.date} · {row.tail} · {row.legs} flights · {PATTERNS[row.pattern]}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="plane-section plane-limits">
          <p className="plane-chapter">04 / TIME TO CATCH UP</p>
          <h2>A long layover can absorb a late arrival.</h2>
          <p>
            The recovery flight arrived 154 minutes late. But its schedule allowed 270 minutes on
            the ground before the next departure. The plane actually spent 127 minutes there and
            left just 11 minutes late. Most of the delay had used up time between flights.
          </p>
          <p>
            That timetable explains where the aircraft caught up. For reported causes of delay,
            look at the BTS categories under each flight. Those entries cover individual flights;
            the sequence alone cannot tell us why the first flight was late or what happened
            during a stop.
          </p>
          <p>
            We connect records when the tail number, airports and times agree, stopping at an
            unresolved record or a gap longer than twelve hours. Flights outside this reporting
            extract may be missing from the sequence.
          </p>
          <p>
            A delay belongs to a flight’s schedule, and the next flight has a schedule of its
            own. The time between them can determine whether a late arrival becomes another late
            departure. That is why the aircraft’s earlier journey is worth a look when you are
            waiting at the gate.
          </p>
        </section>

        <section className="plane-section plane-save">
          <p className="plane-chapter">05 / TAKE THE FLIGHT WITH YOU</p>
          <h2 id="plane-save">Save a flight and your notes.</h2>
          <p>
            Pin a flight and add a note. Its link or downloaded packet will reopen the same
            flight and notes in another session. Notes are stored in the link or file, so anyone
            you share it with can read them.
          </p>
          <div className="plane-downloads">
            {state && day && !resolvedIssue && (
              <>
                <a href={`${STORY_PATH}${stateSearch(state)}`}>
                  Open this flight and notes from a link
                </a>
                <button disabled={busy} onClick={() => download("json")}>
                  Download note packet
                </button>
                <button disabled={busy} onClick={() => download("html")}>
                  Download printable day sheet
                </button>
              </>
            )}
            <label className="plane-file">
              Import note packet
              <input
                type="file"
                accept=".json,application/json"
                disabled={busy}
                onChange={(event) => {
                  void importFile(event.target.files?.[0])
                  event.target.value = ""
                }}
              />
            </label>
          </div>
          {state && state.notes.length > activeNotes.length && (
            <details>
              <summary>
                All {state.notes.length} saved reader notes, including other targets
              </summary>
              {state.notes.map((note, index) => (
                <div key={index}>
                  <p>{note.text}</p>
                  <code>
                    {note.target.editionId} / {note.target.dayId} / {note.target.eventId}
                  </code>
                </div>
              ))}
            </details>
          )}
          <p role="status" className="plane-message">
            {message}
          </p>
        </section>
        <footer className="plane-section plane-sources" id="sources">
          <p className="plane-chapter">SOURCE NOTES / SAVED HISTORICAL EDITION</p>
          <h2>The records behind the ribbon.</h2>
          <p>
            {QUALIFICATION} This edition has no recorded successor or correction. Retrieved{" "}
            {snapshot.retrievedAt}; edition <code>{snapshot.editionId}</code>. The source does not
            supply per-row publication or revision timestamps. A saved file cannot update itself.
          </p>
          <p>
            <a href="https://www.transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ">
              BTS field definitions
            </a>{" "}
            ·{" "}
            <a href="https://www.transtats.bts.gov/TableInfo.asp?QO_fu146_anzr=b0-gvzr&gnoyr_VQ=FGJ">
              Reporting-carrier table coverage
            </a>{" "}
            · <a href="https://www.bts.gov/ntl/public-access/faqs">BTS public access guidance</a>
          </p>
          <div className="plane-source-links">
            <a href={`${editionPath}/raw/ha-july-2025.csv`}>All 7,066 HA source records (CSV)</a>
            <a href={`${editionPath}/manifest.json`}>
              Source manifest, exclusions and field dictionary
            </a>
            <a href={`${editionPath}/cohort.csv`}>Aircraft-day comparison table (CSV)</a>
            <a href={`${editionPath}/README.md`}>
              Reproduction and independent-reader instructions
            </a>
            <a href="/stories/plane-day/reading-v2/default.html">Authored printable day sheet</a>
            <a href="/stories/plane-day/reading-v2/default.packet.json">Authored note packet</a>
            <a href="/stories/plane-day/reading-v2/README.md">
              Chart revision and portable adapter instructions
            </a>
          </div>
          <details>
            <summary>Method, acceptance evidence, and how this was made</summary>
            <p>
              Aircraft-day means one tail number and the scheduled origin-local flight date, not
              midnight-to-midnight UTC. July 1 and 31 are boundary context, outside the July 2–30
              comparison. Forty-eight rows in the full month have no tail number. Each composite
              flight ID uses date, reporting carrier, flight number, origin/destination airport IDs,
              and scheduled departure. Duplicate IDs stop the build.
            </p>
            <p>
              Instants use a versioned mapping of 21 airport IDs to IANA zones and timezone database{" "}
              {snapshot.tzdbVersion}. Scheduled departure plus signed delay determines actual
              departure; elapsed durations determine arrivals, which must agree with the reported
              local clocks and arrival delay. Missing, cancelled, diverted and impossible
              connections are visible breaks.
            </p>
            <p>
              The itinerary, charts and downloads use the same prepared flight records. Semiotic
              draws the timelines, routes and comparisons; the example code handles selections
              and saved notes. Open Full Code to see how the pieces fit together.
            </p>
            <p>
              Automated checks compare the nine featured flights with an independent time
              calculation and check saved notes, keyboard controls and layouts at four widths.
            </p>
            <p>
              The source files include the automated checks and a record of the reader,
              accessibility and device testing still to be completed.
            </p>
          </details>
        </footer>
      </article>
    </ExamplePageLayout>
  )
}
