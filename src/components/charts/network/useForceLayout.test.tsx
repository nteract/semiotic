// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useForceLayout } from "./useForceLayout"

const NODES = Array.from({ length: 8 }, (_, i) => ({ id: `n${i}` }))
const EDGES = NODES.slice(1).map((node, i) => ({
  source: `n${i}`,
  target: node.id
}))

describe("useForceLayout", () => {
  it("resolves pending → ready on a cold client mount", async () => {
    const { result } = renderHook(() =>
      useForceLayout(NODES, EDGES, { seed: 3, iterations: 40 })
    )
    await waitFor(() => expect(result.current.status).toBe("ready"))
    expect(result.current.positions).not.toBeNull()
    expect(Object.keys(result.current.positions!)).toHaveLength(NODES.length)
    expect(result.current.error).toBeNull()
  })

  it("serves a remount of the same graph + options from the memo without re-entering pending", async () => {
    const options = { seed: 5, iterations: 40 }
    const first = renderHook(() => useForceLayout(NODES, EDGES, options))
    await waitFor(() => expect(first.result.current.status).toBe("ready"))
    const settled = first.result.current.positions
    first.unmount()

    const statuses: string[] = []
    const second = renderHook(() => {
      const r = useForceLayout(NODES, EDGES, options)
      statuses.push(r.status)
      return r
    })
    // The very first render is already "ready" — no loading flash on remount.
    expect(statuses[0]).toBe("ready")
    expect(second.result.current.positions).toBe(settled)
    second.unmount()
  })

  it("recomputes when the seed changes", async () => {
    const first = renderHook(() =>
      useForceLayout(NODES, EDGES, { seed: 7, iterations: 40 })
    )
    await waitFor(() => expect(first.result.current.status).toBe("ready"))
    const seven = first.result.current.positions
    first.unmount()

    const second = renderHook(() =>
      useForceLayout(NODES, EDGES, { seed: 8, iterations: 40 })
    )
    expect(second.result.current.status).toBe("pending")
    await waitFor(() => expect(second.result.current.status).toBe("ready"))
    expect(second.result.current.positions).not.toBe(seven)
    second.unmount()
  })

  it("does not memoize when an option is a function", async () => {
    const options = { seed: 9, iterations: 40, nodeRadius: () => 4 }
    const first = renderHook(() => useForceLayout(NODES, EDGES, options))
    await waitFor(() => expect(first.result.current.status).toBe("ready"))
    first.unmount()

    const second = renderHook(() => useForceLayout(NODES, EDGES, options))
    expect(second.result.current.status).toBe("pending")
    await waitFor(() => expect(second.result.current.status).toBe("ready"))
    second.unmount()
  })
})
