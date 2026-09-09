import * as React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import type { Datum } from "../shared/datumTypes"
import type { PhysicsFrameHandle } from "./physicsHocHandle"
import { EventDropChart } from "./EventDropChart"
import { PacketFlowChart } from "./PacketFlowChart"
import { PhysicsCustomChart } from "./PhysicsCustomChart"
import { ProcessFlowChart } from "./ProcessFlowChart"

type InputProps = {
  ref: React.Ref<PhysicsFrameHandle>
  data?: Datum[]
  emptyContent: React.ReactElement
}

const nodes = [
  { id: "from", x: 0.1, y: 0.5 },
  { id: "to", x: 0.9, y: 0.5 }
]
const cases: Array<[string, (props: InputProps) => React.ReactElement]> = [
  ["EventDropChart", (props) => <EventDropChart {...props} />],
  [
    "ProcessFlowChart",
    (props) => <ProcessFlowChart {...props} stages={[{ id: "work" }]} />
  ],
  [
    "PacketFlowChart data",
    (props) => <PacketFlowChart {...props} nodes={nodes} />
  ],
  [
    "PacketFlowChart links",
    ({ data, ...props }) => (
      <PacketFlowChart {...props} nodes={nodes} links={data} />
    )
  ],
  [
    "PacketFlowChart edges",
    ({ data, ...props }) => (
      <PacketFlowChart {...props} nodes={nodes} edges={data} />
    )
  ],
  [
    "PhysicsCustomChart",
    (props) => (
      <PhysicsCustomChart
        {...props}
        layout={({ data }) => ({
          bodies: data.map((datum) => ({
            id: String(datum.id),
            x: 60,
            y: 40,
            shape: { type: "circle", radius: 4 },
            datum
          }))
        })}
      />
    )
  ]
]

describe("related physics empty-input contracts", () => {
  let cleanupCanvas: () => void
  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => cleanupCanvas())

  it.each(cases)(
    "%s rejects pushes while its input is explicitly empty",
    (_, makeChart) => {
      const ref = React.createRef<PhysicsFrameHandle>()
      const row = {
        id: "a",
        time: 1,
        stage: "work",
        source: "from",
        target: "to",
        value: 1
      }
      const chart = (data?: Datum[]) =>
        makeChart({
          ref,
          data,
          emptyContent: <span>Controlled empty</span>
        })
      const { container, getByText, rerender } = render(chart([]))
      const handle = ref.current!
      act(() => {
        handle.push(row)
        handle.pushMany([{ ...row, id: "b" }])
      })
      expect(getByText("Controlled empty")).toBeTruthy()
      expect(container.querySelector("canvas")).toBeNull()
      expect(handle.getData()).toEqual([])
      expect(handle.remove("a")).toEqual([])

      rerender(chart())
      expect(handle.getData()).toEqual([])
      act(() => ref.current!.push(row))
      expect(ref.current!.getData().some((datum) => datum.id === "a")).toBe(
        true
      )
      const liveHandle = ref.current!
      rerender(chart([]))
      act(() => liveHandle.push(row))
      expect(liveHandle.getData()).toEqual([])
      expect(container.querySelector("canvas")).toBeNull()
      expect(getByText("Controlled empty")).toBeTruthy()
    }
  )
})
