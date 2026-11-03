import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import {
  LinkedCrosshairProvider,
  useCrosshairActions,
  useCrosshairPosition
} from "./LinkedCrosshairStore"

function renderCrosshair(name: string | undefined) {
  return renderHook(
    () => ({
      position: useCrosshairPosition(name),
      ...useCrosshairActions()
    }),
    { wrapper: LinkedCrosshairProvider }
  )
}

describe("LinkedCrosshairStore", () => {
  const NAME = "test-crosshair"

  describe("setCrosshairPosition / clearCrosshairPosition", () => {
    it("sets and reads a position via hook", () => {
      const { result } = renderCrosshair(NAME)
      expect(result.current.position).toBeNull()

      act(() => result.current.setCrosshairPosition(NAME, 42, "chart-a"))
      expect(result.current.position).toEqual({
        xValue: 42,
        sourceId: "chart-a"
      })
    })

    it("clears the position", () => {
      const { result } = renderCrosshair(NAME)
      act(() => result.current.setCrosshairPosition(NAME, 42, "chart-a"))
      expect(result.current.position).not.toBeNull()

      act(() => result.current.clearCrosshairPosition(NAME, "chart-a"))
      expect(result.current.position).toBeNull()
    })

    it("only clears if sourceId matches", () => {
      const { result } = renderCrosshair(NAME)
      act(() => result.current.setCrosshairPosition(NAME, 42, "chart-a"))

      act(() => result.current.clearCrosshairPosition(NAME, "chart-b"))
      // Should NOT be cleared — different sourceId
      expect(result.current.position).toEqual({
        xValue: 42,
        sourceId: "chart-a"
      })
    })
  })

  describe("toggleCrosshairLock", () => {
    it("locks the crosshair on first click", () => {
      const { result } = renderCrosshair(NAME)
      act(() => result.current.setCrosshairPosition(NAME, 42, "chart-a"))

      let locked: boolean
      act(() => {
        locked = result.current.toggleCrosshairLock(NAME, 42, "chart-a")
      })
      expect(locked!).toBe(true)
      expect(result.current.position).toEqual({
        xValue: 42,
        sourceId: "chart-a",
        locked: true
      })
    })

    it("unlocks and clears on second click", () => {
      const { result } = renderCrosshair(NAME)
      act(() => result.current.setCrosshairPosition(NAME, 42, "chart-a"))
      act(() => {
        result.current.toggleCrosshairLock(NAME, 42, "chart-a")
      })

      let locked: boolean
      act(() => {
        locked = result.current.toggleCrosshairLock(NAME, 42, "chart-a")
      })
      expect(locked!).toBe(false)
      expect(result.current.position).toBeNull()
    })

    it("locks even without a prior setCrosshairPosition", () => {
      const { result } = renderCrosshair(NAME)
      expect(result.current.position).toBeNull()

      act(() => {
        result.current.toggleCrosshairLock(NAME, 99, "chart-a")
      })
      expect(result.current.position).toEqual({
        xValue: 99,
        sourceId: "chart-a",
        locked: true
      })
    })
  })

  describe("locked state blocks hover updates", () => {
    it("setCrosshairPosition is a no-op when locked", () => {
      const { result } = renderCrosshair(NAME)
      act(() => {
        result.current.toggleCrosshairLock(NAME, 42, "chart-a")
      })
      expect(result.current.position?.xValue).toBe(42)

      // Try to move the crosshair via hover — should be ignored
      act(() => result.current.setCrosshairPosition(NAME, 99, "chart-b"))
      expect(result.current.position?.xValue).toBe(42)
    })

    it("clearCrosshairPosition is a no-op when locked", () => {
      const { result } = renderCrosshair(NAME)
      act(() => {
        result.current.toggleCrosshairLock(NAME, 42, "chart-a")
      })

      // Try to clear via hover-end — should be ignored
      act(() => result.current.clearCrosshairPosition(NAME, "chart-a"))
      expect(result.current.position).not.toBeNull()
      expect(result.current.position?.locked).toBe(true)
    })
  })

  describe("unlockCrosshair", () => {
    it("force-unlocks a locked crosshair", () => {
      const { result } = renderCrosshair(NAME)
      act(() => {
        result.current.toggleCrosshairLock(NAME, 42, "chart-a")
      })
      expect(result.current.position?.locked).toBe(true)

      act(() => result.current.unlockCrosshair(NAME))
      expect(result.current.position).toBeNull()
    })

    it("is a no-op when not locked", () => {
      const { result } = renderCrosshair(NAME)
      act(() => result.current.setCrosshairPosition(NAME, 42, "chart-a"))

      act(() => result.current.unlockCrosshair(NAME))
      // Should still be there — it wasn't locked
      expect(result.current.position).toEqual({
        xValue: 42,
        sourceId: "chart-a"
      })
    })
  })

  describe("useCrosshairPosition with undefined name", () => {
    it("returns null and does not subscribe", () => {
      const { result } = renderCrosshair(undefined)
      expect(result.current.position).toBeNull()
    })
  })
})
