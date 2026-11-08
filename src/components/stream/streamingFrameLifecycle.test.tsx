import * as React from "react"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import StreamXYFrame from "./StreamXYFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import { DataSourceAdapter } from "./DataSourceAdapter"
import { PipelineStore } from "./PipelineStore"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { StreamXYFrameHandle } from "./types"
import type { StreamOrdinalFrameHandle } from "./ordinalTypes"
import { setupCanvasMock } from "../../test-utils/canvasMock"

describe.each(["xy", "ordinal"] as const)("%s streaming effect lifecycle", (family) => {
  let restoreCanvas: () => void
  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => {
    restoreCanvas()
    vi.restoreAllMocks()
  })

  const rows = [{ x: 1, y: 10, category: "A", value: 10 }]

  it("retains queued parent pushes through Strict Mode replay", async () => {
    const xy = React.createRef<StreamXYFrameHandle>()
    const ordinal = React.createRef<StreamOrdinalFrameHandle>()
    const ref = family === "xy" ? xy : ordinal
    function SeededFrame() {
      const seeded = React.useRef(false)
      React.useLayoutEffect(() => {
        if (seeded.current) return
        seeded.current = true
        ref.current!.pushMany(rows)
      }, [])
      return family === "xy"
        ? <StreamXYFrame ref={xy} chartType="line" />
        : <StreamOrdinalFrame ref={ordinal} chartType="bar" />
    }
    render(<React.StrictMode><SeededFrame /></React.StrictMode>)
    await act(async () => { await Promise.resolve() })
    expect(ref.current!.getData()).toEqual(rows)
  })

  it("cancels pending ingestion on real unmount", async () => {
    const xy = React.createRef<StreamXYFrameHandle>()
    const ordinal = React.createRef<StreamOrdinalFrameHandle>()
    const ref = family === "xy" ? xy : ordinal
    const view = render(family === "xy"
      ? <StreamXYFrame ref={xy} chartType="line" />
      : <StreamOrdinalFrame ref={ordinal} chartType="bar" />)
    const flush = vi.spyOn(DataSourceAdapter.prototype, "flush")
    const ingest = family === "xy"
      ? vi.spyOn(PipelineStore.prototype, "ingest")
      : vi.spyOn(OrdinalPipelineStore.prototype, "ingest")
    act(() => ref.current!.pushMany(rows))
    view.unmount()
    await Promise.resolve()
    expect(flush).not.toHaveBeenCalled()
    expect(ingest).not.toHaveBeenCalled()
  })
})
