import "../../test-utils/registerBuiltInXYPlugins"
import * as React from "react"
import { act } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { hydrateRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import StreamXYFrame from "./StreamXYFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamNetworkFrame from "./StreamNetworkFrame"
import StreamGeoFrame from "./StreamGeoFrame"
import { createFrameScheduler } from "./test-utils/frameScheduler"

const margin = { top: 50, right: 50, bottom: 50, left: 50 }
const xyData = [
  { x: 0, y: 1 },
  { x: 1, y: 2 }
]

describe("Stream Frame small-size hydration", () => {
  let container: HTMLDivElement
  let restoreCanvas: () => void
  let root: Root | undefined
  let scheduler: ReturnType<typeof createFrameScheduler>

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
    scheduler = createFrameScheduler()
  })

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    container.remove()
    restoreCanvas()
    vi.restoreAllMocks()
  })

  const frames = [
    {
      name: "XY",
      render: (size: [number, number]) => (
        <StreamXYFrame
          chartType="scatter"
          data={xyData}
          size={size}
          margin={margin}
          frameScheduler={scheduler.scheduler}
          background="#abc"
        />
      )
    },
    {
      name: "ordinal",
      render: (size: [number, number]) => (
        <StreamOrdinalFrame
          chartType="bar"
          data={[{ category: "A", value: 2 }]}
          oAccessor="category"
          rAccessor="value"
          size={size}
          margin={margin}
          frameScheduler={scheduler.scheduler}
        />
      )
    },
    {
      name: "network",
      render: (size: [number, number]) => (
        <StreamNetworkFrame
          chartType="sankey"
          edges={[{ source: "a", target: "b", value: 2 }]}
          size={size}
          margin={margin}
          frameScheduler={scheduler.scheduler}
        />
      )
    },
    {
      name: "geographic",
      render: (size: [number, number]) => (
        <StreamGeoFrame
          projection="equalEarth"
          points={[
            { lon: 0, lat: 0 },
            { lon: 1, lat: 1 }
          ]}
          size={size}
          margin={margin}
          frameScheduler={scheduler.scheduler}
        />
      )
    }
  ]

  function expectFiniteDimensions() {
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/)
    for (const element of container.querySelectorAll(
      "svg [width], svg [height]"
    )) {
      for (const attr of ["width", "height"]) {
        const value = element.getAttribute(attr)
        if (value !== null && !value.endsWith("%")) {
          expect(
            Number(value),
            `${element.tagName}.${attr}`
          ).toBeGreaterThanOrEqual(0)
        }
      }
    }
  }

  it.each(frames)(
    "$name hydrates at an exhausted plot size and resizes cleanly",
    ({ render }) => {
      const errors = vi.spyOn(console, "error").mockImplementation(() => {})
      const recoverableErrors: unknown[] = []
      container.innerHTML = renderToString(render([30, 20]))
      expectFiniteDimensions()
      act(() => {
        root = hydrateRoot(container, render([30, 20]), {
          onRecoverableError: (error) => recoverableErrors.push(error)
        })
      })
      expectFiniteDimensions()
      act(() => root!.render(render([600, 300])))
      act(() => scheduler.flush())
      expectFiniteDimensions()
      const canvas = container.querySelector("canvas")!
      expect(canvas.width).toBe(600)
      expect(canvas.height).toBe(300)
      expect(recoverableErrors).toEqual([])
      expect(errors.mock.calls).toEqual([])
    }
  )

  it("hydrates an empty time scale after the server clock has advanced", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    const recoverableErrors: unknown[] = []
    const now = vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2025, 0, 1))
    const chart = (
      <StreamXYFrame
        chartType="line"
        data={[]}
        xScaleType="time"
        size={[600, 300]}
      />
    )
    const html = renderToString(chart)
    now.mockReturnValue(Date.UTC(2026, 8, 25))
    expect(renderToString(chart)).toBe(html)
    container.innerHTML = html
    const labels = () =>
      Array.from(
        container.querySelectorAll(".semiotic-axis-bottom text"),
        (text) => text.textContent
      )
    const before = labels()
    expect(before.length).toBeGreaterThan(0)
    act(() => {
      root = hydrateRoot(container, chart, {
        onRecoverableError: (error) => recoverableErrors.push(error)
      })
    })
    expect(labels()).toEqual(before)
    expect(recoverableErrors).toEqual([])
    expect(errors.mock.calls).toEqual([])
  })
})
