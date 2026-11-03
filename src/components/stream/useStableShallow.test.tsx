/**
 * Regression coverage for `useStableShallow` — the seam that breaks the
 * inline-object-props render loop in the four Stream Frames. The
 * canonical incident: passing `frameProps={{ pulse: { ... }, staleness:
 * { ... } }}` to a HOC produced a fresh `pulse`/`staleness` reference
 * on every parent render. The Stream Frame's `pipelineConfig` useMemo
 * listed those refs in its deps, so it recomputed every render. The
 * `updateConfig` effect re-fired every render, dirtying the scene and
 * scheduling a paint; the rAF render loop's `setAnnotationFrame` call
 * fed back into a re-render. React 19 caught the cycle as
 * "Maximum update depth exceeded" after ~50 frames.
 *
 * The hook stabilises the reference whenever values are equal at one
 * level deep — which is the typical config shape — so the effect no
 * longer fires on inline-object churn.
 */
import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useStableShallow } from "./useStableShallow"
import { shallowEqualTwoLevel } from "./shallowEqual"

it("keeps config equality bounded to two levels and preserves Object.is semantics", () => {
  const callback = () => 1
  expect(shallowEqualTwoLevel({ callback }, { callback })).toBe(true)
  expect(shallowEqualTwoLevel({ callback }, { callback: () => 1 })).toBe(false)
  expect(shallowEqualTwoLevel({ n: NaN }, { n: NaN })).toBe(true)
  expect(shallowEqualTwoLevel({ n: 0 }, { n: -0 })).toBe(false)
  expect(shallowEqualTwoLevel({ a: { x: undefined } }, { a: { y: undefined } })).toBe(false)
  expect(shallowEqualTwoLevel({ a: { x: {} } }, { a: { x: {} } })).toBe(false)
  expect(shallowEqualTwoLevel({ a: [{}] }, { a: [{}] })).toBe(false)
  expect(shallowEqualTwoLevel({ a: new Map() }, { a: new Map() })).toBe(false)
  expect(shallowEqualTwoLevel(Object.create(null), {})).toBe(true)
})

it("compares inline frame configs without materializing key collections", () => {
  const makeConfig = () => ({
    pulse: { duration: 600, color: "#abc" },
    staleness: { threshold: 1000, opacity: 0.5 },
    colorScheme: ["#abc", "#def"],
    extent: [0, 100]
  })
  const initial = makeConfig()
  const next = makeConfig()
  const keys = vi.spyOn(Object, "keys")
  const equal = shallowEqualTwoLevel(initial, next)
  const calls = keys.mock.calls.length
  keys.mockRestore()
  expect(equal).toBe(true)
  expect(calls).toBe(0)
})

it("compares only own enumerable string keys, including null-prototype records", () => {
  const a = Object.assign(Object.create(null), { color: "blue" })
  const b = { color: "blue" }
  Object.defineProperty(b, "hidden", { value: 1 })
  expect(shallowEqualTwoLevel(a, b)).toBe(true)
  expect(shallowEqualTwoLevel(b, a)).toBe(true)
  expect(shallowEqualTwoLevel({ ...a, extra: undefined }, b)).toBe(false)
  expect(shallowEqualTwoLevel(b, { ...a, extra: undefined })).toBe(false)
  expect(shallowEqualTwoLevel({ hidden: 1 }, b)).toBe(false)
  const symbol = Symbol("metadata")
  expect(shallowEqualTwoLevel({ ...a, [symbol]: 1 }, { ...b, [symbol]: 2 })).toBe(true)
  expect(shallowEqualTwoLevel([undefined], Array(1))).toBe(true)
  expect(shallowEqualTwoLevel(Object.assign([1], { label: "a" }), Object.assign([1], { label: "b" }))).toBe(true)

  // A property made enumerable on Object.prototype must not become a config
  // field, nor supply an own key missing from a null-prototype record.
  const inherited = Symbol("inherited")
  const descriptor = Object.getOwnPropertyDescriptor(Object.prototype, "color")
  Object.defineProperty(Object.prototype, "color", {
    value: inherited,
    enumerable: true,
    configurable: true
  })
  let equivalent: boolean
  let missing: boolean
  try {
    equivalent = shallowEqualTwoLevel(a, b)
    missing = shallowEqualTwoLevel(a, Object.create(null))
  } finally {
    if (descriptor) Object.defineProperty(Object.prototype, "color", descriptor)
    else Reflect.deleteProperty(Object.prototype, "color")
  }
  expect(equivalent).toBe(true)
  expect(missing).toBe(false)
})

describe("useStableShallow", () => {
  it("returns the same reference across renders when shallow-equal at one level", () => {
    const initial = { duration: 600, color: "#abc" }
    const { result, rerender } = renderHook(
      ({ value }) => useStableShallow(value),
      { initialProps: { value: initial } },
    )
    expect(result.current).toBe(initial)
    // Value-equal but ref-different — the inline-object render pattern.
    rerender({ value: { duration: 600, color: "#abc" } })
    expect(result.current).toBe(initial)
  })

  it("returns the new reference when a top-level primitive changes", () => {
    const a = { duration: 600, color: "#abc" }
    const b = { duration: 700, color: "#abc" }
    const { result, rerender } = renderHook(
      ({ value }) => useStableShallow(value),
      { initialProps: { value: a } },
    )
    expect(result.current).toBe(a)
    rerender({ value: b })
    expect(result.current).toBe(b)
  })

  it("treats a nested sub-object as equal when its keys are pairwise identical", () => {
    const a = { pulse: { duration: 600, color: "#abc" }, n: 1 }
    const b = { pulse: { duration: 600, color: "#abc" }, n: 1 }
    const { result, rerender } = renderHook(
      ({ value }) => useStableShallow(value),
      { initialProps: { value: a } },
    )
    expect(result.current).toBe(a)
    rerender({ value: b })
    expect(result.current).toBe(a)
  })

  it("returns a new reference when a nested sub-object value changes", () => {
    const a = { pulse: { duration: 600, color: "#abc" } }
    const b = { pulse: { duration: 700, color: "#abc" } }
    const { result, rerender } = renderHook(
      ({ value }) => useStableShallow(value),
      { initialProps: { value: a } },
    )
    rerender({ value: b })
    expect(result.current).toBe(b)
  })

  it("does not falsely stabilize across class instances (Set, Map, Date)", () => {
    // StreamXYFrame stuffs `new Set(areaGroups)` into its pipelineConfig.
    // Two distinct Sets must compare as not-equal so the `updateConfig`
    // effect re-fires and the area-group filter stays current.
    const a = { areaGroups: new Set(["x", "y"]) }
    const b = { areaGroups: new Set(["x", "z"]) }
    const { result, rerender } = renderHook(
      ({ value }) => useStableShallow(value),
      { initialProps: { value: a } },
    )
    rerender({ value: b })
    expect(result.current).toBe(b)
  })

  it("does not falsely stabilize when key sets differ but value-counts match", () => {
    // `{ a: undefined }` and `{ b: undefined }` both have one own key
    // and both look up `undefined` for any missing key. Without an
    // explicit key-presence check the two would falsely compare equal.
    const a: Record<string, number | undefined> = { a: undefined }
    const b: Record<string, number | undefined> = { b: undefined }
    const { result, rerender } = renderHook(
      ({ value }) => useStableShallow(value),
      { initialProps: { value: a } },
    )
    rerender({ value: b })
    expect(result.current).toBe(b)
  })

  it("stabilizes equal top-level arrays (extent / colorScheme shape)", () => {
    // Stream pipeline configs commonly carry primitive arrays — xExtent,
    // yExtent, sizeRange, colorScheme, etc. — all of which a consumer
    // is just as likely to inline as object props.
    const initial = [0, 100] as [number, number]
    const { result, rerender } = renderHook(
      ({ value }) => useStableShallow(value),
      { initialProps: { value: initial } },
    )
    expect(result.current).toBe(initial)
    rerender({ value: [0, 100] as [number, number] })
    expect(result.current).toBe(initial)
  })

  it("returns the new array reference when an element changes", () => {
    const a = [0, 100] as [number, number]
    const b = [0, 200] as [number, number]
    const { result, rerender } = renderHook(
      ({ value }) => useStableShallow(value),
      { initialProps: { value: a } },
    )
    rerender({ value: b })
    expect(result.current).toBe(b)
  })

  it("stabilizes nested arrays inside config objects", () => {
    // `pipelineConfig.colorScheme = ["#a", "#b"]` is the realistic case.
    const a = { colorScheme: ["#abc", "#def"], n: 1 }
    const b = { colorScheme: ["#abc", "#def"], n: 1 }
    const { result, rerender } = renderHook(
      ({ value }) => useStableShallow(value),
      { initialProps: { value: a } },
    )
    rerender({ value: b })
    expect(result.current).toBe(a)
  })

  it("does not falsely stabilize when nested arrays differ in length", () => {
    const a = { colorScheme: ["#abc", "#def"] }
    const b = { colorScheme: ["#abc", "#def", "#fed"] }
    const { result, rerender } = renderHook(
      ({ value }) => useStableShallow(value),
      { initialProps: { value: a } },
    )
    rerender({ value: b })
    expect(result.current).toBe(b)
  })

  it("does not falsely stabilize when nested key sets differ", () => {
    type PulseConfigShape = { pulse: { duration?: number; color?: string } }
    const a: PulseConfigShape = { pulse: { duration: 600 } }
    const b: PulseConfigShape = { pulse: { color: "#abc" } } // single key, but different name
    const { result, rerender } = renderHook(
      ({ value }) => useStableShallow(value),
      { initialProps: { value: a } },
    )
    rerender({ value: b })
    expect(result.current).toBe(b)
  })
})
