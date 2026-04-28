import { vi } from "vitest"

/**
 * Mock 2D canvas rendering context — structurally a `Partial<CanvasRenderingContext2D>`
 * with method spies, plus a few extra stub fields. Typed as a loose stringy
 * bag because vitest's `vi.fn()` return type doesn't line up with
 * `CanvasRenderingContext2D`'s method signatures and tests inspect the spies
 * directly via `ctx.fillRect.mock.calls` etc.
 */
export type CanvasContextMock = Record<string, unknown>

/**
 * Creates a mock 2D canvas rendering context with all commonly used
 * methods stubbed as vi.fn() and properties set to sensible defaults.
 *
 * This is the single canonical canvas mock for the entire test suite.
 * Import from "../../test-utils/canvasMock" (or appropriate relative path).
 */
export function createMockCanvasContext(): CanvasContextMock {
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

export function recordCanvasOps(ctx: CanvasContextMock): CanvasOpLog {
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
 * rAF stubbing flavor:
 *
 * - `true` — synchronous fire: the rAF callback runs immediately when
 *   scheduled. Default. Right for most tests that just want a paint
 *   to happen before assertions, but recurses indefinitely for
 *   components that re-schedule rAF inside the callback (force
 *   simulations, continuous render loops).
 *
 * - `false` — leave jsdom's default rAF in place (setTimeout-backed,
 *   ~16ms). Right for tests that exercise the actual rAF cadence and
 *   use `waitFor` to settle. Pairs with force-simulation specs.
 *
 * - `"noop"` — install a stub that returns an id but never fires the
 *   callback. Right for "observe initial state" regression tests that
 *   want a single mount-time render and nothing else (the frame
 *   regression suites that spy on `updateConfig` use this).
 *
 * - `"microtask"` — fire the callback on a `Promise.resolve().then(...)`
 *   microtask. Right for tests where synchronous fire would recurse
 *   `scheduleRender` but jsdom's setTimeout cadence introduces
 *   undesirable latency (StrictMode double-mount tests use this).
 */
export type StubRafMode = boolean | "noop" | "microtask"

export interface SetupCanvasMockOptions {
  stubRaf?: StubRafMode
}

/**
 * Sets up the canvas getContext mock on HTMLCanvasElement.prototype, the
 * Path2D global, and (optionally) synchronous rAF/cAF stubs.
 *
 * @returns A cleanup function that restores the mocked globals.
 *
 * @example
 * ```ts
 * let cleanup: () => void
 * beforeEach(() => { cleanup = setupCanvasMock() })          // sync rAF (default)
 * beforeEach(() => { cleanup = setupCanvasMock({ stubRaf: false }) })       // jsdom rAF (force-sim specs)
 * beforeEach(() => { cleanup = setupCanvasMock({ stubRaf: "noop" }) })      // never fires (mount-only regression)
 * beforeEach(() => { cleanup = setupCanvasMock({ stubRaf: "microtask" }) }) // Promise.resolve fire (StrictMode)
 * afterEach(() => { cleanup() })
 * ```
 */
export function setupCanvasMock(options: SetupCanvasMockOptions = {}): () => void {
  const { stubRaf = true } = options
  const ctx = createMockCanvasContext()

  // Capture originals so cleanup is symmetric — without this, the canvas
  // getContext stub and a freshly-installed Path2D leak into later test
  // files via the shared HTMLCanvasElement.prototype / globalThis. The
  // helper's "restore the mocked globals" docstring is now accurate.
  const originalGetContext = HTMLCanvasElement.prototype.getContext
  const path2DWasMissing = !(globalThis as any).Path2D

  ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ctx)

  if (path2DWasMissing) {
    (globalThis as any).Path2D = class { constructor() {} }
  }

  let rafSpy: ReturnType<typeof vi.spyOn> | undefined
  let cafSpy: ReturnType<typeof vi.spyOn> | undefined
  if (stubRaf !== false) {
    let nextRafId = 0
    // Track cancellation state for the deferred-fire flavors. Real
    // browsers honor `cancelAnimationFrame(id)` by skipping the
    // pending callback; production code (`useFrame` cleanup,
    // `DataSourceAdapter` chunk timers, `MinimapChart` polling) relies
    // on that to avoid post-unmount state updates and runaway loops.
    // The sync-fire flavor doesn't need this — its callback has already
    // run by the time `requestAnimationFrame` returns — so `cancelled`
    // only ever matters for `"microtask"`. (`"noop"` doesn't schedule
    // anything either.)
    const cancelled = new Set<number>()
    const impl = (cb: FrameRequestCallback): number => {
      if (stubRaf === "noop") {
        // Schedule nothing — the test wants a single mount-time render.
        return ++nextRafId
      }
      if (stubRaf === "microtask") {
        const id = ++nextRafId
        Promise.resolve().then(() => {
          if (cancelled.has(id)) {
            cancelled.delete(id)
            return
          }
          cb(performance.now())
        })
        return id
      }
      // `stubRaf === true` (default): synchronous fire. Return 0 so
      // callers treating rAF id as a truthy "pending" flag (e.g.
      // useFrame.scheduleRender's `if (rafRef.current) return` guard)
      // don't see a stale assignment lock out subsequent renders. The
      // sequence is: scheduleRender → rafRef.current = requestAnimationFrame(cb)
      // → cb fires synchronously → renderFn resets rafRef.current = 0
      // → impl returns 0 → assignment writes 0. Returning a non-zero id
      // here would overwrite the reset and silently coalesce the next
      // scheduleRender into a phantom pending rAF.
      cb(performance.now())
      return 0
    }
    rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation(impl)
    cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      // id 0 means "no rAF pending" in the sync-fire flavor's id
      // contract; ignore so we don't pollute the cancelled set with
      // sentinel values.
      if (id) cancelled.add(id)
    })
  }

  return () => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
    if (path2DWasMissing) {
      delete (globalThis as any).Path2D
    }
    if (rafSpy?.mockRestore) rafSpy.mockRestore()
    if (cafSpy?.mockRestore) cafSpy.mockRestore()
  }
}
