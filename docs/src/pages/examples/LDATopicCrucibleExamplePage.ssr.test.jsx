import React, { act } from "react"
import { hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import LDATopicCrucibleExamplePage from "./LDATopicCrucibleExamplePage"

// The example contract panel is an unrelated React.lazy subtree. It requires
// streaming SSR, while this focused parity test deliberately follows the
// repository's renderToString hydration harness.
vi.mock("./exampleDefinitions", async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getExampleDefinition: () => undefined }
})

const ROUTE = "/examples/latent-crucible"

function PageAtRoute() {
  return (
    <MemoryRouter initialEntries={[ROUTE]}>
      <LDATopicCrucibleExamplePage />
    </MemoryRouter>
  )
}

function installReducedMotionClient() {
  const originalMatchMedia = window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    })),
  })
  return () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    })
  }
}

describe("LDATopicCrucibleExamplePage SSR hydration", () => {
  let container
  let root
  let restoreMatchMedia

  beforeEach(() => {
    restoreMatchMedia = installReducedMotionClient()
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount()
      })
    }
    container.remove()
    restoreMatchMedia()
    vi.restoreAllMocks()
    root = null
  })

  it("hydrates deterministic R=0 markup, then settles a reduced-motion client at R=64", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const html = renderToString(<PageAtRoute />)
    expect(renderToString(<PageAtRoute />)).toBe(html)

    container.innerHTML = html
    expect(container.querySelector("#ltc-iteration")).toHaveAttribute(
      "aria-valuetext",
      "Gibbs sweep 0",
    )
    expect(container.querySelector(".ltc-console-topline strong")).toHaveTextContent("R = 0")
    expect(container.querySelector(".ltc-status")).toHaveTextContent("Sampling · R=0")

    await act(async () => {
      root = hydrateRoot(container, <PageAtRoute />)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(container.querySelector("#ltc-iteration")).toHaveAttribute(
        "aria-valuetext",
        "Gibbs sweep 64",
      )
      expect(container.querySelector(".ltc-console-topline strong")).toHaveTextContent("R = 64")
      expect(container.querySelector(".ltc-status")).toHaveTextContent(
        "Motion reduced · static checkpoint R=64",
      )
    })

    const mismatchWarnings = errorSpy.mock.calls.filter((call) => {
      const message = String(call[0] ?? "")
      return /did not match|hydration failed|hydration error|server rendered html didn't match|hydrated but some attributes|switched to client rendering/i.test(
        message,
      )
    })
    expect(mismatchWarnings).toEqual([])
    // This test renders + hydrates a full example page (CrucibleChart physics
    // frame included) and settles multiple effect passes via waitFor. It
    // finishes in a few seconds in isolation, but under a fully parallel
    // suite run (500+ files) it can be starved by CPU contention well past
    // 20s without anything actually being wrong — give it real headroom.
  }, 60_000)
})
