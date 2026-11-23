import React, { useRef, useState } from "react"
import { ChainReactionChart } from "../../dist/physics.module.min.js"
import type { ChainReactionChartHandle } from "../../src/components/charts/physics/chainReactionTypes"

const tasks = [
  { id: "a", lane: "Build", deps: [] },
  { id: "b", lane: "Build", deps: ["a"] }
]

export function ChainReactionLoadingFixture() {
  const ref = useRef<ChainReactionChartHandle>(null)
  const startEmpty =
    new URLSearchParams(location.search).get("chain-loading") === "empty"
  const [data, setData] = useState(startEmpty ? [] : tasks)
  const [loading, setLoading] = useState(!startEmpty)
  const [width, setWidth] = useState(420)
  const [armed, setArmed] = useState("")
  return (
    <div style={{ width }} data-testid="chain-recovery">
      <button
        onClick={() => {
          setData(tasks)
          setLoading(false)
        }}
      >
        Show tasks
      </button>
      <button onClick={() => setWidth(320)}>Resize chart</button>
      <button
        onClick={() => {
          ref.current?.completeTask("a")
          setLoading(true)
        }}
      >
        Complete and load
      </button>
      <output aria-label="Armed task">{armed}</output>
      <ChainReactionChart
        ref={ref}
        data={data}
        loading={loading}
        loadingLabel="Loading tasks"
        taskIDAccessor="id"
        labelAccessor="id"
        laneAccessor="lane"
        dependencyAccessor="deps"
        responsiveWidth
        width={600}
        height={260}
        accessibleTable={false}
        onObservation={(event) => {
          if (event.type === "task-armed") setArmed(event.taskID)
        }}
      />
    </div>
  )
}
