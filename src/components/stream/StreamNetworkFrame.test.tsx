import * as React from "react"
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import { act, fireEvent, render } from "@testing-library/react"
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
    it("coalesces rapid single-edge pushes into one layout at the next frame", async () => {
      const scheduler = createFrameScheduler(0)
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const StoreModule = await import("./NetworkPipelineStore")
      const layoutSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "runLayout")

      try {
        render(
          <StreamNetworkFrame
            ref={ref}
            chartType="sankey"
            frameScheduler={scheduler.scheduler}
          />
        )
        await act(async () => { scheduler.flush() })
        layoutSpy.mockClear()

        await act(async () => {
          for (let i = 0; i < 50; i++) {
            ref.current!.push({ source: `n${i}`, target: `n${i + 1}`, value: 1 })
          }
        })

        expect(layoutSpy).not.toHaveBeenCalled()
        expect(scheduler.pendingCount).toBe(1)

        await act(async () => { scheduler.flush() })

        expect(layoutSpy).toHaveBeenCalledTimes(1)
        expect(ref.current!.getTopology().edges).toHaveLength(50)
      } finally {
        layoutSpy.mockRestore()
      }
    })

    it("ingests immediately while geometry reads and mutations commit one layout", async () => {
      const scheduler = createFrameScheduler(0)
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const StoreModule = await import("./NetworkPipelineStore")
      const ingestSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "ingestEdge")
      const layoutSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "runLayout")

      try {
        render(
          <StreamNetworkFrame
            ref={ref}
            chartType="sankey"
            frameScheduler={scheduler.scheduler}
          />
        )
        await act(async () => { scheduler.flush() })
        ingestSpy.mockClear()
        layoutSpy.mockClear()

        await act(async () => {
          ref.current!.push({ source: "A", target: "B", value: 2 })
        })
        expect(ingestSpy).toHaveBeenCalledTimes(1)
        expect(layoutSpy).not.toHaveBeenCalled()

        let topology: ReturnType<StreamNetworkFrameHandle["getTopology"]>
        await act(async () => {
          topology = ref.current!.getTopology()
        })
        expect(topology!.edges).toHaveLength(1)
        expect(layoutSpy).toHaveBeenCalledTimes(1)

        let removed = false
        await act(async () => {
          ref.current!.push({ source: "B", target: "C", value: 3 })
          removed = ref.current!.removeEdge("B", "C")
          topology = ref.current!.getTopology()
        })
        expect(removed).toBe(true)
        expect(topology!.edges).toHaveLength(1)
        expect(layoutSpy).toHaveBeenCalledTimes(2)

        await act(async () => { scheduler.flush() })
        expect(ingestSpy).toHaveBeenCalledTimes(2)
        expect(layoutSpy).toHaveBeenCalledTimes(2)
      } finally {
        ingestSpy.mockRestore()
        layoutSpy.mockRestore()
      }
    })

    it("lets pushMany synchronously absorb queued single pushes with one layout", async () => {
      const scheduler = createFrameScheduler(0)
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const StoreModule = await import("./NetworkPipelineStore")
      const layoutSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "runLayout")

      try {
        render(
          <StreamNetworkFrame
            ref={ref}
            chartType="sankey"
            frameScheduler={scheduler.scheduler}
          />
        )
        await act(async () => { scheduler.flush() })
        layoutSpy.mockClear()

        let topology: ReturnType<StreamNetworkFrameHandle["getTopology"]>
        await act(async () => {
          ref.current!.push({ source: "A", target: "B", value: 1 })
          ref.current!.pushMany([{ source: "B", target: "C", value: 1 }])
          topology = ref.current!.getTopology()
        })

        expect(layoutSpy).toHaveBeenCalledTimes(1)
        expect(topology!.edges).toHaveLength(2)

        await act(async () => { scheduler.flush() })
        expect(layoutSpy).toHaveBeenCalledTimes(1)
      } finally {
        layoutSpy.mockRestore()
      }
    })

    it("clear discards a pending layout so a scheduled frame cannot resurrect data", async () => {
      const scheduler = createFrameScheduler(0)
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const StoreModule = await import("./NetworkPipelineStore")
      const layoutSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "runLayout")

      try {
        render(
          <StreamNetworkFrame
            ref={ref}
            chartType="sankey"
            frameScheduler={scheduler.scheduler}
          />
        )
        await act(async () => { scheduler.flush() })
        layoutSpy.mockClear()

        let topology: ReturnType<StreamNetworkFrameHandle["getTopology"]>
        await act(async () => {
          ref.current!.push({ source: "queued", target: "discarded", value: 1 })
          ref.current!.clear()
          topology = ref.current!.getTopology()
        })
        expect(topology!).toEqual({ nodes: [], edges: [] })
        expect(layoutSpy).not.toHaveBeenCalled()

        await act(async () => { scheduler.flush() })
        await act(async () => {
          topology = ref.current!.getTopology()
        })
        expect(layoutSpy).not.toHaveBeenCalled()
        expect(topology!).toEqual({ nodes: [], edges: [] })
      } finally {
        layoutSpy.mockRestore()
      }
    })

    it("snapshots each push through immediate ingestion when callers reuse a mutable object", async () => {
      const scheduler = createFrameScheduler(0)
      const ref = React.createRef<StreamNetworkFrameHandle>()
      render(
        <StreamNetworkFrame
          ref={ref}
          chartType="sankey"
          frameScheduler={scheduler.scheduler}
        />
      )
      await act(async () => { scheduler.flush() })

      const edge = { source: "A", target: "B", value: 1 }
      await act(async () => {
        ref.current!.push(edge)
        edge.target = "C"
        ref.current!.push(edge)
        edge.target = "D"
        scheduler.flush()
      })

      const topology = ref.current!.getTopology()
      expect(topology.edges).toHaveLength(2)
      expect(
        topology.edges
          .map((item) =>
            typeof item.target === "object" ? item.target.id : item.target,
          )
          .sort(),
      ).toEqual(["B", "C"])
    })

    it("commits a pending push before pause cancels its paint frame", async () => {
      const scheduler = createFrameScheduler(0)
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const StoreModule = await import("./NetworkPipelineStore")
      const layoutSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "runLayout")

      try {
        const props = {
          ref,
          chartType: "sankey" as const,
          frameScheduler: scheduler.scheduler,
        }
        const { rerender } = render(<StreamNetworkFrame {...props} />)
        await act(async () => { scheduler.flush() })
        layoutSpy.mockClear()

        await act(async () => {
          ref.current!.push({ source: "A", target: "B", value: 1 })
          rerender(<StreamNetworkFrame {...props} paused />)
        })

        expect(layoutSpy).toHaveBeenCalledTimes(1)
        expect(scheduler.pendingCount).toBe(0)
        expect(ref.current!.getTopology().edges).toHaveLength(1)
      } finally {
        layoutSpy.mockRestore()
      }
    })

    it("lets a newer controlled replacement supersede a pending push transaction", async () => {
      const scheduler = createFrameScheduler(0)
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const base = {
        ref,
        chartType: "sankey" as const,
        frameScheduler: scheduler.scheduler,
      }
      const { rerender } = render(<StreamNetworkFrame {...base} />)
      await act(async () => { scheduler.flush() })

      await act(async () => {
        ref.current!.push({ source: "stale", target: "push", value: 1 })
        rerender(
          <StreamNetworkFrame
            {...base}
            nodes={[{ id: "X" }, { id: "Y" }]}
            edges={[{ source: "X", target: "Y", value: 2 }]}
          />
        )
      })
      await act(async () => { scheduler.flush() })

      let topology = ref.current!.getTopology()
      expect(topology.edges).toHaveLength(1)
      expect(topology.edges[0]).toMatchObject({ value: 2 })
      expect(topology.nodes.map((node) => node.id).sort()).toEqual(["X", "Y"])

      await act(async () => {
        ref.current!.push({ source: "queued", target: "gone", value: 1 })
        rerender(<StreamNetworkFrame {...base} nodes={[]} edges={[]} />)
      })
      await act(async () => { scheduler.flush() })
      topology = ref.current!.getTopology()
      expect(topology).toEqual({ nodes: [], edges: [] })
    })

    it("commits push-then-remove as one net layout and callback", async () => {
      const scheduler = createFrameScheduler(0)
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const onTopologyChange = vi.fn()
      const StoreModule = await import("./NetworkPipelineStore")
      const layoutSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "runLayout")

      try {
        render(
          <StreamNetworkFrame
            ref={ref}
            chartType="sankey"
            frameScheduler={scheduler.scheduler}
            onTopologyChange={onTopologyChange}
          />
        )
        await act(async () => { scheduler.flush() })
        layoutSpy.mockClear()
        onTopologyChange.mockClear()

        let removed = false
        await act(async () => {
          ref.current!.push({ source: "A", target: "B", value: 1 })
          removed = ref.current!.removeEdge("A", "B")
        })

        expect(removed).toBe(true)
        expect(layoutSpy).toHaveBeenCalledTimes(1)
        expect(onTopologyChange).toHaveBeenCalledTimes(1)
        expect(onTopologyChange.mock.calls[0][1]).toEqual([])
        await act(async () => { scheduler.flush() })
        expect(layoutSpy).toHaveBeenCalledTimes(1)
      } finally {
        layoutSpy.mockRestore()
      }
    })

    it("drops an uncommitted layout on unmount", async () => {
      const scheduler = createFrameScheduler(0)
      const ref = React.createRef<StreamNetworkFrameHandle>()
      const StoreModule = await import("./NetworkPipelineStore")
      const layoutSpy = vi.spyOn(StoreModule.NetworkPipelineStore.prototype, "runLayout")

      try {
        const { unmount } = render(
          <StreamNetworkFrame
            ref={ref}
            chartType="sankey"
            frameScheduler={scheduler.scheduler}
          />
        )
        await act(async () => { scheduler.flush() })
        layoutSpy.mockClear()

        await act(async () => {
          ref.current!.push({ source: "A", target: "B", value: 1 })
          unmount()
        })
        scheduler.flush()
        expect(layoutSpy).not.toHaveBeenCalled()
      } finally {
        layoutSpy.mockRestore()
      }
    })

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

  describe("keyboard semantics", () => {
    it("reserves Enter for edge traversal and Space for activation", () => {
      const onObservation = vi.fn()
      const { container, rerender } = render(
        <StreamNetworkFrame
          chartType="sankey"
          nodes={[{ id: "a" }, { id: "b" }]}
          edges={[{ source: "a", target: "b", value: 1 }]}
          onObservation={onObservation}
        />
      )
      const frame = container.querySelector<HTMLElement>(".stream-network-frame")!

      fireEvent.keyDown(frame, { key: "ArrowRight" })
      onObservation.mockClear()
      fireEvent.keyDown(frame, { key: "Enter" })

      expect(onObservation.mock.calls.map(([event]) => event.type)).toEqual(["hover", "focus"])
      expect(onObservation.mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({ type: "focus", datum: expect.objectContaining({ id: "b" }) }),
      )
      expect(onObservation).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "activate" }),
      )

      onObservation.mockClear()
      fireEvent.keyDown(frame, { key: " " })
      expect(onObservation.mock.calls.map(([event]) => event.type)).toEqual(["click", "activate"])
      expect(onObservation.mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({ type: "activate", datum: expect.objectContaining({ id: "b" }) }),
      )

      rerender(
        <StreamNetworkFrame
          chartType="sankey"
          nodes={[{ id: "a" }]}
          edges={[]}
          onObservation={onObservation}
        />
      )
      onObservation.mockClear()
      fireEvent.keyDown(frame, { key: " " })
      expect(onObservation).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "activate" }),
      )
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
