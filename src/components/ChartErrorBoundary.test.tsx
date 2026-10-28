import * as React from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ChartErrorBoundary } from "./ChartErrorBoundary"
import { ChartContainer } from "./ChartContainer"
import { BarChart } from "semiotic/ordinal"
import { Scatterplot } from "semiotic/xy"
import { ForceDirectedGraph } from "semiotic/network"
import { ProportionalSymbolMap } from "semiotic/geo"
import { GaltonBoardChart } from "semiotic/physics"
import { RealtimeLineChart } from "semiotic/realtime"
import { BigNumber } from "semiotic/value"
import type { RealtimeFrameHandle } from "./realtime/types"

function Payload({ valid }: { valid: boolean }) {
  if (!valid) throw new Error("Invalid payload")
  return <div>Corrected chart</div>
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => vi.restoreAllMocks())

describe("chart error recovery", () => {
  it("retries when the parent supplies corrected children", () => {
    const view = render(
      <ChartErrorBoundary>
        <Payload valid={false} />
      </ChartErrorBoundary>
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid payload")
    view.rerender(
      <ChartErrorBoundary>
        <Payload valid />
      </ChartErrorBoundary>
    )
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByText("Corrected chart")).toBeVisible()
  })

  it("recovers inside ChartContainer after a corrected payload", () => {
    const view = render(
      <ChartContainer errorBoundary>
        <Payload valid={false} />
      </ChartContainer>
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid payload")
    expect(screen.getByRole("alert")).toHaveStyle({
      width: "100%",
      height: "100%"
    })
    view.rerender(
      <ChartContainer errorBoundary>
        <Payload valid />
      </ChartContainer>
    )
    expect(screen.getByText("Corrected chart")).toBeVisible()
  })

  it("contains errors in chart wrapper accessors and recovers with corrected props", () => {
    const data = [{ category: "A", value: 12 }]
    const brokenColor = () => {
      throw new Error("Invalid color field")
    }
    const view = render(
      <BarChart data={data} colorBy={brokenColor} width={320} height={180} />
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid color field")
    expect(screen.getByRole("alert")).toHaveStyle({
      width: "320px",
      height: "180px"
    })
    view.rerender(
      <BarChart data={data} colorBy="category" width={320} height={180} />
    )
    expect(screen.queryByRole("alert")).toBeNull()
    expect(view.container.querySelector("canvas")).not.toBeNull()
  })

  it("honors explicit reset keys and compares their values, not the array identity", () => {
    const onError = vi.fn()
    const view = render(
      <ChartErrorBoundary onError={onError} resetKeys={[NaN, 0]}>
        <Payload valid={false} />
      </ChartErrorBoundary>
    )
    expect(onError).toHaveBeenCalledTimes(1)
    view.rerender(
      <ChartErrorBoundary onError={onError} resetKeys={[NaN, 0]}>
        <Payload valid />
      </ChartErrorBoundary>
    )
    expect(screen.getByRole("alert")).toBeVisible()
    expect(onError).toHaveBeenCalledTimes(1)
    view.rerender(
      <ChartErrorBoundary onError={onError} resetKeys={[NaN, -0]}>
        <Payload valid />
      </ChartErrorBoundary>
    )
    expect(screen.getByText("Corrected chart")).toBeVisible()
  })

  it("supports manual retries without looping when a retry still fails", () => {
    let valid = false
    const onError = vi.fn()
    function RetryPayload() {
      return <Payload valid={valid} />
    }
    render(
      <React.StrictMode>
        <ChartErrorBoundary
          onError={onError}
          fallback={(error, reset) => (
            <button onClick={reset}>Retry: {error.message}</button>
          )}
        >
          <RetryPayload />
        </ChartErrorBoundary>
      </React.StrictMode>
    )
    expect(onError).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button"))
    expect(onError).toHaveBeenCalledTimes(2)
    valid = true
    fireEvent.click(screen.getByRole("button"))
    expect(screen.getByText("Corrected chart")).toBeVisible()
    expect(onError).toHaveBeenCalledTimes(2)
  })

  it("does not repeatedly retry an unchanged failing child", () => {
    const onError = vi.fn()
    const child = <Payload valid={false} />
    const view = render(
      <ChartErrorBoundary onError={onError}>{child}</ChartErrorBoundary>
    )
    view.rerender(
      <ChartErrorBoundary onError={onError}>{child}</ChartErrorBoundary>
    )
    expect(onError).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("alert")).toBeVisible()
    view.rerender(
      <ChartErrorBoundary onError={onError}>
        <Payload valid={false} />
      </ChartErrorBoundary>
    )
    expect(onError).toHaveBeenCalledTimes(2)
  })

  it("preserves the live ref, canvas, and pushed data during ordinary parent updates", () => {
    const ref = React.createRef<RealtimeFrameHandle>()
    const view = render(
      <BarChart ref={ref} width={320} height={180} title="Before" />
    )
    const handle = ref.current!
    const canvas = view.container.querySelector("canvas")
    const row = { category: "A", value: 12 }
    act(() => handle.push(row))
    expect(handle.getData()).toEqual([row])
    view.rerender(<BarChart ref={ref} width={320} height={180} title="After" />)
    expect(ref.current).toBe(handle)
    expect(view.container.querySelector("canvas")).toBe(canvas)
    expect(ref.current!.getData()).toEqual([row])
  })

  it("recovers when new data fixes an accessor failure without replacing the callback", () => {
    const colorBy = (row: { category: string; value: number }) => {
      if (row.category === "bad") throw new Error("Invalid category")
      return row.category
    }
    const ref = React.createRef<RealtimeFrameHandle>()
    const view = render(
      <BarChart
        ref={ref}
        data={[{ category: "bad", value: 12 }]}
        colorBy={colorBy}
      />
    )
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid category")
    expect(ref.current).toBeNull()
    const data = [{ category: "good", value: 12 }]
    view.rerender(<BarChart ref={ref} data={data} colorBy={colorBy} />)
    expect(screen.queryByRole("alert")).toBeNull()
    expect(ref.current!.getData()).toEqual(data)
  })

  it.each([
    ["XY", <Scatterplot key="XY" data={[{ x: 1, y: 2 }]} />],
    [
      "ordinal",
      <BarChart key="ordinal" data={[{ category: "A", value: 12 }]} />
    ],
    [
      "network",
      <ForceDirectedGraph
        key="network"
        nodes={[{ id: "a" }, { id: "b" }]}
        edges={[{ source: "a", target: "b" }]}
      />
    ],
    [
      "geo",
      <ProportionalSymbolMap
        key="geo"
        points={[{ lon: 0, lat: 0, value: 10 }]}
        sizeBy="value"
      />
    ],
    [
      "physics",
      <GaltonBoardChart key="physics" data={[{ value: 1 }]} paused />
    ],
    [
      "realtime",
      <RealtimeLineChart
        key="realtime"
        data={[
          { time: 0, value: 1 },
          { time: 1, value: 2 }
        ]}
      />
    ],
    ["value", <BigNumber key="value" value={42} />]
  ] as const)(
    "contains failures in %s loading content and renders corrected inputs",
    (_family, chart) => {
      const view = render(
        React.cloneElement(chart, {
          loading: true,
          loadingContent: <Payload valid={false} />
        })
      )
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid payload")
      view.rerender(chart)
      expect(screen.queryByRole("alert")).toBeNull()
      if (_family === "value") expect(view.container).toHaveTextContent("42")
      else expect(view.container.querySelector("canvas")).not.toBeNull()
    }
  )

  it("preserves synchronous SSR error reporting", () => {
    expect(() =>
      renderToString(
        <BarChart
          data={[{ category: "A", value: 1 }]}
          colorBy={() => {
            throw new Error("Invalid server input")
          }}
        />
      )
    ).toThrow("Invalid server input")
  })
})
