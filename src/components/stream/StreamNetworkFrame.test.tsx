import * as React from "react"
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import { act, render } from "@testing-library/react"
import StreamNetworkFrame from "./StreamNetworkFrame"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import type { StreamNetworkFrameHandle } from "./networkTypes"
import { createFrameScheduler } from "./test-utils/frameScheduler"

// ResizeObserver is polyfilled globally in src/setupTests.ts.

describe("StreamNetworkFrame", () => {
  // No-op rAF: Network's continuous-render loop would recurse if rAF
  // fired synchronously. The regression scope only needs the initial
  // pipelineConfig that reaches the store, not subsequent paints.
  let restoreCanvas: (() => void) | null = null

  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => {
    restoreCanvas?.()
    restoreCanvas = null
  })

  // ── Regression: every declared *Style prop reaches pipelineConfig ──────
  //
  // Mirrors the guard in StreamXYFrame.test.tsx / StreamOrdinalFrame.test.tsx:
  // spies on NetworkPipelineStore.updateConfig, renders the frame with a
  // sentinel value for each declared `*Style` prop, asserts each sentinel
  // reaches the merged config. Catches future drops at the Frame↔Store seam.
  //
  // When adding a new `*Style` prop:
  //   1. Add `fooStyle` to NetworkPipelineConfig in networkTypes.ts
  //   2. Thread it into the pipelineConfig memo in StreamNetworkFrame.tsx
  //   3. Add a sentinel entry below
  describe("regression: all declared *Style props reach pipelineConfig", () => {
    it("forwards every *Style prop to the NetworkPipelineStore config", async () => {
      const nodeStyle = () => ({ fill: "__NODE_STYLE__" })
      const edgeStyle = () => ({ stroke: "__EDGE_STYLE__" })
      const particleStyle = { radius: 4, fill: "__PARTICLE_STYLE__" }

      const StoreModule = await import("./NetworkPipelineStore")
      const updateSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "updateConfig")

      try {
        // Use `sankey` (non-iterative layout) to avoid force layout's
        // continuous rAF loop — that loop makes the jsdom rAF mock recurse
        // on itself because each tick schedules another. The regression
        // assertion only cares about the initial pipelineConfig.
        render(
          <StreamNetworkFrame
            chartType="sankey"
            nodes={[{ id: "a" }, { id: "b" }]}
            edges={[{ source: "a", target: "b", value: 1 }]}
            nodeStyle={nodeStyle}
            edgeStyle={edgeStyle}
            particleStyle={particleStyle}
          />
        )

        const lastConfig = updateSpy.mock.calls[updateSpy.mock.calls.length - 1]?.[0]
        expect(lastConfig, "updateConfig should be invoked with the initial merged config").toBeDefined()

        expect(lastConfig.nodeStyle).toBe(nodeStyle)
        expect(lastConfig.edgeStyle).toBe(edgeStyle)
        // particleStyle is merged with DEFAULT_PARTICLE_STYLE in the frame
        // (a deliberate shape — see the useMemo in StreamNetworkFrame.tsx),
        // so identity comparison isn't meaningful here. Verify the user's
        // keys made it through the merge.
        expect(lastConfig.particleStyle).toMatchObject(particleStyle)
      } finally {
        updateSpy.mockRestore()
      }
    })
  })

  // ── Regression: function-prop churn must not re-ingest the hierarchy ───
  //
  // A parent passing fresh inline-arrow callbacks each render (e.g. an
  // animated OrbitDiagram whose `nodeStyle`/`revolution` props are recreated
  // on every page re-render) churns the pipelineConfig — functions never
  // compare shallow-equal, so `useStableShallow` can't dedupe them. Before
  // the fix the hierarchy-ingest effect depended on the config, so each such
  // re-render re-ingested the data AND fired a setState (syncCustomOverlays).
  // Compounding with a continuous animation's frame loop, that tripped
  // React's max-update-depth guard and OOM-crashed the tab. The ingest effect
  // must react only to data/dimension changes; config changes are handled by
  // the dedicated updateConfig effect.
  describe("regression: function-prop identity churn does not re-ingest", () => {
    it("re-runs updateConfig but not ingestHierarchy when only a function prop's identity changes", async () => {
      const data = { name: "root", children: [{ name: "a" }, { name: "b" }] }

      const StoreModule = await import("./NetworkPipelineStore")
      const ingestSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "ingestHierarchy")
      const updateSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "updateConfig")

      try {
        const { rerender } = render(
          <StreamNetworkFrame
            chartType="orbit"
            data={data}
            childrenAccessor="children"
            nodeIDAccessor="name"
            nodeStyle={() => ({ fill: "#111" })}
          />
        )

        const ingestAfterMount = ingestSpy.mock.calls.length
        const updateAfterMount = updateSpy.mock.calls.length
        expect(ingestAfterMount).toBeGreaterThan(0)

        // Re-render with a brand-new nodeStyle function identity (same data ref).
        rerender(
          <StreamNetworkFrame
            chartType="orbit"
            data={data}
            childrenAccessor="children"
            nodeIDAccessor="name"
            nodeStyle={() => ({ fill: "#222" })}
          />
        )

        // Config change still propagates...
        expect(updateSpy.mock.calls.length).toBeGreaterThan(updateAfterMount)
        // ...but the hierarchy is NOT re-ingested (no setState compounding).
        expect(ingestSpy.mock.calls.length).toBe(ingestAfterMount)
      } finally {
        ingestSpy.mockRestore()
        updateSpy.mockRestore()
      }
    })

    it("DOES re-ingest when a layout-affecting prop (orbitMode) changes", async () => {
      const data = { name: "root", children: [{ name: "a" }, { name: "b" }, { name: "c" }] }

      const StoreModule = await import("./NetworkPipelineStore")
      const ingestSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "ingestHierarchy")

      try {
        const { rerender } = render(
          <StreamNetworkFrame
            chartType="orbit"
            data={data}
            childrenAccessor="children"
            nodeIDAccessor="name"
            orbitMode="flat"
          />
        )

        const ingestAfterMount = ingestSpy.mock.calls.length

        // Layout parameter change must recompute node positions → re-ingest.
        rerender(
          <StreamNetworkFrame
            chartType="orbit"
            data={data}
            childrenAccessor="children"
            nodeIDAccessor="name"
            orbitMode="solar"
          />
        )

        expect(ingestSpy.mock.calls.length).toBeGreaterThan(ingestAfterMount)
      } finally {
        ingestSpy.mockRestore()
      }
    })
  })

  // ── Push API + clear→reload lifecycle ────────────────────────────────
  // Exercises the frame's imperative handle and the push→ingest→clear→reload
  // path — the frame-level boundary for the store's topology-diff clear() reset.
  describe("push API + clear→reload lifecycle", () => {
    it("pushMany/clear round-trips through the store and reloads fresh", async () => {
      const ref = React.createRef<StreamNetworkFrameHandle>()
      render(
        <StreamNetworkFrame
          ref={ref}
          chartType="sankey"
          nodeIDAccessor="id"
          sourceAccessor="source"
          targetAccessor="target"
          valueAccessor="value"
        />
      )
      await act(async () => {
        ref.current!.pushMany([
          { source: "A", target: "B", value: 5 },
          { source: "B", target: "C", value: 3 },
        ])
      })
      const loaded = ref.current!.getTopology()
      expect(loaded.edges.length).toBeGreaterThan(0)
      expect(loaded.nodes.length).toBeGreaterThan(0)

      await act(async () => { ref.current!.clear() })
      const cleared = ref.current!.getTopology()
      expect(cleared.edges.length).toBe(0)
      expect(cleared.nodes.length).toBe(0)

      // Reload after clear behaves fresh (frame-level boundary for the
      // NetworkPipelineStore.clear() topology-diff reset).
      await act(async () => { ref.current!.pushMany([{ source: "X", target: "Y", value: 2 }]) })
      expect(ref.current!.getTopology().edges.length).toBeGreaterThan(0)
    })
  })

  // ── Controlled non-empty → empty must clear the previous scene ────────
  // Regression: the empty-graph branch of the ingestion effect used to
  // early-return without touching the store, so controlled consumers
  // transitioning `nodes`/`edges` to empty arrays kept the stale topology
  // (and its rendered marks) on screen.
  describe("controlled non-empty → empty transition", () => {
    it("clears the store when controlled nodes/edges props empty out", async () => {
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const props = {
        chartType: "sankey" as const,
        nodeIDAccessor: "id",
        sourceAccessor: "source",
        targetAccessor: "target",
        valueAccessor: "value",
      }
      const { rerender } = render(
        <StreamNetworkFrame
          ref={ref}
          {...props}
          nodes={[{ id: "a" }, { id: "b" }]}
          edges={[{ source: "a", target: "b", value: 1 }]}
        />
      )
      expect(ref.current!.getTopology().nodes.length).toBeGreaterThan(0)

      await act(async () => {
        rerender(<StreamNetworkFrame ref={ref} {...props} nodes={[]} edges={[]} />)
      })
      const cleared = ref.current!.getTopology()
      expect(cleared.nodes.length).toBe(0)
      expect(cleared.edges.length).toBe(0)
    })

    it("preserves pushed data when props are omitted (push mode)", async () => {
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const props = {
        chartType: "sankey" as const,
        nodeIDAccessor: "id",
        sourceAccessor: "source",
        targetAccessor: "target",
        valueAccessor: "value",
      }
      const { rerender } = render(
        <StreamNetworkFrame ref={ref} {...props} size={[500, 400]} />
      )
      await act(async () => {
        ref.current!.pushMany([{ source: "A", target: "B", value: 5 }])
      })
      expect(ref.current!.getTopology().edges.length).toBeGreaterThan(0)

      // Re-run the ingestion effect via a dimension change — with omitted
      // nodes/edges props the empty branch must NOT clear the push buffer.
      await act(async () => {
        rerender(<StreamNetworkFrame ref={ref} {...props} size={[600, 400]} />)
      })
      const after = ref.current!.getTopology()
      expect(after.edges.length).toBeGreaterThan(0)
      expect(after.nodes.length).toBeGreaterThan(0)
    })
  })

  describe("frame runtime policy", () => {
    it("freezes logical time and cancels scheduled paints while paused", async () => {
      const scheduler = createFrameScheduler(0)
      let wallTime = 0
      const clock = () => wallTime
      const StoreModule = await import("./NetworkPipelineStore")
      const advanceSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "advanceTransition")

      try {
        const props = {
          chartType: "sankey" as const,
          nodes: [{ id: "a" }, { id: "b" }],
          edges: [{ source: "a", target: "b", value: 1 }],
          frameScheduler: scheduler.scheduler,
          clock,
        }
        const { rerender } = render(<StreamNetworkFrame {...props} paused />)

        await act(async () => {
          rerender(<StreamNetworkFrame {...props} paused={false} />)
        })
        expect(scheduler.pendingCount).toBe(1)

        await act(async () => {
          rerender(<StreamNetworkFrame {...props} paused />)
        })
        expect(scheduler.cancelledHandles).toContain(0)
        expect(scheduler.pendingCount).toBe(0)

        wallTime = 10_000
        await act(async () => {
          rerender(<StreamNetworkFrame {...props} paused={false} />)
        })
        expect(scheduler.pendingCount).toBe(1)

        await act(async () => {
          scheduler.flush(wallTime)
        })
        expect(advanceSpy).toHaveBeenCalled()
        expect(advanceSpy.mock.calls.at(-1)?.[0]).toBe(0)
      } finally {
        advanceSpy.mockRestore()
      }
    })

    it("forwards an injected random source to the force pipeline config", async () => {
      const random = () => 0.25
      const StoreModule = await import("./NetworkPipelineStore")
      const updateSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "updateConfig")
      try {
        render(
          <StreamNetworkFrame
            chartType="force"
            nodes={[{ id: "a" }, { id: "b" }]}
            edges={[{ source: "a", target: "b", value: 1 }]}
            random={random}
          />
        )
        const lastConfig = updateSpy.mock.calls.at(-1)?.[0]
        expect(lastConfig?.random).toBe(random)
      } finally {
        updateSpy.mockRestore()
      }
    })

    it("preserves d3-force's default random source when no override is supplied", async () => {
      const StoreModule = await import("./NetworkPipelineStore")
      const updateSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "updateConfig")
      try {
        render(
          <StreamNetworkFrame
            chartType="force"
            nodes={[{ id: "a" }, { id: "b" }]}
            edges={[{ source: "a", target: "b", value: 1 }]}
          />
        )
        const lastConfig = updateSpy.mock.calls.at(-1)?.[0]
        expect(lastConfig?.random).toBeUndefined()
        expect(lastConfig?.seed).toBeUndefined()
      } finally {
        updateSpy.mockRestore()
      }
    })
  })
})
