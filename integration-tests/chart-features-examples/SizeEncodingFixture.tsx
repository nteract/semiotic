import React, { useRef, useState } from "react"
import { ThemeProvider } from "semiotic"
import { SwarmPlot, DonutChart } from "semiotic/ordinal"
import { QuadrantChart } from "semiotic/xy"
import { ProportionalSymbolMap } from "semiotic/geo"
import type { RealtimeFrameHandle } from "../../src/components/realtime/types"

const point = {
  x: 50_000,
  y: 1,
  lon: 10,
  lat: 20,
  category: "A",
  value: 50_000,
  size: 50_000
}
const tooltip = (datum: Record<string, unknown>) => `Observation ${datum.size}`

export function SizeEncodingFixture() {
  const swarm = useRef<RealtimeFrameHandle>(null)
  const quadrant = useRef<RealtimeFrameHandle>(null)
  const map = useRef<RealtimeFrameHandle>(null)
  const [width, setWidth] = useState(360)
  const [dark, setDark] = useState(false)
  const shared = {
    width,
    height: 240,
    showLegend: false,
    showAxes: false,
    sizeBy: "size",
    sizeRange: [6, 12] as [number, number],
    color: "#1254ab",
    pointOpacity: 1,
    tooltip
  }
  return (
    <ThemeProvider theme={dark ? "carbon-dark" : "carbon"}>
      <main
        style={{
          padding: 20,
          background: dark ? "#161616" : "white",
          color: dark ? "white" : "#161616"
        }}
      >
        <button onClick={() => setDark((value) => !value)}>
          Toggle chart theme
        </button>
        <button
          onClick={() => {
            swarm.current?.push(point)
            quadrant.current?.push(point)
            map.current?.push(point)
          }}
        >
          Push observation
        </button>
        <button onClick={() => setWidth(260)}>Resize encoded charts</button>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <section data-testid="size-swarm">
            <SwarmPlot ref={swarm} {...shared} title="Pushed swarm" />
          </section>
          <section data-testid="size-quadrant">
            <QuadrantChart ref={quadrant} {...shared} title="Pushed quadrant" />
          </section>
          <section data-testid="zero-hole-donut">
            <DonutChart
              data={[{ category: "A", value: 1 }]}
              innerRadius={0}
              width={240}
              height={240}
              showLegend={false}
              colorScheme={["#1254ab"]}
              tooltip={() => "Filled donut observation"}
            />
          </section>
          <section data-testid="size-map">
            <ProportionalSymbolMap
              ref={map}
              {...shared}
              title="Pushed map"
              styleRules={[{ style: { fill: "#1254ab", fillOpacity: 1 } }]}
            />
          </section>
        </div>
      </main>
    </ThemeProvider>
  )
}
