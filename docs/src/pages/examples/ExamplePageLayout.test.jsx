import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import ExamplePageLayout from "./ExamplePageLayout"

vi.mock("./exampleSourceMap", () => ({
  getExampleSourceLoader: () => () => Promise.reject(new Error("missing source")),
}))

describe("ExamplePageLayout", () => {
  it("shows a stable source-load fallback when Full Code source rejects", async () => {
    render(
      <MemoryRouter initialEntries={["/examples/watermarks"]}>
        <ExamplePageLayout title="Watermarks">
          <p>Narrative content</p>
        </ExamplePageLayout>
      </MemoryRouter>,
    )

    const toggle = await screen.findByRole("button", { name: "Show full code view" })
    await waitFor(() => expect(toggle.disabled).toBe(false))
    fireEvent.click(toggle)

    expect(await screen.findByText("Failed to load source.")).toBeTruthy()
  })

  it("resolves prev/next links for direct links with a trailing slash", () => {
    render(
      <MemoryRouter initialEntries={["/examples/watermarks/"]}>
        <ExamplePageLayout title="Watermarks">
          <p>Narrative content</p>
        </ExamplePageLayout>
      </MemoryRouter>,
    )

    expect(screen.getByRole("link", { name: /next example/i })).toBeTruthy()
  })
})
