import React, { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import {
  ObservationReadout,
  ChartContainer
} from "../../dist/semiotic.module.min.js"
import { Scatterplot } from "../../dist/xy.module.min.js"
import { BarChart } from "../../dist/ordinal.module.min.js"
import { NetworkCustomChart } from "../../dist/network.module.min.js"
import { GeoCustomChart } from "../../dist/geo.module.min.js"
import { StreamPhysicsFrame } from "../../dist/physics.module.min.js"
import { IntentMark } from "../../dist/semiotic-ai.module.min.js"
import CodeBlock from "../../docs/src/components/CodeBlock"
import type { ChartObservation } from "../../src/components/store/ObservationStore"
import type { RealtimeFrameHandle } from "../../src/components/realtime/types"
import type { NetworkCustomLayout } from "../../src/components/stream/networkCustomLayout"
import type { GeoCustomLayout } from "../../src/components/stream/geoCustomLayout"

const query = new URLSearchParams(window.location.search)
const family = query.get("family") || "xy"
const pushed = query.get("mode") === "pushed"
const rows = Array.from({ length: 7 }, (_, i) => ({
  id: `Mark ${i}`,
  category: `Mark ${i}`,
  x: i,
  y: i + 1,
  value: i + 1,
  lon: i,
  lat: i
}))
const positions = rows.map((_, i) => ({
  x: 40 + (i % 4) * 75,
  y: 70 + Math.floor(i / 4) * 100
}))
const networkLayout: NetworkCustomLayout = (ctx) => ({
  sceneNodes: ctx.nodes.map((datum, i) => ({
    type: "circle",
    cx: positions[i].x,
    cy: positions[i].y,
    r: 10,
    datum,
    style: { fill: "#1460aa" }
  })),
  sceneEdges: ctx.edges.map((datum, i) => ({
    type: "line",
    x1: positions[i].x,
    y1: positions[i].y,
    x2: positions[(i + 1) % 7].x,
    y2: positions[(i + 1) % 7].y,
    datum,
    style: { stroke: "#777", strokeWidth: 2 }
  }))
})
const geoLayout: GeoCustomLayout = (ctx) => ({
  nodes: ctx.points.map((datum, i) => ({
    type: "point",
    x: positions[i].x,
    y: positions[i].y,
    r: 10,
    datum,
    style: { fill: "#1460aa" }
  }))
})

function App() {
  const [width, setWidth] = useState(440)
  const [observation, setObservation] = useState<ChartObservation | null>(null)
  const chartRef = useRef<RealtimeFrameHandle>(null)
  useEffect(() => {
    if (pushed) chartRef.current?.pushMany(rows)
  }, [])
  const common = {
    width,
    height: 360,
    margin: { left: 20, right: 20, top: 20, bottom: 20 },
    title: "Accessible marks",
    animate: false as const,
    accessibleTable: true,
    onObservation: setObservation,
    tooltip: (d) => (
      <span>
        {String(d.id ?? d.category ?? `${d.source} → ${d.target}`)}:{" "}
        {String(d.value)}
      </span>
    )
  }
  const data = pushed ? { ref: chartRef } : { data: rows }
  const chart =
    family === "xy" ? (
      <Scatterplot
        {...common}
        {...data}
        xExtent={[-1, 7]}
        yExtent={[0, 8]}
        pointRadius={10}
      />
    ) : family === "ordinal" ? (
      <BarChart
        {...common}
        {...data}
        categoryAccessor="category"
        valueAccessor="value"
      />
    ) : family === "network" ? (
      <NetworkCustomChart
        {...common}
        nodes={rows}
        edges={rows.map((_, i) => ({
          source: rows[i].id,
          target: rows[(i + 1) % 7].id,
          value: i + 1
        }))}
        layout={networkLayout}
      />
    ) : family === "geo" ? (
      <GeoCustomChart {...common} points={rows} layout={geoLayout} />
    ) : (
      // Explicit body positions and authored semantic targets exercise the
      // frame-level accessibility contract independently of simulation timing.
      <StreamPhysicsFrame
        title="Accessible marks"
        size={[width, 360]}
        margin={common.margin}
        paused
        accessibleTable
        initialSpawns={rows.map((datum, i) => ({
          id: datum.id,
          ...positions[i],
          mass: 1,
          shape: { type: "circle", radius: 10 },
          datum
        }))}
        semanticItems={rows.map((datum, i) => ({
          id: datum.id,
          bodyId: datum.id,
          label: datum.id,
          description: `${datum.id}: ${datum.value}`,
          datum,
          ...positions[i]
        }))}
      />
    )

  return (
    <>
      <button onClick={() => setWidth(360)}>Resize chart</button>
      <div data-testid="chart">{chart}</div>
      <ObservationReadout observation={observation} fallback="No observation">
        {(d) => String(d.id ?? d.category)}
      </ObservationReadout>
      <button>After chart</button>
      <div data-testid="intent">
        <IntentMark
          manifest={{
            ididVersion: "0.1",
            chartId: "test",
            intent: { primary: "compare" }
          }}
        />
      </div>
      <div data-testid="code">
        <CodeBlock code="const x = 1" />
      </div>
      <div data-testid="toolbar">
        <ChartContainer
          actions={{ copyConfig: true }}
          chartConfig={{ component: "BarChart", props: { data: [] } }}
        >
          <div>Chart configuration</div>
        </ChartContainer>
      </div>
    </>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
