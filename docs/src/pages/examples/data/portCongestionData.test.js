import { describe, expect, it } from "vitest"
import {
  PORT_CORRIDORS,
  PORT_LOCATIONS,
  PORT_MATRIX_FIELDS,
  PORT_MATRIX_ROWS,
  PORT_PROCESS_NODES,
  PORT_SCENARIOS,
  PORT_STAGE_COLOR_MAP,
  baselineFor,
  cumulativeDeviation,
  domainFor,
  eventAnnotationsFor,
  flowsAtTime,
  gateForSelection,
  processEdgesAtTime,
  replayTimeForCursor,
  sankeyEdgesFor,
  scenarioDays,
  transitsAt,
  waterfallSeriesFor,
} from "./portCongestionData"
import { PORTWATCH_WINDOWS } from "./portwatchChokepointDaily"

const DAY = 24 * 60 * 60 * 1000

describe("port congestion scenario data", () => {
  it("has unique identifiers and valid references", () => {
    const locationIds = new Set(PORT_LOCATIONS.map((location) => location.id))
    const nodeIds = new Set(PORT_PROCESS_NODES.map((node) => node.id))

    expect(locationIds.size).toBe(PORT_LOCATIONS.length)
    expect(nodeIds.size).toBe(PORT_PROCESS_NODES.length)
    expect(new Set(PORT_SCENARIOS.map((s) => s.id)).size).toBe(
      PORT_SCENARIOS.length
    )
    expect(new Set(PORT_MATRIX_ROWS.map((row) => row.id)).size).toBe(
      PORT_MATRIX_ROWS.length
    )

    for (const corridor of PORT_CORRIDORS) {
      for (const leg of corridor.legs) {
        expect(locationIds.has(leg.source)).toBe(true)
        expect(locationIds.has(leg.target)).toBe(true)
        expect(PORTWATCH_WINDOWS.steady.series[leg.gate]).toBeDefined()
      }
      // Legs chain head-to-tail so the corridor draws as one route.
      for (let index = 1; index < corridor.legs.length; index += 1) {
        expect(corridor.legs[index].source).toBe(
          corridor.legs[index - 1].target
        )
      }
    }

    for (const node of PORT_PROCESS_NODES) {
      expect(PORT_STAGE_COLOR_MAP[node.category]).toBeDefined()
    }
  })

  it("bakes complete day-aligned PortWatch series for every scenario", () => {
    for (const scenario of PORT_SCENARIOS) {
      const window = PORTWATCH_WINDOWS[scenario.id]
      expect(window).toBeDefined()
      const totalDays = window.lead + window.days
      for (const series of Object.values(window.series)) {
        expect(series.transits).toHaveLength(totalDays)
        expect(series.transits.every((v) => Number.isFinite(v) && v >= 0)).toBe(
          true
        )
      }
      expect(window.series[scenario.focal]).toBeDefined()
      expect(window.series[scenario.counterGate]).toBeDefined()
    }
  })

  it("keeps sankey edges chronological, bucketed, and inside the domain", () => {
    for (const scenario of PORT_SCENARIOS) {
      const [domainStart, domainEnd] = domainFor(scenario.id)
      const edges = sankeyEdgesFor(scenario.id)
      expect(new Set(edges.map((edge) => edge.id)).size).toBe(edges.length)

      const nodeIds = new Set(PORT_PROCESS_NODES.map((node) => node.id))
      let coveredDays = 0
      for (const edge of edges) {
        expect(nodeIds.has(edge.source)).toBe(true)
        expect(nodeIds.has(edge.target)).toBe(true)
        expect(edge.endTime).toBeGreaterThan(edge.startTime)
        expect(edge.startTime).toBeGreaterThanOrEqual(domainStart)
        expect(edge.endTime).toBeLessThanOrEqual(domainEnd)
        expect(edge.value).toBeGreaterThanOrEqual(0)
      }
      // Four streams cover every replay day between them.
      coveredDays = edges
        .filter((edge) => edge.gate === "suez")
        .reduce((sum, edge) => sum + edge.bucketDays, 0)
      expect(coveredDays).toBe(scenarioDays(scenario.id))

      // Clamping at the replay cursor never produces inverted intervals.
      const midTime = replayTimeForCursor(
        scenario.id,
        Math.floor(scenarioDays(scenario.id) / 2)
      )
      for (const edge of processEdgesAtTime(scenario.id, midTime)) {
        expect(edge.endTime).toBeGreaterThan(edge.startTime)
        expect(edge.endTime).toBeLessThanOrEqual(midTime + DAY)
      }
    }
  })

  it("derives map flows from real trailing transit counts", () => {
    for (const scenario of PORT_SCENARIOS) {
      const endTime = replayTimeForCursor(
        scenario.id,
        scenarioDays(scenario.id)
      )
      const flows = flowsAtTime(scenario.id, endTime)
      expect(new Set(flows.map((flow) => flow.corridorId)).size).toBe(
        PORT_CORRIDORS.length
      )
      expect(
        flows.every(
          (flow) =>
            flow.sourceName && flow.targetName && Number.isFinite(flow.value)
        )
      ).toBe(true)

      // Before the window starts, nothing is drawn.
      expect(flowsAtTime(scenario.id, replayTimeForCursor(scenario.id, 0))).toHaveLength(0)

      // Corridor filtering narrows to that corridor's legs only.
      const suezOnly = flowsAtTime(scenario.id, endTime, "suez")
      expect(suezOnly.every((flow) => flow.corridorId === "suez")).toBe(true)
      expect(suezOnly.length).toBeGreaterThan(0)
    }
  })

  it("builds waterfall series as deviation from each scenario's own pace", () => {
    for (const scenario of PORT_SCENARIOS) {
      const gate = gateForSelection(scenario.id)
      expect(gate).toBe(scenario.focal)
      expect(gateForSelection(scenario.id, "cape")).toBe("capeOfGoodHope")

      const series = waterfallSeriesFor(scenario.id, gate)
      expect(series).toHaveLength(scenarioDays(scenario.id))
      const baseline = baselineFor(scenario.id, gate)
      for (const row of series) {
        expect(row.value).toBeCloseTo(row.actual - baseline, 5)
      }
      for (let index = 1; index < series.length; index += 1) {
        expect(series[index].time).toBeGreaterThan(series[index - 1].time)
      }
    }
  })

  it("gives the matrix one row per real day across all three scenarios", () => {
    const expectedRows = PORT_SCENARIOS.reduce(
      (sum, scenario) => sum + scenarioDays(scenario.id),
      0
    )
    expect(PORT_MATRIX_ROWS).toHaveLength(expectedRows)

    for (const row of PORT_MATRIX_ROWS) {
      for (const field of PORT_MATRIX_FIELDS) {
        expect(Number.isFinite(row[field])).toBe(true)
        expect(row[field]).toBe(transitsAt(row.scenarioId, field, row.dayIndex))
      }
    }

    // Rows are grouped in PORT_SCENARIOS order so colorBy assigns each
    // scenario its canonical color (d3 ordinal domain follows first
    // encounter).
    const firstSeen = []
    const seen = new Set()
    for (const row of PORT_MATRIX_ROWS) {
      if (!seen.has(row.scenario)) {
        seen.add(row.scenario)
        firstSeen.push(row.scenario)
      }
    }
    expect(firstSeen).toEqual(PORT_SCENARIOS.map((s) => s.shortLabel))
  })

  it("shows the real stories: blockage, diversion, and calm", () => {
    // Ever Given: Suez drops under 6 transits/day during the blockage and a
    // backlog convoy of 30+ ships clears the day after refloating.
    const blockageWeek = Array.from({ length: 6 }, (_, i) =>
      transitsAt("everGiven", "suez", 16 + i)
    )
    expect(Math.min(...blockageWeek)).toBeLessThanOrEqual(5)
    const recoveryWeek = Array.from({ length: 7 }, (_, i) =>
      transitsAt("everGiven", "suez", 22 + i)
    )
    expect(Math.max(...recoveryWeek)).toBeGreaterThanOrEqual(30)

    // Red Sea: Bab el-Mandeb collapses while the Cape of Good Hope more than
    // doubles between the first and final two weeks of the window.
    const meanOf = (scenarioId, gate, from, to) => {
      let sum = 0
      for (let day = from; day < to; day += 1) {
        sum += transitsAt(scenarioId, gate, day)
      }
      return sum / (to - from)
    }
    const redSeaDays = scenarioDays("redSea")
    expect(meanOf("redSea", "babElMandeb", redSeaDays - 14, redSeaDays)).toBeLessThan(
      meanOf("redSea", "babElMandeb", 0, 14) / 2
    )
    expect(meanOf("redSea", "capeOfGoodHope", redSeaDays - 14, redSeaDays)).toBeGreaterThan(
      meanOf("redSea", "capeOfGoodHope", 0, 14) * 2
    )

    // Quiet spring: Suez never strays far from its own pace — the cumulative
    // deviation stays an order of magnitude below the Red Sea collapse.
    const steadyDrift = Math.abs(
      cumulativeDeviation("steady", "suez", scenarioDays("steady") - 1)
    )
    const redSeaDrift = Math.abs(
      cumulativeDeviation("redSea", "babElMandeb", redSeaDays - 1)
    )
    expect(steadyDrift).toBeLessThan(redSeaDrift / 5)

    // Real-dated event markers sit inside their scenario's domain.
    for (const scenario of PORT_SCENARIOS) {
      const [start, end] = domainFor(scenario.id)
      for (const annotation of eventAnnotationsFor(scenario.id)) {
        expect(annotation.value).toBeGreaterThanOrEqual(start)
        expect(annotation.value).toBeLessThanOrEqual(end)
      }
    }
  })
})
