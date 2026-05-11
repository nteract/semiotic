import { describe, it, expect } from "vitest"
import React from "react"
import { renderHook, act } from "@testing-library/react"
import { useEncodingDomain } from "./useEncodingDomain"
import { TooltipProvider } from "../../store/TooltipStore"

const wrapper = ({ children }: { children: React.ReactNode }) =>
  <TooltipProvider>{children}</TooltipProvider>

describe("useEncodingDomain", () => {
  describe("bounded mode", () => {
    it("derives [min, max] from data via the string accessor", () => {
      const data = [{ size: 1 }, { size: 5 }, { size: 3 }, { size: 8 }]
      const { result } = renderHook(
        () => useEncodingDomain({ accessor: "size", data, isPushMode: false }),
        { wrapper },
      )
      expect(result.current.domain).toEqual([1, 8])
    })

    it("derives [min, max] via a function accessor", () => {
      const data = [{ a: 2 }, { a: 7 }, { a: 4 }]
      const { result } = renderHook(
        () => useEncodingDomain<any>({ accessor: (d: any) => d.a * 10, data, isPushMode: false }),
        { wrapper },
      )
      expect(result.current.domain).toEqual([20, 70])
    })

    it("returns undefined when data is empty", () => {
      const { result } = renderHook(
        () => useEncodingDomain({ accessor: "size", data: [], isPushMode: false }),
        { wrapper },
      )
      expect(result.current.domain).toBeUndefined()
    })

    it("returns undefined when no accessor is provided", () => {
      const { result } = renderHook(
        () => useEncodingDomain({ accessor: undefined, data: [{ a: 1 }], isPushMode: false }),
        { wrapper },
      )
      expect(result.current.domain).toBeUndefined()
    })

    it("ignores non-finite / nullish values", () => {
      const data = [{ x: 1 }, { x: NaN }, { x: null as any }, { x: 5 }, { x: Infinity }]
      const { result } = renderHook(
        () => useEncodingDomain({ accessor: "x", data, isPushMode: false }),
        { wrapper },
      )
      expect(result.current.domain).toEqual([1, 5])
    })
  })

  describe("push mode", () => {
    it("starts with undefined domain", () => {
      const { result } = renderHook(
        () => useEncodingDomain({ accessor: "size", data: [], isPushMode: true }),
        { wrapper },
      )
      expect(result.current.domain).toBeUndefined()
    })

    it("trackPushed updates the running domain", () => {
      const { result } = renderHook(
        () => useEncodingDomain({ accessor: "size", data: [], isPushMode: true }),
        { wrapper },
      )
      act(() => {
        result.current.trackPushed([{ size: 3 }, { size: 8 }, { size: 1 }])
      })
      expect(result.current.domain).toEqual([1, 8])
      // Tracking values within the existing min/max should not extend it.
      act(() => {
        result.current.trackPushed([{ size: 4 }, { size: 6 }])
      })
      expect(result.current.domain).toEqual([1, 8])
      // Tracking a new max extends it.
      act(() => {
        result.current.trackPushed([{ size: 20 }])
      })
      expect(result.current.domain).toEqual([1, 20])
    })

    it("reset clears the running domain", () => {
      const { result } = renderHook(
        () => useEncodingDomain({ accessor: "size", data: [], isPushMode: true }),
        { wrapper },
      )
      act(() => {
        result.current.trackPushed([{ size: 3 }, { size: 7 }])
      })
      expect(result.current.domain).toEqual([3, 7])
      act(() => {
        result.current.reset()
      })
      expect(result.current.domain).toBeUndefined()
    })

    it("trackPushed is a no-op when accessor is undefined", () => {
      const { result } = renderHook(
        () => useEncodingDomain({ accessor: undefined, data: [], isPushMode: true }),
        { wrapper },
      )
      act(() => {
        result.current.trackPushed([{ size: 3 }, { size: 7 }])
      })
      expect(result.current.domain).toBeUndefined()
    })

    it("ignores the bounded data array in push mode", () => {
      // If push mode reads `data`, an explicitly empty data + non-empty
      // push would mix incorrectly. Verify the hook only reads pushes.
      const { result, rerender } = renderHook(
        ({ data }) => useEncodingDomain({ accessor: "size", data, isPushMode: true }),
        { wrapper, initialProps: { data: [{ size: 100 }] } },
      )
      // Initial render — pushed nothing → undefined despite bounded data
      expect(result.current.domain).toBeUndefined()
      act(() => {
        result.current.trackPushed([{ size: 3 }])
      })
      // Tracked value alone defines the domain.
      expect(result.current.domain).toEqual([3, 3])
      rerender({ data: [{ size: 9999 }] }) // bounded data churn shouldn't matter
      expect(result.current.domain).toEqual([3, 3])
    })
  })
})
