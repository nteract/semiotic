import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  BarChart,
  FunnelChart,
  StackedBarChart,
  StreamOrdinalFrame
} from "../../dist/ordinal.module.min.js"
import type { StreamOrdinalFrameHandle } from "../../src/components/stream/ordinalTypes"
import type { Datum } from "../../src/components/charts/shared/datumTypes"

const params = new URLSearchParams(location.search)
const kind = params.get("kind") || "bars"
const push = params.get("input") === "push"
const orientation =
  params.get("orientation") === "horizontal" ? "horizontal" : "vertical"
const margin = { left: 40, right: 20, top: 40, bottom: 20 }
const timelineRows = [
  { id: "a", category: "A", value: [0, 10] },
  { id: "b", category: "B", value: [20, 30] }
]

function App() {
  const [width, setWidth] = useState(500)
  const [changed, setChanged] = useState(false)
  const ref = useRef<StreamOrdinalFrameHandle>(null)
  const data =
    kind === "bars"
      ? [
          { category: "A", series: "Positive", value: changed ? 12 : 10 },
          { category: "A", series: "Positive", value: -4 },
          { category: "A", series: "Negative", value: -4 }
        ]
      : kind === "funnel"
        ? [
            { category: "Visit", value: changed ? 40 : 60 },
            { category: "Visit", value: changed ? 40 : 60 },
            { category: "Signup", value: 20 }
          ]
        : [10, 0, 30].map((weight, i) => ({
            category: String.fromCharCode(65 + i),
            value: 10,
            weight: changed ? [30, 0, 10][i] : weight
          }))
  useEffect(() => {
    if (kind === "timeline") {
      ref.current?.pushMany(timelineRows)
    } else if (push) {
      ref.current?.clear()
      ref.current?.pushMany(data)
    }
  }, [changed])
  const common = {
    ref,
    width,
    height: 260,
    margin,
    showLegend: false,
    data: push ? undefined : data,
    color: "#139f6b",
    sort: false,
    title: "Ordinal domains",
    description: "Values and categories retain their rendered proportions.",
    frameProps: { oSort: false, extentPadding: 0, barPadding: 0 }
  }
  const aggregateTooltip = (d: Datum) => (
    <div>
      {d.series ?? d.category}: {d.__aggregateValue}
    </div>
  )
  return (
    <main>
      <button onClick={() => setWidth(380)}>Resize chart</button>
      <button onClick={() => setChanged(true)}>Replace data</button>
      <button
        onClick={() =>
          ref.current?.push({ id: "c", category: "C", value: [50, 40] })
        }
      >
        Evict oldest interval
      </button>
      <section data-testid="chart">
        {kind === "bars" ? (
          <StackedBarChart
            {...common}
            categoryAccessor="category"
            valueAccessor="value"
            stackBy="series"
            normalize
            orientation={orientation}
            tooltip={aggregateTooltip}
          />
        ) : kind === "funnel" ? (
          <FunnelChart
            {...common}
            stepAccessor="category"
            valueAccessor="value"
            orientation="vertical"
          />
        ) : kind === "columns" ? (
          <BarChart
            {...common}
            categoryAccessor="category"
            valueAccessor="value"
            orientation={orientation}
            tooltip={aggregateTooltip}
            frameProps={{ ...common.frameProps, dynamicColumnWidth: "weight" }}
          />
        ) : (
          <StreamOrdinalFrame
            ref={ref}
            chartType="timeline"
            size={[width, 260]}
            margin={margin}
            oAccessor="category"
            rAccessor="value"
            projection="horizontal"
            oSort={false}
            windowSize={2}
            extentPadding={0}
            barPadding={0}
            showAxes
            hoverAnnotation
            title="Retained intervals"
            description="Only the two most recent intervals are retained."
            tooltipContent={(d) => (
              <div>
                {d.data.category}: {d.data.value.join("–")}
              </div>
            )}
          />
        )}
      </section>
    </main>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
