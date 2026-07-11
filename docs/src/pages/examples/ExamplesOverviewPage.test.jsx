import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ExamplePreview } from "./ExamplesOverviewPage"

describe("ExamplePreview", () => {
  it("uses the explicit combined preview instead of a catch-all fallback", () => {
    const { container } = render(<ExamplePreview preview="combined" />)

    expect(container.querySelector("[data-example-preview-missing]")).toBeNull()
    expect(container.querySelector("svg")).not.toBeNull()
  })

  it("makes an unknown preview key visible instead of silently rendering another card", () => {
    render(<ExamplePreview preview="not-a-preview" />)

    expect(screen.getByRole("img", { name: "Missing example preview: not-a-preview" })).toBeTruthy()
  })
})
