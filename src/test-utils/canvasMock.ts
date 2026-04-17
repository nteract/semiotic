import { vi } from "vitest"

/**
 * Creates a mock 2D canvas rendering context with all commonly used
 * methods stubbed as vi.fn() and properties set to sensible defaults.
 *
 * This is the single canonical canvas mock for the entire test suite.
 * Import from "../../test-utils/canvasMock" (or appropriate relative path).
 */
export function createMockCanvasContext(): Record<string, any> {
  return {
    // Drawing methods
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    closePath: vi.fn(),
    clip: vi.fn(),
    rect: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createPattern: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(0) })),
    putImageData: vi.fn(),
    isPointInPath: vi.fn(() => false),

    // Style properties
    strokeStyle: "",
    lineWidth: 1,
    fillStyle: "",
    font: "",
    textAlign: "",
    textBaseline: "",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineCap: "butt",
    lineJoin: "miter",
    shadowBlur: 0,
    shadowColor: "rgba(0,0,0,0)",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  }
}

/**
 * Record style state at the moment each draw op fires.
 *
 * Counting `ctx.fill` / `ctx.stroke` calls is brittle — a refactor that
 * batches two paths into one stroke changes the count without changing
 * what's visible. This helper instead captures the style state (`fillStyle`,
 * `strokeStyle`, `globalAlpha`, `lineWidth`) at each draw call, so tests
 * can assert on *what was drawn with what appearance* rather than on how
 * many primitives the renderer emitted to get there.
 *
 * Usage:
 *   const ctx = createMockCanvasContext()
 *   const ops = recordCanvasOps(ctx)
 *   someRenderer(ctx, nodes, ...)
 *   expect(ops.fillStyles).toEqual(["#e41a1c", "rgba(255,255,0,0.5)"])
 */
export interface CanvasOpLog {
  fillStyles: string[]
  strokeStyles: string[]
  fillAlphas: number[]
  strokeAlphas: number[]
  /** `lineWidth` at the moment each stroke fired — useful for pulse /
   *  emphasis renderers that vary stroke weight by intensity. */
  strokeLineWidths: number[]
}

export function recordCanvasOps(ctx: Record<string, any>): CanvasOpLog {
  const log: CanvasOpLog = {
    fillStyles: [],
    strokeStyles: [],
    fillAlphas: [],
    strokeAlphas: [],
    strokeLineWidths: []
  }
  const origFill = ctx.fill as (...args: any[]) => void
  const origStroke = ctx.stroke as (...args: any[]) => void
  ctx.fill = ((...args: any[]) => {
    log.fillStyles.push(String(ctx.fillStyle))
    log.fillAlphas.push(Number(ctx.globalAlpha))
    return origFill?.apply(ctx, args)
  }) as any
  ctx.stroke = ((...args: any[]) => {
    log.strokeStyles.push(String(ctx.strokeStyle))
    log.strokeAlphas.push(Number(ctx.globalAlpha))
    log.strokeLineWidths.push(Number(ctx.lineWidth))
    return origStroke?.apply(ctx, args)
  }) as any
  return log
}

/**
 * Sets up the canvas getContext mock on HTMLCanvasElement.prototype,
 * mocks requestAnimationFrame to execute callbacks synchronously,
 * and mocks cancelAnimationFrame.
 *
 * @returns A cleanup function that restores the mocked globals.
 *
 * @example
 * ```ts
 * let cleanup: () => void
 * beforeEach(() => { cleanup = setupCanvasMock() })
 * afterEach(() => { cleanup() })
 * ```
 */
export function setupCanvasMock(): () => void {
  const ctx = createMockCanvasContext();

  (HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ctx)

  if (!(globalThis as any).Path2D) {
    (globalThis as any).Path2D = class { constructor() {} }
  }

  const rafSpy = vi
    .spyOn(window, "requestAnimationFrame")
    .mockImplementation((cb) => {
      cb(performance.now())
      return 0
    })

  const cafSpy = vi
    .spyOn(window, "cancelAnimationFrame")
    .mockImplementation(() => {})

  return () => {
    if (rafSpy.mockRestore) rafSpy.mockRestore()
    if (cafSpy.mockRestore) cafSpy.mockRestore()
  }
}
