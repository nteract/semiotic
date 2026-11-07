import * as React from "react"
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import {
  NetworkZoomProvider,
  useNetworkLOD,
  useNetworkProjectedSize,
  useNetworkZoom
} from "./NetworkZoomContext"
import { createNetworkZoomStore } from "./NetworkZoomStore"

afterEach(cleanup)

it.each([
  [60, 1],
  [130, 2],
  [240, 3]
])(
  "promotes a card mounted during motion to the first settled %i px level without an extra dead band",
  (width, expected) => {
    const breakpoints = [55, 125, 235]
    const store = createNetworkZoomStore({
      zoom: { x: 0, y: 0, k: width / 260 },
      settledZoom: { x: 0, y: 0, k: 1 },
      isInteracting: true,
      visibleRect: null
    })
    const { result } = renderHook(
      () => useNetworkLOD(260, 216, { breakpoints, hysteresis: 8 }),
      {
        wrapper: ({ children }) => (
          <NetworkZoomProvider store={store}>{children}</NetworkZoomProvider>
        )
      }
    )
    expect(result.current.level).toBe(0)
    act(() => store.update({ isInteracting: false }))
    expect(result.current.level).toBe(expected)
    // Once there is a real settled level, hysteresis still prevents flicker.
    act(() =>
      store.update({
        zoom: { x: 0, y: 0, k: (breakpoints[expected - 1] - 7) / 260 },
        isInteracting: true
      })
    )
    expect(result.current.level).toBe(expected)
    act(() =>
      store.update({
        zoom: { x: 0, y: 0, k: (breakpoints[expected - 1] - 9) / 260 }
      })
    )
    expect(result.current.level).toBe(expected - 1)
  }
)

it("demotes during motion, delays promotion, and keeps focused detail across thresholds", () => {
  const store = createNetworkZoomStore()
  const { result, rerender } = renderHook(
    ({ focused }) =>
      useNetworkLOD(200, 100, {
        breakpoints: [100, 180],
        hysteresis: 10,
        keepDetail: focused
      }),
    {
      initialProps: { focused: false },
      wrapper: ({ children }) => (
        <NetworkZoomProvider store={store}>{children}</NetworkZoomProvider>
      )
    }
  )
  const scale = (k: number, isInteracting = true) =>
    act(() => store.update({ zoom: { x: 0, y: 0, k }, isInteracting }))
  expect(result.current).toMatchObject({ level: 2, width: 200, height: 100 })
  scale(0.86)
  expect(result.current.level).toBe(2) // Dead band around 180.
  scale(0.8)
  expect(result.current.level).toBe(1)
  scale(1.2)
  expect(result.current).toMatchObject({
    level: 1,
    width: 240,
    settledWidth: 200
  })
  scale(1.2, false)
  expect(result.current.level).toBe(2)
  rerender({ focused: true })
  scale(0.1)
  expect(result.current.level).toBe(2)
  rerender({ focused: false })
  expect(result.current.level).toBe(0)
})

it("publishes live camera/viewport facts without rerendering size and LOD subscribers", () => {
  const store = createNetworkZoomStore({
    zoom: { x: 0, y: 0, k: 1 },
    settledZoom: { x: 0, y: 0, k: 1 },
    isInteracting: true,
    visibleRect: null
  })
  const wrapper = ({ children }: React.PropsWithChildren) => (
    <NetworkZoomProvider store={store}>{children}</NetworkZoomProvider>
  )
  const cameraHook = vi.fn(() => useNetworkZoom())
  const sizeHook = vi.fn(() => useNetworkProjectedSize(200, 100))
  const lodHook = vi.fn(() => useNetworkLOD(200, 100, { breakpoints: [100] }))
  const camera = renderHook(cameraHook, { wrapper })
  const size = renderHook(sizeHook, { wrapper })
  const lod = renderHook(lodHook, { wrapper })
  act(() => store.update({ isInteracting: true }))
  cameraHook.mockClear()
  sizeHook.mockClear()
  lodHook.mockClear()
  const pan = {
    zoom: { x: 60, y: 20, k: 1 },
    visibleRect: { x: -60, y: -20, width: 400, height: 300 }
  }
  act(() => store.update(pan))
  expect(cameraHook).toHaveBeenCalledTimes(1)
  expect(sizeHook).not.toHaveBeenCalled()
  expect(lodHook).not.toHaveBeenCalled()
  expect(camera.result.current).toMatchObject(pan)

  // Scale still changes all live pixel sizes during motion.
  act(() => store.update({ zoom: { ...pan.zoom, k: 0.3 } }))
  expect(size.result.current).toMatchObject({
    width: 60,
    height: 30,
    settledWidth: 200,
    isInteracting: true
  })
  expect(lod.result.current).toMatchObject({
    level: 0,
    width: 60,
    height: 30,
    settledWidth: 200
  })
  expect(sizeHook).toHaveBeenCalledTimes(1)
  expect(lodHook).toHaveBeenCalledTimes(1)
})
