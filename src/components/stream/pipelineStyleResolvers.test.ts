import { describe, expect, it } from "vitest"
import { resolvePipelineBoundsStyle } from "./pipelineStyleResolvers"
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
