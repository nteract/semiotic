import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  LinkedCharts,
  useBrushSelection,
  useFilteredData,
  useSelection
} from "../../dist/semiotic.module.min.js"
import { Scatterplot } from "../../dist/xy.module.min.js"
import type { RealtimeFrameHandle } from "../../src/components/realtime/types"

const rows = [
  { id: "both", x: 1, y: 1, value: 0, category: "A" },
  { id: "range-only", x: 2, y: 1, value: 1, category: "B" },
  { id: "category-only", x: 3, y: 1, value: 10, category: "A" },
  { id: "missing", x: 4, y: 1, value: null, category: "A" }
]

const pointProps = {
  width: 280,
  height: 180,
  margin: { left: 20, right: 20, top: 20, bottom: 20 },
  xAccessor: "x",
  yAccessor: "y",
  xExtent: [0, 5] as [number, number],
  yExtent: [0, 2] as [number, number],
  showAxes: false,
  showLegend: false,
  animate: false,
  pointRadius: 9,
  pointOpacity: 1,
  color: "#1460aa"
}

function CrossfilterControls() {
  const range = useBrushSelection({ name: "dash", xField: "value" })
  const category = useSelection({ name: "dash", clientId: "category-chart" })
  const filtered = useFilteredData(rows, "dash", "third-chart")
  return (
    <>
      <button onClick={() => range.brushInteraction.end([-5, 5])}>
        Brush around zero
      </button>
      <button onClick={() => category.selectPoints({ category: ["A"] })}>
        Select category A
      </button>
      <button onClick={() => category.clear()}>Clear category</button>
      <button onClick={() => range.clear()}>Clear brush</button>
      <output data-testid="filtered-rows">
        {filtered.map((d) => d.id).join(",")}
      </output>
      <div data-testid="crossfilter-target">
        <Scatterplot
          {...pointProps}
          data={rows}
          title="Crossfilter result"
          selection={{ name: "dash", unselectedOpacity: 0.1 }}
        />
      </div>
    </>
  )
}

function datedRows() {
  return [
    { id: "first", x: 1, y: 1, time: new Date("2026-01-01T00:00:00Z") },
    { id: "later", x: 4, y: 1, time: new Date("2026-01-02T00:00:00Z") }
  ]
}
const sourceRows = datedRows()
const boundedRows = datedRows()
const pushedRows = datedRows()

function DateCharts() {
  const [width, setWidth] = useState(280)
  const pushedRef = useRef<RealtimeFrameHandle>(null)
  useEffect(() => {
    pushedRef.current?.pushMany(pushedRows)
  }, [])
  return (
    <>
      <button onClick={() => setWidth(220)}>Resize Date charts</button>
      <div style={{ display: "flex", gap: 8 }}>
        <div data-testid="date-source">
          <Scatterplot
            {...pointProps}
            width={width}
            data={sourceRows}
            title="Date source"
            linkedHover={{ name: "dates", fields: ["time"] }}
            tooltip={(datum) => (
              <span>
                {datum.id}: {datum.time.toISOString()}
              </span>
            )}
          />
        </div>
        <div data-testid="date-bounded">
          <Scatterplot
            {...pointProps}
            width={width}
            data={boundedRows}
            title="Bounded Date target"
            selection={{ name: "dates", unselectedOpacity: 0.1 }}
          />
        </div>
        <div data-testid="date-pushed">
          <Scatterplot
            {...pointProps}
            width={width}
            ref={pushedRef}
            title="Pushed Date target"
            selection={{ name: "dates", unselectedOpacity: 0.1 }}
          />
        </div>
      </div>
    </>
  )
}

createRoot(document.getElementById("root")!).render(
  <>
    <LinkedCharts
      showLegend={false}
      selections={{ dash: { resolution: "crossfilter" } }}
    >
      <CrossfilterControls />
    </LinkedCharts>
    <LinkedCharts showLegend={false}>
      <DateCharts />
    </LinkedCharts>
  </>
)
