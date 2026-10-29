import { render } from "@testing-library/react"
import { scaleBand, scaleLinear } from "d3-scale"
import { describe, expect, it } from "vitest"
import { OrdinalSVGOverlay, OrdinalSVGUnderlay } from "./OrdinalSVGOverlay"
import { renderOrdinalToStaticSVG } from "../server/renderToStaticSVG"

describe("ordinal value-axis presentation", () => {
  describe.each(["horizontal", "vertical"] as const)(
    "%s tick overrides",
    (projection) => {
      it.each([
        {
          name: "empty nice",
          axisExtent: "nice",
          rTickValues: [],
          expected: []
        },
        {
          name: "empty exact",
          axisExtent: "exact",
          rTickValues: [],
          expected: []
        },
        {
          name: "omitted nice",
          axisExtent: "nice",
          rTickValues: undefined,
          expected: [0, 2, 4, 6, 8, 10]
        },
        {
          name: "omitted exact",
          axisExtent: "exact",
          rTickValues: undefined,
          expected: [0, 2.5, 5, 7.5, 10]
        },
        {
          name: "zero nice",
          axisExtent: "nice",
          rTickValues: [0],
          expected: [0]
        },
        {
          name: "zero exact",
          axisExtent: "exact",
          rTickValues: [0],
          expected: [0]
        }
      ] as const)(
        "keeps $name ticks consistent across live and static output",
        ({ axisExtent, rTickValues, expected }) => {
          const margin = { top: 30, right: 40, bottom: 70, left: 60 }
          const ticks = rTickValues ? [...rTickValues] : undefined
          const rFormat = (value: string | number) => `value:${value}`
          const props = {
            width: 500,
            height: 200,
            totalWidth: 600,
            totalHeight: 300,
            margin,
            axisExtent,
            rTickValues: ticks,
            rFormat,
            showAxes: true,
            showGrid: true,
            scales: {
              projection,
              o: scaleBand<string>()
                .domain(["Alpha", "Beta"])
                .range(projection === "vertical" ? [0, 500] : [0, 200]),
              r: scaleLinear()
                .domain([0, 10])
                .range(projection === "vertical" ? [200, 0] : [0, 500])
            }
          }
          const live = render(<OrdinalSVGOverlay {...props} />).container
          const underlay = render(<OrdinalSVGUnderlay {...props} />).container
          const gridOnly = render(
            <OrdinalSVGOverlay {...props} showAxes={false} />
          ).container
          const exported = document.createElement("div")
          exported.innerHTML = renderOrdinalToStaticSVG({
            chartType: "bar",
            data: [
              { category: "Alpha", value: 4 },
              { category: "Beta", value: 8 }
            ],
            oAccessor: "category",
            rAccessor: "value",
            projection,
            rExtent: [0, 10],
            rTickValues: ticks,
            rFormat,
            axisExtent,
            showGrid: true,
            size: [600, 300],
            margin
          })
          for (const container of [live, exported]) {
            const labels = Array.from(
              container.querySelectorAll(".ordinal-axes text"),
              (node) => node.textContent
            )
            expect(
              labels.filter((label) => label?.startsWith("value:"))
            ).toEqual(expected.map((value) => `value:${value}`))
            // An empty value-tick set must not remove the category axis.
            expect(labels).toEqual(expect.arrayContaining(["Alpha", "Beta"]))
          }
          const coordinate = projection === "vertical" ? "y1" : "x1"
          const expectedPositions = expected.map((value) =>
            projection === "vertical" ? 200 - value * 20 : value * 50
          )
          for (const container of [underlay, gridOnly, exported]) {
            const positions = Array.from(
              container.querySelectorAll(
                ".ordinal-grid line, .semiotic-grid line"
              ),
              (node) => Number(node.getAttribute(coordinate))
            )
            expect(positions).toHaveLength(expectedPositions.length)
            positions.forEach((position, index) => {
              // d3 interpolation can represent 40px as 39.99999999999999px.
              expect(position).toBeCloseTo(expectedPositions[index], 10)
            })
          }
        }
      )
    }
  )

  it("keeps a long right-edge value label inside the chart in live and static output", () => {
    const margin = { top: 10, right: 6, bottom: 50, left: 60 }
    const rFormat = (value: string | number) => `${value} requests/s`
    const scales = {
      projection: "horizontal" as const,
      o: scaleBand<string>().domain(["Alpha", "Beta"]).range([0, 200]),
      r: scaleLinear().domain([0, 10]).range([0, 500])
    }
    const live = render(
      <OrdinalSVGOverlay
        width={500}
        height={200}
        totalWidth={566}
        totalHeight={260}
        margin={margin}
        rTickValues={[0, 10]}
        rFormat={rFormat}
        showAxes
        scales={scales}
      />
    ).container
    const exported = document.createElement("div")
    exported.innerHTML = renderOrdinalToStaticSVG({
      chartType: "bar",
      data: [{ category: "Alpha", value: 4 }, { category: "Beta", value: 8 }],
      oAccessor: "category",
      rAccessor: "value",
      projection: "horizontal",
      rExtent: [0, 10],
      rTickValues: [0, 10],
      rFormat,
      size: [566, 260],
      margin
    })
    for (const container of [live, exported]) {
      const label = (text: string) =>
        Array.from(container.querySelectorAll(".ordinal-axes text")).find(
          (node) => node.textContent === text
        )
      // "10 requests/s" is ~94px at 12px; centred at x 500 it would end
      // ~41px past a 6px right margin, so it shifts left by that overflow.
      expect(Number(label("10 requests/s")?.getAttribute("x"))).toBeLessThan(-30)
      // "0 requests/s" centred at x 0 fits inside the 60px left margin.
      expect(label("0 requests/s")?.getAttribute("x")).toBeNull()
    }
  })

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

  it.each(["horizontal", "vertical"] as const)(
    "drops repeated value labels and their grid lines in %s live and static output",
    (projection) => {
      const margin = { top: 30, right: 40, bottom: 70, left: 60 }
      // A coarse formatter maps neighbouring ticks 0/2/4 and 6/8/10 to the
      // same text; like XY axes, only the first tick of each run is kept.
      const rFormat = (value: string | number) =>
        Number(value) < 5 ? "low" : "high"
      const scales = {
        projection,
        o: scaleBand<string>()
          .domain(["Alpha", "Beta"])
          .range(projection === "vertical" ? [0, 500] : [0, 200]),
        r: scaleLinear()
          .domain([0, 10])
          .range(projection === "vertical" ? [200, 0] : [0, 500])
      }
      const props = {
        width: 500,
        height: 200,
        totalWidth: 600,
        totalHeight: 300,
        margin,
        scales,
        rFormat,
        showAxes: true,
        showGrid: true
      }
      const live = render(<OrdinalSVGOverlay {...props} />).container
      const underlay = render(<OrdinalSVGUnderlay {...props} />).container
      const gridOnly = render(
        <OrdinalSVGOverlay {...props} showAxes={false} />
      ).container
      const exported = document.createElement("div")
      exported.innerHTML = renderOrdinalToStaticSVG({
        chartType: "bar",
        data: [
          { category: "Alpha", value: 4 },
          { category: "Beta", value: 8 }
        ],
        oAccessor: "category",
        rAccessor: "value",
        projection,
        rExtent: [0, 10],
        rFormat,
        showGrid: true,
        size: [600, 300],
        margin
      })
      for (const container of [live, exported]) {
        const labels = Array.from(
          container.querySelectorAll(".ordinal-axes text"),
          (node) => node.textContent
        )
        expect(
          labels.filter((label) => label === "low" || label === "high")
        ).toEqual(["low", "high"])
      }
      const coordinate = projection === "vertical" ? "y1" : "x1"
      const expected = projection === "vertical" ? [200, 80] : [0, 300]
      for (const container of [underlay, gridOnly, exported]) {
        const positions = Array.from(
          container.querySelectorAll(".ordinal-grid line, .semiotic-grid line"),
          (node) => Number(node.getAttribute(coordinate))
        )
        expect(positions).toHaveLength(expected.length)
        positions.forEach((position, index) =>
          expect(position).toBeCloseTo(expected[index], 10)
        )
      }
    }
  )
})
