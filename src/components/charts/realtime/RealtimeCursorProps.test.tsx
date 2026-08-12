import * as React from "react"
import { render, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LinkedCharts, useSelectionActions } from "../../LinkedCharts"
import type { StreamXYFrameProps } from "../../stream/types"
import { RealtimeHeatmap } from "./RealtimeHeatmap"
import { RealtimeHistogram, TemporalHistogram } from "./RealtimeHistogram"
import { RealtimeLineChart } from "./RealtimeLineChart"
import { RealtimeSwarmChart } from "./RealtimeSwarmChart"
import { RealtimeWaterfallChart } from "./RealtimeWaterfallChart"

const capturedFrames: StreamXYFrameProps[] = []

vi.mock("../../stream/StreamXYFrame", () => ({
  default: React.forwardRef((props: StreamXYFrameProps, _ref) => {
    capturedFrames.push(props)
    return <div data-testid="stream-xy-frame" />
  })
}))

function SeedSelection() {
  const { selectPoints } = useSelectionActions(
    "realtime-cursor-selection",
    "cursor-test-producer"
  )

  React.useEffect(() => {
    selectPoints({ group: ["selected"] })
  }, [selectPoints])

  return null
}

const datum = { time: 1, value: 2, group: "unselected" }

describe("realtime cursor props", () => {
  beforeEach(() => {
    capturedFrames.length = 0
  })

  it("threads the public cursor default into every retained mark style", () => {
    render(
      <>
        <RealtimeLineChart data={[datum]} cursor="crosshair" />
        <RealtimeHistogram data={[datum]} binSize={10} cursor="pointer" />
        <TemporalHistogram data={[datum]} binSize={10} cursor="wait" />
        <RealtimeSwarmChart
          data={[datum]}
          cursor="grab"
          pointStyle={() => ({ cursor: "zoom-in" })}
        />
        <RealtimeWaterfallChart data={[datum]} cursor="col-resize" />
        <RealtimeHeatmap data={[datum]} cursor="cell" />
      </>
    )

    const lineStyle = capturedFrames[0]?.lineStyle
    expect(
      typeof lineStyle === "function"
        ? lineStyle(datum).cursor
        : lineStyle?.cursor
    ).toBe("crosshair")
    expect(capturedFrames[1]?.barStyle?.cursor).toBe("pointer")
    expect(capturedFrames[2]?.barStyle?.cursor).toBe("wait")
    expect(capturedFrames[3]?.swarmStyle?.cursor).toBe("grab")
    expect(capturedFrames[3]?.pointStyle?.(datum).cursor).toBe("zoom-in")
    expect(capturedFrames[4]?.waterfallStyle?.cursor).toBe("col-resize")
    expect(capturedFrames[5]?.areaStyle?.(datum).cursor).toBe("cell")
  })

  it("keeps cursor defaults and Swarm overrides when selection styles compose", async () => {
    render(
      <LinkedCharts showLegend={false}>
        <SeedSelection />
        <RealtimeSwarmChart
          data={[datum]}
          cursor="grab"
          pointStyle={() => ({ cursor: "zoom-in" })}
          selection={{
            name: "realtime-cursor-selection",
            unselectedOpacity: 0.24
          }}
        />
        <RealtimeHeatmap
          data={[datum]}
          cursor="cell"
          selection={{
            name: "realtime-cursor-selection",
            unselectedOpacity: 0.24
          }}
        />
      </LinkedCharts>
    )

    await waitFor(() => {
      const swarm = capturedFrames
        .filter((frame) => frame.chartType === "swarm")
        .at(-1)
      const heatmap = capturedFrames
        .filter((frame) => frame.chartType === "heatmap")
        .at(-1)

      expect(swarm?.swarmStyle?.cursor).toBe("grab")
      expect(swarm?.pointStyle?.(datum)).toMatchObject({
        cursor: "zoom-in",
        opacity: 0.24,
        fillOpacity: 0.24,
        strokeOpacity: 0.24
      })
      expect(heatmap?.areaStyle?.(datum)).toMatchObject({
        cursor: "cell",
        opacity: 0.24,
        fillOpacity: 0.24,
        strokeOpacity: 0.24
      })
    })
  })
})
