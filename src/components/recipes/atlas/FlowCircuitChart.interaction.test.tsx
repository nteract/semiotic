import * as React from "react"
import { fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { FlowCircuitChart } from "./FlowCircuitChart"
import { prepareNetworkAtlas } from "./prepare"
import { prepareFlowCircuit } from "./flowCircuit"
import { flowCircuitStory } from "../../../../scripts/network-atlas/stories/flowCircuitStories"
import { readCircuitEdition } from "./flowCircuitTape"

/** Click the visible module center through the real physics hit-test path. */
function clickModule(container: HTMLElement, id: string) {
  const rect = container.querySelector(`[data-circuit-module="${id}"] rect`)!
  fireEvent.pointerDown(container.querySelector("canvas")!, {
    clientX:
      Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")) / 2,
    clientY:
      Number(rect.getAttribute("y")) + Number(rect.getAttribute("height")) / 2,
    pointerType: "mouse"
  })
}

describe("Flow Circuit live selection and geometry", () => {
  let cleanupCanvas: () => void

  beforeEach(() => {
    cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => cleanupCanvas())

  it.each(["etl", "retry"] as const)(
    "selects canonical %s modules with Enter, Space and pointer activation",
    (story) => {
      const { circuit, observed } = flowCircuitStory(story)
      const onSelectNode = vi.fn()
      const { container } = render(
        <FlowCircuitChart
          circuit={circuit}
          edition={observed}
          reading={readCircuitEdition(observed, "observed-snapshot", 60)}
          onSelectNode={onSelectNode}
        />
      )
      const ids =
        story === "etl" ? ["source", "router"] : ["boundary", "inventory"]
      const frame = container.querySelector(".stream-physics-frame")!
      fireEvent.keyDown(frame, { key: "Home" })
      expect(onSelectNode).not.toHaveBeenCalled()
      fireEvent.keyDown(frame, { key: "Enter" })
      fireEvent.keyDown(frame, { key: "ArrowRight" })
      fireEvent.keyDown(frame, { key: " " })
      expect(onSelectNode.mock.calls).toEqual(ids.map((id) => [id]))

      clickModule(container, ids[0])
      expect(onSelectNode).toHaveBeenLastCalledWith(ids[0])
      fireEvent.pointerDown(container.querySelector("canvas")!, {
        clientX: 5,
        clientY: 5,
        pointerType: "mouse"
      })
      expect(onSelectNode).toHaveBeenCalledTimes(3)
    }
  )

  it.each(["order", "analysis revision"] as const)(
    "keeps module hit targets aligned when only the %s changes",
    (change) => {
      const { circuit, observed } = flowCircuitStory("etl")
      let replacement = { ...circuit, order: [...circuit.order].reverse() }
      if (change === "analysis revision") {
        const prepared = prepareNetworkAtlas(
          {
            ...circuit.atlas.spec,
            coordinate: {
              kind: "ordinal",
              sectionIds: [...circuit.atlas.sections.sectionIds].reverse()
            }
          },
          circuit.atlas.source
        )
        if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues))
        replacement = prepareFlowCircuit(
          prepared.atlas,
          circuit.modules.map((module) => module.semantics)
        )
        expect(replacement.order).toEqual(circuit.order)
        expect(replacement.atlas.analysisRevision).not.toBe(
          circuit.atlas.analysisRevision
        )
      }
      // Preserve membership and backbone: these changes escaped the old mount key.
      expect(replacement.modules).toEqual(circuit.modules)
      expect(replacement.backboneEdgeIds).toEqual(circuit.backboneEdgeIds)
      const onSelectNode = vi.fn()
      const reading = readCircuitEdition(observed, "observed-snapshot", 60)
      const { container, rerender } = render(
        <FlowCircuitChart
          circuit={circuit}
          edition={observed}
          reading={reading}
          onSelectNode={onSelectNode}
        />
      )
      const verifyHitTargets = () => {
        onSelectNode.mockClear()
        for (const module of circuit.modules) {
          clickModule(container, module.nodeId)
        }
        expect(onSelectNode.mock.calls).toEqual(
          circuit.modules.map((module) => [module.nodeId])
        )
      }
      verifyHitTargets()
      rerender(
        <FlowCircuitChart
          circuit={replacement}
          edition={{
            ...observed,
            analysisRevision: replacement.atlas.analysisRevision
          }}
          reading={reading}
          onSelectNode={onSelectNode}
        />
      )
      verifyHitTargets()
    }
  )

  it("preserves keyboard focus across tape, selection and particle changes", () => {
    const { circuit, observed } = flowCircuitStory("etl")
    const props = {
      circuit,
      edition: observed,
      reading: readCircuitEdition(observed, "observed-replay", 0)
    }
    const { container, rerender } = render(<FlowCircuitChart {...props} />)
    const frame = container.querySelector(".stream-physics-frame")!
    const canvas = container.querySelector("canvas")
    fireEvent.keyDown(frame, { key: "Home" })
    fireEvent.keyDown(frame, { key: "ArrowRight" })
    const onSelectNode = vi.fn()
    rerender(
      <FlowCircuitChart
        {...props}
        reading={readCircuitEdition(observed, "observed-replay", 30)}
        particleBudget={0}
        placementSeed={19}
        reducedMotion
        highlightedEdgeIds={["in:p1"]}
        selection={{
          nodeId: "p1",
          analysisRevision: circuit.atlas.analysisRevision,
          relationScopeId: "directed-admitted"
        }}
        onSelectNode={onSelectNode}
      />
    )
    expect(container.querySelector("canvas")).toBe(canvas)
    expect(container.querySelector("[data-history-module]")).toHaveAttribute(
      "data-history-module",
      "p1"
    )
    fireEvent.keyDown(frame, { key: "Enter" })
    expect(onSelectNode).toHaveBeenCalledExactlyOnceWith("router")
  })
})
