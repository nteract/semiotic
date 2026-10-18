import * as React from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
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
  const commits = { discrete: 0, live: 0 }
  function Discrete() {
    const level = useNetworkLODLevel(200, { breakpoints: [100] })
    return <output data-testid="level">{level}</output>
  }
  function Live() {
    const lod = useNetworkLOD(200, 100, { breakpoints: [100] })
    return <output data-testid="live">{JSON.stringify(lod)}</output>
  }
  const view = render(
    <React.StrictMode>
      <NetworkZoomProvider store={store}>
        <React.Profiler id="discrete" onRender={() => commits.discrete++}>
          <Discrete />
        </React.Profiler>
        <React.Profiler id="live" onRender={() => commits.live++}>
          <Live />
        </React.Profiler>
      </NetworkZoomProvider>
    </React.StrictMode>
  )
  commits.discrete = commits.live = 0
  for (let i = 0; i < 50; i++) {
    act(() =>
      store.update({
        zoom: { x: i, y: i, k: i % 2 ? 1 : 0.99 },
        isInteracting: true,
        visibleRect: { x: i, y: i, width: 400, height: 300 }
      })
    )
  }
  expect(commits).toEqual({ discrete: 0, live: 50 })
  expect(JSON.parse(view.getByTestId("live").textContent!)).toMatchObject({
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
  expect(commits).toEqual({ discrete: 0, live: 51 })
  act(() => store.update({ zoom: { x: 0, y: 0, k: 0.2 }, isInteracting: true }))
  expect(view.getByTestId("level").textContent).toBe("0")
  expect(commits.discrete).toBe(1)
  view.unmount()
  act(() => store.update({ zoom: { x: 0, y: 0, k: 2 }, isInteracting: false }))
  expect(commits.discrete).toBe(1)
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
    function Card({
      width = 200,
      focused = false,
      breakpoints = [55, 125, 235]
    }) {
      const options = { breakpoints, hysteresis: 8, keepDetail: focused }
      const level = useNetworkLODLevel(width, options)
      const live = useNetworkLOD(width, 100, options)
      return <output>{JSON.stringify([level, live.level])}</output>
    }
    const tree = (props = {}) => (
      <NetworkZoomProvider store={store}>
        <Card {...props} />
      </NetworkZoomProvider>
    )
    const view = render(tree())
    const levels = (expected: number) =>
      expect(view.container.textContent).toBe(
        JSON.stringify([expected, expected])
      )
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
    view.rerender(tree({ focused: true }))
    levels(3)
    view.rerender(tree())
    levels(0)
    scale(130, false)
    levels(1)
    view.rerender(tree({ width: 400 }))
    levels(3)
    view.rerender(tree({ breakpoints: [125, NaN, 55] }))
    levels(2)
    view.rerender(tree({ breakpoints: [] }))
    levels(0)
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
