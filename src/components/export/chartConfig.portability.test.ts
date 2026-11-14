// @vitest-environment node
import { describe, expect, it, vi } from "vitest"
import { transformSync } from "esbuild"
import {
  toConfig,
  fromConfig,
  toURL,
  fromURL,
  configToJSX,
  configToJSXWithReport,
  copyConfig
} from "./chartConfig"
import {
  serializeSelections,
  deserializeSelections
} from "./selectionSerializer"
import { buildPredicate, type Selection } from "../store/SelectionStore"
import { buildArtifactContract } from "../artifact/contract"
import { defineChartRecipe } from "../ai/chartRecipes"
import {
  registerChartRecipe,
  unregisterChartRecipe
} from "../ai/chartRecipeRegistry"

describe("portable configs (#1364)", () => {
  it("retains Date-valued rows across JSON, URL, restoration, and JSX export", () => {
    const date = new Date("2026-11-14T01:02:03.004Z")
    const data = [{ x: date, y: 2, label: date.toISOString() }]
    const config = toConfig("LineChart", {
      data,
      xAccessor: "x",
      yAccessor: "y"
    })
    expect(config.props.data).toEqual([{ ...data[0], x: date.toISOString() }])
    const restored = fromConfig(
      fromURL(toURL(JSON.parse(JSON.stringify(config))))
    )
    expect(restored.props.data).toEqual(data)
    expect((restored.props.data as typeof data)[0].x).not.toBe(date)
    expect(configToJSX(config)).toContain(`new Date("${date.toISOString()}")`)
    expect(data[0].x).toBe(date)
  })

  it.each([NaN, undefined, Infinity, new Date(NaN), BigInt(1)])(
    "reports unsupported data instead of silently discarding it (%s)",
    (value) => {
      const config = toConfig("LineChart", { data: [{ x: 1, y: value }] })
      expect(config.props.data).toBeUndefined()
      expect(config.omittedPaths).toContain("props.data[0].y")
      expect(config.warnings?.join(" ")).toContain("props.data")
      expect(fromConfig(fromURL(toURL(config))).omittedPaths).toEqual(
        config.omittedPaths
      )
    }
  )

  it.each([
    (query: string) => `https://example.test/chart?${query}#section`,
    (query: string) => `/chart?other=1&${query}#section?ignored=yes`,
    (query: string) => `?${query}#section`,
    (query: string) => `https://example.test/chart#${query}`
  ])("parses configs independently of URL fragments", (url) => {
    const config = toConfig("LineChart", {
      data: [{ x: 1, y: 2 }],
      title: "日本語 🌍"
    })
    expect(fromURL(url(toURL(config)))).toEqual(config)
  })

  it("preserves Date selection membership without converting ISO-string categories", () => {
    const date = new Date("2026-11-14T00:00:00Z")
    const selection: Selection = {
      name: "time",
      resolution: "union",
      clauses: new Map([
        [
          "source",
          {
            clientId: "source",
            type: "point",
            fields: {
              date: { type: "point", values: new Set([date]) }
            }
          }
        ]
      ])
    }
    const serialized = serializeSelections(new Map([["time", selection]]))
    const config = toConfig(
      "LineChart",
      { data: [{ x: date, y: 2 }] },
      { selections: serialized }
    )
    const restored = deserializeSelections(
      fromURL(toURL(config)).selections!
    ).get("time")!
    const matches = buildPredicate(restored, "reader")
    expect(matches({ date: new Date(date.getTime()) })).toBe(true)
    expect(matches({ date: date.toISOString() })).toBe(false)
    expect(matches({ date: new Date(0) })).toBe(false)
  })

  it("preserves Date-bound artifact evidence and detects metadata tampering", () => {
    const props = { data: [{ x: new Date("2026-11-14T00:00:00Z"), y: 1 }] }
    const config = toConfig("LineChart", props, {
      artifactContract: buildArtifactContract("LineChart", props)
    })
    expect(config.artifactTransfer?.status).toBe("preserved")
    expect(fromConfig(fromURL(toURL(config))).artifactTransfer?.status).toBe(
      "preserved"
    )
    const changed = fromURL(toURL(config))
    delete changed.datePaths
    expect(fromConfig(changed).artifactTransfer?.status).toBe("invalid")
    const lossyProps = { ...props, other: NaN }
    const lossy = toConfig("LineChart", lossyProps, {
      artifactContract: buildArtifactContract("LineChart", lossyProps)
    })
    expect(fromConfig(lossy).artifactTransfer?.status).toBe("excluded")
    lossy.omittedPaths = []
    expect(fromConfig(lossy).artifactTransfer?.status).toBe("invalid")
  })

  it("keeps reserved-looking keys and executes generated Date JSX without changing strings", () => {
    const date = new Date("2026-11-14T00:00:00Z")
    const row = JSON.parse('{"__proto__":{}, "a.b/~":{}, "label":"</script>"}')
    row.__proto__.date = date
    row["a.b/~"].date = date
    const config = toConfig("LineChart", { data: [row] })
    const jsx = configToJSX(config)
    expect(jsx).not.toContain("</script>")
    const code = transformSync(jsx, {
      loader: "jsx",
      jsxFactory: "capture"
    }).code
    const props = new Function("LineChart", "capture", `return ${code}`)(
      "LineChart",
      (_component: unknown, props: unknown) => props
    )
    expect(props.data).toEqual([row])
    expect(
      Object.prototype.hasOwnProperty.call(props.data[0], "__proto__")
    ).toBe(true)
    expect(fromConfig(fromURL(toURL(config))).props.data).toEqual([row])
  })

  it.each(
    [
      [["data", "0", "missing"]],
      [["__proto__", "polluted"]],
      [[]],
      [
        ["data", "0", "x"],
        ["data", "0", "x"]
      ],
      [["data", 0, "x"]],
      "invalid"
    ].map((datePaths) => [datePaths])
  )("rejects malformed or stale Date metadata (%j)", (datePaths) => {
    const config = toConfig("LineChart", { data: [{ x: new Date(0), y: 2 }] })
    const invalid = { ...config, datePaths } as typeof config
    expect(() => fromConfig(invalid)).toThrow(/date/i)
    expect(() => toURL(invalid)).toThrow(/date/i)
  })

  it("does not call nested getters or serialize cycles as empty data", () => {
    const getter = vi.fn(() => new Date(0))
    const row = Object.defineProperty({ x: 1 }, "y", {
      enumerable: true,
      get: getter
    })
    expect(toConfig("LineChart", { data: [row] }).omittedPaths).toContain(
      "props.data[0].y"
    )
    expect(getter).not.toHaveBeenCalled()
    const cycle: Record<string, unknown> = { x: new Date(0) }
    cycle.self = cycle
    expect(toConfig("LineChart", { data: [cycle] }).omittedPaths).toContain(
      "props.data"
    )
  })

  it("retains Dates for portable recipes while rejecting unsupported props", () => {
    const recipe = defineChartRecipe({
      id: "semiotic.recipe.date-serialization-test",
      name: "Dates",
      frameFamily: "XYCustomChart",
      portability: "portable",
      layout: { id: "test-layout", version: "1" },
      layoutConfigSchema: { type: "object", properties: {} },
      dataRoles: [{ role: "value", field: "y", semanticType: "quantitative" }],
      intents: ["explanation"],
      designContract: { whyCustom: "Test" },
      accessibility: {}
    })
    registerChartRecipe(recipe)
    try {
      const data = [{ x: new Date(0), y: 1 }]
      const config = toConfig(recipe.id, { data })
      expect(fromConfig(fromURL(toURL(config))).props.data).toEqual(data)
      expect(() => toConfig(recipe.id, { data: [{ x: NaN }] })).toThrow(
        "not JSON-safe"
      )
    } finally {
      unregisterChartRecipe(recipe.id)
    }
  })

  it("reports omissions in JSX projections and rejects non-JSON clipboard payloads", async () => {
    const config = toConfig("LineChart", { data: [{ x: NaN }] })
    const projected = configToJSXWithReport(config)
    expect(projected.omittedPaths).toContain("omittedPaths")
    expect(projected.warnings.join(" ")).toContain("props.data")
    await expect(
      copyConfig({ ...config, props: { data: [{ x: new Date(0) }] } })
    ).rejects.toThrow("cannot survive JSON")
  })
})
