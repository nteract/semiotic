import type { CapturedXYFrameProps } from "../../../test-utils/capturedFrameProps"
import type { StreamScales } from "../../stream/types"
import React, { useState } from "react"
import { act, fireEvent, render, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { scaleLinear } from "d3-scale"
import { MinimapChart, type MinimapChartProps } from "./MinimapChart"
import { TooltipProvider } from "../../store/TooltipStore"

// Every frame render, plus real scales that span each frame's plot. At
// width 440 the overview plot is 400x60 over x [0, 100], y [0, 50].
const frameRenders: CapturedXYFrameProps[] = []
vi.mock("../../stream/StreamXYFrame", () => {
  const Frame = React.forwardRef<{ getScales(): StreamScales | null }, CapturedXYFrameProps>((props, ref) => {
    frameRenders.push(props)
    React.useImperativeHandle(ref, () => ({
      getScales: () => {
        const [width, height] = props.size
        const margin = props.margin as { top: number; right: number; bottom: number; left: number }
        return {
          x: scaleLinear().domain([0, 100]).range([0, width - margin.left - margin.right]),
          y: scaleLinear().domain([0, 50]).range([height - margin.top - margin.bottom, 0]),
        }
      },
    }))
    return <div className="stream-xy-frame" />
  })
  return { __esModule: true, default: Frame }
})

const data = [{ x: 0, y: 0 }, { x: 50, y: 25 }, { x: 100, y: 50 }]
const minimap: NonNullable<MinimapChartProps["minimap"]> = {
  height: 60,
  margin: { top: 0, right: 20, bottom: 0, left: 20 },
}
const mainFrame = () => frameRenders.filter((props) => props.enableHover !== false).at(-1)
const overviewFrame = () => frameRenders.filter((props) => props.enableHover === false).at(-1)

async function findBrush(container: HTMLElement) {
  return waitFor(() => {
    const node = container.querySelector<HTMLElement>("[data-semiotic-control='linear-brush']")
    if (!node) throw new Error("overview brush not mounted")
    return node
  })
}

// jsdom has no layout, so the brush maps pointers over its 400x60 size hint:
// clientX / 4 is x, and clientY / 60 of the way down the y domain [50, 0].
async function drag(container: HTMLElement, axis: "x" | "y", from: number, to: number, part?: string) {
  const brush = await findBrush(container)
  const at = (value: number) => ({ pointerId: 1, button: 0, ...(axis === "x" ? { clientX: value, clientY: 30 } : { clientX: 200, clientY: value }) })
  const target = part ? brush.querySelector(`[data-semiotic-brush-part='${part}']`)! : brush
  act(() => { fireEvent.pointerDown(target, at(from)) })
  for (const step of [1, 2, 3]) act(() => { fireEvent.pointerMove(brush, at(from + ((to - from) * step) / 3)) })
  act(() => { fireEvent.pointerUp(brush, at(to)) })
  return brush
}

function ControlledHarness(props: Partial<MinimapChartProps> & { onBrush: (extent: [number, number] | null) => void }) {
  const [extent, setExtent] = useState<[number, number] | undefined>(props.brushExtent)
  return (
    <MinimapChart
      data={data}
      width={440}
      {...props}
      minimap={{ ...minimap, ...props.minimap }}
      brushExtent={extent}
      onBrush={(next) => {
        props.onBrush(next)
        setExtent(next ?? undefined)
      }}
    />
  )
}

// A parent whose inline onBrush re-renders it on every brush event.
function UncontrolledHarness({ onBrush }: { onBrush: (extent: [number, number] | null) => void }) {
  const [, setCount] = useState(0)
  return (
    <MinimapChart
      data={data}
      width={440}
      minimap={minimap}
      onBrush={(next) => {
        onBrush(next)
        setCount((count) => count + 1)
      }}
    />
  )
}

describe("MinimapChart brush", () => {
  let rafSpy: ReturnType<typeof vi.spyOn>
  let cafSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    frameRenders.length = 0
    rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(performance.now())
      return 1
    })
    cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
  })
  afterEach(() => {
    rafSpy.mockRestore()
    cafSpy.mockRestore()
  })

  it.each([
    ["controlled", (onBrush: (extent: [number, number] | null) => void) => <ControlledHarness onBrush={onBrush} />],
    ["uncontrolled with an inline onBrush", (onBrush: (extent: [number, number] | null) => void) => <UncontrolledHarness onBrush={onBrush} />],
  ])("keeps a drag alive across re-renders (%s)", async (_label, harness) => {
    const onBrush = vi.fn()
    const { container } = render(<TooltipProvider>{harness(onBrush)}</TooltipProvider>)
    await drag(container, "x", 40, 160)

    expect(onBrush.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(onBrush).toHaveBeenLastCalledWith([10, 40])
    expect(mainFrame()?.xExtent).toEqual([10, 40])
  })

  it("brushes the detail's y domain in ascending order for brushDirection y", async () => {
    const onBrush = vi.fn()
    const { container } = render(
      <TooltipProvider><ControlledHarness onBrush={onBrush} minimap={{ brushDirection: "y" }} /></TooltipProvider>
    )
    await drag(container, "y", 12, 48)

    expect(onBrush).toHaveBeenLastCalledWith([10, 40])
    expect(mainFrame()?.yExtent).toEqual([10, 40])
    expect(mainFrame()?.xExtent).toBeUndefined()
    expect(overviewFrame()?.yExtent).toBeUndefined()
  })

  it("draws a controlled y extent as a band", async () => {
    const { container } = render(
      <TooltipProvider>
        <MinimapChart data={data} width={440} minimap={{ ...minimap, brushDirection: "y" }} brushExtent={[10, 40]} yExtent={[0, 50]} />
      </TooltipProvider>
    )
    const brush = await findBrush(container)
    const selection = brush.querySelector<HTMLElement>("[data-semiotic-brush-part='selection']")!
    expect([selection.style.top, selection.style.height]).toEqual(["20%", "60%"])
    expect(mainFrame()?.yExtent).toEqual([10, 40])
    expect(overviewFrame()?.yExtent).toEqual([0, 50])
  })

  it("calls onBrushEnd once per changed release", async () => {
    const onBrushEnd = vi.fn()
    const { container } = render(
      <TooltipProvider><ControlledHarness onBrush={vi.fn()} onBrushEnd={onBrushEnd} /></TooltipProvider>
    )
    await drag(container, "x", 40, 160)
    expect(onBrushEnd).toHaveBeenCalledTimes(1)
    expect(onBrushEnd).toHaveBeenCalledWith([10, 40], { source: "pointer", atDomainStart: false, atDomainEnd: false })
    // A click on the selection changes nothing.
    await drag(container, "x", 100, 100, "selection")
    expect(onBrushEnd).toHaveBeenCalledTimes(1)
  })

  it("keeps the brush at least one pixel wide", async () => {
    const onBrush = vi.fn()
    const { container } = render(
      <TooltipProvider><ControlledHarness onBrush={onBrush} brushExtent={[10, 40]} /></TooltipProvider>
    )
    await drag(container, "x", 160, 0, "end")
    expect(onBrush).toHaveBeenLastCalledWith([10, 10.25])
  })

  it("brushes from the keyboard", async () => {
    const onBrush = vi.fn()
    const { container } = render(
      <TooltipProvider><ControlledHarness onBrush={onBrush} minimap={{ brushLabel: "Detail window" }} /></TooltipProvider>
    )
    const brush = await findBrush(container)
    fireEvent.keyDown(within(brush).getByRole("slider", { name: "Detail window (move both ends)" }), { key: "ArrowRight" })
    expect(onBrush).toHaveBeenLastCalledWith([45, 65])
  })

  it("reports brush observations and the gesture boundaries", async () => {
    const onObservation = vi.fn()
    const { container } = render(
      <TooltipProvider><ControlledHarness onBrush={vi.fn()} onObservation={onObservation} chartId="overview" /></TooltipProvider>
    )
    await drag(container, "x", 40, 160)
    const types = onObservation.mock.calls.map(([observation]) => observation.type)
    expect(types[0]).toBe("control-start")
    expect(types.at(-1)).toBe("control-end")
    expect(types).not.toContain("control-change")
    expect(types.filter((type) => type === "brush")).toHaveLength(3)
    expect(onObservation.mock.calls.find(([observation]) => observation.type === "brush")![0]).toMatchObject({
      chartType: "MinimapChart",
      chartId: "overview",
      extent: { y: [0, 50] },
    })
    expect(onObservation.mock.calls[0][0]).toMatchObject({ chartType: "MinimapChart", controlType: "range-boundary" })
  })

  it("shows handles at the overview's ends when empty and makes room for opted-in chrome", async () => {
    const renderHandle = vi.fn(() => null)
    const { container } = render(
      <TooltipProvider>
        <MinimapChart data={data} minimap={{ height: 60, handles: { move: true }, showExtentLabels: true, renderHandle }} />
      </TooltipProvider>
    )
    await findBrush(container)
    const sides = (renderHandle.mock.calls as unknown as [{ side: string }][]).map(([context]) => context.side)
    expect(sides).toEqual(expect.arrayContaining(["start", "end"]))
    const margin = overviewFrame()?.margin as { top: number; bottom: number }
    expect([margin.top, margin.bottom]).toEqual([6, 34])
  })
})
