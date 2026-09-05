import React from "react"
import { describe, expect, it, vi } from "vitest"
import { renderToString } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { render, screen, fireEvent } from "@testing-library/react"
import { renderChartWithEvidence } from "semiotic/server"
import { auditAccessibility } from "semiotic/utils"
import { fingerprintValue } from "semiotic/artifact"
import PlaneDayExamplePage from "../PlaneDayExamplePage"
import rawSnapshot from "./snapshot.json"
import { clockMinutes, localInstant } from "./time"
import { connectionIssue, prepareDays, prepareFlight } from "./prepare"
import { buildNotePacket, dayValues, importNotePacket, verifyDay } from "./packet"
import { defaultState, eventReference, readStateSearch, stateSearch, validateState } from "./state"
import { daySummary, legObservation, reportedCauses, timeLabel } from "./format"
import { delayProps } from "./chart-config"
import { networkProps, ribbonProps } from "./layouts"
import { renderDayHTML } from "./exports"
import type { Airport, PlaneSnapshot, RawFlight } from "./types"

vi.mock("../ExamplePageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}))
vi.mock("./PlaneCharts", () => ({
  FlightCharts: () => <div>Charts</div>,
  CohortChart: () => <div>Distribution</div>,
}))
const snapshot = rawSnapshot as PlaneSnapshot
const initial = defaultState(snapshot)
const day = snapshot.cases.find((day) => day.id === initial.selected.dayId)!
const zones: Airport[] = [
  { id: "1", code: "JFK", city: "New York", zone: "America/New_York" },
  { id: "2", code: "LAX", city: "Los Angeles", zone: "America/Los_Angeles" },
]
const overnight: RawFlight = {
  FlightDate: "2025-07-10",
  Reporting_Airline: "HA",
  Flight_Number_Reporting_Airline: "100",
  Tail_Number: "TEST",
  OriginAirportID: "1",
  Origin: "JFK",
  DestAirportID: "2",
  Dest: "LAX",
  CRSDepTime: "2330",
  CRSArrTime: "0230",
  DepTime: "0100",
  ArrTime: "0330",
  DepDelay: "90",
  ArrDelay: "60",
  CRSElapsedTime: "360",
  ActualElapsedTime: "330",
  Cancelled: "0",
  Diverted: "0",
}

describe("E02 independent time and continuity fixtures (synthetic tests only)", () => {
  it("resolves local clocks, 2400, midnight and an overnight flight using independent expected instants", () => {
    expect(clockMinutes("2400")).toBe(1440)
    expect(localInstant("2025-07-10", "2400", "America/New_York")).toBe(
      Date.parse("2025-07-11T04:00:00Z"),
    )
    const flight = prepareFlight(overnight, zones)
    expect(flight.issues).toEqual([])
    expect(flight.scheduledDeparture).toBe(Date.parse("2025-07-11T03:30:00Z"))
    expect(flight.actualDeparture).toBe(Date.parse("2025-07-11T05:00:00Z"))
    expect(flight.scheduledArrival).toBe(Date.parse("2025-07-11T09:30:00Z"))
    expect(flight.actualArrival).toBe(Date.parse("2025-07-11T10:30:00Z"))
  })
  it("refuses DST overlap, DST gap, malformed dates and malformed clocks", () => {
    expect(() => localInstant("2025-11-02", "0130", "America/New_York")).toThrow("Ambiguous")
    expect(() => localInstant("2025-03-09", "0230", "America/New_York")).toThrow("Nonexistent")
    expect(() => localInstant("2025-02-30", "1000", "UTC")).toThrow("date")
    for (const clock of ["2360", "2401", "-100", "", "12:00"])
      expect(() => clockMinutes(clock)).toThrow()
  })
  it.each([
    ["Cancelled", "1", "Cancelled"],
    ["Diverted", "1", "Diverted"],
    ["Tail_Number", "", "tail"],
    ["ArrDelay", "59", "Arrival delay"],
    ["CRSArrTime", "0231", "Scheduled arrival"],
    ["DepTime", "0101", "Actual departure"],
    ["ArrTime", "0331", "Actual arrival"],
    ["DepDelay", "", "Missing"],
    ["OriginAirportID", "999", "airport"],
  ])("preserves a visible issue for %s=%s", (field, value, issue) => {
    expect(prepareFlight({ ...overnight, [field]: value }, zones).issues.join(" ")).toContain(issue)
  })
  it("rejects collisions and marks airport mismatches, tail changes and overlapping flights", () => {
    expect(() => prepareDays([overnight, { ...overnight }], zones)).toThrow(
      "Duplicate flight identity",
    )
    const a = prepareFlight(overnight, zones)
    expect(connectionIssue(a, { ...a, raw: { ...a.raw, Tail_Number: "SWAPPED" } })).toContain(
      "Tail",
    )
    expect(connectionIssue(a, a)).toContain("Airport continuity")
    expect(connectionIssue(a, { ...a, raw: { ...a.raw, OriginAirportID: "2" } })).toContain(
      "overlap",
    )
  })
  it("retains negative delays and does not mutate or depend on source row order", () => {
    const rows = snapshot.cases[0].flights.map((flight) => Object.freeze({ ...flight.raw }))
    const before = JSON.stringify(rows)
    const forward = prepareDays(Object.freeze(rows) as unknown as RawFlight[], snapshot.airports)
    const reverse = prepareDays([...rows].reverse(), snapshot.airports)
    expect(forward).toEqual(reverse)
    expect(JSON.stringify(rows)).toBe(before)
    expect(forward[0].flights[0].raw.DepDelay).toBe("-4.00")
  })
})

describe("E02 source-backed calculations and portable notes", () => {
  it("matches independently calculated recovery values and next-day arrivals", () => {
    const values = dayValues(day)
    expect(values.map((row) => row.departureDeviationMinutes)).toEqual([150, 11, 12])
    expect(values.map((row) => row.changeFromPrecedingDepartureMinutes)).toEqual([null, -139, 1])
    expect((day.flights[1].scheduledDeparture! - day.flights[0].scheduledArrival!) / 60_000).toBe(
      270,
    )
    expect((day.flights[1].actualDeparture! - day.flights[0].actualArrival!) / 60_000).toBe(127)
    expect(new Date(day.flights[2].actualArrival!).toISOString()).toBe("2025-07-11T15:38:00.000Z")
    expect(timeLabel(day.flights[2], "actualArrival", snapshot, "utc")).toBe("07-11 15:38 UTC")
    expect(timeLabel(day.flights[2], "actualArrival", snapshot, "local")).toContain("Jul 11")
  })
  it("keeps coverage counts honest and eligibility denominators explicit", () => {
    expect(snapshot.counts).toMatchObject({
      carrierRows: 7066,
      missingTailRows: 48,
      windowRows: 6609,
      aircraftDays: 1627,
      eligibleDays: 660,
      near: 334,
      recovered: 11,
      persisted: 24,
      other: 291,
      ineligible: 967,
    })
    expect(snapshot.days.filter((d) => d.pattern !== "ineligible")).toHaveLength(660)
    expect(
      snapshot.counts.shortDays + snapshot.counts.brokenDays - snapshot.counts.ineligible,
    ).toBe(22)
  })
  it("removing cause fields removes the attribution and does not replace it with an inferred cause", () => {
    expect(reportedCauses(day.flights[0])).toContain("CarrierDelay")
    const flight = { ...day.flights[0], raw: { ...day.flights[0].raw } }
    for (const field of [
      "CarrierDelay",
      "WeatherDelay",
      "NASDelay",
      "SecurityDelay",
      "LateAircraftDelay",
    ])
      delete flight.raw[field]
    expect(reportedCauses(flight)).toContain("No delay-cause values")
    expect(reportedCauses(flight)).not.toContain("CarrierDelay")
    expect(legObservation(day, day.flights[1])).toContain("not causes")
  })
  it("round trips a selected event and an escaped reader note across URLs and packets", () => {
    const state = {
      ...initial,
      notes: [
        {
          target: initial.selected,
          text: '<img src=x onerror="alert(1)">',
          authoredBy: "reader" as const,
          status: "unreviewed" as const,
          createdAt: snapshot.retrievedAt,
        },
      ],
    }
    expect(readStateSearch(stateSearch(state), snapshot)).toEqual(state)
    const packet = buildNotePacket(snapshot, day, state)
    expect(importNotePacket(JSON.parse(JSON.stringify(packet)), snapshot).state).toEqual(state)
    expect(packet.checks.every((check) => check.status === "pass")).toBe(true)
    const html = renderDayHTML(snapshot, day, state)
    expect(html).toContain("&lt;img")
    expect(html).not.toContain("<img src=x")
    expect(html).toContain(`data-event-id="${initial.selected.eventId}" data-selected="true"`)
    expect(packet.artifact.contract.accountability?.reviews?.[0]?.status).toBe("pending")
  })
  it("preserves unavailable selections and rejects future versions, identity drift, forged authorship and tampered claims", () => {
    const packet = buildNotePacket(snapshot, day, initial)
    const unavailable = structuredClone(packet)
    unavailable.state.selected.editionId = "unavailable-edition"
    const result = importNotePacket(unavailable, snapshot)
    expect(result.issue).toContain("unavailable")
    expect(result.state.selected.editionId).toBe("unavailable-edition")
    expect(result.day).toBeNull()
    const unknownEvent = structuredClone(packet)
    unknownEvent.state.selected.eventId = "no-such-flight"
    expect(importNotePacket(unknownEvent, snapshot)).toMatchObject({
      day: null,
      state: { selected: { eventId: "no-such-flight" } },
      issue: "The saved flight is missing or ambiguous in this aircraft-day.",
    })
    expect(() => validateState({ ...initial, version: 2 })).toThrow("Unsupported")
    expect(() =>
      validateState({
        ...initial,
        notes: [
          {
            target: initial.selected,
            text: "Editorial claim",
            authoredBy: "editor",
            status: "approved",
            createdAt: snapshot.retrievedAt,
          },
        ],
      }),
    ).toThrow("authorship")
    const altered = structuredClone(day)
    altered.flights[0].raw.DepDelay = "1"
    expect(() => verifyDay(snapshot, altered)).toThrow("differ")
    const tampered = structuredClone(packet)
    tampered.checks[0].unit = "hours"
    expect(() => importNotePacket(tampered, snapshot)).toThrow("differs")
    const forged = structuredClone(packet)
    forged.summary = "Weather caused all delays"
    expect(() => importNotePacket(forged, snapshot)).toThrow("differs")
  })
})

describe("E02 renderer, table and packet parity", () => {
  const states = snapshot.cases.map((day) => ({
    day,
    state: { ...initial, selected: eventReference(snapshot, day, day.flights[0].id) },
  }))
  states.push({ day, state: { ...initial, timeBasis: "utc", view: "network" } })
  it.each(states)(
    "preserves canonical values for $day.pattern in $state.timeBasis",
    ({ day, state }) => {
      const packet = buildNotePacket(snapshot, day, state)
      const props = delayProps(day)
      const result = renderChartWithEvidence("LineChart", props)
      expect(result.svg).toContain("How the departure deviation changed")
      expect(packet.values.map((row) => row.departureDeviationMinutes)).toEqual(
        props.data.map((row) => row.delay),
      )
      expect(result.evidence.sceneHash).toBeTruthy()
      expect(renderDayHTML(snapshot, day, state)).toContain(daySummary(day))
      expect(
        auditAccessibility("LineChart", props).findings.filter(
          (finding) => finding.critical && finding.status === "fail",
        ),
      ).toEqual([])
    },
  )
  it("renders custom timeline and network marks and detects changed geometry at equal mark counts", () => {
    for (const [component, props] of [
      ["XYCustomChart", ribbonProps(day, initial.selected.eventId)],
      ["NetworkCustomChart", networkProps(day, initial.selected.eventId)],
    ] as const) {
      const first = renderChartWithEvidence(component, props)
      const wider = renderChartWithEvidence(component, { ...props, width: props.width + 200 })
      expect(first.svg).toContain("<svg")
      expect(first.evidence.markCount).toBeGreaterThan(0)
      expect(wider.evidence.markCount).toBe(first.evidence.markCount)
      expect(
        auditAccessibility(component, props).findings.filter(
          (finding) => finding.critical && finding.status === "fail",
        ),
      ).toEqual([])
      expect(first.evidence.sceneHash).not.toBe(wider.evidence.sceneHash)
    }
    const props = delayProps(day)
    const first = renderChartWithEvidence("LineChart", props)
    const reversed = renderChartWithEvidence("LineChart", {
      ...props,
      data: props.data.map((row, i) => ({
        ...row,
        delay: props.data[props.data.length - 1 - i].delay,
      })),
    })
    expect(first.evidence.sceneHash).not.toBe(reversed.evidence.sceneHash)
  })
  it("detects a reordered edition extract instead of moving a note by array position", () => {
    const reordered = { ...day, flights: [...day.flights].reverse() }
    expect(() => verifyDay(snapshot, reordered)).toThrow("differ")
    expect(
      reordered.flights.find((flight) => flight.id === initial.selected.eventId)?.raw
        .Flight_Number_Reporting_Airline,
    ).toBe("465")
    expect(fingerprintValue(day).fingerprint).not.toBe(fingerprintValue(reordered).fingerprint)
  })
})

describe("E02 ordinary reading experience", () => {
  it("renders the opening and itinerary without JavaScript", () => {
    const html = renderToString(
      <MemoryRouter>
        <PlaneDayExamplePage />
      </MemoryRouter>,
    )
    expect(html).toContain("Your plane")
    expect(html).toContain("Scheduled departure")
    expect(html).toContain("150")
    expect(html).toContain("270-minute gap")
    expect(html).toContain("Aircraft itinerary")
  })
  it("keeps native flight selection when the reader changes layout or clocks", () => {
    render(
      <MemoryRouter>
        <PlaneDayExamplePage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Pin HA 466 · PPG → HNL" }))
    fireEvent.change(screen.getByLabelText("View", { exact: true }), {
      target: { value: "network" },
    })
    fireEvent.change(screen.getByLabelText("Clock labels"), { target: { value: "utc" } })
    expect(screen.getByTestId("pinned-flight").getAttribute("data-event-id")).toBe(
      day.flights[2].id,
    )
    fireEvent.change(screen.getByLabelText("Your local note about this flight"), {
      target: { value: "This arrives on the following day." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Attach note to this flight" }))
    expect(screen.getByText("This arrives on the following day.")).toBeTruthy()
    expect(
      screen
        .getByRole("link", { name: "Open this flight and notes from a link" })
        .getAttribute("href"),
    ).toContain(encodeURIComponent(day.flights[2].id))
  })
})
