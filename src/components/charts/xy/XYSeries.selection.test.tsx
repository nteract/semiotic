import React from "react"
import { act, render } from "@testing-library/react"
import { vi, expect, it } from "vitest"
import { LineChart } from "./LineChart"
import { AreaChart } from "./AreaChart"
import { StackedAreaChart } from "./StackedAreaChart"
import type { StyleRule } from "../shared/styleRules"
import { SelectionProvider } from "../../store/SelectionStore"
import { useSelection } from "../../store/useSelection"
import type { StreamXYFrameProps } from "../../stream/types"

let frame: StreamXYFrameProps
vi.mock("../../stream/StreamXYFrame", () => ({
  default: React.forwardRef((_props: StreamXYFrameProps, _ref) => {
    frame = _props
    return <div />
  })
}))
const rows = [
  { x: 1, y: 4, category: "A" },
  { x: 2, y: 6, category: "A" },
  { x: 1, y: 8, category: "B" },
  { x: 2, y: 9, category: "B" }
]
let selection: ReturnType<typeof useSelection>
function Probe() {
  selection = useSelection({ name: "join" })
  return null
}

const seriesCharts = [
  { name: "AreaChart", Chart: AreaChart },
  { name: "StackedAreaChart", Chart: StackedAreaChart },
  { name: "LineChart", Chart: LineChart }
]

const styleRules: StyleRule[] = [
  { when: { axis: "y", gt: 8 }, style: { fill: "gold", stroke: "red" } }
]

it.each(seriesCharts)("$name styles individual points and restores their styles on clear", ({ Chart }) => {
  render(
    <SelectionProvider>
      <Probe />
      <Chart
        data={rows}
        {...{ areaBy: "category", lineBy: "category" }}
        colorBy="category"
        colorScheme={{ A: "blue", B: "green" }}
        showPoints
        pointRadius={5}
        stroke="black"
        strokeWidth={2}
        opacity={0.8}
        styleRules={styleRules}
        selection={{
          name: "join",
          unselectedOpacity: 0.15,
          selectedStyle: { strokeWidth: 4 }
        }}
      />
    </SelectionProvider>
  )
  act(() => selection.selectPoints({ category: ["B"] }))
  const line = frame.lineStyle as (datum: (typeof rows)[number]) => Record<string, unknown>
  expect(line(rows[0]).opacity).toBeCloseTo(0.12)
  expect(line(rows[2]).strokeWidth).toBe(4)
  expect(frame.pointStyle!(rows[0])).toMatchObject({ fill: "blue", opacity: 0.12 })
  expect(frame.pointStyle!(rows[2])).toMatchObject({ fill: "green", opacity: 0.8 })
  expect(frame.pointStyle!(rows[3])).toMatchObject({ fill: "gold", stroke: "black", strokeWidth: 4, r: 5 })
  act(() => selection.clear())
  expect((frame.lineStyle as typeof line)(rows[0]).opacity).toBe(0.8)
  expect(frame.pointStyle!(rows[0]).opacity).toBe(0.8)
  expect(frame.pointStyle!(rows[3])).toMatchObject({ fill: "gold", strokeWidth: 2 })
})

it.each(seriesCharts)("$name keeps a custom frame point style selection-aware", ({ Chart }) => {
  render(
    <SelectionProvider>
      <Probe />
      <Chart
        data={rows}
        {...{ areaBy: "category", lineBy: "category" }}
        showPoints
        styleRules={styleRules}
        selection={{ name: "join", unselectedOpacity: 0.2 }}
        frameProps={{ pointStyle: () => ({ fill: "purple", r: 7 }) }}
      />
    </SelectionProvider>
  )
  act(() => selection.selectPoints({ category: ["A"] }))
  expect(frame.pointStyle!(rows[3])).toMatchObject({ fill: "purple", r: 7, opacity: 0.2 })
  expect(frame.pointStyle!(rows[0]).opacity).toBeUndefined()
  act(() => selection.clear())
  expect(frame.pointStyle!(rows[3])).toEqual({ fill: "purple", r: 7 })
})

it("field mode publishes the hovered category rather than the x position", () => {
  render(
    <SelectionProvider>
      <Probe />
      <LineChart
        data={rows}
        lineBy="category"
        colorBy="category"
        linkedHover={{ name: "join", mode: "field", fields: ["category"] }}
      />
    </SelectionProvider>
  )
  act(() =>
    frame.customHoverBehavior!({ data: rows[2], xValue: 1, x: 10, y: 20 })
  )
  expect(selection.isActive).toBe(true)
  expect(selection.predicate({ category: "B" })).toBe(true)
  expect(selection.predicate({ category: "A" })).toBe(false)
  act(() => frame.customHoverBehavior!(null))
  expect(selection.isActive).toBe(false)
})

it("joins parent series metadata while retaining coordinate fields and style inputs", () => {
  const data = [
    {
      id: "a",
      category: "A",
      coordinates: [
        { x: 1, y: 4 },
        { x: 2, y: 6 }
      ]
    },
    {
      id: "b",
      category: "B",
      coordinates: [
        { x: 1, y: 8 },
        { x: 2, y: 9 }
      ]
    }
  ]
  render(
    <SelectionProvider>
      <Probe />
      <LineChart
        data={data}
        lineBy="id"
        colorBy="category"
        showPoints
        colorScheme={{ A: "red", B: "blue" }}
        linkedHover={{ name: "join", mode: "field", fields: ["category", "x"] }}
        selection={{ name: "join", unselectedOpacity: 0.15 }}
      />
    </SelectionProvider>
  )
  const points = frame.data!
  act(() => selection.selectPoints({ category: ["B"], x: [2] }))
  expect(frame.pointStyle!(points[0]).opacity).toBe(0.15)
  expect(frame.pointStyle!(points[2]).opacity).toBe(0.15)
  expect(frame.pointStyle!(points[3]).opacity).toBeUndefined()
  expect(frame.pointStyle!(points[3]).fill).toBe("blue")
  act(() =>
    frame.customHoverBehavior!({ data: points[3], xValue: 2, x: 10, y: 20 })
  )
  expect(selection.predicate({ category: "B", x: 2 })).toBe(true)
  expect(selection.predicate({ category: "A", x: 2 })).toBe(false)
  expect(selection.predicate({ category: "B", x: 1 })).toBe(false)
  act(() => frame.customHoverBehavior!(null))
  act(() => selection.clear())
  expect(frame.pointStyle!(points[0]).opacity).toBeUndefined()
})
