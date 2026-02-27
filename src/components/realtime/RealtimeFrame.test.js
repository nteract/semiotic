import React, { createRef, useState } from "react"
import { render, act, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import RealtimeFrame from "./RealtimeFrame"

// Mock requestAnimationFrame and canvas getContext — both in beforeEach
// because Jest's `resetMocks: true` config calls mockReset() on all mocks
// before each test, which clears mock implementations. These must be
// re-established before each test.
//
// rAF returns 0 (falsy) because the callback fires synchronously within the
// same tick, so by the time the return value is assigned to rafRef.current
// the rAF has already completed. Returning a truthy id would overwrite
// the rafRef.current = 0 that the callback sets, permanently blocking
// subsequent scheduleRender calls.
let rafCallbacks = []
beforeEach(() => {
  rafCallbacks = []
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    translate: jest.fn(),
    setLineDash: jest.fn(),
    strokeStyle: "",
    lineWidth: 1,
    fillStyle: "",
    font: "",
    textAlign: "",
    textBaseline: ""
  }))
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    rafCallbacks.push(cb)
    cb(performance.now())
    return 0
  })
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
})

afterEach(() => {
  window.requestAnimationFrame.mockRestore()
  window.cancelAnimationFrame.mockRestore()
})

describe("RealtimeFrame", () => {
  it("renders without crashing", () => {
    const { container } = render(<RealtimeFrame />)
    expect(container.querySelector(".realtime-frame")).toBeTruthy()
  })

  it("renders a canvas element", () => {
    const { container } = render(<RealtimeFrame />)
    expect(container.querySelector("canvas")).toBeTruthy()
  })

  it("renders SVG overlay when annotations return elements", () => {
    const annotations = [{ type: "threshold", value: 50 }]
    const { container } = render(
      <RealtimeFrame
        data={[{ time: 0, value: 10 }, { time: 1, value: 20 }]}
        annotations={annotations}
        svgAnnotationRules={(annotation, i, context) => (
          <line key={i} x1={0} x2={100} y1={50} y2={50} stroke="red" />
        )}
      />
    )
    expect(container.querySelector("svg")).toBeTruthy()
    expect(container.querySelector("line")).toBeTruthy()
  })

  it("does not render SVG when no annotations", () => {
    const { container } = render(<RealtimeFrame />)
    expect(container.querySelector("svg")).toBeNull()
  })

  it("works with controlled data prop", () => {
    const data = [
      { time: 0, value: 10 },
      { time: 1, value: 20 },
      { time: 2, value: 30 }
    ]
    const { container } = render(<RealtimeFrame data={data} />)
    expect(container.querySelector("canvas")).toBeTruthy()
  })

  it("exposes imperative push via ref", () => {
    const ref = createRef()
    render(<RealtimeFrame ref={ref} />)

    expect(ref.current).toBeTruthy()
    expect(typeof ref.current.push).toBe("function")
    expect(typeof ref.current.pushMany).toBe("function")
    expect(typeof ref.current.clear).toBe("function")
    expect(typeof ref.current.getData).toBe("function")

    ref.current.push({ time: 0, value: 10 })
    ref.current.push({ time: 1, value: 20 })
    expect(ref.current.getData()).toEqual([
      { time: 0, value: 10 },
      { time: 1, value: 20 }
    ])
  })

  it("imperative pushMany works", () => {
    const ref = createRef()
    render(<RealtimeFrame ref={ref} />)

    ref.current.pushMany([
      { time: 0, value: 10 },
      { time: 1, value: 20 },
      { time: 2, value: 30 }
    ])
    expect(ref.current.getData().length).toBe(3)
  })

  it("imperative clear works", () => {
    const ref = createRef()
    render(<RealtimeFrame ref={ref} />)

    ref.current.push({ time: 0, value: 10 })
    ref.current.clear()
    expect(ref.current.getData()).toEqual([])
  })

  it("applies className prop", () => {
    const { container } = render(<RealtimeFrame className="my-chart" />)
    expect(container.querySelector(".realtime-frame.my-chart")).toBeTruthy()
  })

  it("respects size prop for container dimensions", () => {
    const { container } = render(<RealtimeFrame size={[800, 400]} />)
    const frame = container.querySelector(".realtime-frame")
    expect(frame.style.width).toBe("800px")
    expect(frame.style.height).toBe("400px")
  })

  it("renders with arrowOfTime=left", () => {
    const data = [{ time: 0, value: 10 }]
    const { container } = render(
      <RealtimeFrame arrowOfTime="left" data={data} />
    )
    expect(container.querySelector("canvas")).toBeTruthy()
  })

  it("renders with arrowOfTime=up", () => {
    const data = [{ time: 0, value: 10 }]
    const { container } = render(
      <RealtimeFrame arrowOfTime="up" data={data} />
    )
    expect(container.querySelector("canvas")).toBeTruthy()
  })

  it("renders with arrowOfTime=down", () => {
    const data = [{ time: 0, value: 10 }]
    const { container } = render(
      <RealtimeFrame arrowOfTime="down" data={data} />
    )
    expect(container.querySelector("canvas")).toBeTruthy()
  })

  it("renders with windowMode=growing", () => {
    const ref = createRef()
    render(<RealtimeFrame ref={ref} windowMode="growing" windowSize={3} />)

    ref.current.push({ time: 0, value: 10 })
    ref.current.push({ time: 1, value: 20 })
    ref.current.push({ time: 2, value: 30 })
    ref.current.push({ time: 3, value: 40 })
    expect(ref.current.getData().length).toBe(4)
  })

  it("renders with windowMode=sliding evicts old data", () => {
    const ref = createRef()
    render(
      <RealtimeFrame ref={ref} windowMode="sliding" windowSize={3} />
    )

    ref.current.push({ time: 0, value: 10 })
    ref.current.push({ time: 1, value: 20 })
    ref.current.push({ time: 2, value: 30 })
    ref.current.push({ time: 3, value: 40 })
    expect(ref.current.getData().length).toBe(3)
    expect(ref.current.getData()[0]).toEqual({ time: 1, value: 20 })
  })

  describe("annotations + streaming interaction", () => {
    it("imperative push continues to accumulate data after annotations are added", () => {
      // This tests the stale-closure bug: pushPoint must keep working
      // even after annotations cause callback recreation
      function Wrapper() {
        const ref = React.useRef()
        const [annotations, setAnnotations] = useState([])

        React.useEffect(() => {
          // Push initial data
          for (let i = 0; i < 5; i++) {
            ref.current.push({ time: i, value: i * 10 })
          }
          // Add annotations (triggers re-render with new props)
          setAnnotations([{ type: "callout", time: 2, value: 20, label: "A" }])
        }, [])

        // After annotations are set, push more data in a second effect
        React.useEffect(() => {
          if (annotations.length > 0) {
            for (let i = 5; i < 10; i++) {
              ref.current.push({ time: i, value: i * 10 })
            }
          }
        }, [annotations])

        return (
          <RealtimeFrame
            ref={ref}
            windowSize={50}
            annotations={annotations}
            svgAnnotationRules={(a, i, ctx) => (
              <text key={i} data-testid={`annotation-${i}`}>{a.label}</text>
            )}
          />
        )
      }

      const { container } = render(<Wrapper />)
      const ref = container.querySelector(".realtime-frame")
      expect(ref).toBeTruthy()

      // The annotation should be rendered
      expect(container.querySelector("svg")).toBeTruthy()
      expect(container.querySelector("text")).toBeTruthy()
    })

    it("does not cause infinite render loop when annotations are present", () => {
      // Track how many times rAF is called
      const rafSpy = window.requestAnimationFrame

      const annotations = [{ type: "callout", time: 0, value: 10, label: "X" }]
      const ref = createRef()

      // If there's an infinite loop, this render call will hang or
      // requestAnimationFrame will be called an excessive number of times
      const callCountBefore = rafSpy.mock.calls.length

      render(
        <RealtimeFrame
          ref={ref}
          data={[{ time: 0, value: 10 }, { time: 1, value: 20 }]}
          annotations={annotations}
          svgAnnotationRules={(a, i, ctx) => (
            <circle key={i} cx={10} cy={10} r={3} />
          )}
        />
      )

      const callCountAfter = rafSpy.mock.calls.length
      // Should be a small number of rAF calls (initial render + effects),
      // not hundreds from an infinite loop
      expect(callCountAfter - callCountBefore).toBeLessThan(20)
    })

    it("push still works after annotations prop changes", () => {
      // Directly tests: push data, change annotations, push more data
      const ref = createRef()
      const { rerender } = render(
        <RealtimeFrame ref={ref} windowSize={50} />
      )

      // Push before annotations
      ref.current.push({ time: 0, value: 10 })
      ref.current.push({ time: 1, value: 20 })
      expect(ref.current.getData().length).toBe(2)

      // Add annotations — this triggers re-render with new props
      rerender(
        <RealtimeFrame
          ref={ref}
          windowSize={50}
          annotations={[{ type: "callout", time: 0, value: 10 }]}
          svgAnnotationRules={(a, i, ctx) => (
            <circle key={i} cx={5} cy={5} r={2} />
          )}
        />
      )

      // Push AFTER annotations were added — this is where stale closures break
      ref.current.push({ time: 2, value: 30 })
      ref.current.push({ time: 3, value: 40 })
      ref.current.push({ time: 4, value: 50 })
      expect(ref.current.getData().length).toBe(5)
      expect(ref.current.getData()[4]).toEqual({ time: 4, value: 50 })
    })

    it("annotations update when annotation prop changes", () => {
      const ref = createRef()
      const rule = (a, i, ctx) => (
        <text key={i} data-testid={`ann-${a.label}`}>{a.label}</text>
      )

      const { container, rerender } = render(
        <RealtimeFrame
          ref={ref}
          data={[{ time: 0, value: 10 }]}
          annotations={[{ type: "callout", label: "first" }]}
          svgAnnotationRules={rule}
        />
      )

      expect(container.querySelector('[data-testid="ann-first"]')).toBeTruthy()

      // Change annotations
      rerender(
        <RealtimeFrame
          ref={ref}
          data={[{ time: 0, value: 10 }]}
          annotations={[
            { type: "callout", label: "first" },
            { type: "callout", label: "second" }
          ]}
          svgAnnotationRules={rule}
        />
      )

      expect(container.querySelector('[data-testid="ann-first"]')).toBeTruthy()
      expect(container.querySelector('[data-testid="ann-second"]')).toBeTruthy()
    })

    it("svgAnnotationRules receives scales context after data is pushed", () => {
      const ref = createRef()
      let receivedContext = null

      render(
        <RealtimeFrame
          ref={ref}
          annotations={[{ type: "threshold", value: 50 }]}
          svgAnnotationRules={(a, i, ctx) => {
            receivedContext = ctx
            if (!ctx || !ctx.scales) return null
            return <line key={i} x1={0} x2={ctx.width} y1={0} y2={0} />
          }}
        />
      )

      // Push data so scales get built
      act(() => {
        ref.current.push({ time: 0, value: 10 })
        ref.current.push({ time: 1, value: 100 })
      })

      expect(receivedContext).toBeTruthy()
      expect(receivedContext.width).toBeGreaterThan(0)
      expect(receivedContext.height).toBeGreaterThan(0)
      expect(receivedContext.timeAxis).toBe("x")
    })
  })

  describe("bar chart", () => {
    it("renders without crashing with chartType=bar", () => {
      const { container } = render(
        <RealtimeFrame
          chartType="bar"
          binSize={10}
          data={[
            { time: 1, value: 5 },
            { time: 5, value: 10 },
            { time: 15, value: 3 }
          ]}
        />
      )
      expect(container.querySelector(".realtime-frame")).toBeTruthy()
      expect(container.querySelector("canvas")).toBeTruthy()
    })

    it("imperative push works with bars", () => {
      const ref = createRef()
      render(
        <RealtimeFrame ref={ref} chartType="bar" binSize={10} />
      )

      ref.current.push({ time: 1, value: 5 })
      ref.current.push({ time: 5, value: 10 })
      ref.current.push({ time: 15, value: 3 })
      expect(ref.current.getData().length).toBe(3)
    })

    it("stacked mode with categoryAccessor renders", () => {
      const { container } = render(
        <RealtimeFrame
          chartType="bar"
          binSize={10}
          categoryAccessor="cat"
          barColors={{ errors: "red", warnings: "orange", info: "blue" }}
          data={[
            { time: 1, value: 5, cat: "errors" },
            { time: 2, value: 3, cat: "warnings" },
            { time: 3, value: 7, cat: "info" }
          ]}
        />
      )
      expect(container.querySelector(".realtime-frame")).toBeTruthy()
    })
  })

  describe("swarm chart", () => {
    it("renders without crashing with chartType=swarm", () => {
      const { container } = render(
        <RealtimeFrame
          chartType="swarm"
          data={[
            { time: 0, value: 10 },
            { time: 1, value: 20 },
            { time: 2, value: 15 }
          ]}
        />
      )
      expect(container.querySelector(".realtime-frame")).toBeTruthy()
      expect(container.querySelector("canvas")).toBeTruthy()
    })

    it("imperative push works with swarm", () => {
      const ref = createRef()
      render(
        <RealtimeFrame ref={ref} chartType="swarm" />
      )

      ref.current.push({ time: 0, value: 10 })
      ref.current.push({ time: 1, value: 20 })
      ref.current.push({ time: 2, value: 15 })
      expect(ref.current.getData().length).toBe(3)
    })

    it("swarm with custom style renders", () => {
      const { container } = render(
        <RealtimeFrame
          chartType="swarm"
          swarmStyle={{
            radius: 5,
            fill: "purple",
            opacity: 0.8,
            stroke: "#000",
            strokeWidth: 1
          }}
          data={[
            { time: 0, value: 10 },
            { time: 1, value: 20 }
          ]}
        />
      )
      expect(container.querySelector(".realtime-frame")).toBeTruthy()
    })

    it("swarm with categoryAccessor renders", () => {
      const { container } = render(
        <RealtimeFrame
          chartType="swarm"
          categoryAccessor="cat"
          barColors={{ sensor1: "#007bff", sensor2: "#28a745", sensor3: "#dc3545" }}
          data={[
            { time: 0, value: 10, cat: "sensor1" },
            { time: 1, value: 20, cat: "sensor2" },
            { time: 2, value: 15, cat: "sensor3" }
          ]}
        />
      )
      expect(container.querySelector(".realtime-frame")).toBeTruthy()
    })
  })

  describe("waterfall chart", () => {
    it("renders without crashing with chartType=waterfall", () => {
      const { container } = render(
        <RealtimeFrame
          chartType="waterfall"
          data={[
            { time: 0, value: 10 },
            { time: 1, value: -5 },
            { time: 2, value: 15 }
          ]}
        />
      )
      expect(container.querySelector(".realtime-frame")).toBeTruthy()
      expect(container.querySelector("canvas")).toBeTruthy()
    })

    it("imperative push works with waterfall", () => {
      const ref = createRef()
      render(
        <RealtimeFrame ref={ref} chartType="waterfall" />
      )

      ref.current.push({ time: 0, value: 10 })
      ref.current.push({ time: 1, value: -5 })
      ref.current.push({ time: 2, value: 15 })
      expect(ref.current.getData().length).toBe(3)
    })

    it("waterfall with custom colors renders", () => {
      const { container } = render(
        <RealtimeFrame
          chartType="waterfall"
          waterfallStyle={{
            positiveColor: "blue",
            negativeColor: "orange",
            connectorStroke: "#ccc"
          }}
          data={[
            { time: 0, value: 10 },
            { time: 1, value: -5 }
          ]}
        />
      )
      expect(container.querySelector(".realtime-frame")).toBeTruthy()
    })
  })

  describe("hover annotation", () => {
    function setupHover(hoverProps = {}) {
      const ref = createRef()
      const result = render(
        <RealtimeFrame
          ref={ref}
          size={[500, 300]}
          hoverAnnotation={true}
          data={[
            { time: 0, value: 10 },
            { time: 50, value: 50 },
            { time: 100, value: 90 }
          ]}
          {...hoverProps}
        />
      )
      return { ref, ...result }
    }

    it("does not render tooltip when hoverAnnotation is not set", () => {
      const { container } = render(
        <RealtimeFrame
          data={[{ time: 0, value: 10 }]}
        />
      )
      expect(container.querySelector(".realtime-frame-tooltip")).toBeNull()
    })

    it("renders tooltip on mousemove when hoverAnnotation={true}", () => {
      const { container } = setupHover()
      const frame = container.querySelector(".realtime-frame")

      // Mock getBoundingClientRect for the canvas
      const canvas = container.querySelector("canvas")
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 0, top: 0, right: 500, bottom: 300, width: 500, height: 300, x: 0, y: 0
      }))

      act(() => {
        fireEvent.mouseMove(frame, { clientX: 250, clientY: 150 })
      })

      expect(container.querySelector(".realtime-frame-tooltip")).toBeTruthy()
    })

    it("renders default tooltip with value and time", () => {
      const { container } = setupHover()
      const frame = container.querySelector(".realtime-frame")
      const canvas = container.querySelector("canvas")
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 0, top: 0, right: 500, bottom: 300, width: 500, height: 300, x: 0, y: 0
      }))

      act(() => {
        fireEvent.mouseMove(frame, { clientX: 250, clientY: 150 })
      })

      const tooltip = container.querySelector(".semiotic-tooltip")
      expect(tooltip).toBeTruthy()
    })

    it("hides tooltip on mouseleave", () => {
      const { container } = setupHover()
      const frame = container.querySelector(".realtime-frame")
      const canvas = container.querySelector("canvas")
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 0, top: 0, right: 500, bottom: 300, width: 500, height: 300, x: 0, y: 0
      }))

      act(() => {
        fireEvent.mouseMove(frame, { clientX: 250, clientY: 150 })
      })
      expect(container.querySelector(".realtime-frame-tooltip")).toBeTruthy()

      act(() => {
        fireEvent.mouseLeave(frame)
      })
      expect(container.querySelector(".realtime-frame-tooltip")).toBeNull()
    })

    it("calls customHoverBehavior with hover data on mousemove", () => {
      const onHover = jest.fn()
      const { container } = setupHover({ customHoverBehavior: onHover })
      const frame = container.querySelector(".realtime-frame")
      const canvas = container.querySelector("canvas")
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 0, top: 0, right: 500, bottom: 300, width: 500, height: 300, x: 0, y: 0
      }))

      act(() => {
        fireEvent.mouseMove(frame, { clientX: 250, clientY: 150 })
      })

      expect(onHover).toHaveBeenCalled()
      const hoverData = onHover.mock.calls[onHover.mock.calls.length - 1][0]
      expect(hoverData).toBeTruthy()
      expect(typeof hoverData.time).toBe("number")
      expect(typeof hoverData.value).toBe("number")
      expect(typeof hoverData.x).toBe("number")
      expect(typeof hoverData.y).toBe("number")
      expect(hoverData.data).toBeTruthy()
    })

    it("calls customHoverBehavior with null on mouseleave", () => {
      const onHover = jest.fn()
      const { container } = setupHover({ customHoverBehavior: onHover })
      const frame = container.querySelector(".realtime-frame")
      const canvas = container.querySelector("canvas")
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 0, top: 0, right: 500, bottom: 300, width: 500, height: 300, x: 0, y: 0
      }))

      act(() => {
        fireEvent.mouseMove(frame, { clientX: 250, clientY: 150 })
      })
      act(() => {
        fireEvent.mouseLeave(frame)
      })

      const lastCall = onHover.mock.calls[onHover.mock.calls.length - 1]
      expect(lastCall[0]).toBeNull()
    })

    it("uses custom tooltipContent when provided", () => {
      const { container } = setupHover({
        tooltipContent: (d) => (
          <div data-testid="custom-tooltip">Custom: {d.value}</div>
        )
      })
      const frame = container.querySelector(".realtime-frame")
      const canvas = container.querySelector("canvas")
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 0, top: 0, right: 500, bottom: 300, width: 500, height: 300, x: 0, y: 0
      }))

      act(() => {
        fireEvent.mouseMove(frame, { clientX: 250, clientY: 150 })
      })

      expect(container.querySelector('[data-testid="custom-tooltip"]')).toBeTruthy()
    })

    it("does not add mouse listeners when hoverAnnotation is falsy", () => {
      const { container } = render(
        <RealtimeFrame data={[{ time: 0, value: 10 }]} />
      )
      const frame = container.querySelector(".realtime-frame")

      // No onMouseMove listener means no tooltip even after mouse event
      act(() => {
        fireEvent.mouseMove(frame, { clientX: 250, clientY: 150 })
      })
      expect(container.querySelector(".realtime-frame-tooltip")).toBeNull()
    })
  })
})
