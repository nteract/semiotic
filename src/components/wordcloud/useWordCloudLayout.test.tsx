import { beforeEach, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useWordCloudLayout } from "./useWordCloudLayout"
import { WordCloudLayoutError, type WordCloudLayoutResult } from "./types"
import type { WordCloudProps } from "../charts/wordcloud/WordCloud"
import fixture from "./wordCloud.fixture.json"

const { prepare } = vi.hoisted(() => ({
  prepare:
    vi.fn<
      (typeof import("./prepareWordCloudLayout"))["prepareWordCloudLayout"]
    >()
}))
vi.mock("./prepareWordCloudLayout", () => ({ prepareWordCloudLayout: prepare }))
const options = fixture.options as unknown as WordCloudProps
const layout = fixture.layout as unknown as WordCloudLayoutResult
beforeEach(() => {
  prepare.mockReset()
})

it("normalizes a verified explicit layout only once on each render", () => {
  const textAccessor = vi.fn((row) => row.text)
  const props = { ...options, textAccessor, layout }
  const { result, rerender } = renderHook(
    (current: WordCloudProps) => useWordCloudLayout(current, 320, 200),
    { initialProps: props }
  )
  expect(result.current.layout).toBe(layout)
  expect(result.current.error).toBeUndefined()
  expect(textAccessor.mock.calls.map(([row]) => row)).toEqual(options.data)
  textAccessor.mockClear()

  rerender(props)
  expect(result.current.layout).toBe(layout)
  expect(textAccessor.mock.calls.map(([row]) => row)).toEqual(options.data)
  expect(prepare).not.toHaveBeenCalled()
})

it.each([
  [
    "source values",
    (props: WordCloudProps) => {
      props.data[0].value += 1
    }
  ],
  [
    "placement geometry",
    (props: WordCloudProps) => {
      props.layout!.words[0].x = Infinity
    }
  ],
  [
    "layout fingerprint",
    (props: WordCloudProps) => {
      props.layout!.inputFingerprint = "changed"
    }
  ]
] as const)("revalidates in-place changes to %s", (_name, mutate) => {
  const onLayoutError = vi.fn()
  const props = {
    ...options,
    data: structuredClone(options.data),
    layout: structuredClone(layout),
    onLayoutError
  }
  const { result, rerender } = renderHook(
    (current: WordCloudProps) => useWordCloudLayout(current, 320, 200),
    { initialProps: props }
  )
  expect(result.current.layout).toBe(props.layout)
  mutate(props)
  rerender(props)

  expect(result.current).toMatchObject({
    layout: undefined,
    error: { code: "STALE_LAYOUT" },
    pending: false
  })
  expect(onLayoutError).toHaveBeenCalledExactlyOnceWith(result.current.error)
  expect(prepare).not.toHaveBeenCalled()
})

it.each([{ version: 2 }, { engineVersion: "unsupported" }])(
  "reports invalid input before an unsupported layout %j",
  (patch) => {
    const onLayoutError = vi.fn()
    const props = {
      ...options,
      seed: Infinity,
      layout: { ...layout, ...patch } as WordCloudLayoutResult,
      onLayoutError
    }
    const { result, rerender } = renderHook(
      (current: WordCloudProps) => useWordCloudLayout(current, 320, 200),
      { initialProps: props }
    )
    expect(result.current.error).toMatchObject({
      code: "INVALID_INPUT",
      message: "WordCloud seed must be a finite safe integer."
    })
    expect(onLayoutError).toHaveBeenCalledExactlyOnceWith(result.current.error)

    rerender({ ...props, seed: fixture.options.seed })
    expect(result.current.error).toMatchObject({
      code: "STALE_LAYOUT",
      message: "Unsupported WordCloud layout version. Prepare a fresh layout."
    })
    expect(onLayoutError).toHaveBeenCalledTimes(2)
    expect(onLayoutError).toHaveBeenLastCalledWith(result.current.error)
  }
)

it("updates invalid-layout diagnostics when the input fingerprint or error changes", () => {
  const onLayoutError = vi.fn()
  const props = {
    ...options,
    data: structuredClone(options.data),
    // Serialized layouts can carry an unsupported version at the runtime boundary.
    layout: { ...structuredClone(layout), version: 2 } as unknown as WordCloudLayoutResult,
    onLayoutError
  }
  const { result, rerender } = renderHook(
    (current: WordCloudProps) => useWordCloudLayout(current, 320, 200),
    { initialProps: props }
  )
  expect(onLayoutError).toHaveBeenCalledTimes(1)
  rerender(props)
  expect(onLayoutError).toHaveBeenCalledTimes(1)

  props.data[0].value += 1
  rerender(props)
  expect(onLayoutError).toHaveBeenCalledTimes(2)
  expect(result.current.error?.message).toContain(
    "Unsupported WordCloud layout version"
  )

  props.layout.version = 1
  rerender(props)
  expect(onLayoutError).toHaveBeenCalledTimes(3)
  expect(result.current.error?.message).toContain("does not match its data")
  expect(onLayoutError).toHaveBeenLastCalledWith(result.current.error)

  props.data[0].value = options.data[0].value
  rerender(props)
  expect(result.current.layout).toBe(props.layout)
  expect(result.current.error).toBeUndefined()
  expect(onLayoutError).toHaveBeenCalledTimes(3)
  expect(prepare).not.toHaveBeenCalled()
})

it("does not retry normalization when an accessor already produced INVALID_INPUT", () => {
  const textAccessor = vi.fn(() => {
    throw new Error("bad row")
  })
  const onLayoutError = vi.fn()
  const { result } = renderHook(() =>
    useWordCloudLayout(
      {
        ...options,
        textAccessor,
        layout,
        onLayoutError
      },
      320,
      200
    )
  )
  expect(result.current.error).toMatchObject({
    code: "INVALID_INPUT",
    message: "A WordCloud accessor could not read a source row."
  })
  expect(textAccessor).toHaveBeenCalledExactlyOnceWith(options.data[0])
  expect(onLayoutError).toHaveBeenCalledExactlyOnceWith(result.current.error)
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
  prepare.mockImplementation((_options, _environment, signal) => {
    return new Promise<WordCloudLayoutResult>((_resolve, reject) =>
      signal!.addEventListener("abort", () => reject(signal!.reason))
    )
  })
  const onLayoutError = vi.fn()
  const { rerender, unmount } = renderHook(
    (props: WordCloudProps) => useWordCloudLayout(props, 320, 200),
    { initialProps: { ...options, onLayoutError } }
  )
  await waitFor(() => expect(prepare).toHaveBeenCalledTimes(1))
  const firstSignal = prepare.mock.calls[0][2]!
  rerender({ ...options, seed: 43, onLayoutError })
  await waitFor(() => expect(prepare).toHaveBeenCalledTimes(2))
  const secondSignal = prepare.mock.calls[1][2]!
  expect(firstSignal.aborted).toBe(true)
  expect(secondSignal.aborted).toBe(false)
  unmount()
  expect(secondSignal.aborted).toBe(true)
  expect(onLayoutError).not.toHaveBeenCalled()
})
