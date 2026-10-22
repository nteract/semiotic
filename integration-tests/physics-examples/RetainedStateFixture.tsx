import React, { useState } from "react"
import { StreamPhysicsFrame } from "../../dist/physics.module.min.js"
import type { StreamPhysicsFrameHandle } from "../../src/components/semiotic-physics"

declare global {
  interface Window {
    __retainedPhysics: StreamPhysicsFrameHandle
  }
}

export function RetainedStateFixture() {
  const [width, setWidth] = useState(400)
  return (
    <>
      <button onClick={() => setWidth(300)}>Resize retained frame</button>
      <div data-testid="retained-frame">
        <StreamPhysicsFrame
          ref={(handle) => {
            if (handle) window.__retainedPhysics = handle
          }}
          size={[width, 200]}
          paused
          config={{
            kernel: { gravity: { x: 0, y: 0 } },
            viewTransform: { x: -10, y: 5 }
          }}
          initialSpawns={[
            {
              id: "left",
              x: 80,
              y: 80,
              shape: { type: "circle", radius: 10 },
              datum: { label: "Left event" }
            },
            {
              id: "right",
              x: 220,
              y: 80,
              shape: { type: "circle", radius: 10 },
              datum: { label: "Right event" }
            }
          ]}
          enableHover
          bodySemanticItems
          tooltipContent={(hover) => <span>{hover.data.label}</span>}
        />
      </div>
    </>
  )
}
