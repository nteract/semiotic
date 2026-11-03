import { readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import ts from "typescript"
import { describe, expect, it, vi } from "vitest"
import { createMockCanvasContext } from "./canvasMock"

// Renderer context parameters are named ctx. Inspect calls rather than source
// strings so comments, method references, and style properties need no allowlist.
function canvasMethodCalls(source: string, fileName = "renderer.ts"): Set<string> {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true)
  const methods = new Set<string>()
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      if (
        (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) &&
        ts.isIdentifier(callee.expression) && callee.expression.text === "ctx"
      ) {
        if (ts.isPropertyAccessExpression(callee)) methods.add(callee.name.text)
        else if (ts.isStringLiteralLike(callee.argumentExpression)) {
          methods.add(callee.argumentExpression.text)
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return methods
}

function missingMethods(context: object, methods: Set<string>): string[] {
  const missing: string[] = []
  for (const method of methods) {
    if (typeof Reflect.get(context, method) !== "function") missing.push(method)
  }
  return missing.sort()
}

describe("shared canvas mock", () => {
  it("collects actual context calls without treating properties or source text as methods", () => {
    const methods = canvasMethodCalls(`
      ctx.arc(0, 0, 1, 0, 1)
      ctx.fill?.()
      ctx["stroke"]()
      ctx.fillStyle = "red"
      ctx.canvas.getBoundingClientRect()
      const measure = ctx.measureText
      const example = "ctx.roundRect()"
      // ctx.ellipse()
      other.drawImage()
    `)
    expect(methods).toEqual(new Set(["arc", "fill", "stroke"]))
  })

  it("reports absent or non-callable methods in the shared double", () => {
    const { arc: _arc, ...context } = createMockCanvasContext()
    context.fill = undefined
    expect(missingMethods(context, new Set(["stroke", "fill", "arc"]))).toEqual([
      "arc", "fill"
    ])
  })

  it("installs callable stubs for every method used by production renderers", () => {
    const directory = resolve("src/components/stream/renderers")
    const files = readdirSync(directory, { encoding: "utf8", recursive: true }).filter((file) =>
      /\.tsx?$/.test(file) && !/\.(?:test|spec|d)\.tsx?$/.test(file)
    )
    expect(files.length).toBeGreaterThan(0)
    const methods = new Set<string>()
    for (const file of files) {
      for (const method of canvasMethodCalls(readFileSync(join(directory, file), "utf8"), file)) {
        methods.add(method)
      }
    }
    expect(methods.size).toBeGreaterThan(0)

    const canvas = document.createElement("canvas")
    expect(vi.isMockFunction(canvas.getContext)).toBe(true)
    const context = canvas.getContext("2d")!
    expect(context).not.toBeNull()
    expect(
      missingMethods(context, methods),
      "Add missing canvas methods to createMockCanvasContext in src/test-utils/canvasMock.ts"
    ).toEqual([])
  })

  it("retains a context per canvas without sharing spies or state across canvases", () => {
    const first = document.createElement("canvas")
    const second = document.createElement("canvas")
    const context = first.getContext("2d")!
    expect(context.canvas).toBe(first)
    expect(first.getContext("2d")).toBe(context)
    expect(second.getContext("2d")).not.toBe(context)
    context.fillRect(1, 2, 3, 4)
    expect(context.fillRect).toHaveBeenCalledWith(1, 2, 3, 4)
    expect(second.getContext("2d")!.fillRect).not.toHaveBeenCalled()
    expect(first.getContext("webgl")).toBeNull()
  })
})
