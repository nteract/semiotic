import * as React from "react"
import { act, render } from "@testing-library/react"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import StreamNetworkFrame from "./StreamNetworkFrame"
import type {
  NetworkPipelineConfig,
  StreamNetworkFrameHandle
} from "./networkTypes"
import type { Datum } from "../charts/shared/datumTypes"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import "./layouts/sankeyLayoutPlugin"
import "./layouts/forceLayoutPlugin"

const size: [number, number] = [600, 400]
const accessors = [
  { name: "default", field: "value", accessor: undefined },
  { name: "string", field: "amount", accessor: "amount" },
  {
    name: "function",
    field: "amount",
    accessor: (datum: Datum) => datum.amount
  }
] as const
const makeStore = (valueAccessor?: NetworkPipelineConfig["valueAccessor"]) =>
  new NetworkPipelineStore({
    chartType: "sankey",
    valueAccessor,
    transition: { duration: 0 }
  })

describe.each(accessors)(
  "accumulated edge updates with $name accessor",
  ({ field, accessor }) => {
    it.each([false, true])(
      "retains totals for metadata edits, then replaces changed values (mutating=%s)",
      (mutating) => {
        const store = makeStore(accessor)
        store.ingestEdge({
          source: "A",
          target: "B",
          [field]: 2,
          label: "first"
        })
        store.ingestEdge({
          source: "A",
          target: "B",
          [field]: 3,
          label: "latest"
        })
        store.runLayout(size)
        store.buildScene(size)
        const edge = store.edgesArray[0]
        expect(edge.value).toBe(5)
        const update = (patch: Datum) =>
          store.updateEdge("A", "B", (datum) =>
            mutating ? Object.assign(datum, patch) : { ...datum, ...patch }
          )
        expect(update({ label: "renamed" })).toEqual([
          { source: "A", target: "B", [field]: 3, label: "latest" }
        ])
        expect(edge.value).toBe(5)
        expect(edge.data).toMatchObject({ [field]: 3, label: "renamed" })
        store.runLayout(size)
        store.buildScene(size)
        expect(store.sceneEdges[0].datum).toMatchObject({
          value: 5,
          data: { label: "renamed" }
        })

        store.ingestEdge({ source: "A", target: "B", [field]: 4 })
        update({ label: "after push" })
        expect(edge.value).toBe(9)
        update({ [field]: 7 })
        expect(edge.value).toBe(7)
        store.ingestEdge({ source: "A", target: "B", [field]: 2 })
        update({ label: "after replacement" })
        expect(edge.value).toBe(9)
      }
    )

    it.each([undefined, null, NaN, "n/a"])(
      "retains accumulated fallback values when unchanged input is %s",
      (value) => {
        const store = makeStore(accessor)
        store.ingestEdge({ source: "A", target: "B", [field]: value })
        store.ingestEdge({ source: "A", target: "B", [field]: value })
        store.updateEdge("A", "B", (datum) => ({ ...datum, label: "metadata" }))
        expect(store.edgesArray[0].value).toBe(2)
        store.updateEdge("A", "B", (datum) => ({ ...datum, [field]: 0 }))
        expect(store.edgesArray[0].value).toBe(0)
      }
    )

    it("updates bounded parallel rows independently without aggregation", () => {
      const store = makeStore(accessor)
      store.ingestBounded(
        [],
        [
          { source: "A", target: "B", [field]: 2 },
          { source: "A", target: "B", [field]: 3 }
        ],
        size
      )
      const previous = store.updateEdge("A", "B", (datum) => ({
        ...datum,
        label: "edited"
      }))
      expect(previous.map((datum) => datum[field])).toEqual([2, 3])
      expect(store.edgesArray.map((edge) => edge.value)).toEqual([2, 3])
      store.updateEdge("A", "B", (datum) =>
        Object.assign(datum, { [field]: 8 })
      )
      expect(store.edgesArray.map((edge) => edge.value)).toEqual([8, 8])
    })
  }
)

it("detects a derived accessor change before an in-place updater mutates its inputs", () => {
  const store = makeStore((datum) => datum.amount * datum.multiplier)
  store.ingestEdge({ source: "A", target: "B", amount: 2, multiplier: 2 })
  store.ingestEdge({ source: "A", target: "B", amount: 3, multiplier: 2 })
  store.updateEdge("A", "B", (datum) => ({ ...datum, label: "same total" }))
  expect(store.edgesArray[0].value).toBe(10)
  store.updateEdge("A", "B", (datum) => Object.assign(datum, { multiplier: 3 }))
  expect(store.edgesArray[0].value).toBe(9)
})

it("invalidates custom layout data for metadata edits without replacing the aggregate", () => {
  const observations: Array<{ value: number; label: unknown }> = []
  const customNetworkLayout = vi.fn<NetworkCustomLayout>(({ edges }) => {
    observations.push({ value: edges[0].value, label: edges[0].data?.label })
    return {}
  })
  const store = new NetworkPipelineStore({
    chartType: "force",
    customNetworkLayout
  })
  store.ingestEdge({ source: "A", target: "B", value: 2 })
  store.ingestEdge({ source: "A", target: "B", value: 3 })
  store.buildScene(size)
  store.buildScene(size)
  store.updateEdge("A", "B", (datum) => ({ ...datum, label: "edited" }))
  store.buildScene(size)
  store.buildScene(size)
  expect(observations).toEqual([
    { value: 5, label: undefined },
    { value: 5, label: "edited" }
  ])
})

describe("public network updateEdge", () => {
  beforeEach(() => setupCanvasMock())
  afterEach(() => vi.restoreAllMocks())

  it.each(["force", "sankey"] as const)(
    "preserves %s totals through updates, config changes and later pushes",
    (chartType) => {
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const edgeStyle = vi.fn((_edge: Datum) => ({
        stroke: "purple",
        fill: "purple"
      }))
      const props = {
        ref,
        chartType,
        sourceAccessor: "from",
        targetAccessor: "to",
        valueAccessor: "amount",
        animate: false as const,
        edgeStyle
      }
      const { rerender } = render(<StreamNetworkFrame {...props} size={size} />)
      act(() =>
        ref.current!.pushMany([
          { from: "A", to: "B", amount: 2 },
          { from: "A", to: "B", amount: 3 }
        ])
      )
      act(() => {
        ref.current!.updateEdge("A", "B", (datum) => ({
          ...datum,
          label: "edited"
        }))
      })
      const readEdge = () => ref.current!.getTopology().edges[0]
      expect(readEdge()).toMatchObject({
        value: 5,
        data: { amount: 3, label: "edited" }
      })
      expect(edgeStyle.mock.calls.at(-1)![0]).toMatchObject({
        value: 5,
        data: { label: "edited" }
      })
      rerender(<StreamNetworkFrame {...props} size={size} edgeOpacity={0.25} />)
      expect(readEdge().value).toBe(5)
      const equivalentAccessor = (datum: Datum) => datum.amount
      rerender(
        <StreamNetworkFrame
          {...props}
          valueAccessor={equivalentAccessor}
          nodeSize={12}
          size={[420, 300]}
        />
      )
      expect(readEdge().value).toBe(5)
      act(() => {
        ref.current!.push({ from: "A", to: "B", amount: 4 })
        ref.current!.updateEdge("A", "B", (datum) =>
          Object.assign(datum, { label: "batched" })
        )
      })
      expect(readEdge()).toMatchObject({
        value: 9,
        data: { amount: 4, label: "batched" }
      })
      act(() => {
        ref.current!.updateEdge("A", "B", (datum) => ({ ...datum, amount: 6 }))
      })
      expect(readEdge().value).toBe(6)
    }
  )
})
