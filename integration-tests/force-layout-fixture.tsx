import * as React from "react"
import { StreamNetworkFrame } from "../dist/semiotic.module.min.js"
import type { StreamNetworkFrameHandle } from "../src/components/stream/networkFrameHandleTypes"

const nodes = Array.from({ length: 6 }, (_, index) => ({ id: `n${index}` }))
const edges = nodes.slice(1).map((node, index) => ({ source: `n${index}`, target: node.id, value: index + 1 }))

export function ForceLayoutFixture() {
  const [radius, setRadius] = React.useState(4)
  const [width, setWidth] = React.useState(600)
  const inputKey = `${radius}:${width}`
  const [status, setStatus] = React.useState({
    sync: { inputKey: "", state: "pending" },
    worker: { inputKey: "", state: "pending" }
  })
  const sync = React.useRef<StreamNetworkFrameHandle>(null)
  const worker = React.useRef<StreamNetworkFrameHandle>(null)
  React.useEffect(() => {
    Object.assign(window, { forceFrames: { sync, worker } })
  }, [])
  // A prior request's ready state must not describe newly requested inputs,
  // even before the frame's passive effect announces the next pending state.
  const onSyncState = React.useCallback((state: string) => setStatus((previous) =>
    previous.sync.inputKey === inputKey && previous.sync.state === state
      ? previous : { ...previous, sync: { inputKey, state } }), [inputKey])
  const onWorkerState = React.useCallback((state: string) => setStatus((previous) =>
    previous.worker.inputKey === inputKey && previous.worker.state === state
      ? previous : { ...previous, worker: { inputKey, state } }), [inputKey])

  return <>
    <button onClick={() => setRadius(20)}>Enlarge nodes</button>
    <button onClick={() => setWidth(420)}>Narrow graphs</button>
    {(["sync", "worker"] as const).map((execution) => <section key={execution} data-testid={`force-${execution}`}>
      <p role="status" data-layout-inputs={status[execution].inputKey}>
        {execution}: {status[execution].inputKey === inputKey ? status[execution].state : "pending"}
      </p>
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
