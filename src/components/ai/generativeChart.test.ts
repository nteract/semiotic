import { describe, expect, it, vi } from "vitest"
import type { RenderEvidence } from "../server/renderEvidence"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import { repairChartConfig } from "./repairChartConfig"
import { suggestCharts } from "./suggestCharts"
import type { ChartToolDefinition } from "./generativeChart"
import {
  chartGenerationTool,
  createRenderEvidenceMemo,
  createChartToolHandler,
  prepareChart,
  refreshChartDiagnostics,
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

  it("refreshes narration diagnostics when preparation receives generated text", () => {
    const withoutNarration = prepareChart(GOOD_BAR)
    expect(withoutNarration.diagnostics.some((diagnostic) => diagnostic.code === "MISSING_DESCRIPTION")).toBe(true)

    const withNarration = prepareChart(GOOD_BAR, {
      narration: { description: "A bar chart comparing the three categories." },
    })
    expect(withNarration.props.description).toBe("A bar chart comparing the three categories.")
    expect(withNarration.diagnostics.some((diagnostic) => diagnostic.code === "MISSING_DESCRIPTION")).toBe(false)
    expect(refreshChartDiagnostics(withNarration.component, withNarration.props)
      .some((diagnostic) => diagnostic.code === "MISSING_DESCRIPTION")).toBe(false)
  })

  it("memoizes render evidence by immutable data identity and relevant props", () => {
    const render = vi.fn((_component: string, _props: Record<string, unknown>) => ({
      svg: "<svg />",
      evidence: evidence({}),
    }))
    const memo = createRenderEvidenceMemo(render)
    const props = GOOD_BAR.props

    expect(memo.render("BarChart", props)).toEqual(memo.render("BarChart", props))
    expect(render).toHaveBeenCalledTimes(1)
    memo.render("BarChart", { ...props, valueAccessor: "otherValue" })
    expect(render).toHaveBeenCalledTimes(2)
    memo.clear()
    memo.render("BarChart", props)
    expect(render).toHaveBeenCalledTimes(3)
  })

  it("memoizes network inputs and scalar value-component configurations", () => {
    const render = vi.fn((_component: string, _props: Record<string, unknown>) => ({
      svg: "<svg />",
      evidence: evidence({}),
    }))
    const memo = createRenderEvidenceMemo(render)
    const nodes = [{ id: "a" }, { id: "b" }]
    const edges = [{ source: "a", target: "b", value: 3 }]

    memo.render("ForceDirectedGraph", { nodes, edges })
    memo.render("ForceDirectedGraph", { nodes, edges })
    expect(render).toHaveBeenCalledTimes(1)

    memo.render("ForceDirectedGraph", { nodes, edges: [...edges] })
    memo.render("ForceDirectedGraph", { nodes: [...nodes], edges })
    expect(render).toHaveBeenCalledTimes(3)

    // BigNumber has no `data`/`nodes`/`edges` identity. Equivalent primitive
    // configurations still share the small bounded value-config cache.
    memo.render("BigNumber", { value: 42, label: "Revenue", format: "currency" })
    memo.render("BigNumber", { value: 42, label: "Revenue", format: "currency" })
    memo.render("BigNumber", { value: 43, label: "Revenue", format: "currency" })
    expect(render).toHaveBeenCalledTimes(5)
  })

  it("does not collide prop bags containing the legacy cache delimiters", () => {
    const render = vi.fn((_component: string, props: Record<string, unknown>) => ({
      svg: `<svg data-props="${Object.keys(props).join(",")}" />`,
      evidence: evidence({}),
    }))
    const memo = createRenderEvidenceMemo(render)
    const data = [{ category: "A", value: 1 }]

    const embeddedPair = memo.render("BarChart", {
      data,
      a: "x\u0001b=string:y",
    })
    const distinctPair = memo.render("BarChart", {
      data,
      a: "x",
      b: "y",
    })

    expect(embeddedPair).not.toBe(distinctPair)
    expect(render).toHaveBeenCalledTimes(2)
  })

  it("keeps the documented suggestion → prepare → repair → render path type-safe", () => {
    const [suggestion] = suggestCharts(BARS, { allow: ["BarChart"], includeVariants: false })
    expect(suggestion).toBeDefined()
    if (!suggestion) return

    const prepared = prepareChart({ component: suggestion.component, props: suggestion.props })
    const repaired = repairChartConfig(suggestion.component, BARS)
    const alternative = repaired.status === "alternative" || repaired.status === "unknown"
      ? repaired.alternatives[0] ?? suggestion
      : suggestion
    const preparedAlternative = prepareChart({ component: alternative.component, props: alternative.props })
    const rendered = renderChartWithEvidence(alternative.component, alternative.props)

    expect(prepared.validation.valid).toBe(true)
    expect(preparedAlternative.validation.valid).toBe(true)
    expect(rendered.evidence.component).toBe(alternative.component)
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

  it("fails a painted proposal when semantic evidence is degenerate", () => {
    const result = prepareChart(GOOD_BAR, {
      render: () => ({
        svg: "<svg>marks</svg>",
        evidence: evidence({
          semanticStatus: "degenerate",
          semanticDiagnostics: [
            {
              code: "TEST_DEGENERATE",
              severity: "error",
              message: "Every mark carries the same semantic value.",
              fix: "Choose a field with meaningful variation.",
            },
          ],
          warnings: ["TEST_DEGENERATE"],
        }),
      }),
    })

    expect(result.ok).toBe(false)
    expect(result.evidence?.empty).toBe(false)
    expect(result.reasons.join(" ")).toContain("TEST_DEGENERATE")
    expect(result.reasons.join(" ")).toContain("meaningful variation")
  })

  it("does not call the renderer after wire validation rejects a callback string", () => {
    let renderCalls = 0
    const result = prepareChart({
      component: "Scatterplot",
      props: {
        data: [{ x: 1, y: 2 }],
        xAccessor: "x",
        yAccessor: "y",
        xFormat: "d",
      },
    }, {
      render: () => {
        renderCalls += 1
        throw new Error("invalid props reached the renderer")
      },
    })
    expect(result.ok).toBe(false)
    expect(result.validation.valid).toBe(false)
    expect(result.reasons.join(" ")).toContain('"xFormat" should be function')
    expect(renderCalls).toBe(0)
    expect(result.evidence).toBeUndefined()
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
