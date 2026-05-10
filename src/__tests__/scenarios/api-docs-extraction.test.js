import { describe, expect, it } from "vitest"
import {
  extractProps,
  findPropsInterface,
  formatType,
  getComponentDocs,
} from "../../../docs/src/components/apiDocs.js"

const apiFixture = {
  id: 1,
  name: "Semiotic API Reference",
  children: [
    {
      id: 2,
      name: "semiotic-realtime",
      children: [
        {
          id: 3,
          name: "RealtimeLineChartProps",
          variant: "reference",
          kind: 4194304,
          target: 10,
        },
        {
          id: 4,
          name: "RealtimeLineChart",
          variant: "reference",
          kind: 4194304,
          target: 20,
        },
        {
          // The canonical interface is `RealtimeHistogramProps`
          // (id 30 below). `RealtimeTemporalHistogramProps` is the
          // deprecated type alias that points back at the canonical
          // name. The fixture mirrors the actual source-code rename
          // direction so the test exercises a realistic alias graph.
          id: 5,
          name: "RealtimeTemporalHistogramProps",
          kind: 2097152,
          type: {
            type: "reference",
            target: 30,
            name: "RealtimeHistogramProps",
          },
        },
      ],
    },
    {
      id: 10,
      name: "RealtimeLineChartProps",
      kind: 256,
      children: [
        {
          id: 11,
          name: "mode",
          kind: 1024,
          flags: { isOptional: true },
          inheritedFrom: { name: "BaseChartProps.mode" },
          comment: { summary: [{ text: "Display mode." }] },
          type: { type: "reference", name: "ChartMode" },
        },
        {
          id: 12,
          name: "data",
          kind: 1024,
          flags: { isOptional: true },
          comment: {
            summary: [{ text: "Controlled data array." }],
            blockTags: [
              {
                tag: "@example",
                content: [{ text: "```ts\n[{ time: 1, value: 42 }]\n```" }],
              },
            ],
          },
          sources: [{ fileName: "src/components/charts/realtime/RealtimeLineChart.tsx", line: 40 }],
          type: {
            type: "array",
            elementType: { type: "reference", name: "TDatum" },
          },
        },
      ],
    },
    {
      id: 20,
      name: "RealtimeLineChart",
      kind: 32,
      comment: {
        summary: [{ text: "RealtimeLineChart - streaming line chart." }],
        blockTags: [
          {
            tag: "@example",
            content: [{ text: "```tsx\n<RealtimeLineChart windowSize={200} />\n```" }],
          },
        ],
      },
    },
    {
      id: 30,
      name: "RealtimeHistogramProps",
      kind: 256,
      children: [
        {
          id: 31,
          name: "binSize",
          kind: 1024,
          flags: {},
          comment: { summary: [{ text: "Time interval for bins." }] },
          type: { type: "intrinsic", name: "number" },
        },
      ],
    },
  ],
}

describe("api docs TypeDoc extraction", () => {
  it("resolves re-export reflections before extracting props", () => {
    const propsInterface = findPropsInterface(apiFixture, "RealtimeLineChart")

    expect(propsInterface?.id).toBe(10)
    expect(extractProps(propsInterface).map((prop) => prop.name)).toEqual(["data", "mode"])
  })

  it("resolves the canonical props interface for components named ${X}Props", () => {
    // After the alias rename, `findPropsInterface("RealtimeHistogram")`
    // resolves the standard `${componentName}Props` lookup directly to
    // the canonical interface. The deprecated
    // `RealtimeTemporalHistogramProps` type-alias still exists in the
    // fixture (and source) but is just a back-compat handle — the
    // resolver lands on the underlying interface either way.
    const propsInterface = findPropsInterface(apiFixture, "RealtimeHistogram")

    expect(propsInterface?.name).toBe("RealtimeHistogramProps")
    expect(extractProps(propsInterface)[0]).toMatchObject({
      name: "binSize",
      required: true,
    })
  })

  it("preserves prop examples, source metadata, and inherited labels", () => {
    const props = extractProps(findPropsInterface(apiFixture, "RealtimeLineChart"))

    expect(props[0]).toMatchObject({
      name: "data",
      examples: ["[{ time: 1, value: 42 }]"],
      source: "src/components/charts/realtime/RealtimeLineChart.tsx:40",
    })
    expect(props[1]).toMatchObject({
      name: "mode",
      inheritedFrom: "BaseChartProps",
    })
  })

  it("formats function reflection types instead of reducing them to object", () => {
    expect(formatType({
      type: "reflection",
      declaration: {
        signatures: [
          {
            parameters: [
              { name: "value", type: { type: "intrinsic", name: "number" } },
              { name: "index", flags: { isOptional: true }, type: { type: "intrinsic", name: "number" } },
            ],
            type: { type: "intrinsic", name: "string" },
          },
        ],
      },
    })).toBe("(value: number, index?: number) => string")
  })

  it("resolves component summaries and examples through re-exports", () => {
    expect(getComponentDocs(apiFixture, "RealtimeLineChart")).toEqual({
      summary: "RealtimeLineChart - streaming line chart.",
      examples: ["<RealtimeLineChart windowSize={200} />"],
      source: "",
    })
  })
})
