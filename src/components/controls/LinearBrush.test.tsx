import React from "react"
import { act, fireEvent, render, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LinearBrush } from "./LinearBrush"
import type { LinearBrushProps } from "./linearBrushTypes"

// jsdom has no layout, so the track length falls back to `width` (400px):
// clientX / 4 is the value on the [0, 100] domain.
function renderBrush(props: Partial<LinearBrushProps> = {}) {
  const view = render(<LinearBrush domain={[0, 100]} width={400} height={40} {...props} />)
  const root = view.container.querySelector<HTMLElement>("[data-semiotic-control='linear-brush']")!
  const part = (name: string) => root.querySelector<HTMLElement>(`[data-semiotic-brush-part='${name}']`)
  const slider = (name: string) => within(root).getByRole("slider", { name })
  const at = (clientX: number, clientY = 20) => ({ pointerId: 1, button: 0, clientX, clientY })
  const drag = (target: Element, from: number, to: number) => {
    fireEvent.pointerDown(target, at(from))
    fireEvent.pointerMove(root, at(to))
    fireEvent.pointerUp(root, at(to))
  }
  return { ...view, root, part, slider, at, drag }
}

const meta = (overrides: object) => ({ changed: true, atDomainStart: false, atDomainEnd: false, ...overrides })

describe("LinearBrush structure", () => {
  it("renders a group with start, range, and end sliders", () => {
    const { root } = renderBrush({ value: [20, 60], minSpan: 5, formatValue: (v) => `${v}%` })
    expect(root.getAttribute("role")).toBe("group")
    expect(root.getAttribute("aria-label")).toBe("Range brush")
    const sliders = within(root).getAllByRole("slider")
    expect(sliders.map((s) => s.getAttribute("aria-label"))).toEqual(["Range start", "Range (move both ends)", "Range end"])
    expect(sliders.map((s) => s.getAttribute("aria-valuetext"))).toEqual(["20%", "20% to 60%", "60%"])
    expect(sliders.map((s) => [s.getAttribute("aria-valuemin"), s.getAttribute("aria-valuemax")])).toEqual([
      ["0", "55"], ["0", "100"], ["25", "100"],
    ])
    const description = document.getElementById(sliders[0].getAttribute("aria-describedby")!)
    expect(description?.textContent).toMatch(/Arrow keys/)
  })

  it("keeps only the range slider when nothing is selected", () => {
    const { root, slider } = renderBrush({ value: null })
    expect(within(root).getAllByRole("slider")).toHaveLength(1)
    expect(slider("Range (move both ends)").getAttribute("aria-valuetext")).toBe("No range selected")
  })

  it("shows the handles at the domain ends for an empty full-extent brush", () => {
    const { root, part } = renderBrush({ value: null, emptySelection: "full-extent" })
    expect(within(root).getAllByRole("slider").map((s) => s.getAttribute("aria-valuenow"))).toEqual(["0", "0", "100"])
    expect([part("start")!.style.left, part("end")!.style.left]).toEqual(["0%", "100%"])
  })

  it("places parts by fraction, with the minimum at the bottom of a y brush", () => {
    const { part } = renderBrush({ value: [25, 50], orientation: "y", height: 200 })
    const selection = part("selection")!
    expect([selection.style.top, selection.style.height]).toEqual(["50%", "25%"])
  })
})

describe("LinearBrush keyboard", () => {
  it("steps the range and fires onChange and onChangeEnd", () => {
    const onChange = vi.fn()
    const onChangeEnd = vi.fn()
    const { slider } = renderBrush({ value: [20, 40], onChange, onChangeEnd })
    fireEvent.keyDown(slider("Range (move both ends)"), { key: "ArrowRight" })
    const expected = meta({ source: "keyboard", mode: "keyboard" })
    expect(onChange).toHaveBeenCalledWith([25, 45], expected)
    expect(onChangeEnd).toHaveBeenCalledWith([25, 45], expected)
  })

  it("resizes from a focused end and stops at its limit", () => {
    const onChange = vi.fn()
    const { slider } = renderBrush({ value: [20, 40], onChange })
    fireEvent.keyDown(slider("Range end"), { key: "End" })
    expect(onChange).toHaveBeenLastCalledWith([20, 100], meta({ source: "keyboard", mode: "keyboard", atDomainEnd: true }))
    onChange.mockClear()
    const { slider: atEnd } = renderBrush({ value: [20, 100], onChange })
    fireEvent.keyDown(atEnd("Range end"), { key: "ArrowRight" })
    expect(onChange).not.toHaveBeenCalled()
  })

  it("seeds the middle fifth on the first arrow from empty", () => {
    const onChange = vi.fn()
    const { slider } = renderBrush({ defaultValue: null, onChange })
    fireEvent.keyDown(slider("Range (move both ends)"), { key: "ArrowLeft" })
    expect(onChange).toHaveBeenCalledWith([35, 55], expect.objectContaining({ source: "keyboard" }))
  })

  it("clears with Escape and moves focus from a removed end to the range", () => {
    const onChange = vi.fn()
    const { root, slider } = renderBrush({ defaultValue: [20, 40], onChange })
    const start = slider("Range start")
    act(() => start.focus())
    fireEvent.keyDown(start, { key: "Escape" })
    expect(onChange).toHaveBeenCalledWith(null, { source: "keyboard", mode: "clear", changed: true, atDomainStart: true, atDomainEnd: true })
    expect(within(root).queryByRole("slider", { name: "Range start" })).toBeNull()
    expect(document.activeElement).toBe(slider("Range (move both ends)"))
  })
})

describe("LinearBrush pointer", () => {
  it("resizes an end and reports one onChangeEnd", () => {
    const onChangeStart = vi.fn()
    const onChangeEnd = vi.fn()
    const { part, drag } = renderBrush({ defaultValue: [20, 60], onChangeStart, onChangeEnd })
    drag(part("end")!, 240, 320)
    expect(onChangeStart).toHaveBeenCalledWith([20, 60], expect.objectContaining({ mode: "end", changed: false }))
    expect(onChangeEnd).toHaveBeenCalledTimes(1)
    expect(onChangeEnd).toHaveBeenCalledWith([20, 80], meta({ source: "pointer", mode: "end" }))
    expect(part("selection")!.style.width).toBe("60%")
  })

  it("moves the selection and stops flush at the domain end", () => {
    const onChange = vi.fn()
    const { part, drag } = renderBrush({ defaultValue: [20, 40], onChange })
    drag(part("selection")!, 100, 140)
    expect(onChange).toHaveBeenLastCalledWith([30, 50], expect.objectContaining({ mode: "move" }))
    drag(part("selection")!, 140, 400)
    expect(onChange).toHaveBeenLastCalledWith([80, 100], expect.objectContaining({ atDomainEnd: true }))
  })

  it("keeps the ends minSpan apart", () => {
    const onChange = vi.fn()
    const { part, drag } = renderBrush({ defaultValue: [20, 60], minSpan: 10, onChange })
    drag(part("start")!, 80, 390)
    expect(onChange).toHaveBeenLastCalledWith([50, 60], expect.objectContaining({ mode: "start" }))
  })

  it("draws on the background and clears on a background click", () => {
    const onChange = vi.fn()
    const onChangeEnd = vi.fn()
    const { root, drag, at } = renderBrush({ defaultValue: null, onChange, onChangeEnd })
    drag(root, 160, 40)
    expect(onChangeEnd).toHaveBeenLastCalledWith([10, 40], meta({ source: "pointer", mode: "create" }))
    fireEvent.pointerDown(root, at(300))
    fireEvent.pointerUp(root, at(301))
    expect(onChange).toHaveBeenLastCalledWith(null, expect.objectContaining({ source: "background-click", mode: "clear" }))
    expect(onChangeEnd).toHaveBeenLastCalledWith(null, expect.objectContaining({ mode: "clear" }))
  })

  it("only clears on a background drag when creating is off", () => {
    const onChange = vi.fn()
    const { root, drag } = renderBrush({ defaultValue: [20, 40], allowCreate: false, onChange })
    drag(root, 300, 360)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(null, expect.objectContaining({ mode: "clear" }))
  })

  it("renders a draft while controlled, then the controlled value after release", () => {
    const onChange = vi.fn()
    const { root, part, at } = renderBrush({ value: [20, 40], onChange })
    fireEvent.pointerDown(part("selection")!, at(100))
    fireEvent.pointerMove(root, at(140))
    expect(part("selection")!.style.left).toBe("30%")
    fireEvent.pointerUp(root, at(140))
    expect(part("selection")!.style.left).toBe("20%")
    expect(onChange).toHaveBeenCalledWith([30, 50], expect.objectContaining({ mode: "move" }))
  })

  it("applies the release position when the last move never arrived", () => {
    const onChangeEnd = vi.fn()
    const { root, part, at } = renderBrush({ defaultValue: [20, 40], onChangeEnd })
    fireEvent.pointerDown(part("end")!, at(160))
    fireEvent.pointerUp(root, at(320))
    expect(onChangeEnd).toHaveBeenCalledWith([20, 80], expect.objectContaining({ mode: "end", changed: true }))
  })

  it("ends a cancelled click without clearing", () => {
    const onChange = vi.fn()
    const { root, at } = renderBrush({ defaultValue: [20, 40], onChange })
    fireEvent.pointerDown(root, at(300))
    fireEvent.pointerCancel(root, at(300))
    expect(onChange).not.toHaveBeenCalled()
  })

  it("draws a y brush with the minimum at the bottom", () => {
    const onChangeEnd = vi.fn()
    const { root, at } = renderBrush({ defaultValue: null, orientation: "y", height: 100, onChangeEnd })
    fireEvent.pointerDown(root, at(10, 20))
    fireEvent.pointerMove(root, at(10, 60))
    fireEvent.pointerUp(root, at(10, 60))
    expect(onChangeEnd).toHaveBeenCalledWith([40, 80], expect.objectContaining({ mode: "create" }))
  })

  it("resets on double-click", () => {
    const onChange = vi.fn()
    const { root } = renderBrush({ defaultValue: [20, 40], resetOnDoubleClick: true, resetValue: [0, 100], onChange })
    fireEvent.doubleClick(root)
    expect(onChange).toHaveBeenCalledWith([0, 100], { source: "double-click", mode: "reset", changed: true, atDomainStart: true, atDomainEnd: true })
  })

  it("ignores pointer and keyboard input when disabled", () => {
    const onChange = vi.fn()
    const { part, slider, drag } = renderBrush({ value: [20, 40], disabled: true, onChange })
    drag(part("end")!, 160, 300)
    fireEvent.keyDown(slider("Range end"), { key: "ArrowRight" })
    expect(onChange).not.toHaveBeenCalled()
    expect(slider("Range end").getAttribute("tabindex")).toBe("-1")
  })
})

describe("LinearBrush rendering options", () => {
  it("hands renderHandle each end's state", () => {
    const renderHandle = vi.fn(() => <span className="custom-handle" />)
    const { root, part, at, container } = renderBrush({ defaultValue: [20, 60], renderHandle, showMoveHandle: true })
    expect(container.querySelectorAll(".custom-handle")).toHaveLength(3)
    fireEvent.pointerDown(part("end")!, at(240))
    fireEvent.pointerMove(root, at(260))
    const calls = (renderHandle.mock.calls as unknown as [{ side: string; active: boolean; dragging: boolean; value: number }][])
      .map(([context]) => context)
    expect(calls.at(-2)).toMatchObject({ side: "end", active: true, dragging: true, value: 65 })
    expect(calls.at(-3)).toMatchObject({ side: "start", active: false, dragging: true })
    expect(calls.at(-1)).toMatchObject({ side: "move", value: 42.5 })
  })

  it("labels the extent, flipping labels inward at the bounds", () => {
    const { root } = renderBrush({ value: [1, 99], showExtentLabels: true, formatValue: (v) => `Day ${v}` })
    const labels = [...root.querySelectorAll<HTMLElement>("[data-semiotic-brush-label]")]
    expect(labels.map((label) => [label.textContent, label.dataset.placement])).toEqual([
      ["Day 1", "after"],
      ["Day 99", "before"],
    ])
  })

  it("drops the active style after a drag, even over a base shorthand", () => {
    const { root, part, at } = renderBrush({
      defaultValue: [20, 60],
      selectionStyle: { border: "1px solid rgb(217, 216, 222)" },
      activeSelectionStyle: { borderColor: "rgb(96, 71, 255)" },
    })
    const visual = () => root.querySelector<HTMLElement>("[data-semiotic-brush-selection]")!
    fireEvent.pointerDown(part("end")!, at(240))
    fireEvent.pointerMove(root, at(260))
    expect(visual().style.borderColor).toBe("rgb(96, 71, 255)")
    fireEvent.pointerUp(root, at(260))
    expect(visual().style.borderColor).toBe("rgb(217, 216, 222)")
  })

  it("shows a focus ring for keyboard focus but not for a grabbed end", () => {
    // jsdom never matches :focus-visible; a browser does after keyboard focus.
    const matches = Element.prototype.matches
    const spy = vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector: string) {
      return selector === ":focus-visible" || matches.call(this, selector)
    })
    try {
      const { part, slider, at } = renderBrush({ defaultValue: [20, 60] })
      act(() => slider("Range start").focus())
      expect(part("start")!.style.outlineStyle).toBe("solid")
      fireEvent.pointerDown(part("end")!, at(240))
      expect(document.activeElement).toBe(part("end"))
      expect(part("end")!.style.outlineStyle).toBe("none")
    } finally {
      spy.mockRestore()
    }
  })

  it("masks the track outside the selection", () => {
    const { root } = renderBrush({ value: [20, 60], maskStyle: { opacity: 0.4 } })
    const masks = [...root.querySelectorAll<HTMLElement>("[data-semiotic-brush-part='mask']")]
    expect(masks.map((mask) => [mask.style.left, mask.style.width, mask.style.opacity])).toEqual([
      ["0%", "20%", "0.4"],
      ["60%", "40%", "0.4"],
    ])
  })
})

describe("LinearBrush observations", () => {
  it("reports a drag as control-start, control-change, and control-end", () => {
    const onObservation = vi.fn()
    const { root, part, at } = renderBrush({ defaultValue: [20, 60], onObservation, controlId: "window", chartId: "overview" })
    fireEvent.pointerDown(part("end")!, at(240))
    fireEvent.pointerMove(root, at(280))
    fireEvent.pointerMove(root, at(320))
    fireEvent.pointerUp(root, at(320))
    const observations = onObservation.mock.calls.map(([observation]) => [observation.type, observation.value])
    expect(observations).toEqual([
      ["control-start", [20, 70]],
      ["control-change", [20, 70]],
      ["control-change", [20, 80]],
      ["control-end", [20, 80]],
    ])
    expect(onObservation.mock.calls[0][0]).toMatchObject({
      controlType: "range-boundary", controlId: "window", chartId: "overview", chartType: "LinearBrush", source: "pointer",
    })
  })

  it("reports nothing for a click that changes nothing", () => {
    const onObservation = vi.fn()
    const { root, part, at } = renderBrush({ defaultValue: [20, 60], onObservation })
    fireEvent.pointerDown(part("selection")!, at(160))
    fireEvent.pointerUp(root, at(160))
    expect(onObservation).not.toHaveBeenCalled()
  })
})
