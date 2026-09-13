import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import Ajv from "ajv"
import { describe, expect, it } from "vitest"
import {
  MotifBraidChart,
  DependencyForestChart,
  FlowCircuitChart
} from "semiotic/atlas"
import {
  prepareMotifBraid,
  getRequiredPaths,
  getBypassWitness,
  readCircuitEdition,
  exportCircuitEvidence
} from "semiotic/atlas/core"
import { renderChartWithEvidence } from "semiotic/server"
import { diagnoseConfig, toConfig, fromConfig, prepareChart } from "semiotic/ai"
import {
  artifactDataValue,
  artifactConfigurationValue
} from "../../artifact/identity"
import schema from "../../../../ai/schema.json"
import { CHART_CLINIC_METADATA } from "../../ai/chartClinicMetadata.generated"
import {
  atlasStory,
  atlasStoryNames,
  type AtlasStoryId
} from "../../../../scripts/network-atlas/stories/atlasStories"
import { supplierStory } from "../../../../scripts/network-atlas/stories/supplierStory"
import { flowCircuitStory } from "../../../../scripts/network-atlas/stories/flowCircuitStories"
import { dependencyForestChartProps } from "./dependencyForestChartProps"
import { flowCircuitChartProps } from "./flowCircuitChartProps"
import { motifBraidChartProps } from "./motifBraidChartProps"

const ajv = new Ajv({ strict: false, allErrors: true })
const parse = <T,>(value: T): T => JSON.parse(JSON.stringify(value))

describe("public Atlas readers", () => {
  it.each(Object.keys(atlasStoryNames) as AtlasStoryId[])(
    "renders the serialized %s story through public APIs",
    (id) => {
      const story = atlasStory(id)
      const props = parse({
        ...story.props,
        title: atlasStoryNames[id],
        description: story.question,
        summary: story.takeaway,
        accessibleTable: true
      })
      const tool = schema.tools.find(
        (tool) => tool.function.name === story.component
      )!
      const validate = ajv.compile(tool.function.parameters)
      expect(tool.function).toHaveProperty(
        "x-semiotic-import-path",
        "semiotic/atlas"
      )
      expect(CHART_CLINIC_METADATA[story.component].recommendedImport).toBe(
        "semiotic/atlas"
      )
      expect(validate(props), JSON.stringify(validate.errors)).toBe(true)
      expect(diagnoseConfig(story.component, props).ok).toBe(true)
      const config = toConfig(story.component, props)
      expect(fromConfig(parse(config)).props).toEqual(props)
      const withoutData = toConfig(story.component, props, {
        includeData: false
      })
      expect(withoutData.props).not.toHaveProperty("atlas")
      expect(withoutData.props).not.toHaveProperty("forest")
      expect(withoutData.props).not.toHaveProperty("circuit")
      expect(withoutData.props).not.toHaveProperty("edition")
      if (story.component === "DependencyForestChart")
        expect(withoutData.props.reading).toBe("required-paths")
      if (story.component === "FlowCircuitChart")
        expect(withoutData.props).not.toHaveProperty("reading")
      expect(artifactDataValue(props)).toBeDefined()
      expect(artifactConfigurationValue(props)).not.toHaveProperty(
        story.component === "MotifBraidChart"
          ? "atlas"
          : story.component === "DependencyForestChart"
            ? "forest"
            : "circuit"
      )
      const prepared = prepareChart(
        { component: story.component, props },
        { render: renderChartWithEvidence, repair: false }
      )
      expect(prepared.ok, prepared.reasons.join("; ")).toBe(true)
      const { svg, evidence } = renderChartWithEvidence(story.component, props)
      expect(evidence.markCount).toBeGreaterThan(0)
      expect(evidence.warnings).not.toContain("EMPTY_SCENE")
      expect(svg).toContain(atlasStoryNames[id])
      expect(svg).not.toMatch(/NaN|Infinity/)
      // Public static dispatch must preserve the already-tested source layout.
      let reference: string
      let client: string
      if (story.component === "MotifBraidChart") {
        reference = renderChartWithEvidence(
          "NetworkCustomChart",
          motifBraidChartProps(story.props)
        ).svg
        client = renderToStaticMarkup(<MotifBraidChart {...story.props} />)
        expect(
          prepareMotifBraid(story.props.atlas).groups.length
        ).toBeGreaterThan(0)
      } else if (story.component === "DependencyForestChart") {
        reference = renderChartWithEvidence(
          "NetworkCustomChart",
          dependencyForestChartProps(story.props)
        ).svg
        client = renderToStaticMarkup(
          <DependencyForestChart {...story.props} />
        )
      } else {
        reference = renderChartWithEvidence(
          "PhysicsCustomChart",
          flowCircuitChartProps(story.props)
        ).svg
        client = renderToStaticMarkup(<FlowCircuitChart {...story.props} />)
      }
      expect(client).toContain('role="img"')
      const actual = renderChartWithEvidence(story.component, story.props).svg
      // Auto-generated SVG IDs are document-local; all geometry, labels and
      // accessibility metadata must otherwise match the source-recipe edition.
      const normalize = (value: string) => value.replace(/_R_[^_]*_/g, "_id_")
      expect(normalize(actual)).toBe(normalize(reference))
    }
  )

  it("retains supplier witnesses and capacity limits after serialization", () => {
    const original = parse(supplierStory())
    const bypass = parse(supplierStory(true))
    expect(getRequiredPaths(original.projection.atlas, "A")).toEqual(
      getRequiredPaths(supplierStory().projection.atlas, "A")
    )
    const query = { target: "A", avoiding: ["X"] }
    const witness = getBypassWitness(bypass.projection.atlas, query)
    expect(witness.value?.exists).toBe(true)
    expect(witness).toEqual(
      getBypassWitness(supplierStory(true).projection.atlas, query)
    )
    expect(bypass.measures).toEqual(original.measures)
  })

  it("keeps unmeasured queue stock and observed/model provenance distinct", () => {
    const { circuit, observed, modeled } = parse(flowCircuitStory("retry"))
    const reading = readCircuitEdition(observed, "observed-replay", 60)
    expect(reading.entry.totals).toMatchObject({
      roots: 10000,
      attempts: 30000,
      retries: 20000,
      queued: null
    })
    expect(exportCircuitEvidence(circuit, observed, reading)).toEqual(
      exportCircuitEvidence(
        ...(() => {
          const source = flowCircuitStory("retry")
          return [
            source.circuit,
            source.observed,
            readCircuitEdition(source.observed, "observed-replay", 60)
          ] as const
        })()
      )
    )
    expect(() =>
      renderChartWithEvidence("FlowCircuitChart", {
        circuit,
        edition: modeled,
        reading
      })
    ).toThrow(/edition/)
  })

  it.each(["MotifBraidChart", "DependencyForestChart", "FlowCircuitChart"])(
    "rejects missing prepared input for %s",
    (component) => {
      expect(diagnoseConfig(component, {}).ok).toBe(false)
      const validate = ajv.compile(
        schema.tools.find((tool) => tool.function.name === component)!.function
          .parameters
      )
      expect(validate({})).toBe(false)
    }
  )
})
