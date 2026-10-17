import * as React from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import {
  NetworkZoomProvider,
  useNetworkLOD,
  useNetworkProjectedSize,
  useNetworkZoom
} from "./NetworkZoomContext"
import type { NetworkZoomState } from "./types"

afterEach(cleanup)

it.each([
  [60, 1],
  [130, 2],
  [240, 3]
])(
  "promotes a card mounted during motion to the first settled %i px level without an extra dead band",
  (width, expected) => {
    const breakpoints = [55, 125, 235]
    function Card() {
      const { level } = useNetworkLOD(260, 216, { breakpoints, hysteresis: 8 })
      return <output data-testid="level">{level}</output>
    }
    const tree = (pixels: number, moving: boolean) => (
      <NetworkZoomProvider
        value={{
          zoom: { x: 0, y: 0, k: pixels / 260 },
          settledZoom: { x: 0, y: 0, k: 1 },
          isInteracting: moving,
          visibleRect: null
        }}
      >
        <Card />
      </NetworkZoomProvider>
    )
    const view = render(tree(width, true))
    const level = () => Number(view.getByTestId("level").textContent)
    expect(level()).toBe(0)
    view.rerender(tree(width, false))
    expect(level()).toBe(expected)
    // Once there is a real settled level, hysteresis still prevents flicker.
    view.rerender(tree(breakpoints[expected - 1] - 7, true))
    expect(level()).toBe(expected)
    view.rerender(tree(breakpoints[expected - 1] - 9, true))
    expect(level()).toBe(expected - 1)
  }
)

it("demotes during motion, delays promotion, and keeps focused detail across thresholds", () => {
  function Card({ focused }: { focused: boolean }) {
    const lod = useNetworkLOD(200, 100, {
      breakpoints: [100, 180],
      hysteresis: 10,
      keepDetail: focused
    })
    return <output data-testid="lod">{JSON.stringify(lod)}</output>
  }
  const tree = (k: number, moving = false, focused = false) => (
    <NetworkZoomProvider
      value={{
        zoom: { x: 0, y: 0, k },
        settledZoom: { x: 0, y: 0, k: 1 },
        isInteracting: moving,
        visibleRect: null
      }}
    >
      <Card focused={focused} />
    </NetworkZoomProvider>
  )
  const view = render(tree(1))
  const state = () => JSON.parse(view.getByTestId("lod").textContent!)
  expect(state()).toMatchObject({ level: 2, width: 200, height: 100 })
  view.rerender(tree(0.86, true))
  expect(state().level).toBe(2) // Dead band around 180.
  view.rerender(tree(0.8, true))
  expect(state().level).toBe(1)
  view.rerender(tree(1.2, true))
  expect(state()).toMatchObject({ level: 1, width: 240, settledWidth: 200 })
  view.rerender(tree(1.2))
  expect(state().level).toBe(2)
  view.rerender(tree(0.1, true, true))
  expect(state().level).toBe(2)
  view.rerender(tree(0.1, true, false))
  expect(state().level).toBe(0)
})

it("publishes live camera/viewport facts without rerendering size and LOD subscribers", () => {
  const renders = { zoom: 0, size: 0, lod: 0 }
  function Camera() {
    const state = useNetworkZoom()
    renders.zoom++
    return <output data-testid="camera">{JSON.stringify(state)}</output>
  }
  function Size() {
    const size = useNetworkProjectedSize(200, 100)
    renders.size++
    return <output data-testid="size">{JSON.stringify(size)}</output>
  }
  function Card() {
    const lod = useNetworkLOD(200, 100, { breakpoints: [100] })
    renders.lod++
    return <output data-testid="card">{JSON.stringify(lod)}</output>
  }
  const children = (
    <>
      <Camera />
      <Size />
      <Card />
    </>
  )
  const state: NetworkZoomState = {
    zoom: { x: 0, y: 0, k: 1 },
    settledZoom: { x: 0, y: 0, k: 1 },
    isInteracting: true,
    visibleRect: null
  }
  const tree = (value: NetworkZoomState) => (
    <NetworkZoomProvider value={value}>{children}</NetworkZoomProvider>
  )
  const view = render(tree(state))
  const before = { ...renders }
  const pan = {
    ...state,
    zoom: { x: 60, y: 20, k: 1 },
    visibleRect: { x: -60, y: -20, width: 400, height: 300 }
  }
  view.rerender(tree(pan))
  expect(renders).toEqual({ ...before, zoom: before.zoom + 1 })
  expect(JSON.parse(view.getByTestId("camera").textContent!)).toEqual(pan)

  // Scale still changes all live pixel sizes during motion, even at level 0.
  view.rerender(tree({ ...pan, zoom: { ...pan.zoom, k: 0.3 } }))
  expect(JSON.parse(view.getByTestId("size").textContent!)).toMatchObject({
    width: 60,
    height: 30,
    settledWidth: 200,
    isInteracting: true
  })
  expect(JSON.parse(view.getByTestId("card").textContent!)).toMatchObject({
    level: 0,
    width: 60,
    height: 30,
    settledWidth: 200
  })
  expect(renders.size).toBe(before.size + 1)
  expect(renders.lod).toBe(before.lod + 1)
})
