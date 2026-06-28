import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import * as React from "react"
import { useState } from "react"
import { CircularBrush, type CircularBrushValue } from "./CircularBrush"

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
