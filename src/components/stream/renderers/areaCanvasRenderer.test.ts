import { describe, expect, it, vi } from "vitest"
import { scaleLinear } from "d3-scale"
import type { AreaSceneNode, StreamLayout, StreamScales } from "../types"
import { createMockCanvasContext } from "../../../test-utils/canvasMock"
import { areaCanvasRenderer } from "./areaCanvasRenderer"

const scales: StreamScales = {
  x: scaleLinear().domain([0, 100]).range([0, 100]),
  y: scaleLinear().domain([0, 100]).range([100, 0]),
}
const layout: StreamLayout = { width: 100, height: 100 }

describe("areaCanvasRenderer semantic top stroke", () => {
  it("paints interpolated threshold segments with the normal stroke as the base color", () => {
    const ctx = createMockCanvasContext() as unknown as CanvasRenderingContext2D
    const strokeStyles: string[] = []
    const curveCallsAtStroke: number[] = []
    ;(ctx.stroke as ReturnType<typeof vi.fn>).mockImplementation(() => {
      strokeStyles.push(ctx.strokeStyle as string)
      curveCallsAtStroke.push((ctx.bezierCurveTo as ReturnType<typeof vi.fn>).mock.calls.length)
    })
    const node: AreaSceneNode = {
      type: "area",
      topPath: [[0, 90], [50, 40], [100, 10]],
      bottomPath: [[0, 100], [50, 100], [100, 100]],
      rawValues: [10, 50, 90],
      colorThresholds: [
        { value: 40, color: "#warning", thresholdType: "greater" },
        { value: 70, color: "#critical", thresholdType: "greater" },
      ],
      strokeColorBands: [
        { y: 60, height: 40 },
        { y: 30, height: 30, color: "#warning" },
        { y: 0, height: 30, color: "#critical" },
      ],
      strokeGradient: {
        stops: [
          { offset: 0, color: "#111111" },
          { offset: 1, color: "#eeeeee" },
        ],
      },
      curve: "monotoneX",
      style: { fill: "#base", stroke: "#base", strokeWidth: 3 },
      datum: [],
    }

    areaCanvasRenderer(ctx, [node], scales, layout)

    expect(strokeStyles).toEqual(["#base", "#warning", "#critical"])
    expect(curveCallsAtStroke[0]).toBeGreaterThan(0)
    expect(curveCallsAtStroke[1]).toBeGreaterThan(curveCallsAtStroke[0])
    expect(curveCallsAtStroke[2]).toBeGreaterThan(curveCallsAtStroke[1])
    expect(ctx.lineWidth).toBe(3)
    expect(ctx.createLinearGradient).not.toHaveBeenCalled()
    expect(ctx.rect).toHaveBeenCalledWith(-3, 60, 106, 40)
    expect(ctx.rect).toHaveBeenCalledWith(-3, 30, 106, 30)
  })
})
