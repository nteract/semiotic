import React, { useEffect, useRef, useState } from "react"
import type { RealtimeFrameHandle } from "semiotic/realtime"
import { LineChart } from "../../dist/xy.module.min.js"
import { BarChart } from "../../dist/ordinal.module.min.js"
import { RealtimeHistogram } from "../../dist/realtime.module.min.js"
import { renderChartWithEvidence } from "../../dist/server.module.min.js"

const margin = { top: 10, bottom: 40, left: 40, right: 10 }
const lineData = [
  "First long series name",
  "Second long series name",
  "Third long series name"
].flatMap((series) => [
  { x: 0, y: 600, series },
  { x: 1, y: 2100, series }
])
const bins = [600, 1340, 900].map((value, i) => ({ time: i * 10, value }))

export function RoundedAxesFixture() {
  const [wide, setWide] = useState(false)
  const histogram = useRef<RealtimeFrameHandle>(null)
  useEffect(() => {
    histogram.current!.pushMany(bins)
  }, [])
  const width = wide ? 720 : 300
  const props = {
    data: lineData,
    xAccessor: "x" as const,
    yAccessor: "y" as const,
    lineBy: "series" as const,
    colorBy: "series" as const,
    tooltip: (datum: { y: number }) => <span>Value: {datum.y}</span>,
    width,
    height: 180,
    margin,
    yExtent: [0] as [number],
    yFormat: String,
    axisExtent: "rounded" as const,
    showLegend: true,
    legendPosition: "bottom" as const
  }
  const server = renderChartWithEvidence("LineChart", props)
  return (
    <main style={{ padding: 20, fontFamily: "Arial" }}>
      <button onClick={() => setWide((value) => !value)}>
        Resize rounded charts
      </button>
      <button
        onClick={() => histogram.current!.push({ time: 40, value: 2100 })}
      >
        Push larger bin
      </button>
      <div data-testid="rounded-line">
        <LineChart {...props} />
      </div>
      <div
        data-testid="rounded-server"
        data-domain={JSON.stringify(server.evidence.yDomain)}
        data-plot-height={server.evidence.plot.height}
        dangerouslySetInnerHTML={{ __html: server.svg }}
      />
      <div data-testid="rounded-histogram">
        <RealtimeHistogram
          ref={histogram}
          width={width}
          height={180}
          margin={margin}
          binSize={10}
          timeExtent={[0, 50]}
          axisExtent="rounded"
          tickFormatValue={String}
        />
      </div>
      <div data-testid="rounded-bars">
        <BarChart
          data={[
            { category: "A", value: 1340 },
            { category: "B", value: 600 }
          ]}
          width={width}
          height={180}
          margin={margin}
          axisExtent="rounded"
          valueFormat={String}
        />
      </div>
    </main>
  )
}
