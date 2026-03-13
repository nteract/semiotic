/**
 * Scenario tests: Config serialization integrity.
 *
 * Verifies that complex chart configurations survive full round-trips
 * through toConfig → fromConfig, toURL → fromURL, and configToJSX
 * without losing information or corrupting data.
 */
import { describe, it, expect } from "vitest"
import {
  toConfig,
  fromConfig,
  toURL,
  fromURL,
  configToJSX,
} from "../../components/export/chartConfig"

// ── Tests ───────────────────────────────────────────────────────────────

describe("Serialization Round-Trip Integrity", () => {
  // 1. LineChart full round-trip preserves all serializable props
  it("LineChart with data and options survives toConfig → fromConfig", () => {
    const originalProps = {
      data: [
        { time: 0, value: 10, series: "A" },
        { time: 1, value: 20, series: "A" },
        { time: 2, value: 15, series: "B" },
      ],
      xAccessor: "time",
      yAccessor: "value",
      lineBy: "series",
      colorBy: "series",
      curve: "monotoneX",
      lineWidth: 3,
      showPoints: true,
      pointRadius: 5,
      width: 800,
      height: 500,
      showGrid: true,
    }

    const config = toConfig("LineChart", originalProps)
    const { componentName, props } = fromConfig(config)

    expect(componentName).toBe("LineChart")
    expect(props.data).toEqual(originalProps.data)
    expect(props.xAccessor).toBe("time")
    expect(props.yAccessor).toBe("value")
    expect(props.lineBy).toBe("series")
    expect(props.colorBy).toBe("series")
    expect(props.curve).toBe("monotoneX")
    expect(props.lineWidth).toBe(3)
    expect(props.showPoints).toBe(true)
    expect(props.pointRadius).toBe(5)
    expect(props.width).toBe(800)
    expect(props.height).toBe(500)
  })

  // 2. BarChart with nested margin object
  it("BarChart with margin object preserves nested structure", () => {
    const originalProps = {
      data: [{ cat: "Q1", val: 100 }, { cat: "Q2", val: 200 }],
      categoryAccessor: "cat",
      valueAccessor: "val",
      orientation: "horizontal",
      colorBy: "cat",
      margin: { top: 20, right: 30, bottom: 40, left: 80 },
    }

    const config = toConfig("BarChart", originalProps)
    const { props } = fromConfig(config)

    expect(props.margin).toEqual({ top: 20, right: 30, bottom: 40, left: 80 })
    expect(props.orientation).toBe("horizontal")
  })

  // 3. Network chart with nodes and edges
  it("ForceDirectedGraph with nodes/edges survives round-trip", () => {
    const originalProps = {
      nodes: [
        { id: "alice", group: "eng" },
        { id: "bob", group: "eng" },
        { id: "carol", group: "design" },
      ],
      edges: [
        { source: "alice", target: "bob", weight: 5 },
        { source: "bob", target: "carol", weight: 3 },
      ],
      colorBy: "group",
      nodeSize: 10,
      showLabels: true,
    }

    const config = toConfig("ForceDirectedGraph", originalProps)
    const { componentName, props } = fromConfig(config)

    expect(componentName).toBe("ForceDirectedGraph")
    expect(props.nodes).toHaveLength(3)
    expect(props.edges).toHaveLength(2)
    expect(props.edges[0]).toEqual({ source: "alice", target: "bob", weight: 5 })
    expect(props.colorBy).toBe("group")
  })

  // 4. Idempotency: toConfig → fromConfig → toConfig produces identical JSON
  it("toConfig → fromConfig → toConfig is idempotent", () => {
    const props = {
      data: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
      xAccessor: "x",
      yAccessor: "y",
      width: 600,
      showGrid: false,
    }

    const config1 = toConfig("Scatterplot", props)
    const { props: roundTripped } = fromConfig(config1)
    const config2 = toConfig("Scatterplot", roundTripped)

    // Props should be identical
    expect(config2.props).toEqual(config1.props)
    expect(config2.component).toBe(config1.component)
  })

  // 5. URL round-trip with complex data
  it("toURL → fromURL preserves complex configs with special characters", () => {
    const props = {
      data: [
        { name: "Données & résumé", value: 42 },
        { name: "Price <$100>", value: 99 },
      ],
      xAccessor: "name",
      yAccessor: "value",
      title: "Chart: Q1 2024 — Summary",
    }

    const config = toConfig("BarChart", {
      ...props,
      categoryAccessor: "name",
      valueAccessor: "value",
    })
    const url = toURL(config)
    const decoded = fromURL(url)

    expect(decoded.props.data).toEqual(props.data)
    expect(decoded.props.title).toBe("Chart: Q1 2024 — Summary")
  })

  // 6. URL round-trip with large dataset
  it("toURL → fromURL handles 100-point dataset", () => {
    const data = Array.from({ length: 100 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 10) * 100,
      category: i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C",
    }))

    const config = toConfig("Scatterplot", {
      data,
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "category",
    })

    const url = toURL(config)
    const decoded = fromURL(url)

    expect(decoded.props.data).toHaveLength(100)
    expect(decoded.props.data[0]).toEqual(data[0])
    expect(decoded.props.data[99]).toEqual(data[99])
  })
})

describe("configToJSX Integrity", () => {
  // 7. Multi-prop chart produces well-formed JSX
  it("generates valid JSX for a chart with many prop types", () => {
    const config = toConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      showPoints: true,
      showGrid: false,
      lineWidth: 2,
      curve: "monotoneX",
      width: 800,
      margin: { top: 10, right: 20, bottom: 30, left: 40 },
    })

    const jsx = configToJSX(config)

    // Component name
    expect(jsx).toContain("<LineChart")
    expect(jsx).toContain("/>")

    // String props in quotes
    expect(jsx).toContain('xAccessor="x"')
    expect(jsx).toContain('curve="monotoneX"')

    // Boolean true as shorthand
    expect(jsx).toContain("  showPoints")
    expect(jsx).not.toContain("showPoints={true}")

    // Boolean false explicitly
    expect(jsx).toContain("showGrid={false}")

    // Numbers without quotes
    expect(jsx).toContain("lineWidth={2}")
    expect(jsx).toContain("width={800}")

    // Object with JSON
    expect(jsx).toContain("margin={")
  })

  // 8. Data is rendered as data prop
  it("includes data array in JSX output", () => {
    const config = toConfig("BarChart", {
      data: [{ cat: "A", val: 10 }],
      categoryAccessor: "cat",
      valueAccessor: "val",
    })

    const jsx = configToJSX(config)
    expect(jsx).toContain("data={")
    expect(jsx).toContain('"cat"')
  })
})

describe("Serialization Safety", () => {
  // 9. Functions are stripped (not serialized)
  it("function props are excluded from serialized config", () => {
    const config = toConfig("Scatterplot", {
      data: [{ x: 1, y: 2 }],
      xAccessor: (d: any) => d.x,
      yAccessor: "y",
      customHoverBehavior: () => {},
    })

    expect(config.props.xAccessor).toBeUndefined()
    expect(config.props.customHoverBehavior).toBeUndefined()
    expect(config.props.yAccessor).toBe("y") // string accessor preserved
  })

  // 10. Deep clone prevents mutation leakage
  it("mutating fromConfig output does not affect original config", () => {
    const config = toConfig("LineChart", {
      data: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
      xAccessor: "x",
    })

    const { props } = fromConfig(config)
    props.data[0].x = 999
    props.data.push({ x: 5, y: 6 })

    // Original config is untouched
    expect(config.props.data[0].x).toBe(1)
    expect(config.props.data).toHaveLength(2)
  })
})
