import * as React from "react"
import { StreamNetworkFrame } from "../dist/semiotic.module.min.js"
import type { StreamNetworkFrameHandle } from "../src/components/stream/networkFrameHandleTypes"

export function NetworkIngestFixture() {
  const ref = React.useRef<StreamNetworkFrameHandle>(null)
  const seeded = React.useRef(false)
  const [width, setWidth] = React.useState(600)
  React.useEffect(() => {
    Object.assign(window, { networkIngestRef: ref })
    if (seeded.current) return
    seeded.current = true
    ref.current!.pushMany([
      { from: 0, to: 1, amount: 2, key: "flow", category: "edge-only" },
      { from: 0, to: 1, amount: 3, label: "latest row" }
    ])
  }, [])
  return (
    <>
      <button
        onClick={() => setWidth((previous) => (previous === 600 ? 420 : 600))}
      >
        Resize pushed graph
      </button>
      <StreamNetworkFrame
        ref={ref}
        chartType="sankey"
        size={[width, 320]}
        margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
        sourceAccessor="from"
        targetAccessor="to"
        valueAccessor="amount"
        edgeIdAccessor="key"
        animate={false}
        enableHover
        accessibleTable
      />
    </>
  )
}
