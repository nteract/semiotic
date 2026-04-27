/**
 * Sparse-array prop hardening regression tests.
 *
 * Public HOCs accept array props (`data`, `points`, `nodes`, `edges`,
 * `flows`, `series`, `areas`) and forward them into `useChartSetup`,
 * `useColorScale`, and the StreamFrame scene builders without
 * null-checks on individual entries. CSV-parsed input, lookup-failed
 * loaders, and filter-early-return data pipelines commonly emit sparse
 * arrays like `[null, validRow, undefined, validRow]`. Any HOC that
 * dereferences `d.field` or `colorBy(d)` over such an array crashes the
 * chart.
 *
 * `FlowMap` and `ProportionalSymbolMap` previously fixed this with an
 * inline identity-preserving `useMemo` filter at the HOC entry. This
 * suite mounts one HOC per data-iteration shape — single-array `data`,
 * `series`, `nodes` + `edges`, `points`, `flows` + `nodes`, `areas` —
 * with sparse input and asserts the chart neither throws nor degrades
 * to an empty render. Once any HOC in a shape passes, every HOC sharing
 * that shape inherits the same protection (since the fix lives in the
 * shared `useChartSetup` data-normalization step).
 *
 * The matrix below covers the surface a representative agent or data
 * pipeline would hand to the chart. New HOCs in an existing shape don't
 * need new test entries; new shapes do.
 */
import { render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"

import * as React from "react"
import { act } from "@testing-library/react"

import { LineChart } from "../../components/charts/xy/LineChart"
import { Scatterplot } from "../../components/charts/xy/Scatterplot"
import { StackedAreaChart } from "../../components/charts/xy/StackedAreaChart"
import { Heatmap } from "../../components/charts/xy/Heatmap"
import { MultiAxisLineChart } from "../../components/charts/xy/MultiAxisLineChart"
import { BarChart } from "../../components/charts/ordinal/BarChart"
import { StackedBarChart } from "../../components/charts/ordinal/StackedBarChart"
import { GroupedBarChart } from "../../components/charts/ordinal/GroupedBarChart"
import { PieChart } from "../../components/charts/ordinal/PieChart"
import { ForceDirectedGraph } from "../../components/charts/network/ForceDirectedGraph"
import { SankeyDiagram } from "../../components/charts/network/SankeyDiagram"
import { ProportionalSymbolMap } from "../../components/charts/geo/ProportionalSymbolMap"
import { FlowMap } from "../../components/charts/geo/FlowMap"
import { ChoroplethMap } from "../../components/charts/geo/ChoroplethMap"

let restoreCanvas: () => void
beforeEach(() => {
  restoreCanvas = setupCanvasMock({ stubRaf: false })
})
afterEach(() => {
  restoreCanvas()
})

// Sparse-input fixtures: each list has at least one valid object so the
// HOC has something real to render even after filtering, plus
// `null`/`undefined` interlopers a loader might emit.
const sparseXY = [null, { x: 1, y: 10, cat: "A" }, undefined, { x: 2, y: 20, cat: "B" }]
const sparseStacked = [null, { x: 1, y: 10, series: "A" }, undefined, { x: 1, y: 8, series: "B" }, { x: 2, y: 12, series: "A" }, { x: 2, y: 6, series: "B" }]
const sparseScatter = [null, { x: 1, y: 10, size: 5, cat: "A" }, undefined, { x: 2, y: 20, size: 8, cat: "B" }]
const sparseHeatmap = [null, { x: 0, y: 0, v: 10 }, undefined, { x: 1, y: 1, v: 20 }]
const sparseBar = [null, { c: "Q1", v: 10 }, undefined, { c: "Q2", v: 15 }]
const sparseStackedBar = [null, { c: "Q1", v: 10, g: "A" }, undefined, { c: "Q1", v: 5, g: "B" }, { c: "Q2", v: 15, g: "A" }, { c: "Q2", v: 8, g: "B" }]
const sparsePie = [null, { name: "X", v: 30 }, undefined, { name: "Y", v: 70 }]
const sparseSeries = [
  null,
  { yAccessor: "y1", label: "First" },
  undefined,
  { yAccessor: "y2", label: "Second" },
]
const sparseNetworkData = [null, { x: 1, y: 1, cat: "A" }, undefined, { x: 2, y: 2, cat: "B" }]
const sparseNodes = [null, { id: "a" }, undefined, { id: "b" }, { id: "c" }]
const sparseEdges = [null, { source: "a", target: "b", value: 1 }, undefined, { source: "b", target: "c", value: 2 }]
const sparsePoints = [null, { lon: 0, lat: 0, cat: "A", size: 5 }, undefined, { lon: 10, lat: 10, cat: "B", size: 8 }]
const sparseFlows = [null, { source: "a", target: "b", value: 1 }, undefined, { source: "b", target: "c", value: 2 }]
const sparseFlowNodes = [null, { id: "a", lon: 0, lat: 0 }, undefined, { id: "b", lon: 10, lat: 10 }, { id: "c", lon: 5, lat: 5 }]
const sparseAreas = [
  null,
  { type: "Feature", id: "x", properties: { v: 1 }, geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } },
  undefined,
  { type: "Feature", id: "y", properties: { v: 2 }, geometry: { type: "Polygon", coordinates: [[[2, 0], [3, 0], [3, 1], [2, 0]]] } },
]

async function expectCanvasMounts(container: HTMLElement) {
  await waitFor(() => {
    const canvas = container.querySelector("canvas")
    expect(canvas, "chart canvas should mount without throwing").not.toBeNull()
  })
}

describe("sparse-array prop hardening", () => {
  describe("XY family", () => {
    it("LineChart survives [null, valid, undefined, valid] data", async () => {
      const { container } = render(
        // @ts-expect-error sparse fixture intentionally has null/undefined entries
        <LineChart data={sparseXY} xAccessor="x" yAccessor="y" lineBy="cat" colorBy="cat" />,
      )
      await expectCanvasMounts(container)
    })

    it("Scatterplot survives sparse data", async () => {
      const { container } = render(
        // @ts-expect-error sparse fixture intentionally has null/undefined entries
        <Scatterplot data={sparseScatter} xAccessor="x" yAccessor="y" sizeBy="size" colorBy="cat" />,
      )
      await expectCanvasMounts(container)
    })

    it("StackedAreaChart survives sparse data", async () => {
      const { container } = render(
        // @ts-expect-error sparse fixture intentionally has null/undefined entries
        <StackedAreaChart data={sparseStacked} xAccessor="x" yAccessor="y" areaBy="series" />,
      )
      await expectCanvasMounts(container)
    })

    it("Heatmap survives sparse data", async () => {
      const { container } = render(
        // @ts-expect-error sparse fixture intentionally has null/undefined entries
        <Heatmap data={sparseHeatmap} xAccessor="x" yAccessor="y" valueAccessor="v" />,
      )
      await expectCanvasMounts(container)
    })

    it("MultiAxisLineChart survives sparse series array", async () => {
      const validData = [
        { t: 1, y1: 10, y2: 100 },
        { t: 2, y1: 20, y2: 200 },
      ]
      const { container } = render(
        <MultiAxisLineChart
          data={validData}
          xAccessor="t"
          // @ts-expect-error sparse fixture intentionally has null/undefined entries
          series={sparseSeries}
        />,
      )
      await expectCanvasMounts(container)
    })
  })

  describe("Ordinal family", () => {
    it("BarChart survives sparse data", async () => {
      const { container } = render(
        // @ts-expect-error sparse fixture
        <BarChart data={sparseBar} categoryAccessor="c" valueAccessor="v" />,
      )
      await expectCanvasMounts(container)
    })

    it("StackedBarChart survives sparse data", async () => {
      const { container } = render(
        // @ts-expect-error sparse fixture
        <StackedBarChart data={sparseStackedBar} categoryAccessor="c" valueAccessor="v" stackBy="g" />,
      )
      await expectCanvasMounts(container)
    })

    it("GroupedBarChart survives sparse data", async () => {
      const { container } = render(
        // @ts-expect-error sparse fixture
        <GroupedBarChart data={sparseStackedBar} categoryAccessor="c" valueAccessor="v" groupBy="g" />,
      )
      await expectCanvasMounts(container)
    })

    it("PieChart survives sparse data", async () => {
      const { container } = render(
        // @ts-expect-error sparse fixture
        <PieChart data={sparsePie} categoryAccessor="name" valueAccessor="v" />,
      )
      await expectCanvasMounts(container)
    })
  })

  describe("Network family", () => {
    it("ForceDirectedGraph survives sparse nodes + edges", async () => {
      const { container } = render(
        <ForceDirectedGraph
          // @ts-expect-error sparse fixture
          nodes={sparseNodes}
          // @ts-expect-error sparse fixture
          edges={sparseEdges}
        />,
      )
      await expectCanvasMounts(container)
    })

    it("SankeyDiagram survives sparse nodes + edges", async () => {
      const { container } = render(
        <SankeyDiagram
          // @ts-expect-error sparse fixture
          nodes={sparseNodes}
          // @ts-expect-error sparse fixture
          edges={sparseEdges}
        />,
      )
      await expectCanvasMounts(container)
    })
  })

  describe("Geo family", () => {
    it("ProportionalSymbolMap survives sparse points", async () => {
      const { container } = render(
        <ProportionalSymbolMap
          // @ts-expect-error sparse fixture
          points={sparsePoints}
          xAccessor="lon"
          yAccessor="lat"
          sizeBy="size"
          colorBy="cat"
        />,
      )
      await expectCanvasMounts(container)
    })

    it("FlowMap survives sparse flows + nodes", async () => {
      const { container } = render(
        <FlowMap
          // @ts-expect-error sparse fixture
          flows={sparseFlows}
          // @ts-expect-error sparse fixture
          nodes={sparseFlowNodes}
          valueAccessor="value"
        />,
      )
      await expectCanvasMounts(container)
    })

    it("ChoroplethMap survives sparse areas", async () => {
      const { container } = render(
        <ChoroplethMap
          // @ts-expect-error sparse fixture
          areas={sparseAreas}
          valueAccessor="v"
        />,
      )
      await expectCanvasMounts(container)
    })
  })

  // The single-data-array shape is shared across many HOCs (see
  // chartSpecs.ts). One representative test per family proves the
  // shared `useChartSetup` data-normalization works; we do not need a
  // separate test for every HOC sharing the same shape. New shapes
  // (e.g. an HOC that adds a third array prop) require a new entry.
  void sparseNetworkData // reserved for future per-shape additions

  describe("push-mode ingestion", () => {
    // The bounded-data path filters via `DataSourceAdapter.setBoundedData`,
    // and the push path filters via `DataSourceAdapter.push` /
    // `pushMany` (XY/Ordinal) and the per-frame `pushPoint` / `pushMany`
    // callbacks (Geo/Network). All four paths must drop sparse entries
    // so a `ref.pushMany([null, valid])` doesn't crash the pipeline
    // store on extent / accessor reads.
    it("LineChart ref.pushMany silently drops null entries", async () => {
      const ref = React.createRef<{ pushMany: (rows: unknown[]) => void; getData: () => unknown[] }>()
      render(
        <LineChart
          ref={ref as React.Ref<unknown>}
          xAccessor="x"
          yAccessor="y"
          lineBy="cat"
          colorBy="cat"
          width={300}
          height={200}
        />,
      )
      act(() => {
        ref.current!.pushMany([
          null,
          { x: 0, y: 0, cat: "A" },
          undefined,
          { x: 1, y: 1, cat: "B" },
        ])
      })
      // Wait one microtask for the adapter's batched flush, then one
      // rAF tick for the frame to ingest.
      await new Promise((r) => setTimeout(r, 50))
      const data = ref.current!.getData()
      // Both valid rows landed; no nulls survived the filter.
      expect(data).toHaveLength(2)
      for (const d of data) {
        expect(d).not.toBeNull()
        expect(typeof d).toBe("object")
      }
    })

    it("ProportionalSymbolMap ref.pushMany silently drops null entries", async () => {
      const ref = React.createRef<{ pushMany: (rows: unknown[]) => void; getData: () => unknown[] }>()
      render(
        <ProportionalSymbolMap
          ref={ref as React.Ref<unknown>}
          xAccessor="lon"
          yAccessor="lat"
          sizeBy="size"
          colorBy="cat"
          pointIdAccessor="id"
          width={300}
          height={200}
        />,
      )
      act(() => {
        ref.current!.pushMany([
          null,
          { id: "a", lon: 0, lat: 0, size: 5, cat: "A" },
          undefined,
          { id: "b", lon: 10, lat: 10, size: 5, cat: "B" },
        ])
      })
      await new Promise((r) => setTimeout(r, 50))
      const data = ref.current!.getData()
      expect(data).toHaveLength(2)
    })
  })

  describe("empty-state routing", () => {
    // `useChartSetup` decides between empty-state UI and a real render
    // by checking `rawData`. Sparse-but-nonempty input (`[null,
    // undefined]`) used to slip through that check because the array
    // was non-empty before filtering, even though it produced zero
    // valid rows downstream. The filter inside `useChartSetup` now
    // applies to `rawData` itself for the empty-state decision so the
    // user sees the empty-state UI instead of a blank chart canvas.
    it("LineChart shows empty-state UI when every data row is sparse", () => {
      const onlySparse = [null, undefined, null] as unknown as { x: number; y: number }[]
      const { container } = render(
        <LineChart data={onlySparse} xAccessor="x" yAccessor="y" />,
      )
      // Empty-state element renders without a canvas
      expect(container.querySelector("canvas")).toBeNull()
      expect(container.textContent ?? "").toContain("No data")
    })
  })
})
