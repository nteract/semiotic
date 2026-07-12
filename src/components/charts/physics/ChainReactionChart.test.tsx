import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ChainReactionChart, type ChainReactionChartHandle } from "./ChainReactionChart"

type Row = { id: string; label: string; lane: string; deps: string[] }

const accessors = {
  taskIDAccessor: "id",
  labelAccessor: "label",
  laneAccessor: "lane",
  dependencyAccessor: "deps"
} as const

const dag: Row[] = [
  { id: "a", label: "A", lane: "L1", deps: [] },
  { id: "b", label: "B", lane: "L1", deps: ["a"] },
  { id: "c", label: "C", lane: "L2", deps: ["b"] }
]

describe("ChainReactionChart", () => {
  it("compiles a DAG and exposes it through the imperative handle", () => {
    const ref = React.createRef<ChainReactionChartHandle>()
    render(
      <ChainReactionChart
        ref={ref}
        data={dag}
        {...accessors}
        mode="snapshot"
        controls={false}
        width={400}
        height={300}
      />
    )

    const state = ref.current!.getMachineState()
    expect(state.tasks.map((task) => task.taskID)).toEqual(["a", "b", "c"])
    expect(state.tasks.every((task) => !task.completed)).toBe(true)
    expect(
      state.dependencies.map((dep) => `${dep.sourceID}->${dep.targetID}`).sort()
    ).toEqual(["a->b", "b->c"])
  })

  it("computes blocker amplification end-to-end through the component", () => {
    const ref = React.createRef<ChainReactionChartHandle>()
    render(
      <ChainReactionChart
        ref={ref}
        data={dag}
        {...accessors}
        mode="snapshot"
        controls={false}
        width={400}
        height={300}
      />
    )
    // a sits upstream of both b and c (c reached through b) — the directed
    // reachability path added in the network-analysis kit.
    const amp = ref.current!.getAmplification("a")
    expect(amp.downstreamTaskIDs).toEqual(["b", "c"])
    expect(amp.affectedLaneCount).toBe(2)
    // A leaf task amplifies nothing.
    expect(ref.current!.getAmplification("c").downstreamTaskCount).toBe(0)
  })

  it("renders a diagnostic alert instead of a chart when the graph has a cycle", () => {
    const cyclic: Row[] = [
      { id: "a", label: "A", lane: "L", deps: ["c"] },
      { id: "b", label: "B", lane: "L", deps: ["a"] },
      { id: "c", label: "C", lane: "L", deps: ["b"] }
    ]
    render(<ChainReactionChart data={cyclic} {...accessors} mode="snapshot" width={400} height={300} />)
    expect(screen.getByRole("alert")).toBeTruthy()
  })
})
