import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { prepareChart } from "semiotic/ai"
import { renderChartWithEvidence } from "semiotic/server"
import { auditAccessibility } from "semiotic/utils"
import groceryJSON from "./grocery-receipt/snapshot.json"
import planeJSON from "./plane-day/snapshot.json"
import bootstrap from "./reservoir-guide/bootstrap.json"
import { prepareBasket } from "./grocery-receipt/prepare"
import { defaultState as basketState } from "./grocery-receipt/state"
import { trajectoryChartProps, trajectoryData } from "./grocery-receipt/chart-config"
import { buildReceiptPacket } from "./grocery-receipt/packet"
import { importReceiptPacket } from "./grocery-receipt/import"
import { renderBasketHTML } from "./grocery-receipt/export-runtime"
import { defaultState as planeState, readStateSearch, stateSearch } from "./plane-day/state"
import { ribbonProps } from "./plane-day/layouts"
import { timeSpaceProps } from "./plane-day/time-space"
import { renderFlightHTML } from "./plane-day/export-runtime"
import { defaultState as guideState } from "./reservoir-guide/state"
import { prepareGuide } from "./reservoir-guide/prepare"
import { distributionChartProps } from "./reservoir-guide/chart-config"
import { exportSelection } from "./reservoir-guide/export-runtime"
import type { GrocerySnapshot } from "./grocery-receipt/types"
import type { PlaneSnapshot } from "./plane-day/types"
import type { ReservoirSnapshot } from "./reservoir-guide/types"

const grocery = groceryJSON as GrocerySnapshot
const plane = planeJSON as PlaneSnapshot
const reservoir: ReservoirSnapshot = JSON.parse(
  readFileSync(`docs/public${bootstrap.snapshotURL}`, "utf8"),
)

function prove(component: string, props: Record<string, unknown>) {
  const prepared = prepareChart({ component, props }, { render: renderChartWithEvidence })
  expect(prepared.reasons).toEqual([])
  expect(prepared.ok).toBe(true)
  const result = renderChartWithEvidence(component, props)
  expect(result.evidence.markCount).toBeGreaterThan(0)
  expect(result.svg).not.toMatch(/(?:NaN|Infinity)/)
  expect(
    auditAccessibility(component, props).findings.filter((f) => f.critical && f.status === "fail"),
  ).toEqual([])
  return result
}

describe("Three stories: useful unfamiliar charts and portable meaning", () => {
  it("connects grocery months in time order, stops at missing pairs, and updates with quantities", () => {
    const receipt = prepareBasket(grocery, basketState(grocery))
    const props = trajectoryChartProps(receipt)
    prove("ConnectedScatterplot", props)
    expect(props.data.at(-1)?.month).toBe(receipt.state.after)
    expect(props.data[0].month).toBe("2021-06")
    expect(
      props.data.every((p, i, rows) => i === 0 || p.monthIndex === rows[i - 1].monthIndex + 1),
    ).toBe(true)
    const modified = structuredClone(receipt)
    modified.history.find((r) => r.month === "2025-04")!.costUSD = null
    expect(trajectoryData(modified).map((p) => p.month)).toEqual(["2025-05", "2025-06"])
    modified.history.find((r) => r.month === "2025-06")!.yearChangePct = null
    expect(trajectoryData(modified)).toEqual([])
    const state = basketState(grocery)
    state.quantities.find((q) => q.itemId === "eggs")!.quantity = 4
    const changed = trajectoryChartProps(prepareBasket(grocery, state))
    expect(changed.data.at(-1)?.costUSD).not.toBe(props.data.at(-1)?.costUSD)
    expect(renderChartWithEvidence("ConnectedScatterplot", changed).evidence.sceneHash).not.toBe(
      renderChartWithEvidence("ConnectedScatterplot", props).evidence.sceneHash,
    )
  })

  it("restores the exact basket from a checked packet and rejects altered or foreign evidence", () => {
    const packet = buildReceiptPacket(grocery, basketState(grocery))
    expect(importReceiptPacket(JSON.stringify(packet), grocery).state).toEqual(packet.state)
    const changed = structuredClone(packet)
    changed.history[0].costUSD = 999
    expect(() => importReceiptPacket(JSON.stringify(changed), grocery)).toThrow(/differ/)
    changed.sourceFingerprint = "another-edition"
    expect(() => importReceiptPacket(JSON.stringify(changed), grocery)).toThrow(/unavailable/)
  })

  it("draws hatched schedules and solid actual paths in both flight charts and preserves flight identity", () => {
    const state = planeState(plane)
    const day = plane.cases.find((d) => d.id === state.selected.dayId)!
    expect(readStateSearch(stateSearch(state), plane)).toEqual(state)
    for (const props of [
      ribbonProps(day, state.selected.eventId),
      timeSpaceProps(day, state.selected.eventId),
    ]) {
      // Custom layouts have executable callbacks; prove their actual renderer and accessibility directly.
      const rendered = renderChartWithEvidence("XYCustomChart", props)
      expect(rendered.evidence.markCount).toBeGreaterThanOrEqual(day.flights.length * 2)
      expect(rendered.svg).toContain("<pattern")
      expect(rendered.svg).toContain('fill="#287a79"')
      expect(rendered.svg).not.toMatch(/(?:NaN|Infinity)/)
      expect(
        auditAccessibility("XYCustomChart", props).findings.filter(
          (f) => f.critical && f.status === "fail",
        ),
      ).toEqual([])
    }
    const props = timeSpaceProps(day, state.selected.eventId)
    const separated = structuredClone(day)
    separated.breaks.push({ before: day.flights[1].id, reason: "Synthetic continuity break" })
    expect(
      renderChartWithEvidence("XYCustomChart", timeSpaceProps(separated, state.selected.eventId))
        .evidence.markCount,
    ).toBe(renderChartWithEvidence("XYCustomChart", props).evidence.markCount - 2)
  })

  it("uses only eligible historical readings as swarm dots, with reference lines outside the population", () => {
    for (const changes of [
      {},
      { stationId: "DNP" },
      { monthDay: "02-29", waterYear: 2024 },
      { stationId: "ORO" },
    ]) {
      const guide = prepareGuide(reservoir, { ...guideState(reservoir), ...changes })
      const props = distributionChartProps(guide)
      expect(props.data.map((p) => p.rowId)).toEqual(guide.baseline.samples.map((p) => p.rowId))
      expect(props.data).toHaveLength(guide.baseline.count)
      if (props.data.length) {
        const rendered = prove("SwarmPlot", props)
        expect(rendered.evidence.markCount).toBe(guide.baseline.count)
      } else expect(guide.baseline.percentile).toBeNull()
    }
  })

  it("includes the new charts in self-contained downloads with the same data and qualifications", () => {
    const basketHTML = renderBasketHTML(prepareBasket(grocery, basketState(grocery)), grocery)
    expect(basketHTML).toContain("Higher cost, slower change")
    expect(basketHTML).toContain("Saved monthly basket history")
    const state = planeState(plane)
    const day = plane.cases.find((d) => d.id === state.selected.dayId)!
    const planeHTML = renderFlightHTML(plane, day, state)
    expect(planeHTML).toContain("<pattern")
    expect(planeHTML).toContain(`data-event-id="${state.selected.eventId}" data-selected="true"`)
    const saved = exportSelection(reservoir, guideState(reservoir))
    expect(saved.html).toContain("Where this reading sits")
    expect(saved.packet.guide.baseline.samples).toHaveLength(30)
    for (const html of [basketHTML, planeHTML, saved.html])
      expect(html).not.toMatch(/<(?:script|link|img)\b/i)
  })
})
