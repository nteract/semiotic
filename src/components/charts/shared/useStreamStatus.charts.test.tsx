import React from "react"
import { act, render } from "@testing-library/react"
import { useStreamStatus } from "./useStreamStatus"
import type { StreamStatusResult } from "./useStreamStatus"
import { Scatterplot } from "../xy/Scatterplot"
import { BubbleChart } from "../xy/BubbleChart"
import { FlowMap } from "../geo/FlowMap"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

let cleanup: () => void
beforeEach(() => {
  vi.useFakeTimers()
  cleanup = setupCanvasMock()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it.each(["scatter", "bubble", "flow"])(
  "observes the real %s chart's overridden handle",
  (family) => {
    let observed!: StreamStatusResult
    function Chart() {
      observed = useStreamStatus({ staleThresholdMs: 500, pollIntervalMs: 100 })
      const ref = observed.ref
      return (
        <>
          <span>{observed.status}</span>
          {family === "scatter" ? (
            <Scatterplot ref={ref} xAccessor="x" yAccessor="y" />
          ) : family === "bubble" ? (
            <BubbleChart ref={ref} xAccessor="x" yAccessor="y" sizeBy="value" />
          ) : (
            <FlowMap
              ref={ref}
              nodes={[
                { id: "a", lon: 0, lat: 0 },
                { id: "b", lon: 10, lat: 10 }
              ]}
            />
          )}
        </>
      )
    }
    const result = render(<Chart />)
    act(() =>
      observed.ref.current!.push({
        x: 1,
        y: 2,
        value: 3,
        source: "a",
        target: "b"
      })
    )
    expect(result.getByText("active").textContent).toBe("active")
    act(() => {
      expect(observed.ref.current!.getData()).toHaveLength(1)
    })
    act(() => vi.advanceTimersByTime(1000))
    expect(result.getByText("stale").textContent).toBe("stale")
    act(() =>
      observed.ref.current!.pushMany([
        { x: 2, y: 3, value: 4, source: "b", target: "a" }
      ])
    )
    expect(result.getByText("active").textContent).toBe("active")
  }
)
