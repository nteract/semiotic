import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useSemanticFrameInteractions } from "./useSemanticFrameInteractions"

describe("useSemanticFrameInteractions", () => {
  it("returns undefined hover/click wrappers when nothing is wired", () => {
    const { result } = renderHook(() =>
      useSemanticFrameInteractions({ chartType: "StreamOrdinalFrame" })
    )
    expect(result.current.customHoverBehavior).toBeUndefined()
    expect(result.current.customClickBehavior).toBeUndefined()
    expect(result.current.hasClickBehavior).toBe(false)
  })

  it("returns wrappers when onObservation is set (for emission only)", () => {
    const onObservation = vi.fn()
    const { result } = renderHook(() =>
      useSemanticFrameInteractions({
        chartType: "StreamOrdinalFrame",
        onObservation,
      })
    )
    expect(result.current.customHoverBehavior).toEqual(expect.any(Function))
    expect(result.current.customClickBehavior).toEqual(expect.any(Function))
    expect(result.current.hasClickBehavior).toBe(true)

    result.current.customHoverBehavior?.({
      data: { id: 1 },
      x: 10,
      y: 20,
    })
    expect(onObservation).toHaveBeenCalledWith(
      expect.objectContaining({ type: "hover", chartType: "StreamOrdinalFrame" })
    )
  })

  it("returns wrappers when a user customHoverBehavior is provided", () => {
    const userHover = vi.fn()
    const { result } = renderHook(() =>
      useSemanticFrameInteractions({
        chartType: "StreamOrdinalFrame",
        customHoverBehavior: userHover,
      })
    )
    expect(result.current.customHoverBehavior).toEqual(expect.any(Function))
    result.current.customHoverBehavior?.({ data: { a: 1 }, x: 0, y: 0 })
    expect(userHover).toHaveBeenCalled()
  })
})
