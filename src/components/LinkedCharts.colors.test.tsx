import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CategoryColorProvider } from "./CategoryColors"
import {
  LinkedCharts,
  useLinkedChartCategories,
  useLinkedLegendSuppression
} from "./LinkedCharts"
import { LIGHT_THEME, ThemeProvider } from "./ThemeProvider"
import { useColorScale } from "./charts/shared/hooks"
import { COLOR_SCHEMES } from "./charts/shared/colorUtils"

const data = [{ series: "consumption" }, { series: "production" }]
const palette = ["#FF0000", "#0000FF"]
const colorMap = { production: palette[1], consumption: palette[0] }
type ColorScheme = string | string[] | Record<string, string>

function Chart({
  scheme,
  id = "chart",
  categories = data.map((d) => d.series),
  functionAccessor = false
}: {
  scheme?: ColorScheme
  id?: string
  categories?: string[]
  functionAccessor?: boolean
}) {
  const colorScale = useColorScale(
    categories.map((series) => ({ series })),
    functionAccessor ? (d) => String(d.series) : "series",
    scheme
  )
  useLinkedChartCategories(categories, colorScale)
  const suppressed = useLinkedLegendSuppression()
  return (
    <output data-testid={id} data-suppressed={String(suppressed)}>
      {JSON.stringify(categories.map((category) => colorScale?.(category)))}
    </output>
  )
}

function chartColors(id = "chart"): string[] {
  return JSON.parse(screen.getByTestId(id).textContent ?? "[]")
}

function expectSwatches(container: HTMLElement, expected: string[]) {
  const actual = Array.from(
    container.querySelectorAll<SVGRectElement>(".legend-item rect")
  ).map((rect) => rect.style.fill)
  expect(actual).toEqual(
    expected.map((color) => {
      const element = document.createElement("span")
      element.style.fill = color
      return element.style.fill
    })
  )
}

describe("LinkedCharts categorical color precedence", () => {
  it.each([
    ["array", palette, palette],
    ["object map", colorMap, palette],
    ["named scheme", "set3", (COLOR_SCHEMES.set3 as string[]).slice(0, 2)]
  ] as Array<[string, ColorScheme, string[]]>)(
    "preserves a child %s and uses its colors in the unified legend",
    (_name, scheme, expected) => {
      const { container, rerender } = render(<Chart scheme={scheme} />)
      expect(chartColors()).toEqual(expected)
      rerender(
        <LinkedCharts>
          <Chart scheme={scheme} />
        </LinkedCharts>
      )
      expect(chartColors()).toEqual(expected)
      expectSwatches(container, expected)
      expect(screen.getByTestId("chart")).toHaveAttribute(
        "data-suppressed",
        "true"
      )
    }
  )

  it.each([true, false])(
    "honors explicit palettes with showLegend=%s and a function accessor",
    (showLegend) => {
      render(
        <ThemeProvider
          theme={{
            ...LIGHT_THEME,
            colors: {
              ...LIGHT_THEME.colors,
              categorical: ["#123456", "#654321"]
            }
          }}
        >
          <LinkedCharts showLegend={showLegend}>
            <Chart scheme={palette} functionAccessor />
          </LinkedCharts>
        </ThemeProvider>
      )
      expect(chartColors()).toEqual(palette)
    }
  )

  it.each([palette, colorMap])(
    "keeps partial provider overrides above a child scheme",
    (scheme) => {
      const { container } = render(
        <CategoryColorProvider colors={{ consumption: "#00FF00" }}>
          <LinkedCharts>
            <Chart scheme={scheme} />
          </LinkedCharts>
        </CategoryColorProvider>
      )
      expect(chartColors()).toEqual(["#00FF00", palette[1]])
      expectSwatches(container, ["#00FF00", palette[1]])
    }
  )

  it("does not promote defaults to explicit colors in nested LinkedCharts", () => {
    render(
      <CategoryColorProvider colors={{ consumption: "#00FF00" }}>
        <LinkedCharts>
          <Chart id="outer" />
          <LinkedCharts>
            <Chart scheme={palette} />
          </LinkedCharts>
        </LinkedCharts>
      </CategoryColorProvider>
    )
    expect(chartColors()).toEqual(["#00FF00", palette[1]])
  })

  it("preserves independent palettes and restores individual legends on conflicts", () => {
    const { container, rerender } = render(
      <LinkedCharts>
        <Chart scheme={palette} />
        <Chart id="second" scheme={["#00FF00", "#FF00FF"]} />
      </LinkedCharts>
    )
    expect(chartColors()).toEqual(palette)
    expect(chartColors("second")).toEqual(["#00FF00", "#FF00FF"])
    expect(screen.getByTestId("chart")).toHaveAttribute(
      "data-suppressed",
      "false"
    )
    expect(screen.getByTestId("second")).toHaveAttribute(
      "data-suppressed",
      "false"
    )
    expectSwatches(container, [])
    rerender(
      <LinkedCharts>
        <Chart scheme={palette} />
      </LinkedCharts>
    )
    expectSwatches(container, palette)
    expect(screen.getByTestId("chart")).toHaveAttribute(
      "data-suppressed",
      "true"
    )
  })

  it("updates marks and legend when a palette changes or is removed", () => {
    const tree = (scheme?: ColorScheme) => (
      <LinkedCharts>
        <Chart scheme={scheme} />
      </LinkedCharts>
    )
    const { container, rerender } = render(tree(palette))
    rerender(tree({ consumption: "#112233", production: "#445566" }))
    expect(chartColors()).toEqual(["#112233", "#445566"])
    expectSwatches(container, chartColors())
    rerender(tree())
    expect(chartColors()).toEqual(LIGHT_THEME.colors.categorical.slice(0, 2))
    expectSwatches(container, chartColors())
  })

  it("still shares default colors across charts with reversed category order", () => {
    render(
      <LinkedCharts>
        <Chart />
        <Chart id="second" categories={["production", "consumption"]} />
      </LinkedCharts>
    )
    expect(chartColors()).toEqual(LIGHT_THEME.colors.categorical.slice(0, 2))
    expect(chartColors("second")).toEqual([...chartColors()].reverse())
    expect(screen.getByTestId("chart")).toHaveAttribute(
      "data-suppressed",
      "true"
    )
  })
})
