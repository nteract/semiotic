import "@testing-library/jest-dom/vitest"

// jsdom doesn't implement ResizeObserver. Components that measure their
// container (useResponsiveSize, LinkedLegend) need it to exist even if
// it never fires in tests. Individual tests that need to drive resize
// events typically install a richer mock on top of this no-op.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class NoopResizeObserver implements ResizeObserver {
    constructor(_callback?: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver
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

function createCanvasContextStub(canvas: HTMLCanvasElement): Partial<CanvasRenderingContext2D> {
  const ctx: Partial<CanvasRenderingContext2D> & Record<string, unknown> = {
    canvas,
    fillStyle: "#000",
    strokeStyle: "#000",
    globalAlpha: 1,
    lineWidth: 1,
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
  }
  const methodBag = ctx as Record<string, unknown>
  for (const method of canvasMethods) {
    methodBag[method] =
      method === "measureText"
        ? () => ({ width: 0 })
        : method === "getImageData"
          ? () => ({ data: new Uint8ClampedArray(0) })
          : method === "createLinearGradient" ||
              method === "createRadialGradient"
            ? () => ({ addColorStop: () => {} })
            : method === "getLineDash"
              ? () => []
              : method === "isPointInPath"
                ? () => false
                : () => {}
  }
  return ctx
}

// Guard: HTMLCanvasElement only exists in jsdom environments, not in Node SSR tests
if (typeof HTMLCanvasElement !== "undefined") {
  const patchedGetContext = function (
    this: HTMLCanvasElement,
    contextId: string,
  ) {
    if (contextId !== "2d") return null
    return createCanvasContextStub(this) as CanvasRenderingContext2D
  } as HTMLCanvasElement["getContext"]

  HTMLCanvasElement.prototype.getContext = patchedGetContext
}

if (typeof globalThis.Path2D === "undefined") {
  globalThis.Path2D = class MockPath2D {
    constructor(_path?: string | Path2D) {}
    addPath(_path: Path2D, _transform?: DOMMatrix2DInit) {}
  } as typeof Path2D
}
