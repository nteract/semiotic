import * as React from "react"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ChartContainer, type ChartContainerHandle } from "./ChartContainer"
import { RealtimeLineChart } from "./charts/realtime/RealtimeLineChart"
import { DataSummaryProvider, useDataSummary } from "./DataSummaryContext"
import { exportChart } from "./export/exportChart"
import { copyConfig } from "./export/chartConfig"

vi.mock("./export/exportChart", () => ({ exportChart: vi.fn() }))
vi.mock("./export/chartConfig", () => ({ copyConfig: vi.fn() }))

afterEach(() => vi.restoreAllMocks())

describe("ChartContainer state ownership (#1461)", () => {
  it("retains pushed rows, canvas, and the current element when summary actions toggle", () => {
    const chart = React.createRef<React.ElementRef<typeof RealtimeLineChart>>()
    const container = React.createRef<ChartContainerHandle>()
    const ui = (dataSummary: boolean) => (
      <React.StrictMode>
        <ChartContainer ref={container} actions={{ dataSummary }}>
          <RealtimeLineChart ref={chart} timeAccessor="t" valueAccessor="v" />
        </ChartContainer>
      </React.StrictMode>
    )
    const view = render(ui(false))
    const element = container.current!.element!
    const handle = container.current!
    const canvas = element.querySelector("canvas")
    const rows = [
      { t: 1, v: 10 },
      { t: 2, v: 20 }
    ]
    act(() => chart.current!.pushMany(rows))
    for (const enabled of [true, false, true]) {
      view.rerender(ui(enabled))
      expect(chart.current!.getData()).toEqual(rows)
      expect(container.current!.element).toBe(element)
      expect(element.querySelector("canvas")).toBe(canvas)
      expect(element.isConnected).toBe(true)
    }
    view.unmount()
    expect(handle.element).toBeNull()
  })

  it("preserves an ancestor summary context while the local action is disabled", () => {
    function Summary() {
      const summary = useDataSummary()
      return (
        <button onClick={summary?.toggle}>
          {summary?.visible ? "Visible" : "Hidden"}
        </button>
      )
    }
    render(
      <DataSummaryProvider>
        <ChartContainer>
          <Summary />
        </ChartContainer>
      </DataSummaryProvider>
    )
    fireEvent.click(screen.getByRole("button", { name: "Hidden" }))
    expect(screen.getByRole("button", { name: "Visible" })).toBeInTheDocument()
  })

  it("owns fullscreen state per container and requests itself when another element is fullscreen", () => {
    const first = React.createRef<ChartContainerHandle>()
    const second = React.createRef<ChartContainerHandle>()
    let fullscreen: Element | null = null
    const original = Object.getOwnPropertyDescriptor(
      document,
      "fullscreenElement"
    )
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreen
    })
    const exit = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: exit
    })
    try {
      render(
        <>
          <ChartContainer
            ref={first}
            height={210}
            actions={{ fullscreen: true }}
          >
            <div>One</div>
          </ChartContainer>
          <ChartContainer
            ref={second}
            height={230}
            actions={{ fullscreen: true }}
          >
            <div>Two</div>
          </ChartContainer>
        </>
      )
      const firstElement = first.current!.element!
      const secondElement = second.current!.element!
      const request = vi.fn().mockResolvedValue(undefined)
      secondElement.requestFullscreen = request
      fullscreen = firstElement
      fireEvent(document, new Event("fullscreenchange"))
      expect(
        within(firstElement).getByRole("button", { name: "Exit fullscreen" })
      ).toBeInTheDocument()
      expect(
        within(secondElement).getByRole("button", { name: "Enter fullscreen" })
      ).toBeInTheDocument()
      expect(secondElement.querySelector(".semiotic-chart-body")).toHaveStyle({
        height: "230px"
      })
      act(() => second.current!.toggleFullscreen())
      expect(request).toHaveBeenCalledOnce()
      expect(exit).not.toHaveBeenCalled()
      act(() => first.current!.toggleFullscreen())
      expect(exit).toHaveBeenCalledOnce()
      fullscreen = document.createElement("video")
      fireEvent(document, new Event("fullscreenchange"))
      expect(
        screen.getAllByRole("button", { name: "Enter fullscreen" })
      ).toHaveLength(2)
    } finally {
      if (original)
        Object.defineProperty(document, "fullscreenElement", original)
      else Reflect.deleteProperty(document, "fullscreenElement")
      Reflect.deleteProperty(document, "exitFullscreen")
    }
  })

  it("reports toolbar export failures, allows retry, and preserves imperative rejection", async () => {
    const ref = React.createRef<ChartContainerHandle>()
    const failure = new Error("Canvas is not origin-clean")
    vi.mocked(exportChart)
      .mockRejectedValueOnce(failure)
      .mockResolvedValue(undefined)
    render(
      <ChartContainer ref={ref} actions={{ export: true }}>
        <svg />
      </ChartContainer>
    )
    fireEvent.click(screen.getByRole("button", { name: "Export chart" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Canvas is not origin-clean"
    )
    fireEvent.click(screen.getByRole("button", { name: "Retry chart export" }))
    expect(
      await screen.findByRole("button", { name: "Export chart" })
    ).toBeEnabled()
    expect(screen.queryByRole("alert")).toBeNull()
    vi.mocked(exportChart).mockRejectedValueOnce(failure)
    await expect(ref.current!.export()).rejects.toBe(failure)
  })

  it("keeps the existing clipboard-denial feedback in the toolbar", async () => {
    vi.mocked(copyConfig).mockRejectedValueOnce(new Error("Permission denied"))
    render(
      <ChartContainer
        actions={{ copyConfig: true }}
        chartConfig={{ component: "LineChart", props: { data: [] } }}
      >
        <svg />
      </ChartContainer>
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Copy chart configuration" })
    )
    expect(
      await screen.findByRole("button", { name: "Copy failed" })
    ).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(
      "Clipboard access may be unavailable or denied"
    )
  })

  it.each([new Error(), "Failed"])(
    "provides export feedback for a rejection without an Error message (%s)",
    async (error) => {
      vi.mocked(exportChart).mockRejectedValueOnce(error)
      render(
        <ChartContainer actions={{ export: true }}>
          <svg />
        </ChartContainer>
      )
      fireEvent.click(screen.getByRole("button", { name: "Export chart" }))
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Unable to download the chart."
      )
      expect(
        screen.getByRole("button", { name: "Retry chart export" })
      ).toBeEnabled()
    }
  )
})
