import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import * as React from "react"
import {
  SafeRender,
  warnDataShape,
  warnMissingField,
  renderEmptyState,
  renderLoadingState,
} from "./withChartWrapper"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A child component that always throws during render */
function ThrowingChild({ message }: { message: string }): React.ReactElement {
  throw new Error(message)
}

// Suppress React error-boundary console noise in tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// SafeRender
// ---------------------------------------------------------------------------

describe("SafeRender", () => {
  it("renders children when no error is thrown", () => {
    render(
      <SafeRender componentName="TestChart" width={600} height={400}>
        <div data-testid="child">ok</div>
      </SafeRender>
    )
    expect(screen.getByTestId("child")).toBeTruthy()
  })

  it("shows error with diagnostic hints when props trigger diagnoseConfig warnings", () => {
    // Pass props that will cause diagnoseConfig to find issues (empty data array)
    const badProps = { data: [], width: 600, height: 400 }

    const { container } = render(
      <SafeRender componentName="BarChart" width={600} height={400} chartProps={badProps}>
        <ThrowingChild message="render failed" />
      </SafeRender>
    )

    // Should show the error via ChartError (role="alert")
    const alert = screen.getByRole("alert")
    expect(alert).toBeTruthy()
    expect(alert.textContent).toContain("render failed")
    // diagnoseConfig should produce a diagnostic hint (rendered in monospace panel)
    const hintPanel = container.querySelector("[data-testid='semiotic-diagnostic-hint']")
    expect(hintPanel).toBeTruthy()
  })

  it("shows error without diagnostic hint when no props are passed", () => {
    const { container } = render(
      <SafeRender componentName="LineChart" width={600} height={400}>
        <ThrowingChild message="something broke" />
      </SafeRender>
    )

    const alert = screen.getByRole("alert")
    expect(alert).toBeTruthy()
    expect(alert.textContent).toContain("something broke")
    // No diagnosticHint div should appear (it's conditionally rendered)
    // ChartError only renders the hint <div> when diagnosticHint is truthy
    // With no props, diagnosticHint remains ""
    const monoDivs = container.querySelectorAll("div[style*='monospace']")
    // The only monospace div should be the componentName, not a diagnosticHint
    const hintDivs = Array.from(monoDivs).filter(
      (el) => el.textContent !== "LineChart"
    )
    expect(hintDivs).toHaveLength(0)
  })

  it("shows error without diagnostic hint when props are valid (diagnoseConfig ok)", () => {
    // Props that pass diagnoseConfig successfully — valid data with correct fields
    const goodProps = {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      width: 600,
      height: 400,
    }

    const { container } = render(
      <SafeRender componentName="LineChart" width={600} height={400} chartProps={goodProps}>
        <ThrowingChild message="unexpected error" />
      </SafeRender>
    )

    const alert = screen.getByRole("alert")
    expect(alert.textContent).toContain("unexpected error")
    // diagnoseConfig should return ok: true, so no diagnostic hint
    const monoDivs = container.querySelectorAll("div[style*='monospace']")
    const hintDivs = Array.from(monoDivs).filter(
      (el) => el.textContent !== "LineChart"
    )
    expect(hintDivs).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// warnDataShape
// ---------------------------------------------------------------------------

describe("warnDataShape", () => {
  it("warns when data keys do not match expected keys (dev mode)", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})

    warnDataShape(
      "BarChart",
      [{ foo: 1, bar: 2 }],
      ["category", "value"],
      "Did you forget categoryAccessor?"
    )

    // IS_DEV is true in test env (NODE_ENV !== "production")
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toContain("BarChart")
    expect(spy.mock.calls[0][0]).toContain("foo, bar")
    expect(spy.mock.calls[0][0]).toContain("category, value")
    expect(spy.mock.calls[0][0]).toContain("Did you forget categoryAccessor?")
  })

  it("does not warn when at least one expected key is present", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})

    warnDataShape(
      "BarChart",
      [{ category: "A", extra: 1 }],
      ["category", "value"],
      "hint"
    )

    expect(spy).not.toHaveBeenCalled()
  })

  it("does not warn for empty data", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    warnDataShape("BarChart", [], ["category"], "hint")
    expect(spy).not.toHaveBeenCalled()
  })

  it("does not warn for undefined data", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    warnDataShape("BarChart", undefined, ["category"], "hint")
    expect(spy).not.toHaveBeenCalled()
  })

  it("does not warn when first element is not an object", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    warnDataShape("BarChart", [42 as any], ["category"], "hint")
    expect(spy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// warnMissingField
// ---------------------------------------------------------------------------

describe("warnMissingField", () => {
  it("warns when string accessor is not found in data", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})

    warnMissingField("LineChart", [{ x: 1, y: 2 }], "xAccessor", "time")

    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toContain("LineChart")
    expect(spy.mock.calls[0][0]).toContain('"time"')
    expect(spy.mock.calls[0][0]).toContain("x, y")
  })

  it("does not warn when accessor is found in data", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    warnMissingField("LineChart", [{ x: 1, y: 2 }], "xAccessor", "x")
    expect(spy).not.toHaveBeenCalled()
  })

  it("does not warn when accessor is a function (not string)", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    warnMissingField("LineChart", [{ x: 1 }], "xAccessor", (d: any) => d.x)
    expect(spy).not.toHaveBeenCalled()
  })

  it("does not warn for empty data", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    warnMissingField("LineChart", [], "xAccessor", "time")
    expect(spy).not.toHaveBeenCalled()
  })

  it("does not warn for undefined data", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    warnMissingField("LineChart", undefined, "xAccessor", "time")
    expect(spy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// renderEmptyState
// ---------------------------------------------------------------------------

describe("renderEmptyState", () => {
  it("returns null when emptyContent is false", () => {
    const result = renderEmptyState([], 600, 400, false)
    expect(result).toBeNull()
  })

  it("returns null for non-empty data", () => {
    const result = renderEmptyState([{ x: 1 }], 600, 400)
    expect(result).toBeNull()
  })

  it("returns null for null data (push API)", () => {
    const result = renderEmptyState(null, 600, 400)
    expect(result).toBeNull()
  })

  it("returns null for undefined data (push API)", () => {
    const result = renderEmptyState(undefined, 600, 400)
    expect(result).toBeNull()
  })

  it("renders default message for empty array", () => {
    const result = renderEmptyState([], 600, 400)
    expect(result).not.toBeNull()
    const { container } = render(result!)
    expect(container.textContent).toContain("No data available")
  })

  it("renders custom emptyContent for empty array", () => {
    const result = renderEmptyState([], 600, 400, "Custom empty message")
    expect(result).not.toBeNull()
    const { container } = render(result!)
    expect(container.textContent).toContain("Custom empty message")
  })
})

// ---------------------------------------------------------------------------
// renderLoadingState
// ---------------------------------------------------------------------------

describe("renderLoadingState", () => {
  it("returns null when loading is false", () => {
    expect(renderLoadingState(false, 600, 400)).toBeNull()
  })

  it("returns null when loading is undefined", () => {
    expect(renderLoadingState(undefined, 600, 400)).toBeNull()
  })

  it("renders skeleton bars when loading is true", () => {
    const result = renderLoadingState(true, 600, 400)
    expect(result).not.toBeNull()
    const { container } = render(result!)
    const bars = container.querySelectorAll(".semiotic-loading-bar")
    expect(bars.length).toBeGreaterThan(0)
    expect(bars.length).toBeLessThanOrEqual(5)
  })

  it("adjusts bar count for small heights", () => {
    const result = renderLoadingState(true, 600, 80)
    expect(result).not.toBeNull()
    const { container } = render(result!)
    const bars = container.querySelectorAll(".semiotic-loading-bar")
    // height=80, barCount = floor(80/40) = 2
    expect(bars.length).toBe(2)
  })
})
