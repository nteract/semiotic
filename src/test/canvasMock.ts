/**
 * Shared canvas and rAF mock setup for tests that render Stream Frame components.
 *
 * Usage:
 *   import { setupCanvasMock, teardownCanvasMock } from "../../test/canvasMock"
 *   beforeEach(() => setupCanvasMock())
 *   afterEach(() => teardownCanvasMock())
 */
import { vi } from "vitest"

export function setupCanvasMock() {
  ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => ({
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
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    strokeStyle: "",
    lineWidth: 1,
    fillStyle: "",
    font: "",
    textAlign: "",
    textBaseline: "",
    globalAlpha: 1,
  }))

  if (!(globalThis as any).Path2D) {
    (globalThis as any).Path2D = class { constructor() {} }
  }

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(performance.now())
    return 0
  })
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
}

export function teardownCanvasMock() {
  if ((window.requestAnimationFrame as any).mockRestore)
    (window.requestAnimationFrame as any).mockRestore()
  if ((window.cancelAnimationFrame as any).mockRestore)
    (window.cancelAnimationFrame as any).mockRestore()
}
