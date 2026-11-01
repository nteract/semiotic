import { beforeEach, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useWordCloudLayout } from "./useWordCloudLayout"
import { WordCloudLayoutError, type WordCloudLayoutResult } from "./types"
import type { WordCloudProps } from "../charts/wordcloud/WordCloud"
import fixture from "./wordCloud.fixture.json"

const { prepare } = vi.hoisted(() => ({ prepare: vi.fn() }))
vi.mock("./prepareWordCloudLayout", () => ({ prepareWordCloudLayout: prepare }))
const options = fixture.options as unknown as WordCloudProps
const layout = fixture.layout as unknown as WordCloudLayoutResult
beforeEach(() => {
  prepare.mockReset()
})

it("accepts a valid explicit layout after preparation failed, while still rejecting stale layouts", async () => {
  prepare.mockRejectedValue(
    new WordCloudLayoutError("CANVAS_REQUIRED", "No Canvas")
  )
  const { result, rerender } = renderHook(
    (props: WordCloudProps) => useWordCloudLayout(props, 320, 200),
    { initialProps: options }
  )
  await waitFor(() =>
    expect(result.current.error?.code).toBe("CANVAS_REQUIRED")
  )
  rerender({ ...options, layout })
  expect(result.current).toMatchObject({
    layout,
    error: undefined,
    pending: false
  })
  rerender({ ...options, layout: { ...layout, width: 321 } })
  expect(result.current.error?.code).toBe("STALE_LAYOUT")
})

it("aborts pending work on input changes and unmount without publishing cancellation errors", async () => {
  const signals: AbortSignal[] = []
  prepare.mockImplementation((_options, _environment, signal: AbortSignal) => {
    signals.push(signal)
    return new Promise((_resolve, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason))
    )
  })
  const onLayoutError = vi.fn()
  const { rerender, unmount } = renderHook(
    (props: WordCloudProps) => useWordCloudLayout(props, 320, 200),
    { initialProps: { ...options, onLayoutError } }
  )
  await waitFor(() => expect(signals).toHaveLength(1))
  rerender({ ...options, seed: 43, onLayoutError })
  await waitFor(() => expect(signals).toHaveLength(2))
  expect(signals[0].aborted).toBe(true)
  expect(signals[1].aborted).toBe(false)
  unmount()
  expect(signals[1].aborted).toBe(true)
  expect(onLayoutError).not.toHaveBeenCalled()
})
