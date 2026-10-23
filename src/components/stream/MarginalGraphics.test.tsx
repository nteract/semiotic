import * as React from "react"
import { render } from "@testing-library/react"
import { scaleLinear } from "d3-scale"
import { MarginalGraphics, normalizeMarginalConfig } from "./MarginalGraphics"
import { provideMarginalGraphics } from "./MarginalGraphicsLazy"
import { heatmapBandScale } from "./heatmapBandTicks"
import { SVGOverlay } from "./SVGOverlay"
import type { StreamScales } from "./types"
import type { MarginalConfig } from "./types"

provideMarginalGraphics(MarginalGraphics)

function makeScale(domain: [number, number] = [0, 100], range: [number, number] = [0, 400]) {
  return scaleLinear().domain(domain).range(range)
}

const sampleValues = Array.from({ length: 50 }, (_, i) => i * 2)

describe("MarginalGraphics", () => {
  describe("normalizeMarginalConfig", () => {
    it("converts string shorthand to config object", () => {
      const config = normalizeMarginalConfig("histogram")
      expect(config).toEqual({ type: "histogram" })
    })

    it("passes through full config unchanged", () => {
      const input: MarginalConfig = { type: "violin", bins: 10, fill: "red" }
      expect(normalizeMarginalConfig(input)).toBe(input)
    })
  })

  describe("histogram", () => {
    it("renders rect elements", () => {
      const { container } = render(
        <svg>
          <MarginalGraphics
            orient="top"
            config={{ type: "histogram" }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      const rects = container.querySelectorAll("rect")
      expect(rects.length).toBeGreaterThan(0)
    })

    it("renders with data-testid for top orient", () => {
      const { getByTestId } = render(
        <svg>
          <MarginalGraphics
            orient="top"
            config={{ type: "histogram" }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      expect(getByTestId("marginal-histogram-top")).toBeTruthy()
    })

    it("renders bottom orient", () => {
      const { getByTestId } = render(
        <svg>
          <MarginalGraphics
            orient="bottom"
            config={{ type: "histogram" }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      expect(getByTestId("marginal-histogram-bottom")).toBeTruthy()
    })

    it("renders left orient", () => {
      const { getByTestId } = render(
        <svg>
          <MarginalGraphics
            orient="left"
            config={{ type: "histogram" }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      expect(getByTestId("marginal-histogram-left")).toBeTruthy()
    })

    it("renders right orient", () => {
      const { getByTestId } = render(
        <svg>
          <MarginalGraphics
            orient="right"
            config={{ type: "histogram" }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      expect(getByTestId("marginal-histogram-right")).toBeTruthy()
    })
  })

  describe("violin", () => {
    it("renders a polygon element", () => {
      const { container } = render(
        <svg>
          <MarginalGraphics
            orient="top"
            config={{ type: "violin" }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      const polygons = container.querySelectorAll("polygon")
      expect(polygons.length).toBe(1)
    })

    it("has violin testid", () => {
      const { getByTestId } = render(
        <svg>
          <MarginalGraphics
            orient="left"
            config={{ type: "violin" }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      expect(getByTestId("marginal-violin-left")).toBeTruthy()
    })
  })

  describe("ridgeline", () => {
    it("renders a path element", () => {
      const { container } = render(
        <svg>
          <MarginalGraphics
            orient="bottom"
            config={{ type: "ridgeline" }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      const paths = container.querySelectorAll("path")
      expect(paths.length).toBe(1)
    })

    it("has ridgeline testid", () => {
      const { getByTestId } = render(
        <svg>
          <MarginalGraphics
            orient="right"
            config={{ type: "ridgeline" }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      expect(getByTestId("marginal-ridgeline-right")).toBeTruthy()
    })
  })

  describe("boxplot", () => {
    it("renders rect and line elements", () => {
      const { container } = render(
        <svg>
          <MarginalGraphics
            orient="top"
            config={{ type: "boxplot" }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      const rects = container.querySelectorAll("rect")
      const lines = container.querySelectorAll("line")
      expect(rects.length).toBe(1) // the box
      expect(lines.length).toBeGreaterThanOrEqual(3) // whisker line + 2 caps + median
    })

    it("renders left orient boxplot", () => {
      const { getByTestId } = render(
        <svg>
          <MarginalGraphics
            orient="left"
            config={{ type: "boxplot" }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      expect(getByTestId("marginal-boxplot-left")).toBeTruthy()
    })

    it("renders right orient boxplot", () => {
      const { getByTestId } = render(
        <svg>
          <MarginalGraphics
            orient="right"
            config={{ type: "boxplot" }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      expect(getByTestId("marginal-boxplot-right")).toBeTruthy()
    })
  })

  describe("empty data", () => {
    it("returns null for empty values", () => {
      const { container } = render(
        <svg>
          <MarginalGraphics
            orient="top"
            config={{ type: "histogram" }}
            values={[]}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      // Should render the outer <svg> but no marginal content
      expect(container.querySelectorAll("rect").length).toBe(0)
      expect(container.querySelectorAll("path").length).toBe(0)
    })
  })

  describe("custom config", () => {
    it("applies custom fill and opacity", () => {
      const { container } = render(
        <svg>
          <MarginalGraphics
            orient="top"
            config={{ type: "histogram", fill: "red", fillOpacity: 0.8 }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      const rect = container.querySelector("rect")
      expect(rect?.getAttribute("fill")).toBe("red")
      expect(rect?.getAttribute("fill-opacity")).toBe("0.8")
    })

    it("uses custom bin count", () => {
      const fewBins = render(
        <svg>
          <MarginalGraphics
            orient="top"
            config={{ type: "histogram", bins: 5 }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      const manyBins = render(
        <svg>
          <MarginalGraphics
            orient="top"
            config={{ type: "histogram", bins: 30 }}
            values={sampleValues}
            scale={makeScale()}
            size={60}
            length={400}
          />
        </svg>
      )
      const fewCount = fewBins.container.querySelectorAll("rect").length
      const manyCount = manyBins.container.querySelectorAll("rect").length
      expect(manyCount).toBeGreaterThan(fewCount)
    })
  })

  describe("heatmap band scales", () => {
    const columns = heatmapBandScale([10, 20, 30], [0, 300])
    const overlay = (kind: "histogram" | "boxplot") => render(
      <SVGOverlay
        width={300}
        height={200}
        totalWidth={300}
        totalHeight={240}
        margin={{ top: 40, right: 0, bottom: 0, left: 0 }}
        scales={{
          x: columns,
          y: scaleLinear().domain([0, 1]).range([200, 0]),
        } as unknown as StreamScales}
        showAxes={false}
        marginalGraphics={{ top: kind }}
        xValues={[10, 20, 30, 10, 20, 30]}
        yValues={[1]}
      />,
    )

    it("bins numeric heatmap columns instead of the index domain", () => {
      const { container } = overlay("histogram")
      const rects = Array.from(container.querySelectorAll("[data-testid='marginal-histogram-top'] rect"))
      expect(rects.length).toBeGreaterThan(0)
      for (const rect of rects) {
        const x = Number(rect.getAttribute("x"))
        const width = Number(rect.getAttribute("width"))
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x + width).toBeLessThanOrEqual(300)
      }
    })

    it("places a heatmap boxplot median on the column center", () => {
      const { container } = overlay("boxplot")
      const median = container.querySelector("[data-testid='marginal-boxplot-top'] line[stroke-width='2']")
      expect(median).toBeTruthy()
      expect(Number(median!.getAttribute("x1"))).toBeCloseTo(150)
    })
  })
})
