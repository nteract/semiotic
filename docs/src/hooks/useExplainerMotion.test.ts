import { act, renderHook } from "@testing-library/react"
import { vi } from "vitest"
import useExplainerMotion from "./useExplainerMotion"

describe("useExplainerMotion", () => {
  it("combines the system preference with a reader override", () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia

    try {
      const { result } = renderHook(() => useExplainerMotion())
      expect(result.current.reducedMotion).toBe(false)

      act(() => result.current.toggleReaderReducedMotion())
      expect(result.current.readerReducedMotion).toBe(true)
      expect(result.current.reducedMotion).toBe(true)
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })
})
