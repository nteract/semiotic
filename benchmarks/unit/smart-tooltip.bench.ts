import { bench, describe } from "vitest"
import { smartTooltipEntries } from "../../src/components/charts/shared/smartTooltip"

describe("Smart tooltip field selection", () => {
  for (const fieldCount of [10, 100]) {
    const datum = {
      id: "node-1",
      label: "North",
      group: "Region",
      type: "Branch",
      value: 42,
      amount: 17,
      x: 100,
      y: 200,
      ...Object.fromEntries(
        Array.from({ length: fieldCount - 8 }, (_, i) => [`field-${i}`, i])
      )
    }
    bench(`tooltip-${fieldCount}-fields`, () => {
      smartTooltipEntries(datum)
    })
  }
})
