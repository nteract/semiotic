import * as React from "react"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StreamXYFrameProps } from "../../stream/types"
import { Heatmap } from "./Heatmap"

let capturedFrame: StreamXYFrameProps | null = null

vi.mock("../../stream/StreamXYFrame", () => ({
  default: React.forwardRef((props: StreamXYFrameProps, _ref) => {
    capturedFrame = props
    return <div data-testid="stream-xy-frame" />
  })
}))

describe("Heatmap styleRules", () => {
  beforeEach(() => {
    capturedFrame = null
  })

  it("resolves ordinary cells through authored x/y/value accessors", () => {
    render(
      <Heatmap
        data={[{ column: 1, row: 2, amount: 25 }]}
        xAccessor="column"
        yAccessor="row"
        valueAccessor="amount"
        styleRules={[
          { when: { axis: "x", eq: 1 }, style: { stroke: "#x" } },
          { when: { gt: 20 }, style: { fill: "#hot" } }
        ]}
      />
    )

    expect(capturedFrame!.areaStyle?.({ column: 1, row: 2, amount: 25 }))
      .toMatchObject({ fill: "#hot", stroke: "#x" })
  })

  it("resolves aggregated cells through displayed value, fields, and bin centers", () => {
    render(
      <Heatmap
        data={[{ x: 1, y: 2, value: 25 }]}
        heatmapAggregation="mean"
        styleRules={[
          { when: { field: "count", gte: 3 }, style: { fill: "#dense" } },
          { when: { axis: "x", within: [10, 20] }, style: { stroke: "#band" } },
          { when: { gt: 20 }, style: { opacity: 0.7 } }
        ]}
      />
    )

    const aggregateCell = {
      xi: 0,
      yi: 0,
      value: 25,
      count: 3,
      sum: 75,
      xCenter: 15,
      yCenter: 30,
      agg: "mean"
    }
    expect(capturedFrame!.areaStyle?.(aggregateCell)).toMatchObject({
      fill: "#dense",
      stroke: "#band",
      opacity: 0.7
    })
  })
})
