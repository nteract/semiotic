import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { prepareChart } from "semiotic/ai/core"
import { renderChartWithEvidence } from "semiotic/server"
import {
  correctedRows,
  inspectSourceHandoff,
  originalRows,
  originalSourceArtifact,
  reviseSourceArtifact,
  sourceChartProps,
} from "../../tasks/examples/source-correction"
import CorrectionDesk from "./CorrectionDesk"
import { correctionComparisonProps, correctionDownload } from "./correction-desk"

afterEach(cleanup)

describe("the superpersuasion correction desk", () => {
  it("renders a paired comparison with proportional bars and a persistent published record", () => {
    const before = prepareChart(
      { component: "GroupedBarChart", props: correctionComparisonProps(originalRows) },
      { render: renderChartWithEvidence },
    )
    const after = prepareChart(
      { component: "GroupedBarChart", props: correctionComparisonProps(correctedRows) },
      { render: renderChartWithEvidence },
    )
    expect(before.ok, before.reasons.join(", ")).toBe(true)
    expect(after.ok, after.reasons.join(", ")).toBe(true)
    expect(before.evidence?.markCount).toBe(6)
    expect(after.evidence?.markCount).toBe(6)
    const beforeDocument = new DOMParser().parseFromString(before.svg!, "image/svg+xml")
    const afterDocument = new DOMParser().parseFromString(after.svg!, "image/svg+xml")
    const beforeBars = [...beforeDocument.querySelectorAll("#data-area rect")].filter(
      (bar) => !bar.closest("defs"),
    )
    const afterBars = [...afterDocument.querySelectorAll("#data-area rect")].filter(
      (bar) => !bar.closest("defs"),
    )
    expect(afterBars).toHaveLength(6)
    const widths = afterBars.map((bar) => Number(bar.getAttribute("width")))
    expect(widths[0] / widths[2]).toBeCloseTo(12 / 30, 5)
    expect(widths[4] / widths[2]).toBeCloseTo(18 / 30, 5)
    expect(widths[5] / widths[2]).toBeCloseTo(36 / 30, 5)
    expect(widths[5] / Number(beforeBars[5].getAttribute("width"))).toBeCloseTo(2, 5)
    for (const index of [0, 1, 2, 3, 4]) {
      expect(afterBars[index].getAttribute("width")).toBe(beforeBars[index].getAttribute("width"))
    }
    const published = afterBars.filter((bar) => bar.getAttribute("fill")?.startsWith("url(#"))
    expect(published).toHaveLength(3)
    expect(afterDocument.querySelector("pattern")).not.toBeNull()
    expect(afterDocument.querySelector("desc")?.textContent).toContain(
      "West has the largest total: 36 units",
    )
  })

  it("retains the old reading on refusal and revises both conclusions with the source", () => {
    render(<CorrectionDesk />)
    fireEvent.click(screen.getByText("Follow the change"))
    fireEvent.click(screen.getByRole("button", { name: "Try changing the figures alone" }))
    expect(screen.getByTestId("sp-correction-status").textContent).toContain(
      "figures stay as published",
    )
    expect(screen.getByTestId("sp-correction-conclusion").textContent).toContain(
      "South leads with 30",
    )
    expect(screen.getByTestId("sp-correction-conclusion").textContent).toContain("add up to 60")

    fireEvent.click(screen.getByRole("button", { name: "Correct the source" }))
    expect(screen.getByTestId("sp-correction-conclusion").textContent).toContain(
      "West leads with 36",
    )
    expect(screen.getByTestId("sp-correction-conclusion").textContent).toContain("add up to 78")
    const history = screen.getByRole("list", { name: "Earlier and current conclusions" })
    expect(
      within(history)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Earlier readingThe total is 60 units.",
      "Earlier readingSouth has the largest total: 30 units.",
      "Current readingThe total is 78 units.",
      "Current readingWest has the largest total: 36 units.",
    ])
    expect(screen.getByTestId("sp-correction-status").textContent).toContain(
      "Review is still needed",
    )

    fireEvent.click(screen.getByRole("button", { name: "Start again" }))
    expect(screen.getByTestId("sp-correction-conclusion").textContent).toContain(
      "South leads with 30",
    )
    expect(within(history).getAllByRole("listitem")).toHaveLength(2)
  })

  it("exports actual reusable values and history, rejects a mismatch and permits context-free copies", () => {
    const original = originalSourceArtifact()
    const revised = reviseSourceArtifact()
    const props = revised.props as ReturnType<typeof sourceChartProps>
    const bundle = correctionDownload(props, revised.contract, true)
    const transferred = JSON.parse(JSON.stringify(bundle))
    expect(transferred.chart).toMatchObject({
      component: "BarChart",
      props: { data: correctedRows },
    })
    expect(inspectSourceHandoff(transferred.chart.props, transferred.context).status).toBe(
      "available",
    )
    expect(transferred.context.contract.evidence).toHaveLength(2)
    expect(transferred.context.contract.accountability.reviews[0].status).toBe("pending")
    expect(() => correctionDownload(original.props, revised.contract, true)).toThrow(
      /does not establish a match/,
    )
    const withoutContext = correctionDownload(props, revised.contract, false)
    expect(withoutContext).not.toHaveProperty("context")
    expect(withoutContext.chart.props.data).toEqual(correctedRows)
    expect(inspectSourceHandoff(withoutContext.chart.props).status).toBe("unavailable")
  })

  it("explains what the next reader loses while preserving the corrected chart and values", () => {
    render(<CorrectionDesk />)
    fireEvent.click(screen.getByRole("button", { name: "Correct the source" }))
    fireEvent.click(screen.getByText("What travels with the chart?"))
    expect(screen.getByTestId("sp-correction-handoff").textContent).toContain(
      "matches these values",
    )
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Keep the source and correction context" }),
    )
    expect(screen.getByTestId("sp-correction-handoff").textContent).toContain(
      "loses the source identity, earlier conclusions and review history",
    )
    expect(screen.getByTestId("sp-correction-conclusion").textContent).toContain(
      "West leads with 36",
    )
    expect(screen.getByTestId("sp-correction-conclusion").textContent).toContain("add up to 78")
  })
})
