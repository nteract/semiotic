import { describe, it, expect, vi } from "vitest"
import { act, render, screen, fireEvent } from "@testing-library/react"
import * as React from "react"
import { useState } from "react"
import { CircularBrush, type CircularBrushValue } from "./CircularBrush"
import type { ControlObservation } from "./controls/controlContract"

function Harness({ initial = { start: 10, end: 40 } }: { initial?: CircularBrushValue }) {
  const [value, setValue] = useState<CircularBrushValue>(initial)
  return (
    <>
      <CircularBrush value={value} onChange={setValue} period={365} label="Date" />
      <output data-testid="out">{`${value.start},${value.end}`}</output>
    </>
  )
}

const out = () => screen.getByTestId("out").textContent

describe("CircularBrush — accessibility structure", () => {
  it("renders three sliders (range + two handles) with ARIA range attributes", () => {
    render(<Harness />)
    const sliders = screen.getAllByRole("slider")
    expect(sliders).toHaveLength(3)
    const start = screen.getByRole("slider", { name: "Date start" })
    expect(start).toHaveAttribute("aria-valuemin", "0")
    expect(start).toHaveAttribute("aria-valuemax", "364")
    expect(start).toHaveAttribute("aria-valuenow", "10")
    expect(screen.getByRole("slider", { name: "Date end" })).toHaveAttribute("aria-valuenow", "40")
  })

  it("uses aria-valuetext via formatValue", () => {
    render(
      <CircularBrush
        value={{ start: 0, end: 31 }}
        onChange={() => {}}
        period={365}
        label="Date"
        formatValue={(v) => `day ${v}`}
      />,
    )
    expect(screen.getByRole("slider", { name: "Date start" })).toHaveAttribute("aria-valuetext", "day 0")
  })
})

describe("CircularBrush — keyboard control", () => {
  it("nudges a handle by step, and by largeStep with Shift", () => {
    render(<Harness />)
    const start = screen.getByRole("slider", { name: "Date start" })
    fireEvent.keyDown(start, { key: "ArrowRight" })
    expect(out()).toBe("11,40")
    fireEvent.keyDown(start, { key: "ArrowLeft" })
    expect(out()).toBe("10,40")
    fireEvent.keyDown(start, { key: "ArrowRight", shiftKey: true })
    expect(out()).toBe("17,40")
  })

  it("moves both ends when the range slider is nudged", () => {
    render(<Harness />)
    const range = screen.getByRole("slider", { name: "Date (move both ends)" })
    fireEvent.keyDown(range, { key: "ArrowRight" })
    expect(out()).toBe("11,41")
  })

  it("wraps around the cycle boundary", () => {
    render(<Harness initial={{ start: 364, end: 40 }} />)
    const start = screen.getByRole("slider", { name: "Date start" })
    fireEvent.keyDown(start, { key: "ArrowRight" })
    expect(out()).toBe("0,40")
  })
})

function ObservedHarness({
  initial = { start: 10, end: 40 },
  period = 365,
  step,
  onObservation,
}: {
  initial?: CircularBrushValue
  period?: number
  step?: number
  onObservation?: (observation: ControlObservation) => void
}) {
  const [value, setValue] = useState<CircularBrushValue>(initial)
  return (
    <>
      <CircularBrush
        value={value}
        onChange={setValue}
        period={period}
        step={step}
        label="Date"
        controlId="season"
        chartId="weather"
        onObservation={onObservation}
      />
      <output data-testid="out">{`${value.start},${value.end}`}</output>
    </>
  )
}

/** Pointer at a clock angle (radians, 0 = up, clockwise) on the default 400px brush ring. */
function pointerAt(angle: number) {
  return { pointerId: 1, clientX: 200 + Math.sin(angle) * 150, clientY: 200 - Math.cos(angle) * 150 }
}

describe("CircularBrush — fractional periods", () => {
  it("snaps pointer drags to the step instead of whole units", () => {
    const rect = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      { left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
    )
    try {
      render(<ObservedHarness initial={{ start: 0, end: 0.1 }} period={1} />)
      const end = screen.getByRole("slider", { name: "Date end" })
      fireEvent.pointerDown(end, pointerAt(0))
      // A quarter turn is 0.25 of a period-1 cycle (it used to round to 0).
      fireEvent.pointerMove(end, pointerAt(Math.PI / 2))
      expect(out()).toBe("0,0.25")
      fireEvent.pointerMove(end, pointerAt(Math.PI * 0.999))
      expect(out()).toBe("0,0.5")
      fireEvent.pointerUp(end, pointerAt(Math.PI))
    } finally {
      rect.mockRestore()
    }
  })

  it("reports the last step of the cycle as aria-valuemax", () => {
    render(<ObservedHarness period={1} initial={{ start: 0, end: 0.5 }} />)
    expect(screen.getByRole("slider", { name: "Date start" })).toHaveAttribute("aria-valuemax", "0.99")
    render(<CircularBrush value={{ start: 0, end: 6 }} onChange={() => {}} period={24} step={0.5} label="Hour" />)
    expect(screen.getByRole("slider", { name: "Hour end" })).toHaveAttribute("aria-valuemax", "23.5")
  })

  it("nudges half-hour steps without float noise and wraps at the period", () => {
    render(<ObservedHarness period={24} step={0.5} initial={{ start: 23.5, end: 6 }} />)
    const start = screen.getByRole("slider", { name: "Date start" })
    fireEvent.keyDown(start, { key: "ArrowLeft" })
    expect(out()).toBe("23,6")
    fireEvent.keyDown(start, { key: "ArrowRight" })
    fireEvent.keyDown(start, { key: "ArrowRight" })
    expect(out()).toBe("0,6")
  })

  it("steps a phase cycle by hundredths by default", () => {
    render(<ObservedHarness period={1} initial={{ start: 0.1, end: 0.2 }} />)
    const end = screen.getByRole("slider", { name: "Date end" })
    fireEvent.keyDown(end, { key: "ArrowRight" })
    expect(out()).toBe("0.1,0.21")
    fireEvent.keyDown(end, { key: "ArrowRight", shiftKey: true })
    expect(out()).toBe("0.1,0.31")
  })
})

describe("CircularBrush — Home, End, and page keys", () => {
  it("moves a handle to the first and last step and by largeStep", () => {
    render(<Harness />)
    const end = screen.getByRole("slider", { name: "Date end" })
    fireEvent.keyDown(end, { key: "End" })
    expect(out()).toBe("10,364")
    fireEvent.keyDown(end, { key: "Home" })
    expect(out()).toBe("10,0")
    fireEvent.keyDown(end, { key: "PageUp" })
    expect(out()).toBe("10,7")
    fireEvent.keyDown(end, { key: "PageDown" })
    expect(out()).toBe("10,0")
  })

  it("moves the whole range so its start lands on Home", () => {
    render(<Harness initial={{ start: 350, end: 20 }} />)
    fireEvent.keyDown(screen.getByRole("slider", { name: "Date (move both ends)" }), { key: "Home" })
    expect(out()).toBe("0,35")
  })
})

describe("CircularBrush — control observations", () => {
  it("emits start, change, and end for each keyboard nudge", () => {
    const onObservation = vi.fn()
    render(<ObservedHarness onObservation={onObservation} />)
    fireEvent.keyDown(screen.getByRole("slider", { name: "Date start" }), { key: "ArrowRight" })
    expect(onObservation.mock.calls.map(([o]) => o.type)).toEqual(["control-start", "control-change", "control-end"])
    expect(onObservation.mock.calls[1][0]).toMatchObject({
      controlType: "range-boundary",
      value: [11, 40],
      chartType: "CircularBrush",
      controlId: "season",
      chartId: "weather",
      source: "keyboard",
    })
  })

  it("reports each successive keyboard value before the parent re-renders", () => {
    const onObservation = vi.fn()
    render(<ObservedHarness onObservation={onObservation} />)
    const range = screen.getByRole("slider", { name: "Date (move both ends)" })
    fireEvent.keyDown(range, { key: "ArrowRight" })
    fireEvent.keyDown(range, { key: "ArrowRight" })
    const changes = onObservation.mock.calls.map(([o]) => o).filter((o) => o.type === "control-change")
    expect(changes.map((o) => o.value)).toEqual([[11, 41], [12, 42]])
  })

  it("emits one start and one end around a pointer drag", () => {
    const rect = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      { left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
    )
    try {
      const onObservation = vi.fn()
      render(<ObservedHarness period={4} step={1} initial={{ start: 0, end: 1 }} onObservation={onObservation} />)
      const end = screen.getByRole("slider", { name: "Date end" })
      fireEvent.pointerDown(end, pointerAt(Math.PI / 2))
      fireEvent.pointerMove(end, pointerAt(Math.PI))
      fireEvent.pointerMove(end, pointerAt(Math.PI * 1.5))
      fireEvent.pointerUp(end, pointerAt(Math.PI * 1.5))
      const observations = onObservation.mock.calls.map(([o]) => o)
      expect(observations.map((o) => o.type)).toEqual(["control-start", "control-change", "control-change", "control-end"])
      expect(observations.map((o) => o.value)).toEqual([[0, 2], [0, 2], [0, 3], [0, 3]])
      expect(observations.every((o) => o.source === "pointer")).toBe(true)
    } finally {
      rect.mockRestore()
    }
  })

  it("emits nothing for a click that doesn't change the value", () => {
    const rect = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
      { left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
    )
    try {
      const onObservation = vi.fn()
      render(<ObservedHarness period={4} step={1} initial={{ start: 0, end: 1 }} onObservation={onObservation} />)
      const end = screen.getByRole("slider", { name: "Date end" })
      fireEvent.pointerDown(end, pointerAt(Math.PI / 2))
      fireEvent.pointerUp(end, pointerAt(Math.PI / 2))
      expect(onObservation).not.toHaveBeenCalled()
    } finally {
      rect.mockRestore()
    }
  })
})

describe("CircularBrush — focus", () => {
  it("focuses the grabbed handle on pointerdown", () => {
    render(<Harness />)
    const start = screen.getByRole("slider", { name: "Date start" })
    fireEvent.pointerDown(start, { pointerId: 1, clientX: 200, clientY: 50 })
    expect(document.activeElement).toBe(start)
  })

  it("draws a focus ring for keyboard focus only", () => {
    // jsdom never matches :focus-visible; a browser does after keyboard focus.
    const matches = Element.prototype.matches
    const spy = vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, selector: string) {
      return selector === ":focus-visible" || matches.call(this, selector)
    })
    try {
      render(<Harness />)
      const start = screen.getByRole("slider", { name: "Date start" })
      const ring = () => start.querySelector('circle[fill="none"]')
      act(() => start.focus())
      expect(ring()).not.toBeNull()
      act(() => start.blur())
      expect(ring()).toBeNull()
      fireEvent.pointerDown(start, { pointerId: 1, clientX: 200, clientY: 50 })
      expect(document.activeElement).toBe(start)
      expect(ring()).toBeNull()
    } finally {
      spy.mockRestore()
    }
  })
})
