/**
 * Scenario tests: Layout composition and error resilience.
 *
 * Tests that ChartGrid emphasis spanning, SafeRender error boundaries,
 * empty/loading states, and composition of these features all work correctly
 * when combined — including edge cases like throwing children not crashing
 * sibling charts.
 */
import React from "react"
import { render } from "@testing-library/react"
import { ChartGrid } from "../../components/ChartGrid"
import {
  SafeRender,
  renderEmptyState,
  renderLoadingState,
} from "../../components/charts/shared/withChartWrapper"

// ── Helpers ─────────────────────────────────────────────────────────────

/** A component that always throws during render */
function ThrowingChart({ message = "Boom!" }: { message?: string }) {
  throw new Error(message)
}

/** A normal component */
function StableChart({ label }: { label: string }) {
  return <div data-testid={`chart-${label}`}>{label}</div>
}

// ── ChartGrid Tests ─────────────────────────────────────────────────────

describe("ChartGrid Composition", () => {
  // 1. Emphasis wraps child in span-2 div
  it("emphasis='primary' wraps child in a div with gridColumn: span 2", () => {
    const { container } = render(
      <ChartGrid columns={2}>
        <StableChart label="A" emphasis={"primary" as any} />
        <StableChart label="B" />
        <StableChart label="C" />
      </ChartGrid>
    )

    const grid = container.querySelector(".semiotic-chart-grid")!
    const children = Array.from(grid.children)

    // First child should be wrapped in a span-2 div
    const wrapper = children[0] as HTMLElement
    expect(wrapper.style.gridColumn).toBe("span 2")
    // The actual chart is inside the wrapper
    expect(wrapper.querySelector("[data-testid='chart-A']")).toBeTruthy()

    // Other children are not wrapped
    expect(children[1]).toHaveAttribute("data-testid", "chart-B")
    expect(children[2]).toHaveAttribute("data-testid", "chart-C")
  })

  // 2. Emphasis with columns=1 does NOT span
  it("emphasis='primary' does NOT span when columns=1", () => {
    const { container } = render(
      <ChartGrid columns={1}>
        <StableChart label="A" emphasis={"primary" as any} />
        <StableChart label="B" />
      </ChartGrid>
    )

    const grid = container.querySelector(".semiotic-chart-grid")!
    const children = Array.from(grid.children)

    // With columns=1, emphasis should NOT create a wrapper
    expect(children[0]).toHaveAttribute("data-testid", "chart-A")
  })

  // 3. emphasis='secondary' does not span
  it("emphasis='secondary' does not create a span-2 wrapper", () => {
    const { container } = render(
      <ChartGrid columns={3}>
        <StableChart label="A" emphasis={"secondary" as any} />
      </ChartGrid>
    )

    const grid = container.querySelector(".semiotic-chart-grid")!
    const child = grid.children[0] as HTMLElement
    expect(child).toHaveAttribute("data-testid", "chart-A")
    // No wrapper div with gridColumn
    expect(child.style.gridColumn).not.toBe("span 2")
  })

  // 4. ChartGrid with auto columns and emphasis
  it("auto columns with emphasis='primary' still wraps in span-2", () => {
    const { container } = render(
      <ChartGrid columns="auto">
        <StableChart label="A" emphasis={"primary" as any} />
        <StableChart label="B" />
      </ChartGrid>
    )

    const grid = container.querySelector(".semiotic-chart-grid")!
    const firstChild = grid.children[0] as HTMLElement
    expect(firstChild.style.gridColumn).toBe("span 2")
  })

  // 5. Grid uses correct CSS properties
  it("renders correct CSS grid properties", () => {
    const { container } = render(
      <ChartGrid columns={3} gap={24} minCellWidth={200}>
        <StableChart label="A" />
      </ChartGrid>
    )

    const grid = container.querySelector(".semiotic-chart-grid") as HTMLElement
    expect(grid.style.display).toBe("grid")
    expect(grid.style.gridTemplateColumns).toBe("repeat(3, 1fr)")
    expect(grid.style.gap).toBe("24px")
  })

  // 6. Custom className and style
  it("applies custom className and style", () => {
    const { container } = render(
      <ChartGrid className="my-grid" style={{ padding: "10px" }}>
        <StableChart label="A" />
      </ChartGrid>
    )

    const grid = container.querySelector(".semiotic-chart-grid.my-grid") as HTMLElement
    expect(grid).toBeTruthy()
    expect(grid.style.padding).toBe("10px")
  })
})

// ── Error Boundary Tests ────────────────────────────────────────────────

describe("SafeRender Error Boundary", () => {
  // Suppress console.error for expected boundary catches
  const originalError = console.error
  beforeEach(() => {
    console.error = () => {}
  })
  afterEach(() => {
    console.error = originalError
  })

  // 7. SafeRender catches thrown error from child
  it("catches a thrown error and renders fallback", () => {
    const { container } = render(
      <SafeRender componentName="TestChart" width={400} height={300}>
        <ThrowingChart />
      </SafeRender>
    )

    // Should show error, not crash
    expect(container.textContent).toContain("TestChart")
    expect(container.textContent).toContain("Boom!")
  })

  // 8. SafeRender shows component name in error message
  it("error fallback includes the component name", () => {
    const { container } = render(
      <SafeRender componentName="MyFancyChart" width={600} height={400}>
        <ThrowingChart message="data format error" />
      </SafeRender>
    )

    expect(container.textContent).toContain("MyFancyChart")
    expect(container.textContent).toContain("data format error")
  })

  // 9. Throwing chart inside ChartGrid doesn't crash siblings
  it("throwing chart in ChartGrid doesn't crash adjacent charts", () => {
    const { container } = render(
      <ChartGrid columns={2}>
        <SafeRender componentName="GoodChart" width={300} height={200}>
          <StableChart label="good" />
        </SafeRender>
        <SafeRender componentName="BadChart" width={300} height={200}>
          <ThrowingChart message="render failed" />
        </SafeRender>
      </ChartGrid>
    )

    // Good chart still renders
    expect(container.querySelector("[data-testid='chart-good']")).toBeTruthy()
    // Bad chart shows error
    expect(container.textContent).toContain("BadChart")
    expect(container.textContent).toContain("render failed")
  })
})

// ── Empty & Loading State Tests ─────────────────────────────────────────

describe("Empty and Loading States", () => {
  // 10. renderEmptyState returns null for non-empty data
  it("returns null when data has items", () => {
    const result = renderEmptyState([{ x: 1 }], 400, 300)
    expect(result).toBeNull()
  })

  // 11. renderEmptyState returns placeholder for empty array
  it("returns placeholder div for empty array", () => {
    const result = renderEmptyState([], 400, 300)
    expect(result).not.toBeNull()
    const { container } = render(result!)
    expect(container.textContent).toContain("No data available")
  })

  // 12. renderEmptyState returns null for undefined data (hierarchy case)
  it("returns placeholder for undefined data", () => {
    const result = renderEmptyState(undefined, 400, 300)
    expect(result).not.toBeNull()
  })

  // 13. renderEmptyState with custom content
  it("renders custom emptyContent when provided", () => {
    const result = renderEmptyState([], 400, 300, <span>Nothing here</span>)
    expect(result).not.toBeNull()
    const { container } = render(result!)
    expect(container.textContent).toContain("Nothing here")
  })

  // 14. renderEmptyState suppressed with false
  it("returns null when emptyContent is false", () => {
    const result = renderEmptyState([], 400, 300, false)
    expect(result).toBeNull()
  })

  // 15. renderLoadingState renders shimmer bars
  it("renders loading bars proportional to container height", () => {
    const tall = renderLoadingState(true, 400, 400)
    const short = renderLoadingState(true, 400, 100)

    expect(tall).not.toBeNull()
    expect(short).not.toBeNull()

    const { container: tallContainer } = render(tall!)
    const { container: shortContainer } = render(short!)

    const tallBars = tallContainer.querySelectorAll(".semiotic-loading-bar")
    const shortBars = shortContainer.querySelectorAll(".semiotic-loading-bar")

    // Taller container should have more bars (up to 5)
    expect(tallBars.length).toBeGreaterThanOrEqual(shortBars.length)
    expect(tallBars.length).toBeLessThanOrEqual(5)
  })

  // 16. renderLoadingState returns null when not loading
  it("returns null when loading is false", () => {
    expect(renderLoadingState(false, 400, 300)).toBeNull()
    expect(renderLoadingState(undefined, 400, 300)).toBeNull()
  })
})
