import { describe, expect, it } from "vitest"
import { needsDataCanvasPaint, needsInteractionCanvasPaint } from "./paintNeeds"

describe("paintNeeds", () => {
  it("needsDataCanvasPaint is false when everything is idle", () => {
    expect(
      needsDataCanvasPaint({
        dirtyOrRebuilt: false,
        transitioning: false
      })
    ).toBe(false)
  })

  it("needsDataCanvasPaint is true for dirty, transition, continuous, encoding", () => {
    expect(needsDataCanvasPaint({ dirtyOrRebuilt: true, transitioning: false })).toBe(true)
    expect(needsDataCanvasPaint({ dirtyOrRebuilt: false, transitioning: true })).toBe(true)
    expect(
      needsDataCanvasPaint({
        dirtyOrRebuilt: false,
        transitioning: false,
        continuous: true
      })
    ).toBe(true)
    expect(
      needsDataCanvasPaint({
        dirtyOrRebuilt: false,
        transitioning: false,
        liveEncoding: true
      })
    ).toBe(true)
    expect(
      needsDataCanvasPaint({
        dirtyOrRebuilt: false,
        transitioning: false,
        forced: true
      })
    ).toBe(true)
  })

  it("needsInteractionCanvasPaint clears once after hover ends", () => {
    expect(needsInteractionCanvasPaint(true, false)).toBe(true)
    expect(needsInteractionCanvasPaint(false, true)).toBe(true)
    expect(needsInteractionCanvasPaint(false, false)).toBe(false)
  })
})
