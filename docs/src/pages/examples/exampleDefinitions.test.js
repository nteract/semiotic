import { describe, expect, it } from "vitest"
import {
  compareExampleDefinitionsNewestFirst,
  EXAMPLE_DATA_STATES,
  EXAMPLE_DEFINITIONS,
  getExampleDefinition,
  getPilotExampleDefinitions,
  validateExampleDefinitions,
} from "./exampleDefinitions"

describe("validateExampleDefinitions", () => {
  it("accepts TypeScript example pages and rejects paths outside the page directory", () => {
    const plane = getExampleDefinition("/examples/plane-day")
    expect(validateExampleDefinitions([plane]).ok).toBe(true)
    expect(validateExampleDefinitions([{ ...plane, sourceFile: "../PlaneDayExamplePage.tsx" }]).ok).toBe(false)
  })
  it("requires every definition to declare a contract", () => {
    const result = validateExampleDefinitions([
      {
        id: "static-example",
        path: "/examples/static-example",
        title: "Static example",
        eyebrow: "Narrative",
        description: "A non-pilot example with no source file",
      },
    ])

    expect(result.ok).toBe(false)
    expect(result.errors).toContain(
      'ExampleDefinition "static-example" must define a contract object',
    )
  })

  it("rejects pilot definitions that omit sourceFile", () => {
    const result = validateExampleDefinitions([
      {
        id: "pilot-example",
        path: "/examples/pilot-example",
        isPilot: true,
        title: "Pilot example",
        eyebrow: "Stream",
        description: "A pilot that needs source-mapping",
      },
    ])

    expect(result.ok).toBe(false)
    expect(result.errors).toContain(
      'ExampleDefinition at index 0 must define "sourceFile" for pilot examples',
    )
  })

  it("reports duplicate ids and non-jsx sourceFile extensions", () => {
    const result = validateExampleDefinitions([
      {
        id: "duplicate-id",
        path: "/examples/first",
        sourceFile: "FirstExamplePage.jsx",
        title: "First",
        eyebrow: "A",
        description: "First definition",
        isPilot: true,
      },
      {
        id: "duplicate-id",
        path: "/examples/second",
        sourceFile: "SecondExamplePage.notjsx",
        title: "Second",
        eyebrow: "B",
        description: "Second definition",
        isPilot: true,
      },
      {
        id: "duplicate-id",
        path: "/examples/third",
        sourceFile: "FirstExamplePage.jsx",
        title: "Third",
        eyebrow: "C",
        description: "Duplicate source file",
        isPilot: true,
      },
    ])

    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Duplicate ExampleDefinition id "duplicate-id"')
    expect(result.errors).toContain(
      'ExampleDefinition sourceFile "SecondExamplePage.notjsx" should be a local JSX or TSX source file (e.g. "ExamplePage.tsx")',
    )
  })

  it("requires declared contracts to carry the common quality-contract fields", () => {
    const invalidPilot = {
      id: "incomplete-pilot",
      path: "/examples/incomplete-pilot",
      sourceFile: "IncompleteExamplePage.jsx",
      isPilot: true,
      title: "Incomplete",
      eyebrow: "Pilot",
      description: "Missing contract",
      contract: { assessment: "declared" },
    }

    const result = validateExampleDefinitions([invalidPilot])

    expect(result.ok).toBe(false)
    expect(result.errors).toContain(
      'ExampleDefinition contract for "incomplete-pilot" must define "publicImports"',
    )
  })

  it("rejects incomplete explicit not-assessed contracts", () => {
    const result = validateExampleDefinitions([
      {
        id: "unassessed-example",
        path: "/examples/unassessed-example",
        title: "Unassessed",
        eyebrow: "Registry",
        description: "An intentionally incomplete contract",
        contract: {
          assessment: "not-assessed",
          publicImports: { status: "not-assessed" },
        },
      },
    ])

    expect(result.ok).toBe(false)
    expect(result.errors).toContain(
      'ExampleDefinition contract data for "unassessed-example" must be an explicit "not-assessed" declaration',
    )
  })

  it("uses explicit not-assessed contracts for non-pilot registry entries", () => {
    const insightForge = getExampleDefinition("/examples/insight-forge")

    expect(insightForge).toMatchObject({
      isPilot: false,
      contract: {
        assessment: "not-assessed",
        publicImports: { status: "not-assessed" },
        accessibility: { status: "not-assessed" },
        ssr: { status: "not-assessed", hydration: "not-assessed" },
        performance: {
          status: "unmeasured",
          budgets: {
            bundle: "unmeasured",
            interaction: "unmeasured",
            memory: "unmeasured",
            hiddenPage: "unmeasured",
          },
        },
      },
    })
    expect(EXAMPLE_DEFINITIONS.every((definition) => definition.contract)).toBe(true)
  })

  it("exposes route lookups and explicit, honest pilot contract metadata", () => {
    const watermarks = getExampleDefinition("/examples/watermarks/")

    expect(watermarks).toMatchObject({
      id: "watermarks",
      contract: {
        assessment: "declared",
        data: { states: ["live", "snapshot"] },
        performance: { status: "unmeasured" },
      },
    })
    expect(getExampleDefinition("/examples/unknown")).toBeUndefined()
    expect(getPilotExampleDefinitions().map((definition) => definition.id)).toEqual(
      expect.arrayContaining(["sentence-structure", "analyst-adventure"]),
    )
    expect(
      getPilotExampleDefinitions().every(
        (definition) => definition.contract.assessment === "declared",
      ),
    ).toBe(true)
    expect(EXAMPLE_DATA_STATES).toEqual(["live", "snapshot", "fallback", "error"])
  })

  it("matches the exported project list and stays valid", () => {
    const result = validateExampleDefinitions(EXAMPLE_DEFINITIONS)
    expect(result.ok).toBe(true)
  })

  it("publishes the newest example first with a deterministic route tie-break", () => {
    expect([...EXAMPLE_DEFINITIONS].sort(compareExampleDefinitionsNewestFirst)).toEqual(
      EXAMPLE_DEFINITIONS,
    )

    const publishedAt = "2026-08-09T12:00:00Z"
    const tied = [
      { path: "/examples/zulu", publishedAt },
      { path: "/examples/alpha", publishedAt },
    ].sort(compareExampleDefinitionsNewestFirst)
    expect(tied.map(({ path }) => path)).toEqual(["/examples/alpha", "/examples/zulu"])
  })

  it("requires valid RFC3339 publication timestamps", () => {
    const definition = EXAMPLE_DEFINITIONS[0]
    const result = validateExampleDefinitions([
      { ...definition, publishedAt: "2026-02-30T12:00:00Z" },
    ])

    expect(result.ok).toBe(false)
    expect(result.errors).toContain(
      `ExampleDefinition publishedAt for "${definition.id}" must be a valid RFC3339 timestamp`,
    )
  })

  it("declares the complete Aesthetic Policy Studio source bundle", () => {
    const definition = getExampleDefinition("/examples/aesthetic-policy-studio")
    expect(definition.sourceFiles).toContain(definition.sourceFile)
    expect(definition.sourceFiles).toContain("AestheticPolicyStudioExamplePage.css")
    expect(definition.sourceFiles).toContain("aestheticPolicyStudio.js")
  })

  it("declares the complete Last Scarcity source bundle", () => {
    const definition = getExampleDefinition("/examples/the-last-scarcity")
    expect(definition.sourceFiles).toContain(definition.sourceFile)
    expect(definition.sourceFiles).toContain("last-scarcity/lastScarcityData.js")
    expect(definition.sourceFiles).toContain("TheLastScarcityExamplePage.css")
  })

  it("declares the complete How a Hit Travels source bundle", () => {
    const definition = getExampleDefinition("/examples/how-a-hit-travels")
    expect(definition.sourceFiles).toContain(definition.sourceFile)
    expect(definition.sourceFiles).toContain("HowAHitTravelsExamplePage.css")
    expect(definition.sourceFiles).toContain("how-a-hit-travels/similarityConstellationRecipe.js")
    expect(definition.sourceFiles).toContain("how-a-hit-travels/buildHitTravelsData.mjs")
  })

  it("validates optional structured fixture inventories", () => {
    const definition = getExampleDefinition("/examples/the-last-scarcity")
    const result = validateExampleDefinitions([
      {
        ...definition,
        contract: {
          ...definition.contract,
          data: {
            ...definition.contract.data,
            fixture: {
              ...definition.contract.data.fixture,
              inventory: { claims: -1 },
            },
          },
        },
      },
    ])
    expect(result.ok).toBe(false)
    expect(result.errors.join(" ")).toMatch(/fixture\.inventory.*non-negative integer/i)
  })
})
