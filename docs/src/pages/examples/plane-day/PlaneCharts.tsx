import React, { useEffect, useRef, useState } from "react"
import { LineChart, XYCustomChart } from "semiotic/xy"
import { NetworkCustomChart } from "semiotic/network"
import { BarChart } from "semiotic/ordinal"
import { ThemeProvider } from "semiotic/themes/react"
import { delayProps, distributionProps } from "./chart-config"
import { networkProps, ribbonProps } from "./layouts"
import type { AircraftDay, Pattern, PlaneSnapshot, PlaneState } from "./types"

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(740)
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(180, Math.floor(entries[0].contentRect.width))),
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

export function FlightCharts({
  day,
  state,
  onSelect,
}: {
  day: AircraftDay
  state: PlaneState
  onSelect: (id: string) => void
}) {
  const { ref, width } = useWidth()
  const select = (datum: Record<string, unknown> | null) => {
    if (datum && typeof datum.eventId === "string") onSelect(datum.eventId)
  }
  return (
    <ThemeProvider theme="light">
      <div
        ref={ref}
        className="plane-charts"
        data-testid="flight-charts"
        data-selected-event={state.selected.eventId}
      >
        {state.view === "timeline" ? (
          <div className="plane-wide-ribbon">
            <XYCustomChart
              {...ribbonProps(day, state.selected.eventId)}
              width={width}
              onClick={select}
            />
          </div>
        ) : (
          <NetworkCustomChart
            {...networkProps(day, state.selected.eventId)}
            width={width}
            onClick={select}
          />
        )}
        <LineChart
          {...delayProps(day)}
          width={width}
          colorScheme={["#287a79"]}
          xFormat={(value) => (Number.isInteger(Number(value)) ? String(value) : "")}
          onClick={select}
        />
      </div>
    </ThemeProvider>
  )
}

export function CohortChart({
  snapshot,
  pattern,
}: {
  snapshot: PlaneSnapshot
  pattern: Pattern | "all"
}) {
  const { ref, width } = useWidth()
  return (
    <ThemeProvider theme="light">
      <div ref={ref}>
        <BarChart
          {...distributionProps(snapshot, pattern)}
          width={width}
          colorScheme={["#287a79"]}
        />
      </div>
    </ThemeProvider>
  )
}
