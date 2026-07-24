import {
  resolveHorizontalLegendHeight,
  resolveLegendDistance,
  resolveSideLegendMargin,
  resolveSideLegendWidth,
} from "./legendLayout"

describe("side legend measurement", () => {
  const styleFn = () => ({ fill: "#555" })

  it("keeps a padded minimum for short categorical labels", () => {
    const legend = {
      legendGroups: [
        {
          label: "",
          styleFn,
          items: [{ label: "A" }, { label: "B" }]
        }
      ]
    }

    expect(resolveSideLegendWidth(legend)).toBe(100)
    expect(resolveSideLegendMargin(legend)).toBe(110)
  })

  it("grows to fit categorical item and group labels", () => {
    const itemLegend = {
      legendGroups: [
        {
          label: "",
          styleFn,
          items: [{ label: "Catch-and-shoot attempts" }]
        }
      ]
    }
    const groupLegend = {
      legendGroups: [
        {
          label: "A deliberately long group heading",
          styleFn,
          items: [{ label: "A" }]
        }
      ]
    }

    expect(resolveSideLegendWidth(itemLegend)).toBeGreaterThan(100)
    expect(resolveSideLegendWidth(groupLegend)).toBeGreaterThan(
      resolveSideLegendWidth(itemLegend)
    )
  })

  it("accounts for formatted gradient endpoints and labels", () => {
    const legend = {
      gradient: {
        domain: [0, 1] as [number, number],
        colorFn: () => "#555",
        label: "Probability of conversion",
        format: (value: number) => `${value.toFixed(3)} percent`
      }
    }

    expect(resolveSideLegendWidth(legend)).toBeGreaterThan(100)
  })

  it("includes an overridden legend distance in automatic side reservation", () => {
    const legend = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
      legendDistance: 24,
    }

    expect(resolveSideLegendMargin(legend)).toBe(124)
  })

  it("reserves plot-adjacent chrome before a side legend", () => {
    const legend = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
    }

    expect(resolveSideLegendMargin(legend, { sideGutter: 70 })).toBe(180)
  })

  it("uses the same custom swatch and label metrics as the renderer", () => {
    const legend = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
    }

    expect(resolveSideLegendWidth(legend, { swatchSize: 80, labelGap: 30 })).toBe(117)
    expect(resolveSideLegendMargin(
      legend,
      { swatchSize: 80, labelGap: 30 },
    )).toBe(127)
  })
})

describe("resolveLegendDistance", () => {
  const styleFn = () => ({ fill: "#555" })

  it("falls back to the default when legendDistance is not finite", () => {
    const legend = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
      legendDistance: NaN,
    }

    expect(resolveLegendDistance(legend)).toBe(10)
  })

  it("still honors a valid finite legendDistance", () => {
    const legend = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
      legendDistance: 24,
    }

    expect(resolveLegendDistance(legend)).toBe(24)
  })
})

describe("resolveHorizontalLegendHeight", () => {
  const styleFn = () => ({ fill: "#555" })

  it("reserves extra height for the multi-group separator overflow", () => {
    const singleGroup = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
    }
    const multiGroup = {
      legendGroups: [
        { label: "", styleFn, items: [{ label: "A" }] },
        { label: "", styleFn, items: [{ label: "B" }] },
      ],
    }

    expect(resolveHorizontalLegendHeight(multiGroup, 500)).toBe(
      resolveHorizontalLegendHeight(singleGroup, 500) + 16
    )
  })
})
