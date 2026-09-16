import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { LineChart } from "../../dist/xy.module.min.js"
import {
  ThemeProvider,
  CategoryColorProvider,
  exportChart
} from "../../dist/semiotic.module.min.js"
import type { StreamXYFrameHandle } from "../../src/components/stream/types"

const rows = (magnitude: number, count = 6) =>
  Array.from({ length: count }, (_, i) => [
    { x: 0, y: magnitude * 0.2, series: `Series ${i}` },
    { x: 1, y: magnitude * (0.93 + i * 0.01), series: `Series ${i}` }
  ]).flat()

function PushDefaults({
  position,
  scheme
}: {
  position: "start" | "end"
  scheme?: string | string[] | Record<string, string>
}) {
  const ref = useRef<StreamXYFrameHandle>(null)
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.pushMany(rows(1))
  }, [])
  return (
    <div ref={container}>
      <button
        onClick={() =>
          ref.current?.pushMany([
            { x: 0, y: 0.5, series: "A newly discovered longer category" },
            { x: 1, y: 0.6, series: "A newly discovered longer category" }
          ])
        }
      >
        Push longer category
      </button>
      <button
        onClick={() => exportChart(container.current!, { format: "svg" })}
      >
        Export SVG
      </button>
      <button
        onClick={() => exportChart(container.current!, { format: "png" })}
      >
        Export PNG
      </button>
      <LineChart
        ref={ref}
        width={700}
        height={320}
        lineBy="series"
        colorScheme={scheme}
        directLabel={{ position }}
        title="Automatic push labels"
      />
    </div>
  )
}

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
          <LineChart
            {...frame}
            margin={undefined}
            ref={ref}
            title="Push updates"
          />
        </section>
        {(["start", "end"] as const).map((position) => (
          <section key={position} data-testid={`push-default-${position}`}>
            <PushDefaults position={position} />
          </section>
        ))}
        <section data-testid="push-scheme">
          <PushDefaults
            position="end"
            scheme={["#112233", "#445566", "#778899"]}
          />
        </section>
        <section data-testid="push-color-map">
          <PushDefaults
            position="end"
            scheme={{ "Series 0": "#abcdef", "Series 1": "#fedcba" }}
          />
        </section>
        <section data-testid="push-theme">
          <ThemeProvider
            theme={{ colors: { categorical: ["#cc2244", "#2244cc"] } }}
          >
            <PushDefaults position="start" />
          </ThemeProvider>
        </section>
        <section data-testid="push-provider">
          <CategoryColorProvider
            colors={{ "Series 0": "#22aa66", "Series 1": "#aa2266" }}
          >
            <PushDefaults position="end" scheme={["#112233", "#445566"]} />
          </CategoryColorProvider>
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
