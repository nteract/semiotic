import React from "react"
import { MemoryRouter } from "react-router-dom"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import ExamplesOverviewPage, { ExamplePreview } from "./ExamplesOverviewPage"
import { EXAMPLES } from "./examplesManifest"

describe("ExamplePreview", () => {
  it("renders the How a Hit Travels constellation preview", () => {
    const { container } = render(<ExamplePreview preview="how-a-hit-travels" />)

    expect(container.querySelector("[data-example-preview-missing]")).toBeNull()
    expect(container.textContent).toContain("HOW A HIT TRAVELS")
  })

  it("uses the explicit combined preview instead of a catch-all fallback", () => {
    const { container } = render(<ExamplePreview preview="combined" />)

    expect(container.querySelector("[data-example-preview-missing]")).toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()
  })

  it("renders the benchmark notebook preview from its explicit key", () => {
    const { container } = render(<ExamplePreview preview="model-evaluation" />)

    expect(container.querySelector("[data-example-preview-missing]")).toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()
  })

  it("renders the Apollo process preview from its explicit key", () => {
    const { container } = render(<ExamplePreview preview="apollo-third-seat" />)

    expect(container.querySelector("[data-example-preview-missing]")).toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()
    expect(container.textContent).toContain("THE THIRD SEAT")
  })

  it("renders the ballot transfer ledger preview from its explicit key", () => {
    const { container } = render(<ExamplePreview preview="ballot-transfer-ledger" />)

    expect(container.querySelector("[data-example-preview-missing]")).toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()
    expect(container.textContent).toContain("THE 7,197-VOTE CORRIDOR")
  })

  it("renders the Germany becoming preview from its explicit key", () => {
    const { container } = render(<ExamplePreview preview="germany-still-becoming" />)

    expect(container.querySelector("[data-example-preview-missing]")).toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()
    expect(container.textContent).toContain("GERMANY, STILL BECOMING")
  })

  it("renders the United States history river preview from its explicit key", () => {
    const { container } = render(<ExamplePreview preview="united-states-drawn-together" />)

    expect(container.querySelector("[data-example-preview-missing]")).toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()
    expect(container.textContent).toContain("THE UNITED STATES, DRAWN TOGETHER")
  })

  it("makes an unknown preview key visible instead of silently rendering another card", () => {
    render(<ExamplePreview preview="not-a-preview" />)

    expect(screen.getByRole("img", { name: "Missing example preview: not-a-preview" })).toBeTruthy()
  })
})

describe("ExamplesOverviewPage", () => {
  it("places the newest example first", () => {
    render(
      <MemoryRouter>
        <ExamplesOverviewPage />
      </MemoryRouter>,
    )

    const newestExample = [...EXAMPLES].sort((left, right) => {
      const publishedDifference = Date.parse(right.publishedAt) - Date.parse(left.publishedAt)
      return publishedDifference || left.path.localeCompare(right.path)
    })[0]

    expect(screen.getAllByRole("link")[0].getAttribute("href")).toBe(newestExample.path)
  })
})
