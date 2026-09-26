import React from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { FlowCircuitChart } from "semiotic/atlas"
import { readCircuitEdition } from "semiotic/atlas/core"
import { renderChartWithEvidence } from "semiotic/server"
import { setupCanvasMock } from "../../../test-utils/canvasMock"
import { flowCircuitStory } from "../../../../scripts/network-atlas/stories/flowCircuitStories"
import { layoutFlowCircuit } from "./flowCircuitGeometry"

let cleanupCanvas: () => void
beforeEach(() => {
  cleanupCanvas = setupCanvasMock({ stubRaf: "noop" })
})
afterEach(() => {
  cleanup()
  cleanupCanvas()
})

describe.each(["React", "server"] as const)(
  "%s fractional circuit encoding",
  (renderer) => {
    it.each([undefined, "p1"])(
      "uses the full flow, queue and time range for selection %s",
      (selected) => {
        const { circuit, observed } = flowCircuitStory("etl")
        const edition = structuredClone(observed)
        for (const entry of edition.entries) {
          entry.at /= 120 // The complete tape now spans half a second.
          entry.totals.queued! /= 4000000
          for (const node of Object.values(entry.nodes)) {
            if (node.queued !== null) node.queued /= 4000000
          }
          for (const flow of entry.flows) {
            if (flow.perSecond !== null) flow.perSecond /= 200000
          }
        }
        const reading = readCircuitEdition(edition, "observed-snapshot", 0.5)
        const props = {
          circuit,
          edition,
          reading,
          width: 980,
          height: 860,
          particleBudget: 0,
          selection: selected
            ? {
                nodeId: selected,
                analysisRevision: circuit.atlas.analysisRevision,
                relationScopeId: "directed-admitted" as const
              }
            : undefined
        }
        const root =
          renderer === "React"
            ? render(<FlowCircuitChart {...props} />).container
            : new DOMParser().parseFromString(
                renderChartWithEvidence("FlowCircuitChart", props).svg,
                "image/svg+xml"
              )
        const geometry = layoutFlowCircuit(circuit, 980, 860)
        const maxFlow = Math.max(
          ...reading.entry.flows.map((flow) => flow.perSecond ?? 0)
        )
        for (const flow of reading.entry.flows) {
          const path = root.querySelector(
            `[data-circuit-edge="${flow.edgeId}"] path`
          )!
          expect(Number(path.getAttribute("stroke-width"))).toBeCloseTo(
            1 + (flow.perSecond! / maxFlow) * 7
          )
        }
        const queue = root.querySelector(
          '[data-circuit-module="p1"] [data-circuit-gauge="queue"]'
        )!
        expect(Number(queue.getAttribute("width"))).toBeCloseTo(
          geometry.modules.find((module) => module.module.nodeId === "p1")!
            .queue.width
        )
        const history = root.querySelector("[data-circuit-history]")!
        const endX = geometry.history.x + geometry.history.width
        expect(
          Number(history.querySelector("line")!.getAttribute("x1"))
        ).toBeCloseTo(endX)
        expect(history.querySelector("path")!.getAttribute("d")).toContain(
          `H${endX} V${geometry.history.y}`
        )
        expect(
          history.querySelector("text:last-child")!.getAttribute("x")
        ).toBe(String(endX))
      }
    )

    it.each([0, null])(
      "keeps zero-duration tapes with %s measurements finite",
      (value) => {
        const { circuit, observed } = flowCircuitStory("etl")
        const edition = structuredClone(observed)
        edition.entries = [edition.entries[0]]
        edition.entries[0].totals.queued = value
        for (const node of Object.values(edition.entries[0].nodes))
          node.queued = value
        for (const flow of edition.entries[0].flows) flow.perSecond = value
        const props = {
          circuit,
          edition,
          reading: readCircuitEdition(edition, "observed-snapshot", 0),
          particleBudget: 0
        }
        const markup =
          renderer === "React"
            ? render(<FlowCircuitChart {...props} />).container.innerHTML
            : renderChartWithEvidence("FlowCircuitChart", props).svg
        expect(markup).not.toMatch(/NaN|Infinity/)
        const root = new DOMParser().parseFromString(markup, "text/html")
        const paths = root.querySelectorAll(
          "[data-circuit-edge] path:first-of-type"
        )
        expect(paths).toHaveLength(circuit.atlas.source.edges.length)
        for (const path of paths)
          expect(path.getAttribute("stroke-width")).toBe(
            value === null ? "1.5" : "1"
          )
      }
    )
  }
)
