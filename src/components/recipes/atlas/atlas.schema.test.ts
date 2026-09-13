import Ajv from "ajv"
import { describe, expect, it } from "vitest"
import schema from "../../../../ai/schema.json"
import {
  atlasStory,
  type AtlasStoryId
} from "../../../../scripts/network-atlas/stories/atlasStories"
import { flowCircuitStory } from "../../../../scripts/network-atlas/stories/flowCircuitStories"
import { supplierStory } from "../../../../scripts/network-atlas/stories/supplierStory"
import { readCircuitEdition } from "semiotic/atlas/core"

const ajv = new Ajv({ strict: false, allErrors: true })
const validators = Object.fromEntries(
  schema.tools
    .filter((tool) =>
      ["MotifBraidChart", "DependencyForestChart", "FlowCircuitChart"].includes(
        tool.function.name
      )
    )
    .map((tool) => [tool.function.name, ajv.compile(tool.function.parameters)])
)

/** Mutate serialized consumer input without weakening the public TS types. */
function malformed(id: AtlasStoryId, path: string, value: unknown) {
  const story = atlasStory(id)
  const props = JSON.parse(JSON.stringify(story.props))
  const keys = path.split("/")
  const key = keys.pop()!
  const parent = keys.reduce<Record<string, unknown>>(
    (object, name) => object[name] as Record<string, unknown>,
    props
  )
  if (value === undefined) delete parent[key]
  else parent[key] = value
  return { props, validate: validators[story.component] }
}

describe("serialized Atlas input schemas", () => {
  it.each([
    ["supplier", "forest/sceneSeeds", null],
    ["supplier", "forest/sceneSeeds", {}],
    ["supplier", "forest/sceneSeeds/nodes/0", null],
    ["supplier", "forest/sceneSeeds/edges/0/source", undefined],
    ["supplier", "forest/children", null],
    ["supplier", "forest/children/world", null],
    ["supplier", "forest/components", null],
    ["supplier", "forest/components/0", "world"],
    ["supplier", "forest/requiredChildren", null],
    ["supplier", "forest/forest", {}],
    ["supplier", "forest/forest/backboneEdgeIds", null],
    ["supplier", "forest/residual", {}],
    ["supplier", "forest/residual/originalEdgeIds", null],
    ["etl", "circuit/modules", null],
    ["etl", "circuit/modules/0", {}],
    ["etl", "circuit/modules/0/semantics", null],
    ["etl", "circuit/modules/0/ports/0", {}],
    ["etl", "circuit/modules/0/roles", null],
    ["etl", "circuit/matches", null],
    ["etl", "circuit/matches/0", {}],
    ["etl", "circuit/overlapPolicy", "unknown"],
    ["etl", "circuit/order", null],
    ["etl", "circuit/backboneEdgeIds", null],
    ["etl", "circuit/residualEdgeIds/0", 42],
    ["checkout", "atlas/source/nodes/0", {}],
    ["checkout", "atlas/source/occurrences/0/nodePath", null],
    ["checkout", "atlas/sections", {}],
    ["checkout", "atlas/motifs/matches", null],
    ["checkout", "atlas/ledger/entries", null],
    ["checkout", "atlas/prefixForest/nodes/0/childIds", null],
    ["supplier", "forest/atlas/requiredPaths/roots", null],
    ["etl", "circuit/atlas/sections/sectionIds", null]
  ] as [AtlasStoryId, string, unknown][])(
    "rejects malformed %s projection at %s (%j)",
    (id, path, value) => {
      const { props, validate } = malformed(id, path, value)
      expect(validate(props)).toBe(false)
      expect(
        validate.errors?.some(
          (error) =>
            error.instancePath === `/${path}` ||
            (error.keyword === "required" &&
              `${error.instancePath}/${error.params.missingProperty}` ===
                `/${path}`)
        ),
        JSON.stringify(validate.errors)
      ).toBe(true)
    }
  )

  // The live reading and each history entry must admit the same event shape.
  describe.each(["reading/entry", "edition/entries/0"])("%s", (entry) => {
    it.each([
      ["", {}],
      ["/id", undefined],
      ["/at", -1],
      ["/nodes", null],
      ["/nodes/p1", null],
      ["/nodes/p1/queued", undefined],
      ["/nodes/p1/arrivals", "80000"],
      ["/nodes/p1/status", "measured"],
      ["/flows", null],
      ["/flows/0", {}],
      ["/flows/0/unit", "jobs"],
      ["/flows/0/perSecond", -1],
      ["/totals", null],
      ["/totals/attempts", undefined],
      ["/totals/queued", "unknown"]
    ])("rejects malformed tape event at %s (%j)", (suffix, value) => {
      const { props, validate } = malformed("etl", entry + suffix, value)
      expect(validate(props)).toBe(false)
      expect(
        validate.errors?.some((error) =>
          error.instancePath.startsWith(`/${entry}`)
        ),
        JSON.stringify(validate.errors)
      ).toBe(true)
    })
  })

  it.each(["etl", "retry"] as const)(
    "accepts complete observed and modeled %s tapes, including null readings",
    (id) => {
      const { circuit, observed, modeled } = flowCircuitStory(id)
      for (const edition of [observed, modeled]) {
        const reading = readCircuitEdition(
          edition,
          edition.kind === "modeled" ? "modeled-scenario" : "observed-replay",
          60
        )
        const validate = validators.FlowCircuitChart
        expect(
          validate(JSON.parse(JSON.stringify({ circuit, edition, reading }))),
          JSON.stringify(validate.errors)
        ).toBe(true)
      }
    }
  )

  it("accepts both supplier projections, including synthetic-root ancestry", () => {
    for (const bypass of [false, true]) {
      const validate = validators.DependencyForestChart
      expect(
        validate({
          forest: JSON.parse(JSON.stringify(supplierStory(bypass).projection))
        }),
        JSON.stringify(validate.errors)
      ).toBe(true)
    }
  })
})
