import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  UpdateResultTracker,
  type UpdateResultStore
} from "./pipelineUpdateContract"
import { useUpdateResultSnapshot } from "./useUpdateResultSnapshot"

describe("useUpdateResultSnapshot", () => {
  it("reads the current snapshot and follows additive store updates", () => {
    const tracker = new UpdateResultTracker()
    const store: UpdateResultStore = {
      getUpdateSnapshot: () => tracker.last,
      subscribeUpdateResult: (listener) => tracker.subscribe(listener)
    }
    const { result } = renderHook(() => useUpdateResultSnapshot(store))
    const initial = result.current
    let updated = initial

    act(() => {
      updated = tracker.record({ kind: "update", count: 1 }, ["data"])
    })

    expect(result.current).toBe(updated)
    expect(result.current).not.toBe(initial)
  })
})
