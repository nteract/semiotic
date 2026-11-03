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
import { useRef } from "react"
import { renderHook } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { useHydrationLifecycle } from "./useHydration"

describe("useHydrationLifecycle cleanup", () => {
  it.each([false, true])("fires cleanup once on unmount (SSR handoff: %s)", (wasHydratingFromSSR) => {
    const paint = vi.fn()
    const cleanup = vi.fn()
    const { unmount } = renderHook(() => {
      const storeRef = useRef<{ cancelIntroAnimation?: () => void } | null>({})
      const dirtyRef = useRef(false)
      const renderFnRef = useRef(paint)
      useHydrationLifecycle({
        hydrated: true,
        wasHydratingFromSSR,
        storeRef,
        dirtyRef,
        renderFnRef,
        cleanup,
      })
    })
    // Only an SSR handoff paints synchronously; both modes clean up on unmount.
    expect(paint).toHaveBeenCalledTimes(wasHydratingFromSSR ? 1 : 0)
    expect(cleanup).not.toHaveBeenCalled()
    unmount()
    expect(cleanup).toHaveBeenCalledOnce()
    if (wasHydratingFromSSR) expect(paint).toHaveBeenCalledBefore(cleanup)
  })

  it("cancels a queued render before synchronously painting SSR hydration state", () => {
    const paint = vi.fn()
    const cancelRender = vi.fn()
    renderHook(() => {
      const storeRef = useRef<{ cancelIntroAnimation?: () => void } | null>({})
      const dirtyRef = useRef(false)
      const renderFnRef = useRef(paint)
      useHydrationLifecycle({
        hydrated: true,
        wasHydratingFromSSR: true,
        storeRef,
        dirtyRef,
        renderFnRef,
        cancelRender,
      })
    })
    expect(cancelRender).toHaveBeenCalledOnce()
    expect(paint).toHaveBeenCalledOnce()
    expect(cancelRender).toHaveBeenCalledBefore(paint)
  })

  it("does NOT fire cleanup when hydrated flips false→true (the regression case)", () => {
    const paint = vi.fn<(hydrated: boolean) => void>()
    const cleanup = vi.fn()
    const { rerender, unmount } = renderHook(({ hydrated }) => {
      const storeRef = useRef<{ cancelIntroAnimation?: () => void } | null>({})
      const dirtyRef = useRef(false)
      const renderFnRef = useRef(() => paint(hydrated))
      renderFnRef.current = () => paint(hydrated)
      useHydrationLifecycle({
        hydrated,
        wasHydratingFromSSR: true,
        storeRef,
        dirtyRef,
        renderFnRef,
        cleanup,
      })
    }, { initialProps: { hydrated: false } })
    expect(paint).not.toHaveBeenCalled()
    expect(cleanup).not.toHaveBeenCalled()

    // Drive the same dependency transition as SSR hydration through React.
    rerender({ hydrated: true })
    expect(paint).toHaveBeenCalledExactlyOnceWith(true)
    expect(cleanup).not.toHaveBeenCalled()
    unmount()
    expect(cleanup).toHaveBeenCalledOnce()
    expect(paint).toHaveBeenCalledBefore(cleanup)
  })

  it("uses the latest cleanup closure even if the prop changes between renders", () => {
    const cleanupA = vi.fn()
    const cleanupB = vi.fn()
    const { rerender, unmount } = renderHook(({ cleanup }) => {
      const storeRef = useRef<{ cancelIntroAnimation?: () => void } | null>({})
      const dirtyRef = useRef(false)
      const renderFnRef = useRef(() => {})
      useHydrationLifecycle({
        hydrated: true,
        wasHydratingFromSSR: false,
        storeRef,
        dirtyRef,
        renderFnRef,
        cleanup,
      })
    }, { initialProps: { cleanup: cleanupA } })
    rerender({ cleanup: cleanupB })
    expect(cleanupA).not.toHaveBeenCalled()
    expect(cleanupB).not.toHaveBeenCalled()
    unmount()
    expect(cleanupA).not.toHaveBeenCalled()
    expect(cleanupB).toHaveBeenCalledOnce()
  })
})
