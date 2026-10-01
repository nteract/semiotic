import React from "react"
import { fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DirectManipulationControl, type DirectManipulationControlProps } from "./DirectManipulationControl"

// jsdom has no SVG layout. An identity screen transform makes the pointer's
// client coordinates the control's local coordinates.
const originalCTM = (SVGElement.prototype as unknown as { getScreenCTM?: unknown }).getScreenCTM
beforeEach(() => {
  ;(SVGElement.prototype as unknown as { getScreenCTM: () => DOMMatrixInit }).getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
})
afterEach(() => {
  ;(SVGElement.prototype as unknown as { getScreenCTM?: unknown }).getScreenCTM = originalCTM
})

function renderControl(props: Partial<DirectManipulationControlProps> = {}) {
  const handlers = { onChange: vi.fn(), onChangeStart: vi.fn(), onChangeEnd: vi.fn(), onObservation: vi.fn() }
  const view = render(
    <svg>
      <DirectManipulationControl
        value={20}
        min={0}
        max={100}
        x={80}
        y={10}
        label="Threshold"
        pointToValue={(point) => point.x / 4}
        {...handlers}
        {...props}
      />
    </svg>
  )
  return { ...handlers, slider: view.getByRole("slider"), view }
}

describe("DirectManipulationControl", () => {
  it("announces the standard slider role unless a role description is requested", () => {
    const { slider, view } = renderControl()
    expect(slider.hasAttribute("aria-roledescription")).toBe(false)
    view.rerender(
      <svg>
        <DirectManipulationControl value={20} min={0} max={100} x={0} y={0} label="Threshold" onChange={() => {}} pointToValue={() => 0} ariaRoleDescription="threshold handle" />
      </svg>
    )
    expect(view.getByRole("slider").getAttribute("aria-roledescription")).toBe("threshold handle")
  })

  it("fires a commit-ready onChangeEnd for every keyboard change", () => {
    const { slider, onChange, onChangeStart, onChangeEnd, onObservation } = renderControl()
    fireEvent.keyDown(slider, { key: "ArrowRight" })
    expect(onChangeStart).toHaveBeenCalledWith(20)
    expect(onChange).toHaveBeenCalledWith(21)
    expect(onChangeEnd).toHaveBeenCalledWith(21)
    expect(onObservation.mock.calls.map(([observation]) => [observation.type, observation.source])).toEqual([
      ["control-start", "keyboard"],
      ["control-change", "keyboard"],
      ["control-end", "keyboard"]
    ])
  })

  it("does not report a keyboard change that cannot move", () => {
    const { slider, onChange, onChangeEnd } = renderControl({ value: 100 })
    fireEvent.keyDown(slider, { key: "End" })
    fireEvent.keyDown(slider, { key: "ArrowUp" })
    expect(onChange).not.toHaveBeenCalled()
    expect(onChangeEnd).not.toHaveBeenCalled()
  })

  it("takes large steps on PageUp and PageDown", () => {
    const { slider, onChange } = renderControl({ step: 2, largeStep: 10 })
    fireEvent.keyDown(slider, { key: "PageUp" })
    expect(onChange).toHaveBeenLastCalledWith(30)
    fireEvent.keyDown(slider, { key: "PageDown" })
    expect(onChange).toHaveBeenLastCalledWith(20)
  })

  it("anchors the step grid at stepOrigin instead of min", () => {
    const anchoredAtMin = renderControl({ value: 12, min: 2.5, step: 5 })
    fireEvent.keyDown(anchoredAtMin.slider, { key: "ArrowRight" })
    expect(anchoredAtMin.onChange).toHaveBeenLastCalledWith(17.5)
    anchoredAtMin.view.unmount()

    const absolute = renderControl({ value: 10, min: 2.5, step: 5, stepOrigin: 0 })
    fireEvent.keyDown(absolute.slider, { key: "ArrowRight" })
    expect(absolute.onChange).toHaveBeenLastCalledWith(15)
  })

  it("maps the pointer into the handle's coordinate space for pointToValue", () => {
    const { slider, onChange, onChangeEnd } = renderControl()
    fireEvent.pointerDown(slider, { pointerId: 1, button: 0, clientX: 160, clientY: 10 })
    fireEvent.pointerMove(slider, { pointerId: 1, clientX: 200, clientY: 10 })
    fireEvent.pointerUp(slider, { pointerId: 1, clientX: 200, clientY: 10 })
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([40, 50])
    expect(onChangeEnd).toHaveBeenCalledWith(50)
  })

  it("keeps the event-based pointerToValue contract", () => {
    const pointerToValue = vi.fn(() => 33)
    const { slider, onChange } = renderControl({ pointToValue: undefined, pointerToValue })
    fireEvent.pointerDown(slider, { pointerId: 1, button: 0, clientX: 5, clientY: 5 })
    expect(pointerToValue).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith(33)
  })
})
