import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import type { Datum } from "./datumTypes"
import { overlayFrameStyle, selectionAwareFrameStyle } from "./frameStyleProps"
import {
  useSelectionAwareFrameStyle,
  useSelectionAwareXYFrameStyles,
} from "./useSelectionAwareFrameStyle"
import type { SelectionHookResult } from "./selectionUtils"
import {
  wrapNetworkEdgeStyleWithSelection,
  wrapNetworkNodeStyleWithSelection,
} from "./networkUtils"
import type { FrameStyleSelectionWrapper } from "./frameStyleProps"
import { requestsSelectionProvenance } from "../../store/selectionProvenance"

/** Call a style whatever arity its declared type has. */
const apply = (style: unknown, ...args: unknown[]): Datum =>
  (style as (...styleArgs: unknown[]) => Datum)(...args)

const inactive: SelectionHookResult = { isActive: false, predicate: () => true }
const selectsEast: SelectionHookResult = {
  isActive: true,
  predicate: (d: Datum) => d.region === "east",
}

describe("selectionAwareFrameStyle", () => {
  it("returns the caller's style untouched when the chart has no selection hook", () => {
    const style = () => ({ fill: "gold" })
    expect(selectionAwareFrameStyle(style, null)).toBe(style)
    expect(selectionAwareFrameStyle(style, undefined)).toBe(style)
  })

  it("passes object-form styles and undefined through unchanged", () => {
    const objectStyle = { stroke: "red" }
    expect(selectionAwareFrameStyle(objectStyle, selectsEast)).toBe(objectStyle)
    expect(selectionAwareFrameStyle(undefined, selectsEast)).toBeUndefined()
  })

  it("returns exactly the caller's fields while no selection is active", () => {
    const style = (d: Datum) => ({ fill: "gold", r: d.size })
    const aware = selectionAwareFrameStyle(style, inactive)
    expect(apply(aware, { size: 12, region: "west" })).toEqual({ fill: "gold", r: 12 })
  })

  it("dims marks outside an active selection and keeps the caller's fields", () => {
    const style = () => ({ fill: "gold", r: 12 })
    const aware = selectionAwareFrameStyle(style, selectsEast, { unselectedOpacity: 0.2 })
    expect(apply(aware, { region: "east" })).toEqual({ fill: "gold", r: 12 })
    expect(apply(aware, { region: "west" })).toEqual({ fill: "gold", r: 12, opacity: 0.2 })
  })

  it("multiplies the caller's own opacity instead of replacing it", () => {
    const aware = selectionAwareFrameStyle(
      () => ({ opacity: 0.5 }),
      selectsEast,
      { unselectedOpacity: 0.2 },
    )
    expect(apply(aware, { region: "west" }).opacity).toBeCloseTo(0.1)
  })

  it("applies selectedStyle and unselectedStyle from the selection config", () => {
    const aware = selectionAwareFrameStyle(
      () => ({ fill: "gold" }),
      selectsEast,
      { selectedStyle: { stroke: "black" }, unselectedStyle: { fill: "#ccc" } },
    )
    expect(apply(aware, { region: "east" })).toMatchObject({ fill: "gold", stroke: "black" })
    expect(apply(aware, { region: "west" })).toMatchObject({ fill: "#ccc" })
  })

  it("forwards extra arguments such as the series group", () => {
    const style = vi.fn((_d: Datum, group?: string) => ({ stroke: group }))
    const aware = selectionAwareFrameStyle(style, inactive) as typeof style
    expect(apply(aware, { region: "east" }, "series-a")).toEqual({ stroke: "series-a" })
    expect(style).toHaveBeenCalledWith({ region: "east" }, "series-a")
  })

  it("keeps a null or undefined return so the frame's fallback still applies", () => {
    const style = (d: Datum) => (d.flagged ? { fill: "red" } : undefined)
    const aware = selectionAwareFrameStyle(style, selectsEast)
    expect(apply(aware, { region: "west" })).toBeUndefined()
    expect(apply(aware, { region: "west", flagged: true })).toMatchObject({ fill: "red" })
  })

  it("adapts the datum the selection predicate reads", () => {
    const aware = selectionAwareFrameStyle(
      () => ({ fill: "gold" }),
      selectsEast,
      { unselectedOpacity: 0.2 },
      { selectionDatum: (d: Datum) => d.properties },
    )
    expect(apply(aware, { properties: { region: "east" } })).toEqual({ fill: "gold" })
    expect(apply(aware, { properties: { region: "west" } })).toMatchObject({ opacity: 0.2 })
  })

  it("requests source rows from aggregate marks, as chart-owned styles do", () => {
    const aware = selectionAwareFrameStyle(() => ({ fill: "gold" }), inactive)
    expect(requestsSelectionProvenance(aware)).toBe(true)
  })

  it("uses the network node wrapper against the node's raw datum", () => {
    const aware = selectionAwareFrameStyle(
      () => ({ fill: "gold" }),
      selectsEast,
      { unselectedOpacity: 0.2 },
      { wrap: wrapNetworkNodeStyleWithSelection as FrameStyleSelectionWrapper },
    )
    expect(apply(aware, { id: "a", data: { region: "east" } })).toEqual({ fill: "gold" })
    expect(apply(aware, { id: "b", data: { region: "west" } })).toEqual({
      fill: "gold",
      opacity: 0.2,
      fillOpacity: 0.2,
      strokeOpacity: 0.2,
    })
  })

  it("uses the network edge wrapper against either endpoint", () => {
    const aware = selectionAwareFrameStyle(
      () => ({ stroke: "gold" }),
      selectsEast,
      { unselectedOpacity: 0.2 },
      { wrap: wrapNetworkEdgeStyleWithSelection as FrameStyleSelectionWrapper },
    )
    const east = { data: { region: "east" } }
    const west = { data: { region: "west" } }
    expect(apply(aware, { source: east, target: west })).toEqual({ stroke: "gold" })
    expect(apply(aware, { source: west, target: west })).toMatchObject({ stroke: "gold", opacity: 0.2 })
  })
})

describe("useSelectionAwareFrameStyle", () => {
  it("keeps one function identity while its inputs are unchanged", () => {
    const style = () => ({ fill: "gold" })
    const config = { unselectedOpacity: 0.2 }
    const { result, rerender } = renderHook(
      ({ hook }) => useSelectionAwareFrameStyle(style, hook, config),
      { initialProps: { hook: inactive } },
    )
    const first = result.current
    rerender({ hook: inactive })
    expect(result.current).toBe(first)
    rerender({ hook: selectsEast })
    expect(result.current).not.toBe(first)
  })

  it("returns undefined when the caller passed no style", () => {
    const { result } = renderHook(() => useSelectionAwareFrameStyle(undefined, selectsEast))
    expect(result.current).toBeUndefined()
  })
})

describe("useSelectionAwareXYFrameStyles", () => {
  it("returns only the style keys the caller passed", () => {
    const lineStyle = () => ({ stroke: "gold" })
    const { result } = renderHook(() =>
      useSelectionAwareXYFrameStyles({ lineStyle, showAxes: false }, selectsEast, { unselectedOpacity: 0.2 }),
    )
    expect(Object.keys(result.current)).toEqual(["lineStyle"])
    expect(apply(result.current.lineStyle, { region: "west" })).toEqual({ stroke: "gold", opacity: 0.2 })
  })

  it("adapts point datums only", () => {
    const style = () => ({ fill: "gold" })
    const { result } = renderHook(() =>
      useSelectionAwareXYFrameStyles(
        { lineStyle: style, pointStyle: style },
        selectsEast,
        { unselectedOpacity: 0.2 },
        (d: Datum) => d.parentLine,
      ),
    )
    const point = { parentLine: { region: "east" } }
    expect(apply(result.current.pointStyle, point)).toEqual({ fill: "gold" })
    expect(apply(result.current.lineStyle, point)).toEqual({ fill: "gold", opacity: 0.2 })
  })

  it("keeps one result object while its inputs are unchanged", () => {
    const frameProps = { lineStyle: () => ({ stroke: "gold" }) }
    const { result, rerender } = renderHook(() => useSelectionAwareXYFrameStyles(frameProps, inactive))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})

describe("overlayFrameStyle", () => {
  const base = (d: Datum) => ({ fill: d.color, strokeWidth: 2 })

  it("returns the base function when there is nothing to layer", () => {
    expect(overlayFrameStyle(base, undefined)).toBe(base)
    expect(overlayFrameStyle(base, null)).toBe(base)
  })

  it("layers an object over the base, field by field", () => {
    expect(overlayFrameStyle(base, { strokeWidth: 4 })({ color: "teal" })).toEqual({
      fill: "teal",
      strokeWidth: 4,
    })
  })

  it("layers a function's return and tolerates an empty return", () => {
    const overlay = (d: Datum) => (d.bold ? { strokeWidth: 6 } : undefined)
    const style = overlayFrameStyle(base, overlay)
    expect(style({ color: "teal", bold: true })).toEqual({ fill: "teal", strokeWidth: 6 })
    expect(style({ color: "teal" })).toEqual({ fill: "teal", strokeWidth: 2 })
  })
})
