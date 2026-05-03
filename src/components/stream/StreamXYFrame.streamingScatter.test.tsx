/**
 * Regression coverage for `runtimeMode="streaming"` with non-temporal
 * `xAccessor`/`yAccessor`.
 *
 * `StreamXYFrame.pipelineConfig` used to strip `xAccessor` and
 * `yAccessor` to `undefined` whenever `isStreaming` was true, on the
 * assumption that streaming charts always wanted a temporal axis.
 * That broke streaming scatter / bubble: the page could pass
 * `xAccessor="x"` + `yAccessor="y"` and push `{ x, y }` shaped data,
 * but the store's streaming-mode resolution chain
 * (`timeAccessor || xAccessor || "time"`) saw both stripped fields
 * and fell through to reading `d.time` / `d.value`. With no `value`
 * field on the pushed data, every Y read returned `NaN`,
 * `buildPointNode` rejected each datum, and the scatter rendered
 * empty even though the buffer held 200 datums (and the marginal
 * graphics, which read `x`/`y` directly, kept updating).
 *
 * Reported on `/cookbook/marginal-graphics` Streaming Marginal
 * Graphics example.
 *
 * The fix forwards `xAccessor`/`yAccessor` through `pipelineConfig`
 * even when streaming. The store's resolution chain still gives
 * `timeAccessor` priority for bar/swarm/waterfall, so non-scatter
 * streaming charts behave identically. This test pins both halves of
 * the contract.
 */
import * as React from "react"
import { render, act } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import StreamXYFrame from "./StreamXYFrame"
import type { StreamXYFrameHandle } from "./types"

describe("StreamXYFrame streaming scatter with x/y accessors", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("renders scene points when runtimeMode='streaming' + xAccessor='x' + yAccessor='y'", async () => {
    const captured: { handle: StreamXYFrameHandle | null } = { handle: null }
    const setRef = (h: StreamXYFrameHandle | null) => { if (h) captured.handle = h }
    await act(async () => {
      render(
        <StreamXYFrame
          ref={setRef as unknown as React.Ref<StreamXYFrameHandle>}
          chartType="scatter"
          runtimeMode="streaming"
          xAccessor="x"
          yAccessor="y"
          size={[400, 300]}
        />,
      )
    })

    const handle = captured.handle as unknown as { push: (d: unknown) => void; pushMany: (d: unknown[]) => void; getData: () => unknown[]; getScales: () => { x?: { domain: () => [number, number] } } | null }
    expect(handle).toBeTruthy()

    await act(async () => {
      handle.pushMany([
        { time: 0, x: 10, y: 20 },
        { time: 1, x: 30, y: 50 },
        { time: 2, x: 50, y: 80 },
        { time: 3, x: 70, y: 110 },
      ])
    })
    await act(async () => { await new Promise((r) => setTimeout(r, 30)) })

    const data = handle.getData()
    expect(data.length).toBe(4)

    // The X domain must reflect the `x` field range, not the `time`
    // index. A regression that re-introduces the strip would produce
    // an X domain of [0, 3] (time indices) instead of something
    // bracketing [10, 70].
    const scales = handle.getScales()
    const xDomain = scales?.x?.domain()
    expect(xDomain).toBeDefined()
    expect((xDomain as [number, number])[0]).toBeLessThanOrEqual(10)
    expect((xDomain as [number, number])[1]).toBeGreaterThanOrEqual(70)
  })

  it("still treats `time` as the X axis when neither xAccessor nor yAccessor is supplied (default streaming behavior)", async () => {
    // Bar/swarm/waterfall + plain `runtimeMode='streaming'` consumers
    // who push `{ time, value }` shaped data must keep reading time
    // for the X axis. The library fix preserves user-supplied
    // accessors but doesn't change the fallback chain, so this stays
    // working.
    const captured: { handle: StreamXYFrameHandle | null } = { handle: null }
    const setRef = (h: StreamXYFrameHandle | null) => { if (h) captured.handle = h }
    await act(async () => {
      render(
        <StreamXYFrame
          ref={setRef as unknown as React.Ref<StreamXYFrameHandle>}
          chartType="scatter"
          runtimeMode="streaming"
          size={[400, 300]}
        />,
      )
    })

    const handle = captured.handle as unknown as { pushMany: (d: unknown[]) => void; getData: () => unknown[]; getScales: () => { x?: { domain: () => [number, number] } } | null }
    expect(handle).toBeTruthy()
    await act(async () => {
      handle.pushMany([
        { time: 0, value: 10 },
        { time: 1, value: 20 },
        { time: 2, value: 30 },
      ])
    })
    await act(async () => { await new Promise((r) => setTimeout(r, 30)) })

    const xDomain = handle.getScales()?.x?.domain()
    expect((xDomain as [number, number])[0]).toBeLessThanOrEqual(0)
    expect((xDomain as [number, number])[1]).toBeGreaterThanOrEqual(2)
  })
})
