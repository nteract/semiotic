import { resolveSideLegendMargin, resolveSideLegendWidth } from "./legendLayout"

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
    expect(resolveSideLegendMargin(legend)).toBe(112)
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

  it("uses the same custom swatch and label metrics as the renderer", () => {
    const legend = {
      legendGroups: [{ label: "", styleFn, items: [{ label: "A" }] }],
    }

    expect(resolveSideLegendWidth(legend, { swatchSize: 80, labelGap: 30 })).toBe(117)
    expect(resolveSideLegendMargin(
      legend,
      { swatchSize: 80, labelGap: 30 },
    )).toBe(129)
  })
})
