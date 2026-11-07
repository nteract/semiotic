import * as React from "react"
import { act, cleanup, render, renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { renderToString } from "react-dom/server"
import {
  NetworkZoomProvider,
  useNetworkLOD,
  useNetworkLODLevel
} from "./NetworkZoomContext"
import { createNetworkZoomStore } from "./NetworkZoomStore"

afterEach(cleanup)

it("keeps discrete subscribers idle through scale, pan, viewport, start and settle updates at the same level", () => {
  const store = createNetworkZoomStore()
  const discreteCommits = vi.fn()
  const liveCommits = vi.fn()
  const discrete = renderHook(
    () => useNetworkLODLevel(200, { breakpoints: [100] }),
    {
      wrapper: ({ children }) => (
        <React.StrictMode>
          <NetworkZoomProvider store={store}>
            <React.Profiler id="discrete" onRender={discreteCommits}>
              {children}
            </React.Profiler>
          </NetworkZoomProvider>
        </React.StrictMode>
      )
    }
  )
  const live = renderHook(
    () => useNetworkLOD(200, 100, { breakpoints: [100] }),
    {
      wrapper: ({ children }) => (
        <React.StrictMode>
          <NetworkZoomProvider store={store}>
            <React.Profiler id="live" onRender={liveCommits}>
              {children}
            </React.Profiler>
          </NetworkZoomProvider>
        </React.StrictMode>
      )
    }
  )
  discreteCommits.mockClear()
  liveCommits.mockClear()
  for (let i = 0; i < 50; i++) {
    act(() =>
      store.update({
        zoom: { x: i, y: i, k: i % 2 ? 1 : 0.99 },
        isInteracting: true,
        visibleRect: { x: i, y: i, width: 400, height: 300 }
      })
    )
  }
  expect(discreteCommits).not.toHaveBeenCalled()
  expect(liveCommits).toHaveBeenCalledTimes(50)
  expect(live.result.current).toMatchObject({
    width: 200,
    height: 100,
    isInteracting: true
  })
  act(() =>
    store.update({
      isInteracting: false,
      settledZoom: store.getSnapshot().zoom
    })
  )
  expect(discreteCommits).not.toHaveBeenCalled()
  expect(liveCommits).toHaveBeenCalledTimes(51)
  act(() => store.update({ zoom: { x: 0, y: 0, k: 0.2 }, isInteracting: true }))
  expect(discrete.result.current).toBe(0)
  expect(discreteCommits).toHaveBeenCalledTimes(1)
  discrete.unmount()
  live.unmount()
  act(() => store.update({ zoom: { x: 0, y: 0, k: 2 }, isInteracting: false }))
  expect(discreteCommits).toHaveBeenCalledTimes(1)
})

it.each([false, true])(
  "matches live LOD hysteresis, focused detail and prop changes (mount moving: %s)",
  (moving) => {
    const store = createNetworkZoomStore({
      zoom: { x: 0, y: 0, k: 0.65 },
      settledZoom: { x: 0, y: 0, k: 1 },
      isInteracting: moving,
      visibleRect: null
    })
    const defaults = { width: 200, focused: false, breakpoints: [55, 125, 235] }
    const view = renderHook(
      ({ width, focused, breakpoints }) => {
        const options = { breakpoints, hysteresis: 8, keepDetail: focused }
        return [
          useNetworkLODLevel(width, options),
          useNetworkLOD(width, 100, options).level
        ]
      },
      {
        initialProps: defaults,
        wrapper: ({ children }) => (
          <NetworkZoomProvider store={store}>{children}</NetworkZoomProvider>
        )
      }
    )
    const levels = (expected: number) =>
      expect(view.result.current).toEqual([expected, expected])
    levels(moving ? 0 : 2)
    act(() => store.update({ isInteracting: false }))
    levels(2) // A newly mounted card establishes detail without a promotion dead band.
    const scale = (width: number, isInteracting: boolean) =>
      act(() =>
        store.update({
          zoom: { x: 0, y: 0, k: width / 200 },
          isInteracting
        })
      )
    scale(118, true)
    levels(2)
    scale(116, true)
    levels(1)
    scale(130, true)
    levels(1)
    scale(130, false)
    levels(1)
    scale(134, false)
    levels(2)
    scale(260, true)
    levels(2)
    scale(260, false)
    levels(3)
    scale(30, true)
    levels(0)
    view.rerender({ ...defaults, focused: true })
    levels(3)
    view.rerender(defaults)
    levels(0)
    scale(130, false)
    levels(1)
    view.rerender({ ...defaults, width: 400 })
    levels(3)
    view.rerender({ ...defaults, breakpoints: [125, NaN, 55] })
    levels(2)
    view.rerender({ ...defaults, breakpoints: [] })
    levels(0)
    const breakpoints = [300]
    view.rerender({ ...defaults, breakpoints })
    levels(0)
    breakpoints[0] = 100
    view.rerender({ ...defaults, breakpoints })
    levels(1)
  }
)

it("provides the same discrete detail during SSR and outside a chart", () => {
  function Card() {
    return (
      <output>
        {useNetworkLODLevel(130, { breakpoints: [55, 125, 235] })}
      </output>
    )
  }
  expect(renderToString(<Card />)).toBe("<output>2</output>")
  const view = render(<Card />)
  expect(view.container.textContent).toBe("2")
})
