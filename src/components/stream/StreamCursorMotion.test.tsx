import "../../test-utils/registerBuiltInXYPlugins"
import * as React from "react"
import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { setupCanvasMock } from "../../test-utils/canvasMock"
import StreamGeoFrame from "./StreamGeoFrame"
import StreamOrdinalFrame from "./StreamOrdinalFrame"
import StreamXYFrame from "./StreamXYFrame"
import type { StreamOrdinalFrameHandle } from "./ordinalTypes"
import { createFrameScheduler } from "./test-utils/frameScheduler"
import type { StreamXYFrameHandle } from "./types"

describe("stationary-pointer cursor invalidation", () => {
  let restoreCanvas: () => void

  beforeEach(() => {
    restoreCanvas = setupCanvasMock({ stubRaf: "noop" })
  })

  afterEach(() => restoreCanvas())

  it("re-hit-tests XY marks while a data transition moves them", () => {
    const scheduler = createFrameScheduler(0)
    const ref = React.createRef<StreamXYFrameHandle>()
    let wallTime = 0
    const pointStyle = () => ({ r: 6, cursor: "pointer" as const })
    const props = {
      ref,
      chartType: "scatter" as const,
      xAccessor: "x",
      yAccessor: "y",
      pointIdAccessor: "id",
      pointStyle,
      xExtent: [0, 100] as [number, number],
      yExtent: [0, 100] as [number, number],
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      size: [200, 200] as [number, number],
      enableHover: false,
      animate: { duration: 100, intro: false } as const,
      clock: () => wallTime,
      frameScheduler: scheduler.scheduler
    }
    const { container, rerender } = render(
      <StreamXYFrame {...props} data={[{ id: "point", x: 50, y: 50 }]} />
    )
    act(() => scheduler.flush())
    const scales = ref.current!.getScales()!
    const image = container.querySelector<HTMLElement>('[role="img"]')!
    const canvas = container.querySelector("canvas")!
    fireEvent.pointerMove(image, {
      clientX: scales.x(50),
      clientY: scales.y(50),
      pointerType: "mouse"
    })
    act(() => scheduler.flush())
    expect(canvas.style.cursor).toBe("pointer")

    rerender(
      <StreamXYFrame {...props} data={[{ id: "point", x: 90, y: 50 }]} />
    )
    act(() => scheduler.flush())
    wallTime = 50
    act(() => scheduler.flush())
    expect(canvas.style.cursor).toBe("")
  })

  it("uses an area's top-path interaction geometry for cursor-only presentation", () => {
    const scheduler = createFrameScheduler(0)
    const ref = React.createRef<StreamXYFrameHandle>()
    const { container } = render(
      <StreamXYFrame
        ref={ref}
        chartType="area"
        data={[
          { x: 0, y: 60 },
          { x: 50, y: 60 },
          { x: 100, y: 60 }
        ]}
        xAccessor="x"
        yAccessor="y"
        xExtent={[0, 100]}
        yExtent={[0, 100]}
        areaStyle={() => ({ fill: "#4682b4", cursor: "pointer" })}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        size={[200, 200]}
        showAxes={false}
        enableHover={false}
        animate={false}
        frameScheduler={scheduler.scheduler}
      />
    )
    act(() => scheduler.flush())
    const scales = ref.current!.getScales()!
    const image = container.querySelector<HTMLElement>('[role="img"]')!
    const canvas = container.querySelector("canvas")!

    fireEvent.pointerMove(image, {
      clientX: scales.x(50),
      clientY: scales.y(60),
      pointerType: "mouse"
    })
    act(() => scheduler.flush())
    expect(canvas.style.cursor).toBe("pointer")

    fireEvent.pointerMove(image, {
      clientX: scales.x(50),
      clientY: scales.y(10),
      pointerType: "mouse"
    })
    act(() => scheduler.flush())
    expect(canvas.style.cursor).toBe("")
  })

  it("re-hit-tests ordinal marks while a data transition changes their bounds", () => {
    const scheduler = createFrameScheduler(0)
    const ref = React.createRef<StreamOrdinalFrameHandle>()
    let wallTime = 0
    const pieceStyle = () => ({ cursor: "pointer" as const })
    const props = {
      ref,
      chartType: "bar" as const,
      oAccessor: "category",
      rAccessor: "value",
      pieceStyle,
      rExtent: [0, 100] as [number, number],
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      size: [200, 200] as [number, number],
      enableHover: false,
      animate: { duration: 100, intro: false } as const,
      clock: () => wallTime,
      frameScheduler: scheduler.scheduler
    }
    const { container, rerender } = render(
      <StreamOrdinalFrame
        {...props}
        data={[{ category: "A", value: 80 }]}
      />
    )
    act(() => scheduler.flush())
    const scales = ref.current!.getScales()!
    const clientX = (scales.o("A") ?? 0) + scales.o.bandwidth() / 2
    const clientY = scales.r(70)
    const image = container.querySelector<HTMLElement>('[role="img"]')!
    const canvas = container.querySelector("canvas")!
    fireEvent.mouseMove(image, { clientX, clientY })
    act(() => scheduler.flush())
    expect(canvas.style.cursor).toBe("pointer")

    rerender(
      <StreamOrdinalFrame
        {...props}
        data={[{ category: "A", value: 10 }]}
      />
    )
    act(() => scheduler.flush())
    wallTime = 50
    act(() => scheduler.flush())
    expect(canvas.style.cursor).toBe("")
  })

  it("re-hit-tests Geo custom-layout marks after geometry changes", () => {
    const scheduler = createFrameScheduler(0)
    const layout = (context: { config: { x: number } }) => ({
      nodes: [{
        type: "point" as const,
        x: context.config.x,
        y: 50,
        r: 8,
        style: { cursor: "pointer" as const },
        datum: { id: "point" },
        pointId: "point"
      }]
    })
    const props = {
      projection: "mercator" as const,
      customLayout: layout as never,
      points: [{ id: "point", lon: 0, lat: 0 }],
      xAccessor: "lon",
      yAccessor: "lat",
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      size: [200, 120] as [number, number],
      enableHover: false,
      animate: false,
      frameScheduler: scheduler.scheduler
    }
    const { container, rerender } = render(
      <StreamGeoFrame {...props} layoutConfig={{ x: 50 }} />
    )
    act(() => scheduler.flush())
    const image = container.querySelector<HTMLElement>('[role="img"]')!
    const canvas = container.querySelector("canvas")!
    fireEvent.pointerMove(image, {
      clientX: 50,
      clientY: 50,
      pointerType: "mouse"
    })
    act(() => scheduler.flush())
    expect(canvas.style.cursor).toBe("pointer")

    rerender(<StreamGeoFrame {...props} layoutConfig={{ x: 150 }} />)
    act(() => scheduler.flush())
    expect(canvas.style.cursor).toBe("")
  })

  it("does not schedule XY cursor-only work for direct touch input", () => {
    const scheduler = createFrameScheduler(0)
    const { container } = render(
      <StreamXYFrame
        chartType="scatter"
        data={[{ x: 50, y: 50 }]}
        xAccessor="x"
        yAccessor="y"
        pointStyle={() => ({ r: 8, cursor: "pointer" })}
        xExtent={[0, 100]}
        yExtent={[0, 100]}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        size={[200, 200]}
        enableHover={false}
        animate={false}
        frameScheduler={scheduler.scheduler}
      />
    )
    act(() => scheduler.flush())
    const requestsBeforeTouch = scheduler.requestedHandles.length
    const image = container.querySelector<HTMLElement>('[role="img"]')!
    const canvas = container.querySelector("canvas")!
    fireEvent.pointerMove(image, {
      clientX: 100,
      clientY: 100,
      pointerType: "touch"
    })

    expect(canvas.style.cursor).toBe("")
    expect(scheduler.requestedHandles).toHaveLength(requestsBeforeTouch)
  })

  it("refreshes ordinal cursor-only work when a custom restyle adds and removes cursor", () => {
    const scheduler = createFrameScheduler(0)
    const data = [{ id: "point", category: "A", value: 1 }]
    const layout = (context: { data: typeof data }) => ({
      nodes: context.data.map(datum => ({
        type: "point" as const,
        x: 50,
        y: 50,
        r: 8,
        style: { fill: "#4682b4" },
        datum
      })),
      restyle: (
        _node: unknown,
        selection: { isActive: boolean } | null
      ) => ({ cursor: selection?.isActive ? "pointer" as const : undefined })
    })
    const baseProps = {
      chartType: "bar" as const,
      customLayout: layout as never,
      data,
      size: [100, 100] as [number, number],
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      showAxes: false,
      enableHover: false,
      animate: false,
      frameScheduler: scheduler.scheduler
    }
    const { container, rerender } = render(<StreamOrdinalFrame {...baseProps} />)
    act(() => scheduler.flush())

    const image = container.querySelector<HTMLElement>('[role="img"]')!
    const canvas = container.querySelector("canvas")!
    const requestsBeforePointer = scheduler.requestedHandles.length
    fireEvent.mouseMove(image, { clientX: 50, clientY: 50 })
    expect(scheduler.requestedHandles).toHaveLength(requestsBeforePointer)

    const activeSelection = { isActive: true, predicate: () => true }
    rerender(
      <StreamOrdinalFrame
        {...baseProps}
        layoutSelection={activeSelection as never}
      />
    )
    act(() => scheduler.flush())
    expect(canvas.style.cursor).toBe("pointer")

    rerender(<StreamOrdinalFrame {...baseProps} />)
    act(() => scheduler.flush())
    expect(canvas.style.cursor).toBe("")

    const requestsAfterRemoval = scheduler.requestedHandles.length
    fireEvent.mouseMove(image, { clientX: 50, clientY: 50 })
    expect(scheduler.requestedHandles).toHaveLength(requestsAfterRemoval)
  })
})
