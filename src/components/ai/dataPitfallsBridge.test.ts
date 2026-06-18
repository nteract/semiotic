import { describe, expect, it } from "vitest"
import {
  buildDataPitfallsBridge,
  toDataPitfallsChain,
  type DataPitfallsChainStage,
  type DataPitfallsTextInput,
} from "./dataPitfallsBridge"

const sales = [
  { month: "Jan", sales: 4200 },
  { month: "Feb", sales: 5100 },
  { month: "Mar", sales: 6800 },
]

function stageByRole(stages: DataPitfallsChainStage[], role: string): DataPitfallsChainStage {
  const stage = stages.find((s) => s.role === role)
  expect(stage, `stage ${role}`).toBeDefined()
  return stage!
}

function textOrCodeArtifact(stage: DataPitfallsChainStage): DataPitfallsTextInput {
  const artifact = stage.artifact
  if (artifact.kind !== "text" && artifact.kind !== "code") {
    throw new Error(`Expected text/code artifact, received ${artifact.kind}`)
  }
  return artifact
}

describe("dataPitfallsBridge", () => {
  it("builds a Data Pitfalls chain with Semiotic config, grounding, diagnostics, and accessibility evidence", () => {
    const result = buildDataPitfallsBridge("AreaChart", {
      data: sales,
      xAccessor: "month",
      yAccessor: "sales",
      yExtent: [3000, 7000],
    }, {
      context: "The chart supports a monthly sales trend claim.",
      grounding: { includeStructure: false },
    })

    expect(result.input.kind).toBe("chain")
    expect(result.config.component).toBe("AreaChart")
    expect(result.grounding?.text).toContain("area chart")
    expect(result.diagnosis?.diagnoses.some((d) => d.code === "NON_ZERO_BASELINE")).toBe(true)
    expect(result.accessibility?.component).toBe("AreaChart")

    const roles = result.input.stages.map((s) => s.role)
    expect(roles).toEqual([
      "Analysis context",
      "Semiotic chart config",
      "Semiotic chart JSX",
      "Semiotic reader grounding",
      "Semiotic config diagnostics",
      "Semiotic accessibility audit",
    ])

    const config = stageByRole(result.input.stages, "Semiotic chart config")
    const configArtifact = textOrCodeArtifact(config)
    expect(configArtifact.kind).toBe("code")
    expect(configArtifact.content).toContain("\"component\": \"AreaChart\"")
    expect(configArtifact.filename).toBe("AreaChart.semiotic-config.json")

    const grounding = stageByRole(result.input.stages, "Semiotic reader grounding")
    const groundingArtifact = textOrCodeArtifact(grounding)
    expect(groundingArtifact.kind).toBe("text")
    expect(groundingArtifact.content).toContain("Structured grounding JSON:")

    const diagnostics = stageByRole(result.input.stages, "Semiotic config diagnostics")
    expect(textOrCodeArtifact(diagnostics).content).toContain("NON_ZERO_BASELINE")
  })

  it("adds rendered image, SVG, render evidence, narrative, and caller stages when provided", () => {
    const input = toDataPitfallsChain("BarChart", {
      data: [{ category: "A", value: 10 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      title: "Revenue",
    }, {
      rendered: {
        image: {
          content: "base64-png",
          mediaType: "image/png",
          filename: "revenue.png",
        },
        svg: "<svg><rect /></svg>",
        evidence: { status: "ok", empty: false, markCount: 1 },
      },
      narrative: "Revenue increased in the latest period.",
      additionalStages: [{
        role: "Upstream SQL",
        artifact: {
          kind: "code",
          language: "sql",
          content: "select category, sum(value) as value from revenue group by 1",
        },
      }],
    })

    expect(input.stages.map((s) => s.role)).toEqual([
      "Semiotic chart config",
      "Semiotic chart JSX",
      "Rendered chart image",
      "Rendered chart SVG",
      "Semiotic render evidence",
      "Semiotic reader grounding",
      "Semiotic config diagnostics",
      "Semiotic accessibility audit",
      "Author narrative",
      "Upstream SQL",
    ])

    const image = stageByRole(input.stages, "Rendered chart image")
    expect(image.artifact.kind).toBe("image")
    if (image.artifact.kind === "image") {
      expect(image.artifact.images[0]).toEqual({
        content: "base64-png",
        mediaType: "image/png",
        filename: "revenue.png",
      })
    }

    const evidence = stageByRole(input.stages, "Semiotic render evidence")
    expect(textOrCodeArtifact(evidence).content).toContain("\"markCount\": 1")
  })

  it("omits render evidence when the rendered evidence value is nullish", () => {
    const input = toDataPitfallsChain("LineChart", {
      data: sales,
      xAccessor: "month",
      yAccessor: "sales",
      title: "Monthly sales",
    }, {
      rendered: {
        svg: "<svg><path /></svg>",
        evidence: undefined,
      },
      includeGrounding: false,
      includeDiagnostics: false,
      includeAccessibility: false,
    })

    expect(input.stages.map((s) => s.role)).toEqual([
      "Semiotic chart config",
      "Semiotic chart JSX",
      "Rendered chart SVG",
    ])
    expect(input.stages.some((s) => s.role === "Semiotic render evidence")).toBe(false)
  })

  it("can omit heavyweight stages and data from the serialized config", () => {
    const input = toDataPitfallsChain("LineChart", {
      data: sales,
      xAccessor: "month",
      yAccessor: "sales",
      title: "Monthly sales",
    }, {
      includeJSX: false,
      includeGrounding: false,
      includeDiagnostics: false,
      includeAccessibility: false,
      config: { includeData: false },
    })

    expect(input.stages.map((s) => s.role)).toEqual(["Semiotic chart config"])
    const config = stageByRole(input.stages, "Semiotic chart config")
    const configArtifact = textOrCodeArtifact(config)
    expect(configArtifact.content).toContain("\"xAccessor\": \"month\"")
    expect(configArtifact.content).not.toContain("\"data\"")
  })
})
