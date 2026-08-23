import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import {
  BAR_CHART_ACCESS_CONTRACT,
  LINE_CHART_ACCESS_CONTRACT,
  REALTIME_LINE_CHART_ACCESS_CONTRACT,
} from "./chartAccessContractFixtures"
import {
  CHART_ACCESS_CONTRACT_VERSION,
  createChartAccessContract,
} from "./chartAccessContract"

const lineData = [
  { date: "2026-01-01", value: 12 },
  { date: "2026-02-01", value: 18 },
]

describe("ChartAccessContract@1", () => {
  it("reports authored and generated access surfaces for LineChart", () => {
    expect(LINE_CHART_ACCESS_CONTRACT.schemaVersion).toBe(
      CHART_ACCESS_CONTRACT_VERSION
    )
    expect(LINE_CHART_ACCESS_CONTRACT.text.title).toBe(
      "Weekly active users"
    )
    expect(LINE_CHART_ACCESS_CONTRACT.text.accessibleTable).toBe(true)
    expect(LINE_CHART_ACCESS_CONTRACT.navigation.supported).toBe(true)
    expect(LINE_CHART_ACCESS_CONTRACT.navigation.tree?.role).toBe("chart")
    expect(LINE_CHART_ACCESS_CONTRACT.mediaPreferences.reducedMotion).toBe(
      "built-in"
    )
    expect(LINE_CHART_ACCESS_CONTRACT.ssr.supported).toBe(true)
    expect(LINE_CHART_ACCESS_CONTRACT.streamStatus.supported).toBe(false)
  })

  it("does not claim table support for BigNumber", () => {
    const contract = createChartAccessContract({
      component: "BigNumber",
      props: { value: 42 },
    })

    expect(contract.text.accessibleTable).toBe(false)
    expect(contract.table.enabled).toBe(false)
  })

  it("preserves category/value semantics for BarChart navigation", () => {
    const labels = JSON.stringify(BAR_CHART_ACCESS_CONTRACT.navigation.tree)
    expect(BAR_CHART_ACCESS_CONTRACT.component).toBe("BarChart")
    expect(BAR_CHART_ACCESS_CONTRACT.table.enabled).toBe(true)
    expect(labels).toContain("North")
    expect(BAR_CHART_ACCESS_CONTRACT.evidence.audit.ok).toBe(true)
  })

  it("distinguishes live status from static SSR for RealtimeLineChart", () => {
    expect(REALTIME_LINE_CHART_ACCESS_CONTRACT.streamStatus.supported).toBe(true)
    expect(REALTIME_LINE_CHART_ACCESS_CONTRACT.streamStatus.status).toBe("stale")
    expect(REALTIME_LINE_CHART_ACCESS_CONTRACT.streamStatus.history).toHaveLength(5)
    expect(
      REALTIME_LINE_CHART_ACCESS_CONTRACT.streamStatus.accessibleDescription
    ).toBe(
      "Last 5 stream statuses: no data received, then receiving data, then receiving data, then receiving data, then not receiving new data."
    )
    expect(REALTIME_LINE_CHART_ACCESS_CONTRACT.ssr.supported).toBe(false)
  })

  it("bounds realtime status history at five records by default", () => {
    const history = Array.from({ length: 8 }, (_, index) => ({
      status: index < 7 ? ("active" as const) : ("stale" as const),
      lastPushTime: index,
    }))
    const contract = createChartAccessContract({
      component: "RealtimeLineChart",
      props: {},
      options: { realtime: true, streamStatus: history },
    })

    expect(contract.streamStatus.history).toHaveLength(5)
    expect(contract.streamStatus.history?.[0]).toEqual({
      status: "active",
      lastPushTime: 3,
    })
    expect(contract.navigation.composition).toBe("chart-container")
  })

  it("attaches non-empty SSR evidence when supplied", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      data: lineData,
      xAccessor: "date",
      yAccessor: "value",
      title: "Weekly active users",
      width: 320,
      height: 180,
    })
    const contract = createChartAccessContract({
      component: "LineChart",
      props: {
        data: lineData,
        xAccessor: "date",
        yAccessor: "value",
        title: "Weekly active users",
      },
      options: { ssrEvidence: evidence },
    })

    expect(contract.ssr.evidence?.status).toBe("ok")
    expect(contract.ssr.evidence?.markCount).toBeGreaterThan(0)
  })

  it("lets a caller disable the table and reflect that honestly", () => {
    const contract = createChartAccessContract({
      component: "LineChart",
      props: {
        data: lineData,
        xAccessor: "date",
        yAccessor: "value",
        accessibleTable: false,
      },
    })

    expect(contract.text.accessibleTable).toBe(false)
    expect(contract.table.enabled).toBe(false)
  })
})
