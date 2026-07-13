import * as React from "react"
import { act, render, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FrameRuntime } from "./FrameRuntime"
import {
  CanvasFrameBackground,
  useCanvasFrameHost,
  type CanvasFrameHostStore,
} from "./useCanvasFrameHost"

interface TestStore extends CanvasFrameHostStore {}

function createInput(overrides: Partial<Parameters<typeof useCanvasFrameHost<TestStore>>[0]> = {}) {
  const frameRuntime = new FrameRuntime({ clock: () => 0 })
  const cancelIntroAnimation = vi.fn()
  const cleanup = vi.fn()
  const render = vi.fn()
  const scheduleRender = vi.fn()
  const cancelRender = vi.fn()
  const dirtyRef = { current: false } as React.MutableRefObject<boolean>
  const storeRef = {
    current: { cancelIntroAnimation },
  } as React.RefObject<TestStore | null>

  return {
    input: {
      storeRef,
      dirtyRef,
      renderFnRef: { current: render } as React.MutableRefObject<() => void>,
      scheduleRender,
      cancelRender,
      frameRuntime,
      hydrated: false,
      wasHydratingFromSSR: false,
      cleanup,
      canvasPaintDependencies: ["initial"],
      ...overrides,
    },
    cancelIntroAnimation,
    cleanup,
    dirtyRef,
    render,
    scheduleRender,
    cancelRender,
    frameRuntime,
  }
}

describe("useCanvasFrameHost", () => {
  it("owns stable canvas layers and performs the hydration teardown boundary", () => {
    const fixture = createInput()
    const { result, rerender, unmount } = renderHook(
      ({ input }) => useCanvasFrameHost(input),
      { initialProps: { input: fixture.input } },
    )

    const canvasRef = result.current.canvasRef
    const interactionCanvasRef = result.current.interactionCanvasRef
    expect(fixture.dirtyRef.current).toBe(true)
    expect(fixture.render).toHaveBeenCalledTimes(1)
    expect(fixture.scheduleRender).toHaveBeenCalledTimes(1)

    rerender({ input: fixture.input })
    expect(result.current.canvasRef).toBe(canvasRef)
    expect(result.current.interactionCanvasRef).toBe(interactionCanvasRef)

    unmount()
    expect(fixture.cleanup).toHaveBeenCalledTimes(1)
  })

  it("cancels scheduled work while inactive and repaints retained state on resume", () => {
    const fixture = createInput()
    renderHook(() => useCanvasFrameHost(fixture.input))
    fixture.scheduleRender.mockClear()
    fixture.cancelRender.mockClear()

    act(() => fixture.frameRuntime.setPaused(true))
    expect(fixture.cancelRender).toHaveBeenCalledTimes(1)
    expect(fixture.scheduleRender).not.toHaveBeenCalled()

    fixture.dirtyRef.current = false
    act(() => fixture.frameRuntime.setPaused(false))
    expect(fixture.dirtyRef.current).toBe(true)
    expect(fixture.scheduleRender).toHaveBeenCalledTimes(1)
  })

  it("uses family-selected canvas dependencies for overlay paint invalidation", () => {
    const fixture = createInput({ canvasPaintDependencies: ["first"] })
    const { rerender } = renderHook(
      ({ input }) => useCanvasFrameHost(input),
      { initialProps: { input: fixture.input } },
    )
    fixture.scheduleRender.mockClear()
    fixture.dirtyRef.current = false

    rerender({ input: { ...fixture.input, canvasPaintDependencies: ["first"] } })
    expect(fixture.dirtyRef.current).toBe(false)
    expect(fixture.scheduleRender).not.toHaveBeenCalled()

    rerender({ input: { ...fixture.input, canvasPaintDependencies: ["second"] } })
    expect(fixture.dirtyRef.current).toBe(true)
    expect(fixture.scheduleRender).toHaveBeenCalledTimes(1)
  })
})

describe("CanvasFrameBackground", () => {
  it("keeps SVG background graphics behind canvas in chart coordinates", () => {
    const { container } = render(
      <CanvasFrameBackground size={[240, 120]} margin={{ top: 10, right: 20, bottom: 30, left: 40 }}>
        <circle cx={0} cy={0} r={4} />
      </CanvasFrameBackground>,
    )

    expect(container.querySelector("svg")?.style.pointerEvents).toBe("none")
    expect(container.querySelector("g")?.getAttribute("transform")).toBe("translate(40,10)")
  })
})
