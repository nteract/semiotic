import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getExampleDefinition } from "./exampleDefinitions"
import PilotExamplePanels from "./PilotExamplePanels"

describe("PilotExamplePanels", () => {
  it("renders reusable guidance from the typed example definition", () => {
    render(<PilotExamplePanels definition={getExampleDefinition("/examples/watermarks")} />)

    expect(screen.getByRole("heading", { name: "Copy this pattern" })).toBeTruthy()
    expect(screen.getByText("semiotic/physics")).toBeTruthy()
    expect(screen.getByText("deterministic-local-scenarios")).toBeTruthy()
    expect(screen.getByText("WatermarksExamplePage.jsx")).toBeTruthy()
    expect(screen.getByText(/Freshness owner: Semiotic maintainers/)).toBeTruthy()
  })
})
