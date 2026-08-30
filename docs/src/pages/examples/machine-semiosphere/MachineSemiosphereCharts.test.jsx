import React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as Recipes from "semiotic/recipes"
import {
  MachineSemiosphereChapterVisual,
  MachineSemiosphereLegend,
  MachineSemiosphereMap,
} from "./MachineSemiosphereCharts"

vi.mock("../../../hooks/useResponsiveWidth", () => ({
  default: () => [560, vi.fn()],
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("MachineSemiosphereCharts", () => {
  it("renders the authored vertical evidence map with a complete text alternative", () => {
    const { container } = render(
      <>
        <MachineSemiosphereLegend />
        <MachineSemiosphereMap width={440} height={1400} activeChapterIndex={2} compact={false} />
      </>,
    )

    expect(screen.getByLabelText("Evidence route legend")).toBeInTheDocument()
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(0)
    expect(screen.getByRole("note")).toHaveTextContent(/digital environments can carry information/)
  })

  it("restyles chapter emphasis without re-running the transit layout", () => {
    const layoutSpy = vi.spyOn(Recipes, "transitDiagramLayout")
    const chapterHeights = [800, 800, 800, 800, 800, 800]
    const { rerender } = render(
      <MachineSemiosphereMap
        width={440}
        height={4800}
        activeChapterIndex={1}
        chapterHeights={chapterHeights}
      />,
    )
    const initialLayoutCalls = layoutSpy.mock.calls.length

    rerender(
      <MachineSemiosphereMap
        width={440}
        height={4800}
        activeChapterIndex={4}
        chapterHeights={chapterHeights}
      />,
    )

    expect(initialLayoutCalls).toBeGreaterThan(0)
    expect(layoutSpy).toHaveBeenCalledTimes(initialLayoutCalls)
  })

  it.each([
    "daily-actions",
    "board-scale",
    "observed-lifetimes",
    "handoffs",
    "forensic-recovery",
    "evidence-summary",
  ])("renders the fixed %s chapter visual", (type) => {
    const { container } = render(<MachineSemiosphereChapterVisual type={type} />)

    expect(container.querySelector("figure.semiosphere-chapter-visual")).toBeInTheDocument()
    expect(container.querySelector("figcaption")).not.toBeEmptyDOMElement()
  })
})
