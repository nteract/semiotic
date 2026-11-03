import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"
import { createMockCanvasContext } from "./test-utils/canvasMock"
import { registerBuiltInNetworkLayouts } from "./components/stream/layouts/registerBuiltIn"

registerBuiltInNetworkLayouts()

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

// JSDOM has no Canvas 2D implementation. Reuse the same doubles as renderer
// tests, retaining one context per canvas as browsers do. Tests that need to
// inspect a shared context can still use setupCanvasMock explicitly.
if (typeof HTMLCanvasElement !== "undefined") {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>()
  HTMLCanvasElement.prototype.getContext = vi.fn(function (
    this: HTMLCanvasElement,
    contextId: string,
  ) {
    if (contextId !== "2d") return null
    let context = contexts.get(this)
    if (!context) {
      context = createMockCanvasContext(this) as unknown as CanvasRenderingContext2D
      contexts.set(this, context)
    }
    return context
  }) as HTMLCanvasElement["getContext"]
}

if (typeof globalThis.Path2D === "undefined") {
  globalThis.Path2D = class MockPath2D {
    constructor(_path?: string | Path2D) {}
    addPath(_path: Path2D, _transform?: DOMMatrix2DInit) {}
  } as typeof Path2D
}
