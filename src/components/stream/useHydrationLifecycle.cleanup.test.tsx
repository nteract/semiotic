/**
 * Regression coverage for the `useHydrationLifecycle` cleanup-on-deps-change bug.
 *
 * The hook returned its `cleanup` option from inside a layout effect
 * with deps `[hydrated, wasHydratingFromSSR]`. React runs an effect's
 * cleanup on every deps change — and `hydrated` flips false→true
 * exactly once after the first commit — so the cleanup ran
 * immediately after the first paint. For the four Stream Frames
 * `cleanup: () => adapterRef.current?.clear()` cleared the streaming
 * `DataSourceAdapter`, wiping any rows a parent had pushed via a
 * callback ref pre-seed pattern. The `adapter.clear()` reset the
 * `pushBuffer` to `[]` and the queued microtask flush then saw
 * `pushBuffer.length === 0` and returned without calling
 * `store.ingest`.
 *
 * Reported on `/features/push-api` "Update on BarChart" demo: the
 * `initRef` callback pushed 4 initial bars; the post-hydration
 * cleanup wiped them; "Update Random Bar" / "Randomize All" had
 * nothing to update. Same shape on `/charts/sankey-diagram`'s push
 * demos and any consumer that uses `ref={callback}` to pre-seed.
 *
 * The fix moves the unmount cleanup to its own `useEffect([])` so it
 * fires once at unmount and never on a deps change. This test pins
 * that contract: the cleanup must fire exactly once across the
 * mount→hydrate→unmount lifecycle.
 */
import * as React from "react"
import { useRef } from "react"
import { render, act } from "@testing-library/react"
import { describe, it, expect, afterEach } from "vitest"
import { useHydrationLifecycle } from "./useHydration"

describe("useHydrationLifecycle cleanup", () => {
  afterEach(() => {
    // The second test stashes a `setHydrated` setter on globalThis so
    // it can flip the dep from outside the component. Clean it up so
    // it doesn't leak into other test files in the shared environment.
    delete (globalThis as { __setHydrated?: unknown }).__setHydrated
  })

  it("fires the cleanup option exactly once on unmount, not on every deps change", () => {
    const calls: string[] = []
    function Probe() {
      const storeRef = useRef<{ cancelIntroAnimation?: () => void } | null>({})
      const dirtyRef = useRef(false)
      const renderFnRef = useRef(() => { calls.push("renderFn") })
      useHydrationLifecycle({
        // Internally `useHydration` flips this from false to true
        // after the first commit. We hard-wire it to true here and
        // also test the false→true path below.
        hydrated: true,
        wasHydratingFromSSR: false,
        storeRef,
        dirtyRef,
        renderFnRef,
        cleanup: () => calls.push("cleanup"),
      })
      return null
    }
    const { unmount } = render(<Probe />)
    // Mount fired the layout effect (one renderFn) but not the
    // cleanup — that's reserved for unmount.
    expect(calls).toEqual(["renderFn"])
    unmount()
    expect(calls).toEqual(["renderFn", "cleanup"])
  })

  it("cancels a queued render before synchronously painting hydration state", () => {
    const calls: string[] = []
    function Probe() {
      const storeRef = useRef<{ cancelIntroAnimation?: () => void } | null>({})
      const dirtyRef = useRef(false)
      const renderFnRef = useRef(() => { calls.push("render") })
      useHydrationLifecycle({
        hydrated: true,
        wasHydratingFromSSR: false,
        storeRef,
        dirtyRef,
        renderFnRef,
        cancelRender: () => calls.push("cancel")
      })
      return null
    }

    render(<Probe />)
    expect(calls).toEqual(["cancel", "render"])
  })

  it("does NOT fire cleanup when hydrated flips false→true (the regression case)", async () => {
    const calls: string[] = []
    function Probe() {
      const [hydrated, setHydrated] = React.useState(false)
      const storeRef = useRef<{ cancelIntroAnimation?: () => void } | null>({})
      const dirtyRef = useRef(false)
      const renderFnRef = useRef(() => { calls.push(`renderFn(hydrated=${hydrated})`) })
      // Update the renderFn closure on every render so it sees the
      // current `hydrated` value.
      renderFnRef.current = () => { calls.push(`renderFn(hydrated=${hydrated})`) }
      useHydrationLifecycle({
        hydrated,
        wasHydratingFromSSR: false,
        storeRef,
        dirtyRef,
        renderFnRef,
        cleanup: () => calls.push("cleanup"),
      })
      // Expose a setter so the test can flip hydrated from outside.
      ;(globalThis as { __setHydrated?: (v: boolean) => void }).__setHydrated = setHydrated
      return null
    }
    let unmount: () => void = () => {}
    await act(async () => {
      const r = render(<Probe />)
      unmount = r.unmount
    })
    expect(calls).toEqual(["renderFn(hydrated=false)"])
    // Flip the hydrated flag — exactly the transition that previously
    // fired the cleanup.
    await act(async () => {
      ;(globalThis as { __setHydrated?: (v: boolean) => void }).__setHydrated?.(true)
    })
    // The layout effect re-fires (new renderFn call), but the
    // cleanup must NOT fire — that was the regression.
    expect(calls).toEqual([
      "renderFn(hydrated=false)",
      "renderFn(hydrated=true)",
    ])
    unmount()
    expect(calls).toEqual([
      "renderFn(hydrated=false)",
      "renderFn(hydrated=true)",
      "cleanup",
    ])
  })

  it("uses the latest cleanup closure even if the prop changes between renders", () => {
    // Defensive guarantee: a parent that recreates the cleanup arrow
    // every render shouldn't see a stale closure fire on unmount.
    const calls: string[] = []
    let activeCleanup = () => { calls.push("cleanup-A") }
    function Probe({ which }: { which: "A" | "B" }) {
      const storeRef = useRef<{ cancelIntroAnimation?: () => void } | null>({})
      const dirtyRef = useRef(false)
      const renderFnRef = useRef(() => {})
      useHydrationLifecycle({
        hydrated: true,
        wasHydratingFromSSR: false,
        storeRef,
        dirtyRef,
        renderFnRef,
        cleanup: activeCleanup,
      })
      return <span>{which}</span>
    }
    const { rerender, unmount } = render(<Probe which="A" />)
    activeCleanup = () => { calls.push("cleanup-B") }
    rerender(<Probe which="B" />)
    expect(calls).toEqual([])
    unmount()
    // The latest closure (B) must run, not the stale A closure.
    expect(calls).toEqual(["cleanup-B"])
  })
})
