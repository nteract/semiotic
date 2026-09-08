import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { scaleBand, scaleLinear } from "d3-scale"
import { createMockCanvasContext } from "../../../test-utils/canvasMock"
import type { SymbolSceneNode } from "../types"
import type { NetworkSymbolNode } from "../networkTypes"
import type { ViolinSceneNode } from "../ordinalTypes"
import { symbolPathString } from "../symbolPath"
import { symbolSceneNodeToSVG } from "../sceneToSVGShared"
import { networkSceneNodeToSVG } from "../SceneToSVGNetwork"
import { violinCanvasRenderer } from "./violinCanvasRenderer"

class RecordedPath {
  constructor(readonly d: string) {}
}

const parsePath = vi.fn(function (d: string) {
  return new RecordedPath(d)
})
const scales = { x: scaleLinear(), y: scaleLinear() }
const ordinalScales = {
  o: scaleBand<string>(),
  r: scaleLinear(),
  projection: "vertical" as const
}
const layout = { width: 400, height: 300 }
let symbolRenderers: typeof import("./symbolCanvasRenderer")

beforeEach(async () => {
  vi.resetModules()
  parsePath.mockClear()
  vi.stubGlobal("Path2D", parsePath)
  symbolRenderers = await import("./symbolCanvasRenderer")
})

afterEach(() => vi.unstubAllGlobals())

function makeContext() {
  return {
    ...createMockCanvasContext(),
    rotate: vi.fn()
  } as unknown as CanvasRenderingContext2D
}

function makeSymbol(overrides: Partial<SymbolSceneNode> = {}): SymbolSceneNode {
  return {
    type: "symbol",
    x: 20,
    y: 30,
    size: 16,
    symbolType: "square",
    style: { fill: "#123456", stroke: "#654321" },
    datum: {},
    ...overrides
  }
}

describe("symbol canvas paths", () => {
  it.each(["xy/ordinal", "network"])(
    "matches SVG for fractional sizes in %s",
    (family) => {
      const ctx = makeContext()
      const nodes = [4.01, 4.49, 8.49, 8.01].map((size) => makeSymbol({ size }))
      const networkNodes: NetworkSymbolNode[] = nodes.map((n) => ({
        ...n,
        cx: n.x,
        cy: n.y
      }))
      const svgNodes =
        family === "network"
          ? networkNodes.map(networkSceneNodeToSVG)
          : nodes.map((n, i) => symbolSceneNodeToSVG(n, i))
      const svg = document.createElement("div")
      svg.innerHTML = renderToStaticMarkup(<svg>{svgNodes}</svg>)

      if (family === "network")
        symbolRenderers.networkSymbolRenderer(ctx, networkNodes)
      else symbolRenderers.symbolCanvasRenderer(ctx, nodes, scales, layout)

      const paths = Array.from(svg.querySelectorAll("path"), (p) =>
        p.getAttribute("d")
      )
      expect(
        vi
          .mocked(ctx.fill)
          .mock.calls.map(([path]) => (path as unknown as RecordedPath).d)
      ).toEqual(paths)
      expect(paths[0]).not.toBe(paths[1])
      expect(paths[2]).not.toBe(paths[3])
    }
  )

  it("reuses custom paths across marks, repaints, and chart families", () => {
    const ctx = makeContext()
    const node = makeSymbol({ path: "M-3,0L0,-4L3,0Z" })
    symbolRenderers.symbolCanvasRenderer(
      ctx,
      [node, { ...node, x: 100 }],
      scales,
      layout
    )
    const path = vi.mocked(ctx.fill).mock.calls[0][0]

    node.rotation = Math.PI / 2
    node.style = { fill: "#abcdef", stroke: "#111111" }
    symbolRenderers.symbolCanvasRenderer(ctx, [node], scales, layout)
    symbolRenderers.networkSymbolRenderer(ctx, [{ ...node, cx: 40, cy: 60 }])

    expect(parsePath).toHaveBeenCalledTimes(1)
    expect(ctx.fill).toHaveBeenCalledTimes(4)
    expect(vi.mocked(ctx.fill).mock.calls.every(([p]) => p === path)).toBe(true)
    expect(vi.mocked(ctx.stroke).mock.calls.every(([p]) => p === path)).toBe(
      true
    )
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 2)
    expect(ctx.translate).toHaveBeenLastCalledWith(40, 60)
    expect(ctx.fillStyle).toBe("#abcdef")
  })

  it("refreshes geometry after path or size changes, including clearing a custom path", () => {
    const ctx = makeContext()
    const node = makeSymbol({ path: "M0,0L4,0L0,4Z" })
    for (const path of [node.path, "M0,0L8,0L0,8Z", ""]) {
      node.path = path
      symbolRenderers.symbolCanvasRenderer(ctx, [node], scales, layout)
    }
    node.size = 16.49
    symbolRenderers.symbolCanvasRenderer(ctx, [node], scales, layout)

    expect(parsePath.mock.calls.map(([d]) => d)).toEqual([
      "M0,0L4,0L0,4Z",
      "M0,0L8,0L0,8Z",
      symbolPathString("square", 16),
      symbolPathString("square", 16.49)
    ])
  })
})

describe("violin canvas paths", () => {
  function makeViolin(): ViolinSceneNode {
    return {
      type: "violin",
      pathString: "M0,0Q10,20 0,40Q-10,20 0,0Z",
      translateX: 20,
      translateY: 30,
      style: { fill: "#123456", stroke: "#654321" },
      datum: {}
    }
  }

  it("reuses retained geometry while translations, styles, and IQR overlays update", () => {
    const ctx = makeContext()
    const node = makeViolin()
    violinCanvasRenderer(ctx, [node], ordinalScales, layout)
    const path = vi.mocked(ctx.fill).mock.calls[0][0]

    node.translateX = 100
    node.style = { fill: "#abcdef", stroke: "#111111", opacity: 0.4 }
    node.iqrLine = {
      q1Pos: 10,
      medianPos: 20,
      q3Pos: 30,
      centerPos: 0,
      isVertical: true
    }
    violinCanvasRenderer(ctx, [node], ordinalScales, layout)

    expect(parsePath).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ctx.fill).mock.calls[1][0]).toBe(path)
    expect(ctx.translate).toHaveBeenLastCalledWith(100, 30)
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 10)
    expect(ctx.lineTo).toHaveBeenCalledWith(0, 30)
    expect(ctx.arc).toHaveBeenCalledWith(0, 20, 3, 0, Math.PI * 2)
  })

  it("reparses changed geometry on a retained node", () => {
    const ctx = makeContext()
    const node = makeViolin()
    const originalPath = node.pathString
    violinCanvasRenderer(ctx, [node], ordinalScales, layout)
    node.pathString = "M0,0Q20,20 0,40Q-20,20 0,0Z"
    violinCanvasRenderer(ctx, [node], ordinalScales, layout)
    violinCanvasRenderer(ctx, [node], ordinalScales, layout)

    expect(parsePath.mock.calls.map(([d]) => d)).toEqual([
      originalPath,
      node.pathString
    ])
    expect(vi.mocked(ctx.fill).mock.calls[1][0]).toEqual(
      new RecordedPath(node.pathString)
    )
    expect(vi.mocked(ctx.fill).mock.calls[2][0]).toBe(
      vi.mocked(ctx.fill).mock.calls[1][0]
    )
  })
})
