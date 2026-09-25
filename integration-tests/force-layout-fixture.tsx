import * as React from "react"
import { StreamNetworkFrame } from "../dist/semiotic.module.min.js"
import type { StreamNetworkFrameHandle } from "../src/components/stream/networkFrameHandleTypes"

const nodes = Array.from({ length: 6 }, (_, index) => ({ id: `n${index}` }))
const edges = nodes.slice(1).map((node, index) => ({ source: `n${index}`, target: node.id, value: index + 1 }))

export function ForceLayoutFixture() {
  const [radius, setRadius] = React.useState(4)
  const [width, setWidth] = React.useState(600)
  const [status, setStatus] = React.useState({ sync: "pending", worker: "pending" })
  const sync = React.useRef<StreamNetworkFrameHandle>(null)
  const worker = React.useRef<StreamNetworkFrameHandle>(null)
  React.useEffect(() => {
    Object.assign(window, { forceFrames: { sync, worker } })
  }, [])
  const onSyncState = React.useCallback((value: string) => setStatus((previous) => previous.sync === value ? previous : { ...previous, sync: value }), [])
  const onWorkerState = React.useCallback((value: string) => setStatus((previous) => previous.worker === value ? previous : { ...previous, worker: value }), [])

  return <>
    <button onClick={() => setRadius(20)}>Enlarge nodes</button>
    <button onClick={() => setWidth(420)}>Narrow graphs</button>
    {(["sync", "worker"] as const).map((execution) => <section key={execution} data-testid={`force-${execution}`}>
      <p role="status">{execution}: {status[execution]}</p>
      <StreamNetworkFrame ref={execution === "sync" ? sync : worker}
        nodes={nodes} edges={edges} chartType="force" size={[width, 340]}
        margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
        iterations={150} seed={27} nodeSize={radius} animate={false}
        layoutExecution={execution} enableHover
        onLayoutStateChange={execution === "sync" ? onSyncState : onWorkerState}
      />
    </section>)}
  </>
}
