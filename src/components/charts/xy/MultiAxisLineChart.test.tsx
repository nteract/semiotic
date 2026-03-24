import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render } from "@testing-library/react"
import { MultiAxisLineChart } from "./MultiAxisLineChart"

// Suppress ResizeObserver warning in test environment
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

const sampleData = [
  { time: 0, temperature: 60, humidity: 0.3 },
  { time: 1, temperature: 72, humidity: 0.45 },
  { time: 2, temperature: 85, humidity: 0.6 },
  { time: 3, temperature: 90, humidity: 0.8 },
  { time: 4, temperature: 78, humidity: 0.5 },
]

describe("MultiAxisLineChart", () => {
  it("renders without crashing with 2 series (dual-axis mode)", () => {
    const { container } = render(
      <MultiAxisLineChart
        data={sampleData}
        xAccessor="time"
        series={[
          { yAccessor: "temperature", label: "Temperature" },
          { yAccessor: "humidity", label: "Humidity" },
        ]}
        width={600}
        height={400}
      />
    )
    // Should render the canvas container
    expect(container.querySelector("canvas")).toBeTruthy()
  })

  it("renders with 1 series (fallback mode) and logs a warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { container } = render(
      <MultiAxisLineChart
        data={sampleData}
        xAccessor="time"
        series={[
          { yAccessor: "temperature", label: "Temperature" },
        ]}
        width={600}
        height={400}
      />
    )
    expect(container.querySelector("canvas")).toBeTruthy()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Expected exactly 2 series")
    )
    warnSpy.mockRestore()
  })

  it("renders with 3 series (fallback mode) and logs a warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    render(
      <MultiAxisLineChart
        data={[
          { time: 0, a: 1, b: 2, c: 3 },
          { time: 1, a: 4, b: 5, c: 6 },
        ]}
        xAccessor="time"
        series={[
          { yAccessor: "a", label: "A" },
          { yAccessor: "b", label: "B" },
          { yAccessor: "c", label: "C" },
        ]}
        width={600}
        height={400}
      />
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Expected exactly 2 series")
    )
    warnSpy.mockRestore()
  })

  it("shows loading state (no canvas rendered)", () => {
    const { container } = render(
      <MultiAxisLineChart
        data={sampleData}
        xAccessor="time"
        series={[
          { yAccessor: "temperature", label: "Temperature" },
          { yAccessor: "humidity", label: "Humidity" },
        ]}
        loading={true}
        width={600}
        height={400}
      />
    )
    // Loading renders a skeleton placeholder, not the actual chart
    expect(container.querySelector("canvas")).toBeFalsy()
  })

  it("shows empty state when data is empty", () => {
    const { container } = render(
      <MultiAxisLineChart
        data={[]}
        xAccessor="time"
        series={[
          { yAccessor: "temperature", label: "Temperature" },
          { yAccessor: "humidity", label: "Humidity" },
        ]}
        width={600}
        height={400}
      />
    )
    expect(container.textContent).toContain("No data")
  })

  it("accepts custom colors per series", () => {
    const { container } = render(
      <MultiAxisLineChart
        data={sampleData}
        xAccessor="time"
        series={[
          { yAccessor: "temperature", label: "Temp", color: "#ff0000" },
          { yAccessor: "humidity", label: "Humidity", color: "#0000ff" },
        ]}
        width={600}
        height={400}
      />
    )
    expect(container.querySelector("canvas")).toBeTruthy()
  })

  it("accepts custom extent per series", () => {
    const { container } = render(
      <MultiAxisLineChart
        data={sampleData}
        xAccessor="time"
        series={[
          { yAccessor: "temperature", label: "Temp", extent: [0, 100] },
          { yAccessor: "humidity", label: "Humidity", extent: [0, 1] },
        ]}
        width={600}
        height={400}
      />
    )
    expect(container.querySelector("canvas")).toBeTruthy()
  })

  it("renders with responsive width", () => {
    const { container } = render(
      <MultiAxisLineChart
        data={sampleData}
        xAccessor="time"
        series={[
          { yAccessor: "temperature", label: "Temperature" },
          { yAccessor: "humidity", label: "Humidity" },
        ]}
        responsiveWidth={true}
        height={400}
      />
    )
    expect(container.querySelector("canvas")).toBeTruthy()
  })

  it("supports push API ref handle", () => {
    const ref = { current: null as any }
    render(
      <MultiAxisLineChart
        ref={ref}
        xAccessor="time"
        series={[
          { yAccessor: "temperature", label: "Temperature", extent: [0, 100] },
          { yAccessor: "humidity", label: "Humidity", extent: [0, 1] },
        ]}
        width={600}
        height={400}
      />
    )
    // Ref should expose push API
    expect(ref.current).toBeTruthy()
    expect(typeof ref.current.push).toBe("function")
    expect(typeof ref.current.pushMany).toBe("function")
    expect(typeof ref.current.clear).toBe("function")
    expect(typeof ref.current.getData).toBe("function")
  })
})
