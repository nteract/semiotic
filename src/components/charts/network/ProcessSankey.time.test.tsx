import React from "react"
import { act, render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ProcessSankey } from "./ProcessSankey"
import { TooltipProvider } from "../../store/TooltipStore"
import type { CapturedNetworkFrameProps } from "../../../test-utils/capturedFrameProps"
import type { RealtimeFrameHandle } from "../../realtime/types"

let frame: CapturedNetworkFrameProps | undefined
vi.mock("../../stream/StreamNetworkFrame", () => ({
  default: React.forwardRef((_props: CapturedNetworkFrameProps, _ref) => {
    frame = _props
    return <svg>{_props.backgroundGraphics as React.ReactNode}</svg>
  })
}))

const nodes = [
  { id: "a", label: "Intake", xExtent: ["12", "20"] },
  { id: "b", label: "Treatment", xExtent: ["12", "20"] }
]
const edge = {
  id: "ab",
  source: "a",
  target: "b",
  value: 4,
  startTime: "14",
  endTime: "18"
}

function tooltip(kind: "band" | "ribbon") {
  if (!frame || typeof frame.tooltipContent !== "function")
    throw new Error("No tooltip renderer")
  return frame.tooltipContent({
    x: 0,
    y: 0,
    data: {
      __kind: kind,
      id: kind === "band" ? "a" : "ab",
      data: kind === "band" ? nodes[0] : edge
    }
  })
}

describe("ProcessSankey temporal contract", () => {
  beforeEach(() => {
    frame = undefined
  })

  it.each(["horizontal", "vertical"] as const)(
    "generates numeric ticks and formats numeric strings as numbers in %s orientation",
    (orientation) => {
      const format = vi.fn((time: number | Date) => `step ${time}`)
      const view = render(
        <TooltipProvider>
          <ProcessSankey
            nodes={nodes}
            edges={[edge]}
            domain={["12", "20"]}
            orientation={orientation}
            timeFormat={format}
            nodeLabel="label"
          />
        </TooltipProvider>
      )
      expect(frame?.layoutConfig.ribbons).toHaveLength(1)
      expect(String(frame?.layoutConfig.ribbons[0].pathD)).not.toMatch(
        /NaN|Infinity/
      )
      expect(view.container.textContent).toContain("step 14")
      expect(
        format.mock.calls.every(([time]) => typeof time === "number")
      ).toBe(true)
      const ribbon = render(<>{tooltip("ribbon")}</>)
      expect(ribbon.container.textContent).toContain("step 14")
      expect(ribbon.container.textContent).toContain("step 18")
      const band = render(<>{tooltip("band")}</>)
      expect(band.container.textContent).toContain("Intake")
    }
  )

  it("supports authored labels, automatic numeric labels, and explicitly hidden ticks", () => {
    const view = render(
      <ProcessSankey nodes={nodes} edges={[edge]} domain={["12", "20"]} />
    )
    expect(
      [...view.container.querySelectorAll("text")].map((el) => el.textContent)
    ).toContain("14")
    expect(frame?.margin.bottom).toBe(28)
    view.rerender(
      <ProcessSankey
        nodes={nodes}
        edges={[edge]}
        domain={["12", "20"]}
        axisTicks={[{ date: "14", label: "Arrival" }, { date: "18" }]}
      />
    )
    expect(view.container.textContent).toBe("Arrival18")
    view.rerender(
      <ProcessSankey
        nodes={nodes}
        edges={[edge]}
        domain={["12", "20"]}
        axisTicks={[]}
      />
    )
    expect(view.container.textContent).toBe("")
    expect(frame?.margin.bottom).toBe(8)
  })

  it("passes Date values for ISO domains and preserves intraday tooltip precision", () => {
    const domain: [string, string] = ["2026-01-01T12:00", "2026-01-01T18:00"]
    const timedEdge = {
      ...edge,
      startTime: "2026-01-01T13:30",
      endTime: "2026-01-01T16:45:00.125"
    }
    const format = vi.fn((time: number | Date) => (time as Date).toISOString())
    const view = render(
      <ProcessSankey edges={[timedEdge]} domain={domain} timeFormat={format} />
    )
    expect(format.mock.calls.length).toBeGreaterThan(1)
    expect(format.mock.calls.every(([time]) => time instanceof Date)).toBe(true)
    view.rerender(<ProcessSankey edges={[timedEdge]} domain={domain} />)
    const content = frame!.tooltipContent as (datum: unknown) => React.ReactNode
    const rendered = render(
      <>
        {content({
          x: 0,
          y: 0,
          data: { __kind: "ribbon", id: "ab", data: timedEdge }
        })}
      </>
    )
    expect(rendered.container.textContent).toContain("2026-01-01T13:30:00Z")
    expect(rendered.container.textContent).toContain("2026-01-01T16:45:00.125Z")
  })

  it("uses the same numeric parser for pushed edge records", () => {
    const ref = React.createRef<RealtimeFrameHandle>()
    render(<ProcessSankey ref={ref} nodes={nodes} domain={["12", "20"]} />)
    act(() => {
      ref.current!.pushMany([edge])
    })
    expect(frame?.layoutConfig.ribbons).toHaveLength(1)
    expect(String(frame?.layoutConfig.ribbons[0].pathD)).not.toMatch(
      /NaN|Infinity/
    )
    expect(frame?.layoutConfig.ribbons[0].rawDatum).toEqual(edge)
  })
})
