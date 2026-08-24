import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import {
  BAR_CHART_ACCESS_CONTRACT,
  LINE_CHART_ACCESS_CONTRACT,
  REALTIME_LINE_CHART_ACCESS_CONTRACT
} from "./chartAccessContractFixtures"
import {
  CHART_ACCESS_CONTRACT_VERSION,
  createChartAccessContract
} from "./chartAccessContract"

const lineData = [
  { date: "2026-01-01", value: 12 },
  { date: "2026-02-01", value: 18 }
]

describe("ChartAccessContract@1", () => {
  it("reports authored and generated access surfaces for LineChart", () => {
    expect(LINE_CHART_ACCESS_CONTRACT.schemaVersion).toBe(
      CHART_ACCESS_CONTRACT_VERSION
    )
    expect(LINE_CHART_ACCESS_CONTRACT.text.title).toBe("Weekly active users")
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
      props: { value: 42 }
    })

    expect(contract.text.accessibleTable).toBe(false)
    expect(contract.table.enabled).toBe(false)
    expect(contract.keyboard.markNavigation).toBe("not-applicable")
    expect(contract.keyboard.focusRing).toBe("not-applicable")
    expect(contract.keyboard.legendInteraction).toBe("not-applicable")
  })

  it("preserves category/value semantics for BarChart navigation", () => {
    const labels = JSON.stringify(BAR_CHART_ACCESS_CONTRACT.navigation.tree)
    expect(BAR_CHART_ACCESS_CONTRACT.component).toBe("BarChart")
    expect(BAR_CHART_ACCESS_CONTRACT.table.enabled).toBe(true)
    expect(labels).toContain("North")
    expect(BAR_CHART_ACCESS_CONTRACT.evidence.audit.ok).toBe(true)
  })

  it("distinguishes live status from static SSR for RealtimeLineChart", () => {
    expect(REALTIME_LINE_CHART_ACCESS_CONTRACT.streamStatus.supported).toBe(
      true
    )
    expect(REALTIME_LINE_CHART_ACCESS_CONTRACT.streamStatus.status).toBe(
      "stale"
    )
    expect(
      REALTIME_LINE_CHART_ACCESS_CONTRACT.streamStatus.history
    ).toHaveLength(5)
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
      lastPushTime: index
    }))
    const contract = createChartAccessContract({
      component: "RealtimeLineChart",
      props: {},
      options: { realtime: true, streamStatus: history }
    })

    expect(contract.streamStatus.history).toHaveLength(5)
    expect(contract.streamStatus.history?.[0]).toEqual({
      status: "active",
      lastPushTime: 3
    })
    expect(contract.navigation.composition).toBe("chart-container")
  })

  it.each([
    "RealtimeLineChart",
    "RealtimeHistogram",
    "RealtimeSwarmChart",
    "RealtimeWaterfallChart",
    "RealtimeHeatmap"
  ])("derives live-stream and SSR state for %s", (component) => {
    const contract = createChartAccessContract({ component, props: {} })

    expect(contract.streamStatus.supported).toBe(true)
    expect(contract.ssr.supported).toBe(false)
  })

  it("does not confuse the static TemporalHistogram with a live push chart", () => {
    const contract = createChartAccessContract({
      component: "TemporalHistogram",
      props: {}
    })

    expect(contract.streamStatus.supported).toBe(false)
    expect(contract.ssr.supported).toBe(true)
  })

  it("does not advertise datum navigation where no navigation builder exists", () => {
    for (const component of [
      "GaugeChart",
      "RealtimeLineChart",
      "PhysicsCustomChart"
    ]) {
      const contract = createChartAccessContract({ component, props: {} })
      expect(contract.navigation.supported).toBe(false)
      expect(contract.keyboard.markNavigation).toBe("unsupported")
      expect(contract.keyboard.focusRing).toBe("unsupported")
    }
  })

  it.each(["ParallelCoordinatesRecipe", "CalendarHeatmapRecipe"])(
    "registers built-in recipe access and SSR support for %s",
    (component) => {
      const { evidence } = renderChartWithEvidence(component, {
        data:
          component === "ParallelCoordinatesRecipe"
            ? [
                { id: "a", first: 1, second: 2 },
                { id: "b", first: 2, second: 1 }
              ]
            : [
                { date: "2026-01-01", value: 1 },
                { date: "2026-01-02", value: 2 }
              ],
        layoutConfig:
          component === "ParallelCoordinatesRecipe"
            ? { fields: ["first", "second"] }
            : { dateAccessor: "date", valueAccessor: "value", year: 2026 }
      })
      const contract = createChartAccessContract({
        component,
        props: {},
        options: { ssrEvidence: evidence }
      })

      expect(contract.ssr.supported).toBe(true)
      expect(contract.ssr.evidence?.markCount).toBeGreaterThan(0)
      expect(contract.navigation.supported).toBe(true)
      expect(contract.keyboard.markNavigation).toBe("built-in")
    }
  )

  it.each(["MinimapChart", "ScatterplotMatrix", "ChainReactionChart"])(
    "reports the registered composite server implementation for %s",
    (component) => {
      const contract = createChartAccessContract({ component, props: {} })

      expect(contract.ssr.supported).toBe(true)
    }
  )

  it("distinguishes composite mark navigation from a built-in outer surface", () => {
    for (const component of ["MinimapChart", "ScatterplotMatrix"]) {
      const contract = createChartAccessContract({ component, props: {} })
      expect(contract.keyboard.markNavigation).toBe("delegated")
      expect(contract.keyboard.focusRing).toBe("delegated")
    }
  })

  it("builds registered hierarchy and geo navigation without a parallel name list", () => {
    const hierarchy = createChartAccessContract({
      component: "TreeDiagram",
      props: {
        data: {
          name: "root",
          children: [{ name: "child", value: 2 }]
        }
      },
      options: { navigable: true }
    })
    const geo = createChartAccessContract({
      component: "ChoroplethMap",
      props: {
        areas: [
          {
            type: "Feature",
            properties: { name: "North", value: 3 },
            geometry: null
          }
        ],
        valueAccessor: "value"
      },
      options: { navigable: true }
    })

    expect(hierarchy.navigation.supported).toBe(true)
    expect(hierarchy.keyboard.markNavigation).toBe("built-in")
    expect(hierarchy.navigation.tree?.children?.[0].label).toContain(
      "1 direct child"
    )
    expect(geo.navigation.supported).toBe(true)
    expect(geo.keyboard.markNavigation).toBe("built-in")
    expect(geo.navigation.tree?.label).toContain("range 3 to 3")
    expect(geo.navigation.tree?.children?.[0].children?.[0].label).toBe(
      "North: 3."
    )
  })

  it("only claims interactive legend keyboard behavior when it is enabled", () => {
    const passive = createChartAccessContract({
      component: "LineChart",
      props: { showLegend: true, lineBy: "series" }
    })
    const interactive = createChartAccessContract({
      component: "LineChart",
      props: {
        showLegend: true,
        lineBy: "series",
        legendInteraction: "isolate"
      }
    })

    expect(passive.keyboard.legendInteraction).toBe("not-enabled")
    expect(interactive.keyboard.legendInteraction).toBe("built-in")
  })

  it("fails closed for components absent from the generated capability map", () => {
    const contract = createChartAccessContract({
      component: "ThirdPartyChart",
      props: { accessibleTable: true, showLegend: true },
      options: { navigable: true }
    })

    expect(contract.table.enabled).toBe(false)
    expect(contract.keyboard.markNavigation).toBe("unsupported")
    expect(contract.keyboard.legendInteraction).toBe("unsupported")
    expect(contract.mediaPreferences.reducedMotion).toBe("unknown")
    expect(contract.navigation.supported).toBe(false)
    expect(contract.ssr.supported).toBe(false)
  })

  it("attaches non-empty SSR evidence when supplied", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      data: lineData,
      xAccessor: "date",
      yAccessor: "value",
      title: "Weekly active users",
      width: 320,
      height: 180
    })
    const contract = createChartAccessContract({
      component: "LineChart",
      props: {
        data: lineData,
        xAccessor: "date",
        yAccessor: "value",
        title: "Weekly active users"
      },
      options: { ssrEvidence: evidence }
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
        accessibleTable: false
      }
    })

    expect(contract.text.accessibleTable).toBe(false)
    expect(contract.table.enabled).toBe(false)
  })
})
