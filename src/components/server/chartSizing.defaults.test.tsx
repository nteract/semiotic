// @vitest-environment node
import { describe, expect, it } from "vitest"
import { renderChart } from "./renderToStaticSVG"

const cases = [
  {
    name: "CandlestickChart",
    size: [600, 400],
    props: { data: [{ x: 0, high: 10, low: 4 }] }
  },
  {
    name: "PieChart",
    size: [400, 400],
    props: { data: [{ category: "A", value: 1 }] }
  },
  {
    name: "DonutChart",
    size: [400, 400],
    props: { data: [{ category: "A", value: 1 }] }
  },
  {
    name: "UnitPileChart",
    size: [700, 380],
    props: { data: [{ category: "A", value: 1 }] }
  },
  {
    name: "EventDropChart",
    size: [760, 360],
    props: { data: [{ time: 1, value: 1 }] }
  },
  {
    name: "MultiAxisLineChart",
    size: [800, 400],
    props: {
      data: [
        { x: 0, a: 10, b: 4 },
        { x: 1, a: 20, b: 8 }
      ],
      series: [{ yAccessor: "a" }, { yAccessor: "b" }]
    }
  }
]

describe("server chart default sizing matches React charts", () => {
  for (const { name, size, props } of cases) {
    it(`${name} preserves primary defaults and resolves mode and explicit dimensions`, () => {
      for (const [extra, [width, height]] of [
        [{}, size],
        [{ mode: "context" }, [400, 250]],
        [{ mode: "sparkline" }, [120, 24]],
        [{ mode: "mobile" }, [390, 300]],
        [{ mode: "context", width: 320, height: 180 }, [320, 180]]
      ] as const) {
        const svg = renderChart(name, { ...props, ...extra })
        expect(svg).toMatch(new RegExp(`^<svg[^>]*width="${width}"`))
        expect(svg).toMatch(new RegExp(`^<svg[^>]*height="${height}"`))
      }
    })
  }
})
