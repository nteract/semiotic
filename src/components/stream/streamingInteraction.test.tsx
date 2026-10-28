import "../../test-utils/registerBuiltInXYPlugins"
import React from "react"
import { act, fireEvent, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import StreamXYFrame from "./StreamXYFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import type { HoverData, StreamXYFrameHandle } from "./types"
import type { StreamOrdinalFrameHandle } from "./ordinalTypes"

const data = [
  { id: "a", x: 0, y: 10, category: "Alpha", value: 10 },
  { id: "b", x: 1, y: 20, category: "Beta", value: 20 },
  { id: "c", x: 2, y: 30, category: "Gamma", value: 30 }
]
const margin = { left: 40, right: 40, top: 40, bottom: 40 }

for (const family of ["xy", "ordinal"] as const)
  describe(`${family} streaming interaction lifecycle`, () => {
    let restore: () => void
    beforeEach(() => {
      restore = setupCanvasMock()
    })
    afterEach(() => {
      restore()
    })

    function setup(windowSize = 3, bounded = false, input = data) {
      const ref = React.createRef<
        StreamXYFrameHandle & StreamOrdinalFrameHandle
      >()
      const customHoverBehavior = vi.fn()
      const common = {
        ref,
        data: bounded ? input : undefined,
        size: [400, 300] as [number, number],
        margin,
        windowSize,
        hoverAnnotation: true,
        accessibleTable: true,
        customHoverBehavior,
        tooltipContent: (hover: HoverData) =>
          `${hover.data?.category}: ${hover.data?.value}`
      }
      const chart = (size: number) =>
        family === "xy" ? (
          <StreamXYFrame
            {...common}
            windowSize={size}
            chartType="scatter"
            xAccessor="x"
            yAccessor="y"
            pointIdAccessor="id"
          />
        ) : (
          <StreamOrdinalFrame
            {...common}
            windowSize={size}
            chartType="bar"
            dataIdAccessor="id"
            categoryAccessor="category"
            valueAccessor="value"
          />
        )
      const view = render(chart(windowSize))
      if (!bounded)
        act(() => {
          ref.current!.pushMany(input)
          ref.current!.getData()
        })
      const frame = view.container.querySelector<HTMLElement>(
        `[class="stream-${family}-frame"]`
      )!
      const tooltip = () =>
        frame.querySelector(
          family === "xy" ? ".stream-frame-tooltip" : ".stream-ordinal-tooltip"
        )
      return {
        ...view,
        ref,
        frame,
        tooltip,
        customHoverBehavior,
        resizeWindow: (size: number) => view.rerender(chart(size))
      }
    }

    it.each([false, true])(
      "updates accessible rows for in-domain pushes and clears them without parent renders (bounded: %s)",
      async (bounded) => {
        const { ref, getByRole, queryByRole } = setup(10, bounded)
        const button = await waitFor(() =>
          getByRole("button", { name: /View data summary \(3 elements\)/ })
        )
        fireEvent.click(button)
        await waitFor(() =>
          expect(getByRole("table").querySelectorAll("tbody tr")).toHaveLength(
            3
          )
        )
        act(() => {
          ref.current!.push({
            id: "d",
            category: "Delta",
            x: 1.5,
            y: 15,
            value: 15
          })
          ref.current!.getData()
        })
        await waitFor(() =>
          expect(getByRole("table")).toHaveTextContent("Delta")
        )
        expect(getByRole("table").querySelectorAll("tbody tr")).toHaveLength(4)
        act(() => ref.current!.clear())
        await waitFor(() => expect(queryByRole("table")).toBeNull())
        expect(queryByRole("button", { name: /View data summary/ })).toBeNull()
      }
    )

    it("End enters on the last mark, blur clears detail, and re-entry starts fresh", async () => {
      const { frame, tooltip, customHoverBehavior } = setup()
      fireEvent.keyDown(frame, { key: "End" })
      await waitFor(() => expect(tooltip()).toHaveTextContent("Gamma"))
      // Moving focus to an owned descendant must not dismiss the chart's state.
      fireEvent.blur(frame, { relatedTarget: frame.querySelector("canvas") })
      expect(tooltip()).toHaveTextContent("Gamma")
      fireEvent.blur(frame, { relatedTarget: document.body })
      expect(tooltip()).toBeNull()
      expect(frame.querySelector('[aria-live="polite"]')).toHaveTextContent("")
      expect(customHoverBehavior.mock.lastCall?.[0]).toBeNull()
      fireEvent.keyDown(frame, { key: "ArrowRight" })
      expect(tooltip()).toHaveTextContent("Alpha")
    })

    it("initial PageDown enters one page into the data", async () => {
      const input = Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        x: i,
        y: i + 1,
        category: `Row ${i}`,
        value: i + 1
      }))
      const { frame, tooltip } = setup(100, false, input)
      fireEvent.keyDown(frame, { key: "PageDown" })
      await waitFor(() => expect(tooltip()).toHaveTextContent("Row 9:"))
      fireEvent.keyDown(frame, { key: "PageDown" })
      expect(tooltip()).toHaveTextContent("Row 19:")
    })

    it("clears tooltip, focus ring, announcement, and linked hover on clear", async () => {
      const { ref, frame, tooltip, customHoverBehavior } = setup()
      fireEvent.keyDown(frame, { key: "Home" })
      await waitFor(() => expect(tooltip()).toHaveTextContent("Alpha"))
      act(() => ref.current!.clear())
      expect(tooltip()).toBeNull()
      expect(frame.querySelector('[stroke-dasharray="4,2"]')).toBeNull()
      expect(frame.querySelector('[aria-live="polite"]')?.textContent).toBe("")
      expect(customHoverBehavior.mock.lastCall?.[0]).toBeNull()
      act(() => {
        ref.current!.push(data[2])
        ref.current!.getData()
      })
      fireEvent.keyDown(frame, { key: "Home" })
      expect(tooltip()).toHaveTextContent("Gamma")
    })

    it("keeps focused datum through eviction of another row and clears it when evicted", async () => {
      const { ref, frame, tooltip, customHoverBehavior } = setup()
      fireEvent.keyDown(frame, { key: "Home" })
      fireEvent.keyDown(frame, { key: "ArrowRight" })
      await waitFor(() => expect(tooltip()).toHaveTextContent("Beta"))
      const next = { id: "d", category: "Delta", x: 3, y: 40, value: 40 }
      act(() => {
        ref.current!.push(next)
        ref.current!.getData()
      })
      await waitFor(() => expect(tooltip()).toHaveTextContent("Beta"))
      act(() => {
        ref.current!.push({ ...next, id: "e", category: "Epsilon", x: 4 })
        ref.current!.getData()
      })
      await waitFor(() => expect(tooltip()).toBeNull())
      expect(customHoverBehavior.mock.lastCall?.[0]).toBeNull()
    })

    it("refreshes a focused updated row, rather than announcing its old values", async () => {
      const { ref, frame, tooltip } = setup()
      fireEvent.keyDown(frame, { key: "Home" })
      await waitFor(() => expect(tooltip()).toHaveTextContent("Alpha: 10"))
      act(() => {
        ref.current!.update("a", (row) => ({ ...row, value: 99, y: 99 }))
      })
      await waitFor(() => expect(tooltip()).toHaveTextContent("Alpha: 99"))
      fireEvent.keyDown(frame, { key: "Home" })
      expect(tooltip()).toHaveTextContent("Alpha: 99")
    })

    it("refreshes inline bounded data without replaying the parent's hover observation", async () => {
      const observe = vi.fn()
      function ObservedChart() {
        const [rows, setRows] = React.useState([data[1]])
        const [observation, setObservation] = React.useState<HoverData | null>(null)
        const common = {
          // Both array and rows are recreated after each observation, as in
          // JSX-authored data. A replacement must still ingest the latest rows.
          data: rows.map((row) => ({ ...row })),
          size: [400, 300] as [number, number],
          margin,
          hoverAnnotation: true,
          customHoverBehavior: (hover: HoverData | null) => {
            observe(hover)
            setObservation(hover)
          },
          tooltipContent: (hover: HoverData) => `${hover.data?.category}: ${hover.data?.value}`
        }
        return <>
          <output>{observation?.data?.category ?? "None"}</output>
          <button onClick={() => setRows([{ ...data[1], value: 25 }])}>Update</button>
          <button onClick={() => setRows([])}>Empty</button>
          {family === "xy" ? <StreamXYFrame {...common} chartType="scatter"
            xAccessor="x" yAccessor="y" xExtent={[0, 2]} yExtent={[0, 40]} />
            : <StreamOrdinalFrame {...common} chartType="bar"
                categoryAccessor="category" valueAccessor="value" rExtent={[0, 40]} />}
        </>
      }
      const view = render(<ObservedChart />)
      const tooltip = () => view.container.querySelector(
        family === "xy" ? ".stream-frame-tooltip" : ".stream-ordinal-tooltip"
      )
      fireEvent.mouseMove(view.container.querySelector("canvas")!, {
        clientX: 200, clientY: 190 - (family === "xy" ? 40 : 0)
      })
      await waitFor(() => expect(tooltip()).toHaveTextContent("Beta: 20"))
      expect(view.getByRole("status")).toHaveTextContent("Beta")
      expect(observe).toHaveBeenCalledTimes(1)
      fireEvent.click(view.getByText("Update"))
      await waitFor(() => expect(tooltip()).toHaveTextContent("Beta: 25"))
      expect(observe).toHaveBeenCalledTimes(1)
      fireEvent.click(view.getByText("Empty"))
      await waitFor(() => expect(tooltip()).toBeNull())
      expect(view.getByRole("status")).toHaveTextContent("None")
      expect(observe).toHaveBeenCalledTimes(2)
      expect(observe.mock.lastCall?.[0]).toBeNull()
    })

    it.each(["clear", "update", "remove", "shrink"] as const)(
      "dismisses real pointer detail through the shared callback on %s",
      async (operation) => {
        const { ref, frame, tooltip, customHoverBehavior, resizeWindow } =
          setup()
        const scales = ref.current!.getScales()!
        // The bar at Beta spans the plot midpoint; the scatter mark uses the scales.
        const x =
          family === "xy"
            ? (
                scales as NonNullable<
                  ReturnType<StreamXYFrameHandle["getScales"]>
                >
              ).x(1) + 40
            : 200
        const y =
          family === "xy"
            ? (
                scales as NonNullable<
                  ReturnType<StreamXYFrameHandle["getScales"]>
                >
              ).y(20) + 40
            : 190
        fireEvent.mouseMove(frame.querySelector("canvas")!, {
          clientX: x,
          clientY: y
        })
        await waitFor(() => expect(tooltip()).toHaveTextContent("Beta"))
        act(() => {
          if (operation === "shrink") resizeWindow(1)
          else if (operation === "clear") ref.current!.clear()
          else if (operation === "remove") ref.current!.remove("b")
          else ref.current!.update("b", (row) => ({ ...row, value: 55, y: 55 }))
        })
        expect(tooltip()).toBeNull()
        expect(customHoverBehavior.mock.lastCall?.[0]).toBeNull()
      }
    )
  })
