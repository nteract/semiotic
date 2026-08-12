import * as React from "react"
import { act } from "react"
import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Datum } from "../shared/datumTypes"
import type { StreamPhysicsFrameProps } from "../../stream/physics/StreamPhysicsFrame"
import { CollisionSwarmChart } from "./CollisionSwarmChart"
import { EventDropChart } from "./EventDropChart"
import { GaltonBoardChart } from "./GaltonBoardChart"
import { PacketFlowChart } from "./PacketFlowChart"
import { UnitPileChart } from "./UnitPileChart"

let lastFrameProps: StreamPhysicsFrameProps | null = null

vi.mock("../../stream/physics/StreamPhysicsFrame", () => ({
  __esModule: true,
  default: React.forwardRef<unknown, StreamPhysicsFrameProps>((props, _ref) => {
    lastFrameProps = props
    return <div data-testid="captured-physics-frame" />
  })
}))

const cases: Array<{
  name: string
  datum: Datum
  chart: (
    bodyStyle: NonNullable<StreamPhysicsFrameProps["bodyStyle"]>
  ) => React.ReactElement
}> = [
  {
    name: "GaltonBoardChart",
    datum: { id: "galton", value: 1 },
    chart: (bodyStyle) => (
      <GaltonBoardChart
        data={[{ id: "galton", value: 1 }]}
        valueAccessor="value"
        frameProps={{ bodyStyle }}
      />
    )
  },
  {
    name: "CollisionSwarmChart",
    datum: { id: "collision", x: 1 },
    chart: (bodyStyle) => (
      <CollisionSwarmChart
        data={[{ id: "collision", x: 1 }]}
        xAccessor="x"
        frameProps={{ bodyStyle }}
      />
    )
  },
  {
    name: "EventDropChart",
    datum: { id: "event", time: 1, arrivalTime: 1 },
    chart: (bodyStyle) => (
      <EventDropChart
        data={[{ id: "event", time: 1, arrivalTime: 1 }]}
        frameProps={{ bodyStyle }}
      />
    )
  },
  {
    name: "UnitPileChart",
    datum: { id: "pile", category: "A", value: 1 },
    chart: (bodyStyle) => (
      <UnitPileChart
        data={[{ id: "pile", category: "A", value: 1 }]}
        valueAccessor="value"
        frameProps={{ bodyStyle }}
      />
    )
  },
  {
    name: "PacketFlowChart",
    datum: { id: "packet", source: "source", target: "sink", value: 1 },
    chart: (bodyStyle) => (
      <PacketFlowChart
        nodes={[
          { id: "source", x: 0.1, y: 0.5 },
          { id: "sink", x: 0.9, y: 0.5 }
        ]}
        links={[{ id: "packet", source: "source", target: "sink", value: 1 }]}
        frameProps={{ bodyStyle }}
      />
    )
  }
]

describe("physics HOC frame bodyStyle composition", () => {
  beforeEach(() => {
    lastFrameProps = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each(cases)(
    "$name preserves generated defaults and applies authored fill/cursor",
    ({ chart, datum }) => {
      const authoredStyle = vi.fn(() => ({
        fill: "#authored",
        cursor: "pointer" as const
      }))
      render(chart(authoredStyle))

      const bodyStyle = lastFrameProps?.bodyStyle
      expect(typeof bodyStyle).toBe("function")
      const resolved =
        typeof bodyStyle === "function"
          ? bodyStyle(
              { datum } as never,
              { selected: false, simulationState: "idle" } as never
            )
          : bodyStyle

      expect(authoredStyle).toHaveBeenCalledTimes(1)
      expect(resolved).toMatchObject({
        fill: "#authored",
        cursor: "pointer",
        stroke: "#111827",
        strokeWidth: 1,
        opacity: 0.9
      })
    }
  )

  it("rebuilds the complete stock layout at measured responsive dimensions", () => {
    let resizeCallback: ResizeObserverCallback | undefined
    let observed: Element | undefined
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback
        }
        observe(target: Element) {
          observed = target
        }
        disconnect() {}
        unobserve() {}
      }
    )

    const { container } = render(
      <GaltonBoardChart
        data={[{ id: "responsive-ball", value: 1 }]}
        valueAccessor="value"
        responsiveWidth
        responsiveHeight
      />
    )
    const initialConfig = lastFrameProps?.config
    const initialSpawns = lastFrameProps?.initialSpawns

    expect(observed).toBe(
      container.querySelector("[data-semiotic-physics-responsive-host]")
    )
    expect(lastFrameProps?.size).toEqual([700, 420])

    act(() => {
      resizeCallback?.(
        [
          {
            target: observed,
            contentRect: { width: 330, height: 240 }
          } as unknown as ResizeObserverEntry
        ],
        {} as ResizeObserver
      )
    })

    expect(lastFrameProps?.size).toEqual([330, 240])
    expect(lastFrameProps?.responsiveWidth).toBe(false)
    expect(lastFrameProps?.responsiveHeight).toBe(false)
    expect(lastFrameProps?.config).not.toBe(initialConfig)
    expect(lastFrameProps?.initialSpawns).not.toBe(initialSpawns)
  })
})
