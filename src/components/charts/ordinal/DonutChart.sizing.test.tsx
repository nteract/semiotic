import * as React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DonutChart } from "./DonutChart"
import { PieChart } from "./PieChart"
import { OrdinalPipelineStore } from "../../stream/OrdinalPipelineStore"
import type { WedgeSceneNode } from "../../stream/ordinalTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

interface SceneSample {
  width: number
  height: number
  wedges: WedgeSceneNode[]
}

let restoreCanvas: (() => void) | null = null
let samples: SceneSample[] = []

beforeEach(() => {
  restoreCanvas = setupCanvasMock({ stubRaf: "microtask" })
  samples = []
  const computeScene = OrdinalPipelineStore.prototype.computeScene
  vi.spyOn(OrdinalPipelineStore.prototype, "computeScene").mockImplementation(function (
    this: OrdinalPipelineStore,
    layout
  ) {
    computeScene.call(this, layout)
    samples.push({
      ...layout,
      wedges: this.scene.filter((node): node is WedgeSceneNode => node.type === "wedge"),
    })
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  restoreCanvas?.()
  restoreCanvas = null
})

function rows(count: number) {
  return Array.from({ length: count }, (_, i) => ({ category: `c${i}`, value: 1 + (i % 7) }))
}

function lastPaintedScene(): SceneSample {
  const painted = samples.filter((sample) => sample.wedges.length > 0)
  expect(painted.length).toBeGreaterThan(0)
  return painted[painted.length - 1]
}

/**
 * Every wedge's ring stays inside the plot in both dimensions and is not
 * inverted, so the plot clip never cuts it.
 */
function expectRingInsidePlot({ width, height, wedges }: SceneSample) {
  for (const wedge of wedges) {
    expect(wedge.outerRadius).toBeGreaterThan(0)
    expect(wedge.outerRadius).toBeLessThanOrEqual(Math.min(width, height) / 2)
    expect(wedge.outerRadius - wedge.innerRadius).toBeGreaterThanOrEqual(1)
  }
}

async function flushFrames() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}

describe("DonutChart sizing in short containers", () => {
  it.each(["bounded", "push"])("honors a zero hole after a %s radius update", async (mode) => {
    const ref = React.createRef<RealtimeFrameHandle>()
    const data = rows(2)
    const shared = {
      ref, width: 300, height: 240, showLegend: false,
      data: mode === "bounded" ? data : undefined,
    }
    const { rerender } = render(<DonutChart {...shared} innerRadius={40} />)
    if (mode === "push") await act(async () => { ref.current!.pushMany(data) })
    await flushFrames()
    expect(lastPaintedScene().wedges.map((node) => node.innerRadius)).toEqual([40, 40])
    rerender(<DonutChart {...shared} innerRadius={0} />)
    await flushFrames()
    expect(lastPaintedScene().wedges.map((node) => node.innerRadius)).toEqual([0, 0])
  })

  // The 10px inset leaves an 830×200 plot with a 96px outer radius.
  // A 70px hole now fits; an oversized request still needs the 12px fallback band.
  it.each([
    { count: 12, innerRadius: 70, expectedInnerRadius: 70 },
    { count: 400, innerRadius: 70, expectedInnerRadius: 70 },
    { count: 12, innerRadius: 120, expectedInnerRadius: 84 },
    { count: 400, innerRadius: 120, expectedInnerRadius: 84 },
  ])("keeps a pushed $count-slice ring with a $innerRadius px hole inside an 850x220 plot", async ({ count, innerRadius, expectedInnerRadius }) => {
    const ref = React.createRef<RealtimeFrameHandle>()
    render(<DonutChart ref={ref} width={850} height={220} innerRadius={innerRadius} showLegend={false} />)
    await act(async () => {
      ref.current?.pushMany(rows(count))
    })
    await flushFrames()

    const scene = lastPaintedScene()
    expectRingInsidePlot(scene)
    expect(scene.width).toBe(830)
    expect(scene.height).toBe(200)
    for (const wedge of scene.wedges) {
      expect(wedge.outerRadius).toBe(96)
      expect(wedge.innerRadius).toBe(expectedInnerRadius)
    }
  })

  it.each([
    [850, 230, true],
    [850, 230, false],
    [290, 200, true],
    [290, 200, false],
  ] as const)("keeps a bounded ring inside a %ix%i plot (legend %s)", async (width, height, showLegend) => {
    render(
      <DonutChart data={rows(12)} width={width} height={height} innerRadius={40} showLegend={showLegend} />
    )
    await flushFrames()
    expectRingInsidePlot(lastPaintedScene())
  })

  it("leaves a ring that already fits untouched", async () => {
    render(<DonutChart data={rows(12)} width={400} height={400} innerRadius={40} showLegend={false} />)
    await flushFrames()
    const { wedges } = lastPaintedScene()
    expect(wedges[0].innerRadius).toBe(40)
  })

  it("never produces a negative radius when explicit margins consume the plot", async () => {
    render(<PieChart data={rows(5)} width={300} height={100} margin={{ top: 60, bottom: 60 }} showLegend={false} />)
    await flushFrames()
    const { wedges } = lastPaintedScene()
    for (const wedge of wedges) {
      expect(wedge.outerRadius).toBe(0)
      expect(wedge.innerRadius).toBe(0)
    }
  })
})
