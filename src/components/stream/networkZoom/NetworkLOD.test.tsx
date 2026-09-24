import * as React from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, expect, it } from "vitest"
import { NetworkZoomContext, useNetworkLOD } from "./NetworkZoomContext"

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
      <NetworkZoomContext.Provider
        value={{
          zoom: { x: 0, y: 0, k: pixels / 260 },
          settledZoom: { x: 0, y: 0, k: 1 },
          isInteracting: moving,
          visibleRect: null
        }}
      >
        <Card />
      </NetworkZoomContext.Provider>
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
    <NetworkZoomContext.Provider
      value={{
        zoom: { x: 0, y: 0, k },
        settledZoom: { x: 0, y: 0, k: 1 },
        isInteracting: moving,
        visibleRect: null
      }}
    >
      <Card focused={focused} />
    </NetworkZoomContext.Provider>
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
