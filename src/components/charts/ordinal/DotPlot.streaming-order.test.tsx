import { describe, it, expect, beforeEach, afterEach } from "vitest"
import React from "react"
import { render, act } from "@testing-library/react"
import { DotPlot } from "./DotPlot"
import { TooltipProvider } from "../../store/TooltipStore"
import { setupCanvasMock } from "../../../test-utils/canvasMock"

// Mock ResizeObserver for jsdom
if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as unknown).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// End-to-end test (real StreamOrdinalFrame) for DotPlot's default
// `sort="auto"` behavior: insertion order while streaming, value-desc
// when static. The sibling DotPlot.test.tsx mocks the frame and can
// only inspect props — it can't verify the scene actually renders in
// the expected order.

describe("DotPlot streaming category order", () => {
  let cleanup: () => void
  beforeEach(() => { cleanup = setupCanvasMock() })
  afterEach(() => { cleanup() })

  it("default sort='auto' preserves insertion order under streaming", async () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <DotPlot ref={ref} categoryAccessor="category" valueAccessor="value" />
      </TooltipProvider>
    )

    // Push categories in the order C → A → B — if the store value-sorted
    // (the pre-"auto" default of `sort=true`), the domain would come
    // out ["B", "A", "C"]. "auto" under streaming should preserve FIFO.
    await act(async () => {
      ref.current.push({ category: "C", value: 10 })
    })
    await act(async () => {
      ref.current.push({ category: "A", value: 30 })
    })
    await act(async () => {
      ref.current.push({ category: "B", value: 20 })
    })

    const domain = ref.current.getScales()?.o.domain()
    expect(domain).toEqual(["C", "A", "B"])
  })

  it("default sort='auto' falls through to value-desc on static data", () => {
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <DotPlot
          ref={ref}
          data={[
            { category: "Small", value: 1 },
            { category: "Big", value: 100 },
            { category: "Medium", value: 50 },
          ]}
          categoryAccessor="category"
          valueAccessor="value"
        />
      </TooltipProvider>
    )
    // No push — purely static data. sort="auto" should behave like the
    // old default of sort=true: value-descending.
    const domain = ref.current.getScales()?.o.domain()
    expect(domain).toEqual(["Big", "Medium", "Small"])
  })

  it("explicit sort='desc' wins over auto even during streaming", async () => {
    // Regression guard: users who opt into value-sort during streaming
    // (e.g. "I want this to always value-sort, shuffle be damned") must
    // get that behavior. "auto" applies only when sort is unset or
    // explicitly "auto".
    const ref = React.createRef<any>()
    render(
      <TooltipProvider>
        <DotPlot
          ref={ref}
          categoryAccessor="category"
          valueAccessor="value"
          sort="desc"
        />
      </TooltipProvider>
    )
    await act(async () => { ref.current.push({ category: "Low", value: 10 }) })
    await act(async () => { ref.current.push({ category: "High", value: 100 }) })
    await act(async () => { ref.current.push({ category: "Mid", value: 50 }) })

    const domain = ref.current.getScales()?.o.domain()
    expect(domain).toEqual(["High", "Mid", "Low"])
  })
})
