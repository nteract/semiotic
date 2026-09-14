import * as React from "react"
import { act, cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NetworkCustomChart } from "semiotic/network"
import { XYCustomChart } from "semiotic/xy"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { GeoCustomChart } from "semiotic/geo"
import StreamXYFrame from "./StreamXYFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamGeoFrame from "./StreamGeoFrame"
import StreamNetworkFrame from "./StreamNetworkFrame"
import { PipelineStore } from "./PipelineStore"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { GeoPipelineStore } from "./GeoPipelineStore"
import { getLayoutPlugin } from "./layouts/registry"
import { getXYPlugin, resetXYPluginRegistry } from "./xyPlugins/registry"
import { PhysicsCustomChart } from "../charts/physics/PhysicsCustomChart"
import { ThemeProvider } from "../ThemeProvider"
import type { StreamNetworkFrameHandle } from "./networkTypes"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import type { CustomLayout } from "./customLayout"
import type { OrdinalCustomLayout } from "./ordinalCustomLayout"
import type { GeoCustomLayout } from "./geoCustomLayout"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import { createFrameScheduler } from "./test-utils/frameScheduler"

const nodes = [{ id: "a" }, { id: "b" }]
const edges = [{ source: "a", target: "b" }]
const emptyEdges: typeof edges = []
const data = [{ x: 1, y: 2, category: "a", value: 2 }]
const points = [{ lon: 0, lat: 0 }]
const margin = { top: 0, bottom: 0, left: 0, right: 0 }
let frameTime = 0

function settle(scheduler: ReturnType<typeof createFrameScheduler>) {
  for (let i = 0; i < 10 && scheduler.pendingCount; i++) {
    frameTime += 100
    act(() => scheduler.flush())
  }
  expect(scheduler.pendingCount).toBe(0)
}

describe("mount and resize layout budgets", () => {
  let restoreCanvas: () => void
  beforeEach(() => {
    frameTime = 0
    vi.spyOn(performance, "now").mockImplementation(() => frameTime)
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => {
    cleanup()
    restoreCanvas()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("projects the reported responsive lineage once before and once after measurement", () => {
    const scheduler = createFrameScheduler()
    let resize: ResizeObserverCallback | undefined
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    const graphNodes = Array.from({ length: 6 }, (_, i) => ({ id: String(i) }))
    const graphEdges = graphNodes
      .slice(1)
      .map((node, i) => ({ source: String(i), target: node.id }))
    const layout = vi.fn<NetworkCustomLayout>((ctx) => ({
      sceneNodes: ctx.nodes.map((node, i) => ({
        type: "circle",
        cx: ctx.dimensions.width / 2,
        cy: 20 + 30 * i,
        r: 5,
        style: { fill: "red" },
        datum: node
      }))
    }))
    render(
      <StreamNetworkFrame
        chartType="force"
        nodes={graphNodes}
        edges={graphEdges}
        customNetworkLayout={layout}
        size={[270, 290]}
        margin={margin}
        responsiveWidth
        animate={false}
        frameScheduler={scheduler.scheduler}
      />
    )
    settle(scheduler)
    const measure = () =>
      act(() =>
        resize?.(
          [{ contentRect: { width: 918, height: 290 } } as ResizeObserverEntry],
          {} as ResizeObserver
        )
      )
    measure()
    settle(scheduler)
    measure()
    settle(scheduler)
    expect(
      layout.mock.calls.map(([ctx]) => [
        ctx.dimensions.width,
        ctx.nodes.length,
        ctx.edges.length
      ])
    ).toEqual([
      [270, 6, 5],
      [918, 6, 5]
    ])
  })

  it.each([
    "force",
    "sankey",
    "chord",
    "tree",
    "treemap",
    "circlepack",
    "partition",
    "orbit"
  ] as const)(
    "does one %s solve/build on mount and resize; palette changes only rebuild the scene",
    (chartType) => {
      const scheduler = createFrameScheduler()
      const plugin = getLayoutPlugin(chartType)!
      const solve = vi.spyOn(plugin, "computeLayout")
      const build = vi.spyOn(plugin, "buildScene")
      const root = {
        id: "root",
        children: [
          { id: "a", value: 2 },
          { id: "b", value: 1 }
        ]
      }
      const chart = (width: number, colorScheme = "category10") => (
        <StreamNetworkFrame
          chartType={chartType}
          nodes={nodes}
          edges={edges}
          data={plugin.hierarchical ? root : undefined}
          size={[width, 300]}
          margin={margin}
          iterations={5}
          orbitAnimated={false}
          animate={false}
          colorScheme={colorScheme}
          frameScheduler={scheduler.scheduler}
        />
      )
      const view = render(chart(400))
      settle(scheduler)
      expect(solve).toHaveBeenCalledTimes(1)
      expect(build).toHaveBeenCalledTimes(1)
      view.rerender(chart(400))
      settle(scheduler)
      expect(solve).toHaveBeenCalledTimes(1)
      expect(build).toHaveBeenCalledTimes(1)
      view.rerender(chart(700))
      settle(scheduler)
      expect(solve).toHaveBeenCalledTimes(2)
      expect(build).toHaveBeenCalledTimes(2)
      view.rerender(chart(700, "tableau10"))
      settle(scheduler)
      expect(solve).toHaveBeenCalledTimes(2)
      expect(build).toHaveBeenCalledTimes(3)
    }
  )

  it.each(["xy", "ordinal", "geo"] as const)(
    "builds the built-in %s scene once at mount",
    (family) => {
      const scheduler = createFrameScheduler()
      const prototypes = {
        xy: PipelineStore.prototype,
        ordinal: OrdinalPipelineStore.prototype,
        geo: GeoPipelineStore.prototype
      }
      const compute = vi.spyOn(prototypes[family], "computeScene")
      const common = {
        size: [400, 300] as [number, number],
        margin,
        frameScheduler: scheduler.scheduler
      }
      if (family === "xy")
        render(<StreamXYFrame {...common} chartType="scatter" data={data} />)
      else if (family === "ordinal")
        render(
          <StreamOrdinalFrame
            {...common}
            chartType="bar"
            data={data}
            oAccessor="category"
            rAccessor="value"
          />
        )
      else
        render(
          <StreamGeoFrame {...common} projection="mercator" points={points} />
        )
      settle(scheduler)
      expect(compute).toHaveBeenCalledTimes(1)
    }
  )

  it("keeps PhysicsCustomChart geometry memoized across mount and stable rerenders", () => {
    const layout = vi.fn(() => ({}))
    const config = { kernel: { gravity: { x: 0, y: 0 } } }
    const chart = (width: number) => (
      <PhysicsCustomChart
        data={data}
        layout={layout}
        config={config}
        width={width}
        height={300}
        paused
      />
    )
    const view = render(chart(400))
    expect(layout).toHaveBeenCalledTimes(1)
    view.rerender(chart(400))
    expect(layout).toHaveBeenCalledTimes(1)
    view.rerender(chart(700))
    expect(layout).toHaveBeenCalledTimes(2)
  })

  it("builds once for batched data/config changes, then once for a new theme", () => {
    const scheduler = createFrameScheduler()
    const layout = vi.fn<NetworkCustomLayout>((ctx) => ({
      sceneNodes: ctx.nodes.map((node) => ({
        type: "circle",
        cx: 20,
        cy: 20,
        r: 5,
        style: { fill: ctx.theme.semantic.primary },
        datum: node
      })),
      htmlMarks: ctx.nodes.map((node) => ({
        id: node.id,
        x: Number(ctx.config.x),
        y: 0,
        width: 20,
        height: 20,
        content: <span data-testid={`mark-${node.id}`}>{node.id}</span>
      }))
    }))
    const chart = (
      graphNodes: typeof nodes,
      config: { x: number },
      dark = false
    ) => (
      <ThemeProvider theme={dark ? "dark" : "light"}>
        <NetworkCustomChart
          nodes={graphNodes}
          edges={emptyEdges}
          layout={layout}
          layoutConfig={config}
          width={400}
          height={300}
          animate={false}
          frameProps={{ frameScheduler: scheduler.scheduler }}
        />
      </ThemeProvider>
    )
    const config = { x: 10 }
    const view = render(chart(nodes, config))
    settle(scheduler)
    expect(layout).toHaveBeenCalledTimes(1)
    const nextNodes = [{ id: "new" }]
    const nextConfig = { x: 80 }
    view.rerender(chart(nextNodes, nextConfig))
    settle(scheduler)
    expect(layout).toHaveBeenCalledTimes(2)
    expect(view.getByTestId("mark-new")).toBeVisible()
    expect(layout.mock.results[1].value.htmlMarks?.[0].x).toBe(80)
    view.rerender(chart(nextNodes, nextConfig, true))
    settle(scheduler)
    expect(layout).toHaveBeenCalledTimes(3)
    expect(layout.mock.calls[2][0].theme.semantic).not.toEqual(
      layout.mock.calls[0][0].theme.semantic
    )
  })

  it("bounds StrictMode effect replay and preserves data without a phantom empty layout", () => {
    const scheduler = createFrameScheduler()
    const layout = vi.fn<NetworkCustomLayout>((ctx) => ({
      sceneNodes: ctx.nodes.map((node) => ({
        type: "circle",
        cx: 20,
        cy: 20,
        r: 5,
        style: { fill: "red" },
        datum: node
      }))
    }))
    render(
      <React.StrictMode>
        <NetworkCustomChart
          nodes={nodes}
          edges={edges}
          layout={layout}
          width={400}
          height={300}
          animate={false}
          frameProps={{ frameScheduler: scheduler.scheduler }}
        />
      </React.StrictMode>
    )
    settle(scheduler)
    expect(layout.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(layout.mock.calls.length).toBeLessThanOrEqual(2)
    expect(
      layout.mock.calls.every(
        ([ctx]) => ctx.nodes.length === 2 && ctx.edges.length === 1
      )
    ).toBe(true)
  })

  it("coalesces a push burst and rebuilds once per imperative mutation", () => {
    const scheduler = createFrameScheduler()
    const ref = React.createRef<StreamNetworkFrameHandle>()
    const plugin = getLayoutPlugin("force")!
    const build = vi.spyOn(plugin, "buildScene")
    const solve = vi.spyOn(plugin, "computeLayout")
    const chart = (width: number) => (
      <StreamNetworkFrame
        ref={ref}
        chartType="force"
        size={[width, 300]}
        margin={margin}
        animate={false}
        iterations={5}
        frameScheduler={scheduler.scheduler}
      />
    )
    const view = render(chart(400))
    settle(scheduler)
    build.mockClear()
    act(() => {
      ref.current!.push({ source: "a", target: "b", value: 1 })
      ref.current!.push({ source: "b", target: "c", value: 1 })
    })
    settle(scheduler)
    expect(solve).toHaveBeenCalledTimes(1)
    expect(build).toHaveBeenCalledTimes(1)
    act(() => {
      ref.current!.updateNode("a", (datum) => ({ ...datum, value: 5 }))
    })
    settle(scheduler)
    expect(build).toHaveBeenCalledTimes(2)
    act(() => {
      ref.current!.removeNode("c")
    })
    settle(scheduler)
    expect(build).toHaveBeenCalledTimes(3)
    expect(ref.current!.getTopology().nodes.map((node) => node.id)).toEqual([
      "a",
      "b"
    ])
    const oldPositions = ref.current!.getTopology().nodes.map((node) => node.x)
    view.rerender(chart(700))
    settle(scheduler)
    expect(build).toHaveBeenCalledTimes(4)
    expect(solve).toHaveBeenCalledTimes(4)
    expect(ref.current!.getTopology().nodes.map((node) => node.x)).not.toEqual(
      oldPositions
    )
  })

  it("lays out an initial push-mode seed once with its synthesized endpoint nodes", () => {
    const scheduler = createFrameScheduler()
    const layout = vi.fn<NetworkCustomLayout>((ctx) => ({
      overlays: <text data-testid="seed-size">{ctx.nodes.length}</text>
    }))
    const view = render(
      <StreamNetworkFrame
        chartType="force"
        initialEdges={[{ source: "a", target: "b", value: 1 }]}
        customNetworkLayout={layout}
        animate={false}
        frameScheduler={scheduler.scheduler}
      />
    )
    settle(scheduler)
    expect(layout).toHaveBeenCalledTimes(1)
    expect(layout.mock.calls[0][0].nodes).toHaveLength(2)
    expect(layout.mock.calls[0][0].edges).toHaveLength(1)
    expect(view.getByTestId("seed-size")).toHaveTextContent("2")
  })

  it("preserves empty-frame decoration layouts and the high-level empty state", () => {
    const scheduler = createFrameScheduler()
    const layout = vi.fn<NetworkCustomLayout>(() => ({
      overlays: <text data-testid="empty-decoration">Waiting for data</text>
    }))
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {})
    const view = render(
      <StreamNetworkFrame
        chartType="force"
        nodes={[]}
        edges={[]}
        customNetworkLayout={layout}
        animate={false}
        frameScheduler={scheduler.scheduler}
      />
    )
    settle(scheduler)
    expect(layout).toHaveBeenCalledTimes(1)
    expect(view.getByTestId("empty-decoration")).toBeVisible()
    view.unmount()
    layout.mockClear()
    render(<NetworkCustomChart nodes={[]} edges={[]} layout={layout} />)
    expect(layout).not.toHaveBeenCalled()
    warning.mockRestore()
  })

  it.each([
    { nodeCount: 2, edgeCount: 1, width: 400, height: 300 },
    { nodeCount: 52, edgeCount: 53, width: 7128, height: 1152 }
  ])(
    "runs a bounded $nodeCount-node NetworkCustomChart once per size, with data already present",
    ({ nodeCount, edgeCount, width, height }) => {
      const scheduler = createFrameScheduler()
      const graphNodes = Array.from({ length: nodeCount }, (_, i) => ({
        id: String(i)
      }))
      const graphEdges = Array.from({ length: edgeCount }, (_, i) => ({
        source: String(i % (nodeCount - 1)),
        target: String((i % (nodeCount - 1)) + 1)
      }))
      const layout = vi.fn<NetworkCustomLayout>((ctx) => ({
        sceneNodes: ctx.nodes.map((node, i) => ({
          type: "circle",
          cx: ctx.dimensions.width / 2,
          cy: 30 + i * 30,
          r: 5,
          style: { fill: "red" },
          datum: node
        })),
        overlays: <text data-testid="layout-width">{ctx.dimensions.width}</text>
      }))
      const chart = (chartWidth: number) => (
        <NetworkCustomChart
          nodes={graphNodes}
          edges={graphEdges}
          layout={layout}
          width={chartWidth}
          height={height}
          margin={margin}
          animate={false}
          frameProps={{ frameScheduler: scheduler.scheduler }}
        />
      )
      const view = render(chart(width))
      settle(scheduler)
      expect(
        layout.mock.calls.map(([ctx]) => [
          ctx.dimensions.width,
          ctx.nodes.length,
          ctx.edges.length
        ])
      ).toEqual([[width, nodeCount, edgeCount]])
      expect(view.getByTestId("layout-width").textContent).toBe(String(width))
      view.rerender(chart(width))
      settle(scheduler)
      expect(layout).toHaveBeenCalledTimes(1)
      view.rerender(chart(700))
      settle(scheduler)
      expect(
        layout.mock.calls.map(([ctx]) => [
          ctx.dimensions.width,
          ctx.nodes.length
        ])
      ).toEqual([
        [width, nodeCount],
        [700, nodeCount]
      ])
      expect(view.getByTestId("layout-width").textContent).toBe("700")
    }
  )

  it.each([
    { family: "xy", publicChart: false },
    { family: "ordinal", publicChart: false },
    { family: "geo", publicChart: false },
    { family: "xy", publicChart: true },
    { family: "ordinal", publicChart: true },
    { family: "geo", publicChart: true }
  ] as const)(
    "runs $family custom geometry once per size (public wrapper: $publicChart)",
    ({ family, publicChart }) => {
      const scheduler = createFrameScheduler()
      const layout = vi.fn((ctx: { dimensions: { width: number } }) => ({
        nodes: [
          {
            type: "point",
            x: ctx.dimensions.width / 2,
            y: 50,
            r: 5,
            style: { fill: "red" },
            datum: data[0]
          }
        ],
        overlays: <text data-testid="layout-width">{ctx.dimensions.width}</text>
      }))
      const chart = (width: number) => {
        if (publicChart) {
          const common = {
            width,
            height: 300,
            margin,
            animate: false,
            frameProps: { frameScheduler: scheduler.scheduler }
          }
          if (family === "xy")
            return (
              <XYCustomChart
                {...common}
                data={data}
                layout={layout as CustomLayout}
              />
            )
          if (family === "ordinal")
            return (
              <OrdinalCustomChart
                {...common}
                data={data}
                layout={layout as OrdinalCustomLayout}
              />
            )
          return (
            <GeoCustomChart
              {...common}
              points={points}
              layout={layout as GeoCustomLayout}
            />
          )
        }
        const common = {
          size: [width, 300] as [number, number],
          margin,
          frameScheduler: scheduler.scheduler
        }
        if (family === "xy")
          return (
            <StreamXYFrame
              {...common}
              chartType="scatter"
              data={data}
              customLayout={layout as CustomLayout}
            />
          )
        if (family === "ordinal")
          return (
            <StreamOrdinalFrame
              {...common}
              chartType="bar"
              data={data}
              oAccessor="category"
              rAccessor="value"
              customLayout={layout as OrdinalCustomLayout}
            />
          )
        return (
          <StreamGeoFrame
            {...common}
            projection="mercator"
            points={points}
            customLayout={layout as GeoCustomLayout}
          />
        )
      }
      const view = render(chart(400))
      settle(scheduler)
      expect(layout.mock.calls.map(([ctx]) => ctx.dimensions.width)).toEqual([
        400
      ])
      expect(view.getByTestId("layout-width").textContent).toBe("400")
      view.rerender(chart(400))
      settle(scheduler)
      expect(layout).toHaveBeenCalledTimes(1)
      view.rerender(chart(700))
      settle(scheduler)
      expect(layout.mock.calls.map(([ctx]) => ctx.dimensions.width)).toEqual([
        400, 700
      ])
      expect(view.getByTestId("layout-width").textContent).toBe("700")
    }
  )

  it.each(["xy", "ordinal", "geo"] as const)(
    "does not invalidate the %s scene after an initial synchronous measurement",
    (family) => {
      const scheduler = createFrameScheduler()
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        width: 918,
        height: 290,
        top: 0,
        left: 0,
        right: 918,
        bottom: 290,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
      const layout = vi.fn((ctx: { dimensions: { width: number } }) => ({
        nodes: [
          {
            type: "point",
            x: ctx.dimensions.width / 2,
            y: 50,
            r: 5,
            style: { fill: "red" },
            datum: data[0]
          }
        ]
      }))
      const common = {
        width: 270,
        height: 290,
        margin,
        responsiveWidth: true,
        animate: false,
        frameProps: { frameScheduler: scheduler.scheduler }
      }
      if (family === "xy")
        render(
          <XYCustomChart
            {...common}
            data={data}
            layout={layout as CustomLayout}
          />
        )
      else if (family === "ordinal")
        render(
          <OrdinalCustomChart
            {...common}
            data={data}
            layout={layout as OrdinalCustomLayout}
          />
        )
      else
        render(
          <GeoCustomChart
            {...common}
            points={points}
            layout={layout as GeoCustomLayout}
          />
        )
      settle(scheduler)
      expect(layout.mock.calls.map(([ctx]) => ctx.dimensions.width)).toEqual([
        918
      ])
    }
  )

  it("does not rerun custom XY geometry when its lazy canvas renderers arrive", async () => {
    resetXYPluginRegistry()
    const scheduler = createFrameScheduler()
    const layout = vi.fn<CustomLayout>((ctx) => ({
      nodes: ctx.data.map((datum) => ({
        type: "point",
        x: 20,
        y: 20,
        r: 5,
        style: { fill: "red" },
        datum
      }))
    }))
    render(
      <StreamXYFrame
        chartType="scatter"
        data={data}
        customLayout={layout}
        frameScheduler={scheduler.scheduler}
        size={[400, 300]}
      />
    )
    await waitFor(() => expect(getXYPlugin("custom")).toBeDefined())
    settle(scheduler)
    expect(layout).toHaveBeenCalledTimes(1)
  })
})
