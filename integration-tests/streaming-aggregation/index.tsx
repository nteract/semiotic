import React, { useCallback, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { WaterfallChart } from "../../dist/xy.module.min.js"
import { useStreamStatus } from "../../dist/realtime.module.min.js"

function App() {
  const { ref, status } = useStreamStatus({
    pollIntervalMs: 100,
    staleThresholdMs: 500
  })
  const [width, setWidth] = useState(540)
  const [paused, setPaused] = useState(false)
  const [retained, setRetained] = useState("")
  const time = useRef(0)
  const clock = useCallback(() => time.current, [])
  const inspect = () =>
    setRetained(
      ref
        .current!.getData()
        .map((row) => `${row.id}:${Object.keys(row).join(",")}`)
        .join(";")
    )
  return (
    <>
      <button
        onClick={() => {
          ref.current!.pushMany(
            ["A", "B", "C", "D"].map((id) =>
              Object.freeze({ id, label: id, delta: 10 })
            )
          )
          inspect()
        }}
      >
        Push changes
      </button>
      <button onClick={() => setWidth(width === 540 ? 400 : 540)}>
        Resize chart
      </button>
      <button
        onClick={() => {
          setPaused(true)
          time.current = 10_000
        }}
      >
        Pause and advance clock
      </button>
      <button
        onClick={() => {
          ref.current!.clear()
          inspect()
        }}
      >
        Clear
      </button>
      <output data-testid="retained">{retained}</output>
      <output data-testid="hook-status">{status}</output>
      <div data-testid="chart">
        <WaterfallChart
          ref={ref}
          xAccessor="label"
          yAccessor="delta"
          pointIdAccessor="id"
          initialValue={100}
          width={width}
          height={300}
          margin={{ left: 40, right: 40, top: 40, bottom: 40 }}
          xExtent={[0, 4]}
          yExtent={[0, 150]}
          title="Running balance"
          accessibleTable
          tooltip={(row) => `${row.label}: ${row.baseline} → ${row.cumEnd}`}
          frameProps={{
            windowSize: 3,
            clock,
            paused,
            staleness: { threshold: 500, showBadge: true }
          }}
        />
      </div>
    </>
  )
}
createRoot(document.getElementById("root")!).render(<App />)
