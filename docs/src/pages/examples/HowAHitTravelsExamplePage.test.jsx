import React from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import HowAHitTravelsExamplePage from "./HowAHitTravelsExamplePage"

const readingLineMocks = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  registerSection: vi.fn(),
}))

vi.mock("../../hooks/useExplainerMotion", () => ({
  default: () => ({
    reducedMotion: false,
    systemReducedMotion: false,
    toggleReaderReducedMotion: vi.fn(),
  }),
}))

vi.mock("../../hooks/useReadingLineSections", () => ({
  default: () => ({
    activeIndex: 0,
    navigateTo: readingLineMocks.navigateTo,
    registerSection: readingLineMocks.registerSection,
  }),
}))

vi.mock("../../hooks/useResponsiveWidth", () => ({
  default: () => [960, vi.fn()],
}))

vi.mock("./ExamplePageLayout", () => ({
  default: ({ title, children }) => (
    <article>
      <h1>{title}</h1>
      {children}
    </article>
  ),
}))

vi.mock("semiotic/xy", () => ({
  LineChart: ({ chartId, data }) => <div data-testid={chartId} data-row-count={data.length} />,
}))

vi.mock("./how-a-hit-travels/SimilarityConstellation", () => ({
  SimilarityConstellation: ({ chartId, selectedTitle, layoutMode }) => (
    <div data-testid={chartId} data-title-id={selectedTitle.id} data-layout-mode={layoutMode} />
  ),
}))

vi.mock("./how-a-hit-travels/JourneyFingerprint", () => ({
  default: ({ title, onSelect }) => (
    <div data-testid={`fingerprint-${title.id}`}>
      <span>{title.label}</span>
      {onSelect ? (
        <button type="button" onClick={() => onSelect(title.id)}>
          Explore {title.label}
        </button>
      ) : null}
    </div>
  ),
}))

vi.mock("./how-a-hit-travels/similarityConstellationRecipe", () => ({}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/examples/how-a-hit-travels"]}>
      <HowAHitTravelsExamplePage />
    </MemoryRouter>,
  )
}

describe("HowAHitTravelsExamplePage", () => {
  beforeEach(() => {
    readingLineMocks.navigateTo.mockClear()
    readingLineMocks.registerSection.mockClear()
  })

  it("opens with the article premise and keeps the source boundary visible", () => {
    renderPage()

    expect(screen.getByRole("heading", { level: 1, name: "How a Hit Travels" })).toBeTruthy()
    expect(screen.getByText(/You Wanted a Hit/i)).toBeTruthy()

    const sourceBoundary = screen.getByRole("region", {
      name: "What this data can show",
    })
    expect(within(sourceBoundary).getByText(/published weekly Top 10/i)).toBeTruthy()
    expect(
      within(sourceBoundary).getByText(/cannot reveal country-level audience size/i),
    ).toBeTruthy()

    expect(screen.getByRole("heading", { name: "How the atlas was built" })).toBeTruthy()
    expect(screen.getAllByRole("link", { name: /Download source/i })).toHaveLength(2)
  })

  it("opens and closes a claim evidence record", () => {
    renderPage()

    fireEvent.click(screen.getByRole("button", { name: /evidence record/i }))

    const dialog = screen.getByRole("dialog", { name: "Evidence record" })
    expect(within(dialog).getByText("Numerator")).toBeTruthy()
    expect(within(dialog).getByText("Denominator")).toBeTruthy()

    fireEvent.click(within(dialog).getByRole("button", { name: "Close evidence record" }))
    expect(screen.queryByRole("dialog", { name: "Evidence record" })).toBeNull()
  })

  it("shows an explorer detour and resets the selected title to the article state", async () => {
    renderPage()

    expect(screen.getByTestId("how-a-hit-travels-explorer")).toHaveAttribute(
      "data-title-id",
      "crash-course-romance",
    )

    fireEvent.click(screen.getByRole("button", { name: /Oppenheimer.*Film/i }))

    expect(screen.getByTestId("how-a-hit-travels-explorer")).toHaveAttribute(
      "data-title-id",
      "oppenheimer",
    )
    expect(screen.getByText("Exploring: Oppenheimer")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Reset to article" }))

    await waitFor(() => {
      expect(screen.getByTestId("how-a-hit-travels-explorer")).toHaveAttribute(
        "data-title-id",
        "crash-course-romance",
      )
    })
    expect(screen.queryByText("Exploring: Oppenheimer")).toBeNull()
  })

  it("keeps comparison at three titles and explains the rejected fourth", () => {
    renderPage()

    const chips = screen.getByLabelText("Comparison titles")
    const first = within(chips).getByRole("button", { name: "The Tinder Swindler" })
    const second = within(chips).getByRole("button", { name: "Oppenheimer" })
    const third = within(chips).getByRole("button", { name: "The Rookie — Season 1" })
    const fourth = within(chips).getByRole("button", { name: "Solo Leveling — Season 1" })

    fireEvent.click(first)
    fireEvent.click(second)
    fireEvent.click(third)
    fireEvent.click(fourth)

    expect(first).toHaveAttribute("aria-pressed", "true")
    expect(second).toHaveAttribute("aria-pressed", "true")
    expect(third).toHaveAttribute("aria-pressed", "true")
    expect(fourth).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText(/capped at three titles/i)).toBeTruthy()
  })
})
