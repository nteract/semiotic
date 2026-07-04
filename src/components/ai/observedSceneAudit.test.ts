import { describe, expect, it } from "vitest"
import { defineChartRecipe } from "./chartRecipes"
import { auditObservedScene } from "./observedSceneAudit"

const recipe = defineChartRecipe({
  id: "local.recipe.audit-test",
  name: "Audit fixture",
  frameFamily: "XYCustomChart",
  portability: "local",
  dataRoles: [
    { role: "category", field: "category", semanticType: "nominal", required: true },
    { role: "value", field: "value", semanticType: "quantitative", required: true },
  ],
  encodings: [
    { channel: "color", role: "category", meaning: "Color identifies category." },
  ],
  intents: ["comparison"],
  designContract: { whyCustom: "Fixture geometry." },
  accessibility: {
    fallbackTable: true,
    tableFields: [
      { role: "category", label: "Category" },
      { field: "detail", label: "Detail" },
    ],
  },
  audit: {
    minimumHitTargetSize: 24,
    requireStableIds: true,
    requireDatumCoverage: true,
  },
})

const data = [
  { category: "A", value: 4, detail: "alpha" },
  { category: "B", value: 6, detail: "beta" },
]

function audit(nodes: Record<string, unknown>[], annotations: Record<string, unknown>[] = []) {
  return auditObservedScene({
    recipe,
    scene: { nodes },
    inputData: data,
    annotations,
    dimensions: { width: 100, height: 100 },
    chart: {
      accessibleTable: true,
      navigationTree: {
        id: "root",
        role: "chart",
        label: "Fixture",
        level: 1,
        children: [{ id: "a", role: "datum", label: "A", level: 2 }],
      },
    },
  })
}

describe("auditObservedScene", () => {
  it("separates declared semantics, observed evidence, and manual checks", () => {
    const result = audit([
      {
        type: "rect", x: 0, y: 0, w: 30, h: 30, datum: data[0],
        _transitionKey: "a", style: { fill: "#111111" },
      },
      {
        type: "rect", x: 40, y: 0, w: 30, h: 30, datum: data[1],
        _transitionKey: "b", style: { fill: "#333333" },
      },
    ])
    expect(result.declaredSemantics.dataRoles).toEqual(["category", "value"])
    expect(result.observedSceneEvidence.length).toBeGreaterThan(5)
    expect(result.manualATChecks.every((finding) => finding.status === "manual")).toBe(true)
  })

  it("detects missing/duplicate ids, non-finite geometry, bounds, and small targets", () => {
    const result = audit([
      {
        type: "rect", x: Number.NaN, y: 0, w: 5, h: 5, datum: data[0],
        _transitionKey: "same", style: { fill: "#111111" },
      },
      {
        type: "rect", x: 95, y: 95, w: 10, h: 10, datum: data[1],
        _transitionKey: "same", style: { fill: "#333333" },
      },
    ])
    const status = (id: string) =>
      result.observedSceneEvidence.find((finding) => finding.id === id)?.status
    expect(status("geometry.finite")).toBe("fail")
    expect(status("geometry.bounds")).toBe("warn")
    expect(status("interaction.target-size")).toBe("warn")
    expect(status("identity.unique-ids")).toBe("fail")
  })

  it("detects unresolved annotations, table field loss, and color-only semantics", () => {
    const result = audit(
      [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: 30,
          h: 30,
          datum: { category: "A", value: 4 },
          _transitionKey: "a",
          style: { fill: "#111111" },
        },
      ],
      [{ type: "callout", pointId: "missing" }],
    )
    const status = (id: string) =>
      result.observedSceneEvidence.find((finding) => finding.id === id)?.status
    expect(status("coverage.annotation-anchors")).toBe("fail")
    expect(status("accessibility.table-fields")).toBe("fail")
    expect(status("accessibility.color-only")).toBe("warn")
  })
})
