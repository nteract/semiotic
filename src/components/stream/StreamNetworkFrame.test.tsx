import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import { render } from "@testing-library/react"
import StreamNetworkFrame from "./StreamNetworkFrame"
import { setupCanvasMock } from "../../test-utils/canvasMock"

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
  })
})
