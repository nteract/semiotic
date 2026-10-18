import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMockCanvasContext } from "../../../test-utils/canvasMock"
import { findNearestNetworkNode } from "../NetworkCanvasHitTester"
import { networkSceneNodeToSVG } from "../SceneToSVGNetwork"
import type { NetworkSceneNode } from "../networkTypes"
import { networkRectRenderer } from "./networkRectRenderer"
import { networkCircleRenderer } from "./networkCircleRenderer"
import { networkArcRenderer } from "./networkArcRenderer"
import { networkSymbolRenderer } from "./symbolCanvasRenderer"

beforeEach(() => vi.stubGlobal("Path2D", class {}))
afterEach(() => vi.unstubAllGlobals())

const renderers = {
  rect: networkRectRenderer,
  circle: networkCircleRenderer,
  arc: networkArcRenderer,
  symbol: networkSymbolRenderer
}

function mark(type: keyof typeof renderers): NetworkSceneNode {
  const common = { style: { fill: "transparent" }, datum: { id: "target" } }
  switch (type) {
    case "rect":
      return { ...common, type, x: 0, y: 0, w: 20, h: 20 }
    case "circle":
      return { ...common, type, cx: 10, cy: 10, r: 10 }
    case "arc":
      return {
        ...common,
        type,
        cx: 10,
        cy: 10,
        innerR: 0,
        outerR: 20,
        startAngle: 0,
        endAngle: Math.PI * 2
      }
    case "symbol":
      return {
        ...common,
        type,
        cx: 10,
        cy: 10,
        size: 400,
        symbolType: "circle"
      }
  }
}

describe.each(Object.keys(renderers) as (keyof typeof renderers)[])(
  "%s semantic node paint",
  (type) => {
    it.each(["transparent", "opacity"])(
      "skips %s paint without removing the hit target",
      (visibility) => {
        const node = mark(type)
        if (visibility === "opacity")
          node.style = { fill: "red", stroke: "blue", opacity: 0 }
        const ctx =
          createMockCanvasContext() as unknown as CanvasRenderingContext2D
        renderers[type](ctx, [node])
        expect(ctx.save).not.toHaveBeenCalled()
        expect(findNearestNetworkNode([node], [], 10, 10)?.datum).toBe(
          node.datum
        )
        const svg = renderToStaticMarkup(
          <svg>{networkSceneNodeToSVG(node, 0)}</svg>
        )
        expect(svg).toContain(
          visibility === "opacity" ? 'opacity="0"' : 'fill="transparent"'
        )

        // In-place selection restyles must paint immediately; no cached skip bit.
        node.style = { fill: "red" }
        renderers[type](ctx, [node])
        expect(ctx.save).toHaveBeenCalledOnce()
      }
    )

    it("preserves transparent paints when compositing can erase pixels", () => {
      const ctx =
        createMockCanvasContext() as unknown as CanvasRenderingContext2D
      ctx.globalCompositeOperation = "copy"
      renderers[type](ctx, [mark(type)])
      expect(ctx.save).toHaveBeenCalledOnce()
    })

    it("preserves visible strokes and unresolved CSS fills", () => {
      const ctx =
        createMockCanvasContext() as unknown as CanvasRenderingContext2D
      const node = mark(type)
      node.style.stroke = "red"
      renderers[type](ctx, [node])
      expect(
        type === "rect" ? ctx.strokeRect : ctx.stroke
      ).toHaveBeenCalledOnce()
      expect(ctx.save).toHaveBeenCalledOnce()
      node.style = { fill: "var(--node-fill, red)" }
      renderers[type](ctx, [node])
      expect(ctx.save).toHaveBeenCalledTimes(2)
    })
  }
)

it.each(["rect", "circle"] as const)(
  "preserves a %s pulse over an invisible base",
  (type) => {
    const node = mark(type)
    if (node.type !== "rect" && node.type !== "circle")
      throw new Error("Expected a pulse-capable node")
    node.style.opacity = 0
    node._pulseIntensity = 1
    const ctx = createMockCanvasContext() as unknown as CanvasRenderingContext2D
    const alphas: number[] = []
    const record = () => {
      alphas.push(ctx.globalAlpha)
    }
    vi.mocked(ctx.fillRect).mockImplementation(record)
    vi.mocked(ctx.stroke).mockImplementation(record)
    renderers[type](ctx, [node])
    expect(alphas.some((alpha) => alpha > 0)).toBe(true)
  }
)
