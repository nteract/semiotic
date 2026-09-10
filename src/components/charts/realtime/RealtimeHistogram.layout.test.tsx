import React from "react"
import { act, render, waitFor } from "@testing-library/react"
import { beforeEach, afterEach, expect, it } from "vitest"
import { RealtimeHistogram } from "./RealtimeHistogram"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import type { StreamScales } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"

interface TestHandle extends RealtimeFrameHandle {
  getScales(): StreamScales | null
}

let restore: () => void
beforeEach(() => {
  restore = setupCanvasMock()
})
afterEach(() => restore())
const data = [
  { time: 5, value: 4 },
  { time: 15, value: 8 }
]

it("hides each axis independently and removes its default margin", async () => {
  const ref = React.createRef<TestHandle>()
  const { container, rerender } = render(
    <RealtimeHistogram
      ref={ref}
      data={data}
      binSize={10}
      width={400}
      height={200}
      showTimeAxis={false}
    />
  )
  await waitFor(() =>
    expect(container.querySelector('[data-orient="left"]')).toBeTruthy()
  )
  expect(container.querySelector('[data-orient="bottom"]')).toBeNull()
  expect(ref.current!.getScales()!.y.range()).toEqual([150, 0])
  rerender(
    <RealtimeHistogram
      ref={ref}
      data={data}
      binSize={10}
      width={400}
      height={200}
      showValueAxis={false}
    />
  )
  await waitFor(() =>
    expect(container.querySelector('[data-orient="bottom"]')).toBeTruthy()
  )
  expect(container.querySelector('[data-orient="left"]')).toBeNull()
  expect(ref.current!.getScales()!.x.range()).toEqual([0, 360])
})

it("reverses the automatically derived value domain as pushed bins grow", async () => {
  const ref = React.createRef<TestHandle>()
  render(<RealtimeHistogram ref={ref} binSize={10} direction="down" />)
  act(() => ref.current!.pushMany(data))
  await waitFor(() =>
    expect(ref.current!.getScales!()?.y.domain()[0]).toBeCloseTo(8.8)
  )
  expect(ref.current!.getScales!()?.y.domain()[1]).toBe(0)
  act(() => ref.current!.push({ time: 16, value: 12 }))
  await waitFor(() =>
    expect(ref.current!.getScales!()?.y.domain()[0]).toBeCloseTo(22)
  )
})

it("server evidence retains data marks with a hidden axis and reversed baseline", () => {
  const { svg, evidence } = renderChartWithEvidence("TemporalHistogram", {
    data,
    binSize: 10,
    width: 400,
    height: 200,
    direction: "down",
    showTimeAxis: false,
    showValueAxis: false,
    margin: { top: 0, right: 0 },
    timeExtent: [0, 20],
    valueExtent: [0, 10]
  })
  expect(svg).not.toContain('data-orient="bottom"')
  expect(svg).not.toContain('data-orient="left"')
  expect(svg).toContain("<rect")
  expect(evidence.empty).toBe(false)
  expect(evidence.markCount).toBe(2)
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
  const bars = [...doc.querySelectorAll("rect")].filter(
    (node) =>
      Number(node.getAttribute("height")) === 80 ||
      Number(node.getAttribute("height")) === 160
  )
  expect(bars).toHaveLength(2)
  expect(bars.every((node) => Number(node.getAttribute("y")) === 0)).toBe(true)
})
