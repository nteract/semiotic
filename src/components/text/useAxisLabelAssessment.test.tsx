import React from "react"
import { act, cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { LineChart } from "semiotic/xy"
import type { RealtimeFrameHandle } from "../realtime/types"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { useAxisLabelAssessment } from "./useAxisLabelAssessment"

const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts")
let fonts: EventTarget & { status: string }
let labelWidth: number
let cleanupCanvas: () => void

function Chart({ enabled = true, revision = 0 }) {
  const { ref, assessment } = useAxisLabelAssessment(enabled, revision)
  return (
    <svg ref={ref} data-assessment={JSON.stringify(assessment)}>
      <g className="semiotic-axis" data-orient="bottom">
        <text className="semiotic-axis-tick">First</text>
        <text className="semiotic-axis-tick">Second</text>
      </g>
    </svg>
  )
}

beforeEach(() => {
  cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  labelWidth = 10
  fonts = Object.assign(new EventTarget(), {
    status: "loading",
    check: () => false
  })
  Object.defineProperty(document, "fonts", { configurable: true, value: fonts })
  vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: SVGElement) {
      return this.tagName === "svg"
        ? new DOMRect(0, 0, 100, 100)
        : new DOMRect(
            this.textContent === "First" ? 10 : 30,
            50,
            labelWidth,
            10
          )
    }
  )
})

afterEach(() => {
  cleanup()
  cleanupCanvas()
  vi.restoreAllMocks()
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts)
  else Reflect.deleteProperty(document, "fonts")
})

describe("axis label assessment lifecycle", () => {
  it.each(["bounded", "push"])(
    "refreshes public %s LineChart evidence after font loading",
    async (mode) => {
      const data = [
        { x: 0, y: 1, series: "A" },
        { x: 1, y: 2, series: "A" }
      ]
      const ref = React.createRef<RealtimeFrameHandle>()
      const { container } = render(
        <LineChart
          ref={ref}
          data={mode === "bounded" ? data : undefined}
          lineBy="series"
          directLabel
          width={400}
          height={300}
        />
      )
      if (mode === "push") act(() => ref.current!.pushMany(data))
      const assessment = () =>
        JSON.parse(
          container
            .querySelector("[data-axis-label-layout]")!
            .getAttribute("data-axis-label-layout")!
        )
      await waitFor(() => expect(assessment().status).toBe("incomplete"))
      expect(assessment().unsupported).toBeGreaterThan(0)
      fonts.status = "loaded"
      act(() => fonts.dispatchEvent(new Event("loadingdone")))
      await waitFor(() => expect(assessment().status).toBe("complete"))
      expect(assessment().checked).toBeGreaterThan(0)
      expect(assessment().unsupported).toBe(0)
    }
  )

  it("leaves server-rendered evidence unassessed without subscribing to fonts", () => {
    const subscribe = vi.spyOn(fonts, "addEventListener")
    const markup = renderToStaticMarkup(<Chart />)
    const root = new DOMParser().parseFromString(markup, "text/html")
    const assessment = JSON.parse(
      root.querySelector("svg")!.getAttribute("data-assessment")!
    )
    expect(assessment.status).toBe("not-assessed")
    expect(subscribe).not.toHaveBeenCalled()
  })

  it("reassesses actual label geometry after fonts load without a revision change", async () => {
    const { container } = render(<Chart />)
    const assessment = () =>
      JSON.parse(container.firstElementChild!.getAttribute("data-assessment")!)
    await waitFor(() =>
      expect(assessment()).toMatchObject({
        status: "incomplete",
        unsupported: 2
      })
    )

    fonts.status = "loaded"
    act(() => fonts.dispatchEvent(new Event("loadingdone")))
    await waitFor(() =>
      expect(assessment()).toMatchObject({
        status: "complete",
        checked: 2,
        unsupported: 0,
        collisions: 0
      })
    )

    labelWidth = 30
    act(() =>
      fonts.dispatchEvent(
        Object.assign(new Event("loadingdone"), { fontfaces: [{}] })
      )
    )
    await waitFor(() =>
      expect(assessment()).toMatchObject({ status: "complete", collisions: 1 })
    )
    expect(assessment().findings[0].code).toBe("LABEL_COLLISION")
  })

  it("clears disabled assessments and releases subscriptions on disable and unmount", async () => {
    fonts.status = "loaded"
    const remove = vi.spyOn(fonts, "removeEventListener")
    const { container, rerender, unmount } = render(<Chart />)
    const assessment = () =>
      JSON.parse(container.firstElementChild!.getAttribute("data-assessment")!)
    await waitFor(() => expect(assessment().status).toBe("complete"))
    rerender(<Chart enabled={false} />)
    expect(assessment()).toEqual({
      status: "not-assessed",
      checked: 0,
      unsupported: 0,
      collisions: 0,
      overflows: 0,
      findings: []
    })
    expect(remove).toHaveBeenCalledTimes(1)
    labelWidth = 30
    act(() => fonts.dispatchEvent(new Event("loadingdone")))
    expect(assessment().status).toBe("not-assessed")
    rerender(<Chart />)
    await waitFor(() => expect(assessment().collisions).toBe(1))
    unmount()
    expect(remove).toHaveBeenCalledTimes(2)
  })

  it("refreshes on revision changes and ignores native load events with no font faces", async () => {
    fonts.status = "loaded"
    const { container, rerender } = render(<Chart />)
    const assessment = () =>
      JSON.parse(container.firstElementChild!.getAttribute("data-assessment")!)
    await waitFor(() => expect(assessment().checked).toBe(2))
    labelWidth = 30
    act(() =>
      fonts.dispatchEvent(
        Object.assign(new Event("loadingdone"), { fontfaces: [] })
      )
    )
    expect(assessment().collisions).toBe(0)
    rerender(<Chart revision={1} />)
    await waitFor(() => expect(assessment().collisions).toBe(1))
  })
})
