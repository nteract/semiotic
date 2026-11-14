import * as React from "react"
import { createRoot } from "react-dom/client"
import {
  ChartContainer,
  MobileChartContainer,
  RealtimeLineChart,
  ThemeProvider
} from "../../dist/semiotic.module.min.js"
import type { RealtimeLineChartHandle } from "../../src/components/charts/realtime/RealtimeLineChart"

function Fixture() {
  const [summary, setSummary] = React.useState(false)
  const [dark, setDark] = React.useState(false)
  const [count, setCount] = React.useState(0)
  const chart = React.useRef<RealtimeLineChartHandle>(null)
  return (
    <ThemeProvider theme={dark ? "dark" : "light"}>
      <button
        onClick={() => {
          chart.current?.pushMany([
            { t: 1, v: 10 },
            { t: 2, v: 20 },
            { t: 3, v: 30 }
          ])
        }}
      >
        Push readings
      </button>
      <button onClick={() => setSummary((value) => !value)}>
        Toggle summary action
      </button>
      <button onClick={() => setCount(chart.current?.getData().length ?? 0)}>
        Count retained rows
      </button>
      <button onClick={() => setDark((value) => !value)}>Toggle theme</button>
      <output data-testid="rows">{count}</output>
      <div data-testid="first" style={{ maxWidth: 600 }}>
        <ChartContainer
          title="Live readings"
          height={260}
          actions={{ dataSummary: summary, fullscreen: true }}
          mobile={{ breakpoint: 480, summary: "Narrow summary" }}
          notifications={[
            {
              id: "first",
              title: "First notice",
              message: "Inspect the first reading"
            },
            {
              id: "second",
              title: "Second notice",
              message: "Inspect the next reading"
            }
          ]}
        >
          <RealtimeLineChart
            ref={chart}
            responsiveWidth
            height={260}
            timeAccessor="t"
            valueAccessor="v"
            timeExtent={[0, 4]}
            valueExtent={[0, 40]}
            margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
            description="Three readings increase from ten to thirty."
            enableHover
            tooltipContent={(d) => (
              <span>
                Reading {String(d.data.t)}: {String(d.data.v)}
              </span>
            )}
          />
        </ChartContainer>
      </div>
      <div data-testid="second" style={{ maxWidth: 600 }}>
        <ChartContainer
          title="Other chart"
          actions={{ fullscreen: true, export: true }}
          height={120}
          mobile={{ breakpoint: 800, summary: "Wide summary" }}
        >
          <p>No SVG: exercise export failure feedback</p>
        </ChartContainer>
      </div>
      <div data-testid="loading">
        <ChartContainer title="Loading chart" height={60} loading>
          <div />
        </ChartContainer>
      </div>
      {[480, 800].map((breakpoint) => (
        <MobileChartContainer
          key={breakpoint}
          breakpoint={breakpoint}
          height={60}
          detailTitle={`Details at ${breakpoint}`}
          detail={<p>Scoped mobile sheet</p>}
          initialDetailOpen
        >
          <div>Mobile chart</div>
        </MobileChartContainer>
      ))}
    </ThemeProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Fixture />
  </React.StrictMode>
)
