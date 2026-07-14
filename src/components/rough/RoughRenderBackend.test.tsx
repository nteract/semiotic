import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { createMockCanvasContext } from "../../test-utils/canvasMock"
import { renderOrdinalToStaticSVG } from "../server/renderToStaticSVG"
import {
  paintSceneWithBackend,
  renderSceneWithBackend,
  resetRenderBackendWarningsForTests
} from "../stream/renderBackend"
import type { PointSceneNode, RectSceneNode, SceneRenderBackend } from "../stream/types"
import { createRoughRenderMode, stableRoughSeed } from "./createRoughRenderMode"

const rect: RectSceneNode = {
  type: "rect",
  x: 10,
  y: 20,
  w: 80,
  h: 40,
  style: { fill: "#22aa88", stroke: "#102030", strokeWidth: 2 },
  datum: { id: "bar-a" },
  _transitionKey: "bar-a"
}

function svgFor(mode: ReturnType<typeof createRoughRenderMode>, node = rect): string {
  return ReactDOMServer.renderToStaticMarkup(
    <svg>{mode.renderStaticSVG({ node, style: node.style, key: "mark" })}</svg>
  )
}

describe("createRoughRenderMode", () => {
  it("produces stable SVG for the same seed across cache clears and instances", () => {
    const first = createRoughRenderMode({ seed: 1984, roughness: 1.35, fillStyle: "cross-hatch" })
    const firstMarkup = svgFor(first)
    first.clearCache()

    expect(svgFor(first)).toBe(firstMarkup)
    expect(svgFor(createRoughRenderMode({ seed: 1984, roughness: 1.35, fillStyle: "cross-hatch" }))).toBe(firstMarkup)
    expect(firstMarkup).toContain('data-semiotic-render-backend="roughjs"')
  })

  it("derives deterministic, non-zero seeds and distinguishes base seeds", () => {
    expect(stableRoughSeed("mort")).toBe(stableRoughSeed("mort"))
    expect(stableRoughSeed("mort")).toBeGreaterThan(0)
    expect(stableRoughSeed(undefined)).toBe(stableRoughSeed(undefined))
    expect(stableRoughSeed(null)).toBe(stableRoughSeed(null))
    const circular: { self?: unknown } = {}
    circular.self = circular
    expect(stableRoughSeed(circular)).toBe(stableRoughSeed(circular))
    expect(svgFor(createRoughRenderMode({ seed: 1984 }))).not.toBe(
      svgFor(createRoughRenderMode({ seed: 1985 }))
    )
  })

  it("normalizes a non-finite cache size to the documented default", () => {
    const mode = createRoughRenderMode({ cacheSize: Number.NaN })
    for (let index = 0; index <= 1000; index += 1) {
      const node = { ...rect, _transitionKey: `bar-${index}` }
      mode.renderStaticSVG({ node, style: node.style, key: `mark-${index}` })
    }
    expect(mode.cacheEntries).toBe(1000)
  })

  it("reuses a drawable during Canvas repaints without mutating exact geometry", () => {
    const mode = createRoughRenderMode({ seed: 1984 })
    const context = createMockCanvasContext() as unknown as CanvasRenderingContext2D
    ;(context as unknown as { rotate: ReturnType<typeof vi.fn> }).rotate = vi.fn()
    const before = structuredClone(rect)

    expect(mode.drawCanvas({ context, node: rect, style: rect.style, pixelRatio: 2 })).toBe(true)
    expect(mode.cacheEntries).toBe(1)
    expect(mode.drawCanvas({ context, node: rect, style: rect.style, pixelRatio: 1 })).toBe(true)
    expect(mode.cacheEntries).toBe(1)
    expect(rect).toEqual(before)
    expect(context.bezierCurveTo).toHaveBeenCalled()
  })

  it("renders through the established static export path", () => {
    const mode = createRoughRenderMode({ seed: 1984, disableMultiStroke: true })
    const props = {
      chartType: "bar" as const,
      data: [{ category: "A", value: 4 }, { category: "B", value: 7 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      size: [320, 180] as [number, number],
      renderMode: mode
    }
    const first = renderOrdinalToStaticSVG(props)
    const second = renderOrdinalToStaticSVG(props)

    expect(first).toBe(second)
    expect(first).toContain('data-semiotic-render-backend="roughjs"')
    expect(first.match(/data-semiotic-render-backend/g)?.length).toBe(2)
  })
})

describe("renderer backend fallback contract", () => {
  it("leaves normal rendering unchanged without an adapter or for sketchy", () => {
    const node: PointSceneNode = {
      type: "point",
      x: 4,
      y: 8,
      r: 3,
      style: { fill: "red" },
      datum: { id: "point" }
    }
    const fallback = <circle cx={4} cy={8} r={3} />
    expect(renderSceneWithBackend({ node, index: 0, renderMode: undefined, fallback: () => fallback })).toBe(fallback)
    expect(renderSceneWithBackend({ node, index: 0, renderMode: "sketchy", fallback: () => fallback })).toBe(fallback)
  })

  it("falls back safely and warns once for unsupported scene nodes", () => {
    resetRenderBackendWarningsForTests()
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const unsupported = { type: "glyph", datum: { id: "g" }, style: {} }
    const backend: SceneRenderBackend<typeof unsupported> = {
      id: "test-backend",
      cacheKey: () => "g",
      drawCanvas: () => false,
      renderStaticSVG: () => null
    }
    const context = createMockCanvasContext() as unknown as CanvasRenderingContext2D
    const paintBuiltIn = vi.fn()

    paintSceneWithBackend({ context, nodes: [unsupported], renderMode: backend, pixelRatio: 1, paintBuiltIn })
    paintSceneWithBackend({ context, nodes: [unsupported], renderMode: backend, pixelRatio: 1, paintBuiltIn })
    expect(paintBuiltIn).toHaveBeenNthCalledWith(1, [unsupported])
    expect(paintBuiltIn).toHaveBeenNthCalledWith(2, [unsupported])
    expect(warning).toHaveBeenCalledTimes(1)
    warning.mockRestore()
  })

  it("preserves scene order across backend and built-in renderer runs", () => {
    const order: string[] = []
    const context = createMockCanvasContext() as unknown as CanvasRenderingContext2D
    const nodes = ["a", "b", "c"].map((id) => ({
      type: "rect",
      id,
      datum: { id },
      style: {},
    }))
    const backend: SceneRenderBackend<(typeof nodes)[number]> = {
      id: "ordered-backend",
      cacheKey: (node) => node.id,
      drawCanvas: ({ node }) => {
        order.push(node.id)
        return true
      },
      renderStaticSVG: () => null,
    }

    paintSceneWithBackend({
      context,
      nodes,
      renderMode: (datum) => datum?.id === "b" ? undefined : backend,
      pixelRatio: 1,
      paintBuiltIn: (fallback) => order.push(...fallback.map((node) => node.id)),
    })

    expect(order).toEqual(["a", "b", "c"])
  })
})

describe("rough package isolation", () => {
  it("keeps Rough.js imports out of every normal Semiotic source entry", () => {
    const componentsRoot = join(process.cwd(), "src/components")
    const files: string[] = []
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) visit(path)
        else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.tsx")) files.push(path)
      }
    }
    visit(componentsRoot)
    const importers = files.filter((file) => /from\s+["']roughjs(?:\/[^"']*)?["']/.test(readFileSync(file, "utf8")))

    expect(importers.map((file) => file.replace(`${componentsRoot}/`, ""))).toEqual([
      "rough/createRoughRenderMode.tsx"
    ])
  })

  it("publishes only the optional subpath as the Rough.js boundary", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"))
    expect(pkg.exports["./rough"].import).toBe("./dist/rough.module.min.js")
    expect(pkg.devDependencies.roughjs).toBe("^4.6.6")
    expect(pkg.peerDependencies.roughjs).toBe("^4.6.6")
    expect(pkg.peerDependenciesMeta.roughjs.optional).toBe(true)
  })
})
