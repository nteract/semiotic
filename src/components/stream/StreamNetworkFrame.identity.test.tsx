import * as React from "react"
import { act, render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import StreamNetworkFrame from "./StreamNetworkFrame"
import type {
  StreamNetworkFrameHandle,
  StreamNetworkFrameProps
} from "./networkTypes"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import { setupCanvasMock } from "../../test-utils/canvasMock"

describe("stream frame explicit-ID mutation path", () => {
  it("replaces an ID graph with a controlled hierarchy without rekeying old edges", () => {
    setupCanvasMock()
    const ref = React.createRef<StreamNetworkFrameHandle>()
    const view = render(
      <StreamNetworkFrame
        ref={ref}
        chartType="force"
        edgeIdentity="id"
        customNetworkLayout={layout}
        edges={[{ id: "old", source: "a", target: "b" }]}
      />
    )
    view.rerender(
      <StreamNetworkFrame
        ref={ref}
        chartType="tree"
        edgeIdentity="pair"
        data={{ id: "root", children: [{ id: "child" }] }}
      />
    )
    expect(
      ref
        .current!.getTopology()
        .nodes.map((n) => n.id)
        .sort()
    ).toEqual(["child", "root"])
    expect(ref.current!.getTopology().edges).toHaveLength(1)
    view.unmount()
  })
  const layout: NetworkCustomLayout = (context) => ({
    sceneNodes: context.nodes.map((n, i) => ({
      type: "circle",
      id: n.id,
      cx: 30 + i * 100,
      cy: 50,
      r: 10,
      style: { fill: "#468" },
      datum: n.data ?? n
    })),
    sceneEdges: context.edges.map((e) => ({
      type: "line",
      id: e._edgeKey!,
      x1: 40,
      x2: 120,
      y1: 50,
      y2: 50,
      style: { stroke: "#468" },
      datum: e.data ?? e
    }))
  })
  const cases: Array<{
    name: string
    before: Partial<StreamNetworkFrameProps>
    after: Partial<StreamNetworkFrameProps>
    id: string
  }> = [
    {
      name: "enabling IDs",
      before: { edges: [{ source: "a", target: "b" }] },
      after: {
        edgeIdentity: "id",
        edges: [{ id: "new", source: "c", target: "d" }]
      },
      id: "new"
    },
    {
      name: "changing the ID accessor",
      before: {
        edgeIdentity: "id",
        edges: [{ id: "old", source: "a", target: "b" }]
      },
      after: {
        edgeIdentity: "id",
        edgeIdAccessor: "wireId",
        edges: [{ wireId: "new", source: "c", target: "d" }]
      },
      id: "new"
    }
  ]
  it.each(cases)(
    "atomically replaces controlled data when $name",
    ({ before, after, id }) => {
      setupCanvasMock()
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const chart = (props: Partial<StreamNetworkFrameProps>) => (
        <StreamNetworkFrame
          ref={ref}
          chartType="force"
          size={[400, 200]}
          customNetworkLayout={layout}
          {...props}
        />
      )
      const mounted = render(chart(before))
      expect(ref.current!.getTopology().edges).toHaveLength(1)
      mounted.rerender(chart(after))
      expect(ref.current!.getTopology().nodes.map((n) => n.id)).toEqual([
        "c",
        "d"
      ])
      expect(ref.current!.getTopology().edges.map((e) => e._edgeKey)).toEqual([
        JSON.stringify(["id", id])
      ])
      expect(
        ref.current!.getCustomLayout()!.sceneEdges!.map((e) => e.id)
      ).toEqual([JSON.stringify(["id", id])])
      mounted.rerender(
        chart({
          edgeIdentity: "pair",
          edges: [{ source: "e", target: "f", value: 4 }]
        })
      )
      expect(ref.current!.getTopology().nodes.map((n) => n.id)).toEqual([
        "e",
        "f"
      ])
      expect(ref.current!.getTopology().edges.map((e) => e.value)).toEqual([4])
      mounted.rerender(chart({ edgeIdentity: "id", edges: [] }))
      expect(ref.current!.getTopology().edges).toHaveLength(0)
      mounted.unmount()
    }
  )
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
