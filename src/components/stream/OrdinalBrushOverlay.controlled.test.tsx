import React, { useState } from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { scaleBand, scaleLinear } from "d3-scale"
import { describe, expect, it, vi } from "vitest"
import { OrdinalBrushOverlay, type OrdinalBrushOverlayProps } from "./OrdinalBrushOverlay"
import type { OrdinalScales } from "./ordinalTypes"
import type { OrdinalBrushExtentInput } from "./ordinalBrushTypes"

// r ∈ [0, 100] over 300px across (horizontal) or 200px up (vertical).
const horizontal: OrdinalScales = {
  o: scaleBand<string>().domain(["a", "b"]).range([0, 200]),
  r: scaleLinear().domain([0, 100]).range([0, 300]),
  projection: "horizontal",
}
const vertical: OrdinalScales = {
  o: scaleBand<string>().domain(["a", "b"]).range([0, 300]),
  r: scaleLinear().domain([0, 100]).range([200, 0]),
  projection: "vertical",
}

const baseProps: OrdinalBrushOverlayProps = {
  width: 300,
  height: 200,
  totalWidth: 300,
  totalHeight: 200,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  scales: horizontal,
  onBrush: () => {},
}

/** Pointer gestures on the brush overlay, along the brushed axis, in plot pixels. */
function pointer(container: HTMLElement, axis: "x" | "y") {
  const target = () => container.querySelector(".overlay") as Element
  const dispatch = (node: Element | Window, type: string, at: number) => {
    const win = target().ownerDocument.defaultView!
    // jsdom rejects a foreign Window as MouseEvent.view, and d3-drag reads view.document.
    const event = new win.MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: axis === "x" ? at : 40,
      clientY: axis === "y" ? at : 40,
      button: 0,
    })
    Object.defineProperty(event, "view", { configurable: true, get: () => win })
    node.dispatchEvent(event)
  }
  const press = (at: number) => act(() => dispatch(target(), "mousedown", at))
  const move = (at: number) => act(() => dispatch(target().ownerDocument.defaultView!, "mousemove", at))
  const release = (at: number) => act(() => dispatch(target().ownerDocument.defaultView!, "mouseup", at))
  const drag = (from: number, to: number) => {
    press(from)
    move(to)
    release(to)
  }
  const selection = () => {
    const rect = container.querySelector(".selection") as SVGRectElement
    if (rect.style.display === "none") return null
    const round = (value: number) => Math.round(value * 1000) / 1000
    const start = Number(rect.getAttribute(axis))
    const length = Number(rect.getAttribute(axis === "x" ? "width" : "height"))
    return [round(start), round(start + length)]
  }
  const region = () => container.querySelector("svg[role='region']") as SVGSVGElement
  return { press, move, release, drag, selection, region }
}

function setup(props: Partial<OrdinalBrushOverlayProps> = {}) {
  const onBrush = vi.fn()
  const onBrushEnd = vi.fn()
  const view = render(<OrdinalBrushOverlay {...baseProps} onBrush={onBrush} onBrushEnd={onBrushEnd} {...props} />)
  const axis = props.scales?.projection === "vertical" ? "y" : "x"
  return { ...view, onBrush, onBrushEnd, ...pointer(view.container, axis) }
}

describe("controlled ordinal brush extent", () => {
  it("moves to the caller's extent and clears on null, reporting neither", () => {
    const { rerender, selection, onBrush, onBrushEnd } = setup({ extent: { r: [20, 50] } })
    expect(selection()).toEqual([60, 150])
    rerender(<OrdinalBrushOverlay {...baseProps} onBrush={onBrush} onBrushEnd={onBrushEnd} extent={{ r: [40, 60] }} />)
    expect(selection()).toEqual([120, 180])
    rerender(<OrdinalBrushOverlay {...baseProps} onBrush={onBrush} onBrushEnd={onBrushEnd} extent={null} />)
    expect(selection()).toBeNull()
    expect(onBrush).not.toHaveBeenCalled()
    expect(onBrushEnd).not.toHaveBeenCalled()
  })

  it("places a vertical value axis with its minimum at the bottom, clamped to the plot", () => {
    const { rerender, selection } = setup({ scales: vertical, extent: { r: [20, 50] } })
    expect(selection()).toEqual([100, 160])
    rerender(<OrdinalBrushOverlay {...baseProps} scales={vertical} extent={{ r: [-50, 25] }} />)
    expect(selection()).toEqual([150, 200])
  })

  it("returns to the caller's value after a release the caller ignores", () => {
    const { drag, selection, onBrush } = setup({ extent: { r: [20, 50] } })
    drag(200, 260)
    expect(onBrush).toHaveBeenLastCalledWith({ r: [expect.closeTo(66.67), expect.closeTo(86.67)] })
    expect(selection()).toEqual([60, 150])
  })

  it("keeps the caller's accepted value and never moves mid-drag", () => {
    function Controlled({ onBrushEnd }: { onBrushEnd: OrdinalBrushOverlayProps["onBrushEnd"] }) {
      const [extent, setExtent] = useState<OrdinalBrushExtentInput | null>({ r: [20, 50] })
      return <OrdinalBrushOverlay {...baseProps} extent={extent} onBrush={setExtent} onBrushEnd={onBrushEnd} />
    }
    const onBrushEnd = vi.fn()
    const view = render(<Controlled onBrushEnd={onBrushEnd} />)
    const { press, move, release, selection } = pointer(view.container, "x")
    press(200)
    move(260)
    expect(selection()).toEqual([200, 260])
    release(260)
    expect(selection()).toEqual([200, 260])
    expect(onBrushEnd).toHaveBeenCalledTimes(1)
  })

  it("leaves an uncontrolled brush where the pointer left it", () => {
    const { drag, selection, rerender, onBrush } = setup()
    expect(selection()).toBeNull()
    drag(60, 150)
    rerender(<OrdinalBrushOverlay {...baseProps} onBrush={onBrush} />)
    expect(selection()).toEqual([60, 150])
  })
})

describe("ordinal onBrushEnd", () => {
  it("reports once per pointer release, with where the value range reaches", () => {
    const { drag, press, release, onBrush, onBrushEnd } = setup()
    drag(60, 150)
    expect(onBrush.mock.calls.length).toBeGreaterThan(1)
    expect(onBrushEnd).toHaveBeenCalledTimes(1)
    expect(onBrushEnd).toHaveBeenLastCalledWith(
      { r: [20, 50] },
      { source: "pointer", atDomainStart: false, atDomainEnd: false }
    )

    drag(0, 90)
    expect(onBrushEnd.mock.lastCall?.[1]).toEqual({ source: "pointer", atDomainStart: true, atDomainEnd: false })

    press(250)
    release(250)
    expect(onBrushEnd).toHaveBeenLastCalledWith(null, { source: "pointer", atDomainStart: true, atDomainEnd: true })
    const calls = onBrushEnd.mock.calls.length
    press(250)
    release(250)
    expect(onBrushEnd).toHaveBeenCalledTimes(calls)
  })

  it("reports the value axis's minimum at the bottom of a vertical brush", () => {
    const { drag, onBrushEnd } = setup({ scales: vertical })
    drag(200, 140)
    expect(onBrushEnd.mock.lastCall?.[0].r[0]).toBeCloseTo(0)
    expect(onBrushEnd.mock.lastCall?.[0].r[1]).toBeCloseTo(30)
    expect(onBrushEnd.mock.lastCall?.[1]).toEqual({ source: "pointer", atDomainStart: true, atDomainEnd: false })
  })

  it("reports each keyboard step and the reset, and keeps the keyboard behaviour", () => {
    const { region, onBrush, onBrushEnd } = setup()
    act(() => { fireEvent.keyDown(region(), { key: "ArrowRight" }) })
    expect(onBrush.mock.lastCall?.[0].r[0]).toBeCloseTo(45)
    expect(onBrush.mock.lastCall?.[0].r[1]).toBeCloseTo(65)
    expect(onBrushEnd).toHaveBeenCalledTimes(1)
    expect(onBrushEnd.mock.lastCall?.[1]).toEqual({ source: "keyboard", atDomainStart: false, atDomainEnd: false })

    // An arrow across the value axis does nothing, as before.
    act(() => { fireEvent.keyDown(region(), { key: "ArrowUp" }) })
    expect(onBrushEnd).toHaveBeenCalledTimes(1)

    act(() => { fireEvent.keyDown(region(), { key: "Escape" }) })
    expect(onBrush).toHaveBeenLastCalledWith(null)
    expect(onBrushEnd).toHaveBeenLastCalledWith(null, { source: "keyboard", atDomainStart: true, atDomainEnd: true })
    act(() => { fireEvent.keyDown(region(), { key: "Escape" }) })
    expect(onBrushEnd).toHaveBeenCalledTimes(2)
  })

  it("starts a keyboard step from the controlled extent", () => {
    const { region, onBrush } = setup({ extent: { r: [20, 40] } })
    act(() => { fireEvent.keyDown(region(), { key: "ArrowRight" }) })
    expect(onBrush.mock.lastCall?.[0].r[0]).toBeCloseTo(25)
    expect(onBrush.mock.lastCall?.[0].r[1]).toBeCloseTo(45)
  })
})


describe("ordinal brush plot intersections", () => {
  it.each([horizontal, vertical])("clears off-screen and empty extents for $projection", (scales) => {
    const { rerender, selection, onBrush, onBrushEnd } = setup({ scales, extent: { r: [20, 50] } })
    for (const r of [[120, 150], [-20, -10], [100, 120], [30, 30]] as [number, number][]) {
      rerender(<OrdinalBrushOverlay {...baseProps} scales={scales} extent={{ r }} onBrush={onBrush} onBrushEnd={onBrushEnd} />)
      expect(selection()).toBeNull()
    }
    expect(onBrush).not.toHaveBeenCalled()
    expect(onBrushEnd).not.toHaveBeenCalled()
  })
})
