
import React from "react"
import { render, act, waitFor } from "@testing-library/react"
import { RealtimeSwarmChart } from "./RealtimeSwarmChart"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { CategoryColorProvider } from "../../CategoryColors"
import { PipelineStore } from "../../stream/PipelineStore"

describe("RealtimeSwarmChart", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("renders a canvas-based frame", () => {
    const { container } = render(
      <TooltipProvider><RealtimeSwarmChart /></TooltipProvider>
    )
    const frame = container.querySelector(".stream-xy-frame")
    expect(frame).toBeTruthy()
    expect(frame?.querySelector("canvas")).toBeTruthy()
  })

  it("ref exposes push, pushMany, getData, and clear", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeSwarmChart>>()
    render(<TooltipProvider><RealtimeSwarmChart ref={ref} /></TooltipProvider>)
    expect(typeof ref.current!.push).toBe("function")
    expect(typeof ref.current!.pushMany).toBe("function")
    expect(typeof ref.current!.getData).toBe("function")
    expect(typeof ref.current!.clear).toBe("function")
  })

  it("push and getData track data", () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeSwarmChart>>()
    render(<TooltipProvider><RealtimeSwarmChart ref={ref} timeAccessor="t" valueAccessor="v" /></TooltipProvider>)
    act(() => { ref.current!.pushMany([{ t: 1, v: 10 }, { t: 2, v: 20 }, { t: 3, v: 30 }]) })
    expect(ref.current!.getData().length).toBe(3)
    act(() => { ref.current!.clear() })
    expect(ref.current!.getData().length).toBe(0)
  })

  it("accepts all swarm-specific props without crashing", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeSwarmChart
          radius={6}
          fill="#28a745"
          opacity={0.8}
          stroke="#000"
          strokeWidth={1}
          pointStyle={(d) => ({ fill: d.sensor === "sensor1" ? "#fff" : "#000", r: 5 })}
          yScaleType="symlog"
          width={800}
          height={400}
          categoryAccessor="sensor"
          colors={{ sensor1: "#007bff", sensor2: "#28a745" }}
          windowSize={300}
          arrowOfTime="left"
          showAxes={false}
        />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })

  it("renders with controlled data prop", () => {
    const { container } = render(
      <TooltipProvider>
        <RealtimeSwarmChart
          data={[{ time: 1, value: 5 }, { time: 2, value: 10 }]}
          timeAccessor="time"
          valueAccessor="value"
        />
      </TooltipProvider>
    )
    expect(container.querySelector(".stream-xy-frame")).toBeTruthy()
  })

  it("discovers push-mode categories and renders their explicit colors in the legend", async () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeSwarmChart>>()
    const { getByText, container } = render(
      <TooltipProvider>
        <RealtimeSwarmChart
          ref={ref}
          categoryAccessor="sensor"
          colors={{ alpha: "#112233", beta: "#445566" }}
          showLegend
        />
      </TooltipProvider>
    )
    act(() => {
      ref.current!.pushMany([
        { time: 1, value: 4, sensor: "alpha" },
        { time: 2, value: 8, sensor: "beta" }
      ])
    })
    await waitFor(() => {
      expect(getByText("alpha")).toBeTruthy()
      expect(getByText("beta")).toBeTruthy()
    })
    expect(container.innerHTML).toContain("rgb(17, 34, 51)")
    expect(container.innerHTML).toContain("rgb(68, 85, 102)")
  })

  it("seeds a newly enabled legend from data already in the push buffer", async () => {
    const ref = React.createRef<React.ElementRef<typeof RealtimeSwarmChart>>()
    const { queryByText, rerender } = render(
      <TooltipProvider>
        <RealtimeSwarmChart
          ref={ref}
          categoryAccessor="sensor"
          showLegend={false}
        />
      </TooltipProvider>
    )
    act(() => {
      ref.current!.push({ time: 1, value: 4, sensor: "alpha" })
      ref.current!.getData()
    })
    expect(queryByText("alpha")).toBeNull()

    rerender(
      <TooltipProvider>
        <RealtimeSwarmChart ref={ref} categoryAccessor="sensor" showLegend />
      </TooltipProvider>
    )

    await waitFor(() => expect(queryByText("alpha")).toBeTruthy())
  })

  it("uses provider colors in the first non-empty push scene", async () => {
    const scenes: string[][] = []
    const originalComputeScene = PipelineStore.prototype.computeScene
    const computeSpy = vi
      .spyOn(PipelineStore.prototype, "computeScene")
      .mockImplementation(function (
        this: PipelineStore,
        layout: Parameters<PipelineStore["computeScene"]>[0]
      ) {
        originalComputeScene.call(this, layout)
        if (this.scene.length > 0) {
          scenes.push(this.scene.map((node) => String(node.style?.fill)))
        }
      })
    const ref = React.createRef<React.ElementRef<typeof RealtimeSwarmChart>>()
    try {
      render(
        <TooltipProvider>
          <CategoryColorProvider colors={{ alpha: "#123456" }}>
            <RealtimeSwarmChart
              ref={ref}
              categoryAccessor="category"
              showLegend={false}
            />
          </CategoryColorProvider>
        </TooltipProvider>
      )
      await act(async () => {
        ref.current!.push({ time: 1, value: 4, category: "alpha" })
        ref.current!.getData()
        await Promise.resolve()
      })
      await waitFor(() => expect(scenes[0]).toContain("#123456"))
    } finally {
      computeSpy.mockRestore()
    }
  })
})
