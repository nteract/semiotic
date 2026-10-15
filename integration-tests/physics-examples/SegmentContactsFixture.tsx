import React, { useState } from "react"
import { PhysicsCustomChart } from "../../dist/physics.module.min.js"
import type {
  PhysicsCustomLayout,
  PhysicsFrameHandle
} from "../../src/components/semiotic-physics"

declare global {
  interface Window {
    __segmentPhysics?: PhysicsFrameHandle | null
    __segmentExecution?: string
    __segmentExecutionReason?: string
  }
}

const data = [
  { id: "circle", label: "Small circle" },
  { id: "box", label: "Wide box" }
]
const layout: PhysicsCustomLayout = () => ({
  bodies: [
    {
      id: "circle",
      x: 70,
      y: 10,
      vy: 1600,
      shape: { type: "circle", radius: 2 },
      datum: data[0]
    },
    {
      id: "box",
      x: 150,
      y: 10,
      vy: 1600,
      shape: { type: "aabb", width: 20, height: 12 },
      datum: data[1]
    }
  ],
  colliders: [
    {
      id: "floor",
      shape: { type: "segment", x1: 20, y1: 140, x2: 300, y2: 140 }
    }
  ],
  config: { fixedDt: 1 / 60, kernel: { restitution: 0 } },
  bodyStyle: { fill: "#123456", opacity: 1, stroke: "none", strokeWidth: 0 },
  overlays: (
    <svg
      width="100%"
      height="100%"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <line x1={20} y1={140} x2={300} y2={140} stroke="#555" />
    </svg>
  )
})

export function SegmentContactsFixture({
  execution
}: {
  execution: "sync" | "worker"
}) {
  const [width, setWidth] = useState(340)
  return (
    <>
      <button onClick={() => setWidth(440)}>Resize chart</button>
      <PhysicsCustomChart
        ref={(handle) => {
          window.__segmentPhysics = handle
        }}
        data={data}
        layout={layout}
        title="Segment floor contacts"
        description="A fast circle and a wide box land on a thin floor."
        size={[width, 220]}
        tooltip={(datum) => <div>{datum.label}</div>}
        frameProps={{
          simulationExecution: execution,
          onSimulationExecutionChange: (state) => {
            window.__segmentExecution = state.execution
            window.__segmentExecutionReason = state.reason
          }
        }}
      />
    </>
  )
}
