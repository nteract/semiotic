/**
 * Phase 4 — `cancelIntroAnimation` regression for the three pipeline
 * stores. After a `computeScene` call that installs an intro animation
 * (transition configured + `_hasRenderedOnce` was false), calling
 * `cancelIntroAnimation` should leave the store in a state where the
 * next paint shows the scene's final positions directly with no
 * transition active.
 *
 * Stream Frames invoke this method when `useWasHydratingFromSSR` is
 * true on the SVG → canvas swap. Without it, the canvas re-animates
 * from blank after the server already painted the chart.
 */
import { describe, it, expect } from "vitest"
import { PipelineStore } from "./PipelineStore"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import { NetworkPipelineStore } from "./NetworkPipelineStore"

describe("PipelineStore.cancelIntroAnimation", () => {
  it("clears prevPositionMap and activeTransition after intro is installed", () => {
    const store = new PipelineStore({
      chartType: "line",
      xAccessor: "x",
      yAccessor: "y",
      transition: { duration: 300, easing: "ease-out" },
      introAnimation: true,
    })
    store.ingest({ inserts: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }], bounded: true })
    store.computeScene({ width: 400, height: 200 })

    // Sanity: intro state was installed.
    expect(store.activeTransition).not.toBeNull()

    store.cancelIntroAnimation()

    // After cancel: no live transition. `advanceTransition` returns
    // false because `activeTransition` is null, which means the
    // canvas paint will read scene positions directly.
    expect(store.activeTransition).toBeNull()
    expect(store.advanceTransition(performance.now())).toBe(false)
  })

  it("is idempotent — calling twice is a no-op", () => {
    const store = new PipelineStore({
      chartType: "line",
      xAccessor: "x",
      yAccessor: "y",
      transition: { duration: 300, easing: "ease-out" },
      introAnimation: true,
    })
    store.ingest({ inserts: [{ x: 0, y: 1 }, { x: 1, y: 2 }], bounded: true })
    store.computeScene({ width: 400, height: 200 })

    store.cancelIntroAnimation()
    store.cancelIntroAnimation() // should not throw or change state
    expect(store.activeTransition).toBeNull()
  })
})

describe("OrdinalPipelineStore.cancelIntroAnimation", () => {
  it("clears intro state after computeScene installed it", () => {
    const store = new OrdinalPipelineStore({
      chartType: "bar",
      oAccessor: "region",
      rAccessor: "value",
      transition: { duration: 300, easing: "ease-out" },
      introAnimation: true,
    })
    store.ingest({
      inserts: [
        { region: "AMER", value: 10 },
        { region: "EMEA", value: 20 },
        { region: "APAC", value: 30 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })

    expect(store.activeTransition).not.toBeNull()

    store.cancelIntroAnimation()
    expect(store.activeTransition).toBeNull()
  })
})

describe("NetworkPipelineStore.cancelIntroAnimation", () => {
  it("clears the layout transition + per-node intro positions", () => {
    const store = new NetworkPipelineStore({
      chartType: "treemap",
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      transition: { duration: 300, easing: "ease-out" },
      introAnimation: true,
    })
    const hierarchy = {
      name: "root",
      children: [
        { name: "a", value: 5 },
        { name: "b", value: 10 },
      ],
    }
    store.ingestHierarchy(hierarchy, [400, 300])
    store.buildScene([400, 300])

    // Treemap is in the deterministic-layout list, so intro is set up.
    expect(store.transition).not.toBeNull()

    store.cancelIntroAnimation()
    expect(store.transition).toBeNull()

    // Per-node intro positions are wiped so the canvas paint reads
    // the live positions directly (no center-origin interpolation).
    for (const node of (store as unknown as { nodes: Map<string, { _prevX0?: number }> }).nodes.values()) {
      expect(node._prevX0).toBeUndefined()
    }
  })
})
