import { render } from "@testing-library/react"
import { scaleLinear } from "d3-scale"
import { describe, expect, it } from "vitest"
import { SVGOverlay } from "./SVGOverlay"
import { SVGUnderlay } from "./SVGUnderlay"
import { generateAxesSVG } from "../server/staticSVGChrome"
import { renderGridSVG } from "../server/staticXYGrid"
import { renderPairedRightAxisSVG } from "../server/staticXYAxes"
import { LIGHT_THEME } from "../store/themeCore"
import type { StreamScales, StreamXYFrameProps } from "./types"

const layout = { width: 500, height: 200 }
const margin = { top: 30, right: 40, bottom: 70, left: 60 }

function presentation(
  scales: StreamScales,
  options: Pick<
    StreamXYFrameProps,
    "axes" | "showAxes" | "axisExtent" | "xFormat" | "yFormat"
  >
) {
  const props = { chartType: "line" as const, ...options }
  const common = {
    ...layout,
    margin,
    totalWidth: 600,
    totalHeight: 300,
    scales,
    showAxes: true,
    showGrid: true
  }
  return {
    live: render(<SVGOverlay {...common} {...props} />).container,
    underlay: render(<SVGUnderlay {...common} {...props} />).container,
    exported: render(
      <svg>
        {generateAxesSVG(scales, layout, props, LIGHT_THEME)}
        {renderPairedRightAxisSVG({
          scales,
          layout,
          props,
          theme: LIGHT_THEME,
          margin,
          leftAxis: props.axes?.find((axis) => axis.orient === "left"),
          rightAxis: props.axes?.find((axis) => axis.orient === "right")
        })}
        {renderGridSVG(
          scales,
          layout,
          LIGHT_THEME,
          undefined,
          props.axisExtent,
          props.axes,
          props
        )}
      </svg>
    ).container
  }
}

const xLabels = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll('[data-orient="bottom"] > g > text')
  )

describe("axis presentation across live layers and exports", () => {
  it("keeps visible grid lines when axis labels are disabled", () => {
    const { live, underlay } = presentation(
      { x: scaleLinear().range([0, 500]), y: scaleLinear().range([200, 0]) },
      { showAxes: false }
    )
    expect(live.querySelector(".stream-axes")).toBeNull()
    const lines = (container: HTMLElement) =>
      Array.from(container.querySelectorAll(".stream-grid line"), (line) => [
        line.getAttribute("x1"),
        line.getAttribute("y1")
      ])
    expect(lines(live).length).toBeGreaterThan(0)
    expect(lines(live)).toEqual(lines(underlay))
  })

  it("retains the neighbor of an included endpoint on a reversed axis", () => {
    const x = scaleLinear().domain([0, 9]).range([500, 0])
    x.ticks = () => [0, 2, 4, 6]
    const views = presentation(
      { x, y: scaleLinear().domain([0, 10]).range([200, 0]) },
      {
        axes: [{ orient: "bottom", includeMax: true }]
      }
    )
    for (const [name, container] of Object.entries(views)) {
      if (name === "underlay") continue
      expect(
        xLabels(container).map((node) => node.textContent),
        `${name} reversed-axis labels`
      ).toEqual(["0", "2", "4", "6", "9"])
    }
    const gridX = (container: HTMLElement) =>
      Array.from(
        container.querySelectorAll(
          '.stream-grid line[y2="200"], .semiotic-grid line[y2="200"]'
        )
      ).map((node) => node.getAttribute("x1"))
    expect(gridX(views.live)).toEqual(gridX(views.underlay))
    expect(gridX(views.live)).toEqual(gridX(views.exported))
  })

  it("rotates clustered long labels even when most of the axis is empty", () => {
    const views = presentation(
      {
        x: scaleLinear().domain([0, 10]).range([0, 500]),
        y: scaleLinear().range([200, 0])
      },
      {
        axes: [
          {
            orient: "bottom",
            autoRotate: true,
            tickValues: [0, 1.2, 10],
            tickFormat: (value) => `Stage ${value} label`
          }
        ]
      }
    )
    for (const [name, container] of Object.entries(views)) {
      if (name === "underlay") continue
      const labels = xLabels(container)
      expect(labels, `${name} clustered labels`).toHaveLength(3)
      for (const label of labels)
        expect(label).toHaveAttribute("transform", "rotate(-45)")
    }
  })

  it("uses the same responsive count in exported axes and grid lines", () => {
    const views = presentation(
      {
        x: scaleLinear().domain([0, 100]).range([0, 500]),
        y: scaleLinear().range([200, 0])
      },
      {
        axes: [{ orient: "bottom", ticks: 30 }]
      }
    )
    for (const [name, container] of Object.entries(views)) {
      if (name === "underlay") continue
      expect(
        xLabels(container).map((node) => node.textContent),
        `${name} responsive labels`
      ).toEqual(["0", "20", "40", "60", "80", "100"])
    }
  })

  it("preserves small numeric ticks on both primary and paired axes", () => {
    const views = presentation(
      {
        x: scaleLinear().domain([0, 0.004]).range([0, 500]),
        y: scaleLinear().domain([0, 0.004]).range([200, 0])
      },
      {
        axes: [{ orient: "bottom" }, { orient: "left" }, { orient: "right" }]
      }
    )
    for (const container of [views.live, views.exported]) {
      const labels = Array.from(
        container.querySelectorAll(".stream-axes text"),
        (node) => node.textContent
      )
      for (const value of ["0.001", "0.002", "0.003", "0.004"]) {
        expect(labels.filter((label) => label === value)).toHaveLength(3)
      }
    }
  })
})
