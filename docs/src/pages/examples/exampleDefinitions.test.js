import { describe, expect, it } from "vitest"
import {
  EXAMPLE_DATA_STATES,
  EXAMPLE_DEFINITIONS,
  getExampleDefinition,
  getPilotExampleDefinitions,
  validateExampleDefinitions,
} from "./exampleDefinitions"

describe("validateExampleDefinitions", () => {
  it("accepts non-pilot definitions without a sourceFile", () => {
    const result = validateExampleDefinitions([
      {
        id: "static-example",
        path: "/examples/static-example",
        title: "Static example",
        eyebrow: "Narrative",
        description: "A non-pilot example with no source file",
      },
    ])

    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
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
      'ExampleDefinition sourceFile "SecondExamplePage.notjsx" should be a local JSX source file (e.g. "ExamplePage.jsx")',
    )
  })

  it("requires every pilot to declare the common quality-contract fields", () => {
    const invalidPilot = {
      id: "incomplete-pilot",
      path: "/examples/incomplete-pilot",
      sourceFile: "IncompleteExamplePage.jsx",
      isPilot: true,
      title: "Incomplete",
      eyebrow: "Pilot",
      description: "Missing contract",
    }

    const result = validateExampleDefinitions([invalidPilot])

    expect(result.ok).toBe(false)
    expect(result.errors).toContain(
      'Pilot ExampleDefinition "incomplete-pilot" must define a contract object',
    )
  })

  it("exposes route lookups and explicit, honest pilot contract metadata", () => {
    const watermarks = getExampleDefinition("/examples/watermarks/")

    expect(watermarks).toMatchObject({
      id: "watermarks",
      contract: {
        data: { states: ["snapshot"] },
        performance: { status: "unmeasured" },
      },
    })
    expect(getExampleDefinition("/examples/unknown")).toBeUndefined()
    expect(getPilotExampleDefinitions()).toHaveLength(3)
    expect(EXAMPLE_DATA_STATES).toEqual(["live", "snapshot", "fallback", "error"])
  })

  it("matches the exported project list and stays valid", () => {
    const result = validateExampleDefinitions(EXAMPLE_DEFINITIONS)
    expect(result.ok).toBe(true)
  })
})
