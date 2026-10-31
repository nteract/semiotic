import React from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SwarmPlot, type SwarmPlotProps } from "../ordinal/SwarmPlot"
import { QuadrantChart } from "../xy/QuadrantChart"
import { Scatterplot } from "../xy/Scatterplot"
import { BubbleChart } from "../xy/BubbleChart"
import { ProportionalSymbolMap } from "../geo/ProportionalSymbolMap"
import { OrdinalPipelineStore } from "../../stream/OrdinalPipelineStore"
import { PipelineStore } from "../../stream/PipelineStore"
import { GeoPipelineStore } from "../../stream/GeoPipelineStore"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { Datum } from "./datumTypes"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

let restoreCanvas: () => void
let radii: number[]

const MapSizeFixture = React.forwardRef<
  RealtimeFrameHandle,
  Pick<SwarmPlotProps, "data" | "sizeBy" | "sizeRange" | "showLegend">
>(function MapSizeFixture({ data, sizeBy = "size", ...props }, ref) {
  return (
    <ProportionalSymbolMap
      {...props}
      points={data}
      sizeBy={sizeBy}
      ref={ref}
      xAccessor="x"
      yAccessor="y"
    />
  )
})

beforeEach(() => {
  restoreCanvas = setupCanvasMock({ stubRaf: "microtask" })
  radii = []
  const ordinalCompute = OrdinalPipelineStore.prototype.computeScene
  vi.spyOn(OrdinalPipelineStore.prototype, "computeScene").mockImplementation(
    function (this: OrdinalPipelineStore, layout) {
      ordinalCompute.call(this, layout)
      radii = this.scene
        .filter((node) => node.type === "point")
        .map((node) => node.r)
    }
  )
  const xyCompute = PipelineStore.prototype.computeScene
  vi.spyOn(PipelineStore.prototype, "computeScene").mockImplementation(
    function (this: PipelineStore, layout) {
      xyCompute.call(this, layout)
      radii = this.scene
        .filter((node) => node.type === "point")
        .map((node) => node.r)
    }
  )
  const geoCompute = GeoPipelineStore.prototype.computeScene
  vi.spyOn(GeoPipelineStore.prototype, "computeScene").mockImplementation(
    function (this: GeoPipelineStore, layout) {
      geoCompute.call(this, layout)
      radii = this.scene
        .filter((node) => node.type === "point")
        .map((node) => node.r)
    }
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  restoreCanvas()
})

async function flushFrames() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25))
  })
}

describe.each([
  ["SwarmPlot", SwarmPlot],
  ["QuadrantChart", QuadrantChart],
  ["Scatterplot", Scatterplot],
  ["BubbleChart", BubbleChart],
  ["ProportionalSymbolMap", MapSizeFixture]
] as const)("%s size encoding", (_name, Chart) => {
  describe.each(["field", "function"])("%s accessor safety", (kind) => {
    const sizeBy =
      kind === "field"
        ? "size"
        : (row: Record<string, unknown>) => Number(row.size)
    const row = (size: number, value = 1) => ({
      x: value,
      y: value,
      category: String(value),
      value,
      size
    })

    it("discards sparse rows before reading sizes and ingests the valid rows", async () => {
      const ref = React.createRef<RealtimeFrameHandle>()
      render(
        <Chart
          ref={ref}
          sizeBy={sizeBy}
          sizeRange={[3, 9]}
          showLegend={false}
        />
      )
      const valid = [row(50_000), row(100_000, 2)]
      const sparse = [
        null,
        undefined,
        0,
        "invalid",
        false
      ] as unknown as Datum[]
      sparse.length += 1
      sparse.push(...valid)
      await act(async () => {
        ref.current!.push(null as unknown as Datum)
        ref.current!.push(0 as unknown as Datum)
        ref.current!.pushMany(sparse)
      })
      await flushFrames()
      expect(ref.current!.getData()).toEqual(valid)
      expect(radii.toSorted((a, b) => a - b)).toEqual([3, 9])
    })

    it.each([Infinity, -Infinity])(
      "clamps a bounded size of %s without a finite domain",
      async (size) => {
        render(
          <Chart
            data={[row(size)]}
            sizeBy={sizeBy}
            sizeRange={[3, 9]}
            showLegend={false}
          />
        )
        await flushFrames()
        expect(radii).toEqual([size > 0 ? 9 : 3])
      }
    )

    it.each([Infinity, -Infinity])(
      "clamps a pushed size of %s before valid data and after clear",
      async (size) => {
        const ref = React.createRef<RealtimeFrameHandle>()
        render(
          <Chart
            ref={ref}
            sizeBy={sizeBy}
            sizeRange={[3, 9]}
            showLegend={false}
          />
        )
        const expected = size > 0 ? 9 : 3
        await act(async () => {
          ref.current!.push(row(size))
        })
        await flushFrames()
        expect(radii).toEqual([expected])
        await act(async () => {
          ref.current!.clear()
        })
        await act(async () => {
          ref.current!.push(row(size))
        })
        await flushFrames()
        expect(radii).toEqual([expected])
        // The same callback must read the live domain once finite values arrive.
        await act(async () => {
          ref.current!.pushMany([row(100, 2), row(200, 3)])
        })
        await flushFrames()
        expect(radii.toSorted((a, b) => a - b)).toEqual(
          [3, expected, 9].toSorted((a, b) => a - b)
        )
        expect(ref.current!.getData()).toHaveLength(3)
      }
    )
  })

  it.each(["field", "function"])(
    "scales a pushed %s accessor and resets the domain when cleared",
    async (accessor) => {
      const ref = React.createRef<RealtimeFrameHandle>()
      const sizeBy =
        accessor === "field"
          ? "size"
          : (row: Record<string, unknown>) => Number(row.size)
      render(
        <Chart
          ref={ref}
          sizeBy={sizeBy}
          sizeRange={[3, 9]}
          showLegend={false}
        />
      )
      const handle = ref.current
      await act(async () => {
        ref.current!.push({ x: 1, y: 1, category: "A", value: 1, size: 50_000 })
      })
      await flushFrames()
      expect(radii).toEqual([6])

      await act(async () => {
        ref.current!.pushMany([
          { x: 2, y: 2, category: "B", value: 2, size: 100_000 },
          { x: 3, y: 3, category: "C", value: 3, size: 75_000 }
        ])
      })
      await flushFrames()
      expect(radii.toSorted((a, b) => a - b)).toEqual([3, 6, 9])
      expect(ref.current!.getData()).toHaveLength(3)

      await act(async () => {
        ref.current!.clear()
      })
      await act(async () => {
        ref.current!.push({ x: 1, y: 1, category: "A", value: 1, size: 5 })
      })
      await flushFrames()
      expect(radii).toEqual([6])
      expect(ref.current!.getData()).toHaveLength(1)
      expect(ref.current).toBe(handle)
    }
  )

  it("matches bounded and pushed size encodings", async () => {
    const data = [
      { x: 1, y: 1, category: "A", value: 1, size: 10 },
      { x: 2, y: 2, category: "B", value: 2, size: 20 }
    ]
    const { unmount } = render(
      <Chart data={data} sizeBy="size" sizeRange={[3, 9]} showLegend={false} />
    )
    await flushFrames()
    const bounded = radii.toSorted((a, b) => a - b)
    expect(bounded).toEqual([3, 9])
    unmount()
    const ref = React.createRef<RealtimeFrameHandle>()
    render(
      <Chart ref={ref} sizeBy="size" sizeRange={[3, 9]} showLegend={false} />
    )
    await act(async () => {
      ref.current!.pushMany(data)
    })
    await flushFrames()
    expect(radii.toSorted((a, b) => a - b)).toEqual(bounded)
  })
})
