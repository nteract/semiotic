import React, { useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { Scatterplot } from "../../dist/xy.module.min.js"
import { BarChart } from "../../dist/ordinal.module.min.js"
import type { StreamXYFrameHandle } from "../../src/components/stream/types"
import type { StreamOrdinalFrameHandle } from "../../src/components/stream/ordinalTypes"

const rows = [
  { id: "a", name: "Alpha", x: 2, value: 25 },
  { id: "b", name: "Beta", x: 5, value: 50 },
  { id: "c", name: "Gamma", x: 8, value: 75 }
]
const family = new URLSearchParams(location.search).get("family") ?? "xy"
const mode =
  new URLSearchParams(location.search).get("mode") === "growing"
    ? "growing"
    : "sliding"
function App() {
  const ref = useRef<StreamXYFrameHandle & StreamOrdinalFrameHandle>(null)
  const [data, setData] = useState(rows)
  const [width, setWidth] = useState(540)
  const [capacity, setCapacity] = useState(2)
  const [retained, setRetained] = useState("")
  const [hover, setHover] = useState("none")
  const inspect = () =>
    setRetained(
      ref
        .current!.getData()
        .map((d) => d.id)
        .join(",")
    )
  const common = {
    ref,
    data,
    width,
    height: 300,
    margin: { left: 40, right: 40, top: 40, bottom: 40 },
    accessibleTable: true,
    tooltip: (d: (typeof rows)[number]) => `${d.name}: ${d.value}`,
    frameProps: {
      windowSize: capacity,
      windowMode: mode,
      maxCapacity: 8,
      pointIdAccessor: "id",
      dataIdAccessor: "id",
      customHoverBehavior: (h: { data: (typeof rows)[number] } | null) =>
        setHover(h?.data?.id ?? "none")
    }
  }
  return (
    <>
      <button onClick={() => setWidth(width === 540 ? 400 : 540)}>
        Resize chart
      </button>
      <button
        onClick={() => {
          ref.current!.clear()
          inspect()
        }}
      >
        Clear
      </button>
      <button
        onClick={() => {
          ref.current!.update("b", (d) => ({ ...d, value: 60 }))
          inspect()
        }}
      >
        Update Beta
      </button>
      <button
        onClick={() => {
          ref.current!.push({ id: "d", name: "Delta", x: 9, value: 90 })
          inspect()
        }}
      >
        Push Delta
      </button>
      <button
        onClick={() => setData(rows.map((d) => ({ ...d, value: d.value + 1 })))}
      >
        Replace
      </button>
      <button onClick={() => setCapacity(1)}>Shrink</button>
      <button onClick={inspect}>Inspect</button>
      <output data-testid="retained">{retained}</output>
      <output data-testid="hover">{hover}</output>
      <div data-testid="chart">
        {family === "xy" ? (
          <Scatterplot
            {...common}
            xAccessor="x"
            yAccessor="value"
            xExtent={[0, 10]}
            yExtent={[0, 100]}
            pointRadius={8}
          />
        ) : (
          <BarChart
            {...common}
            categoryAccessor="name"
            valueAccessor="value"
            valueExtent={[0, 100]}
          />
        )}
      </div>
    </>
  )
}
createRoot(document.getElementById("root")!).render(<App />)
