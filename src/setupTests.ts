/* eslint-disable */

import "@testing-library/jest-dom/vitest"

// jsdom doesn't implement ResizeObserver. Components that measure their
// container (useResponsiveSize, LinkedLegend) need it to exist even if
// it never fires in tests. Individual tests that need to drive resize
// events typically install a richer mock on top of this no-op.
if (typeof globalThis.ResizeObserver === "undefined") {
  ;(globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// JSDOM does not implement a full Canvas 2D context. Provide stubs for
// the methods used by Stream Frames so that component tests can render
// without "ctx.setTransform is not a function" errors.
const canvasMethods = [
  "setTransform",
  "translate",
  "scale",
  "clearRect",
  "fillRect",
  "strokeRect",
  "beginPath",
  "closePath",
  "moveTo",
  "lineTo",
  "arc",
  "arcTo",
  "quadraticCurveTo",
  "bezierCurveTo",
  "rect",
  "fill",
  "stroke",
  "clip",
  "save",
  "restore",
  "measureText",
  "drawImage",
  "createLinearGradient",
  "createRadialGradient",
  "createPattern",
  "putImageData",
  "getImageData",
  "setLineDash",
  "getLineDash",
  "isPointInPath",
  "fillText",
  "strokeText",
  "transform",
  "resetTransform",
] as const

// Guard: HTMLCanvasElement only exists in jsdom environments, not in Node SSR tests
if (typeof HTMLCanvasElement !== "undefined") {

const originalGetContext = HTMLCanvasElement.prototype.getContext

HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  contextId: string,
  ...args: any[]
) {
  const ctx = originalGetContext.call(this, contextId, ...args) as any
  if (ctx) {
    for (const method of canvasMethods) {
      if (typeof ctx[method] !== "function") {
        ctx[method] =
          method === "measureText"
            ? () => ({ width: 0 })
            : method === "getImageData"
              ? () => ({ data: new Uint8ClampedArray(0) })
              : method === "createLinearGradient" ||
                  method === "createRadialGradient"
                ? () => ({ addColorStop: () => {} })
                : method === "getLineDash"
                  ? () => []
                  : () => {}
      }
    }
  }
  return ctx
} as any

} // end HTMLCanvasElement guard
