import * as React from "react"
import { act, render } from "@testing-library/react"
import { ForceDirectedGraph, SankeyDiagram } from "semiotic/network"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkPipelineConfig } from "./networkTypes"
import type { RealtimeFrameHandle } from "../realtime/types"
import type { Datum } from "../charts/shared/datumTypes"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import "./layouts/sankeyLayoutPlugin"
import "./layouts/forceLayoutPlugin"

const size: [number, number] = [600, 400]
const config = (
  extra: Partial<NetworkPipelineConfig> = {}
): NetworkPipelineConfig => ({
  chartType: "sankey",
  transition: { duration: 0 },
  ...extra
})

describe("network data ingestion", () => {
  afterEach(() => vi.restoreAllMocks())

  it.each(["string", "function"])(
    "honors %s accessors and retains merged push payloads",
    (kind) => {
      const store = new NetworkPipelineStore(
        config({
          sourceAccessor: kind === "string" ? "from" : (d) => d.from,
          targetAccessor: kind === "string" ? "to" : (d) => d.to,
          valueAccessor: kind === "string" ? "amount" : (d) => d.amount,
          edgeIdAccessor: "key"
        })
      )
      const first = {
        from: 1,
        to: 2,
        amount: "2",
        key: "e1",
        category: "first"
      }
      const second = { from: 1, to: 2, amount: 3, key: "e2", label: "latest" }
      store.ingestEdge(first)
      store.ingestEdge(second)
      store.runLayout(size)
      store.buildScene(size)
      const { nodes, edges } = store.getLayoutData()
      expect(nodes.map((node) => node.id)).toEqual(["1", "2"])
      expect(edges).toHaveLength(1)
      expect(edges[0].value).toBe(5)
      expect(edges[0].data).toEqual({ ...first, ...second })
      expect(first.amount).toBe("2")
      expect(second.amount).toBe(3)
      expect(store.sceneEdges).toHaveLength(1)
      const update = vi.fn((datum: Datum) => ({ ...datum, amount: 7 }))
      store.updateEdge("1", "2", update)
      expect(update).toHaveBeenCalledWith({ ...first, ...second })
      expect(edges[0].value).toBe(7)
      expect(store.removeEdge("e2")).toBe(true)
      expect(store.edges.size).toBe(0)
    }
  )

  it("accumulates omitted values without NaN and uses normalized numeric IDs", () => {
    const store = new NetworkPipelineStore(config())
    store.ingestEdge({ source: 0, target: 1 })
    store.ingestEdge({ source: "0", target: "1" })
    expect([...store.nodes.keys()]).toEqual(["0", "1"])
    expect([...store.edges.values()]).toHaveLength(1)
    expect([...store.edges.values()][0].value).toBe(2)
  })

  it.each([undefined, null, NaN, Infinity, "n/a", "2.5", 0, -2])(
    "normalizes value %s consistently in bounded, push, and update ingestion",
    (value) => {
      const expected =
        value == null || !Number.isFinite(Number(value)) ? 1 : Number(value)
      const bounded = new NetworkPipelineStore(config())
      bounded.ingestBounded([], [{ source: "A", target: "B", value }], size)
      const pushed = new NetworkPipelineStore(config())
      pushed.ingestEdge({ source: "A", target: "B", value })
      const updated = new NetworkPipelineStore(config())
      updated.ingestBounded([], [{ source: "A", target: "B", value: 10 }], size)
      updated.updateEdge("A", "B", (datum) => ({ ...datum, value }))
      for (const store of [bounded, pushed, updated]) {
        expect([...store.edges.values()][0].value).toBe(expected)
      }
    }
  )

  it("keeps inferred node data distinct from edge data in bounded and push paths", () => {
    const raw = { source: "A", target: "B", value: 5, category: "edge-only" }
    for (const pushed of [false, true]) {
      const nodeStyle = vi.fn((_node: Datum) => ({ fill: "red" }))
      const store = new NetworkPipelineStore(config({ nodeStyle }))
      if (pushed) {
        store.ingestEdge(raw)
        store.runLayout(size)
      } else store.ingestBounded([], [raw], size)
      store.buildScene(size)
      expect([...store.nodes.values()].map((node) => node.data)).toEqual([
        { id: "A" },
        { id: "B" }
      ])
      expect(nodeStyle.mock.calls.map(([node]) => node.data)).toEqual([
        { id: "A" },
        { id: "B" }
      ])
      expect([...store.edges.values()][0].data).toBe(raw)
    }
  })

  it("skips missing IDs and warns about duplicate nodes while retaining the last datum", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const store = new NetworkPipelineStore(config())
    store.ingestBounded(
      [
        { label: "missing" },
        { id: null },
        { id: 0 },
        { id: "A", label: "first" },
        { id: "A", label: "last" }
      ],
      [
        { target: "orphan" },
        { source: "A", target: null },
        { source: 0, target: "A", value: 1 }
      ],
      size
    )
    expect([...store.nodes.keys()]).toEqual(["0", "A"])
    expect(store.nodes.get("A")!.data?.label).toBe("last")
    expect(store.edges.size).toBe(1)
    expect(warn.mock.calls.flat().join(" ")).toMatch(/missing.*id/i)
    expect(warn.mock.calls.flat().join(" ")).toMatch(/duplicate.*A/i)
    expect(store.ingestEdge({ source: null, target: "new" })).toBe(false)
    expect(store.getLastUpdateResult().changed.size).toBe(0)
    expect(store.nodes.has("new")).toBe(false)
  })

  it("preserves explicit node payloads and infers only missing endpoints", () => {
    const store = new NetworkPipelineStore(
      config({ nodeIDAccessor: (datum) => datum.code })
    )
    const supplied = { code: "A", category: "authored node" }
    store.ingestBounded(
      [supplied],
      [{ source: "A", target: "B", value: 4 }],
      size
    )
    expect(store.nodes.get("A")!.data).toBe(supplied)
    expect(store.nodes.get("B")!.data).toEqual({ id: "B" })
    expect([...store.nodes.keys()]).toEqual(["A", "B"])
  })
})

describe("public network push accessors", () => {
  beforeEach(() => setupCanvasMock())
  afterEach(() => vi.restoreAllMocks())

  it.each([
    ["ForceDirectedGraph", ForceDirectedGraph],
    ["SankeyDiagram", SankeyDiagram]
  ] as const)(
    "retains custom fields through %s's public ref",
    (_name, Chart) => {
      const ref = React.createRef<RealtimeFrameHandle>()
      const edgeStyle = vi.fn((_edge: Datum) => ({
        fill: "purple",
        stroke: "purple"
      }))
      render(
        <Chart
          ref={ref}
          width={600}
          height={400}
          sourceAccessor="from"
          targetAccessor="to"
          animate={false}
          frameProps={{ edgeStyle, valueAccessor: "amount" }}
        />
      )
      const raw = { from: "A", to: "B", amount: 3, label: "authored payload" }
      act(() => {
        ref.current!.push(raw)
      })
      expect(ref.current!.getData()).toEqual(
        _name === "SankeyDiagram" ? [raw] : [{ id: "A" }, { id: "B" }]
      )
      expect(edgeStyle).toHaveBeenCalled()
      expect(edgeStyle.mock.calls.at(-1)?.[0]).toMatchObject({
        data: raw,
        value: 3
      })
    }
  )
})
