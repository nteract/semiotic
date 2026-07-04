import { describe, it, expect } from "vitest"
import { toConfig, fromConfig, toURL, fromURL, configToJSX } from "./chartConfig"
import type { ChartConfig } from "./chartConfig"
import type { Datum } from "../charts/shared/datumTypes"
import { defineChartRecipe } from "../ai/chartRecipes"
import {
  registerChartRecipe,
  unregisterChartRecipe,
} from "../ai/chartRecipeRegistry"

// ── toConfig ───────────────────────────────────────────────────────────

describe("toConfig", () => {
  it("creates a config with component name and version", () => {
    const config = toConfig("LineChart", { xAccessor: "time", yAccessor: "value" })
    expect(config.component).toBe("LineChart")
    expect(config.version).toBe("1")
    expect(config.createdAt).toBeTruthy()
    expect(config.props.xAccessor).toBe("time")
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
    const config = toConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x"
    }, { includeData: false })
    expect(config.props.data).toBeUndefined()
    expect(config.props.xAccessor).toBe("x")
  })

  it("excludes all public data collections when includeData is false", () => {
    const config = toConfig("FlowMap", {
      data: [{ id: "raw" }],
      nodes: [{ id: "sf" }],
      edges: [{ source: "sf", target: "nyc" }],
      points: [{ lon: -122.4, lat: 37.8 }],
      areas: [{ id: "west" }],
      lines: [{ coordinates: [[-122.4, 37.8], [-74, 40.7]] }],
      flows: [{ source: "sf", target: "nyc", value: 10 }],
      valueAccessor: "value",
    }, { includeData: false })

    expect(config.props).toMatchObject({ valueAccessor: "value" })
    for (const key of ["data", "nodes", "edges", "points", "areas", "lines", "flows"]) {
      expect(config.props[key]).toBeUndefined()
    }
  })

  it("keeps configuration arrays when includeData is false", () => {
    const config = toConfig("ScatterplotMatrix", {
      data: [{ a: 1, b: 2 }],
      fields: ["a", "b"],
      size: [600, 400],
    }, { includeData: false })

    expect(config.props.data).toBeUndefined()
    expect(config.props.fields).toEqual(["a", "b"])
    expect(config.props.size).toEqual([600, 400])
  })

  it("keeps non-row geo and series configuration when includeData is false", () => {
    const choropleth = toConfig("ChoroplethMap", {
      areas: "world-110m",
      valueAccessor: "population",
    }, { includeData: false })
    const multiAxis = toConfig("MultiAxisLineChart", {
      data: [{ x: 1, a: 2, b: 3 }],
      xAccessor: "x",
      series: [{ yAccessor: "a" }, { yAccessor: "b" }],
    }, { includeData: false })

    expect(choropleth.props.areas).toBe("world-110m")
    expect(multiAxis.props.data).toBeUndefined()
    expect(multiAxis.props.series).toEqual([{ yAccessor: "a" }, { yAccessor: "b" }])
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
      toConfig("XYCustomChart", { layout: () => ({ nodes: [] }) }),
    ).toThrow("Unknown component")
  })

  it("serializes and round-trips a registered portable recipe by id", () => {
    const recipe = defineChartRecipe({
      id: "semiotic.recipe.serialization-portable",
      name: "Portable recipe",
      frameFamily: "XYCustomChart",
      portability: "portable",
      layout: { id: "semiotic.layout.portable" },
      layoutConfigSchema: { type: "object", properties: {} },
      dataRoles: [{ role: "value", field: "value", semanticType: "quantitative" }],
      intents: ["explanation"],
      designContract: { whyCustom: "Portable fixture." },
      accessibility: {},
    })
    registerChartRecipe(recipe)
    try {
      const config = toConfig(recipe.id, {
        data: [{ value: 4 }],
        layoutConfig: { columns: 10 },
      })
      expect(config).toMatchObject({
        component: "ChartRecipe",
        recipeId: recipe.id,
        portable: true,
        props: {
          data: [{ value: 4 }],
          layoutConfig: { columns: 10 },
        },
      })
      const roundTrip = fromConfig(config)
      expect(roundTrip.componentName).toBe("ChartRecipe")
      expect(roundTrip.props.recipeId).toBe(recipe.id)
      expect(roundTrip.props.layoutConfig).toEqual({ columns: 10 })
      expect(() =>
        toConfig(recipe.id, {
          layoutConfig: { columns: 10, label: () => "A" },
        }),
      ).toThrow(/not JSON-safe/)
    } finally {
      unregisterChartRecipe(recipe.id)
    }
  })

  it("exports a local recipe manifest with an explicit portability warning", () => {
    const recipe = defineChartRecipe({
      id: "local.recipe.serialization",
      name: "Local swarm",
      frameFamily: "XYCustomChart",
      portability: "local",
      dataRoles: [{ role: "value", field: "value", semanticType: "quantitative" }],
      intents: ["monitoring"],
      designContract: { whyCustom: "Event identity matters." },
      accessibility: {},
    })
    registerChartRecipe(recipe)
    try {
      const config = toConfig(recipe.id, {
        data: [{ value: 4 }],
        layout: () => ({ nodes: [] }),
      })
      expect(config.component).toBe("ChartRecipe")
      expect(config.portable).toBe(false)
      expect(config.reason).toMatch(/non-serializable/)
      expect(config.manifest).toMatchObject({
        name: "Local swarm",
        intents: ["monitoring"],
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
      layout: { id: "semiotic.layout.portable" },
      layoutConfigSchema: { type: "object", properties: {} },
      dataRoles: [{ role: "location", field: "id", semanticType: "nominal" }],
      intents: ["explanation"],
      designContract: { whyCustom: "Portable fixture." },
      accessibility: {},
    })
    registerChartRecipe(recipe)
    try {
      const config = toConfig(recipe.id, {
        points: [{ id: "sf" }],
        areas: [{ id: "west" }],
        lines: [{ id: "route" }],
        flows: [{ source: "sf", target: "nyc" }],
        layoutConfig: { projection: "mercator" },
      }, { includeData: false })

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
    const config = toConfig("BarChart", { categoryAccessor: "month", valueAccessor: "sales" })
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
    expect(() => fromConfig({ props: {}, version: "1", createdAt: "" } as ChartConfig)).toThrow("missing component")
  })

  it("throws for missing props", () => {
    expect(() => fromConfig({ component: "LineChart", version: "1", createdAt: "" } as ChartConfig)).toThrow("missing component or props")
  })

  it("throws for unknown component", () => {
    expect(() => fromConfig({
      component: "UnknownWidget",
      props: {},
      version: "1",
      createdAt: ""
    })).toThrow("Unknown component")
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
})

// ── configToJSX ────────────────────────────────────────────────────────

describe("configToJSX", () => {
  it("renders string props with quotes", () => {
    const config: ChartConfig = {
      component: "LineChart",
      props: { xAccessor: "time" },
      version: "1",
      createdAt: ""
    }
    const jsx = configToJSX(config)
    expect(jsx).toContain('<LineChart')
    expect(jsx).toContain('xAccessor="time"')
    expect(jsx).toContain('/>')
  })

  it("renders boolean true as shorthand", () => {
    const jsx = configToJSX({
      component: "LineChart",
      props: { showPoints: true },
      version: "1", createdAt: ""
    })
    expect(jsx).toContain("  showPoints")
    expect(jsx).not.toContain("showPoints={true}")
  })

  it("renders boolean false explicitly", () => {
    const jsx = configToJSX({
      component: "LineChart",
      props: { showGrid: false },
      version: "1", createdAt: ""
    })
    expect(jsx).toContain("showGrid={false}")
  })

  it("renders numbers without quotes", () => {
    const jsx = configToJSX({
      component: "Scatterplot",
      props: { pointRadius: 5 },
      version: "1", createdAt: ""
    })
    expect(jsx).toContain("pointRadius={5}")
  })

  it("renders objects as JSON", () => {
    const jsx = configToJSX({
      component: "LineChart",
      props: { margin: { top: 10, right: 20 } },
      version: "1", createdAt: ""
    })
    expect(jsx).toContain("margin={")
    expect(jsx).toContain('"top"')
  })

  it("renders arrays inline when short", () => {
    const jsx = configToJSX({
      component: "LineChart",
      props: { size: [600, 400] },
      version: "1", createdAt: ""
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
      createdAt: "",
    })

    expect(jsx).toContain("<ChartRecipe")
    expect(jsx).not.toContain("<LocalChartRecipe")
    expect(jsx).toContain('recipeId="local.recipe"')
  })
})
