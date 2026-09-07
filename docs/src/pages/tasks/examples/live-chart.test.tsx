import React, { StrictMode } from "react"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { prepareChart } from "semiotic/ai/core"
import LiveChartExample, { LiveChartSession } from "./LiveChartExample"
import { createLiveSource, INITIAL_OBSERVATIONS, liveChartProps } from "./live-chart"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function retainedRows() {
  return within(screen.getByRole("table", { name: "Records currently retained by the chart" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.textContent)
}

describe("live chart task", () => {
  it("validates a renderable initial snapshot without claiming static verification proves its lifecycle", () => {
    const result = prepareChart(
      {
        component: "LineChart",
        props: { ...liveChartProps, data: INITIAL_OBSERVATIONS },
      },
      { data: INITIAL_OBSERVATIONS },
    )
    expect(result.reasons).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.validation.valid).toBe(true)
    expect(result.props.data).toEqual(INITIAL_OBSERVATIONS)
  })

  it("corrects a stable ID in place and removes the oldest records from the real chart store", () => {
    const source = createLiveSource()
    render(
      <StrictMode>
        <LiveChartSession source={source} />
      </StrictMode>,
    )
    expect(source.subscriberCount).toBe(1)
    expect(retainedRows()).toEqual(["obs-0109:0012", "obs-0209:0118", "obs-0309:0215"])
    fireEvent.click(screen.getByRole("button", { name: "Advance source" }))
    expect(retainedRows()).toEqual(["obs-0109:0012", "obs-0209:0114", "obs-0309:0215"])
    fireEvent.click(screen.getByRole("button", { name: "Advance source" }))
    fireEvent.click(screen.getByRole("button", { name: "Advance source" }))
    expect(retainedRows()).toEqual([
      "obs-0209:0114",
      "obs-0309:0215",
      "obs-0409:0320",
      "obs-0509:0416",
    ])
    fireEvent.click(screen.getByRole("button", { name: "Advance source" }))
    fireEvent.click(screen.getByRole("button", { name: "Advance source" }))
    expect(retainedRows()).toEqual([
      "obs-0309:0217",
      "obs-0409:0320",
      "obs-0509:0416",
      "obs-0609:0519",
    ])
    expect(screen.getByRole("button", { name: "Advance source" })).toBeDisabled()
  })

  it("freezes while disconnected and reconciles missed corrections and retention on reconnect", () => {
    const source = createLiveSource()
    const view = render(<LiveChartSession source={source} />)
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }))
    expect(source.subscriberCount).toBe(0)
    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Advance source" }))
    }
    expect(retainedRows()).toEqual(["obs-0109:0012", "obs-0209:0118", "obs-0309:0215"])
    expect(screen.getByTestId("live-chart-status")).toHaveTextContent("5 unapplied events")
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }))
    expect(source.subscriberCount).toBe(1)
    expect(retainedRows()).toEqual([
      "obs-0309:0217",
      "obs-0409:0320",
      "obs-0509:0416",
      "obs-0609:0519",
    ])
    expect(screen.getByTestId("live-chart-status")).toHaveTextContent("Display is current")
    view.unmount()
    expect(source.subscriberCount).toBe(0)
  })

  it("cleans up replay timers on pause, disconnect and unmount, including StrictMode", () => {
    vi.useFakeTimers()
    const source = createLiveSource()
    const view = render(
      <StrictMode>
        <LiveChartSession source={source} />
      </StrictMode>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Play replay" }))
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(source.cursor).toBe(1)
    expect(retainedRows()[1]).toBe("obs-0209:0114")
    fireEvent.click(screen.getByRole("button", { name: "Pause replay" }))
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(source.cursor).toBe(1)
    fireEvent.click(screen.getByRole("button", { name: "Play replay" }))
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }))
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(source.cursor).toBe(1)
    expect(source.subscriberCount).toBe(0)
    fireEvent.click(screen.getByRole("button", { name: "Reconnect" }))
    fireEvent.click(screen.getByRole("button", { name: "Play replay" }))
    view.unmount()
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(source.cursor).toBe(1)
    expect(source.subscriberCount).toBe(0)
  })

  it("restarts with the original observations instead of appending to the old session", () => {
    render(<LiveChartExample />)
    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Advance source" }))
    }
    fireEvent.click(screen.getByRole("button", { name: "Restart fixture" }))
    expect(retainedRows()).toEqual(["obs-0109:0012", "obs-0209:0118", "obs-0309:0215"])
    expect(screen.getByTestId("live-chart-status")).toHaveTextContent("Source event 0 of 5")
  })
})
