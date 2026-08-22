import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import RouteLoadErrorBoundary from "./RouteLoadErrorBoundary"

function FailedRoute() {
  throw new TypeError("Importing a module script failed.")
}

describe("RouteLoadErrorBoundary", () => {
  it("replaces a rejected route with a visible reload action", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <RouteLoadErrorBoundary resetKey="/examples/insight-forge">
        <FailedRoute />
      </RouteLoadErrorBoundary>,
    )

    expect(screen.getByRole("alert")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "This page didn't finish loading" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Reload page" }).getAttribute("href")).toBe(
      window.location.href,
    )

    vi.restoreAllMocks()
  })

  it("clears a route error when its location key changes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    let routeFails = true

    function Route() {
      if (routeFails) throw new TypeError("Importing a module script failed.")
      return <h1>Recovered route</h1>
    }

    const { rerender } = render(
      <RouteLoadErrorBoundary resetKey="/examples/insight-forge">
        <Route />
      </RouteLoadErrorBoundary>,
    )
    expect(screen.getByRole("alert")).toBeTruthy()

    routeFails = false
    rerender(
      <RouteLoadErrorBoundary resetKey="/examples">
        <Route />
      </RouteLoadErrorBoundary>,
    )

    expect(screen.getByRole("heading", { name: "Recovered route" })).toBeTruthy()
    vi.restoreAllMocks()
  })
})
