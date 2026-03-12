import { vi } from "vitest"

/**
 * Creates a mock 2D canvas rendering context with all commonly used
 * methods stubbed as vi.fn() and properties set to sensible defaults.
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
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    setLineDash: vi.fn(),
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
    measureText: vi.fn(() => ({ width: 0 })),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(0) })),
    putImageData: vi.fn(),

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
