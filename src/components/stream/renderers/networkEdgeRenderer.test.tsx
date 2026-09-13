import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createMockCanvasContext } from "../../../test-utils/canvasMock"
import type { NetworkSceneEdge } from "../networkTypes"
import { networkSceneEdgeToSVG } from "../SceneToSVGNetwork"
import { networkEdgeRenderer } from "./networkEdgeRenderer"

beforeEach(() =>
  vi.stubGlobal(
    "Path2D",
    class {
      constructor(readonly path: string) {}
    }
  )
)
afterEach(() => vi.unstubAllGlobals())

function edge(type: NetworkSceneEdge["type"]): NetworkSceneEdge {
  const shared = {
    style: {
      stroke: "#4e79a7",
      fill: "#4e79a7",
      strokeWidth: 2,
      fillOpacity: 1
    },
    datum: {}
  }
  if (type === "line") return { ...shared, type, x1: 0, y1: 0, x2: 100, y2: 0 }
  return {
    ...shared,
    type,
    pathD: "M0,5 L100,0.5 L100,-0.5 L0,-5 Z"
  } as NetworkSceneEdge
}

function context() {
  return createMockCanvasContext() as unknown as CanvasRenderingContext2D
}

describe.each(["curved", "line", "bezier", "ribbon"] as const)(
  "%s edge paint visibility",
  (type) => {
    it.each(["none", "zero"])(
      "skips a %s stroke while preserving an explicit fill",
      (hidden) => {
        const mark = edge(type)
        if (hidden === "none") mark.style.stroke = "none"
        else mark.style.strokeWidth = 0
        const ctx = context()
        networkEdgeRenderer(ctx, [mark])
        expect(ctx.stroke).not.toHaveBeenCalled()
        expect(ctx.fill).toHaveBeenCalledTimes(type === "line" ? 0 : 1)
        const svg = renderToStaticMarkup(
          <svg>{networkSceneEdgeToSVG(mark, 0)}</svg>
        )
        expect(svg).toContain(
          hidden === "none" ? 'stroke="none"' : 'stroke-width="0"'
        )
      }
    )

    it("still paints a visible stroke", () => {
      const ctx = context()
      networkEdgeRenderer(ctx, [edge(type)])
      expect(ctx.stroke).toHaveBeenCalledOnce()
    })
  }
)

it("paints tapered curved paths at explicit full opacity without an outline", () => {
  const ctx = context()
  const mark = edge("curved")
  mark.style.stroke = "none"
  mark.style.strokeWidth = 0
  let alphaAtFill: number | undefined
  vi.mocked(ctx.fill).mockImplementation(() => {
    alphaAtFill = ctx.globalAlpha
  })
  networkEdgeRenderer(ctx, [mark])
  expect(alphaAtFill).toBe(1)
  expect(ctx.stroke).not.toHaveBeenCalled()
})
