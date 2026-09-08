import { render } from "@testing-library/react"
import { scaleBand, scaleLinear } from "d3-scale"
import { describe, expect, it } from "vitest"
import { OrdinalSVGOverlay, OrdinalSVGUnderlay } from "./OrdinalSVGOverlay"
import { renderOrdinalToStaticSVG } from "../server/renderToStaticSVG"

describe("ordinal value-axis presentation", () => {
  it.each(["horizontal", "vertical"] as const)(
    "preserves explicit ticks and their grid lines in %s exports",
    (projection) => {
      const margin = { top: 30, right: 40, bottom: 70, left: 60 }
      const rTickValues = [0.001, 0.003, 0.007]
      const scales = {
        projection,
        o: scaleBand<string>()
          .domain(["Alpha", "Beta"])
          .range(projection === "vertical" ? [0, 500] : [0, 200]),
        r: scaleLinear()
          .domain([0, 0.01])
          .range(projection === "vertical" ? [200, 0] : [0, 500])
      }
      const props = {
        width: 500,
        height: 200,
        totalWidth: 600,
        totalHeight: 300,
        margin,
        scales,
        rTickValues,
        showAxes: true,
        showGrid: true
      }
      const live = render(<OrdinalSVGOverlay {...props} />).container
      const underlay = render(<OrdinalSVGUnderlay {...props} />).container
      const exported = document.createElement("div")
      exported.innerHTML = renderOrdinalToStaticSVG({
        chartType: "bar",
        data: [
          { category: "Alpha", value: 0.004 },
          { category: "Beta", value: 0.008 }
        ],
        oAccessor: "category",
        rAccessor: "value",
        projection,
        rExtent: [0, 0.01],
        rTickValues,
        showGrid: true,
        size: [600, 300],
        margin
      })
      for (const container of [live, exported]) {
        const labels = Array.from(
          container.querySelectorAll("text"),
          (node) => node.textContent
        )
        expect(labels.filter((label) => label?.startsWith("0."))).toEqual([
          "0.001",
          "0.003",
          "0.007"
        ])
      }
      const gridPositions = (container: HTMLElement) =>
        Array.from(
          container.querySelectorAll(".ordinal-grid line, .semiotic-grid line"),
          (node) => node.getAttribute(projection === "vertical" ? "y1" : "x1")
        )
      expect(gridPositions(exported)).toHaveLength(3)
      expect(gridPositions(exported)).toEqual(gridPositions(underlay))
      const gridOnly = render(
        <OrdinalSVGOverlay {...props} showAxes={false} />
      ).container
      expect(gridOnly.querySelector(".ordinal-axes")).toBeNull()
      expect(gridPositions(gridOnly)).toEqual(gridPositions(underlay))
    }
  )
})
