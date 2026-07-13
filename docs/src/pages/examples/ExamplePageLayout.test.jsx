import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ExamplePageLayout from "./ExamplePageLayout"

const sourceLoader = vi.hoisted(() =>
  vi.fn(() => Promise.reject(new Error("missing source"))),
)

vi.mock("./exampleSourceMap", () => ({
  getExampleSourceLoader: () => sourceLoader,
}))

describe("ExamplePageLayout", () => {
  beforeEach(() => {
    sourceLoader.mockClear()
  })

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
    expect(await screen.findByRole("heading", { name: "Copy this pattern" })).toBeTruthy()
    expect(sourceLoader).not.toHaveBeenCalled()

    fireEvent.click(toggle)

    expect(await screen.findByText("Failed to load source.")).toBeTruthy()
    expect(sourceLoader).toHaveBeenCalledTimes(1)
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
    expect(sourceLoader).not.toHaveBeenCalled()
  })
})
