import React, { useCallback, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { LikertChart } from "../../dist/ordinal.module.min.js"
import { DifferenceChart, WaterfallChart } from "../../dist/xy.module.min.js"
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
function SurveyAndDifference() {
  const survey = useRef<React.ElementRef<typeof LikertChart>>(null)
  const difference = useRef<React.ElementRef<typeof DifferenceChart>>(null)
  const [width, setWidth] = useState(480)
  const margin = { top: 20, right: 40, bottom: 40, left: 60 }
  const edit = () => {
    survey.current!.pushMany([
      { id: "a", question: "Service", score: 1 },
      { id: "b", question: "Service", score: 1 }
    ])
    survey.current!.remove("a")
    survey.current!.update("b", row => ({ ...row, score: 2 }))
    survey.current!.push({ id: "c", question: "Service", score: 2 })
    difference.current!.pushMany([{ id: "end", x: 10, a: 2, b: 9 }, { id: "start", x: 0, a: 8, b: 2 }])
    difference.current!.update("end", row => ({ ...row, a: 8, b: 2 }))
  }
  return <>
    <button onClick={edit}>Edit responses and series</button>
    <button onClick={() => setWidth(360)}>Resize charts</button>
    <div data-testid="survey">
      <LikertChart ref={survey} width={width} height={220} margin={margin} orientation="vertical"
        levels={["No", "Yes"]} categoryAccessor="question" valueAccessor="score" dataIdAccessor="id" showLegend={false} />
    </div>
    <div data-testid="difference">
      <DifferenceChart ref={difference} width={width} height={220} margin={margin} tooltip="multi"
        xAccessor="x" seriesAAccessor="a" seriesBAccessor="b" pointIdAccessor="id" showLegend={false} />
    </div>
  </>
}

createRoot(document.getElementById("root")!).render(
  new URLSearchParams(location.search).has("survey") ? <SurveyAndDifference /> : <App />
)
