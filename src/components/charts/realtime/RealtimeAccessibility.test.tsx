import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { CapturedXYFrameProps } from "../../../test-utils/capturedFrameProps"
import { TooltipProvider } from "../../store/TooltipStore"
import { RealtimeLineChart } from "./RealtimeLineChart"
import { RealtimeHistogram } from "./RealtimeHistogram"
import { RealtimeSwarmChart } from "./RealtimeSwarmChart"
import { RealtimeWaterfallChart } from "./RealtimeWaterfallChart"
import { RealtimeHeatmap } from "./RealtimeHeatmap"
import type { OnObservationCallback } from "../../store/ObservationStore"

let captured = {} as CapturedXYFrameProps
vi.mock("../../stream/StreamXYFrame", () => ({
  __esModule: true,
  default: React.forwardRef<unknown, CapturedXYFrameProps>((props, _ref) => {
    captured = props
    return <div className="stream-xy-frame" />
  })
}))

const metadata = {
  title: "Live signal",
  description: "A continuously updating signal",
  summary: "The latest reading is elevated.",
  accessibleTable: false
} as const

const cases: Array<[string, React.ReactElement]> = [
  [
    "line",
    <RealtimeLineChart
      key="line"
      data={[{ time: 1, value: 2 }]}
      {...metadata}
    />
  ],
  [
    "histogram",
    <RealtimeHistogram
      key="histogram"
      binSize={100}
      data={[{ time: 1, value: 2 }]}
      {...metadata}
    />
  ],
  [
    "swarm",
    <RealtimeSwarmChart
      key="swarm"
      data={[{ time: 1, value: 2 }]}
      {...metadata}
    />
  ],
  [
    "waterfall",
    <RealtimeWaterfallChart
      key="waterfall"
      data={[{ time: 1, value: 2 }]}
      {...metadata}
    />
  ],
  [
    "heatmap",
    <RealtimeHeatmap
      key="heatmap"
      data={[{ time: 1, value: 2 }]}
      {...metadata}
    />
  ]
]

const activationCases: Array<
  [string, (onObservation: OnObservationCallback) => React.ReactElement]
> = [
  [
    "line",
    (onObservation) => (
      <RealtimeLineChart
        data={[{ time: 1, value: 2 }]}
        mobileInteraction={{ enabled: true, clearSelection: "backgroundTap" }}
        onObservation={onObservation}
      />
    )
  ],
  [
    "histogram",
    (onObservation) => (
      <RealtimeHistogram
        binSize={100}
        data={[{ time: 1, value: 2 }]}
        mobileInteraction={{ enabled: true, clearSelection: "backgroundTap" }}
        onObservation={onObservation}
      />
    )
  ],
  [
    "swarm",
    (onObservation) => (
      <RealtimeSwarmChart
        data={[{ time: 1, value: 2 }]}
        mobileInteraction={{ enabled: true, clearSelection: "backgroundTap" }}
        onObservation={onObservation}
      />
    )
  ],
  [
    "waterfall",
    (onObservation) => (
      <RealtimeWaterfallChart
        data={[{ time: 1, value: 2 }]}
        mobileInteraction={{ enabled: true, clearSelection: "backgroundTap" }}
        onObservation={onObservation}
      />
    )
  ],
  [
    "heatmap",
    (onObservation) => (
      <RealtimeHeatmap
        data={[{ time: 1, value: 2 }]}
        mobileInteraction={{ enabled: true, clearSelection: "backgroundTap" }}
        onObservation={onObservation}
      />
    )
  ]
]

describe("realtime accessibility contract", () => {
  it.each(cases)(
    "forwards metadata through the %s wrapper",
    (_name, element) => {
      captured = {} as CapturedXYFrameProps
      render(<TooltipProvider>{element}</TooltipProvider>)
      expect(captured.title).toBe(metadata.title)
      expect(captured.description).toBe(metadata.description)
      expect(captured.summary).toBe(metadata.summary)
      expect(captured.accessibleTable).toBe(false)
    }
  )

  it.each(activationCases)(
    "forwards mobile background activation through the %s wrapper",
    (_name, renderChart) => {
      const onObservation = vi.fn()
      captured = {} as CapturedXYFrameProps
      render(<TooltipProvider>{renderChart(onObservation)}</TooltipProvider>)

      expect(captured.customClickBehavior).toBeTypeOf("function")
      captured.customClickBehavior?.(null)
      expect(onObservation).toHaveBeenCalledWith(
        expect.objectContaining({ type: "click-end" })
      )
    }
  )
})
