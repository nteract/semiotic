import React, { useEffect } from "react"
import { render, screen } from "@testing-library/react"
import {
  ObservationProvider,
  useObservationSelector,
  type ChartObservation,
  type ObservationStoreState
} from "./store/ObservationStore"
import { ObservationReadout, observedDatum } from "./ObservationReadout"

function observation(
  type: ChartObservation["type"],
  extra: Record<string, unknown> = {}
): ChartObservation {
  return {
    type,
    timestamp: 1,
    chartType: "test-chart",
    ...extra
  } as ChartObservation
}

function PushObservation({ value }: { value: ChartObservation }) {
  const push = useObservationSelector(
    (state: ObservationStoreState) => state.pushObservation
  )

  useEffect(() => {
    push(value)
  }, [push, value])

  return null
}

describe("ObservationReadout", () => {
  it("shows fallback content before an observation", () => {
    render(
      <ObservationReadout observation={null} fallback="Nothing selected">
        {(datum) => String(datum.label)}
      </ObservationReadout>
    )

    expect(screen.getByText("Nothing selected")).toBeInTheDocument()
  })

  it("unwraps observed frame data and renders it in a polite live region", () => {
    render(
      <ObservationReadout
        as="output"
        observation={observation("hover", {
          datum: { data: { label: "Candidate cause" } },
          x: 20,
          y: 30
        })}
      >
        {(datum) => String(datum.label)}
      </ObservationReadout>
    )

    const readout = screen.getByText("Candidate cause")
    expect(readout.tagName).toBe("OUTPUT")
    expect(readout).toHaveAttribute("aria-live", "polite")
    expect(readout).toHaveAttribute("aria-atomic", "true")
  })

  it("returns to fallback content on an end event", () => {
    const { rerender } = render(
      <ObservationReadout
        observation={observation("hover", {
          datum: { label: "Active" },
          x: 20,
          y: 30
        })}
        fallback="Editorial note"
      >
        {(datum) => String(datum.label)}
      </ObservationReadout>
    )

    rerender(
      <ObservationReadout
        observation={observation("hover-end")}
        fallback="Editorial note"
      >
        {(datum) => String(datum.label)}
      </ObservationReadout>
    )

    expect(screen.getByText("Editorial note")).toBeInTheDocument()
  })

  it("normalizes selection fields", () => {
    const selected = observedDatum(
      observation("selection", {
        selection: { name: "region", fields: { region: "West" } }
      })
    )

    expect(selected).toEqual({ region: "West" })
  })

  it("can subscribe to observations by chart ID", async () => {
    const hover = observation("hover", {
      chartId: "target-chart",
      datum: { label: "Stored observation" },
      x: 20,
      y: 30
    })

    render(
      <ObservationProvider>
        <PushObservation value={hover} />
        <ObservationReadout chartId="target-chart" fallback="Waiting">
          {(datum) => String(datum.label)}
        </ObservationReadout>
      </ObservationProvider>
    )

    expect(await screen.findByText("Stored observation")).toBeInTheDocument()
  })
})
