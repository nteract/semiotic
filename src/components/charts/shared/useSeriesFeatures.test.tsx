import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  useSeriesFeatures,
  type SeriesFeaturesOptions
} from "./useSeriesFeatures"
import { buildForecastLazy } from "./statisticalOverlaysLazy"
import type { Datum } from "./datumTypes"
import type { ForecastResult } from "./statisticalOverlays"

vi.mock("./statisticalOverlaysLazy", () => ({
  buildForecastLazy: vi.fn(),
  buildAnomalyAnnotationsLazy: vi.fn()
}))

function deferred() {
  let resolve!: (value: ForecastResult) => void
  let reject!: (error: Error) => void
  const promise = new Promise<ForecastResult>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

const data = [
  { x: 0, y: 1 },
  { x: 1, y: 2 },
  { x: 2, y: 3 }
]
const forecastResult = {
  processedData: [...data, { x: 3, y: 4 }],
  annotations: [{ type: "envelope" }]
}
const options: SeriesFeaturesOptions = {
  data,
  xAccessor: "x",
  yAccessor: "y",
  forecast: { trainEnd: 2 }
}

beforeEach(() => vi.resetAllMocks())

describe("current statistical overlays", () => {
  it("keeps equal inline configs and function accessor bakes stable", async () => {
    const task = deferred()
    vi.mocked(buildForecastLazy).mockReturnValue(task.promise)
    const xAccessor = (d: Datum) => d.x as number
    const props = {
      ...options,
      xAccessor,
      forecast: { trainEnd: 2, uncertaintyOpacity: { min: 0.2 } }
    }
    const { result, rerender } = renderHook((p) => useSeriesFeatures(p), {
      initialProps: props
    })
    await act(async () => task.resolve(forecastResult))
    const before = result.current
    rerender({
      ...props,
      forecast: { trainEnd: 2, uncertaintyOpacity: { min: 0.2 } }
    })
    expect(buildForecastLazy).toHaveBeenCalledTimes(1)
    expect(result.current.effectiveData).toBe(before.effectiveData)
    expect(result.current.statisticalAnnotations).toBe(
      before.statisticalAnnotations
    )
  })

  it("forwards replacement and empty rows on the first render, and ignores late completion", async () => {
    const first = deferred(),
      second = deferred(),
      third = deferred()
    vi.mocked(buildForecastLazy)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise)
    const renders: ReturnType<typeof useSeriesFeatures>[] = []
    const { result, rerender } = renderHook(
      (p) => {
        const value = useSeriesFeatures(p)
        renders.push(value)
        return value
      },
      { initialProps: options }
    )
    await act(async () => first.resolve(forecastResult))
    const replacement = [{ x: 9, y: 20 }]
    const count = renders.length
    rerender({ ...options, data: replacement })
    expect(renders[count].effectiveData).toBe(replacement)
    expect(result.current.hasForecast).toBe(false)
    const empty: typeof data = []
    rerender({ ...options, data: empty })
    await act(async () => second.resolve(forecastResult))
    expect(result.current.effectiveData).toBe(empty)
    expect(result.current.statisticalAnnotations).toEqual([])
  })

  it("removes disabled features synchronously and reports computation failures", async () => {
    const first = deferred(),
      next = deferred()
    vi.mocked(buildForecastLazy)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(next.promise)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { result, rerender } = renderHook((p) => useSeriesFeatures(p), {
      initialProps: options
    })
    await act(async () => first.resolve(forecastResult))
    rerender({ ...options, forecast: undefined })
    expect(result.current.effectiveData).toBe(data)
    expect(result.current.statisticalAnnotations).toEqual([])
    rerender({ ...options, forecast: { trainEnd: 1 } })
    const error = new Error("chunk unavailable")
    await act(async () => next.reject(error))
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("statistical overlays"),
      error
    )
    expect(result.current.effectiveData).toBe(data)
    warn.mockRestore()
  })
})
