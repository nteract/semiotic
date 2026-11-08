import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react"
import * as layouts from "./selectionLayouts"
import { HtmlMarksDemo, ParallelCoordinatesDemo } from "./SelectionLayoutDemos"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function canvasBounds(canvas: HTMLCanvasElement, width: number, height: number) {
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  })
}

async function paint() {
  // Flush the scheduled canvas paint before counting layout calls. Mount and
  // selection effects can schedule work after React has committed the overlay.
  await act(async () => {
    await new Promise(requestAnimationFrame)
  })
}

describe("custom-layout docs selection", () => {
  it("updates HTML selection and edge styles without recomputing card geometry", async () => {
    const layout = vi.spyOn(layouts, "htmlCardLayout")
    const { container } = render(<HtmlMarksDemo />)
    await waitFor(() => expect(container.querySelectorAll("[data-service-card]")).toHaveLength(4))
    await paint()
    const calls = layout.mock.calls.length
    expect(calls).toBeGreaterThan(0)
    const scene = layout.mock.results.at(-1)!.value
    const canvas = container.querySelector("canvas")!
    canvasBounds(canvas, 720, 200)
    fireEvent.mouseMove(canvas, { clientX: 108, clientY: 100 })
    await waitFor(() =>
      expect(container.querySelector('[data-service-card="payments"]')).toHaveStyle({
        opacity: "0.25",
      }),
    )
    expect(container.querySelector('[data-service-card="orders"]')).toHaveStyle({ opacity: "1" })
    expect(container.querySelector(".stream-network-tooltip")).toHaveTextContent("REST · 1.2k rps")
    expect(scene.sceneEdges[0].style.opacity).toBe(0.25)
    await paint()
    expect(layout).toHaveBeenCalledTimes(calls)
    fireEvent.mouseLeave(canvas)
    await waitFor(() =>
      expect(container.querySelector('[data-service-card="payments"]')).toHaveStyle({
        opacity: "1",
      }),
    )
    expect(scene.sceneEdges[0].style.opacity).toBe(0.8)
    expect(container.querySelector(".stream-network-tooltip")).toBeNull()
    await paint()
    expect(layout).toHaveBeenCalledTimes(calls)
  })

  it("restyles parallel-coordinate marks and restores their base opacity without relayout", async () => {
    const layout = vi.spyOn(layouts, "selectableParallelLayout")
    const { container } = render(<ParallelCoordinatesDemo />)
    await waitFor(() => expect(layout).toHaveBeenCalled())
    await paint()
    const scene = layout.mock.results.at(-1)!.value
    const point = scene.nodes.find(
      (node: { type: string; datum: { name: string } }) =>
        node.type === "point" && node.datum.name === "compact",
    )
    const line = scene.nodes.find(
      (node: { type: string; datum: { name: string } }) =>
        node.type === "connector" && node.datum.name === "sedan",
    )
    const calls = layout.mock.calls.length
    const { margin } = layout.mock.calls.at(-1)![0].dimensions
    const canvas = container.querySelector("canvas")!
    canvasBounds(canvas, 760, 320)
    fireEvent.mouseMove(canvas, { clientX: point.x + margin.left, clientY: point.y + margin.top })
    await waitFor(() =>
      expect(container.querySelector(".stream-ordinal-tooltip")).toHaveTextContent(
        "32 mpg · 95 hp",
      ),
    )
    expect(line.style.opacity).toBe(0.08)
    expect(point.style.opacity).toBe(1)
    await paint()
    expect(layout).toHaveBeenCalledTimes(calls)
    fireEvent.mouseLeave(canvas)
    await waitFor(() => expect(container.querySelector(".stream-ordinal-tooltip")).toBeNull())
    expect(line.style.opacity).toBe(0.7)
    await paint()
    expect(layout).toHaveBeenCalledTimes(calls)
  })
})
