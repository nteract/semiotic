import React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ForceDirectedGraph } from "./ForceDirectedGraph"
import { SankeyDiagram } from "./SankeyDiagram"
import { NetworkPipelineStore } from "../../stream/NetworkPipelineStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import type { RealtimeFrameHandle } from "../../realtime/types"

describe("network chart mutation batches", () => {
  let restore: () => void
  beforeEach(() => { restore = setupCanvasMock({ stubRaf: "noop" }) })
  afterEach(() => { restore(); vi.restoreAllMocks() })

  it.each([ForceDirectedGraph, SankeyDiagram])("commits array updates and removals once through the chart ref", (Chart) => {
    const nodes = Array.from({ length: 201 }, (_, i) => ({ id: `n${i}`, score: i }))
    const edges = nodes.slice(1).map((node, i) => ({ source: nodes[i].id, target: node.id, value: 1 }))
    const ref = React.createRef<RealtimeFrameHandle>()
    const view = render(<Chart ref={ref} nodes={nodes} edges={edges} frameProps={{ animate: false }} />)
    const layout = vi.spyOn(NetworkPipelineStore.prototype, "runLayout")
    const scene = vi.spyOn(NetworkPipelineStore.prototype, "buildScene")
    const ids = nodes.slice(0, 100).map((node) => node.id)
    act(() => {
      expect(ref.current!.update(ids, (datum) => ({ ...datum, score: 999 }))).toEqual(nodes.slice(0, 100))
    })
    expect(layout).toHaveBeenCalledTimes(1)
    expect(scene).toHaveBeenCalledTimes(1)
    layout.mockClear(); scene.mockClear()
    act(() => {
      expect(ref.current!.remove(ids)).toEqual(ids.map((id) => ({ id, score: 999 })))
    })
    expect(layout).toHaveBeenCalledTimes(1)
    expect(scene).toHaveBeenCalledTimes(1)
    expect(ref.current!.getData()).toEqual(Chart === SankeyDiagram
      ? edges.slice(100)
      : nodes.slice(100))
    view.unmount()
  })
})
