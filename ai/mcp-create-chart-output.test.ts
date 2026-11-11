import {
  attachCreateChartOutputs,
  createChartCode,
  createChartGrounding,
  formatCreateChartCode,
  type CreateChartGrounding,
  type CreateChartImage
} from "./mcp-create-chart-output"
import {
  resolveMcpRenderOutputLimits,
  serializedMcpOutputBytes
} from "./mcp-render-output-limits"
import { compactPublicChartProps } from "./mcp-public-chart-props"

const rows = [
  { month: "Jan", revenue: 100, note: "PRIVATE-ROW-A" },
  { month: "Feb", revenue: 140, note: "PRIVATE-ROW-B" }
]

function containsKey(value: unknown, key: string): boolean {
  if (!value || typeof value !== "object") return false
  if (Array.isArray(value)) return value.some((item) => containsKey(item, key))
  return Object.entries(value).some(
    ([name, child]) => name === key || containsKey(child, key)
  )
}

describe("createChart React code", () => {
  it("refers to source rows and omitted props by name instead of inlining them", () => {
    const annotations = [{ type: "label", month: "Feb", label: "Peak" }]
    const props = {
      data: rows,
      categoryAccessor: "month",
      valueAccessor: "revenue",
      title: "Revenue",
      annotations,
      apiToken: "secret"
    }
    const result = createChartCode({
      component: "BarChart",
      importPath: "semiotic/ordinal",
      props,
      publicProps: {
        categoryAccessor: "month",
        valueAccessor: "revenue",
        title: "Revenue"
      },
      inputData: rows,
      inputProps: { title: "Revenue", annotations }
    })
    expect(result).not.toBeNull()
    const { code, config } = result!
    expect(code.import).toBe('import { BarChart } from "semiotic/ordinal"')
    expect(code.jsx.split("\n")).toEqual([
      "<BarChart",
      "  data={data}",
      "  annotations={annotations}",
      '  categoryAccessor="month"',
      '  valueAccessor="revenue"',
      '  title="Revenue"',
      "/>"
    ])
    expect(code.bindings).toEqual([
      { prop: "data", source: "input-data" },
      { prop: "annotations", source: "input-props" }
    ])
    expect(config).toMatchObject({
      component: "BarChart",
      props: { categoryAccessor: "month", valueAccessor: "revenue" }
    })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("PRIVATE-ROW")
    expect(serialized).not.toContain("Peak")
    expect(serialized).not.toContain("apiToken")
    expect(formatCreateChartCode(code)).toContain(
      "- data: the rows you passed as `data`"
    )
  })

  it("marks props Semiotic built from the rows as derived", () => {
    const nodes = [{ id: "a" }, { id: "b" }]
    const result = createChartCode({
      component: "ForceDirectedGraph",
      importPath: "semiotic/network",
      props: { nodes, edges: [{ source: "a", target: "b" }], title: "Graph" },
      publicProps: { title: "Graph" },
      inputData: rows,
      inputProps: {}
    })
    expect(result?.code.bindings).toEqual([
      { prop: "nodes", source: "derived" },
      { prop: "edges", source: "derived" }
    ])
    expect(formatCreateChartCode(result!.code)).toContain(
      "this tool does not return it"
    )
  })

  it("binds partially compacted presentation props without losing their nested settings", () => {
    const frameProps = {
      axes: [{ orient: "left", tickValues: [0, 100, 200] }],
      pointStyle: { fill: "red" },
      annotations: [{ type: "label", label: "PRIVATE-ANNOTATION" }]
    }
    const props = {
      data: rows,
      xAccessor: "month",
      yAccessor: "revenue",
      margin: { left: 80, bottom: 40 },
      frameProps
    }
    const result = createChartCode({
      component: "Scatterplot",
      importPath: "semiotic/xy",
      props,
      publicProps: compactPublicChartProps(props),
      inputData: rows,
      inputProps: { frameProps }
    })!
    expect(result.code.bindings).toEqual([
      { prop: "data", source: "input-data" },
      { prop: "frameProps", source: "input-props" }
    ])
    expect(result.code.jsx).toContain("  frameProps={frameProps}")
    expect(result.code.jsx.match(/frameProps=/g)).toHaveLength(1)
    expect(result.code.jsx).toContain('margin={{"left":80,"bottom":40}}')
    expect(JSON.stringify(result)).not.toContain("PRIVATE-ANNOTATION")
    expect(JSON.stringify(result)).not.toContain("PRIVATE-ROW")
  })

  it("returns no code for a component without a JSX projection", () => {
    expect(
      createChartCode({
        component: "ImaginaryChart",
        importPath: "semiotic",
        props: { data: rows },
        publicProps: {},
        inputData: rows
      })
    ).toBeNull()
  })
})

describe("createChart reader grounding", () => {
  const props = {
    data: rows,
    categoryAccessor: "month",
    valueAccessor: "revenue"
  }

  it("keeps announced labels and drops raw datum records", () => {
    const grounding = createChartGrounding(
      "BarChart",
      props,
      resolveMcpRenderOutputLimits({})
    )
    expect(grounding.text).toMatch(/\S/)
    expect(grounding.bounds).toEqual({
      leavesPerBranch: 50,
      structure: "bounded",
      sourceRows: "omitted"
    })
    expect(grounding.structure?.children?.length).toBeGreaterThan(0)
    expect(containsKey(grounding, "datum")).toBe(false)
    expect(JSON.stringify(grounding)).not.toContain("PRIVATE-ROW")
  })

  it("caps datum labels per branch and omits the structure before exceeding the budget", () => {
    const many = Array.from({ length: 400 }, (_, index) => ({
      month: `M${index}`,
      revenue: index
    }))
    const limits = resolveMcpRenderOutputLimits({ MCP_MAX_WIDGET_ROWS: "20" })
    const bounded = createChartGrounding(
      "BarChart",
      { ...props, data: many },
      limits
    )
    const leaves = (bounded.structure?.children ?? []).filter(
      (node) => node.role === "datum"
    )
    // The tree appends one "…and N more" marker after the kept datum labels.
    expect(leaves.filter((node) => node.value !== undefined)).toHaveLength(20)
    expect(leaves.length).toBeLessThanOrEqual(21)
    expect(bounded.bounds.leavesPerBranch).toBe(20)

    const tight = createChartGrounding(
      "BarChart",
      { ...props, data: many },
      resolveMcpRenderOutputLimits({ MCP_MAX_WIDGET_METADATA_BYTES: "900" })
    )
    expect(tight.structure).toBeUndefined()
    expect(tight.bounds.structure).toBe("omitted")
    expect(tight.text).toMatch(/\S/)
    expect(serializedMcpOutputBytes(tight)).toBeLessThanOrEqual(900)
  })
})

describe("createChart output budget", () => {
  const base = {
    content: [{ type: "text" as const, text: "widget summary" }],
    structuredContent: { status: "render-proven", surfaceVersion: "test" },
    _meta: { svg: "<svg/>" }
  }
  const code = {
    code: {
      language: "tsx" as const,
      import: 'import { BarChart } from "semiotic/ordinal"',
      jsx: "<BarChart\n  data={data}\n/>",
      bindings: [{ prop: "data", source: "input-data" as const }]
    },
    config: { component: "BarChart", props: {} }
  }
  const grounding: CreateChartGrounding = {
    component: "BarChart",
    text: "A bar chart of revenue by month.",
    description: { text: "A bar chart of revenue by month.", levels: {} },
    structure: {
      id: "root",
      role: "chart",
      label: "x".repeat(2_000),
      level: 1
    },
    bounds: { leavesPerBranch: 50, structure: "bounded", sourceRows: "omitted" }
  }
  const image: CreateChartImage = {
    included: true,
    mimeType: "image/png",
    data: "A".repeat(8_000),
    bytes: 6_000
  }
  const parts = { summary: "Rendered.", code, grounding, image }
  const sizeAt = (maximum: number) =>
    attachCreateChartOutputs(base, parts, maximum)

  it("returns every output when all of them fit", () => {
    const result = sizeAt(1_000_000)
    expect(result.content.map((block) => block.type)).toEqual([
      "text",
      "image",
      "text",
      "text"
    ])
    expect(result.structuredContent).toMatchObject({
      status: "render-proven",
      code: code.code,
      config: code.config,
      grounding,
      attachments: {
        image: { included: true, mimeType: "image/png", bytes: 6_000 },
        code: { included: true },
        grounding: { included: true, structure: "bounded" }
      }
    })
    expect(result._meta).toEqual(base._meta)
  })

  it("sheds the image, then the structure, then the prose, then the code", () => {
    const full = serializedMcpOutputBytes(sizeAt(1_000_000))
    const withoutImage = sizeAt(full - 1)
    expect(withoutImage.structuredContent?.attachments).toMatchObject({
      image: { included: false, reason: "output-limit" },
      grounding: { included: true, structure: "bounded" },
      code: { included: true }
    })
    expect(withoutImage.content.some((block) => block.type === "image")).toBe(
      false
    )

    const withoutStructure = sizeAt(
      serializedMcpOutputBytes(withoutImage) - 1
    )
    expect(withoutStructure.structuredContent?.attachments).toMatchObject({
      grounding: { included: true, structure: "omitted" },
      code: { included: true }
    })
    expect(
      (withoutStructure.structuredContent?.grounding as CreateChartGrounding)
        .structure
    ).toBeUndefined()

    const withoutGrounding = sizeAt(
      serializedMcpOutputBytes(withoutStructure) - 1
    )
    expect(withoutGrounding.structuredContent?.attachments).toMatchObject({
      grounding: { included: false, reason: "output-limit" },
      code: { included: true }
    })

    const required = sizeAt(serializedMcpOutputBytes(withoutGrounding) - 1)
    expect(required.structuredContent?.attachments).toEqual({
      image: { included: false, reason: "output-limit" },
      code: { included: false, reason: "output-limit" },
      grounding: { included: false, reason: "output-limit" }
    })
    expect(required.content).toEqual([{ type: "text", text: "Rendered." }])
    for (const result of [
      withoutImage,
      withoutStructure,
      withoutGrounding
    ]) {
      expect(serializedMcpOutputBytes(result)).toBeLessThan(full)
    }
  })

  it("reports why an output was unavailable before any budget applied", () => {
    const result = attachCreateChartOutputs(
      base,
      {
        summary: "Rendered.",
        code: null,
        grounding: null,
        image: { included: false, reason: "renderer-unavailable" }
      },
      1_000_000
    )
    expect(result.structuredContent?.attachments).toEqual({
      image: { included: false, reason: "renderer-unavailable" },
      code: { included: false, reason: "unsupported-component" },
      grounding: { included: false, reason: "unavailable" }
    })
  })

  it("preserves a fitting proven result when even attachment status cannot fit", () => {
    const maximum = serializedMcpOutputBytes(base)
    const result = sizeAt(maximum)
    expect(serializedMcpOutputBytes(result)).toBeLessThanOrEqual(maximum)
    expect(result).toEqual(base)
  })
})
