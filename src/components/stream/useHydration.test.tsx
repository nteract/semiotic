/**
 * Phase 4 regression — hydration intro-cancellation.
 *
 * The hook layer that distinguishes "we hydrated from SSR HTML" from
 * "we mounted in pure client mode," plus the per-store
 * `cancelIntroAnimation` method, drive Phase 4's behavior:
 *
 *   - SSR rehydration: server already painted the chart in its final
 *     state via the SVG branch, so the canvas's first paint should
 *     show the same final state directly — no intro flash.
 *   - Pure CSR: SVG branch's render is overwritten before the browser
 *     paints, so the intro animation on the canvas is the user's
 *     first sight of the chart and should run normally.
 *
 * The two tests below assert this distinction at the hook + store
 * level. End-to-end paint behavior is covered indirectly by the
 * existing hydration parity matrix tests.
 */
import * as React from "react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { act } from "react"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { useHydration, useWasHydratingFromSSR } from "./useHydration"

function Probe({ onResult }: { onResult: (v: { hydrated: boolean; ssr: boolean }) => void }) {
  const hydrated = useHydration()
  const ssr = useWasHydratingFromSSR()
  React.useEffect(() => {
    onResult({ hydrated, ssr })
  }, [hydrated, ssr, onResult])
  return <div data-testid="probe" data-hydrated={String(hydrated)} data-ssr={String(ssr)}>probe</div>
}

describe("useHydration / useWasHydratingFromSSR", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  it("renderToString reports SSR mode", () => {
    const html = renderToString(<Probe onResult={() => {}} />)
    // On the server `useHydration` returns false (no effect fires) and
    // `useWasHydratingFromSSR` returns true (getServerSnapshot value).
    expect(html).toContain('data-hydrated="false"')
    expect(html).toContain('data-ssr="true"')
  })

  it("hydrating from server HTML keeps `wasHydratingFromSSR === true` after commit", () => {
    const html = renderToString(<Probe onResult={() => {}} />)
    container.innerHTML = html

    const results: Array<{ hydrated: boolean; ssr: boolean }> = []
    let root: ReturnType<typeof hydrateRoot> | null = null
    act(() => {
      root = hydrateRoot(container, <Probe onResult={(r) => results.push(r)} />)
    })

    // After hydration, `hydrated` is true and `wasHydratingFromSSR`
    // must remain true — that's the signal that drives intro
    // cancellation in the Stream Frames.
    const last = results[results.length - 1]
    expect(last.hydrated).toBe(true)
    expect(last.ssr).toBe(true)

    root?.unmount()
  })

  it("a fresh client mount (no hydration) reports `wasHydratingFromSSR === false`", async () => {
    // `createRoot` instead of `hydrateRoot` is the CSR path. React
    // never calls `getServerSnapshot`, so `useWasHydratingFromSSR`
    // captures the CSR snapshot (`false`) on first render.
    const { createRoot } = await import("react-dom/client")
    const results: Array<{ hydrated: boolean; ssr: boolean }> = []
    let root: ReturnType<typeof createRoot> | null = null
    act(() => {
      root = createRoot(container)
      root.render(<Probe onResult={(r) => results.push(r)} />)
    })

    const last = results[results.length - 1]
    expect(last.hydrated).toBe(true)
    // CSR path — server snapshot was never read. The probe renders
    // fresh, intro animation should run normally on charts that use
    // the same hook.
    expect(last.ssr).toBe(false)

    root?.unmount()
  })
})
