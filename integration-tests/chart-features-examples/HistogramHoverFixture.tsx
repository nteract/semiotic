import React, { useEffect, useRef, useState } from "react"
import {
  RealtimeHistogram,
  TemporalHistogram,
  type RealtimeHistogramProps,
  type RealtimeFrameHandle
} from "../../dist/realtime.module.min.js"

const data = [5, 15, 25].flatMap((time) => [
  { time, value: 4, kind: "North" },
  { time, value: 4, kind: "South" }
])

export function HistogramHoverFixture() {
  const params = new URLSearchParams(location.search)
  const push = params.has("push")
  const stacked = !params.has("single")
  const narrow = params.has("narrow")
  const [compact, setCompact] = useState(false)
  const [hover, setHover] = useState("none")
  const ref = useRef<RealtimeFrameHandle>(null)
  useEffect(() => {
    if (push) ref.current?.pushMany(data)
  }, [push])
  const props: RealtimeHistogramProps = {
    binSize: 10,
    mode: params.has("mobile") ? "mobile" : undefined,
    width: narrow ? 420 : undefined,
    responsiveWidth: true,
    height: 260,
    timeExtent: [0, 30] as [number, number],
    valueExtent: [0, 10] as [number, number],
    margin: { left: 50, right: 20, top: 20, bottom: 40 },
    showGrid: true,
    axes: [
      { orient: "bottom" as const, grid: false },
      { orient: "left" as const }
    ],
    hoverHighlight: true,
    showLegend: false,
    categoryAccessor: stacked ? "kind" : undefined,
    colors: { North: "#c83232", South: "#3232c8" },
    fill: "#c83232",
    title: "Events by time bin",
    tooltip: params.has("no-tooltip") ? (false as const) : undefined,
    onHover: (datum) => setHover(datum ? String(datum.data.binStart) : "none")
  }
  return (
    <main>
      <button onClick={() => setCompact((value) => !value)}>
        Resize histogram
      </button>
      <output data-testid="hovered-bin">{hover}</output>
      <section
        data-testid="histogram-hover"
        style={{ width: compact || narrow ? 420 : 720 }}
      >
        {push ? (
          <RealtimeHistogram {...props} ref={ref} />
        ) : (
          <TemporalHistogram {...props} data={data} />
        )}
      </section>
    </main>
  )
}
