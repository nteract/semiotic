import * as React from "react"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NetworkCustomChart } from "semiotic/network"
import StreamNetworkFrame from "./StreamNetworkFrame"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { createFrameScheduler } from "./test-utils/frameScheduler"

describe("network HTML content reconciliation", () => {
  let restoreCanvas: () => void
  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => {
    cleanup()
    restoreCanvas()
  })

  it.each(["frame", "chart"])(
    "preserves state, effects and focus across equal-ID data replacement: %s",
    (entry) => {
      const mounted = vi.fn()
      const unmounted = vi.fn()
      function Card({ metric }: { metric: number }) {
        const [draft, setDraft] = React.useState("initial")
        React.useEffect(() => {
          mounted()
          return () => {
            unmounted()
          }
        }, [])
        return (
          <label>
            {metric}
            <input
              aria-label="Draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
        )
      }
      const scheduler = createFrameScheduler()
      const layout = vi.fn<NetworkCustomLayout>((ctx) => ({
        htmlMarks: ctx.nodes.map((node) => ({
          id: node.id,
          x: Number(node.data?.x),
          y: 20,
          width: 100,
          height: 40,
          content: <Card metric={Number(node.data?.metric)} />
        }))
      }))
      const edges: [] = []
      const config = {}
      const nodes = [{ id: "a", x: 10, metric: 1 }]
      const chart = (rows: typeof nodes) =>
        entry === "chart" ? (
          <NetworkCustomChart
            nodes={rows}
            edges={edges}
            layout={layout}
            layoutConfig={config}
            width={400}
            height={200}
            animate={false}
            frameProps={{ frameScheduler: scheduler.scheduler }}
          />
        ) : (
          <StreamNetworkFrame
            nodes={rows}
            edges={edges}
            customNetworkLayout={layout}
            layoutConfig={config}
            chartType="force"
            size={[400, 200]}
            animate={false}
            frameScheduler={scheduler.scheduler}
          />
        )
      const settle = () => {
        for (let i = 0; i < 10 && scheduler.pendingCount; i++)
          act(() => scheduler.flush())
        expect(scheduler.pendingCount).toBe(0)
      }
      const view = render(chart(nodes))
      settle()
      const input = view.getByRole("textbox")
      const wrapper = view.container.querySelector('[data-mark-id="a"]')
      fireEvent.change(input, { target: { value: "unsaved edit" } })
      act(() => input.focus())
      expect(mounted).toHaveBeenCalledTimes(1)
      expect(layout).toHaveBeenCalledTimes(1)

      view.rerender(chart(nodes))
      settle()
      expect(layout).toHaveBeenCalledTimes(1)
      view.rerender(chart([{ id: "a", x: 10, metric: 2 }]))
      settle()
      expect(layout).toHaveBeenCalledTimes(2)
      expect(view.getByText("2")).toBeVisible()
      expect(view.getByRole("textbox")).toBe(input)
      expect(input).toHaveValue("unsaved edit")
      expect(input).toHaveFocus()
      expect(view.container.querySelector('[data-mark-id="a"]')).toBe(wrapper)

      view.rerender(chart([{ id: "a", x: 60, metric: 3 }]))
      settle()
      expect(wrapper).toHaveStyle({ transform: "translate(60px, 20px)" })
      expect(input).toHaveFocus()
      expect(mounted).toHaveBeenCalledTimes(1)
      expect(unmounted).not.toHaveBeenCalled()
      view.unmount()
      expect(unmounted).toHaveBeenCalledTimes(1)
    }
  )
})
