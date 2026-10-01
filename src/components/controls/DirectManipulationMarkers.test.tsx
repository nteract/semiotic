import React from "react"
import { fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DirectManipulationMarkers, type DirectManipulationMarkersProps } from "./DirectManipulationMarkers"

// Identity screen transform: client x is local x, and value = x / 4.
const originalCTM = (SVGElement.prototype as unknown as { getScreenCTM?: unknown }).getScreenCTM
beforeEach(() => {
  ;(SVGElement.prototype as unknown as { getScreenCTM: () => DOMMatrixInit }).getScreenCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
})
afterEach(() => {
  ;(SVGElement.prototype as unknown as { getScreenCTM?: unknown }).getScreenCTM = originalCTM
})

function Harness(props: Partial<DirectManipulationMarkersProps> & { initial: number[]; onValues?: (values: number[]) => void }) {
  const { initial, onValues, ...rest } = props
  const [values, setValues] = React.useState(initial)
  return (
    <svg>
      <DirectManipulationMarkers
        values={values}
        markers={[{ label: "Baseline" }, { label: "Max" }]}
        min={0}
        max={100}
        valueToPoint={(value) => ({ x: value * 4, y: 10 })}
        pointToValue={(point) => point.x / 4}
        label="Quota markers"
        {...rest}
        onChange={(next, meta) => {
          setValues(next)
          onValues?.(next)
          rest.onChange?.(next, meta)
        }}
      />
    </svg>
  )
}

const at = (clientX: number) => ({ pointerId: 1, button: 0, clientX, clientY: 10 })

describe("DirectManipulationMarkers", () => {
  it("renders one bounded slider per marker inside a labelled group", () => {
    const view = render(<Harness initial={[20, 60]} />)
    expect(view.getByRole("group", { name: "Quota markers" })).toBeTruthy()
    const [baseline, max] = view.getAllByRole("slider")
    expect(baseline.getAttribute("aria-label")).toBe("Baseline")
    expect([baseline.getAttribute("aria-valuemin"), baseline.getAttribute("aria-valuemax")]).toEqual(["0", "60"])
    expect([max.getAttribute("aria-valuemin"), max.getAttribute("aria-valuemax")]).toEqual(["20", "100"])
    expect(baseline.hasAttribute("aria-roledescription")).toBe(false)
  })

  it("keeps ordered handles from crossing on the keyboard and commits each change", () => {
    const onValues = vi.fn()
    const onChangeEnd = vi.fn()
    const view = render(<Harness initial={[58, 60]} onValues={onValues} onChangeEnd={onChangeEnd} step={1} largeStep={10} />)
    const [baseline] = view.getAllByRole("slider")
    fireEvent.keyDown(baseline, { key: "PageUp" })
    expect(onValues).toHaveBeenLastCalledWith([60, 60])
    expect(onChangeEnd).toHaveBeenLastCalledWith([60, 60], { index: 0, source: "keyboard" })
    fireEvent.keyDown(baseline, { key: "ArrowUp" })
    expect(onValues).toHaveBeenCalledTimes(1)
  })

  it("lets either coincident handle be dragged off the other by direction", () => {
    const onValues = vi.fn()
    const view = render(<Harness initial={[50, 50]} onValues={onValues} />)
    const handles = view.getAllByRole("slider")
    // Press the handle painted on top (the max), then drag toward lower values:
    // the baseline moves, and the max stays put.
    fireEvent.pointerDown(handles[1], at(200))
    fireEvent.pointerMove(handles[1], at(200))
    expect(onValues).not.toHaveBeenCalled()
    fireEvent.pointerMove(handles[1], at(160))
    fireEvent.pointerUp(handles[1], at(160))
    expect(onValues).toHaveBeenLastCalledWith([40, 50])

    // Rejoin them, then drag the lower-painted baseline toward higher values:
    // the max moves instead of the baseline being stuck at its upper bound.
    fireEvent.pointerDown(handles[0], at(160))
    fireEvent.pointerMove(handles[0], at(200))
    fireEvent.pointerUp(handles[0], at(200))
    expect(onValues).toHaveBeenLastCalledWith([50, 50])
    fireEvent.pointerDown(handles[0], at(200))
    fireEvent.pointerMove(handles[0], at(240))
    fireEvent.pointerUp(handles[0], at(240))
    expect(onValues).toHaveBeenLastCalledWith([50, 60])
  })

  it("reports the moved handle on pointer release", () => {
    const onChangeEnd = vi.fn()
    const view = render(<Harness initial={[50, 50]} onChangeEnd={onChangeEnd} />)
    const handles = view.getAllByRole("slider")
    fireEvent.pointerDown(handles[0], at(200))
    fireEvent.pointerMove(handles[0], at(280))
    fireEvent.pointerUp(handles[0], at(280))
    expect(onChangeEnd).toHaveBeenLastCalledWith([50, 70], { index: 1, source: "pointer" })
  })

  it("lets unordered handles pass each other", () => {
    const onValues = vi.fn()
    const view = render(<Harness initial={[20, 60]} ordered={false} onValues={onValues} />)
    const [baseline] = view.getAllByRole("slider")
    fireEvent.pointerDown(baseline, at(80))
    fireEvent.pointerMove(baseline, at(360))
    fireEvent.pointerUp(baseline, at(360))
    expect(onValues).toHaveBeenLastCalledWith([90, 60])
  })
})
