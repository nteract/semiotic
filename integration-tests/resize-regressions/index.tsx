import React, { useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { LineChart, Scatterplot } from "../../dist/xy.module.min.js"
import type { StreamXYFrameHandle } from "../../src/components/stream/types"
import type { Datum } from "../../src/components/charts/shared/datumTypes"

const params = new URLSearchParams(location.search)
const kind = params.get("kind") || "scatter"
const push = params.get("input") === "push"
const scale = params.get("scale") === "log" ? "log" : "linear"
const direction = params.get("direction") === "left" ? "left" : "right"
const margin = { left: 40, right: 20, top: 40, bottom: 20 }
const frameProps = { arrowOfTime: direction, scalePadding: 0 }
const transition = { duration: 800, easing: "linear", intro: false } as const
const tooltip = (d: Datum) => (
  <div>
    {d.id}: {d.x}, {d.y}
  </div>
)

function App() {
  const [width, setWidth] = useState(500)
  const [changed, setChanged] = useState(false)
  const [phase, setPhase] = useState("initial")
  const ref = useRef<StreamXYFrameHandle>(null)
  const rows = useMemo(
    () => [
      { id: "Alpha", x: changed ? 10 : 4, y: changed ? 6 : 3, shape: "a" },
      { id: "Beta", x: 40, y: 8, shape: "b" }
    ],
    [changed]
  )
  useEffect(() => {
    if (!push) return
    if (!changed) ref.current?.pushMany(rows)
    else ref.current?.update("Alpha", () => rows[0])
  }, [rows])
  const common = {
    ref,
    data: push ? undefined : rows,
    width,
    height: 260,
    margin,
    xAccessor: "x",
    yAccessor: "y",
    pointIdAccessor: "id",
    xExtent: [1, 100],
    yExtent: [0, 10],
    xScaleType: scale,
    showLegend: false,
    color: "#139f6b",
    pointRadius: 7,
    pointOpacity: 1,
    tooltip,
    frameProps,
    animate: kind === "symbols" ? false : transition,
    title: "Resize regression",
    description: "Retained marks stay aligned with axes."
  }
  return (
    <main>
      <button
        onClick={() => {
          setChanged(true)
          setPhase("transition")
          setTimeout(() => {
            setWidth(380)
            setPhase("resized")
          }, 180)
        }}
      >
        Update and resize
      </button>
      <button
        onClick={() => {
          setWidth(500)
          setPhase("restored")
        }}
      >
        Restore width
      </button>
      <output data-testid="phase">{phase}</output>
      <section data-testid="chart">
        {kind === "line" ? (
          <LineChart {...common} showPoints />
        ) : (
          <Scatterplot
            {...common}
            symbolBy={kind === "symbols" ? "shape" : undefined}
          />
        )}
      </section>
    </main>
  )
}
createRoot(document.getElementById("root")!).render(<App />)
