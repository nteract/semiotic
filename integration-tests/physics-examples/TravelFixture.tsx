import React, { useState } from "react"
import { EventDropChart } from "../../dist/physics.module.min.js"
import type {
  EventDropChartHandle,
  PhysicsExecution
} from "../../src/components/semiotic-physics"
import { createFrameScheduler } from "../../src/components/stream/test-utils/frameScheduler"

declare global {
  interface Window {
    __travelChart: EventDropChartHandle
    __travelExecution: string
    __advanceTravel: (frames: number) => Promise<void>
  }
}

const scheduler = createFrameScheduler()
let now = 0
const clock = () => now
window.__advanceTravel = async (frames) => {
  for (let i = 0; i < frames; i++) {
    // Wait for a resident worker response to schedule its next display frame.
    for (let attempt = 0; !scheduler.pendingCount && attempt < 100; attempt++)
      await new Promise((resolve) => setTimeout(resolve, 5))
    now += 1000 / 60
    scheduler.flush(now)
  }
}
const data = [
  { id: "p1-newer", source: "p1", time: 35, arrivalTime: 0 },
  { id: "p2-older", source: "p2", time: 5, arrivalTime: 0.25 }
]
const sources = [
  { id: "p1", label: "P1", color: "#2563eb" },
  { id: "p2", label: "P2", color: "#c026d3" }
]

export function TravelFixture({ execution }: { execution: PhysicsExecution }) {
  const [width, setWidth] = useState(640)
  return (
    <div>
      <button onClick={() => setWidth(540)}>Resize travelling board</button>
      <div data-testid="event-drop-travel" style={{ width }}>
        <EventDropChart
          ref={(handle) => {
            if (handle) window.__travelChart = handle as EventDropChartHandle
          }}
          data={data}
          sources={sources}
          sourceRail={{ side: "top" }}
          arrival={{ mode: "travel", durationMs: 2000 }}
          timeUnit="s"
          windows={{ size: 10 }}
          watermark={{ delay: 100 }}
          size={[width, 360]}
          title="Events travel to their windows"
          description="P2 emits later but carries an older event time."
          tooltip={(datum) => (
            <div>
              {datum.id}: {datum.__phase}; event time {datum.eventTime}
            </div>
          )}
          frameProps={{
            clock,
            frameScheduler: scheduler.scheduler,
            simulationExecution: execution,
            onSimulationExecutionChange: (state) => {
              window.__travelExecution = state.execution
            }
          }}
        />
      </div>
    </div>
  )
}
