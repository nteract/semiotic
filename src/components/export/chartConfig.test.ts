import { describe, it, expect } from "vitest"
import { toConfig, fromConfig, toURL, fromURL, configToJSX } from "./chartConfig"
import type { ChartConfig } from "./chartConfig"

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
      sizeBy: (d: any) => d.size
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
    const selections = { version: "1" as const, selections: [] }
    const config = toConfig("LineChart", { xAccessor: "x" }, { selections })
    expect(config.selections).toEqual(selections)
  })

  it("throws for unknown component", () => {
    expect(() => toConfig("FakeChart", {})).toThrow("Unknown component")
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
    expect(() => fromConfig({ props: {}, version: "1", createdAt: "" } as any)).toThrow("missing component")
  })

  it("throws for missing props", () => {
    expect(() => fromConfig({ component: "LineChart", version: "1", createdAt: "" } as any)).toThrow("missing component or props")
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
})
