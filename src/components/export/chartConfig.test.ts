import { describe, it, expect } from "vitest"
import {
  toConfig,
  fromConfig,
  toURL,
  fromURL,
  configToJSX,
  configToJSXWithReport
} from "./chartConfig"
import type { ChartConfig } from "./chartConfig"
import type { Datum } from "../charts/shared/datumTypes"
import { defineChartRecipe } from "../ai/chartRecipes"
import {
  registerChartRecipe,
  registerRecipeLayout,
  unregisterRecipeLayout,
  unregisterChartRecipe
} from "../ai/chartRecipeRegistry"
import { buildArtifactContract } from "../artifact/contract"
import { evaluateArtifact } from "../artifact/evaluateArtifact"
import { serializeArtifactContract } from "../artifact/serialization"

function artifactContract() {
  return buildArtifactContract(
    "LineChart",
    {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y"
    },
    { id: "serialized-chart", intents: ["trend"] }
  )
}

// ── toConfig ───────────────────────────────────────────────────────────

describe("toConfig", () => {
  it("creates a config with component name and version", () => {
    const config = toConfig("LineChart", {
      xAccessor: "time",
      yAccessor: "value"
    })
    expect(config.component).toBe("LineChart")
    expect(config.version).toBe("1")
    expect(config.createdAt).toBeTruthy()
    expect(config.props.xAccessor).toBe("time")
  })

  it("preserves an optional artifact sidecar with an explicit transfer report", () => {
    const contract = artifactContract()
    const config = toConfig(
      "LineChart",
      { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      { artifactContract: contract }
    )
    const restored = fromConfig(config)

    expect(config.artifactTransfer?.status).toBe("preserved")
    expect(config.artifactTransfer?.serializedConfigFingerprint).toMatch(
      /^sha256:/
    )
    expect(config.artifactTransfer?.serializedDataFingerprint).toMatch(
      /^sha256:/
    )
    expect(restored.artifactContract).toEqual(contract)
    expect(restored.artifactContract).not.toBe(contract)
    expect(restored.artifactTransfer?.status).toBe("preserved")
  })

  it("reports configuration fields dropped from a contract-bound chart", () => {
    const props = {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      legend: { title: "Series", position: "right" }
    }
    const contract = buildArtifactContract("LineChart", props, {
      id: "lossy-chart-config"
    })
    const config = toConfig("LineChart", props, {
      artifactContract: contract
    })
    const restored = fromConfig(config)

    expect(config.props.legend).toBeUndefined()
    expect(config.artifactTransfer).toMatchObject({
      status: "excluded",
      omittedPaths: ["props.legend"]
    })
    expect(restored.artifactTransfer).toMatchObject({
      status: "excluded",
      omittedPaths: ["props.legend"]
    })
    expect(
      evaluateArtifact(
        restored.componentName,
        restored.props,
        restored.artifactContract as typeof contract,
        { recommendRepresentation: false }
      ).obligations
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "identity.configuration",
          status: "fail"
        })
      ])
    )
  })

  it("reports data excluded from a contract-bound chart", () => {
    const props = {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y"
    }
    const contract = buildArtifactContract("LineChart", props, {
      id: "chart-with-excluded-data"
    })

    const config = toConfig("LineChart", props, {
      artifactContract: contract,
      includeData: false
    })
    const restored = fromConfig(config)

    expect(config.props.data).toBeUndefined()
    expect(config.artifactTransfer).toMatchObject({
      status: "excluded",
      omittedPaths: ["props.data"]
    })
    expect(restored.artifactTransfer).toMatchObject({
      status: "excluded",
      omittedPaths: ["props.data"]
    })
  })

  it("rejects a sidecar bound to different source data", () => {
    const contract = artifactContract()

    const config = toConfig(
      "LineChart",
      { data: [{ x: 1, y: 99 }], xAccessor: "x", yAccessor: "y" },
      { artifactContract: contract }
    )

    expect(config.artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: ["artifact.dataFingerprint"]
    })
  })

  it("rejects a sidecar that names a different source component", () => {
    const contract = artifactContract()
    contract.artifact.component = "Scatterplot"

    const config = toConfig(
      "LineChart",
      { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      { artifactContract: contract }
    )

    expect(config.artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: ["artifact.component"]
    })
  })

  it("reports stripped props even when no fingerprint can expose the loss", () => {
    const callbackProps = {
      data: [{ x: 1, y: 2 }],
      xAccessor: (datum: { x: number }) => datum.x,
      yAccessor: "y"
    }
    const callbackContract = buildArtifactContract("LineChart", callbackProps, {
      id: "callback-accessor"
    })
    const callbackConfig = toConfig("LineChart", callbackProps, {
      artifactContract: callbackContract
    })

    const legendProps = {
      data: [{ category: "A", value: 2 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      legend: { title: "Category" }
    }
    const noFingerprintContract = buildArtifactContract(
      "BarChart",
      legendProps,
      { id: "no-config-fingerprint" }
    )
    delete noFingerprintContract.artifact.configFingerprint
    const legendConfig = toConfig("BarChart", legendProps, {
      artifactContract: noFingerprintContract
    })

    const mapProps = {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      customState: new Map([["a", 1]])
    }
    const mapConfig = toConfig("LineChart", mapProps, {
      artifactContract: buildArtifactContract("LineChart", mapProps, {
        id: "map-state"
      })
    })

    expect(callbackConfig.artifactTransfer).toMatchObject({
      status: "excluded",
      omittedPaths: ["props.xAccessor"]
    })
    expect(legendConfig.artifactTransfer).toMatchObject({
      status: "excluded",
      omittedPaths: ["props.legend"]
    })
    expect(mapConfig.props.customState).toBeUndefined()
    expect(mapConfig.artifactTransfer).toMatchObject({
      status: "excluded",
      omittedPaths: ["props.customState"]
    })
  })

  it("drops a whole prop when a nested value cannot survive JSON", () => {
    const props = {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      styleRules: {
        stroke: "navy",
        when: () => true
      }
    }
    const config = toConfig("LineChart", props, {
      artifactContract: buildArtifactContract("LineChart", props)
    })

    expect(config.props.styleRules).toBeUndefined()
    expect(config.artifactTransfer).toMatchObject({
      status: "excluded",
      omittedPaths: ["props.styleRules"]
    })
    expect(fromConfig(config).artifactTransfer?.status).toBe("excluded")
  })

  it("excludes non-JSON props before they can change in a URL round trip", () => {
    const values = [
      new Date("2026-09-03T00:00:00Z"),
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -0,
      BigInt(2)
    ]

    for (const value of values) {
      const props = {
        data: [{ x: 1, y: 2 }],
        xAccessor: "x",
        yAccessor: "y",
        customValue: value
      }
      const config = toConfig("LineChart", props, {
        artifactContract: buildArtifactContract("LineChart", props)
      })

      expect(config.props.customValue).toBeUndefined()
      expect(config.artifactTransfer).toMatchObject({
        status: "excluded",
        omittedPaths: ["props.customValue"]
      })
      expect(fromConfig(fromURL(toURL(config))).artifactTransfer?.status).toBe(
        "excluded"
      )
    }
  })

  it("detects chart prop and data tampering while restoring a preserved sidecar", () => {
    const config = toConfig(
      "LineChart",
      { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      { artifactContract: artifactContract() }
    )
    const changedConfiguration = fromConfig({
      ...config,
      props: { ...config.props, yAccessor: "changed" }
    })
    const changedData = fromConfig({
      ...config,
      props: { ...config.props, data: [{ x: 1, y: 99 }] }
    })

    expect(changedConfiguration.artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining([
        "artifact.configFingerprint",
        "artifactTransfer.serializedConfigFingerprint"
      ])
    })
    expect(changedData.artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining([
        "artifact.dataFingerprint",
        "artifactTransfer.serializedDataFingerprint"
      ])
    })
  })

  it("rejects preservation without a sidecar and omissions still present", () => {
    const missingSidecar = fromConfig({
      component: "LineChart",
      props: { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      version: "1",
      createdAt: "2026-09-03T00:00:00.000Z",
      artifactTransfer: {
        status: "preserved",
        omittedPaths: [],
        warnings: []
      }
    })
    const config = toConfig(
      "LineChart",
      { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      { artifactContract: artifactContract() }
    )
    const falseOmission = fromConfig({
      ...config,
      artifactTransfer: {
        status: "excluded",
        omittedPaths: ["artifact.configFingerprint"],
        warnings: ["Configuration identity was omitted."]
      }
    })
    const missingSidecarWithPresentProp = fromConfig({
      component: "LineChart",
      props: { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      version: "1",
      createdAt: "2026-09-03T00:00:00.000Z",
      artifactTransfer: {
        status: "excluded",
        omittedPaths: ["artifactContract", "props.xAccessor"],
        warnings: ["The sidecar and accessor were excluded."]
      }
    })

    expect(missingSidecar.artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: ["artifactContract"]
    })
    expect(falseOmission.artifactTransfer).toMatchObject({
      status: "invalid"
    })
    expect(falseOmission.artifactTransfer?.warnings.join(" ")).toContain(
      "omitted path is still present"
    )
    expect(missingSidecarWithPresentProp.artifactTransfer).toMatchObject({
      status: "invalid"
    })
  })

  it("detects tampering after a legitimate prop exclusion", () => {
    const props = {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      legend: { title: "Series" }
    }
    const config = toConfig("LineChart", props, {
      artifactContract: buildArtifactContract("LineChart", props, {
        id: "excluded-then-changed"
      })
    })

    expect(config.artifactTransfer?.status).toBe("excluded")
    const restored = fromConfig({
      ...config,
      props: { ...config.props, yAccessor: "changed" }
    })

    expect(restored.artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining([
        "props.legend",
        "artifactTransfer.serializedConfigFingerprint"
      ])
    })
    expect(restored.artifactTransfer?.warnings.join(" ")).toContain(
      "no longer matches its transfer fingerprints"
    )

    const changedReport = fromConfig({
      ...config,
      artifactTransfer: {
        ...config.artifactTransfer!,
        omittedPaths: ["props.fake"]
      }
    })
    expect(changedReport.artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining([
        "props.fake",
        "artifactTransfer.transferFingerprint"
      ])
    })
  })

  it("binds the declared transfer outcome as well as its payload", () => {
    const config = toConfig(
      "LineChart",
      { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      { artifactContract: artifactContract() }
    )
    const forged = fromURL(toURL(config))
    forged.artifactTransfer = {
      ...forged.artifactTransfer!,
      status: "excluded",
      omittedPaths: ["props.legend"]
    }

    const restored = fromConfig(fromURL(toURL(forged)))

    expect(restored.artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining([
        "props.legend",
        "artifactTransfer.transferFingerprint"
      ])
    })
  })

  it("binds top-level selection state to the transfer report", () => {
    const config = toConfig(
      "LineChart",
      { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      { artifactContract: artifactContract(), selections: {} }
    )
    const changed = fromURL(toURL(config))
    changed.selections = {
      focus: {
        name: "focus",
        resolution: "union",
        clauses: []
      }
    }

    expect(fromConfig(changed).artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining([
        "artifactTransfer.transferFingerprint"
      ])
    })
  })

  it("binds the transfer report to the component and contract", () => {
    const config = toConfig(
      "LineChart",
      { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      { artifactContract: artifactContract() }
    )
    const changedComponent = fromURL(toURL(config))
    changedComponent.component = "Scatterplot"
    const componentResult = fromConfig(fromURL(toURL(changedComponent)))

    const changedContract = fromURL(toURL(config))
    const contractWithPurpose = changedContract.artifactContract as {
      purpose: { intents: unknown[] }
    }
    contractWithPurpose.purpose.intents = []
    const contractResult = fromConfig(fromURL(toURL(changedContract)))

    expect(componentResult.artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining([
        "artifactTransfer.transferFingerprint"
      ])
    })
    expect(contractResult.artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining([
        "artifactTransfer.transferFingerprint"
      ])
    })
  })

  it("rejects a non-invalid transfer report when its bindings are removed", () => {
    const config = fromURL(
      toURL(
        toConfig(
          "LineChart",
          { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
          { artifactContract: artifactContract() }
        )
      )
    )
    delete config.artifactTransfer?.serializedConfigFingerprint
    delete config.artifactTransfer?.serializedDataFingerprint
    delete config.artifactTransfer?.transferFingerprint
    const artifact = config.artifactContract?.artifact as
      Record<string, unknown> | undefined
    if (artifact) {
      delete artifact.configFingerprint
      delete artifact.dataFingerprint
    }

    expect(fromConfig(fromURL(toURL(config))).artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining([
        "artifactTransfer.serializedConfigFingerprint",
        "artifactTransfer.serializedDataFingerprint",
        "artifactTransfer.transferFingerprint"
      ])
    })
  })

  it("does not synthesize preservation when a sidecar loses its report", () => {
    const preserved = toConfig(
      "LineChart",
      { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      { artifactContract: artifactContract() }
    )
    const missingPreservedReport = fromURL(toURL(preserved))
    delete missingPreservedReport.artifactTransfer

    const lossyProps = {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      legend: { title: "Series" }
    }
    const lossyContract = buildArtifactContract("LineChart", lossyProps, {
      id: "missing-loss-report"
    })
    delete lossyContract.artifact.configFingerprint
    const excluded = toConfig("LineChart", lossyProps, {
      artifactContract: lossyContract
    })
    const missingExcludedReport = fromURL(toURL(excluded))
    delete missingExcludedReport.artifactTransfer

    for (const candidate of [missingPreservedReport, missingExcludedReport]) {
      expect(
        fromConfig(fromURL(toURL(candidate))).artifactTransfer
      ).toMatchObject({
        status: "invalid",
        omittedPaths: expect.arrayContaining(["artifactTransfer"])
      })
    }
  })

  it("rejects an unbound forward-version report and a reintroduced omission", () => {
    const forward = {
      contractVersion: "0.2",
      artifact: { id: "future", kind: "chart" },
      purpose: { intents: [] },
      claims: [],
      evidence: [
        {
          id: "source",
          role: "source-data",
          sample: { values: [{ secret: "private" }] },
          futureState: { mode: "opaque" }
        }
      ]
    }
    const serialized = serializeArtifactContract(forward, {
      excludeEvidenceSamples: true
    })
    const config: ChartConfig = {
      component: "LineChart",
      props: { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      version: "1",
      createdAt: "2026-09-03T00:00:00.000Z",
      artifactContract: serialized.contract,
      artifactTransfer: serialized.transfer
    }
    expect(fromConfig(fromURL(toURL(config))).artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining([
        "$.evidence[0].sample",
        "artifactTransfer.serializedConfigFingerprint",
        "artifactTransfer.serializedDataFingerprint",
        "artifactTransfer.transferFingerprint"
      ])
    })

    const reintroduced = fromURL(toURL(config))
    const reintroducedContract = reintroduced.artifactContract as unknown as {
      evidence: Array<Record<string, unknown>>
    }
    reintroducedContract.evidence[0].sample = {
      values: [{ secret: "restored" }]
    }
    const restored = fromConfig(fromURL(toURL(reintroduced)))

    expect(restored.artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining(["$.evidence[0].sample"])
    })
    expect(restored.artifactTransfer?.warnings.join(" ")).toContain(
      "omitted path is still present"
    )
  })

  it("rejects an unbound declared exclusion on restore", () => {
    const contract = buildArtifactContract(
      "LineChart",
      { data: [] },
      {
        id: "excluded-sidecar",
        evidence: [
          {
            id: "source",
            role: "source-data",
            sample: { rowCount: 2, values: [{ value: 1 }] }
          }
        ]
      }
    )
    const config = toConfig(
      "LineChart",
      { data: [] },
      { artifactContract: contract }
    )
    const contractWithoutSample = {
      ...config.artifactContract,
      evidence: [{ id: "source", role: "source-data" }]
    }
    const restored = fromConfig({
      ...config,
      artifactContract: contractWithoutSample as typeof config.artifactContract,
      artifactTransfer: {
        status: "excluded",
        omittedPaths: ["$.evidence[0].sample"],
        warnings: ["Bounded evidence samples were excluded by policy."]
      }
    })

    expect(restored.artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining([
        "$.evidence[0].sample",
        "artifactTransfer.serializedConfigFingerprint",
        "artifactTransfer.serializedDataFingerprint",
        "artifactTransfer.transferFingerprint"
      ])
    })
  })

  it("strips function props", () => {
    const config = toConfig("Scatterplot", {
      xAccessor: "x",
      yAccessor: "y",
      customHoverBehavior: () => {},
      sizeBy: (d: Datum) => d.size
    })
    expect(config.props.xAccessor).toBe("x")
    expect(config.props.customHoverBehavior).toBeUndefined()
    expect(config.props.sizeBy).toBeUndefined()
  })

  it("strips always-excluded props (callbacks, React nodes)", () => {
    const config = toConfig("BarChart", {
      categoryAccessor: "month",
      tooltip: true,
      onObservation: () => {},
      frameProps: {},
      legend: "some-legend"
    })
    expect(config.props.categoryAccessor).toBe("month")
    expect(config.props.tooltip).toBeUndefined()
    expect(config.props.onObservation).toBeUndefined()
    expect(config.props.frameProps).toBeUndefined()
    expect(config.props.legend).toBeUndefined()
  })

  it("strips React elements ($$typeof)", () => {
    const fakeElement = { $$typeof: Symbol.for("react.element"), type: "div" }
    const config = toConfig("LineChart", {
      xAccessor: "x",
      title: fakeElement
    })
    expect(config.props.title).toBeUndefined()
    expect(config.props.xAccessor).toBe("x")
  })

  it("strips null and undefined props", () => {
    const config = toConfig("LineChart", {
      xAccessor: "x",
      colorBy: null,
      lineBy: undefined
    })
    expect(config.props.xAccessor).toBe("x")
    expect("colorBy" in config.props).toBe(false)
    expect("lineBy" in config.props).toBe(false)
  })

  it("excludes data when includeData is false", () => {
    const config = toConfig(
      "LineChart",
      {
        data: [{ x: 1, y: 2 }],
        xAccessor: "x"
      },
      { includeData: false }
    )
    expect(config.props.data).toBeUndefined()
    expect(config.props.xAccessor).toBe("x")
  })

  it("excludes all public data collections when includeData is false", () => {
    const config = toConfig(
      "FlowMap",
      {
        data: [{ id: "raw" }],
        nodes: [{ id: "sf" }],
        edges: [{ source: "sf", target: "nyc" }],
        points: [{ lon: -122.4, lat: 37.8 }],
        areas: [{ id: "west" }],
        lines: [
          {
            coordinates: [
              [-122.4, 37.8],
              [-74, 40.7]
            ]
          }
        ],
        flows: [{ source: "sf", target: "nyc", value: 10 }],
        valueAccessor: "value"
      },
      { includeData: false }
    )

    expect(config.props).toMatchObject({ valueAccessor: "value" })
    for (const key of [
      "data",
      "nodes",
      "edges",
      "points",
      "areas",
      "lines",
      "flows"
    ]) {
      expect(config.props[key]).toBeUndefined()
    }
  })

  it("keeps configuration arrays when includeData is false", () => {
    const config = toConfig(
      "ScatterplotMatrix",
      {
        data: [{ a: 1, b: 2 }],
        fields: ["a", "b"],
        size: [600, 400]
      },
      { includeData: false }
    )

    expect(config.props.data).toBeUndefined()
    expect(config.props.fields).toEqual(["a", "b"])
    expect(config.props.size).toEqual([600, 400])
  })

  it("keeps non-row geo and series configuration when includeData is false", () => {
    const choropleth = toConfig(
      "ChoroplethMap",
      {
        areas: "world-110m",
        valueAccessor: "population"
      },
      { includeData: false }
    )
    const multiAxis = toConfig(
      "MultiAxisLineChart",
      {
        data: [{ x: 1, a: 2, b: 3 }],
        xAccessor: "x",
        series: [{ yAccessor: "a" }, { yAccessor: "b" }]
      },
      { includeData: false }
    )

    expect(choropleth.props.areas).toBe("world-110m")
    expect(multiAxis.props.data).toBeUndefined()
    expect(multiAxis.props.series).toEqual([
      { yAccessor: "a" },
      { yAccessor: "b" }
    ])
  })

  it("includes data by default", () => {
    const data = [{ x: 1, y: 2 }]
    const config = toConfig("LineChart", { data, xAccessor: "x" })
    expect(config.props.data).toEqual(data)
  })

  it("deep-clones data so mutations don't affect config", () => {
    const data = [{ x: 1, y: 2 }]
    const config = toConfig("LineChart", { data, xAccessor: "x" })
    data[0].x = 999
    expect(config.props.data[0].x).toBe(1)
  })

  it("embeds selections when provided", () => {
    const selections = {}
    const config = toConfig("LineChart", { xAccessor: "x" }, { selections })
    expect(config.selections).toEqual(selections)
  })

  it("throws for unknown component", () => {
    expect(() => toConfig("FakeChart", {})).toThrow("Unknown component")
    expect(() =>
      toConfig("XYCustomChart", { layout: () => ({ nodes: [] }) })
    ).toThrow("Unknown component")
  })

  it("serializes and round-trips a registered portable recipe by id", () => {
    const recipe = defineChartRecipe({
      id: "semiotic.recipe.serialization-portable",
      name: "Portable recipe",
      frameFamily: "XYCustomChart",
      portability: "portable",
      layout: { id: "semiotic.layout.portable", version: "1" },
      layoutConfigSchema: { type: "object", properties: {} },
      dataRoles: [
        { role: "value", field: "value", semanticType: "quantitative" }
      ],
      intents: ["explanation"],
      designContract: { whyCustom: "Portable fixture." },
      accessibility: {}
    })
    const replacementRecipe = defineChartRecipe({
      ...recipe,
      id: "semiotic.recipe.serialization-portable-replacement",
      name: "Replacement portable recipe"
    })
    registerChartRecipe(recipe)
    registerChartRecipe(replacementRecipe)
    try {
      const props = {
        data: [{ value: 4 }],
        layoutConfig: { columns: 10 }
      }
      const unbound = toConfig(recipe.id, props, {
        artifactContract: buildArtifactContract("ChartRecipe", props, {
          id: "unbound-portable-recipe-config"
        })
      })
      expect(unbound.artifactTransfer).toMatchObject({
        status: "invalid",
        omittedPaths: ["artifact.component"]
      })
      const config = toConfig(recipe.id, props, {
        artifactContract: buildArtifactContract(recipe.id, props, {
          id: "portable-recipe-config"
        })
      })
      expect(config.artifactTransfer?.status).toBe("preserved")
      expect(config).toMatchObject({
        component: "ChartRecipe",
        recipeId: recipe.id,
        portable: true,
        props: {
          data: [{ value: 4 }],
          layoutConfig: { columns: 10 }
        }
      })
      const roundTrip = fromConfig(config)
      expect(roundTrip.componentName).toBe("ChartRecipe")
      expect(roundTrip.props.recipeId).toBe(recipe.id)
      expect(roundTrip.props.layoutConfig).toEqual({ columns: 10 })

      const changedRecipe = fromURL(toURL(config))
      changedRecipe.recipeId = replacementRecipe.id
      expect(() => fromConfig(fromURL(toURL(changedRecipe)))).toThrow(
        "no longer matches the serialized definition"
      )
      expect(() =>
        toConfig(recipe.id, {
          layoutConfig: { columns: 10, label: () => "A" }
        })
      ).toThrow(/not JSON-safe/)
    } finally {
      unregisterChartRecipe(recipe.id)
      unregisterChartRecipe(replacementRecipe.id)
    }
  })

  it("requires portable recipe and layout identities and detects drift", () => {
    const layoutId = "semiotic.layout.identity-test"
    const firstLayout = (() => ({ nodes: [] })) as never
    const secondLayout = (() => ({ nodes: [{ id: "changed" }] })) as never
    const recipe = defineChartRecipe({
      id: "semiotic.recipe.identity-test",
      name: "Identity test recipe",
      version: "1",
      frameFamily: "XYCustomChart",
      portability: "portable",
      layout: { id: layoutId, version: "1" },
      layoutConfigSchema: { type: "object", properties: {} },
      dataRoles: [
        { role: "value", field: "value", semanticType: "quantitative" }
      ],
      intents: ["explanation"],
      designContract: { whyCustom: "Identity fixture." },
      accessibility: {}
    })
    registerChartRecipe(recipe)
    registerRecipeLayout(layoutId, firstLayout, { version: "1" })
    try {
      const props = { data: [{ value: 4 }] }
      const config = toConfig(recipe.id, props, {
        artifactContract: buildArtifactContract(recipe.id, props)
      })

      expect(config.artifactTransfer?.status).toBe("preserved")
      registerRecipeLayout(layoutId, secondLayout, { version: "2" })
      expect(() => fromConfig(config)).toThrow(
        "layout implementation no longer matches"
      )

      registerRecipeLayout(layoutId, firstLayout, { version: "1" })
      registerChartRecipe({ ...recipe, version: "2", name: "Changed recipe" })
      expect(() => fromConfig(config)).toThrow(
        "no longer matches the serialized definition"
      )
    } finally {
      unregisterRecipeLayout(layoutId)
      unregisterChartRecipe(recipe.id)
    }
  })

  it("rejects unversioned layouts and runtime callbacks in portable definitions", () => {
    const unversioned = defineChartRecipe({
      id: "semiotic.recipe.unversioned-layout",
      name: "Unversioned layout",
      frameFamily: "XYCustomChart",
      portability: "portable",
      layout: { id: "semiotic.layout.unversioned" },
      layoutConfigSchema: { type: "object", properties: {} },
      dataRoles: [
        { role: "value", field: "value", semanticType: "quantitative" }
      ],
      intents: ["explanation"],
      designContract: { whyCustom: "Version test." },
      accessibility: {}
    })
    const callbackDefinition = defineChartRecipe({
      ...unversioned,
      id: "semiotic.recipe.callback-definition",
      layout: { id: "semiotic.layout.callback", version: "1" },
      description: (() => ({ text: "runtime description" })) as never
    })
    registerChartRecipe(unversioned)
    registerChartRecipe(callbackDefinition)
    try {
      expect(() => toConfig(unversioned.id, {})).toThrow(
        "explicit version identity"
      )
      expect(() => toConfig(callbackDefinition.id, {})).toThrow(
        "non-JSON definition values"
      )
    } finally {
      unregisterChartRecipe(unversioned.id)
      unregisterChartRecipe(callbackDefinition.id)
    }
  })

  it("exports a local recipe manifest with an explicit portability warning", () => {
    const recipe = defineChartRecipe({
      id: "local.recipe.serialization",
      name: "Local swarm",
      frameFamily: "XYCustomChart",
      portability: "local",
      dataRoles: [
        { role: "value", field: "value", semanticType: "quantitative" }
      ],
      intents: ["monitoring"],
      designContract: { whyCustom: "Event identity matters." },
      accessibility: {}
    })
    registerChartRecipe(recipe)
    try {
      const config = toConfig(recipe.id, {
        data: [{ value: 4 }],
        layout: () => ({ nodes: [] })
      })
      expect(config.component).toBe("ChartRecipe")
      expect(config.portable).toBe(false)
      expect(config.reason).toMatch(/non-serializable/)
      expect(config.manifest).toMatchObject({
        name: "Local swarm",
        intents: ["monitoring"]
      })
      expect(config.props.layout).toBeUndefined()
      const roundTrip = fromConfig(config)
      expect(roundTrip.componentName).toBe("ChartRecipe")
      expect(roundTrip.props.recipeId).toBe(recipe.id)
    } finally {
      unregisterChartRecipe(recipe.id)
    }
  })

  it("excludes recipe data collections when includeData is false", () => {
    const recipe = defineChartRecipe({
      id: "semiotic.recipe.serialization-include-data",
      name: "Portable recipe includeData",
      frameFamily: "GeoCustomChart",
      portability: "portable",
      layout: { id: "semiotic.layout.portable", version: "1" },
      layoutConfigSchema: { type: "object", properties: {} },
      dataRoles: [{ role: "location", field: "id", semanticType: "nominal" }],
      intents: ["explanation"],
      designContract: { whyCustom: "Portable fixture." },
      accessibility: {}
    })
    registerChartRecipe(recipe)
    try {
      const config = toConfig(
        recipe.id,
        {
          points: [{ id: "sf" }],
          areas: [{ id: "west" }],
          lines: [{ id: "route" }],
          flows: [{ source: "sf", target: "nyc" }],
          layoutConfig: { projection: "mercator" }
        },
        { includeData: false }
      )

      expect(config.props.layoutConfig).toEqual({ projection: "mercator" })
      for (const key of ["points", "areas", "lines", "flows"]) {
        expect(config.props[key]).toBeUndefined()
      }
    } finally {
      unregisterChartRecipe(recipe.id)
    }
  })
})

// ── fromConfig ─────────────────────────────────────────────────────────

describe("fromConfig", () => {
  it("extracts component name and props", () => {
    const config = toConfig("BarChart", {
      categoryAccessor: "month",
      valueAccessor: "sales"
    })
    const { componentName, props } = fromConfig(config)
    expect(componentName).toBe("BarChart")
    expect(props.categoryAccessor).toBe("month")
  })

  it("deep-clones props so mutations don't affect original", () => {
    const config = toConfig("LineChart", { data: [{ x: 1 }], xAccessor: "x" })
    const { props } = fromConfig(config)
    props.data[0].x = 999
    expect(config.props.data[0].x).toBe(1)
  })

  it("throws for missing component", () => {
    expect(() =>
      fromConfig({ props: {}, version: "1", createdAt: "" } as ChartConfig)
    ).toThrow("missing component")
  })

  it("throws for missing props", () => {
    expect(() =>
      fromConfig({
        component: "LineChart",
        version: "1",
        createdAt: "2026-09-03T00:00:00.000Z"
      } as ChartConfig)
    ).toThrow("props must be a plain object")
  })

  it("throws for unknown component", () => {
    expect(() =>
      fromConfig({
        component: "UnknownWidget",
        props: {},
        version: "1",
        createdAt: "2026-09-03T00:00:00.000Z"
      })
    ).toThrow("Unknown component")
  })

  it("rejects malformed props, unsupported versions, and sparse transfer data", () => {
    const timestamp = "2026-09-03T00:00:00.000Z"
    for (const props of ["text", [], 4, null]) {
      expect(() =>
        fromConfig({
          component: "LineChart",
          props,
          version: "1",
          createdAt: timestamp
        } as unknown as ChartConfig)
      ).toThrow("props must be a plain object")
    }
    expect(() =>
      fromConfig({
        component: "LineChart",
        props: {},
        version: "999",
        createdAt: timestamp
      })
    ).toThrow("Unsupported chart config version")

    const sparseWarnings = new Array<string>(1)
    const config = toConfig("LineChart", { xAccessor: "x" })
    expect(() =>
      fromConfig({
        ...config,
        artifactTransfer: {
          status: "preserved",
          omittedPaths: [],
          warnings: sparseWarnings
        }
      })
    ).toThrow("cannot survive JSON serialization")

    const manifest = {
      name: "Portable fixture",
      intents: ["trend"],
      frameFamily: "XYFrame"
    }
    expect(() =>
      fromConfig({
        ...config,
        manifest: { ...manifest, layoutVersion: "1" }
      })
    ).toThrow("malformed recipe manifest")
    expect(() =>
      fromConfig({
        ...config,
        manifest: {
          ...manifest,
          layoutId: "semiotic.layout.fixture",
          layoutVersion: " "
        }
      })
    ).toThrow("malformed recipe manifest")
  })
})

// ── toURL / fromURL round-trip ─────────────────────────────────────────

describe("toURL / fromURL", () => {
  it("round-trips a config through URL encoding", () => {
    const original = toConfig("Scatterplot", {
      xAccessor: "x",
      yAccessor: "y",
      pointRadius: 5
    })
    const url = toURL(original)
    const decoded = fromURL(url)
    expect(decoded.component).toBe("Scatterplot")
    expect(decoded.props.xAccessor).toBe("x")
    expect(decoded.props.pointRadius).toBe(5)
  })

  it("produces a URL-safe string", () => {
    const config = toConfig("LineChart", { xAccessor: "x" })
    const url = toURL(config)
    expect(url).toMatch(/^sc=/)
    // No +, /, or = characters (URL-safe base64)
    const encoded = url.slice(3)
    expect(encoded).not.toMatch(/[+/=]/)
  })

  it("parses from full URL with query string", () => {
    const config = toConfig("BarChart", { categoryAccessor: "cat" })
    const url = toURL(config)
    const decoded = fromURL(`https://example.com/chart?${url}`)
    expect(decoded.component).toBe("BarChart")
  })

  it("handles unicode data in round-trip", () => {
    const config = toConfig("LineChart", {
      xAccessor: "x",
      title: "Données françaises — résumé"
    })
    const decoded = fromURL(toURL(config))
    expect(decoded.props.title).toBe("Données françaises — résumé")
  })

  it("throws when sc parameter is missing", () => {
    expect(() => fromURL("foo=bar")).toThrow("missing 'sc' parameter")
  })

  it("rejects a decoded payload that is not a chart config object", () => {
    const encoded = btoa("null").replace(/=+$/, "")
    expect(() => fromURL(`sc=${encoded}`)).toThrow("expected a plain object")
  })

  it("preserves reserved JSON keys in rows and nested objects", () => {
    const row = JSON.parse(
      '{"__proto__":{"scope":"retained"},"x":1,"nested":{"__proto__":{"value":2}}}'
    )
    const restored = fromConfig(
      fromURL(toURL(toConfig("LineChart", { data: [row], xAccessor: "x" })))
    )
    const restoredRow = restored.props.data[0]

    expect(Object.prototype.hasOwnProperty.call(restoredRow, "__proto__")).toBe(
      true
    )
    expect(
      Object.prototype.hasOwnProperty.call(restoredRow.nested, "__proto__")
    ).toBe(true)
  })

  it("binds creation metadata into artifact transfer identity", () => {
    const config = toConfig(
      "LineChart",
      { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      { artifactContract: artifactContract() }
    )
    const changed = {
      ...config,
      createdAt: "2026-09-04T00:00:00.000Z"
    }

    expect(fromConfig(changed).artifactTransfer).toMatchObject({
      status: "invalid",
      omittedPaths: expect.arrayContaining([
        "artifactTransfer.transferFingerprint"
      ])
    })
  })

  it("refuses caller-constructed configs that cannot survive JSON unchanged", () => {
    const config = toConfig("LineChart", { xAccessor: "x" })
    const incompatible = {
      ...config,
      selections: { invalid: BigInt(1) }
    } as unknown as ChartConfig

    expect(() => toURL(incompatible)).toThrow(
      "cannot survive JSON serialization"
    )
  })

  it("round-trips the sidecar and refuses a declared URL-size overflow", () => {
    const config = toConfig(
      "LineChart",
      { data: [{ x: 1, y: 2 }], xAccessor: "x", yAccessor: "y" },
      { artifactContract: artifactContract() }
    )
    const encoded = toURL(config)
    const decoded = fromURL(encoded)

    expect(decoded.artifactContract).toEqual(config.artifactContract)
    expect(fromConfig(decoded).artifactTransfer?.status).toBe("preserved")

    const propsWithExcludedLegend = {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      legend: { title: "Series" }
    }
    const excluded = toConfig("LineChart", propsWithExcludedLegend, {
      artifactContract: buildArtifactContract(
        "LineChart",
        propsWithExcludedLegend
      )
    })
    expect(fromConfig(fromURL(toURL(excluded))).artifactTransfer?.status).toBe(
      "excluded"
    )
    expect(() => toURL(config, { maxLength: 12 })).toThrow(
      "Use a file or sidecar export"
    )
  })
})

// ── configToJSX ────────────────────────────────────────────────────────

describe("configToJSX", () => {
  it("renders string props with quotes", () => {
    const config: ChartConfig = {
      component: "LineChart",
      props: { xAccessor: "time" },
      version: "1",
      createdAt: "2026-09-03T00:00:00.000Z"
    }
    const jsx = configToJSX(config)
    expect(jsx).toContain("<LineChart")
    expect(jsx).toContain('xAccessor="time"')
    expect(jsx).toContain("/>")
  })

  it("renders boolean true as shorthand", () => {
    const jsx = configToJSX({
      component: "LineChart",
      props: { showPoints: true },
      version: "1",
      createdAt: "2026-09-03T00:00:00.000Z"
    })
    expect(jsx).toContain("  showPoints")
    expect(jsx).not.toContain("showPoints={true}")
  })

  it("renders boolean false explicitly", () => {
    const jsx = configToJSX({
      component: "LineChart",
      props: { showGrid: false },
      version: "1",
      createdAt: "2026-09-03T00:00:00.000Z"
    })
    expect(jsx).toContain("showGrid={false}")
  })

  it("renders numbers without quotes", () => {
    const jsx = configToJSX({
      component: "Scatterplot",
      props: { pointRadius: 5 },
      version: "1",
      createdAt: "2026-09-03T00:00:00.000Z"
    })
    expect(jsx).toContain("pointRadius={5}")
  })

  it("renders objects as JSON", () => {
    const jsx = configToJSX({
      component: "LineChart",
      props: { margin: { top: 10, right: 20 } },
      version: "1",
      createdAt: "2026-09-03T00:00:00.000Z"
    })
    expect(jsx).toContain("margin={")
    expect(jsx).toContain('"top"')
  })

  it("renders arrays inline when short", () => {
    const jsx = configToJSX({
      component: "LineChart",
      props: { size: [600, 400] },
      version: "1",
      createdAt: "2026-09-03T00:00:00.000Z"
    })
    expect(jsx).toContain("size={[600,400]}")
  })

  it("normalizes legacy LocalChartRecipe configs to renderable ChartRecipe JSX", () => {
    const jsx = configToJSX({
      component: "LocalChartRecipe",
      recipeId: "local.recipe",
      portable: false,
      props: { layoutConfig: { columns: 10 } },
      version: "1",
      createdAt: "2026-09-03T00:00:00.000Z"
    })

    expect(jsx).toContain("<ChartRecipe")
    expect(jsx).not.toContain("<LocalChartRecipe")
    expect(jsx).toContain('recipeId={"local.recipe"}')
  })

  it("quotes hostile values and projects invalid prop names through a safe spread", () => {
    const hostile = 'safe" onClick={() => globalThis.compromised = true} x="'
    const props = JSON.parse(
      JSON.stringify({ title: hostile, "bad-key": hostile })
    )
    const jsx = configToJSX({
      component: "LineChart",
      props,
      version: "1",
      createdAt: "2026-09-03T00:00:00.000Z"
    })

    expect(jsx).toContain(`title={${JSON.stringify(hostile)}}`)
    expect(jsx).toContain('{...{"bad-key":')
    expect(jsx).not.toContain("  onClick=")
    expect(() =>
      configToJSX({
        component: "LineChart /><Injected",
        props: {},
        version: "1",
        createdAt: "2026-09-03T00:00:00.000Z"
      })
    ).toThrow("unknown component")
  })

  it("reports metadata that JSX cannot represent", () => {
    const config = toConfig(
      "LineChart",
      { xAccessor: "x", yAccessor: "y" },
      { artifactContract: artifactContract() }
    )
    const projection = configToJSXWithReport(config)

    expect(projection.jsx).toContain("<LineChart")
    expect(projection.omittedPaths).toEqual(
      expect.arrayContaining(["artifactContract", "artifactTransfer"])
    )
    expect(projection.warnings).toHaveLength(1)
  })
})
