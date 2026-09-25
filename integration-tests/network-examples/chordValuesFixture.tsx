import React, { useState } from "react"
import { ChordDiagram } from "../../dist/network.module.min.js"

const input = [
  { source: "A", target: "B", weight: 30 },
  { source: "A", target: "B", weight: 60 },
  { source: "B", target: "A", weight: 20 }
]

export function ChordValuesFixture() {
  const [small, setSmall] = useState(false)
  const [empty, setEmpty] = useState(false)
  const [moved, setMoved] = useState(false)
  return (
    <div>
      <button onClick={() => setSmall(true)}>Resize chord</button>
      <button onClick={() => setMoved(true)}>Zoom and pan chord</button>
      <button onClick={() => setEmpty(true)}>Zero values</button>
      <ChordDiagram
        edges={empty ? input.map((edge) => ({ ...edge, weight: 0 })) : input}
        valueAccessor={(d) => d.weight}
        width={small ? 320 : 400}
        height={small ? 320 : 400}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        showLabels={false}
        frameProps={{
          viewTransform: moved ? { x: -10, y: -10, k: 1.2 } : undefined
        }}
      />
    </div>
  )
}
