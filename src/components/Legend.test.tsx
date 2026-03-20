import { describe, it, expect, vi } from "vitest"
import { render, fireEvent } from "@testing-library/react"
import * as React from "react"
import Legend, { GradientLegend } from "./Legend"
import type { LegendGroup, LegendItem } from "./types/legendTypes"

// Helper: wrap SVG content in an <svg> so the DOM is valid
function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>)
}

function makeLegendGroup(overrides?: Partial<LegendGroup>): LegendGroup {
  return {
    label: "Group A",
    type: "fill",
    styleFn: (item: LegendItem) => ({ fill: (item as any).color || "#ccc" }),
    items: [
      { label: "Alpha", color: "#e41a1c" },
      { label: "Beta", color: "#377eb8" },
      { label: "Gamma", color: "#4daf4a" },
    ],
    ...overrides,
  }
}

// ── Categorical legend rendering ─────────────────────────────────────────

describe("Legend — categorical items", () => {
  it("renders correct labels for each legend item", () => {
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} />
    )
    const texts = container.querySelectorAll("text")
    const labels = Array.from(texts).map((t) => t.textContent)
    expect(labels).toContain("Alpha")
    expect(labels).toContain("Beta")
    expect(labels).toContain("Gamma")
  })

  it("renders fill rects with correct colors from styleFn", () => {
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} />
    )
    const rects = container.querySelectorAll("rect")
    // Each item gets a 16x16 swatch rect
    const swatches = Array.from(rects).filter(
      (r) => r.getAttribute("width") === "16" && r.getAttribute("height") === "16"
    )
    expect(swatches.length).toBe(3)
    expect(swatches[0].style.fill).toBe("#e41a1c")
    expect(swatches[1].style.fill).toBe("#377eb8")
  })

  it("renders the title when orientation is vertical", () => {
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} title="My Legend" orientation="vertical" />
    )
    const titleEl = container.querySelector(".legend-title")
    expect(titleEl).not.toBeNull()
    expect(titleEl!.textContent).toBe("My Legend")
  })

  it("does not render the title when orientation is horizontal", () => {
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} title="My Legend" orientation="horizontal" />
    )
    const titleEl = container.querySelector(".legend-title")
    expect(titleEl).toBeNull()
  })
})

// ── Accessibility: roles and aria ────────────────────────────────────────

describe("Legend — ARIA roles", () => {
  it("sets role=listbox on container when interactive (click)", () => {
    const onClick = vi.fn()
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} customClickBehavior={onClick} />
    )
    const listbox = container.querySelector("[role='listbox']")
    expect(listbox).not.toBeNull()
  })

  it("sets role=listbox on container when interactive (hover)", () => {
    const onHover = vi.fn()
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} customHoverBehavior={onHover} />
    )
    const listbox = container.querySelector("[role='listbox']")
    expect(listbox).not.toBeNull()
  })

  it("does not set role=listbox when non-interactive", () => {
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} />
    )
    const listbox = container.querySelector("[role='listbox']")
    expect(listbox).toBeNull()
  })

  it("sets role=option on each item when interactive", () => {
    const onClick = vi.fn()
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} customClickBehavior={onClick} />
    )
    const options = container.querySelectorAll("[role='option']")
    expect(options.length).toBe(3)
  })

  it("does not set role=option when non-interactive", () => {
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} />
    )
    const options = container.querySelectorAll("[role='option']")
    expect(options.length).toBe(0)
  })

  it("sets aria-multiselectable when legendInteraction is isolate", () => {
    const onClick = vi.fn()
    const { container } = renderInSvg(
      <Legend
        legendGroups={[makeLegendGroup()]}
        customClickBehavior={onClick}
        legendInteraction="isolate"
      />
    )
    const listbox = container.querySelector("[role='listbox']")
    expect(listbox?.getAttribute("aria-multiselectable")).toBe("true")
  })
})

// ── aria-selected reflects isolated categories ───────────────────────────

describe("Legend — aria-selected and isolation", () => {
  it("aria-selected=true for isolated items, false for others", () => {
    const onClick = vi.fn()
    const isolated = new Set(["Alpha"])
    const { container } = renderInSvg(
      <Legend
        legendGroups={[makeLegendGroup()]}
        customClickBehavior={onClick}
        isolatedCategories={isolated}
      />
    )
    const options = container.querySelectorAll("[role='option']")
    expect(options[0].getAttribute("aria-selected")).toBe("true")
    expect(options[1].getAttribute("aria-selected")).toBe("false")
    expect(options[2].getAttribute("aria-selected")).toBe("false")
  })

  it("renders checkmark path on isolated items", () => {
    const onClick = vi.fn()
    const isolated = new Set(["Beta"])
    const { container } = renderInSvg(
      <Legend
        legendGroups={[makeLegendGroup()]}
        customClickBehavior={onClick}
        isolatedCategories={isolated}
      />
    )
    // The CheckMark renders a <path> inside the isolated item
    const options = container.querySelectorAll("[role='option']")
    const betaPaths = options[1].querySelectorAll("path")
    expect(betaPaths.length).toBeGreaterThan(0)
    // Alpha should not have a checkmark path
    const alphaPaths = options[0].querySelectorAll("path")
    expect(alphaPaths.length).toBe(0)
  })
})

// ── Interactive: click callback ──────────────────────────────────────────

describe("Legend — click interaction", () => {
  it("calls customClickBehavior with the item on click", () => {
    const onClick = vi.fn()
    const group = makeLegendGroup()
    const { container } = renderInSvg(
      <Legend legendGroups={[group]} customClickBehavior={onClick} />
    )
    const options = container.querySelectorAll("[role='option']")
    fireEvent.click(options[1])
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith(group.items[1])
  })

  it("calls customClickBehavior on Enter key", () => {
    const onClick = vi.fn()
    const group = makeLegendGroup()
    const { container } = renderInSvg(
      <Legend legendGroups={[group]} customClickBehavior={onClick} />
    )
    const options = container.querySelectorAll("[role='option']")
    fireEvent.keyDown(options[0], { key: "Enter" })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith(group.items[0])
  })

  it("calls customClickBehavior on Space key", () => {
    const onClick = vi.fn()
    const group = makeLegendGroup()
    const { container } = renderInSvg(
      <Legend legendGroups={[group]} customClickBehavior={onClick} />
    )
    const options = container.querySelectorAll("[role='option']")
    fireEvent.keyDown(options[2], { key: " " })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith(group.items[2])
  })
})

// ── Keyboard navigation ─────────────────────────────────────────────────

describe("Legend — keyboard navigation (vertical)", () => {
  it("ArrowDown moves focus to next sibling", () => {
    const onClick = vi.fn()
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} customClickBehavior={onClick} />
    )
    const options = container.querySelectorAll("[role='option']")
    const focusSpy = vi.spyOn(options[1] as any, "focus")
    fireEvent.keyDown(options[0], { key: "ArrowDown" })
    expect(focusSpy).toHaveBeenCalled()
  })

  it("ArrowUp moves focus to previous sibling", () => {
    const onClick = vi.fn()
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} customClickBehavior={onClick} />
    )
    const options = container.querySelectorAll("[role='option']")
    const focusSpy = vi.spyOn(options[0] as any, "focus")
    fireEvent.keyDown(options[1], { key: "ArrowUp" })
    expect(focusSpy).toHaveBeenCalled()
  })
})

// ── Orientation ─────────────────────────────────────────────────────────

describe("Legend — orientation", () => {
  it("vertical layout uses translate(0, Y) for item positioning", () => {
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} orientation="vertical" />
    )
    const legendItemGroup = container.querySelector(".legend-item")
    expect(legendItemGroup).not.toBeNull()
    // Items inside are positioned with translate(0, offset)
    const items = legendItemGroup!.querySelectorAll("g")
    if (items.length > 1) {
      const transform = items[1].getAttribute("transform")
      expect(transform).toMatch(/translate\(0,\d+\)/)
    }
  })

  it("horizontal layout uses translate(X, 0) for item positioning", () => {
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} orientation="horizontal" width={500} height={30} />
    )
    const legendItemGroup = container.querySelector(".legend-item")
    expect(legendItemGroup).not.toBeNull()
    const items = legendItemGroup!.querySelectorAll("g")
    if (items.length > 1) {
      const transform = items[1].getAttribute("transform")
      expect(transform).toMatch(/translate\(\d+.*,0\)/)
    }
  })
})

// ── Non-interactive mode ─────────────────────────────────────────────────

describe("Legend — non-interactive mode", () => {
  it("items have no tabIndex when non-interactive", () => {
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} />
    )
    const legendItemGroup = container.querySelector(".legend-item")
    const items = legendItemGroup!.querySelectorAll("g")
    items.forEach((item) => {
      expect(item.getAttribute("tabindex")).toBeNull()
    })
  })

  it("items have a tabindex attribute when interactive", () => {
    const onClick = vi.fn()
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} customClickBehavior={onClick} />
    )
    const options = container.querySelectorAll("[role='option']")
    options.forEach((opt) => {
      // SVG elements in jsdom may serialize tabIndex differently; just verify it's set
      expect(opt.hasAttribute("tabindex")).toBe(true)
    })
  })

  it("does not render focus ring rects when non-interactive", () => {
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} />
    )
    const focusRings = container.querySelectorAll(".semiotic-legend-focus-ring")
    expect(focusRings.length).toBe(0)
  })

  it("renders focus ring rects when interactive", () => {
    const onClick = vi.fn()
    const { container } = renderInSvg(
      <Legend legendGroups={[makeLegendGroup()]} customClickBehavior={onClick} />
    )
    const focusRings = container.querySelectorAll(".semiotic-legend-focus-ring")
    expect(focusRings.length).toBe(3)
  })
})

// ── GradientLegend ──────────────────────────────────────────────────────

describe("GradientLegend", () => {
  const config = {
    colorFn: (v: number) => `rgb(${Math.round(v)},0,0)`,
    domain: [0, 255] as [number, number],
    label: "Intensity",
  }

  it("renders a linearGradient with color stops (vertical)", () => {
    const { container } = renderInSvg(
      <GradientLegend config={config} orientation="vertical" />
    )
    const gradient = container.querySelector("linearGradient")
    expect(gradient).not.toBeNull()
    const stops = gradient!.querySelectorAll("stop")
    // 65 stops (0..64 inclusive)
    expect(stops.length).toBe(65)
  })

  it("renders domain min and max labels (vertical)", () => {
    const { container } = renderInSvg(
      <GradientLegend config={config} orientation="vertical" />
    )
    const texts = container.querySelectorAll("text")
    const textContents = Array.from(texts).map((t) => t.textContent)
    expect(textContents).toContain("0")
    expect(textContents).toContain("255")
  })

  it("renders the label text", () => {
    const { container } = renderInSvg(
      <GradientLegend config={config} orientation="vertical" />
    )
    const texts = container.querySelectorAll("text")
    const textContents = Array.from(texts).map((t) => t.textContent)
    expect(textContents).toContain("Intensity")
  })

  it("renders horizontal gradient with x1=0% x2=100%", () => {
    const { container } = renderInSvg(
      <GradientLegend config={config} orientation="horizontal" width={200} />
    )
    const gradient = container.querySelector("linearGradient")
    expect(gradient).not.toBeNull()
    expect(gradient!.getAttribute("x2")).toBe("100%")
    expect(gradient!.getAttribute("y2")).toBe("0%")
  })

  it("uses custom format function for labels", () => {
    const formatted = {
      ...config,
      format: (v: number) => `${v} units`,
    }
    const { container } = renderInSvg(
      <GradientLegend config={formatted} orientation="vertical" />
    )
    const texts = container.querySelectorAll("text")
    const textContents = Array.from(texts).map((t) => t.textContent)
    expect(textContents).toContain("0 units")
    expect(textContents).toContain("255 units")
  })
})
