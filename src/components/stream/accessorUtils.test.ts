import { describe, it, expect } from "vitest"
import { accessorsEquivalent, resolveAccessor, resolveStringAccessor } from "./accessorUtils"

describe("accessorsEquivalent", () => {
  it("returns true for identical string accessors", () => {
    expect(accessorsEquivalent("value", "value")).toBe(true)
  })

  it("returns false for different string accessors", () => {
    expect(accessorsEquivalent("x", "y")).toBe(false)
  })

  it("returns true for the same function reference", () => {
    const fn = (d: any) => d.x
    expect(accessorsEquivalent(fn, fn)).toBe(true)
  })

  it("returns true for functions with identical source (inline arrow)", () => {
    const fn1 = (d: any) => d.value
    const fn2 = (d: any) => d.value
    expect(accessorsEquivalent(fn1, fn2)).toBe(true)
  })

  it("returns false for functions with different source", () => {
    const fn1 = (d: any) => d.x
    const fn2 = (d: any) => d.y
    expect(accessorsEquivalent(fn1, fn2)).toBe(false)
  })

  it("returns false for string vs function", () => {
    expect(accessorsEquivalent("value", (d: any) => d.value)).toBe(false)
  })

  it("returns true for both undefined", () => {
    expect(accessorsEquivalent(undefined, undefined)).toBe(true)
  })

  it("returns false for undefined vs string", () => {
    expect(accessorsEquivalent(undefined, "x")).toBe(false)
  })

  it("returns false for undefined vs function", () => {
    expect(accessorsEquivalent(undefined, (d: any) => d.x)).toBe(false)
  })
})

describe("resolveAccessor", () => {
  it("resolves a string accessor to a getter function", () => {
    const get = resolveAccessor("price", "x")
    expect(get({ price: 42 })).toBe(42)
  })

  it("uses fallback when accessor is undefined", () => {
    const get = resolveAccessor(undefined, "x")
    expect(get({ x: 10 })).toBe(10)
  })

  it("wraps a function accessor with numeric coercion", () => {
    const get = resolveAccessor((d: any) => d.val, "x")
    expect(get({ val: "5" })).toBe(5)
  })
})

describe("resolveStringAccessor", () => {
  it("resolves a string accessor to a string getter", () => {
    const get = resolveStringAccessor("name", "id")!
    expect(get({ name: "Alice" })).toBe("Alice")
  })

  it("uses fallback when accessor is undefined", () => {
    const get = resolveStringAccessor(undefined, "id")!
    expect(get({ id: 42 })).toBe("42")
  })

  it("returns undefined when both accessor and fallback are undefined", () => {
    expect(resolveStringAccessor(undefined)).toBeUndefined()
  })

  it("passes through a function accessor", () => {
    const fn = (d: any) => d.label
    const get = resolveStringAccessor(fn)
    expect(get).toBe(fn)
  })
})
