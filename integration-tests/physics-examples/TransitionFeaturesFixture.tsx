import React, { useState } from "react"
import {
  EventDropChart,
  StreamPhysicsFrame
} from "../../dist/physics.module.min.js"

import type {
  EventDropChartHandle,
  EventDropSource
} from "../../src/components/semiotic-physics"

declare global {
  interface Window {
    __eventDropTransition: EventDropChartHandle
    __eventDropStore: ReturnType<EventDropChartHandle["getStore"]>
  }
}

const data = [
  { id: "p1-event", source: "p1", time: 2, arrivalTime: 0 },
  { id: "p2-event", source: "p2", time: 12, arrivalTime: 0 },
  { id: "p3-event", source: "p3", time: 22, arrivalTime: 0 }
]
const baseSources: EventDropSource[] = [
  { id: "p1", label: "P1", mark: "circle", color: "#2563eb" },
  { id: "p2", label: "P2", mark: "square", color: "#c026d3" },
  { id: "p3", label: "P3", mark: "triangle", color: "#059669" }
]

export function TransitionFeaturesFixture() {
  const [sources, setSources] = useState(baseSources)
  const [dark, setDark] = useState(false)
  const [width, setWidth] = useState(640)
  const theme = dark
    ? {
        background: "#102030",
        text: "#ffffff",
        textSecondary: "#ddeeff",
        border: "#7799bb",
        openWindowFill: "#204060",
        gutterFill: "#302040",
        closedWindowStroke: "#ff6644"
      }
    : {
        background: "#ffffff",
        text: "#102030",
        textSecondary: "#334455",
        border: "#778899",
        openWindowFill: "#ddeeff",
        gutterFill: "#eee0ff",
        closedWindowStroke: "#cc3300"
      }
  return (
    <div>
      <button onClick={() => setDark(!dark)}>Toggle palette</button>
      <button onClick={() => setWidth(width === 640 ? 360 : 640)}>
        Resize board
      </button>
      <div data-testid="event-drop-transition" style={{ width }}>
        <EventDropChart
          ref={(handle) => {
            if (handle)
              window.__eventDropTransition = handle as EventDropChartHandle
          }}
          data={data}
          sources={sources}
          size={[width, 300]}
          sourceRail={{ side: width < 400 ? "top" : "left" }}
          onSourceClick={(source) =>
            setSources((previous) =>
              previous.map((item) =>
                item.id === source.id
                  ? { ...item, active: item.active === false }
                  : item
              )
            )
          }
          timeUnit="s"
          windows={{ size: 10 }}
          watermark={{ delay: 100 }}
          frameProps={{ theme, simulationExecution: "sync" }}
          title="Source arrivals"
          description="Three source marks, counted by event-time window."
        />
      </div>
      {/* Keep the canvas origin on whole pixels, independent of native button
          metrics above it, so browser screenshots use its exact 300 × 110 box. */}
      <div
        data-testid="physics-mark-matrix"
        style={{ position: "absolute", left: 8, top: 420 }}
      >
        <StreamPhysicsFrame
          size={[300, 110]}
          config={{ kernel: { gravity: { x: 0, y: 0 } } }}
          initialSpawns={["triangle", "hexagon"].flatMap((mark, row) =>
            [6, 12].map((radius, column) => ({
              id: `${mark}-${radius}`,
              x: 35 + column * 90,
              y: 25 + row * 50,
              shape: { type: "circle", radius },
              datum: { mark },
              fixedPosition: { x: 35 + column * 90, y: 25 + row * 50 }
            }))
          )}
          theme={theme}
          paused
          bodyStyle={{ fill: dark ? "#80c0ff" : "#2563eb" }}
        />
      </div>
    </div>
  )
}
