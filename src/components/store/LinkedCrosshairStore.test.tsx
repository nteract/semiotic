import React from "react"
import { describe, it, expect, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import {
  setCrosshairPosition,
  clearCrosshairPosition,
  toggleCrosshairLock,
  unlockCrosshair,
  useCrosshairPosition,
} from "./LinkedCrosshairStore"

// Reset state between tests by unlocking + clearing any leftover positions
function resetStore(name: string) {
  unlockCrosshair(name)
  // Force-clear by setting then clearing with same sourceId
  setCrosshairPosition(name, 0, "__reset__")
  clearCrosshairPosition(name, "__reset__")
}

describe("LinkedCrosshairStore", () => {
  const NAME = "test-crosshair"

  beforeEach(() => {
    resetStore(NAME)
  })

  describe("setCrosshairPosition / clearCrosshairPosition", () => {
    it("sets and reads a position via hook", () => {
      const { result } = renderHook(() => useCrosshairPosition(NAME))
      expect(result.current).toBeNull()

      act(() => setCrosshairPosition(NAME, 42, "chart-a"))
      expect(result.current).toEqual({ xValue: 42, sourceId: "chart-a" })
    })

    it("clears the position", () => {
      const { result } = renderHook(() => useCrosshairPosition(NAME))
      act(() => setCrosshairPosition(NAME, 42, "chart-a"))
      expect(result.current).not.toBeNull()

      act(() => clearCrosshairPosition(NAME, "chart-a"))
      expect(result.current).toBeNull()
    })

    it("only clears if sourceId matches", () => {
      const { result } = renderHook(() => useCrosshairPosition(NAME))
      act(() => setCrosshairPosition(NAME, 42, "chart-a"))

      act(() => clearCrosshairPosition(NAME, "chart-b"))
      // Should NOT be cleared — different sourceId
      expect(result.current).toEqual({ xValue: 42, sourceId: "chart-a" })
    })
  })

  describe("toggleCrosshairLock", () => {
    it("locks the crosshair on first click", () => {
      const { result } = renderHook(() => useCrosshairPosition(NAME))
      act(() => setCrosshairPosition(NAME, 42, "chart-a"))

      let locked: boolean
      act(() => { locked = toggleCrosshairLock(NAME, 42, "chart-a") })
      expect(locked!).toBe(true)
      expect(result.current).toEqual({ xValue: 42, sourceId: "chart-a", locked: true })
    })

    it("unlocks and clears on second click", () => {
      const { result } = renderHook(() => useCrosshairPosition(NAME))
      act(() => setCrosshairPosition(NAME, 42, "chart-a"))
      act(() => { toggleCrosshairLock(NAME, 42, "chart-a") })

      let locked: boolean
      act(() => { locked = toggleCrosshairLock(NAME, 42, "chart-a") })
      expect(locked!).toBe(false)
      expect(result.current).toBeNull()
    })

    it("locks even without a prior setCrosshairPosition", () => {
      const { result } = renderHook(() => useCrosshairPosition(NAME))
      expect(result.current).toBeNull()

      act(() => { toggleCrosshairLock(NAME, 99, "chart-a") })
      expect(result.current).toEqual({ xValue: 99, sourceId: "chart-a", locked: true })
    })
  })

  describe("locked state blocks hover updates", () => {
    it("setCrosshairPosition is a no-op when locked", () => {
      const { result } = renderHook(() => useCrosshairPosition(NAME))
      act(() => { toggleCrosshairLock(NAME, 42, "chart-a") })
      expect(result.current?.xValue).toBe(42)

      // Try to move the crosshair via hover — should be ignored
      act(() => setCrosshairPosition(NAME, 99, "chart-b"))
      expect(result.current?.xValue).toBe(42)
    })

    it("clearCrosshairPosition is a no-op when locked", () => {
      const { result } = renderHook(() => useCrosshairPosition(NAME))
      act(() => { toggleCrosshairLock(NAME, 42, "chart-a") })

      // Try to clear via hover-end — should be ignored
      act(() => clearCrosshairPosition(NAME, "chart-a"))
      expect(result.current).not.toBeNull()
      expect(result.current?.locked).toBe(true)
    })
  })

  describe("unlockCrosshair", () => {
    it("force-unlocks a locked crosshair", () => {
      const { result } = renderHook(() => useCrosshairPosition(NAME))
      act(() => { toggleCrosshairLock(NAME, 42, "chart-a") })
      expect(result.current?.locked).toBe(true)

      act(() => unlockCrosshair(NAME))
      expect(result.current).toBeNull()
    })

    it("is a no-op when not locked", () => {
      const { result } = renderHook(() => useCrosshairPosition(NAME))
      act(() => setCrosshairPosition(NAME, 42, "chart-a"))

      act(() => unlockCrosshair(NAME))
      // Should still be there — it wasn't locked
      expect(result.current).toEqual({ xValue: 42, sourceId: "chart-a" })
    })
  })

  describe("useCrosshairPosition with undefined name", () => {
    it("returns null and does not subscribe", () => {
      const { result } = renderHook(() => useCrosshairPosition(undefined))
      expect(result.current).toBeNull()
    })
  })
})
