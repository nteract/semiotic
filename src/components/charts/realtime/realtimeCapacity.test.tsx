import React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { RealtimeLineChart } from "./RealtimeLineChart"
import { RealtimeHistogram } from "./RealtimeHistogram"
import { RealtimeSwarmChart } from "./RealtimeSwarmChart"
import { RealtimeWaterfallChart } from "./RealtimeWaterfallChart"
import { RealtimeHeatmap } from "./RealtimeHeatmap"
import type {
  RealtimeLineChartHandle,
  RealtimeLineChartProps
} from "./RealtimeLineChart.types"

type TestProps = Pick<
  RealtimeLineChartProps,
  "data" | "width" | "height" | "windowMode" | "windowSize" | "maxCapacity"
> & {
  ref: React.Ref<RealtimeLineChartHandle>
}
const charts = [
  {
    name: "RealtimeLineChart",
    render: (props: TestProps) => <RealtimeLineChart {...props} />
  },
  {
    name: "RealtimeHistogram",
    render: (props: TestProps) => <RealtimeHistogram {...props} binSize={1} />
  },
  {
    name: "RealtimeSwarmChart",
    render: (props: TestProps) => <RealtimeSwarmChart {...props} />
  },
  {
    name: "RealtimeWaterfallChart",
    render: (props: TestProps) => <RealtimeWaterfallChart {...props} />
  },
  {
    name: "RealtimeHeatmap",
    render: (props: TestProps) => <RealtimeHeatmap {...props} />
  }
]
const rows = Array.from({ length: 6 }, (_, time) => ({ time, value: time + 1 }))
describe("realtime public retention controls", () => {
  let restore: () => void
  beforeEach(() => {
    restore = setupCanvasMock()
  })
  afterEach(() => {
    restore()
  })
  for (const { name, render: renderChart } of charts) {
    it(`${name} forwards maxCapacity and reacts to its changes`, () => {
      const ref = React.createRef<RealtimeLineChartHandle>()
      const chart = (maxCapacity: number) =>
        renderChart({
          ref,
          data: rows,
          width: 400,
          height: 300,
          windowMode: "growing",
          windowSize: 2,
          maxCapacity
        })
      const { rerender } = render(chart(4))
      expect(ref.current!.getData()).toHaveLength(6)
      act(() => {
        ref.current!.push({ time: 6, value: 7 })
        ref.current!.getData()
      })
      expect(ref.current!.getData().map((d) => d.time)).toEqual([3, 4, 5, 6])
      rerender(chart(2))
      expect(ref.current!.getData().map((d) => d.time)).toEqual([5, 6])
    })
  }
})
