import { describe, expect, it } from "vitest"
import type { RenderEvidence } from "../server/renderEvidence"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import type { ChartToolDefinition } from "./generativeChart"
import {
  chartGenerationTool,
  createChartToolHandler,
  prepareChart,
  toAnthropicTool,
  toOpenAITool,
  toOpenAIResponsesTool,
} from "./generativeChart"

const BARS = [
  { cat: "A", val: 12 },
  { cat: "B", val: 30 },
  { cat: "C", val: 18 },
]

const GOOD_BAR = {
  component: "BarChart",
  props: { data: BARS, categoryAccessor: "cat", valueAccessor: "val" },
}

const GALTON_SAMPLES = [
  { id: "a", value: 1 },
  { id: "b", value: 2 },
  { id: "c", value: 3 },
  { id: "d", value: 4 }
]

interface ComponentToolSchema {
  required: string[]
  properties: {
    component: { enum: string[] }
  }
}

function componentToolSchema(
  schema: Record<string, unknown>
): ComponentToolSchema {
  const required = Reflect.get(schema, "required")
  const properties = Reflect.get(schema, "properties")
  const component =
    properties && typeof properties === "object"
      ? Reflect.get(properties, "component")
      : null
  const values =
    component && typeof component === "object"
      ? Reflect.get(component, "enum")
      : null

  if (!Array.isArray(required) || !Array.isArray(values)) {
    throw new Error("Component tool schema is missing required component metadata")
  }

  return {
    required: required.map(String),
    properties: { component: { enum: values.map(String) } }
  }
}

function evidence(partial: Partial<RenderEvidence>): RenderEvidence {
  return {
    component: "BarChart",
    frameType: "ordinal",
    status: partial.empty ? "empty" : "ok",
    empty: false,
    markCount: 3,
    markCountByType: { rect: 3 },
    width: 600,
    height: 400,
    annotationCount: 0,
    ariaLabel: "bar chart",
    warnings: [],
    ...partial,
  } as RenderEvidence
}

// ── prepareChart ─────────────────────────────────────────────────────────────

describe("prepareChart", () => {
  it("passes a valid proposal — ok, config, and jsx, no reasons", () => {
    const result = prepareChart(GOOD_BAR)
    expect(result.ok).toBe(true)
    expect(result.reasons).toEqual([])
    expect(result.validation.valid).toBe(true)
    expect(result.config?.component).toBe("BarChart")
    expect(result.jsx).toContain("<BarChart")
    expect(result.jsx).toContain('categoryAccessor="cat"')
  })

  it("fails an unknown component without painting (no config, with reasons)", () => {
    const result = prepareChart({ component: "FooChart", props: {} })
    expect(result.ok).toBe(false)
    expect(result.config).toBeUndefined()
    expect(result.jsx).toBeUndefined()
    expect(result.reasons.join(" ")).toMatch(/Unknown component "FooChart"/)
  })

  it("fails a proposal missing a required prop and surfaces the validation error", () => {
    const result = prepareChart({
      component: "StackedBarChart",
      props: { data: BARS, categoryAccessor: "cat", valueAccessor: "val" }, // missing stackBy
    })
    expect(result.ok).toBe(false)
    expect(result.validation.valid).toBe(false)
    expect(result.reasons.join(" ")).toMatch(/stackBy/)
  })

  it("routes a repair when data is supplied and reports the fit verdict", () => {
    const good = prepareChart(GOOD_BAR, { data: BARS })
    expect(good.repair).toBeDefined()
    expect(good.repair!.status).toBe("ok")

    const unknown = prepareChart({ component: "FooChart" }, { data: BARS })
    expect(unknown.repair).toBeDefined()
    if (unknown.repair!.status !== "ok") {
      expect(Array.isArray(unknown.repair!.alternatives)).toBe(true)
    }
  })

  it("fails when an injected renderer reports an empty scene", () => {
    const result = prepareChart(GOOD_BAR, {
      render: () => ({ svg: "<svg/>", evidence: evidence({ empty: true, markCount: 0 }) }),
    })
    expect(result.ok).toBe(false)
    expect(result.evidence?.empty).toBe(true)
    expect(result.reasons.join(" ")).toMatch(/empty scene/)
  })

  it("passes and attaches svg + evidence when the renderer proves a non-empty scene", () => {
    const result = prepareChart(GOOD_BAR, {
      render: () => ({ svg: "<svg>bars</svg>", evidence: evidence({ markCount: 3 }) }),
    })
    expect(result.ok).toBe(true)
    expect(result.svg).toBe("<svg>bars</svg>")
    expect(result.evidence?.markCount).toBe(3)
  })

  it("passes a first-try physics proposal with render evidence", () => {
    const result = prepareChart({
      component: "GaltonBoardChart",
      props: {
        data: GALTON_SAMPLES,
        valueAccessor: "value",
        bins: 4,
        width: 320,
        height: 200,
        title: "First-try physics distribution"
      },
    }, {
      render: (component, props) =>
        renderChartWithEvidence(component as Parameters<typeof renderChartWithEvidence>[0], props),
    })

    expect(result.ok).toBe(true)
    expect(result.jsx).toContain("<GaltonBoardChart")
    expect(result.evidence?.component).toBe("GaltonBoardChart")
    expect(result.evidence?.frameType).toBe("physics")
    expect(result.evidence?.empty).toBe(false)
    expect(result.evidence?.markCount).toBeGreaterThanOrEqual(GALTON_SAMPLES.length)
  })

  it("can surface error diagnostics as non-blocking when asked", () => {
    // These margins pass structural validation but leave no drawing area.
    const impossibleMargins = {
      component: "BarChart",
      props: {
        data: BARS,
        categoryAccessor: "cat",
        valueAccessor: "val",
        width: 100,
        height: 100,
        margin: { left: 60, right: 60, top: 60, bottom: 60 },
      },
    }
    const blocking = prepareChart(impossibleMargins)
    expect(blocking.ok).toBe(false)
    expect(blocking.validation.valid).toBe(true)
    const nonBlocking = prepareChart(impossibleMargins, { treatErrorsAsBlocking: false })
    // diagnostics still reported, but they don't block ok
    expect(nonBlocking.ok).toBe(true)
    expect(nonBlocking.diagnostics.some((d) => d.code === "MARGIN_OVERFLOW_H")).toBe(true)
  })

  it("does not mutate the input props", () => {
    const props = { data: BARS, categoryAccessor: "cat", valueAccessor: "val" }
    const snapshot = JSON.parse(JSON.stringify(props))
    prepareChart({ component: "BarChart", props })
    expect(props).toEqual(snapshot)
  })
})

// ── tool definitions ─────────────────────────────────────────────────────────

describe("chart tool definitions", () => {
  it("builds a JSON-Schema tool with a component enum from the registry", () => {
    const tool = chartGenerationTool()
    expect(tool.name).toBe("render_semiotic_chart")
    const schema = componentToolSchema(tool.inputSchema)
    expect(schema.required).toContain("component")
    expect(schema.properties.component.enum).toContain("BarChart")
    expect(schema.properties.component.enum).toContain("LineChart")
  })

  it("restricts the component enum to an allow-list", () => {
    const tool = chartGenerationTool({ components: ["BarChart", "LineChart"], name: "make_chart" })
    expect(tool.name).toBe("make_chart")
    expect(componentToolSchema(tool.inputSchema).properties.component.enum).toEqual(["BarChart", "LineChart"])
  })

  it("shapes for Anthropic and OpenAI without losing the schema", () => {
    const tool = chartGenerationTool()
    const anthropic = toAnthropicTool(tool)
    expect(anthropic.input_schema).toBe(tool.inputSchema)
    const openai = toOpenAITool(tool)
    expect(openai.type).toBe("function")
    expect(openai.function.parameters).toBe(tool.inputSchema)
    expect(openai.function.name).toBe(tool.name)

    const responses = toOpenAIResponsesTool(tool)
    expect(responses).toMatchObject({
      type: "function",
      name: tool.name,
      parameters: tool.inputSchema,
      strict: false,
    })
  })

  it("supports strict Responses tools only for closed JSON schemas", () => {
    expect(() => toOpenAIResponsesTool(chartGenerationTool(), { strict: true })).toThrow(
      /strict mode requires a top-level object schema/
    )

    for (const inputSchema of [null, [], "not-a-schema", { type: "string" }]) {
      expect(() =>
        toOpenAIResponsesTool(
          { name: "invalid", description: "Invalid strict schema", inputSchema } as unknown as ChartToolDefinition,
          { strict: true }
        )
      ).toThrow(/top-level object schema/)
    }

    expect(() =>
      toOpenAIResponsesTool(
        {
          name: "invalid_nested",
          description: "Invalid nested schema",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            required: ["component"],
            properties: { component: "not-a-schema" },
          },
        } as unknown as ChartToolDefinition,
        { strict: true }
      )
    ).toThrow(/top-level object schema/)

    const closed = {
      name: "closed_chart",
      description: "A closed tool schema",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["component", "title"],
        properties: {
          component: { type: "string" },
          title: { type: ["string", "null"] },
        },
      },
    }
    expect(toOpenAIResponsesTool(closed, { strict: true }).strict).toBe(true)
  })

  it("createChartToolHandler runs the trust loop on tool input", () => {
    const handler = createChartToolHandler(() => ({ data: BARS }))
    const result = handler(GOOD_BAR)
    expect(result.ok).toBe(true)
    expect(result.repair?.status).toBe("ok")
  })
})
