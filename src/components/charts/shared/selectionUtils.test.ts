import { describe, it, expect } from "vitest"
import {
  normalizeLinkedHover,
  normalizeLinkedBrush,
  wrapStyleWithSelection,
  type SelectionHookResult,
} from "./selectionUtils"

// ── normalizeLinkedHover ──────────────────────────────────────────────────

describe("normalizeLinkedHover", () => {
  it("returns null for undefined", () => {
    expect(normalizeLinkedHover(undefined)).toBeNull()
  })

  it("returns null for false", () => {
    expect(normalizeLinkedHover(false)).toBeNull()
  })

  it("normalizes true to default hover config", () => {
    const result = normalizeLinkedHover(true)
    expect(result).toEqual({ name: "hover", fields: [] })
  })

  it("normalizes true with fallbackFields", () => {
    const result = normalizeLinkedHover(true, ["region", "year"])
    expect(result).toEqual({ name: "hover", fields: ["region", "year"] })
  })

  it("normalizes a string to a named config", () => {
    const result = normalizeLinkedHover("mySelection")
    expect(result).toEqual({ name: "mySelection", fields: [] })
  })

  it("normalizes a string with fallback fields", () => {
    const result = normalizeLinkedHover("hl", ["type"])
    expect(result).toEqual({ name: "hl", fields: ["type"] })
  })

  it("passes through an object config as-is", () => {
    const result = normalizeLinkedHover({ name: "hl", fields: ["category"] })
    expect(result).toEqual({ name: "hl", fields: ["category"] })
  })

  it("uses default name 'hover' when object has no name", () => {
    const result = normalizeLinkedHover({ fields: ["region"] })
    expect(result).toEqual({ name: "hover", fields: ["region"] })
  })
})

// ── normalizeLinkedBrush ──────────────────────────────────────────────────

describe("normalizeLinkedBrush", () => {
  it("returns null for undefined", () => {
    expect(normalizeLinkedBrush(undefined)).toBeNull()
  })

  it("normalizes a string to a named config", () => {
    const result = normalizeLinkedBrush("timeRange")
    expect(result).toEqual({ name: "timeRange" })
  })

  it("passes through an object config as-is", () => {
    const input = { name: "dash", xField: "age", yField: "income" }
    const result = normalizeLinkedBrush(input)
    expect(result).toEqual(input)
  })

})

// ── wrapStyleWithSelection ────────────────────────────────────────────────

describe("wrapStyleWithSelection", () => {
  const baseStyleFn = (d: Record<string, any>) => ({
    fill: d.color || "blue",
    stroke: "black",
  })

  it("returns the base style function when selectionHook is null (no selection)", () => {
    const wrapped = wrapStyleWithSelection(baseStyleFn, null)
    expect(wrapped).toBe(baseStyleFn)
  })

  it("returns base styles when selection is not active", () => {
    const hook: SelectionHookResult = {
      isActive: false,
      predicate: () => false,
    }
    const wrapped = wrapStyleWithSelection(baseStyleFn, hook)
    const style = wrapped({ color: "red" })
    expect(style).toEqual({ fill: "red", stroke: "black" })
  })

  it("returns full opacity for matching datums when selection is active", () => {
    const hook: SelectionHookResult = {
      isActive: true,
      predicate: (d) => d.category === "A",
    }
    const wrapped = wrapStyleWithSelection(baseStyleFn, hook)
    const style = wrapped({ color: "red", category: "A" })
    // Selected: base styles, no dimming
    expect(style.fill).toBe("red")
    expect(style.stroke).toBe("black")
    expect(style.opacity).toBeUndefined()
  })

  it("dims non-matching datums with default opacity 0.2", () => {
    const hook: SelectionHookResult = {
      isActive: true,
      predicate: (d) => d.category === "A",
    }
    const wrapped = wrapStyleWithSelection(baseStyleFn, hook)
    const style = wrapped({ color: "red", category: "B" })
    expect(style.opacity).toBe(0.2)
    expect(style.fillOpacity).toBe(0.2)
    expect(style.strokeOpacity).toBe(0.2)
  })

  it("uses custom unselectedOpacity", () => {
    const hook: SelectionHookResult = {
      isActive: true,
      predicate: (d) => d.category === "A",
    }
    const wrapped = wrapStyleWithSelection(baseStyleFn, hook, {
      unselectedOpacity: 0.5,
    })
    const style = wrapped({ category: "B" })
    expect(style.opacity).toBe(0.5)
    expect(style.fillOpacity).toBe(0.5)
    expect(style.strokeOpacity).toBe(0.5)
  })

  it("applies selectedStyle overrides for matching datums", () => {
    const hook: SelectionHookResult = {
      isActive: true,
      predicate: (d) => d.category === "A",
    }
    const wrapped = wrapStyleWithSelection(baseStyleFn, hook, {
      selectedStyle: { strokeWidth: 3, stroke: "gold" },
    })
    const style = wrapped({ color: "red", category: "A" })
    expect(style.strokeWidth).toBe(3)
    expect(style.stroke).toBe("gold")
    expect(style.fill).toBe("red")
  })

  it("applies unselectedStyle overrides for non-matching datums", () => {
    const hook: SelectionHookResult = {
      isActive: true,
      predicate: (d) => d.category === "A",
    }
    const wrapped = wrapStyleWithSelection(baseStyleFn, hook, {
      unselectedStyle: { filter: "grayscale(100%)" },
    })
    const style = wrapped({ category: "B" })
    expect(style.opacity).toBe(0.2)
    expect(style.filter).toBe("grayscale(100%)")
  })

  it("works with multiple selection fields in predicate", () => {
    const hook: SelectionHookResult = {
      isActive: true,
      predicate: (d) => d.region === "North" && d.year === 2024,
    }
    const wrapped = wrapStyleWithSelection(baseStyleFn, hook)

    const matchStyle = wrapped({ region: "North", year: 2024 })
    expect(matchStyle.opacity).toBeUndefined()

    const noMatchStyle = wrapped({ region: "North", year: 2023 })
    expect(noMatchStyle.opacity).toBe(0.2)
  })

  it("uses cssOpacity when config.unselectedOpacity is not set", () => {
    const hook: SelectionHookResult = {
      isActive: true,
      predicate: (d) => d.category === "A",
    }
    const wrapped = wrapStyleWithSelection(baseStyleFn, hook, undefined, 0.35)
    const style = wrapped({ category: "B" })
    expect(style.opacity).toBe(0.35)
    expect(style.fillOpacity).toBe(0.35)
  })

  it("prefers config.unselectedOpacity over cssOpacity", () => {
    const hook: SelectionHookResult = {
      isActive: true,
      predicate: (d) => d.category === "A",
    }
    const wrapped = wrapStyleWithSelection(baseStyleFn, hook, { unselectedOpacity: 0.1 }, 0.35)
    const style = wrapped({ category: "B" })
    expect(style.opacity).toBe(0.1)
  })

  it("does not mutate the base style object", () => {
    const hook: SelectionHookResult = {
      isActive: true,
      predicate: () => false,
    }
    const wrapped = wrapStyleWithSelection(baseStyleFn, hook)
    const style1 = wrapped({ color: "red" })
    const style2 = wrapped({ color: "blue" })
    // Each call should produce a fresh object
    expect(style1).not.toBe(style2)
    expect(style1.fill).toBe("red")
    expect(style2.fill).toBe("blue")
  })
})
