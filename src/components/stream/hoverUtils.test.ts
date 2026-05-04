import { describe, it, expect } from "vitest"
import { buildHoverData } from "./hoverUtils"

describe("buildHoverData", () => {
  it("builds HoverData with raw datum + pixel coordinates", () => {
    const datum = { category: "A", value: 10 }
    const hover = buildHoverData(datum, 100, 200)
    expect(hover.data).toBe(datum)
    expect(hover.x).toBe(100)
    expect(hover.y).toBe(200)
    expect(hover.__semioticHoverData).toBe(true)
  })

  it("does NOT flatten datum fields onto the hover root", () => {
    // Historical v2 behavior spread the datum onto HoverData itself
    // so consumers could write `d.fieldName`. That shim was removed
    // alongside the `time`/`value` pixel-coordinate aliases — every
    // consumer reads through `hover.data.fieldName` now. This test
    // pins the contract so a future "convenience" change can't
    // re-introduce the leak.
    const hover = buildHoverData({ category: "A", value: 10 }, 100, 200) as Record<string, unknown>
    expect(hover.category).toBeUndefined()
    expect(hover.value).toBeUndefined()
  })

  it("applies extra properties without copying datum fields", () => {
    const hover = buildHoverData({ id: "n1" }, 50, 60, { nodeOrEdge: "node" })
    expect(hover.nodeOrEdge).toBe("node")
    expect(hover.data?.id).toBe("n1")
  })

  it("preserves array-shaped datums via the `data` field", () => {
    const arr = [{ x: 1 }, { x: 2 }]
    const hover = buildHoverData(arr, 10, 20)
    expect(hover.data).toBe(arr)
  })

  it("handles null datum", () => {
    const hover = buildHoverData(null, 0, 0)
    expect(hover.data).toBeNull()
    expect(hover.x).toBe(0)
    expect(hover.y).toBe(0)
  })
})
