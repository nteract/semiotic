import { describe, expect, it } from "vitest"
import {
  resolvePipelineBoundsStyle,
  resolvePipelineColorMap,
  resolvePipelineGroupColor
} from "./pipelineStyleResolvers"
import { resolveCategoricalPalette } from "../charts/shared/colorUtils"
import type { PipelineConfig } from "./pipelineConfig"

describe("resolvePipelineBoundsStyle", () => {
  it("preserves the line cursor on derived bounds marks", () => {
    const config = {} as PipelineConfig

    expect(
      resolvePipelineBoundsStyle(config, "series", undefined, () => ({
        stroke: "#4682b4",
        cursor: "pointer"
      }))
    ).toMatchObject({
      fill: "#4682b4",
      cursor: "pointer"
    })
  })
})

describe("XY category palettes, including custom-layout groups", () => {
  it("honors explicit keys before cached or theme colors, including groups absent from data", () => {
    const config = {
      colorScheme: { scheduled: "#596674", actual: "#287a79" },
      themeCategorical: ["pink"]
    }
    const mapped = resolvePipelineColorMap(
      [{ kind: "actual" }, { kind: "scheduled" }],
      (d) => String(d.kind),
      config,
      1,
      null
    )
    expect([...mapped.map.values()]).toEqual(["#287a79", "#596674"])
    for (const group of ["scheduled", "actual"]) {
      expect(
        resolvePipelineGroupColor({
          group,
          config,
          colorMapCache: null,
          groupColorMap: new Map([[group, "pink"]]),
          groupColorCounter: 0,
          groupColorMapCap: 10
        }).color
      ).toBe(config.colorScheme[group as keyof typeof config.colorScheme])
    }
  })

  it("uses named palettes and keeps an empty array from producing missing colors", () => {
    for (const colorScheme of ["tableau10", []] as const) {
      const config = {
        colorScheme: typeof colorScheme === "string" ? colorScheme : [],
        themeCategorical: ["pink"]
      }
      const expected = resolveCategoricalPalette(
        config.colorScheme,
        config.themeCategorical,
        ["fallback"]
      )[0]
      expect(
        resolvePipelineColorMap(
          [{ category: "one" }],
          (d) => String(d.category),
          config,
          1,
          null
        ).map.get("one")
      ).toBe(expected)
      expect(
        resolvePipelineGroupColor({
          group: "one",
          config,
          colorMapCache: null,
          groupColorMap: new Map(),
          groupColorCounter: 0,
          groupColorMapCap: 10
        }).color
      ).toBe(expected)
    }
  })
})
