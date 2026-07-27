import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { ModelEvaluationReadingRoom } from "./ModelEvaluationExamplePage"

vi.mock("../../hooks/useResponsiveWidth", () => ({
  default: () => [720, null],
}))

vi.mock("semiotic/ordinal", () => ({
  GroupedBarChart: ({ data, title, valueLabel }) => (
    <div
      data-testid="grounding-chart"
      data-denominator={data[0]?.denominator}
      data-value-label={valueLabel}
    >
      {title}
    </div>
  ),
  BarChart: ({ title }) => <div data-testid="first-try-chart">{title}</div>,
}))

function renderRoom() {
  return render(
    <MemoryRouter>
      <ModelEvaluationReadingRoom />
    </MemoryRouter>,
  )
}

describe("ModelEvaluationReadingRoom", () => {
  it("preserves the run ledger and the split score denominators", () => {
    renderRoom()

    expect(screen.getAllByText("516")).toHaveLength(2)
    expect(screen.getByTestId("grounding-chart").dataset.denominator).toBe("50")

    fireEvent.click(screen.getByRole("button", { name: /Answerable, score out of 20/i }))

    expect(screen.getByTestId("grounding-chart").dataset.denominator).toBe("20")
    expect(screen.getByTestId("grounding-chart").dataset.valueLabel).toContain("of 20")
    expect(
      screen.getByText(/The payload did not add a correct answer/i),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole("button", { name: /Correct abstention, score out of 30/i }),
    )

    expect(screen.getByTestId("grounding-chart").dataset.denominator).toBe("30")
    expect(screen.getByText(/combined evidence reached 30 of 30/i)).toBeTruthy()
  })

  it("keeps failures, scorer corrections, and provenance readable without the charts", () => {
    renderRoom()

    expect(screen.getByText("The seven fixture families that failed at least one first attempt"))
      .toBeTruthy()
    expect(screen.getByText(/render-evidence seam as much as a model miss/i)).toBeTruthy()
    expect(screen.getAllByText(/corrected:/i)).toHaveLength(3)
    expect(screen.getByText("Methods, provenance, and limits")).toBeTruthy()
    expect(screen.getByRole("link", { name: "What the Machine Sees" })).toHaveAttribute(
      "href",
      "/examples/what-the-machine-sees",
    )
  })
})
