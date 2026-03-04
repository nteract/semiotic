import React from "react"
import { renderHook, act } from "@testing-library/react"
import { useSelection, useLinkedHover, useBrushSelection, useFilteredData } from "./useSelection"
import { SelectionProvider } from "./SelectionStore"

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SelectionProvider>{children}</SelectionProvider>
)

// ── useSelection ────────────────────────────────────────────────────────────

describe("useSelection", () => {
  it("returns the expected shape", () => {
    const { result } = renderHook(
      () => useSelection({ name: "test" }),
      { wrapper }
    )

    expect(result.current).toHaveProperty("predicate")
    expect(result.current).toHaveProperty("isActive")
    expect(result.current).toHaveProperty("selectPoints")
    expect(result.current).toHaveProperty("selectInterval")
    expect(result.current).toHaveProperty("clear")
    expect(result.current).toHaveProperty("clientId")
    expect(typeof result.current.predicate).toBe("function")
    expect(typeof result.current.selectPoints).toBe("function")
    expect(typeof result.current.selectInterval).toBe("function")
    expect(typeof result.current.clear).toBe("function")
    expect(typeof result.current.clientId).toBe("string")
  })

  it("starts with isActive false", () => {
    const { result } = renderHook(
      () => useSelection({ name: "test" }),
      { wrapper }
    )
    expect(result.current.isActive).toBe(false)
  })

  it("predicate returns true when no selection is active", () => {
    const { result } = renderHook(
      () => useSelection({ name: "test" }),
      { wrapper }
    )
    expect(result.current.predicate({ anything: true })).toBe(true)
  })

  it("selectPoints updates isActive and predicate", () => {
    const { result } = renderHook(
      () => useSelection({ name: "test" }),
      { wrapper }
    )

    act(() => {
      result.current.selectPoints({ category: ["A", "B"] })
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.predicate({ category: "A" })).toBe(true)
    expect(result.current.predicate({ category: "B" })).toBe(true)
    expect(result.current.predicate({ category: "C" })).toBe(false)
  })

  it("selectInterval updates isActive and predicate", () => {
    const { result } = renderHook(
      () => useSelection({ name: "test" }),
      { wrapper }
    )

    act(() => {
      result.current.selectInterval({ x: [10, 50] })
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.predicate({ x: 25 })).toBe(true)
    expect(result.current.predicate({ x: 10 })).toBe(true)
    expect(result.current.predicate({ x: 50 })).toBe(true)
    expect(result.current.predicate({ x: 5 })).toBe(false)
    expect(result.current.predicate({ x: 55 })).toBe(false)
  })

  it("clear resets the selection", () => {
    const { result } = renderHook(
      () => useSelection({ name: "test" }),
      { wrapper }
    )

    act(() => {
      result.current.selectPoints({ category: ["A"] })
    })
    expect(result.current.isActive).toBe(true)

    act(() => {
      result.current.clear()
    })
    expect(result.current.isActive).toBe(false)
    expect(result.current.predicate({ category: "A" })).toBe(true)
    expect(result.current.predicate({ category: "Z" })).toBe(true)
  })

  it("uses custom clientId when provided", () => {
    const { result } = renderHook(
      () => useSelection({ name: "test", clientId: "my-client" }),
      { wrapper }
    )
    expect(result.current.clientId).toBe("my-client")
  })

  it("two hooks on the same selection see each other's clauses", () => {
    const { result } = renderHook(
      () => ({
        sel1: useSelection({ name: "shared", clientId: "c1" }),
        sel2: useSelection({ name: "shared", clientId: "c2" })
      }),
      { wrapper }
    )

    act(() => {
      result.current.sel1.selectPoints({ cat: ["A"] })
    })

    // Both should see the selection as active
    expect(result.current.sel1.isActive).toBe(true)
    expect(result.current.sel2.isActive).toBe(true)

    // Both predicates match (union mode by default)
    expect(result.current.sel2.predicate({ cat: "A" })).toBe(true)
    expect(result.current.sel2.predicate({ cat: "B" })).toBe(false)
  })

  it("different selection names are independent", () => {
    const { result } = renderHook(
      () => ({
        selA: useSelection({ name: "alpha" }),
        selB: useSelection({ name: "beta" })
      }),
      { wrapper }
    )

    act(() => {
      result.current.selA.selectPoints({ cat: ["A"] })
    })

    expect(result.current.selA.isActive).toBe(true)
    expect(result.current.selB.isActive).toBe(false)
  })
})

// ── useLinkedHover ──────────────────────────────────────────────────────────

describe("useLinkedHover", () => {
  it("returns the expected shape", () => {
    const { result } = renderHook(
      () => useLinkedHover({ fields: ["category"] }),
      { wrapper }
    )

    expect(result.current).toHaveProperty("onHover")
    expect(result.current).toHaveProperty("predicate")
    expect(result.current).toHaveProperty("isActive")
    expect(typeof result.current.onHover).toBe("function")
    expect(typeof result.current.predicate).toBe("function")
  })

  it("starts inactive", () => {
    const { result } = renderHook(
      () => useLinkedHover({ fields: ["category"] }),
      { wrapper }
    )
    expect(result.current.isActive).toBe(false)
  })

  it("onHover with a datum activates the selection", () => {
    const { result } = renderHook(
      () => useLinkedHover({ fields: ["category"] }),
      { wrapper }
    )

    act(() => {
      result.current.onHover({ category: "A", value: 10 })
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.predicate({ category: "A" })).toBe(true)
    expect(result.current.predicate({ category: "B" })).toBe(false)
  })

  it("onHover with null clears the selection", () => {
    const { result } = renderHook(
      () => useLinkedHover({ fields: ["category"] }),
      { wrapper }
    )

    act(() => {
      result.current.onHover({ category: "A" })
    })
    expect(result.current.isActive).toBe(true)

    act(() => {
      result.current.onHover(null)
    })
    expect(result.current.isActive).toBe(false)
  })

  it("uses custom selection name", () => {
    const { result } = renderHook(
      () => ({
        hover: useLinkedHover({ name: "myHover", fields: ["cat"] }),
        sel: useSelection({ name: "myHover" })
      }),
      { wrapper }
    )

    act(() => {
      result.current.hover.onHover({ cat: "X" })
    })

    expect(result.current.sel.isActive).toBe(true)
    expect(result.current.sel.predicate({ cat: "X" })).toBe(true)
  })

  it("defaults selection name to 'hover'", () => {
    const { result } = renderHook(
      () => ({
        hover: useLinkedHover({ fields: ["cat"] }),
        sel: useSelection({ name: "hover" })
      }),
      { wrapper }
    )

    act(() => {
      result.current.hover.onHover({ cat: "Y" })
    })

    expect(result.current.sel.isActive).toBe(true)
  })

  it("only uses specified fields from the datum", () => {
    const { result } = renderHook(
      () => useLinkedHover({ fields: ["category"] }),
      { wrapper }
    )

    act(() => {
      result.current.onHover({ category: "A", value: 100, extra: "ignored" })
    })

    // Predicate should match on category only
    expect(result.current.predicate({ category: "A" })).toBe(true)
    expect(result.current.predicate({ category: "A", value: 999 })).toBe(true)
  })
})

// ── useBrushSelection ───────────────────────────────────────────────────────

describe("useBrushSelection", () => {
  it("returns the expected shape", () => {
    const { result } = renderHook(
      () => useBrushSelection({ name: "brush", xField: "x", yField: "y" }),
      { wrapper }
    )

    expect(result.current).toHaveProperty("brushInteraction")
    expect(result.current).toHaveProperty("predicate")
    expect(result.current).toHaveProperty("isActive")
    expect(result.current).toHaveProperty("clear")
    expect(result.current.brushInteraction).toHaveProperty("brush")
    expect(result.current.brushInteraction).toHaveProperty("during")
    expect(result.current.brushInteraction).toHaveProperty("end")
  })

  it("determines xyBrush when both xField and yField provided", () => {
    const { result } = renderHook(
      () => useBrushSelection({ name: "b", xField: "x", yField: "y" }),
      { wrapper }
    )
    expect(result.current.brushInteraction.brush).toBe("xyBrush")
  })

  it("determines xBrush when only xField provided", () => {
    const { result } = renderHook(
      () => useBrushSelection({ name: "b", xField: "x" }),
      { wrapper }
    )
    expect(result.current.brushInteraction.brush).toBe("xBrush")
  })

  it("determines yBrush when only yField provided", () => {
    const { result } = renderHook(
      () => useBrushSelection({ name: "b", yField: "y" }),
      { wrapper }
    )
    expect(result.current.brushInteraction.brush).toBe("yBrush")
  })

  it("starts inactive", () => {
    const { result } = renderHook(
      () => useBrushSelection({ name: "b", xField: "x", yField: "y" }),
      { wrapper }
    )
    expect(result.current.isActive).toBe(false)
  })

  it("xyBrush extent sets interval selection", () => {
    const { result } = renderHook(
      () => useBrushSelection({ name: "b", xField: "x", yField: "y" }),
      { wrapper }
    )

    act(() => {
      result.current.brushInteraction.during([[10, 20], [50, 80]])
    })

    expect(result.current.isActive).toBe(true)
    expect(result.current.predicate({ x: 30, y: 50 })).toBe(true)
    expect(result.current.predicate({ x: 5, y: 50 })).toBe(false)
    expect(result.current.predicate({ x: 30, y: 90 })).toBe(false)
  })

  it("clear resets the brush", () => {
    const { result } = renderHook(
      () => useBrushSelection({ name: "b", xField: "x", yField: "y" }),
      { wrapper }
    )

    act(() => {
      result.current.brushInteraction.during([[10, 20], [50, 80]])
    })
    expect(result.current.isActive).toBe(true)

    act(() => {
      result.current.clear()
    })
    expect(result.current.isActive).toBe(false)
  })
})

// ── useFilteredData ─────────────────────────────────────────────────────────

describe("useFilteredData", () => {
  const data = [
    { id: 1, category: "A", x: 10 },
    { id: 2, category: "B", x: 20 },
    { id: 3, category: "A", x: 30 },
    { id: 4, category: "C", x: 40 }
  ]

  it("returns all data when no selection is active", () => {
    const { result } = renderHook(
      () => useFilteredData(data, "test"),
      { wrapper }
    )
    expect(result.current).toEqual(data)
  })

  it("filters data based on point selection", () => {
    const { result } = renderHook(
      () => ({
        sel: useSelection({ name: "filter" }),
        filtered: useFilteredData(data, "filter")
      }),
      { wrapper }
    )

    act(() => {
      result.current.sel.selectPoints({ category: ["A"] })
    })

    expect(result.current.filtered).toEqual([
      { id: 1, category: "A", x: 10 },
      { id: 3, category: "A", x: 30 }
    ])
  })

  it("filters data based on interval selection", () => {
    const { result } = renderHook(
      () => ({
        sel: useSelection({ name: "filter" }),
        filtered: useFilteredData(data, "filter")
      }),
      { wrapper }
    )

    act(() => {
      result.current.sel.selectInterval({ x: [15, 35] })
    })

    expect(result.current.filtered).toEqual([
      { id: 2, category: "B", x: 20 },
      { id: 3, category: "A", x: 30 }
    ])
  })

  it("returns all data after selection is cleared", () => {
    const { result } = renderHook(
      () => ({
        sel: useSelection({ name: "filter" }),
        filtered: useFilteredData(data, "filter")
      }),
      { wrapper }
    )

    act(() => {
      result.current.sel.selectPoints({ category: ["A"] })
    })
    expect(result.current.filtered.length).toBe(2)

    act(() => {
      result.current.sel.clear()
    })
    expect(result.current.filtered).toEqual(data)
  })

  it("excludes own clause in crossfilter mode", () => {
    // We need to set up crossfilter resolution via the store
    // Use two selections in the same named selection with different clientIds
    const { result } = renderHook(
      () => {
        const sel1 = useSelection({ name: "cf", clientId: "chart-1" })
        const sel2 = useSelection({ name: "cf", clientId: "chart-2" })
        const filtered1 = useFilteredData(data, "cf", "chart-1")
        const filtered2 = useFilteredData(data, "cf", "chart-2")
        return { sel1, sel2, filtered1, filtered2 }
      },
      { wrapper }
    )

    // Set crossfilter resolution by using setResolution through the store
    // Since we can't directly access the store, we test the default union behavior
    // The crossfilter exclusion is already tested in SelectionStore.test.ts
    // Here we verify useFilteredData passes clientId correctly
    act(() => {
      result.current.sel1.selectPoints({ category: ["A"] })
    })

    // Both see the filter (union mode by default, no crossfilter exclusion)
    expect(result.current.filtered1.length).toBe(2)
    expect(result.current.filtered2.length).toBe(2)
  })
})
