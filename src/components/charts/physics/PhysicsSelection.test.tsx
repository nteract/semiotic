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
import { act, render } from "@testing-library/react"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { LinkedCharts } from "../../LinkedCharts"
import { useSelection } from "../../store/useSelection"
import type { PhysicsBodySelection } from "../../stream/physics/StreamPhysicsFrame"

// Capture what each HOC forwards to the frame.
type CapturedFrameProps = {
  chartId?: string
  selection?: PhysicsBodySelection | null
  onBodyHover?: (body: Record<string, unknown> | null, hover: Record<string, unknown> | null) => void
}

let lastProps: CapturedFrameProps | null = null
const propsByChartId = new Map<string, CapturedFrameProps>()
vi.mock("../../stream/physics/StreamPhysicsFrame", () => ({
  __esModule: true,
  default: React.forwardRef((props: Record<string, unknown>, _ref: unknown) => {
    lastProps = props as typeof lastProps
    if (typeof props.chartId === "string") {
      propsByChartId.set(props.chartId, props as CapturedFrameProps)
    }
    return <div className="stream-physics-frame"><canvas /><svg /></div>
  }),
}))

// Imported after the mock so each HOC picks up the stubbed frame.
const { default: GaltonBoardChart } = await import("./GaltonBoardChart")
const { default: UnitPileChart } = await import("./UnitPileChart")
const { default: CollisionSwarmChart } = await import("./CollisionSwarmChart")
const { default: EventDropChart } = await import("./EventDropChart")
const { default: GauntletChart } = await import("./GauntletChart")
const { default: CrucibleChart } = await import("./CrucibleChart")
const { default: ProcessFlowChart } = await import("./ProcessFlowChart")
const { default: PacketFlowChart } = await import("./PacketFlowChart")

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

let hoveredSelection: ReturnType<typeof useSelection> | null = null

function InspectPhysicsHover() {
  hoveredSelection = useSelection({
    name: "physics-hover",
    fields: ["category"]
  })
  return null
}

describe("physics HOCs and the shared selection store", () => {
  let cleanup: () => void
  beforeEach(() => {
    lastProps = null
    propsByChartId.clear()
    hoveredSelection = null
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

  it("publishes body datum on linked hover and clears it on hover end", () => {
    const frameHover = vi.fn()
    render(
      <LinkedCharts selections={{ "physics-hover": {} }}>
        <InspectPhysicsHover />
        <UnitPileChart
          data={pileRows}
          categoryAccessor="category"
          valueAccessor="value"
          colorBy="category"
          size={[240, 160]}
          linkedHover="physics-hover"
          frameProps={{ onBodyHover: frameHover }}
        />
      </LinkedCharts>
    )

    expect(typeof lastProps!.onBodyHover).toBe("function")
    act(() => {
      lastProps!.onBodyHover!(
        { id: "north-body", datum: pileRows[0] },
        {
          __semioticHoverData: true,
          id: "north-body",
          type: "body",
          x: 42,
          y: 24,
          data: pileRows[0]
        }
      )
    })
    expect(frameHover).toHaveBeenCalledTimes(1)
    expect(hoveredSelection!.isActive).toBe(true)
    expect(hoveredSelection!.predicate({ category: "North" })).toBe(true)
    expect(hoveredSelection!.predicate({ category: "South" })).toBe(false)

    act(() => {
      lastProps!.onBodyHover!(null, null)
    })
    expect(frameHover).toHaveBeenCalledTimes(2)
    expect(hoveredSelection!.isActive).toBe(false)
  })

  it("unwraps authored sourceDatum before publishing linked hover", () => {
    render(
      <LinkedCharts selections={{ "physics-hover": {} }}>
        <InspectPhysicsHover />
        <GauntletChart
          data={[{ id: "a", category: "North", positives: ["signal"], negatives: [] }]}
          positiveAccessor="positives"
          negativeAccessor="negatives"
          positiveProperties={[{ id: "signal", radius: 4 }]}
          negativeProperties={[]}
          size={[240, 160]}
          linkedHover={{ name: "physics-hover", fields: ["category"] }}
        />
      </LinkedCharts>
    )

    const sourceDatum = { id: "a", category: "North" }
    act(() => {
      lastProps!.onBodyHover!(
        {
          id: "gauntlet-core",
          datum: {
            __gauntlet: true,
            kind: "core",
            projectId: "a",
            sourceDatum
          }
        },
        {
          __semioticHoverData: true,
          id: "gauntlet-core",
          type: "body",
          x: 10,
          y: 20,
          data: sourceDatum
        }
      )
    })
    expect(hoveredSelection!.predicate({ category: "North" })).toBe(true)
  })

  it("matches Crucible bodies through their authored sourceDatum", () => {
    render(
      <LinkedCharts selections={{ "physics-link": {} }}>
        <SelectNorth />
        <CrucibleChart
          data={[{ id: "a", label: "A", category: "North", amount: 1 }]}
          phases={[{ id: "mix", label: "Mix", duration: 1, motion: "mix" }]}
          idAccessor="id"
          labelAccessor="label"
          categoryAccessor="category"
          amountAccessor="amount"
          colorBy="category"
          playback="snapshot"
          size={[240, 160]}
          selection={{ name: "physics-link" }}
        />
      </LinkedCharts>
    )

    const predicate = lastProps!.selection!.predicate!
    expect(
      predicate!({
        id: "north-material",
        datum: { sourceDatum: { category: "North" } }
      } as never)
    ).toBe(true)
    expect(
      predicate!({
        id: "south-material",
        datum: { sourceDatum: { category: "South" } }
      } as never)
    ).toBe(false)
  })

  it("cross-highlights a sibling physics frame from produced body hover", () => {
    render(
      <LinkedCharts selections={{ "physics-hover": {} }}>
        <UnitPileChart
          chartId="physics-producer"
          data={pileRows}
          categoryAccessor="category"
          valueAccessor="value"
          colorBy="category"
          size={[240, 160]}
          linkedHover="physics-hover"
        />
        <CollisionSwarmChart
          chartId="physics-consumer"
          data={[
            { id: "n", category: "North", x: 1 },
            { id: "s", category: "South", x: 2 }
          ]}
          xAccessor="x"
          colorBy="category"
          size={[240, 160]}
          selection={{ name: "physics-hover" }}
        />
      </LinkedCharts>
    )

    expect(propsByChartId.get("physics-consumer")?.selection ?? null).toBeNull()
    act(() => {
      propsByChartId.get("physics-producer")!.onBodyHover!(
        { id: "north-body", datum: pileRows[0] },
        {
          __semioticHoverData: true,
          id: "north-body",
          type: "body",
          x: 42,
          y: 24,
          data: pileRows[0]
        }
      )
    })

    const crossHighlight = propsByChartId.get("physics-consumer")!.selection
    expect(crossHighlight?.isActive).toBe(true)
    expect(
      crossHighlight!.predicate!({
        id: "north-consumer",
        datum: { category: "North" }
      } as never)
    ).toBe(true)
    expect(
      crossHighlight!.predicate!({
        id: "south-consumer",
        datum: { category: "South" }
      } as never)
    ).toBe(false)

    act(() => {
      propsByChartId.get("physics-producer")!.onBodyHover!(null, null)
    })
    expect(propsByChartId.get("physics-consumer")?.selection ?? null).toBeNull()
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
      <GauntletChart
        key="gauntlet"
        data={[{ id: "a", category: "North", positives: ["signal"], negatives: [] }]}
        positiveAccessor="positives"
        negativeAccessor="negatives"
        positiveProperties={[{ id: "signal", radius: 4 }]}
        negativeProperties={[]}
        size={[240, 160]}
        selection={{ name: "physics-link" }}
      />,
      <CrucibleChart
        key="crucible"
        data={[{ id: "a", label: "A", category: "North", amount: 1 }]}
        phases={[{ id: "mix", label: "Mix", duration: 1, motion: "mix" }]}
        idAccessor="id"
        labelAccessor="label"
        categoryAccessor="category"
        amountAccessor="amount"
        colorBy="category"
        playback="snapshot"
        size={[240, 160]}
        selection={{ name: "physics-link" }}
      />,
      <ProcessFlowChart
        key="process"
        data={[{ id: "a", category: "North", stage: "work" }]}
        stages={[
          { id: "work", label: "Work", force: 8 },
          { id: "done", label: "Done", absorb: true }
        ]}
        idAccessor="id"
        stageAccessor="stage"
        colorBy="category"
        size={[240, 160]}
        selection={{ name: "physics-link" }}
      />,
      <PacketFlowChart
        key="packet"
        nodes={[
          { id: "source", x: 0.1, y: 0.5 },
          { id: "sink", x: 0.9, y: 0.5 }
        ]}
        links={[
          {
            id: "a",
            category: "North",
            source: "source",
            target: "sink",
            value: 1
          }
        ]}
        colorBy="category"
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
