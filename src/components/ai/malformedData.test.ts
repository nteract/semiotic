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

function withoutDatums(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (key, entry) => (key === "datum" ? undefined : entry))
  )
}

describe("public AI data boundaries", () => {
  it("omits sparse and invalid features inside geographic collections", () => {
    const feature = {
      type: "Feature",
      id: "measured",
      properties: { value: 7 }
    }
    const features = new Array<unknown>(4)
    features[0] = null
    features[2] = false
    features[3] = feature
    const mixed = { areas: { type: "FeatureCollection", features } }
    const dense = { areas: { type: "FeatureCollection", features: [feature] } }
    for (const component of [
      "ChoroplethMap",
      "ProportionalSymbolMap",
      "FlowMap"
    ]) {
      for (const read of [
        describeChart,
        buildNavigationTree,
        buildReaderGrounding
      ]) {
        expect(read(component, mixed)).toEqual(read(component, dense))
      }
    }
    expect(features[3]).toBe(feature)
    expect(features[0]).toBeNull()
  })

  it.each(["TreeDiagram", "Treemap", "CirclePack", "OrbitDiagram"])(
    "%s omits invalid nested hierarchy children without cloning valid datums",
    (component) => {
      for (const childrenAccessor of [
        undefined,
        "branches",
        (node: Datum) => node.branches
      ]) {
        const key = childrenAccessor === undefined ? "children" : "branches"
        const leaf = { name: "measured", value: 7 }
        const emptyBranch = { name: "empty", value: 2, [key]: [null, false] }
        const branch = {
          name: "branch",
          [key]: [
            null,
            undefined,
            false,
            3,
            "row",
            [],
            new Date(),
            new Map(),
            new Set(),
            leaf
          ]
        }
        const children = new Array<unknown>(4)
        children[1] = branch
        children[3] = emptyBranch
        const root = { name: "root", [key]: children }
        const source = { data: root, childrenAccessor }
        const dense = {
          data: {
            name: "root",
            [key]: [
              { name: "branch", [key]: [leaf] },
              { name: "empty", value: 2, [key]: [] }
            ]
          },
          childrenAccessor
        }
        for (const read of [
          describeChart,
          buildNavigationTree,
          buildReaderGrounding
        ]) {
          expect(withoutDatums(read(component, source))).toEqual(
            withoutDatums(read(component, dense))
          )
        }
        const tree = buildNavigationTree(component, source)
        expect(tree.label).toContain("2 leaves")
        expect(tree.label).toContain("leaf total 9")
        expect(tree.children?.[0].datum).toBe(root)
        expect(tree.children?.[0].children?.[0].children?.[0].datum).toBe(leaf)
        expect(root[key]).toBe(children)
        expect(branch[key]).toHaveLength(10)
      }
    }
  )

  it("treats non-record hierarchy roots as absent", () => {
    for (const data of [
      null,
      false,
      3,
      "root",
      [],
      new Date(),
      new Map(),
      new Set()
    ]) {
      expect(buildNavigationTree("TreeDiagram", { data })).toEqual(
        buildNavigationTree("TreeDiagram", {})
      )
      expect(buildReaderGrounding("TreeDiagram", { data })).toEqual(
        buildReaderGrounding("TreeDiagram", {})
      )
    }
  })

  it("omits hierarchy cycles while retaining repeated leaves in separate branches", () => {
    const leaf = { name: "shared", value: 7 }
    const root: Datum = { name: "root", children: [] }
    root.children = [null, root, leaf, leaf]
    const grounding = buildReaderGrounding("TreeDiagram", { data: root })
    expect(grounding.structure?.label).toContain("2 leaves")
    expect(grounding.structure?.label).toContain("leaf total 14")
    expect(grounding.facts?.statements).toContain(
      "2 hierarchy leaves are supplied."
    )
  })

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
    ["DistanceCartogram", { lines: [{ source: "A", target: "B", value: 7 }] }],
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
