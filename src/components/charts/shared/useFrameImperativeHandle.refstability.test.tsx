/**
 * Regression coverage for the useFrameImperativeHandle ref-stability contract.
 *
 * The hook used to default `deps` to undefined, which meant React re-ran
 * the factory on every parent render and produced a fresh imperative
 * handle each time. For consumers who attached via a *callback ref*
 * (`<Chart ref={cb} />`), React responded by calling `cb(null)` then
 * `cb(newHandle)` on every render. Anything the callback did with that
 * `null` transition — like the canonical `initialized.current = false`
 * pre-seed pattern in `/features/push-api`'s NetworkDemo `initRef` —
 * fired again, re-pushing the original data and undoing whatever
 * mutation the user had just performed (the "Remove Cache" button on
 * the network demo would remove the Cache node, then the very next
 * re-render's seed would push the original 5 edges back, restoring
 * Cache + its 2 edges within a single frame).
 *
 * The fix defaults `deps` to `[]` so the handle is created once at
 * mount and never re-emitted to the consumer's callback ref.
 */
import * as React from "react"
import { useRef, useCallback } from "react"
import { render, act } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { useFrameImperativeHandle } from "./useFrameImperativeHandle"
import type { RealtimeFrameHandle } from "../../realtime/types"

describe("useFrameImperativeHandle reference stability", () => {
  it("emits the same handle reference across parent re-renders (callback-ref attach pattern)", async () => {
    const callbackArgs: Array<unknown | null> = []
    let bumpParent: (() => void) | null = null

    function Wrapper() {
      const [, setN] = React.useState(0)
      bumpParent = useCallback(() => setN((n) => n + 1), [])
      return <Inner />
    }

    function Inner() {
      const frameRef = useRef<RealtimeFrameHandle>({
        push: () => {},
        pushMany: () => {},
        remove: () => [],
        update: () => [],
        clear: () => {},
        getData: () => [],
        getScales: () => null,
      })
      // Stable callback ref — same identity across renders.
      const cbRef = useCallback((handle: unknown) => {
        callbackArgs.push(handle)
      }, [])
      useFrameImperativeHandle(cbRef, { variant: "xy", frameRef: frameRef as React.RefObject<unknown> })
      return null
    }

    await act(async () => { render(<Wrapper />) })
    // After mount: callback fired once with the handle.
    expect(callbackArgs.length).toBe(1)
    expect(callbackArgs[0]).not.toBeNull()
    const handleAtMount = callbackArgs[0]

    // Force three re-renders of the parent. Without the `[]`-deps fix,
    // each render re-emits the callback ref with `null` then a fresh
    // handle (3 × 2 = 6 extra calls). With the fix, the callback
    // never re-fires.
    await act(async () => { bumpParent?.() })
    await act(async () => { bumpParent?.() })
    await act(async () => { bumpParent?.() })
    expect(callbackArgs.length).toBe(1)
    expect(callbackArgs[0]).toBe(handleAtMount)
  })

  it("does not re-fire a callback-ref pre-seed pattern when the parent re-renders", async () => {
    // Mirrors the `/features/push-api` NetworkDemo `initRef` shape.
    // The bug: parent re-render re-creates the handle, callback ref
    // fires `null` (initialized=false) then new handle (re-seeds).
    let pushCalls = 0
    let bumpParent: (() => void) | null = null

    function Wrapper() {
      const [, setN] = React.useState(0)
      bumpParent = useCallback(() => setN((n) => n + 1), [])
      return <Inner />
    }

    function Inner() {
      const initialized = useRef(false)
      const frameRef = useRef<RealtimeFrameHandle>({
        push: () => { pushCalls++ },
        pushMany: () => { pushCalls++ },
        remove: () => [],
        update: () => [],
        clear: () => {},
        getData: () => [],
        getScales: () => null,
      })
      const initRef = useCallback((handle: RealtimeFrameHandle | null) => {
        if (!handle) { initialized.current = false; return }
        if (!initialized.current) {
          initialized.current = true
          handle.push({})
          handle.push({})
          handle.push({})
        }
      }, [])
      useFrameImperativeHandle(initRef, { variant: "xy", frameRef })
      return null
    }

    await act(async () => { render(<Wrapper />) })
    expect(pushCalls).toBe(3)

    // Three parent re-renders — must not re-trigger the seed.
    await act(async () => { bumpParent?.() })
    await act(async () => { bumpParent?.() })
    await act(async () => { bumpParent?.() })
    expect(pushCalls).toBe(3)
  })
})
