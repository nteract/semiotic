import * as React from "react"
import { act, render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import StreamNetworkFrame from "./StreamNetworkFrame"
import type { StreamNetworkFrameHandle } from "./networkTypes"
import { setupCanvasMock } from "../../test-utils/canvasMock"

describe("stream frame explicit-ID mutation path", () => {
  it("pushes, updates and removes one of two same-owner IDs through the public ref", () => {
    setupCanvasMock()
    const ref = React.createRef<StreamNetworkFrameHandle>()
    const mounted = render(
      <StreamNetworkFrame
        ref={ref}
        chartType="force"
        edgeIdentity="id"
        size={[400, 200]}
        customNetworkLayout={(context) => ({
          sceneNodes: context.nodes.map((n, i) => ({
            type: "circle",
            id: n.id,
            cx: 30 + i * 200,
            cy: 50,
            r: 10,
            datum: n.data ?? n,
            style: { fill: "#468" }
          })),
          sceneEdges: context.edges.map((e) => ({
            type: "line",
            id: String(e.data?.id),
            x1: 40,
            x2: 220,
            y1: 50,
            y2: 50,
            datum: e.data ?? e,
            style: { stroke: "#468" }
          }))
        })}
      />
    )
    act(() =>
      ref.current!.pushMany([
        { id: "first", source: "a", target: "b", value: 2 },
        { id: "second", source: "a", target: "b", value: 3 }
      ])
    )
    expect(ref.current!.getTopology().edges.map((e) => e.data?.id)).toEqual([
      "first",
      "second"
    ])
    act(() =>
      ref.current!.updateEdgeById!("second", (data) => ({ ...data, value: 9 }))
    )
    expect(ref.current!.getTopology().edges.map((e) => e.value)).toEqual([2, 9])
    act(() => ref.current!.removeEdge("first"))
    expect(ref.current!.getTopology().edges.map((e) => e.data?.id)).toEqual([
      "second"
    ])
    expect(
      ref.current!.getCustomLayout()!.sceneEdges!.map((e) => e.id)
    ).toEqual(["second"])
    mounted.unmount()
  })
})
