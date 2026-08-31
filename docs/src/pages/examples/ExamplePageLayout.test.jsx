import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ExamplePageLayout from "./ExamplePageLayout"

const sourceLoader = vi.hoisted(() => vi.fn(() => Promise.reject(new Error("missing source"))))
const pageLoader = vi.hoisted(() =>
  vi.fn(() => Promise.resolve("export default function Page() {}")),
)
const cssLoader = vi.hoisted(() => vi.fn(() => Promise.resolve(".page { color: red; }")))

vi.mock("./exampleSourceMap", () => ({
  getExampleSourceLoaders: (path) =>
    path.includes("the-last-scarcity")
      ? [
          { file: "TheLastScarcityExamplePage.jsx", load: pageLoader },
          { file: "TheLastScarcityExamplePage.css", load: cssLoader },
        ]
      : [{ file: "ExamplePage.jsx", load: sourceLoader }],
}))

describe("ExamplePageLayout", () => {
  beforeEach(() => {
    sourceLoader.mockClear()
    pageLoader.mockClear()
    cssLoader.mockClear()
  })

  it("loads multi-file examples lazily and exposes file tabs", async () => {
    render(
      <MemoryRouter initialEntries={["/examples/the-last-scarcity"]}>
        <ExamplePageLayout title="The Last Scarcity">
          <p>Narrative content</p>
        </ExamplePageLayout>
      </MemoryRouter>,
    )

    const toggle = await screen.findByRole("button", { name: "Show full code view" })
    await waitFor(() => expect(toggle.disabled).toBe(false))
    fireEvent.click(toggle)
    await waitFor(() => {
      expect(pageLoader).toHaveBeenCalledTimes(1)
      expect(cssLoader).toHaveBeenCalledTimes(1)
    })
    const pageTab = await screen.findByRole("tab", { name: "TheLastScarcityExamplePage.jsx" })
    const cssTab = screen.getByRole("tab", { name: "TheLastScarcityExamplePage.css" })
    expect(pageTab).toHaveAttribute("aria-selected", "true")
    expect(pageTab).toHaveAttribute("tabindex", "0")
    expect(cssTab).toHaveAttribute("tabindex", "-1")
    fireEvent.keyDown(pageTab, { key: "ArrowRight" })
    expect(cssTab).toHaveFocus()
    expect(cssTab).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", cssTab.id)
    expect(await screen.findByText(/color: red/)).toBeTruthy()
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

  it("can omit the code-view control for a reading-only example", () => {
    render(
      <MemoryRouter initialEntries={["/examples/watermarks"]}>
        <ExamplePageLayout
          title="Watermarks"
          showViewToggle={false}
          useFullCodeFallback={false}
          showContractPanels={false}
          showPageHeader={false}
        >
          <p>Narrative content</p>
        </ExamplePageLayout>
      </MemoryRouter>,
    )

    expect(screen.queryByRole("button", { name: "Show full code view" })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/implementation guidance/)).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Watermarks" })).not.toBeInTheDocument()
    expect(sourceLoader).not.toHaveBeenCalled()
  })

  it("shows lazy contract panels for non-pilot example routes", async () => {
    render(
      <MemoryRouter initialEntries={["/examples/insight-forge"]}>
        <ExamplePageLayout title="The Insight Forge">
          <p>Narrative content</p>
        </ExamplePageLayout>
      </MemoryRouter>,
    )

    expect(await screen.findByRole("heading", { name: "Copy this pattern" })).toBeTruthy()
    expect(
      screen.getByText(/reusable implementation pattern has not been reviewed yet/i),
    ).toBeTruthy()
    expect(sourceLoader).not.toHaveBeenCalled()
  })
})
