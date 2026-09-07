import { renderChartWithEvidence } from "semiotic/server"
import { renderDayHTML } from "./exports"
import { ribbonProps } from "./layouts"
import { timeSpaceProps } from "./time-space"
import type { AircraftDay, PlaneSnapshot, PlaneState } from "./types"

export function renderFlightHTML(snapshot: PlaneSnapshot, day: AircraftDay, state: PlaneState) {
  const timeSpace = renderChartWithEvidence("XYCustomChart", {
    ...timeSpaceProps(day, state.selected.eventId),
    _idPrefix: "flight-path",
  })
  const ribbon = renderChartWithEvidence("XYCustomChart", {
    ...ribbonProps(day, state.selected.eventId),
    _idPrefix: "flight-ribbon",
  })
  return renderDayHTML(
    snapshot,
    day,
    state,
    `<style>svg{width:100%;height:auto}</style>
    <h2>An aircraft through time and airports</h2>${timeSpace.svg}
    <p>Read left to right in UTC. Hatched bands show scheduled intervals; solid bands show actual intervals. Horizontal stretches show ground intervals only where continuity is checked. Airport spacing does not encode distance or speed. The pinned flight is outlined.</p>
    <h2>Scheduled and actual flight intervals</h2>${ribbon.svg}
    <p>Scheduled intervals are hatched; actual intervals are solid. Both charts use UTC; the table retains your chosen clock labels. A shared tail number does not establish the cause of a delay.</p>`,
  )
}
