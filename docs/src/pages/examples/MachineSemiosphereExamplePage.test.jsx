import React from "react"
import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import MachineSemiosphereExamplePage from "./MachineSemiosphereExamplePage"
import { STORY_SECTION_IDS } from "./machine-semiosphere/story"

const readingLineMocks = vi.hoisted(() => ({
  activeIndex: 0,
  registerSection: vi.fn(),
}))

vi.mock("semiotic/utils", () => ({
  useReducedMotion: () => false,
}))

vi.mock("../../hooks/useReadingLineSections", () => ({
  default: () => ({
    activeIndex: readingLineMocks.activeIndex,
    registerSection: readingLineMocks.registerSection,
  }),
}))

vi.mock("../../hooks/useResponsiveWidth", () => ({
  default: () => [1180, vi.fn()],
}))

vi.mock("./ExamplePageLayout", () => ({
  default: ({ title, children, showPageHeader = true }) => (
    <main>
      {showPageHeader ? <h1>{title}</h1> : null}
      {children}
    </main>
  ),
}))

vi.mock("./machine-semiosphere/MachineSemiosphereCharts", () => ({
  MachineSemiosphereMap: ({ activeChapterIndex }) => (
    <div data-testid="semiosphere-map" data-active-chapter={activeChapterIndex} />
  ),
  MachineSemiosphereLegend: () => <div data-testid="semiosphere-legend" />,
  MachineSemiosphereChapterVisual: ({ type }) => (
    <div data-testid="semiosphere-chapter-visual" data-visual-type={type} />
  ),
}))

const CHAPTER_HEADINGS = [
  "The first story was the attack",
  "The agents had already found a place to meet",
  "A run could end while its information stayed put",
  "One agent changed the environment. Another picked up the trail.",
  "Investigators learned to read the same traces differently",
  "The map shows environmental memory—not proof of an autonomous collective",
]

function renderPage() {
  return render(<MachineSemiosphereExamplePage />)
}

describe("MachineSemiosphereExamplePage", () => {
  beforeEach(() => {
    readingLineMocks.activeIndex = 0
    readingLineMocks.registerSection.mockReset()
  })

  it("opens as a reported news story and carries six chapters into the source record", () => {
    const { container } = renderPage()

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Short-lived AI agents hacked Hugging Face/,
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/OpenAI cybersecurity evaluation/).length).toBeGreaterThan(0)
    expect(screen.getByText("17,613")).toBeInTheDocument()
    expect(screen.getByText("≈1,200")).toBeInTheDocument()
    expect(screen.getByText(">70,000")).toBeInTheDocument()

    for (const heading of CHAPTER_HEADINGS) {
      expect(screen.getByRole("heading", { level: 2, name: heading })).toBeInTheDocument()
    }

    expect(screen.getByTestId("semiosphere-map")).toHaveAttribute("data-active-chapter", "0")
    expect(screen.getAllByTestId("semiosphere-chapter-visual")).toHaveLength(6)

    const sources = container.querySelector(".semiosphere-sources")
    expect(sources).not.toBeNull()
    expect(
      within(sources).getByRole("link", {
        name: "The Hugging Face incident and the road ahead",
      }),
    ).toHaveAttribute("href", "https://openai.com/index/hugging-face-incident-and-the-road-ahead/")
    expect(
      within(sources).getByRole("link", {
        name: /Brief independent investigation/,
      }),
    ).toHaveAttribute(
      "href",
      "https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/",
    )
    expect(
      within(sources).getByRole("link", {
        name: /Anatomy of a Frontier Lab Agent Intrusion/,
      }),
    ).toHaveAttribute("href", "https://huggingface.co/blog/agent-intrusion-technical-timeline")
  })

  it("keeps the reading surface free of controls and an instructional preamble", () => {
    const { container } = renderPage()

    expect(container.querySelectorAll("button, input, select, details")).toHaveLength(0)
    expect(screen.queryByText("REMOVE THE AGENTS")).not.toBeInTheDocument()
    expect(screen.queryByText("Does the spoor reproduce?")).not.toBeInTheDocument()
    expect(screen.queryByText("Open inert JSON")).not.toBeInTheDocument()
    expect(screen.queryByText("Rebuild the view")).not.toBeInTheDocument()
    expect(screen.queryByText("How to read this story")).not.toBeInTheDocument()
    expect(screen.queryByText(/Colored routes mark evidence threads/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Every essential number and caveat/)).not.toBeInTheDocument()
  })

  it("states the interpretation and its limits in plain language", () => {
    renderPage()

    expect(
      screen.getByText(/There is a simple term for coordination like this: stigmergy/),
    ).toBeInTheDocument()
    expect(screen.getByText(/This page proposes “machine semiosphere”/)).toBeInTheDocument()
    expect(
      screen.getByText(/does not show that an undetected autonomous AI collective/),
    ).toBeInTheDocument()
    expect(screen.getByText(/does not establish that agents generally notice/)).toBeInTheDocument()
    expect(screen.getAllByText(/categories overlap/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/controlled, independent test/)).toBeInTheDocument()
  })

  it("registers all chapters and reflects the active scroll chapter in the map", () => {
    readingLineMocks.activeIndex = 2
    const { container } = renderPage()

    expect(screen.getByTestId("semiosphere-map")).toHaveAttribute("data-active-chapter", "2")
    expect(container.querySelector(`#${STORY_SECTION_IDS[2]}`)).toHaveClass("is-active")

    const registeredIds = new Set(
      readingLineMocks.registerSection.mock.calls.map(([id]) => id).filter(Boolean),
    )
    expect([...registeredIds]).toEqual(expect.arrayContaining([...STORY_SECTION_IDS]))
  })
})
