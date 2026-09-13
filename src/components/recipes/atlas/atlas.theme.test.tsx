import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  ThemeProvider,
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME
} from "../../ThemeProvider"
import { renderChartWithEvidence } from "../../server/renderToStaticSVG"
import { auditAccessibility } from "../../charts/shared/auditAccessibility"
import { diagnoseConfig } from "../../charts/shared/diagnoseConfig"
import { FlowCircuitChart, flowCircuitChartProps } from "./FlowCircuitChart"
import {
  DependencyForestChart,
  dependencyForestChartProps
} from "./DependencyForestChart"
import { flowCircuitStory } from "../../../../scripts/network-atlas/stories/flowCircuitStories"
import { readCircuitEdition } from "./flowCircuitTape"
import { supplierStory } from "../../../../scripts/network-atlas/stories/supplierStory"
import { motifBraidLayout } from "./motifBraidLayout"
import { prepareNetworkAtlas } from "./prepare"
import { prepareMotifBraid } from "./braid"
import { MotifBraidChart } from "./MotifBraidChart"

const fixture = JSON.parse(
  readFileSync("scripts/network-atlas/fixtures/checkout-ab-v1.json", "utf8")
)
const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues))
const atlas = prepared.atlas
const braid = prepareMotifBraid(atlas)

describe("Atlas theme and evidence contracts", () => {
  const { circuit, observed } = flowCircuitStory("etl")
  const flow = {
    circuit,
    edition: observed,
    reading: readCircuitEdition(observed, "observed-snapshot", 60),
    particleBudget: 0
  }
  const forest = {
    forest: supplierStory().projection,
    reading: "required-paths" as const
  }
  const braidProps = {
    nodes: braid.sceneSeeds.nodes,
    edges: braid.sceneSeeds.edges,
    layout: motifBraidLayout,
    layoutConfig: { braid },
    title: "Journey steps",
    description: "Shared prefixes and per-step traffic",
    summary: "Overlapping motifs do not partition the population."
  }

  it.each([
    ["light", LIGHT_THEME],
    ["dark", DARK_THEME],
    ["high-contrast", HIGH_CONTRAST_THEME]
  ] as const)(
    "preserves analytical evidence and readable ink in %s across React and static SVG",
    (name, theme) => {
      const charts = [
        {
          component: "PhysicsCustomChart" as const,
          props: flowCircuitChartProps(flow),
          live: <FlowCircuitChart {...flow} />
        },
        {
          component: "NetworkCustomChart" as const,
          props: dependencyForestChartProps(forest),
          live: <DependencyForestChart {...forest} />
        },
        {
          component: "NetworkCustomChart" as const,
          props: braidProps,
          live: <MotifBraidChart atlas={atlas} />
        }
      ]
      for (const chart of charts) {
        const props = { ...chart.props, theme: name }
        const rendered = renderChartWithEvidence(chart.component, props)
        const reference = renderChartWithEvidence(chart.component, {
          ...chart.props,
          theme: "light"
        })
        expect(rendered.evidence.empty).toBe(false)
        expect(rendered.evidence.markCountByType).toEqual(
          reference.evidence.markCountByType
        )
        for (const output of [
          rendered.svg,
          renderToStaticMarkup(
            <ThemeProvider theme={name}>{chart.live}</ThemeProvider>
          )
        ]) {
          expect(output).toContain(`fill="${theme.colors.text}"`)
          expect(output).toContain(`fill="${theme.colors.surface}"`)
        }
        const diagnosis = diagnoseConfig(chart.component, props)
        expect(
          diagnosis.ok,
          JSON.stringify({
            component: chart.component,
            diagnoses: diagnosis.diagnoses
          })
        ).toBe(true)
        expect(
          auditAccessibility(chart.component, props).findings.filter(
            (finding) => finding.critical && finding.status === "fail"
          )
        ).toEqual([])
      }
    }
  )

  it("honors explicit semantic role colors and signature color maps", () => {
    const circuitColors = {
      observed: "#125678",
      residual: "#975321",
      alarm: "#b01234",
      muted: "#456789"
    }
    const circuitSvg = renderChartWithEvidence("PhysicsCustomChart", {
      ...flowCircuitChartProps({ ...flow, colors: circuitColors }),
      theme: "dark"
    }).svg
    for (const color of Object.values(circuitColors))
      expect(circuitSvg).toContain(color)
    const forestColors = {
      backbone: "#456789",
      residual: "#975321",
      required: "#125678"
    }
    const forestSvg = renderChartWithEvidence(
      "NetworkCustomChart",
      dependencyForestChartProps({
        ...forest,
        colors: forestColors,
        selection: {
          nodeId: "X",
          analysisRevision: forest.forest.atlas.analysisRevision,
          relationScopeId: "directed-admitted"
        }
      })
    ).svg
    for (const color of Object.values(forestColors))
      expect(forestSvg).toContain(color)
    const palette = Object.fromEntries(
      braid.signatureOrder.map((signature, index) => [
        signature,
        ["#123456", "#654321", "#456123"][index % 3]
      ])
    )
    const svg = renderChartWithEvidence("NetworkCustomChart", {
      ...braidProps,
      colorScheme: palette
    }).svg
    for (const color of Object.values(palette)) expect(svg).toContain(color)
  })

  it("keeps network marks and evidence intact when a linked selection dims unrelated vertices", () => {
    for (const props of [dependencyForestChartProps(forest), braidProps]) {
      const reference = renderChartWithEvidence("NetworkCustomChart", props)
      const selected = renderChartWithEvidence("NetworkCustomChart", {
        ...props,
        frameProps: {
          layoutSelection: {
            isActive: true,
            predicate: (datum: Record<string, unknown>) =>
              datum.nodeId === "X" || datum.nodeId === "cart"
          }
        }
      })
      expect(selected.evidence.markCountByType).toEqual(
        reference.evidence.markCountByType
      )
      expect(selected.svg).toMatch(/opacity="0\.2"/)
      expect(reference.svg).not.toMatch(/opacity="0\.2"/)
    }
  })

  it("forwards annotations to the shared server renderers with stable vertex anchors", () => {
    for (const chart of [
      {
        component: "PhysicsCustomChart" as const,
        props: flowCircuitChartProps({
          ...flow,
          annotations: [
            {
              type: "callout",
              pointId: "p1",
              label: "Inspect queue",
              dx: 20,
              dy: -20
            }
          ]
        })
      },
      {
        component: "NetworkCustomChart" as const,
        props: dependencyForestChartProps({
          ...forest,
          annotations: [
            {
              type: "callout",
              pointId: "X",
              label: "Inspect dependency",
              dx: 20,
              dy: -20
            }
          ]
        })
      }
    ]) {
      const { svg, evidence } = renderChartWithEvidence(
        chart.component,
        chart.props
      )
      const text = new DOMParser()
        .parseFromString(svg, "image/svg+xml")
        .querySelector(".annotation-note-label")!.textContent
      expect(text?.replace(/\s/g, "")).toBe(
        chart.props.annotations![0].label!.replace(/\s/g, "")
      )
      expect(evidence.empty).toBe(false)
    }
  })
})
