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
  it("does not claim full row coverage from category-only aggregate marks", () => {
    const result = audit([
      {
        type: "rect",
        x: 0,
        y: 0,
        w: 30,
        h: 30,
        datum: { category: "A" },
        id: "aggregate"
      }
    ])
    expect(
      result.observedSceneEvidence.find(
        (finding) => finding.id === "coverage.input-data"
      )
    ).toMatchObject({ status: "fail", evidence: { represented: 0, input: 2 } })
  })

  it("recognizes copied complete rows and explicit aggregate member datums", () => {
    for (const datums of [[...data.map((row) => ({ ...row }))], [data]]) {
      const result = audit(
        datums.map((datum, index) => ({
          type: "rect",
          x: index * 30,
          y: 0,
          w: 30,
          h: 30,
          datum,
          id: `row-${index}`
        }))
      )
      expect(
        result.observedSceneEvidence.find(
          (finding) => finding.id === "coverage.input-data"
        )
      ).toMatchObject({ status: "pass", evidence: { represented: 2 } })
    }
  })

  it("checks stroked horizontal lines without area or target-size false positives", () => {
    const result = audit([
      {
        type: "line",
        x1: 0,
        x2: 80,
        y1: 50,
        y2: 50,
        datum: data[0],
        id: "line",
        style: { fill: "none", stroke: "#eeeeee" }
      }
    ])
    for (const id of ["geometry.nonzero-area", "interaction.target-size"]) {
      expect(
        result.observedSceneEvidence.find((finding) => finding.id === id)
          ?.status
      ).toBe("pass")
    }
    expect(
      result.observedSceneEvidence.find(
        (finding) => finding.id === "visual.contrast"
      )?.status
    ).toBe("warn")
  })

  it("covers 50,000 copied row marks with a linear field-read budget", () => {
    let reads = 0
    const rows = Array.from({ length: 50_000 }, (_, index) => ({
      category: `category-${index}`,
      get value() {
        reads++
        return index
      }
    }))
    const scene = rows.map((row, index) => ({
      type: "rect",
      id: `sample-${index}`,
      x: 0,
      y: 0,
      w: 30,
      h: 30,
      datum: { category: row.category, value: index }
    }))
    const result = auditObservedScene({
      recipe,
      scene,
      inputData: rows,
      dimensions: { width: 100, height: 100 }
    })
    expect(
      result.observedSceneEvidence.find(
        (finding) => finding.id === "coverage.input-data"
      )
    ).toMatchObject({ status: "pass", evidence: { represented: 50_000 } })
    expect(reads).toBeLessThanOrEqual(150_000)
  })

  it("measures a 300,000-point path without a spread-argument crash", () => {
    const result = audit([{
      type: "line", path: Array.from({ length: 300_000 }, (_, index) => [index % 100, index % 50]),
      datum: data[0], _transitionKey: "long-path", style: { stroke: "#111111" }
    }])
    expect(result.observedSceneEvidence.find((finding) => finding.id === "geometry.bounds")?.status).toBe("pass")
    expect(result.observedSceneEvidence.find((finding) => finding.id === "geometry.finite")?.status).toBe("pass")
  })

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
