import * as React from "react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { Datum } from "../charts/shared/datumTypes"
import { buildStatsTooltip } from "../charts/shared/statsTooltip"
import { hasOwnTooltipChrome } from "../Tooltip/tooltipChrome"
import { DefaultOrdinalTooltip } from "./ordinalDefaultTooltip"

describe("DefaultOrdinalTooltip distribution summaries", () => {
  const data = [{ category: "Group A" }] as unknown as Datum

  it("preserves the shared summary markup, row order, and number formatting", () => {
    const stats = { n: 50, min: 0, q1: 3, median: 5, q3: 7, max: 1000, mean: 5.234 }
    const { container } = render(
      <DefaultOrdinalTooltip hover={{ data, x: 0, y: 0, category: "Group B", stats }} />
    )
    const reference = render(buildStatsTooltip()({ category: "Group B", stats }))
    expect(container.innerHTML).toBe(reference.container.innerHTML)
    expect(Array.from(container.querySelectorAll(".semiotic-tooltip > div"), row => row.textContent)).toEqual([
      "Group B", "n = 50", "Min: 0", "Q1: 3", "Median: 5", "Q3: 7",
      `Max: ${(1000).toLocaleString()}`,
      `Mean: ${(5.234).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    ])
    expect(hasOwnTooltipChrome(<DefaultOrdinalTooltip hover={{ data, x: 0, y: 0, stats }} />)).toBe(true)
  })

  it("uses the first piece's category and retains zero-valued statistics", () => {
    const stats = { n: 0, min: 0, q1: 0, median: 0, q3: 0, max: 0, mean: 0 }
    const { container } = render(
      <DefaultOrdinalTooltip hover={{ data, x: 0, y: 0, stats }} />
    )
    expect(container.textContent).toBe("Group An = 0Min: 0Q1: 0Median: 0Q3: 0Max: 0Mean: 0")
  })

  it("retains the item count fallback when statistics are unavailable", () => {
    const { container } = render(
      <DefaultOrdinalTooltip hover={{ data, x: 0, y: 0 }} />
    )
    expect(container.textContent).toBe("Group A1 items")
  })
})
