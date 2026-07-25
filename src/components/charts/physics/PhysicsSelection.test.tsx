/**
 * Physics charts as coordinated-view citizens.
 *
 * Every other chart family joins the shared selection store, so physics bodies
 * should cross-highlight inside `LinkedCharts` too. The frame has always
 * accepted a `PhysicsBodySelection` body predicate; what was missing was the
 * bridge from the store's *datum* predicate to that *body* predicate.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import * as React from "react"
import { render } from "@testing-library/react"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { LinkedCharts } from "../../LinkedCharts"
import { useSelection } from "../../store/useSelection"
import type { PhysicsBodySelection } from "../../stream/physics/StreamPhysicsFrame"

// Capture what each HOC forwards to the frame.
let lastProps: { selection?: PhysicsBodySelection | null } | null = null
vi.mock("../../stream/physics/StreamPhysicsFrame", () => ({
  __esModule: true,
  default: React.forwardRef((props: Record<string, unknown>, _ref: unknown) => {
    lastProps = props as typeof lastProps
    return <div className="stream-physics-frame"><canvas /><svg /></div>
  }),
}))

// Imported after the mock so each HOC picks up the stubbed frame.
const { default: GaltonBoardChart } = await import("./GaltonBoardChart")
const { default: UnitPileChart } = await import("./UnitPileChart")
const { default: CollisionSwarmChart } = await import("./CollisionSwarmChart")
const { default: EventDropChart } = await import("./EventDropChart")

const pileRows = [
  { id: "n1", category: "North", value: 3 },
  { id: "s1", category: "South", value: 2 },
]

/** Drive the store from inside the provider, the way a sibling chart would. */
function SelectNorth() {
  const { selectPoints } = useSelection({ name: "physics-link", fields: ["category"] })
  React.useEffect(() => {
    selectPoints({ category: ["North"] })
  }, [selectPoints])
  return null
}

describe("physics HOCs and the shared selection store", () => {
  let cleanup: () => void
  beforeEach(() => {
    lastProps = null
    cleanup = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => cleanup())

  it("passes no selection to the frame when nothing is selected", () => {
    render(
      <LinkedCharts selections={{ "physics-link": {} }}>
        <UnitPileChart
          data={pileRows}
          categoryAccessor="category"
          valueAccessor="value"
          colorBy="category"
          size={[240, 160]}
          selection={{ name: "physics-link" }}
        />
      </LinkedCharts>
    )
    // An inactive store selection must not install a predicate that would dim
    // every body.
    expect(lastProps!.selection ?? null).toBeNull()
  })

  it("bridges a live store selection into a body predicate reading body.datum", () => {
    render(
      <LinkedCharts selections={{ "physics-link": {} }}>
        <SelectNorth />
        <UnitPileChart
          data={pileRows}
          categoryAccessor="category"
          valueAccessor="value"
          colorBy="category"
          size={[240, 160]}
          selection={{ name: "physics-link" }}
        />
      </LinkedCharts>
    )

    const selection = lastProps!.selection
    expect(selection?.isActive).toBe(true)
    expect(typeof selection?.predicate).toBe("function")

    // The store's predicate is datum-shaped; the bridge lifts it over body.datum.
    expect(selection!.predicate!({ id: "b1", datum: { category: "North" } } as never)).toBe(true)
    expect(selection!.predicate!({ id: "b2", datum: { category: "South" } } as never)).toBe(false)
    // Chrome bodies (walls, pegs, tubes) carry no datum and must never match.
    expect(selection!.predicate!({ id: "wall", datum: undefined } as never)).toBe(false)
  })

  it("passes a resolved body predicate straight through (escape hatch)", () => {
    const predicate = () => true
    render(
      <UnitPileChart
        data={pileRows}
        categoryAccessor="category"
        valueAccessor="value"
        size={[240, 160]}
        selection={{ isActive: true, predicate }}
      />
    )
    expect(lastProps!.selection).toEqual({ isActive: true, predicate })
  })

  it("wires the same bridge on the other colorBy-driven physics HOCs", () => {
    const cases = [
      <GaltonBoardChart
        key="galton"
        data={[{ id: "a", category: "North", value: 1 }]}
        valueAccessor="value"
        colorBy="category"
        bins={4}
        size={[240, 160]}
        selection={{ name: "physics-link" }}
      />,
      <CollisionSwarmChart
        key="swarm"
        data={[{ id: "a", category: "North", x: 1 }]}
        xAccessor="x"
        colorBy="category"
        size={[240, 160]}
        selection={{ name: "physics-link" }}
      />,
      <EventDropChart
        key="drop"
        data={[{ id: "a", category: "North", time: 1, arrivalTime: 1 }]}
        timeAccessor="time"
        arrivalAccessor="arrivalTime"
        colorBy="category"
        windows={{ size: 4 }}
        size={[240, 160]}
        selection={{ name: "physics-link" }}
      />,
    ]

    for (const element of cases) {
      lastProps = null
      const { unmount } = render(
        <LinkedCharts selections={{ "physics-link": {} }}>
          <SelectNorth />
          {element}
        </LinkedCharts>
      )
      expect(lastProps!.selection?.isActive, `${element.key} should receive an active selection`).toBe(true)
      expect(
        lastProps!.selection!.predicate!({ id: "x", datum: { category: "North" } } as never)
      ).toBe(true)
      unmount()
    }
  })
})
