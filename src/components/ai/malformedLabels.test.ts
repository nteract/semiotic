import { describe, expect, it } from "vitest"
import { describeChart } from "./describeChart"
import { profileData } from "./profileData"
import { suggestCharts } from "./suggestCharts"
import { repairChartConfig } from "./repairChartConfig"
import { buildNavigationTree } from "./navigationTree"
import { buildReaderGrounding } from "./readerGrounding"
import { stringValue } from "./navigationValues"
import { jsonSafe } from "./vacpAdapterRuntime"
import { BarChartCapability } from "../charts/ordinal/BarChart.capability"
import { rankColumnOccupancy } from "../charts/xy/BumpChart.capability"
import { DifferenceChartCapability } from "../charts/xy/DifferenceChart.capability"
import { ProcessFlowChartCapability } from "../charts/physics/ProcessFlowChart.capability"

describe("public AI malformed dimension labels", () => {
  it.each([
    ["null-prototype object", Object.create(null)],
    ["invalid date", new Date(NaN)],
    [
      "throwing coercion",
      {
        toString() {
          throw new Error("unexpected coercion")
        }
      }
    ]
  ])("handles %s without coercing application objects", (_name, bad) => {
    const data = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: bad, y: 3 }
    ]
    expect(profileData(data)).toMatchObject({ rowCount: 3, uniqueXCount: 2 })
    expect(suggestCharts(data).length).toBeGreaterThan(0)
    expect(repairChartConfig("Scatterplot", data).profile.rowCount).toBe(3)
    const props = { data, xAccessor: "x", yAccessor: "y" }
    expect(describeChart("LineChart", props).text).not.toContain("Invalid Date")
    expect(buildNavigationTree("LineChart", props).label).toContain("3")
    expect(
      buildReaderGrounding("LineChart", props).description.text
    ).not.toContain("Invalid Date")
  })

  it("keeps grouping and transition inference safe on unsupported labels", () => {
    const bad = Object.create(null)
    const data = [
      { source: "a", target: "b", x: 1, y: 1, series: "A" },
      { source: "b", target: "c", x: 1, y: 2, series: "B" },
      { source: bad, target: "a", x: 2, y: 3, series: bad }
    ]
    const profile = profileData(data, { seriesField: "series" })
    expect(profile.hasNetwork).toBe(false)
    expect(profile.stackability).toMatchObject({ xColumns: 1, seriesPerX: 2 })
    const tree = buildNavigationTree("LineChart", {
      data,
      xAccessor: "x",
      yAccessor: "y",
      lineBy: "series"
    })
    expect(tree.children?.filter(({ role }) => role === "series")).toHaveLength(
      3
    )
  })

  it.each(["BarChart", "PieChart", "UnitPileChart", "CollisionSwarmChart"])(
    "%s uses fallback labels consistently in prose, navigation, and grounding",
    (component) => {
      const props = {
        data: [{ category: Object.create(null), value: 7, x: 1 }],
        categoryAccessor: "category",
        valueAccessor: "value",
        groupAccessor: "category"
      }
      for (const read of [
        describeChart,
        buildNavigationTree,
        buildReaderGrounding
      ]) {
        const result = read(component, props)
        expect(JSON.stringify(result)).not.toContain("[object Object]")
      }
    }
  )

  it("terminates on cyclic object labels and retains ordinary object identities", () => {
    const value: { id?: unknown } = {}
    value.id = value
    expect(stringValue(value)).toBe("—")
    expect(stringValue({ id: { label: "node-a" } })).toBe("node-a")
    expect(stringValue(new Date("2026-01-01T00:00:00Z"))).toBe(
      "2026-01-01T00:00:00.000Z"
    )
  })

  it("serializes invalid dates like JSON rather than throwing", () => {
    expect(jsonSafe({ date: new Date(NaN) })).toEqual({ date: null })
  })

  it.each([
    ["null-prototype object", Object.create(null)],
    ["invalid date", new Date(NaN)],
    [
      "throwing coercion",
      {
        toString() {
          throw new Error("unexpected coercion")
        }
      }
    ]
  ])("ignores %s in categorical capability inference", (_label, bad) => {
    const categories = ["Jan", "Feb", bad].map((category, i) => ({
      category,
      value: i + 1
    }))
    const categoryProfile = profileData(categories)
    expect(
      suggestCharts(categories).some(
        (suggestion) => suggestion.component === "BarChart"
      )
    ).toBe(true)
    expect(BarChartCapability.caveats?.(categoryProfile).join(" ")).toContain(
      "time bins"
    )

    const data = [
      { x: 1, y: 10, series: "A" },
      { x: 1, y: 2, series: "B" },
      { x: 2, y: 20, series: "A" },
      { x: 2, y: 4, series: "B" },
      { x: 2, y: 1000, series: bad }
    ]
    const profile = profileData(data, { seriesField: "series" })
    expect(
      suggestCharts(data, { seriesField: "series" }).length
    ).toBeGreaterThan(0)
    expect(DifferenceChartCapability.buildProps(profile)).toMatchObject({
      data: [
        { x: 1, a: 10, b: 2 },
        { x: 2, a: 20, b: 4 }
      ],
      seriesALabel: "A",
      seriesBLabel: "B"
    })
    expect(
      rankColumnOccupancy({
        ...profile,
        data: [...data, { x: bad, y: 1000, series: "A" }]
      })
    ).toEqual({ columns: 2, min: 2, median: 2, max: 2, contestedColumns: 2 })

    const flow = ProcessFlowChartCapability.buildProps(
      profileData([
        { stage: "queued", value: 1 },
        { stage: "done", value: 2 },
        { stage: bad, value: 3 }
      ])
    )
    expect((flow.stages as { id: string }[]).map(({ id }) => id)).toEqual([
      "queued",
      "done"
    ])
  })
})
