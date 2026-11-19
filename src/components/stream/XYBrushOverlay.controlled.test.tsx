import React, { useState } from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { scaleLinear, scaleTime } from "d3-scale"
import { describe, expect, it, vi } from "vitest"
import { XYBrushOverlay, type XYBrushOverlayProps } from "./XYBrushOverlay"
import type { XYBrushExtentInput } from "./xyBrushTypes"

// 300px over x ∈ [0, 100] (3px per unit); 200px over y ∈ [0, 1].
const scales = {
  x: scaleLinear().domain([0, 100]).range([0, 300]),
  y: scaleLinear().domain([0, 1]).range([200, 0]),
}

const baseProps: XYBrushOverlayProps = {
  width: 300,
  height: 200,
  totalWidth: 300,
  totalHeight: 200,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  dimension: "x",
  scales,
  onBrush: () => {},
}

function setup(props: Partial<XYBrushOverlayProps> = {}) {
  const onBrush = vi.fn()
  const onBrushEnd = vi.fn()
  const view = render(<XYBrushOverlay {...baseProps} onBrush={onBrush} onBrushEnd={onBrushEnd} {...props} />)
  return { ...view, onBrush, onBrushEnd, ...pointer(view.container) }
}

/** Pointer gestures on the brush overlay, in plot pixels. */
function pointer(container: HTMLElement) {
  const target = () => container.querySelector(".overlay") as Element
  const dispatch = (node: Element | Window, type: string, x: number) => {
    const win = target().ownerDocument.defaultView!
    // jsdom rejects a foreign Window as MouseEvent.view, and d3-drag reads view.document.
    const event = new win.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: 40, button: 0 })
    Object.defineProperty(event, "view", { configurable: true, get: () => win })
    node.dispatchEvent(event)
  }
  const press = (x: number) => act(() => dispatch(target(), "mousedown", x))
  const move = (x: number) => act(() => dispatch(target().ownerDocument.defaultView!, "mousemove", x))
  const release = (x: number) => act(() => dispatch(target().ownerDocument.defaultView!, "mouseup", x))
  const drag = (from: number, to: number) => {
    press(from)
    move(to)
    release(to)
  }
  const selection = () => {
    const rect = container.querySelector(".selection") as SVGRectElement
    const round = (value: number) => Math.round(value * 1000) / 1000
    const x = Number(rect.getAttribute("x"))
    return rect.style.display === "none" ? null : [round(x), round(x + Number(rect.getAttribute("width")))]
  }
  const region = () => container.querySelector("svg[role='region']") as SVGSVGElement
  return { press, move, release, drag, selection, region }
}

describe("controlled XY brush extent", () => {
  it("moves to the caller's extent and clears on null, reporting neither", () => {
    const { rerender, selection, onBrush, onBrushEnd } = setup({ extent: { x: [20, 50] } })
    expect(selection()).toEqual([60, 150])
    rerender(<XYBrushOverlay {...baseProps} onBrush={onBrush} onBrushEnd={onBrushEnd} extent={{ x: [40, 60] }} />)
    expect(selection()).toEqual([120, 180])
    rerender(<XYBrushOverlay {...baseProps} onBrush={onBrush} onBrushEnd={onBrushEnd} extent={null} />)
    expect(selection()).toBeNull()
    expect(onBrush).not.toHaveBeenCalled()
    expect(onBrushEnd).not.toHaveBeenCalled()
  })

  it("clamps an extent past the plot and clears one missing its brushed axis", () => {
    const { rerender, selection } = setup({ extent: { x: [-50, 30] } })
    expect(selection()).toEqual([0, 90])
    rerender(<XYBrushOverlay {...baseProps} extent={{ y: [0.2, 0.4] }} />)
    expect(selection()).toBeNull()
  })

  it("follows the caller's value when the scales change", () => {
    const { rerender, selection } = setup({ extent: { x: [20, 50] } })
    const wider = { ...scales, x: scaleLinear().domain([0, 200]).range([0, 300]) }
    rerender(<XYBrushOverlay {...baseProps} scales={wider} extent={{ x: [20, 50] }} />)
    expect(selection()).toEqual([30, 75])
  })

  it("returns to the caller's value after a release the caller ignores", () => {
    const { drag, selection, onBrush } = setup({ extent: { x: [20, 50] } })
    drag(200, 260)
    expect(onBrush).toHaveBeenLastCalledWith({ x: [expect.closeTo(66.67), expect.closeTo(86.67)], y: [0, 1] })
    expect(selection()).toEqual([60, 150])
  })

  it("keeps the caller's accepted value and never moves mid-drag", () => {
    function Controlled({ onBrushEnd }: { onBrushEnd: XYBrushOverlayProps["onBrushEnd"] }) {
      const [extent, setExtent] = useState<XYBrushExtentInput | null>({ x: [20, 50] })
      return <XYBrushOverlay {...baseProps} extent={extent} onBrush={setExtent} onBrushEnd={onBrushEnd} />
    }
    const onBrushEnd = vi.fn()
    const view = render(<Controlled onBrushEnd={onBrushEnd} />)
    const { press, move, release, selection } = pointer(view.container)
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
    rerender(<XYBrushOverlay {...baseProps} onBrush={onBrush} />)
    expect(selection()).toEqual([60, 150])
  })
})

describe("onBrushEnd", () => {
  it("reports once per pointer release, with where the selection reaches", () => {
    const { drag, press, release, onBrush, onBrushEnd } = setup()
    drag(60, 150)
    expect(onBrush.mock.calls.length).toBeGreaterThan(1)
    expect(onBrushEnd).toHaveBeenCalledTimes(1)
    expect(onBrushEnd).toHaveBeenLastCalledWith(
      { x: [20, 50], y: [0, 1] },
      { source: "pointer", atDomainStart: false, atDomainEnd: false }
    )

    drag(0, 90)
    expect(onBrushEnd).toHaveBeenCalledTimes(2)
    expect(onBrushEnd.mock.lastCall?.[1]).toEqual({ source: "pointer", atDomainStart: true, atDomainEnd: false })

    // A click on the background clears the selection.
    press(250)
    release(250)
    expect(onBrushEnd).toHaveBeenCalledTimes(3)
    expect(onBrushEnd).toHaveBeenLastCalledWith(null, { source: "pointer", atDomainStart: true, atDomainEnd: true })

    // Another click with nothing selected changes nothing.
    press(250)
    release(250)
    expect(onBrushEnd).toHaveBeenCalledTimes(3)
  })

  it("reports each keyboard step and the reset, and keeps the keyboard behaviour", () => {
    const { region, onBrush, onBrushEnd } = setup()
    act(() => { fireEvent.keyDown(region(), { key: "ArrowRight" }) })
    expect(onBrush.mock.lastCall?.[0].x[0]).toBeCloseTo(45)
    expect(onBrush.mock.lastCall?.[0].x[1]).toBeCloseTo(65)
    expect(onBrushEnd).toHaveBeenCalledTimes(1)
    expect(onBrushEnd.mock.lastCall?.[1]).toEqual({ source: "keyboard", atDomainStart: false, atDomainEnd: false })

    act(() => { fireEvent.keyDown(region(), { key: "Escape" }) })
    expect(onBrush).toHaveBeenLastCalledWith(null)
    expect(onBrushEnd).toHaveBeenLastCalledWith(null, { source: "keyboard", atDomainStart: true, atDomainEnd: true })
    act(() => { fireEvent.keyDown(region(), { key: "Escape" }) })
    expect(onBrushEnd).toHaveBeenCalledTimes(2)
  })

  it("starts a keyboard step from the controlled extent", () => {
    const { region, onBrush } = setup({ extent: { x: [20, 40] } })
    act(() => { fireEvent.keyDown(region(), { key: "ArrowRight" }) })
    expect(onBrush.mock.lastCall?.[0].x[0]).toBeCloseTo(25)
    expect(onBrush.mock.lastCall?.[0].x[1]).toBeCloseTo(45)
  })

  it("reports the brushed y axis for a y brush", () => {
    const { region, onBrushEnd } = setup({ dimension: "y", extent: { y: [0.05, 0.45] } })
    act(() => { fireEvent.keyDown(region(), { key: "ArrowDown" }) })
    expect(onBrushEnd.mock.lastCall?.[1]).toEqual({ source: "keyboard", atDomainStart: true, atDomainEnd: false })
  })
})


describe("controlled brush clipping and time values", () => {
  it.each([[120, 150], [-20, -10], [100, 120], [30, 30]])("clears an empty plot intersection %j", (start, end) => {
    const { selection, onBrush, onBrushEnd } = setup({ extent: { x: [start, end] } })
    expect(selection()).toBeNull()
    expect(onBrush).not.toHaveBeenCalled()
    expect(onBrushEnd).not.toHaveBeenCalled()
  })

  it("clears a selection moved off-screen by a domain update", () => {
    const { rerender, selection } = setup({ extent: { x: [20, 50] } })
    expect(selection()).toEqual([60, 150])
    rerender(<XYBrushOverlay {...baseProps} scales={{ ...scales, x: scaleLinear().domain([60, 100]).range([0, 300]) }} extent={{ x: [20, 50] }} />)
    expect(selection()).toBeNull()
  })

  const epoch = Date.UTC(2026, 0, 1)
  const day = 86400000
  const timeScales = {
    ...scales,
    x: scaleTime().domain([new Date(epoch), new Date(epoch + 100 * day)]).range([0, 300]),
  } as unknown as NonNullable<XYBrushOverlayProps["scales"]>

  it("steps numerically from a controlled time extent", () => {
    const { region, onBrush, onBrushEnd } = setup({ scales: timeScales, extent: { x: [epoch + 20 * day, epoch + 40 * day] } })
    fireEvent.keyDown(region(), { key: "ArrowRight" })
    expect(onBrush).toHaveBeenLastCalledWith({ x: [epoch + 25 * day, epoch + 45 * day], y: [0, 1] })
    expect(onBrushEnd).toHaveBeenCalledTimes(1)
  })

  it("does not report an unchanged time selection on release", () => {
    const { drag, onBrushEnd } = setup({ scales: timeScales, extent: { x: [epoch + 20 * day, epoch + 50 * day] } })
    drag(60, 150)
    expect(onBrushEnd).not.toHaveBeenCalled()
  })
})
