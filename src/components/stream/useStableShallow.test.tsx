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
import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { useStableShallow } from "./useStableShallow"

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
