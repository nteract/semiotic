import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import { auditAccessibility } from "../../charts/shared/auditAccessibility"
import { resolveCustomLayout } from "../../charts/physics/physicsCustomLayout"
import { flowCircuitStory } from "./flowCircuitStories"
import { readCircuitEdition } from "./flowCircuitTape"
import { flowCircuitLayout } from "./flowCircuitLayout"
import { circuitHistoryChrome } from "./flowCircuitChrome"
import { layoutFlowCircuit } from "./flowCircuitGeometry"
import { FlowCircuitChart, flowCircuitChartProps } from "./FlowCircuitChart"

describe("Flow Circuit rendering", () => {
  it("reads selected-module history without connecting across unmeasured intervals", () => {
    const { circuit, observed } = flowCircuitStory("etl")
    const partial = structuredClone(observed)
    partial.entries[1].nodes.p1.queued = null
    const output = renderToStaticMarkup(
      <svg>
        {circuitHistoryChrome(
          layoutFlowCircuit(circuit, 980, 860),
          partial,
          readCircuitEdition(partial, "observed-replay", 20),
          "#387e98",
          "#273442",
          "p1"
        )}
      </svg>
    )
    expect(output).toContain('data-history-module="p1"')
    expect(output).toContain("Partition 1 · queued records")
    const path = output.match(/<path d="([^"]*)"/)![1]
    expect(path.match(/M/g)).toHaveLength(2)
    expect(observed.entries[1].nodes.p1.queued).toBe(200000)
  })
  it.each(["etl", "retry"] as const)(
    "shares the %s apparatus and source readings between React and server SVG",
    (story) => {
      const { circuit, observed, modeled } = flowCircuitStory(story)
      for (const edition of [observed, modeled]) {
        const reading = readCircuitEdition(
          edition,
          edition.kind === "observed"
            ? "observed-snapshot"
            : "modeled-scenario",
          60
        )
        const config = {
          circuit,
          edition,
          reading,
          height: 860,
          particleBudget: 0
        }
        const props = flowCircuitChartProps(config)
        const { svg, evidence } = renderChartWithEvidence(
          "PhysicsCustomChart",
          props
        )
        expect(evidence.empty).toBe(false)
        expect(evidence.markCount).toBe(circuit.modules.length)
        expect(evidence.warnings).not.toContain("PHYSICS_NOT_SETTLED")
        const markup = renderToStaticMarkup(<FlowCircuitChart {...config} />)
        for (const output of [svg, markup]) {
          expect(output).toContain(`data-circuit-edition="${edition.kind}"`)
          expect(output).toContain("individual timings unavailable")
          expect((output.match(/data-circuit-module=/g) ?? []).length).toBe(
            circuit.modules.length
          )
          expect((output.match(/data-circuit-edge=/g) ?? []).length).toBe(
            circuit.atlas.source.edges.length
          )
          expect(output).toContain(
            story === "etl" ? "data-circuit-gauge" : "retry-return"
          )
        }
        expect(
          auditAccessibility("PhysicsCustomChart", props).findings.filter(
            (finding) => finding.critical && finding.status === "fail"
          )
        ).toEqual([])
      }
    }
  )

  it("retains analytical counts and module bodies across particle budgets, seeds and reduced motion", () => {
    const { circuit, observed } = flowCircuitStory("etl")
    const reading = readCircuitEdition(observed, "observed-replay", 30)
    const before = JSON.stringify(reading)
    for (const particleBudget of [0, 1, 20, 200]) {
      for (const placementSeed of [1, 19]) {
        const resolved = resolveCustomLayout({
          data: circuit.modules.map((module) => ({ id: module.nodeId })),
          layout: flowCircuitLayout,
          layoutConfig: {
            circuit,
            edition: observed,
            reading,
            particleBudget,
            placementSeed,
            reducedMotion: true
          },
          semantic: { text: "#273442", surface: "#fff" },
          size: [980, 860],
          themeCategorical: ["#387e98"]
        })
        expect(resolved.initialSpawns).toHaveLength(circuit.modules.length)
        expect(
          renderToStaticMarkup(<svg>{resolved.result.overlays}</svg>)
        ).not.toContain("data-circuit-particle")
        expect(resolved.result.sensors).toHaveLength(circuit.modules.length)
        expect(resolved.config.eviction).toBe(false)
      }
    }
    expect(JSON.stringify(reading)).toBe(before)
    expect(reading.entry.totals.queued).toBe(600000)
  })
})
