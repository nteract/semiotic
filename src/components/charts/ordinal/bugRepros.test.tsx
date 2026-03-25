/**
 * Bug repro tests for BR-1 through BR-5.
 * TDD: these should FAIL before fixes, PASS after.
 */
import { vi, describe, it, expect, beforeEach } from "vitest"
import React from "react"
import { render } from "@testing-library/react"
import { BarChart } from "./BarChart"
import { Histogram } from "./Histogram"
import { ThemeProvider } from "../../ThemeProvider"

// Mock StreamOrdinalFrame to capture props
let lastFrameProps: any = null
vi.mock("../../stream/StreamOrdinalFrame", () => {
  const React = require("react")
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      lastFrameProps = props
      return <div className="stream-ordinal-frame"><svg /></div>
    })
  }
})

beforeEach(() => { lastFrameProps = null })

const barData = [
  { category: "A", value: 10 },
  { category: "B", value: 20 },
  { category: "C", value: 15 },
]

// ── BR-1: ThemeProvider categorical colors should flow to data elements ──

describe("BR-1: ThemeProvider categorical colors", () => {
  it("bar fill uses theme categorical[0] when no colorBy or colorScheme", () => {
    render(
      <ThemeProvider theme={{
        colors: {
          categorical: ["#9E8FFF", "#FF6B6B", "#4ECDC4"],
          primary: "#9E8FFF",
          background: "#fff",
          text: "#333",
          textSecondary: "#666",
          grid: "#e0e0e0",
          border: "#ccc",
          sequential: "blues",
        },
        typography: { fontFamily: "sans-serif", titleSize: 16, labelSize: 12, tickSize: 10 },
        mode: "light",
      }}>
        <BarChart data={barData} categoryAccessor="category" valueAccessor="value" />
      </ThemeProvider>
    )

    expect(lastFrameProps).toBeTruthy()
    const style = lastFrameProps.pieceStyle(barData[0], "A")
    // Should use theme's categorical[0], NOT hardcoded #007bff
    expect(style.fill).not.toBe("#007bff")
    expect(style.fill).toBe("#9E8FFF")
  })
})

// ── BR-2: colorScheme should work without colorBy ───────────────────────

describe("BR-2: colorScheme without colorBy", () => {
  it("bar fill uses colorScheme[0] when colorScheme is set but colorBy is not", () => {
    render(
      <BarChart
        data={barData}
        categoryAccessor="category"
        valueAccessor="value"
        colorScheme={["#FF0000", "#00FF00", "#0000FF"]}
      />
    )

    expect(lastFrameProps).toBeTruthy()
    const styleA = lastFrameProps.pieceStyle(barData[0], "A")
    const styleB = lastFrameProps.pieceStyle(barData[1], "B")
    const styleC = lastFrameProps.pieceStyle(barData[2], "C")
    // Without colorBy, all bars should use uniform color (first in scheme)
    expect(styleA.fill).toBe("#FF0000")
    expect(styleB.fill).toBe("#FF0000")
    expect(styleC.fill).toBe("#FF0000")
  })

  it("single-color bar: color prop sets uniform fill", () => {
    render(
      <BarChart
        data={barData}
        categoryAccessor="category"
        valueAccessor="value"
        color="#9E8FFF"
      />
    )

    expect(lastFrameProps).toBeTruthy()
    const style = lastFrameProps.pieceStyle(barData[0], "A")
    expect(style.fill).toBe("#9E8FFF")
  })
})

// ── BR-3: Histogram bins should be shared across categories ─────────────

describe("BR-3: Histogram shared bins", () => {
  it("passes global bin extent to stream frame for consistent binning", () => {
    const histData = [
      // Category A: values 0-50
      { category: "A", value: 10 },
      { category: "A", value: 20 },
      { category: "A", value: 40 },
      // Category B: values 60-100
      { category: "B", value: 60 },
      { category: "B", value: 80 },
      { category: "B", value: 100 },
    ]

    render(
      <Histogram
        data={histData}
        categoryAccessor="category"
        valueAccessor="value"
        bins={10}
      />
    )

    expect(lastFrameProps).toBeTruthy()
    // The frame should receive a global rExtent covering the full data range
    // so all categories share the same bin boundaries [0, 100]
    expect(lastFrameProps.rExtent).toBeDefined()
    expect(lastFrameProps.rExtent[0]).toBeLessThanOrEqual(10)
    expect(lastFrameProps.rExtent[1]).toBeGreaterThanOrEqual(100)
  })
})

// ── BR-5: RidgelinePlot amplitude docs ──────────────────────────────────

describe("BR-5: RidgelinePlot amplitude documentation", () => {
  it("amplitude is documented in CLAUDE.md", async () => {
    const fs = await import("fs")
    const path = await import("path")
    // Resolve from project root (vitest cwd)
    const claude = fs.readFileSync(
      path.resolve(process.cwd(), "CLAUDE.md"),
      "utf-8"
    )
    // RidgelinePlot should be mentioned in CLAUDE.md with amplitude info
    expect(claude).toContain("RidgelinePlot")
    expect(claude).toContain("amplitude")
  })
})
