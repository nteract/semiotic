import * as React from "react"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { HoverData } from "../../realtime/types"
import type { StreamXYFrameProps } from "../../stream/types"
import type { TooltipProp } from "../../Tooltip/Tooltip"
import { RealtimeHeatmap } from "./RealtimeHeatmap"
import { RealtimeHistogram } from "./RealtimeHistogram"
import { RealtimeLineChart } from "./RealtimeLineChart"
import { RealtimeSwarmChart } from "./RealtimeSwarmChart"
import { RealtimeWaterfallChart } from "./RealtimeWaterfallChart"

const capturedFrames: StreamXYFrameProps[] = []

vi.mock("../../stream/StreamXYFrame", () => ({
  default: React.forwardRef((props: StreamXYFrameProps, _ref) => {
    capturedFrames.push(props)
    return <div data-testid="stream-xy-frame" />
  }),
}))

function cases(tooltip: TooltipProp) {
  const data = [{ time: 1, value: 2, label: "Sample" }]
  return [
    ["line", <RealtimeLineChart key="line" data={data} tooltip={tooltip} />],
    ["histogram", <RealtimeHistogram key="histogram" data={data} binSize={10} tooltip={tooltip} />],
    ["swarm", <RealtimeSwarmChart key="swarm" data={data} tooltip={tooltip} />],
    ["waterfall", <RealtimeWaterfallChart key="waterfall" data={data} tooltip={tooltip} />],
    ["heatmap", <RealtimeHeatmap key="heatmap" data={data} tooltip={tooltip} />],
  ] as const
}

const hover = {
  __semioticHoverData: true,
  data: { time: 1, value: 2, label: "Sample" },
  x: 30,
  y: 40,
} as HoverData

describe("realtime tooltip prop consistency", () => {
  beforeEach(() => {
    capturedFrames.length = 0
  })

  it("honors tooltip={false} across every realtime chart", () => {
    for (const [name, element] of cases(false)) {
      capturedFrames.length = 0
      const view = render(element)
      const frame = capturedFrames.at(-1)
      expect(frame?.tooltipContent?.(hover), name).toBeNull()
      view.unmount()
    }
  })

  it("accepts shared declarative tooltip configs across every realtime chart", () => {
    for (const [name, element] of cases({ title: "label", fields: ["value"] })) {
      capturedFrames.length = 0
      const view = render(element)
      const frame = capturedFrames.at(-1)
      const tooltip = render(<>{frame?.tooltipContent?.(hover)}</>)
      expect(tooltip.container.textContent, name).toContain("Sample")
      expect(tooltip.container.textContent, name).toContain("2")
      tooltip.unmount()
      view.unmount()
    }
  })

  it("passes the authored raw datum to top-level callbacks across every realtime chart", () => {
    const custom = vi.fn(() => <div>custom</div>)
    for (const [name, element] of cases(custom)) {
      capturedFrames.length = 0
      custom.mockClear()
      const view = render(element)
      const frame = capturedFrames.at(-1)
      frame?.tooltipContent?.(hover)
      expect(custom, name).toHaveBeenCalledWith(hover.data)
      view.unmount()
    }
  })

  it("retains full HoverData access through the explicit tooltipContent escape hatch", () => {
    const legacy = vi.fn(() => <div>legacy</div>)
    const data = [{ time: 1, value: 2, label: "Sample" }]
    const charts = [
      <RealtimeLineChart key="line" data={data} tooltipContent={legacy} />,
      <RealtimeHistogram key="histogram" data={data} binSize={10} tooltipContent={legacy} />,
      <RealtimeSwarmChart key="swarm" data={data} tooltipContent={legacy} />,
      <RealtimeWaterfallChart key="waterfall" data={data} tooltipContent={legacy} />,
      <RealtimeHeatmap key="heatmap" data={data} tooltipContent={legacy} />,
    ]

    for (const element of charts) {
      capturedFrames.length = 0
      legacy.mockClear()
      const view = render(element)
      capturedFrames.at(-1)?.tooltipContent?.(hover)
      expect(legacy).toHaveBeenCalledWith(hover)
      view.unmount()
    }
  })

  it("enables multi hover on the line geometry without claiming it for point/rect charts", () => {
    for (const [name, element] of cases({ mode: "multi" })) {
      capturedFrames.length = 0
      const view = render(element)
      const frame = capturedFrames.at(-1)
      expect(frame?.tooltipMode, name).toBe(name === "line" ? "multi" : undefined)
      view.unmount()
    }
  })

  it.each(["multi" as const, { mode: "multi" as const }])(
    "renders a useful single-datum fallback for unsupported %o requests",
    (tooltip) => {
      for (const [name, element] of cases(tooltip)) {
        if (name === "line") continue
        capturedFrames.length = 0
        const view = render(element)
        const content = capturedFrames.at(-1)?.tooltipContent?.(hover)
        const rendered = render(<>{content}</>)
        expect(rendered.container.textContent, name).toContain("Sample")
        expect(rendered.container.textContent, name).toContain("2")
        rendered.unmount()
        view.unmount()
      }
    },
  )
})
