import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  diagnoseChart,
  type DiagnosisRuntime,
  type DiagnosisSchema
} from "../../../ai/operations/diagnose"
import { diagnoseConfig } from "../../components/charts/shared/diagnoseConfig"
import { validateProps } from "../../components/charts/shared/validateProps"

import { realtimeDefinitionFixtures } from "../../test-utils/realtimeDefinitionFixtures"

const schema: DiagnosisSchema = JSON.parse(
  readFileSync("ai/schema.json", "utf8")
)
const loadSchema = () => schema
const props = { xAccessor: "x", yAccessor: "y" }

describe("shared chart diagnosis operation", () => {
  it.each<[string, DiagnosisRuntime]>([
    ["diagnose", { diagnoseConfig }],
    ["validate", { validateProps }],
    ["schema-only", {}]
  ])(
    "preserves static versus omitted-data push semantics in %s mode",
    (mode, runtime) => {
      expect(
        diagnoseChart({ component: "LineChart", props }, runtime, loadSchema)
      ).toMatchObject({ mode, usageMode: "static", ok: false })
      expect(
        diagnoseChart(
          { component: "LineChart", props, usageMode: "push" },
          runtime,
          loadSchema
        )
      ).toMatchObject({ mode, usageMode: "push", ok: true })
      expect(
        diagnoseChart(
          { component: "LineChart", props, usageMode: "typo" },
          runtime,
          loadSchema
        )
      ).toMatchObject({ usageMode: "static", ok: false })
      expect(
        diagnoseChart(
          {
            component: "LineChart",
            props: { ...props, width: "wide" },
            usageMode: "push"
          },
          runtime,
          loadSchema
        ).ok
      ).toBe(false)
      expect(
        diagnoseChart(
          { component: "GaugeChart", props: {}, usageMode: "push" },
          runtime,
          loadSchema
        ).ok
      ).toBe(false)
      expect(
        diagnoseChart(
          {
            component: "ScatterplotMatrix",
            props: { fields: ["x", "y"] },
            usageMode: "push"
          },
          runtime,
          loadSchema
        ).ok
      ).toBe(false)
      expect(
        diagnoseChart(
          { component: "NotAChart", props: {} },
          runtime,
          loadSchema
        ).ok
      ).toBe(false)
    }
  )

  it("keeps empty arrays in static data mode and reports blank-chart evidence", () => {
    const report = diagnoseChart(
      {
        component: "LineChart",
        props: { ...props, data: [] },
        usageMode: "push"
      },
      { diagnoseConfig },
      loadSchema
    )
    expect(report.ok).toBe(false)
    expect(report).toMatchObject({
      diagnoses: expect.arrayContaining([
        expect.objectContaining({ code: "EMPTY_DATA", severity: "error" })
      ])
    })
  })

  describe.each<[string, DiagnosisRuntime]>([
    ["diagnose", { diagnoseConfig }],
    ["validate", { validateProps }],
    ["schema-only", {}]
  ])("realtime usage contracts in %s mode", (mode, runtime) => {
    it.each(Object.entries(realtimeDefinitionFixtures))(
      "validates %s snapshots and push startup",
      (component, fixture) => {
        const { data, ...props } = fixture
        const report = (props: Record<string, unknown>, usageMode = "static") =>
          diagnoseChart({ component, props, usageMode }, runtime, loadSchema)
        expect(report(props)).toMatchObject({ mode, ok: false })
        expect(report({ ...props, data: null })).toMatchObject({
          mode,
          ok: false
        })
        expect(report(props, "push")).toMatchObject({
          mode,
          ok: component !== "TemporalHistogram"
        })
        expect(report({ ...props, data })).toMatchObject({ mode, ok: true })
        expect(report({ ...props, width: "wide" }, "push").ok).toBe(false)
        for (const usageMode of ["static", "push"]) {
          const emptyReport = report({ ...props, data: [] }, usageMode)
          expect(emptyReport).toMatchObject({ mode, ok: false })
          if (emptyReport.mode === "diagnose") {
            expect(emptyReport.diagnoses).toContainEqual(
              expect.objectContaining({ code: "EMPTY_DATA" })
            )
          } else {
            expect(emptyReport.errors.join(" ")).toMatch(
              /non-empty|at least one/
            )
          }
        }
      }
    )
  })

  it.each<[string, DiagnosisRuntime]>([
    ["diagnose", { diagnoseConfig }],
    ["validate", { validateProps }],
    ["schema-only", {}]
  ])(
    "keeps related family push contracts accurate in %s mode",
    (_mode, runtime) => {
      for (const component of [
        "Heatmap",
        "WaterfallChart",
        "FunnelChart",
        "RadarChart"
      ]) {
        expect(
          diagnoseChart(
            { component, props: {}, usageMode: "push" },
            runtime,
            loadSchema
          ).ok
        ).toBe(true)
        expect(
          diagnoseChart({ component, props: {} }, runtime, loadSchema).ok
        ).toBe(false)
      }
      for (const [component, props] of [
        [
          "CrucibleChart",
          {
            phases: [{ id: "heat", label: "Heat", duration: 2, motion: "mix" }]
          }
        ],
        [
          "ChainReactionChart",
          {
            taskIDAccessor: "id",
            labelAccessor: "label",
            laneAccessor: "lane",
            dependencyAccessor: "deps"
          }
        ]
      ] as const) {
        expect(
          diagnoseChart(
            { component, props, usageMode: "push" },
            runtime,
            loadSchema
          ).ok
        ).toBe(false)
      }
    }
  )

  it("does not load schema or mutate inputs when runtime diagnosis is available", () => {
    const input = Object.freeze({
      ...props,
      data: Object.freeze([{ x: 1, y: 2 }])
    })
    const report = diagnoseChart(
      { component: "LineChart", props: input },
      { diagnoseConfig },
      () => {
        throw new Error("unexpected schema load")
      }
    )
    expect(report).toEqual({
      component: "LineChart",
      usageMode: "static",
      mode: "diagnose",
      ...diagnoseConfig("LineChart", input)
    })
  })

  it("filters only the missing-data validation, preserving other error codes", () => {
    const diagnostics = ["VALIDATION", "OTHER"].map((code) => ({
      code,
      message: '"data" is required for LineChart.',
      severity: "error" as const,
      fix: "fix"
    }))
    const report = diagnoseChart(
      { component: "LineChart", props, usageMode: "push" },
      { diagnoseConfig: () => ({ diagnoses: diagnostics }) },
      loadSchema
    )
    expect(report).toMatchObject({ ok: false, diagnoses: [diagnostics[1]] })
    expect(diagnostics).toHaveLength(2)
  })

  it("labels schema-only success as a limited fallback and honors runtime type extensions", () => {
    const report = diagnoseChart(
      {
        component: "LineChart",
        props: { data: [{ x: 1, y: 2 }], xAccessor: () => 1 }
      },
      {},
      loadSchema
    )
    expect(report).toMatchObject({ mode: "schema-only", ok: true, errors: [] })
  })
})
