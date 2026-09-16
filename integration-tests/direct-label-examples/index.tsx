import React, { useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { LineChart } from "../../dist/xy.module.min.js"
import { ThemeProvider } from "../../dist/semiotic.module.min.js"
import type { StreamXYFrameHandle } from "../../src/components/stream/types"

const rows = (magnitude: number, count = 6) =>
  Array.from({ length: count }, (_, i) => [
    { x: 0, y: magnitude * 0.2, series: `Series ${i}` },
    { x: 1, y: magnitude * (0.93 + i * 0.01), series: `Series ${i}` }
  ]).flat()

function App() {
  const [compact, setCompact] = useState(false)
  const [font, setFont] = useState("Arial, sans-serif")
  const ref = useRef<StreamXYFrameHandle>(null)
  const frame = {
    width: compact ? 420 : 600,
    height: compact ? 200 : 300,
    margin: { top: 20, bottom: 50, left: 60, right: 120 },
    xAccessor: "x",
    yAccessor: "y",
    lineBy: "series",
    colorBy: "series",
    directLabel: true,
    xExtent: [0, 2],
    yExtent: [0, 1],
    showAxes: true
  }
  return (
    <ThemeProvider theme={{ typography: { fontFamily: font } }}>
      <main style={{ fontFamily: "Arial, sans-serif" }}>
        <h1>Endpoint labels across units</h1>
        <p>
          These lines share the same geometry. Labels move within the available
          rail; omitted names remain in the chart description.
        </p>
        <button onClick={() => setCompact(!compact)}>Resize charts</button>
        <button onClick={() => setFont("Courier New, monospace")}>
          Change font
        </button>
        <button
          onClick={() => {
            for (const row of rows(1)) ref.current?.push(row)
          }}
        >
          Push initial data
        </button>
        <button
          onClick={() =>
            ref.current?.push({ x: 2, y: 0.2, series: "Series 0" })
          }
        >
          Push new endpoint
        </button>
        {[1e-6, 1, 1e9].map((magnitude) => (
          <section key={magnitude} data-testid={`magnitude-${magnitude}`}>
            <LineChart
              {...frame}
              data={rows(magnitude)}
              yExtent={[0, magnitude]}
              title={`Magnitude ${magnitude}`}
            />
          </section>
        ))}
        <section data-testid="impossible">
          <LineChart
            {...frame}
            data={rows(1, 30)}
            height={110}
            title="Insufficient rail space"
          />
        </section>
        <section data-testid="push">
          <LineChart {...frame} ref={ref} title="Push updates" />
        </section>
        <section
          data-testid="colliding-axis"
          style={{ "--semiotic-tick-font-size": "36px" } as React.CSSProperties}
        >
          <LineChart
            {...frame}
            data={rows(1)}
            width={340}
            xFormat={(value) => `WWW${value}`}
            frameProps={{
              axes: [
                { orient: "bottom", tickValues: [0, 1, 2] },
                { orient: "left" }
              ]
            }}
            title="Measured axis collisions"
          />
        </section>
      </main>
    </ThemeProvider>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
