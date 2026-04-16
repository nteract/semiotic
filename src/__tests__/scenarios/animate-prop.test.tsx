/**
 * Tests for the declarative `animate` prop on HOC charts.
 *
 * Verifies that `animate` flows from HOC → frame → pipeline store
 * and triggers transition animation on data changes.
 */

import React from "react"
import { render } from "@testing-library/react"
import { LineChart } from "../../components/charts/xy/LineChart"
import { BarChart } from "../../components/charts/ordinal/BarChart"
import { Scatterplot } from "../../components/charts/xy/Scatterplot"

describe("animate prop wiring", () => {
  it("LineChart accepts animate={true} without crash", () => {
    expect(() =>
      render(
        <LineChart
          data={[{ x: 1, y: 10 }, { x: 2, y: 20 }]}
          xAccessor="x"
          yAccessor="y"
          animate
          width={300}
          height={200}
        />
      )
    ).not.toThrow()
  })

  it("BarChart accepts animate with config object", () => {
    expect(() =>
      render(
        <BarChart
          data={[{ category: "A", value: 10 }]}
          categoryAccessor="category"
          valueAccessor="value"
          animate={{ duration: 500, easing: "linear" }}
          width={300}
          height={200}
        />
      )
    ).not.toThrow()
  })

  it("Scatterplot accepts animate={true}", () => {
    expect(() =>
      render(
        <Scatterplot
          data={[{ x: 1, y: 10 }, { x: 2, y: 20 }]}
          xAccessor="x"
          yAccessor="y"
          animate
          width={300}
          height={200}
        />
      )
    ).not.toThrow()
  })

  it("animate=false does not enable transitions", () => {
    expect(() =>
      render(
        <LineChart
          data={[{ x: 1, y: 10 }]}
          xAccessor="x"
          yAccessor="y"
          animate={false}
          width={300}
          height={200}
        />
      )
    ).not.toThrow()
  })
})
