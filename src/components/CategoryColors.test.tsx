import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import * as React from "react"
import { CategoryColorProvider, useCategoryColors } from "./CategoryColors"
import { COLOR_SCHEMES, DEFAULT_COLORS } from "./charts/shared/colorUtils"

function createWrapper(providerProps: React.ComponentProps<typeof CategoryColorProvider>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(CategoryColorProvider, providerProps, children)
  }
}

// ── useCategoryColors without provider ────────────────────────────────────

describe("useCategoryColors without provider", () => {
  it("returns null when no CategoryColorProvider is present", () => {
    const { result } = renderHook(() => useCategoryColors())
    expect(result.current).toBeNull()
  })
})

// ── CategoryColorProvider with explicit colors ───────────────────────────

describe("CategoryColorProvider with explicit colors", () => {
  it("provides the exact color map passed via the colors prop", () => {
    const colors = { North: "#e41a1c", South: "#377eb8", East: "#4daf4a" }
    const { result } = renderHook(() => useCategoryColors(), {
      wrapper: createWrapper({ colors, children: null }),
    })
    expect(result.current).toEqual(colors)
  })

})

// ── CategoryColorProvider with categories (auto-assignment) ──────────────

describe("CategoryColorProvider with categories", () => {
  it("assigns colors from default category10 scheme", () => {
    const categories = ["A", "B", "C"]
    const { result } = renderHook(() => useCategoryColors(), {
      wrapper: createWrapper({ categories, children: null }),
    })
    expect(result.current).not.toBeNull()
    const map = result.current!
    expect(Object.keys(map)).toEqual(categories)
    // Should use category10 colors
    const expected = COLOR_SCHEMES.category10 as readonly string[]
    expect(map["A"]).toBe(expected[0])
    expect(map["B"]).toBe(expected[1])
    expect(map["C"]).toBe(expected[2])
  })

  it("wraps around when more categories than palette colors", () => {
    // category10 has 10 colors; create 12 categories
    const categories = Array.from({ length: 12 }, (_, i) => `cat${i}`)
    const { result } = renderHook(() => useCategoryColors(), {
      wrapper: createWrapper({ categories, children: null }),
    })
    const map = result.current!
    const palette = COLOR_SCHEMES.category10 as readonly string[]
    // Index 10 should wrap to index 0
    expect(map["cat10"]).toBe(palette[0])
    expect(map["cat11"]).toBe(palette[1])
  })

  it("uses a custom color scheme name", () => {
    const categories = ["X", "Y"]
    const { result } = renderHook(() => useCategoryColors(), {
      wrapper: createWrapper({ categories, colorScheme: "tableau10", children: null }),
    })
    const map = result.current!
    const palette = COLOR_SCHEMES.tableau10 as readonly string[]
    expect(map["X"]).toBe(palette[0])
    expect(map["Y"]).toBe(palette[1])
  })

  it("uses a custom color array as scheme", () => {
    const customPalette = ["#ff0000", "#00ff00", "#0000ff"]
    const categories = ["R", "G", "B"]
    const { result } = renderHook(() => useCategoryColors(), {
      wrapper: createWrapper({ categories, colorScheme: customPalette, children: null }),
    })
    const map = result.current!
    expect(map["R"]).toBe("#ff0000")
    expect(map["G"]).toBe("#00ff00")
    expect(map["B"]).toBe("#0000ff")
  })

  it("handles empty categories array", () => {
    const { result } = renderHook(() => useCategoryColors(), {
      wrapper: createWrapper({ categories: [], children: null }),
    })
    expect(result.current).toEqual({})
  })

})

// ── CategoryColorProvider with no props ──────────────────────────────────

describe("CategoryColorProvider with neither colors nor categories", () => {
  it("provides an empty map", () => {
    const { result } = renderHook(() => useCategoryColors(), {
      wrapper: createWrapper({ children: null }),
    })
    expect(result.current).toEqual({})
  })
})

// ── CategoryColorProvider falls back to DEFAULT_COLORS for unknown scheme ─

describe("CategoryColorProvider with unknown scheme name", () => {
  it("falls back to DEFAULT_COLORS for unrecognized scheme string", () => {
    const categories = ["A", "B"]
    const { result } = renderHook(() => useCategoryColors(), {
      wrapper: createWrapper({
        categories,
        colorScheme: "nonexistent_scheme" as any,
        children: null,
      }),
    })
    const map = result.current!
    // Should fall back to DEFAULT_COLORS
    expect(map["A"]).toBe(DEFAULT_COLORS[0])
    expect(map["B"]).toBe(DEFAULT_COLORS[1])
  })
})
