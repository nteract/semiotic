import React, { useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  LinkedCharts,
  useChartObserver
} from "../../dist/semiotic.module.min.js"
import { Scatterplot } from "../../dist/xy.module.min.js"
import {
  useChartInterrogation,
  useChartObserver as useAIObserver
} from "../../dist/semiotic-ai.module.min.js"
import type { InterrogationResult } from "../../src/components/store/useChartInterrogation"

const data = [
  { id: "A", x: 2, y: 3 },
  { id: "B", x: 8, y: 7 }
]

function Observations() {
  const [width, setWidth] = useState(320)
  const observer = useChartObserver()
  const aiObserver = useAIObserver()
  const [saved, setSaved] = useState(observer.observations)
  const hovered = useMemo(
    () =>
      observer.observations
        .filter((o) => o.type === "hover")
        .map((o) => o.datum.id)
        .join(","),
    [observer.observations]
  )
  return (
    <>
      <button onClick={() => setWidth(400)}>Resize chart</button>
      <button onClick={() => setSaved(observer.observations)}>
        Capture observations
      </button>
      <button onClick={observer.clear}>Clear observations</button>
      <output data-testid="hovered">{hovered}</output>
      <output data-testid="saved">
        {saved
          .filter((o) => o.type === "hover")
          .map((o) => o.datum.id)
          .join(",")}
      </output>
      <output data-testid="counts">
        {observer.observations.length}:{aiObserver.observations.length}
      </output>
      <div data-testid="observed-chart">
        <Scatterplot
          data={data}
          width={width}
          height={200}
          margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
          xAccessor="x"
          yAccessor="y"
          xExtent={[0, 10]}
          yExtent={[0, 10]}
          pointRadius={9}
          color="#1460aa"
          showAxes={false}
          showLegend={false}
          animate={false}
          chartId="observed"
          onObservation={() => {}}
          tooltip={(d) => <span>Observed {d.id}</span>}
        />
      </div>
    </>
  )
}

function Questions() {
  const pending = useRef(
    new Map<string, (value: InterrogationResult) => void>()
  )
  const query = useChartInterrogation({
    data,
    onQuery: (question) =>
      new Promise((resolve) => {
        pending.current.set(question, resolve)
      })
  })
  return (
    <>
      {["first", "second"].map((name) => (
        <React.Fragment key={name}>
          <button
            onClick={() => {
              void query.ask(name)
            }}
          >
            Ask {name}
          </button>
          <button
            onClick={() =>
              pending.current.get(name)?.({
                answer: `${name} answer`,
                annotations: [{ id: name }]
              })
            }
          >
            Resolve {name}
          </button>
        </React.Fragment>
      ))}
      <button onClick={query.reset}>Reset conversation</button>
      <output data-testid="loading">{String(query.loading)}</output>
      <output data-testid="transcript">
        {query.history.map((message) => message.text).join("|")}
      </output>
      <output data-testid="annotations">
        {query.annotations.map((annotation) => annotation.id).join(",")}
      </output>
    </>
  )
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LinkedCharts>
      <Observations />
    </LinkedCharts>
    <Questions />
  </React.StrictMode>
)
