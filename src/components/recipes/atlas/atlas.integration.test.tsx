import * as React from "react"
import { readFileSync } from "node:fs"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import {
  LinkedCharts,
  useChartObserver,
  useSelection
} from "../../LinkedCharts"
import { ObservationReadout } from "../../ObservationReadout"
import { DetailsPanel } from "../../DetailsPanel"
import type { ChartObservation } from "../../store/ObservationStore"
import { FlowCircuitChart } from "./FlowCircuitChart"
import { DependencyForestChart } from "./DependencyForestChart"
import { MotifBraidChart } from "./MotifBraidChart"
import { flowCircuitStory } from "./flowCircuitStories"
import { readCircuitEdition } from "./flowCircuitTape"
import { supplierStory } from "./supplierStory"
import { prepareNetworkAtlas } from "./prepare"

const fixture = JSON.parse(
  readFileSync("scripts/network-atlas/fixtures/checkout-ab-v1.json", "utf8")
)
const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues))
const braidAtlas = prepared.atlas

function modulePointer(
  container: HTMLElement,
  id: string,
  type: "down" | "move"
) {
  const rect = container.querySelector(`[data-circuit-module="${id}"] rect`)!
  const event = {
    clientX:
      Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")) / 2,
    clientY:
      Number(rect.getAttribute("y")) + Number(rect.getAttribute("height")) / 2,
    pointerType: "mouse"
  }
  const canvas = container.querySelector("canvas")!
  if (type === "down") fireEvent.pointerDown(canvas, event)
  else fireEvent.pointerMove(canvas, event)
}

function Capture({
  receive
}: {
  receive: (events: ChartObservation[]) => void
}) {
  const { observations } = useChartObserver({ chartId: "atlas" })
  receive(observations)
  return null
}

function SelectionControl() {
  const selection = useSelection({ name: "vertices", fields: ["nodeId"] })
  return (
    <button onClick={() => selection.selectPoints({ nodeId: ["p1"] })}>
      Link partition
    </button>
  )
}

describe("Atlas visual intelligence integration", () => {
  let cleanupCanvas: () => void
  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  })
  afterEach(() => cleanupCanvas())

  it.each(["braid", "dependency", "circuit"] as const)(
    "publishes %s keyboard interactions to shared readers with just a chart ID",
    (kind) => {
      const { circuit, observed } = flowCircuitStory("etl")
      const chart =
        kind === "braid" ? (
          <MotifBraidChart atlas={braidAtlas} chartId="atlas" />
        ) : kind === "dependency" ? (
          <DependencyForestChart
            forest={supplierStory().projection}
            chartId="atlas"
          />
        ) : (
          <FlowCircuitChart
            circuit={circuit}
            edition={observed}
            reading={readCircuitEdition(observed, "observed-snapshot", 60)}
            chartId="atlas"
          />
        )
      const { container } = render(
        <LinkedCharts>
          {chart}
          <ObservationReadout
            chartId="atlas"
            types={["click"]}
            fallback="No activation"
          >
            {(datum) => (
              <output data-testid="reading">
                {String(datum.nodeId)}:{String(datum.analysisRevision)}
              </output>
            )}
          </ObservationReadout>
          <DetailsPanel chartId="atlas">
            {(datum) => <span>Inspect {String(datum.nodeId)}</span>}
          </DetailsPanel>
          <ObservationReadout
            chartId="another-chart"
            fallback="Other chart untouched"
          >
            {() => "Wrong chart"}
          </ObservationReadout>
        </LinkedCharts>
      )
      const frame = container.querySelector('[class*="stream-"][tabindex="0"]')!
      fireEvent.keyDown(frame, { key: "Home" })
      fireEvent.keyDown(frame, { key: " " })
      const expected =
        kind === "braid" ? "home" : kind === "dependency" ? "world" : "source"
      expect(screen.getByTestId("reading").textContent).toMatch(
        new RegExp(`^${expected}:`)
      )
      expect(screen.getByTestId("reading").textContent).not.toContain(
        "undefined"
      )
      expect(screen.getByText(`Inspect ${expected}`)).toBeInTheDocument()
      expect(screen.getByText("Other chart untouched")).toBeInTheDocument()
    }
  )

  it("uses the current tape for pointer, keyboard and observer consumers without remounting bodies", () => {
    const { circuit, observed } = flowCircuitStory("etl")
    const callback = vi.fn()
    const selectNode = vi.fn()
    const activate = vi.fn()
    let events: ChartObservation[] = []
    const draw = (time: number) => (
      <LinkedCharts>
        <FlowCircuitChart
          circuit={circuit}
          edition={observed}
          reading={readCircuitEdition(observed, "observed-replay", time)}
          chartId="atlas"
          linkedHover="vertices"
          onObservation={callback}
          onSelectNode={selectNode}
          frameProps={{ onSemanticItemActivate: activate }}
        />
        <Capture
          receive={(value) => {
            events = value
          }}
        />
      </LinkedCharts>
    )
    const { container, rerender } = render(draw(0))
    const canvas = container.querySelector("canvas")!
    act(() => {
      modulePointer(container, "p1", "move")
      modulePointer(container, "p2", "move")
      fireEvent.pointerLeave(canvas)
    })
    expect(events.filter((event) => event.type === "hover-end")).toHaveLength(1)
    modulePointer(container, "p1", "down")
    rerender(draw(30))
    expect(container.querySelector("canvas")).toBe(canvas)
    modulePointer(container, "p1", "down")
    const pointerClick = events
      .filter((event) => event.type === "click")
      .at(-1)!
    expect(pointerClick.datum).toMatchObject({
      nodeId: "p1",
      observedAt: 30,
      ...readCircuitEdition(observed, "observed-replay", 30).entry.nodes.p1
    })
    const frame = container.querySelector(".stream-physics-frame")!
    fireEvent.keyDown(frame, { key: "Home" })
    const moduleIndex = circuit.modules.findIndex(
      (module) => module.nodeId === "p1"
    )
    for (let index = 0; index < moduleIndex; index++)
      fireEvent.keyDown(frame, { key: "ArrowRight" })
    fireEvent.keyDown(frame, { key: " " })
    const keyboardClick = events
      .filter((event) => event.type === "click")
      .at(-1)!
    expect(keyboardClick.datum).toEqual(pointerClick.datum)
    expect(selectNode).toHaveBeenCalledTimes(3)
    expect(activate).toHaveBeenCalledTimes(1)
    // The frame owns publication even with linked hover and an explicit callback.
    const interactionTypes = [
      "hover",
      "hover-end",
      "click",
      "click-end",
      "focus",
      "activate"
    ]
    expect(events).toEqual(
      callback.mock.calls
        .map(([event]) => event)
        .filter((event) => interactionTypes.includes(event.type))
    )
    expect(events.filter((event) => event.type === "hover")).toHaveLength(
      moduleIndex + 3
    )
    expect(new Set(events).size).toBe(events.length)
    fireEvent.keyDown(frame, { key: "End" })
    fireEvent.keyDown(frame, { key: "Enter" })
    expect(selectNode).toHaveBeenCalledTimes(3)
    expect(activate).toHaveBeenCalledTimes(2)
    expect(
      events.filter((event) => event.type === "click").at(-1)?.datum.kind
    ).toBe("circuit-pipe")
    fireEvent.keyDown(frame, { key: "Escape" })
    expect(events.at(-1)?.type).toBe("hover-end")
  })

  it("exposes exact module values, unmeasured fields and every original pipe in the accessible table", () => {
    const { circuit, observed } = flowCircuitStory("etl")
    const reading = structuredClone(
      readCircuitEdition(observed, "observed-snapshot", 60)
    )
    reading.entry.nodes.p1.capacity = null
    const { container } = render(
      <FlowCircuitChart
        circuit={circuit}
        edition={observed}
        reading={reading}
        title="Current circuit"
        description="Authored description"
        summary="Authored summary"
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /View data summary/ }))
    while (
      container.querySelector(".semiotic-accessible-data-table-show-more")
    ) {
      fireEvent.click(
        container.querySelector(".semiotic-accessible-data-table-show-more")!
      )
    }
    const table = screen.getByRole("table", {
      name: "Semantic items for Current circuit"
    })
    expect(table.querySelectorAll("tbody tr")).toHaveLength(
      circuit.modules.length + circuit.atlas.source.edges.length
    )
    expect(table).toHaveTextContent("installed capacity unmeasured records/s")
    expect(table).toHaveTextContent(
      `queue ${reading.entry.nodes.p1.queued} records`
    )
    for (const flow of reading.entry.flows)
      expect(table).toHaveTextContent(`Original edge ${flow.edgeId}`)
    expect(container).toHaveTextContent("Authored summary")
  })

  it("dims the full Flow Circuit presentation for a named selection while retaining all analytical values", () => {
    const { circuit, observed } = flowCircuitStory("etl")
    const reading = readCircuitEdition(observed, "observed-snapshot", 60)
    const before = JSON.stringify(reading)
    const { container } = render(
      <LinkedCharts>
        <SelectionControl />
        <FlowCircuitChart
          circuit={circuit}
          edition={observed}
          reading={reading}
          linkedSelection={{ name: "vertices" }}
          particleBudget={0}
        />
      </LinkedCharts>
    )
    fireEvent.click(screen.getByText("Link partition"))
    expect(
      container.querySelector('[data-circuit-module="p1"]')
    ).toHaveAttribute("opacity", "1")
    expect(
      container.querySelector('[data-circuit-module="p2"]')
    ).toHaveAttribute("opacity", "0.2")
    expect(container.querySelectorAll("[data-circuit-module]")).toHaveLength(
      circuit.modules.length
    )
    expect(JSON.stringify(reading)).toBe(before)
  })
})
