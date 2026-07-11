/**
 * Regression coverage for the shared imperative-handle bridge.
 *
 * The helper replaced ~22 inline `useImperativeHandle` blocks across
 * the HOC matrix, so the contract has to stay precise: each variant's
 * defaults must call into the right frame methods, the network/geo
 * variants must NOT add a `getScales` key (so `typeof handle.getScales
 * === "function"` checks survive the migration), and `getData`'s
 * runtime shape must match the pre-migration inline form (entries
 * without a payload surface as `undefined`, not `{}`).
 *
 * Test strategy: render a tiny consumer component that calls
 * `useFrameImperativeHandle` with a hand-built fake frameRef whose
 * methods are vitest spies, then drive the published handle through
 * its `RealtimeFrameHandle` surface and assert (a) the right frame
 * methods were called with the right arguments and (b) the published
 * handle has the expected key set.
 */
import * as React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import type { Datum } from "./datumTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useFrameImperativeHandle } from "./useFrameImperativeHandle"

interface XYFakeFrame {
  push: ReturnType<typeof vi.fn>
  pushMany: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
  getData: ReturnType<typeof vi.fn>
  getScales: ReturnType<typeof vi.fn>
}

interface NetworkFakeFrame {
  push: ReturnType<typeof vi.fn>
  pushMany: ReturnType<typeof vi.fn>
  removeNode: ReturnType<typeof vi.fn>
  updateNode: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
  getTopology: ReturnType<typeof vi.fn>
}

interface GeoFakeFrame {
  push: ReturnType<typeof vi.fn>
  pushMany: ReturnType<typeof vi.fn>
  removePoint: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
  getData: ReturnType<typeof vi.fn>
}

// Tiny consumer component that mirrors the call shape every HOC uses.
function makeXYHarness(frame: XYFakeFrame, overrides?: Partial<RealtimeFrameHandle>) {
  const handleRef = React.createRef<RealtimeFrameHandle>()
  const Harness = () => {
    const frameRef = React.useRef<XYFakeFrame>(frame)
    useFrameImperativeHandle(handleRef, { variant: "xy", frameRef, overrides })
    return null
  }
  render(<Harness />)
  return handleRef
}

function makeNetworkHarness(frame: NetworkFakeFrame, overrides?: Partial<RealtimeFrameHandle>) {
  const handleRef = React.createRef<RealtimeFrameHandle>()
  const Harness = () => {
    const frameRef = React.useRef<NetworkFakeFrame>(frame)
    useFrameImperativeHandle(handleRef, { variant: "network", frameRef, overrides })
    return null
  }
  render(<Harness />)
  return handleRef
}

function makeGeoHarness(frame: GeoFakeFrame, overrides?: Partial<RealtimeFrameHandle>) {
  const handleRef = React.createRef<RealtimeFrameHandle>()
  const Harness = () => {
    const frameRef = React.useRef<GeoFakeFrame>(frame)
    useFrameImperativeHandle(handleRef, { variant: "geo-points", frameRef, overrides })
    return null
  }
  render(<Harness />)
  return handleRef
}

describe("useFrameImperativeHandle — xy variant", () => {
  it("delegates each method 1:1 to the frame ref", () => {
    const frame: XYFakeFrame = {
      push: vi.fn(),
      pushMany: vi.fn(),
      remove: vi.fn(() => [{ id: "a" } as Datum]),
      update: vi.fn(() => [{ id: "b" } as Datum]),
      clear: vi.fn(),
      getData: vi.fn(() => [{ x: 1 } as Datum]),
      getScales: vi.fn(() => ({ x: "scaleLinear" })),
    }
    const handle = makeXYHarness(frame).current!

    handle.push({ x: 1 } as Datum)
    expect(frame.push).toHaveBeenCalledWith({ x: 1 })

    handle.pushMany([{ x: 2 } as Datum, { x: 3 } as Datum])
    expect(frame.pushMany).toHaveBeenCalledWith([{ x: 2 }, { x: 3 }])

    expect(handle.remove("a")).toEqual([{ id: "a" }])
    expect(frame.remove).toHaveBeenCalledWith("a")

    const updater = (d: Datum) => ({ ...d, updated: true })
    expect(handle.update("b", updater)).toEqual([{ id: "b" }])
    expect(frame.update).toHaveBeenCalledWith("b", updater)

    handle.clear()
    expect(frame.clear).toHaveBeenCalled()

    expect(handle.getData()).toEqual([{ x: 1 }])
    expect(handle.getScales!()).toEqual({ x: "scaleLinear" })
  })

  it("falls back to safe defaults when the frame ref returns null/undefined", () => {
    const frame: XYFakeFrame = {
      push: vi.fn(),
      pushMany: vi.fn(),
      remove: vi.fn(() => undefined as unknown as Datum[]),
      update: vi.fn(() => undefined as unknown as Datum[]),
      clear: vi.fn(),
      getData: vi.fn(() => undefined as unknown as Datum[]),
      getScales: vi.fn(() => undefined),
    }
    const handle = makeXYHarness(frame).current!
    expect(handle.remove("missing")).toEqual([])
    expect(handle.update("missing", (d) => d)).toEqual([])
    expect(handle.getData()).toEqual([])
    expect(handle.getScales!()).toBeNull()
  })

  it("delegates custom-layout result/failure readback and null-defaults it when absent", () => {
    const layoutResult = { nodes: [{ type: "point", x: 1, y: 2 }] }
    const failure = {
      code: "CUSTOM_LAYOUT_ERROR",
      recovery: "empty-scene",
    }
    const frame = {
      push: vi.fn(),
      pushMany: vi.fn(),
      remove: vi.fn(() => []),
      update: vi.fn(() => []),
      clear: vi.fn(),
      getData: vi.fn(() => []),
      getScales: vi.fn(() => null),
      getCustomLayout: vi.fn(() => layoutResult),
      getLayoutFailure: vi.fn(() => failure),
    }
    const handle = makeXYHarness(frame as XYFakeFrame).current!
    expect(handle.getCustomLayout!()).toBe(layoutResult)
    expect(handle.getLayoutFailure!()).toBe(failure)

    const bare: XYFakeFrame = {
      push: vi.fn(),
      pushMany: vi.fn(),
      remove: vi.fn(() => []),
      update: vi.fn(() => []),
      clear: vi.fn(),
      getData: vi.fn(() => []),
      getScales: vi.fn(() => null),
    }
    expect(makeXYHarness(bare).current!.getCustomLayout!()).toBeNull()
    expect(makeXYHarness(bare).current!.getLayoutFailure!()).toBeNull()
  })

  it("overrides replace specific methods while keeping defaults for the rest", () => {
    const frame: XYFakeFrame = {
      push: vi.fn(),
      pushMany: vi.fn(),
      remove: vi.fn(() => []),
      update: vi.fn(() => []),
      clear: vi.fn(),
      getData: vi.fn(() => []),
      getScales: vi.fn(() => null),
    }
    const customPush = vi.fn()
    const customClear = vi.fn()
    const handle = makeXYHarness(frame, { push: customPush, clear: customClear }).current!

    handle.push({ x: 9 } as Datum)
    expect(customPush).toHaveBeenCalledWith({ x: 9 })
    expect(frame.push).not.toHaveBeenCalled()

    handle.clear()
    expect(customClear).toHaveBeenCalled()
    expect(frame.clear).not.toHaveBeenCalled()

    // Untouched methods still go to the frame.
    handle.pushMany([{ x: 1 } as Datum])
    expect(frame.pushMany).toHaveBeenCalledWith([{ x: 1 }])
  })
})

describe("useFrameImperativeHandle — network variant", () => {
  it("routes remove/update through node ops and walks topology", () => {
    const frame: NetworkFakeFrame = {
      push: vi.fn(),
      pushMany: vi.fn(),
      removeNode: vi.fn(),
      updateNode: vi.fn((id: string) => ({ id, kind: "after" })),
      clear: vi.fn(),
      getTopology: vi.fn(() => ({
        nodes: [
          { id: "a", data: { id: "a", kind: "before" } },
          { id: "b", data: { id: "b", kind: "before" } },
        ],
      })),
    }
    const handle = makeNetworkHarness(frame).current!

    // remove with a single id
    const removed = handle.remove("a")
    expect(removed).toEqual([{ id: "a", kind: "before" }])
    expect(frame.removeNode).toHaveBeenCalledWith("a")

    // remove with an array of ids — both should be looked up in topology
    frame.removeNode.mockClear()
    const batch = handle.remove(["a", "b"])
    expect(batch).toEqual([
      { id: "a", kind: "before" },
      { id: "b", kind: "before" },
    ])
    expect(frame.removeNode).toHaveBeenCalledTimes(2)

    // update flatMaps through updateNode and tags each result with id
    frame.updateNode.mockClear()
    const updater = (d: Datum) => ({ ...d, kind: "after" })
    const updated = handle.update(["a", "b"], updater)
    expect(updated).toEqual([
      { id: "a", kind: "after" },
      { id: "b", kind: "after" },
    ])
    expect(frame.updateNode).toHaveBeenNthCalledWith(1, "a", updater)
    expect(frame.updateNode).toHaveBeenNthCalledWith(2, "b", updater)
  })

  it("returns getData entries as-is, including undefined for nodes without payload", () => {
    const frame: NetworkFakeFrame = {
      push: vi.fn(),
      pushMany: vi.fn(),
      removeNode: vi.fn(),
      updateNode: vi.fn(),
      clear: vi.fn(),
      getTopology: vi.fn(() => ({
        nodes: [
          { id: "with-payload", data: { kind: "real" } as Datum },
          { id: "no-payload" }, // streamed node with no `data` field
        ],
      })),
    }
    const handle = makeNetworkHarness(frame).current!
    // Pre-migration inline shape: payload-less nodes surface as
    // `undefined` entries, NOT `{}`. Locking this in protects
    // consumers that distinguish between the two.
    expect(handle.getData()).toEqual([{ kind: "real" }, undefined])
  })

  it("omits getScales entirely (does not assign () => null)", () => {
    const frame: NetworkFakeFrame = {
      push: vi.fn(),
      pushMany: vi.fn(),
      removeNode: vi.fn(),
      updateNode: vi.fn(),
      clear: vi.fn(),
      getTopology: vi.fn(() => null),
    }
    const handle = makeNetworkHarness(frame).current!
    // The pre-migration inline handles in network HOCs did not have a
    // `getScales` method, and `RealtimeFrameHandle` marks it optional.
    // A `() => null` stub would silently flip presence checks like
    // `typeof handle.getScales === "function"` — assert absence
    // explicitly to prevent that regression.
    expect(handle).not.toHaveProperty("getScales")
  })
})

describe("useFrameImperativeHandle — geo-points variant", () => {
  it("routes remove through removePoint and emulates update via remove + push", () => {
    const removed = [{ id: "a", lon: 0, lat: 0, value: 1 } as Datum]
    const frame: GeoFakeFrame = {
      push: vi.fn(),
      pushMany: vi.fn(),
      removePoint: vi.fn(() => removed),
      clear: vi.fn(),
      getData: vi.fn(() => []),
    }
    const handle = makeGeoHarness(frame).current!

    expect(handle.remove("a")).toEqual(removed)
    expect(frame.removePoint).toHaveBeenCalledWith("a")

    const updater = (d: Datum) => ({ ...d, value: 2 })
    const result = handle.update("a", updater)
    // Update returns the OLD rows the helper removed, matching the
    // pre-migration inline behavior in ProportionalSymbolMap.
    expect(result).toEqual(removed)
    // Push was called with the updater applied to each removed row.
    expect(frame.push).toHaveBeenCalledWith({ id: "a", lon: 0, lat: 0, value: 2 })
  })

  it("omits getScales entirely (does not assign () => null)", () => {
    const frame: GeoFakeFrame = {
      push: vi.fn(),
      pushMany: vi.fn(),
      removePoint: vi.fn(),
      clear: vi.fn(),
      getData: vi.fn(() => []),
    }
    const handle = makeGeoHarness(frame).current!
    expect(handle).not.toHaveProperty("getScales")
  })
})
