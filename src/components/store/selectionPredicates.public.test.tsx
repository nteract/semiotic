import React from "react"
import { act, renderHook } from "@testing-library/react"
import {
  LinkedCharts,
  useBrushSelection,
  useFilteredData,
  useLinkedHover,
  useSelection,
  useSelectionActions
} from "semiotic"
import { useSelectionActions as useNetworkSelectionActions } from "semiotic/network"

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LinkedCharts showLegend={false}>{children}</LinkedCharts>
)

describe("selection predicates through public hooks", () => {
  const data = [
    { id: "first", time: new Date(0) },
    { id: "same-time", time: new Date(0) },
    { id: "later", time: new Date(10) },
    { id: "missing", time: null }
  ]

  it.each([
    ["useSelection", () => useSelection({ name: "dates", clientId: "writer" })],
    ["useSelectionActions", () => useSelectionActions("dates", "writer")],
    [
      "network useSelectionActions",
      () => useNetworkSelectionActions("dates", "writer")
    ]
  ] as const)("matches equivalent Dates written by %s", (_name, useWriter) => {
    const { result } = renderHook(
      () => ({
        writer: useWriter(),
        reader: useSelection({ name: "dates", clientId: "reader" }),
        filtered: useFilteredData(data, "dates", "reader")
      }),
      { wrapper }
    )

    act(() => result.current.writer.selectPoints({ time: [new Date(0)] }))
    expect(result.current.filtered.map((d) => d.id)).toEqual([
      "first",
      "same-time"
    ])
    expect(result.current.reader.predicate({ time: new Date(0) })).toBe(true)
    expect(result.current.reader.predicate({ time: 0 })).toBe(false)

    act(() => result.current.writer.clear())
    expect(result.current.reader.isActive).toBe(false)
    expect(result.current.filtered).toEqual(data)
  })

  it("links Date-valued hover to independently materialized rows and clears on leave", () => {
    const { result } = renderHook(
      () => ({
        hover: useLinkedHover({ name: "dates", fields: ["time"] }),
        filtered: useFilteredData(data, "dates")
      }),
      { wrapper }
    )

    act(() => result.current.hover.onHover({ time: new Date(0) }))
    expect(result.current.filtered.map((d) => d.id)).toEqual([
      "first",
      "same-time"
    ])
    act(() => result.current.hover.onHover({ time: new Date(10) }))
    expect(result.current.filtered.map((d) => d.id)).toEqual(["later"])
    act(() => result.current.hover.onHover(null))
    expect(result.current.filtered).toEqual(data)
  })

  it("filters Date rows by an epoch brush while excluding missing and coercible values", () => {
    const brushData = [
      ...data,
      { id: "number", time: 0 },
      { id: "empty", time: "" },
      { id: "string", time: "0" },
      { id: "array", time: [] },
      { id: "invalid", time: new Date(NaN) }
    ]
    const { result } = renderHook(
      () => ({
        brush: useBrushSelection({ name: "dates", xField: "time" }),
        filtered: useFilteredData(brushData, "dates")
      }),
      { wrapper }
    )

    act(() => result.current.brush.brushInteraction.end([5, -5]))
    expect(result.current.filtered.map((d) => d.id)).toEqual([
      "first",
      "same-time",
      "number"
    ])
    act(() => result.current.brush.clear())
    expect(result.current.filtered).toEqual(brushData)
  })
})
