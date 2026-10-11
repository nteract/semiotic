import { describe, expect, it } from "vitest"
import type { Datum } from "../charts/shared/datumTypes"
import { suggestCharts } from "./suggestCharts"
import { repairChartConfig } from "./repairChartConfig"
import { describeChart } from "./describeChart"
import { buildNavigationTree } from "./navigationTree"
import { buildReaderGrounding } from "./readerGrounding"
import { profileData } from "./profileData"

const valid = { category: "measured", value: 7 }
const props = (data: Datum[]) => ({
  data,
  categoryAccessor: "category",
  valueAccessor: "value"
})

describe("public AI data boundaries", () => {
  it("omits sparse slots across public readers and retains valid datums", () => {
    const data = new Array<Datum>(3)
    data[1] = valid
    const profile = profileData(data)
    expect(profile.rowCount).toBe(1)
    expect(profile.data).toEqual([valid])
    expect(profile.data[0]).toBe(valid)
    expect(repairChartConfig("BarChart", data).profile.rowCount).toBe(1)
    expect(suggestCharts(data)).toEqual(suggestCharts([valid]))
    expect(describeChart("BarChart", props(data))).toEqual(
      describeChart("BarChart", props([valid]))
    )
    expect(buildNavigationTree("BarChart", props(data))).toEqual(
      buildNavigationTree("BarChart", props([valid]))
    )
    expect(buildReaderGrounding("BarChart", props(data))).toEqual(
      buildReaderGrounding("BarChart", props([valid]))
    )
  })

  it("ignores non-record rows consistently while retaining original valid datums", () => {
    const data = [null, undefined, 3, "row", [], valid] as Datum[]
    const profile = profileData(data)
    expect(profile.rowCount).toBe(1)
    expect(profile.data).toEqual([valid])
    expect(profile.data[0]).toBe(valid)
    expect(repairChartConfig("BarChart", data).profile.rowCount).toBe(1)
    expect(suggestCharts(data)).toEqual(suggestCharts([valid]))
    expect(describeChart("BarChart", props(data))).toEqual(
      describeChart("BarChart", props([valid]))
    )
    const tree = buildNavigationTree("BarChart", props(data))
    expect(tree).toEqual(buildNavigationTree("BarChart", props([valid])))
    expect(buildReaderGrounding("BarChart", props(data))).toEqual(
      buildReaderGrounding("BarChart", props([valid]))
    )
  })

  it("excludes unsupported numeric values instead of coercing BigInt or Symbol", () => {
    const data = [
      { category: "big", value: 9007199254740993n },
      { category: "symbol", value: Symbol("measure") },
      { category: "map", value: new Map([["value", 2]]) },
      valid
    ]
    const profile = profileData(data)
    expect(profile.fields.value).toMatchObject({
      type: "numeric",
      mean: 7,
      excludedCount: 3
    })
    expect(() => suggestCharts(data)).not.toThrow()
    expect(repairChartConfig("BarChart", data).profile.rowCount).toBe(4)
    const description = describeChart("BarChart", props(data))
    expect(description.levels.l2).toContain("mean of 7 across 1 points")
    const tree = buildNavigationTree("BarChart", props(data))
    expect(
      tree.children
        ?.filter((node) => node.role === "datum")
        .map((node) => node.value)
    ).toEqual([undefined, undefined, undefined, 7])
    expect(buildReaderGrounding("BarChart", props(data)).description).toEqual(
      description
    )
  })

  it("returns useful empty results when every row is invalid", () => {
    const data = [null, undefined, false] as unknown as Datum[]
    expect(suggestCharts(data)).toEqual(suggestCharts([]))
    expect(repairChartConfig("BarChart", data).profile.rowCount).toBe(0)
    expect(describeChart("BarChart", props(data)).levels.l2).toBe(
      "No data is loaded yet."
    )
    expect(buildNavigationTree("BarChart", props(data)).children).toEqual([])
    expect(
      buildReaderGrounding("BarChart", props(data)).description.levels.l2
    ).toBe("No data is loaded yet.")
  })
  it.each([
    [
      "ForceDirectedGraph",
      {
        nodes: [{ id: "A", size: 2n }, { id: "B" }],
        edges: [{ source: "A", target: "B", value: Symbol("weight") }]
      }
    ],
    [
      "ProportionalSymbolMap",
      { points: [{ lon: 0, lat: 0, value: 2n }], areas: [] }
    ],
    ["UnitPileChart", { data: [{ category: "A", value: Symbol("weight") }] }]
  ] as const)(
    "normalizes malformed rows in %s family inputs",
    (component, source) => {
      const mixed = Object.fromEntries(
        Object.entries(source).map(([key, rows]) => [
          key,
          [null, false, ...rows]
        ])
      )
      for (const read of [
        describeChart,
        buildNavigationTree,
        buildReaderGrounding
      ]) {
        expect(() => read(component, mixed)).not.toThrow()
        expect(read(component, mixed)).toEqual(read(component, source))
        const sparse = Object.fromEntries(
          Object.entries(source).map(([key, rows]) => {
            const values: unknown[] = new Array(rows.length + 1)
            for (let index = 0; index < rows.length; index++)
              values[index + 1] = rows[index]
            return [key, values]
          })
        )
        expect(read(component, sparse)).toEqual(read(component, source))
      }
    }
  )
})
