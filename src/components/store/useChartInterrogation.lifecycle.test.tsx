import React from "react"
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  enableConversationArc,
  getConversationArcStore
} from "../ai/conversationArc"
import {
  useChartInterrogation,
  type InterrogationResult
} from "./useChartInterrogation"

function deferred() {
  let resolve!: (result: InterrogationResult) => void
  let reject!: (error: Error) => void
  const promise = new Promise<InterrogationResult>((accept, fail) => {
    resolve = accept
    reject = fail
  })
  return { promise, resolve, reject }
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <React.StrictMode>{children}</React.StrictMode>
)

afterEach(() => getConversationArcStore().reset())

describe("interrogation request lifecycle", () => {
  it("settles effect-started questions after StrictMode replays mount effects", async () => {
    const pending: ReturnType<typeof deferred>[] = []
    const { result } = renderHook(
      () => {
        const query = useChartInterrogation({
          data: [],
          onQuery: () => {
            const request = deferred()
            pending.push(request)
            return request.promise
          }
        })
        const { ask } = query
        React.useEffect(() => {
          void ask("Automatic question")
        }, [ask])
        return query
      },
      { reactStrictMode: true }
    )
    expect(pending).toHaveLength(2)
    await act(async () => {
      pending.forEach((request, i) =>
        request.resolve({ answer: `Answer ${i}` })
      )
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.history.map((message) => message.text)).toEqual([
      "Automatic question",
      "Answer 0",
      "Automatic question",
      "Answer 1"
    ])
  })

  it.each([false, true])(
    "pairs concurrent replies with their own question (reverse completion: %s)",
    async (reverse) => {
      const first = deferred(),
        second = deferred()
      const onQuery = vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise)
      const { result } = renderHook(
        () => useChartInterrogation({ data: [], onQuery }),
        { wrapper }
      )
      let requests: Promise<void>[] = []
      act(() => {
        // Identical text still represents two distinct requests.
        requests = [
          result.current.ask("Explain"),
          result.current.ask("Explain")
        ]
        result.current.announce({ text: "Live update" })
      })
      const order = reverse ? [second, first] : [first, second]
      await act(async () => {
        order[0].resolve({
          answer: reverse ? "Second answer" : "First answer",
          annotations: [{ id: reverse ? 2 : 1 }]
        })
        await requests[reverse ? 1 : 0]
      })
      expect(result.current.loading).toBe(true)
      await act(async () => {
        order[1].resolve({
          answer: reverse ? "First answer" : "Second answer",
          annotations: [{ id: reverse ? 1 : 2 }]
        })
        await requests[reverse ? 0 : 1]
      })
      expect(result.current.loading).toBe(false)
      expect(result.current.history.map((m) => m.text)).toEqual([
        "Explain",
        "First answer",
        "Explain",
        "Second answer",
        "Live update"
      ])
      expect(result.current.annotations).toEqual([{ id: 2 }])
    }
  )

  it.each(["resolve", "reject"] as const)(
    "discards a %s after reset without settling the new session",
    async (outcome) => {
      enableConversationArc()
      const old = deferred(),
        current = deferred()
      const onQuery = vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(current.promise)
      const initialAnnotations = [{ id: "authored" }]
      const { result } = renderHook(
        () => useChartInterrogation({ data: [], onQuery, initialAnnotations }),
        { wrapper }
      )
      let oldRequest!: Promise<void>, newRequest!: Promise<void>
      act(() => {
        oldRequest = result.current.ask("Old question")
      })
      act(() => result.current.reset())
      expect(result.current.loading).toBe(false)
      expect(result.current.history).toEqual([])
      act(() => {
        newRequest = result.current.ask("Current question")
      })
      await act(async () => {
        if (outcome === "resolve")
          old.resolve({ answer: "Stale", annotations: [{ id: "stale" }] })
        else old.reject(new Error("Stale failure"))
        await oldRequest
      })
      expect(result.current.loading).toBe(true)
      expect(result.current.history).toEqual([
        { role: "user", text: "Current question" }
      ])
      expect(result.current.annotations).toEqual(initialAnnotations)
      expect(result.current.error).toBeNull()
      expect(
        getConversationArcStore()
          .getEvents()
          .filter((e) => e.type === "interrogation-answered")
      ).toEqual([])
      await act(async () => {
        current.resolve({
          answer: "Current answer",
          annotations: [{ id: "current" }]
        })
        await newRequest
      })
      expect(result.current.loading).toBe(false)
      expect(result.current.history.map((m) => m.text)).toEqual([
        "Current question",
        "Current answer"
      ])
      expect(result.current.annotations).toEqual([
        ...initialAnnotations,
        { id: "current" }
      ])
    }
  )

  it("keeps a stale failure from replacing the latest request's successful state", async () => {
    const old = deferred(),
      current = deferred()
    const onQuery = vi
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise)
    const { result } = renderHook(
      () => useChartInterrogation({ data: [], onQuery }),
      { wrapper }
    )
    let requests: Promise<void>[] = []
    act(() => {
      requests = [result.current.ask("Old"), result.current.ask("Current")]
    })
    await act(async () => {
      current.resolve({ answer: "Success" })
      await requests[1]
    })
    expect(result.current.loading).toBe(true)
    await act(async () => {
      old.reject(new Error("Old failure"))
      await requests[0]
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.history.map((m) => m.text)).toEqual([
      "Old",
      "Sorry, I couldn't process that query.",
      "Current",
      "Success"
    ])
  })

  it.each(["resolve", "reject"] as const)(
    "ignores a %s after unmount, including completion telemetry",
    async (outcome) => {
      enableConversationArc()
      const pending = deferred()
      const { result, unmount } = renderHook(
        () =>
          useChartInterrogation({ data: [], onQuery: () => pending.promise }),
        { wrapper }
      )
      let request!: Promise<void>
      act(() => {
        request = result.current.ask("Question")
      })
      unmount()
      await act(async () => {
        if (outcome === "resolve") pending.resolve({ answer: "Late" })
        else pending.reject(new Error("Late failure"))
        await request
      })
      expect(
        getConversationArcStore()
          .getEvents()
          .map((e) => e.type)
      ).toEqual(["interrogation-asked"])
    }
  )

  it("records answers against the chart context captured when asked", async () => {
    enableConversationArc()
    const pending = deferred()
    const { result, rerender } = renderHook(
      ({ componentName }) =>
        useChartInterrogation({
          data: [],
          onQuery: () => pending.promise,
          componentName
        }),
      { wrapper, initialProps: { componentName: "LineChart" } }
    )
    let request!: Promise<void>
    act(() => {
      request = result.current.ask("Question")
    })
    rerender({ componentName: "BarChart" })
    await act(async () => {
      pending.resolve({ answer: "Answer" })
      await request
    })
    expect(getConversationArcStore().getEvents()).toMatchObject([
      { type: "interrogation-asked", component: "LineChart" },
      { type: "interrogation-answered", component: "LineChart" }
    ])
  })
})
