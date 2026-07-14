import React from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import SentenceStructureExplorer from "./SentenceStructureExplorer"

const LOVE_SMOKE_SOURCE_ID = "shakespeare:romeo-and-juliet:1-1:love-smoke"

vi.mock("./SentenceStructureStage", async () => {
  const ReactModule = await import("react")

  return {
    default: function SentenceStructureStageDouble(props) {
      return ReactModule.createElement(
        "div",
        {
          "data-testid": "sentence-structure-stage",
          "data-view": props.view,
          "data-specimen": props.specimen?.id ?? "none",
          "data-interpretation": props.interpretationId,
          "data-selected-token-ids": props.selectedTokenIds.join(","),
          "data-rewrite-count": Object.keys(props.rewrites ?? {}).length,
          "data-canonical-sentence": props.specimen?.text ?? "",
          "data-active-sentence": (props.tokens ?? []).map((token) => token.text).join(" "),
          "data-word-tree-anchor": props.wordTree?.anchor ?? "",
          "data-word-tree-source-count": props.wordTree?.sources?.length ?? 0,
          "data-phrase-net-edge-count": props.phraseNet?.edges?.length ?? 0,
          "data-phrase-net-source-count": props.phraseNet?.sources?.length ?? 0,
        },
        props.view === "word-tree"
          ? ReactModule.createElement(
              "button",
              {
                type: "button",
                onClick: () => props.onSelectSource(LOVE_SMOKE_SOURCE_ID),
              },
              "Recover a source sentence",
            )
          : null,
      )
    },
  }
})

const VIEW_LABELS = [
  "a sentence diagram",
  "phrase structure",
  "word relationships",
  "possible interpretations",
  "a meaning graph",
  "an argument structure",
  "word paths",
  "phrase relationships",
  "textual variants",
]

function renderExplorer() {
  const result = render(<SentenceStructureExplorer />)
  const viewNavigation = screen.getByRole("navigation", { name: "Sentence structures" })
  const tokenRibbon = result.container.querySelector(".sentence-token-ribbon__tokens")
  const explorer = result.container.querySelector(".sentence-explorer")

  expect(tokenRibbon).not.toBeNull()
  expect(explorer).not.toBeNull()

  return { ...result, explorer, tokenRibbon, viewNavigation }
}

function chooseFilterValue({ trigger, dialog, option }) {
  fireEvent.click(screen.getByRole("button", { name: trigger }))
  const editor = screen.getByRole("dialog", { name: dialog })
  fireEvent.click(within(editor).getByRole("option", { name: option }), { detail: 1 })
}

describe("SentenceStructureExplorer", () => {
  it("opens with the controlled SentenceFilter title and all nine structural views", () => {
    const { viewNavigation } = renderExplorer()

    const title = screen.getByRole("heading", {
      level: 3,
      name: "Explore 20 sentences about love from Shakespeare, shown as word paths.",
    })
    expect(title).toHaveTextContent(
      "Explore 20 sentences about love from Shakespeare, shown as word paths.",
    )
    expect(within(title).getAllByRole("button")).toHaveLength(4)

    const viewButtons = within(viewNavigation).getAllByRole("button")
    expect(viewButtons).toHaveLength(9)
    expect(viewButtons.map((button) => button.textContent)).toEqual(
      VIEW_LABELS.map((label, index) =>
        expect.stringMatching(new RegExp(`^0${index + 1}.*${label}$`, "i")),
      ),
    )
    expect(within(viewNavigation).getByRole("button", { name: /word paths/i })).toHaveAttribute(
      "aria-current",
      "step",
    )

    for (const label of VIEW_LABELS) {
      fireEvent.click(within(viewNavigation).getByRole("button", { name: new RegExp(label, "i") }))
      expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
        "data-view",
        [
          "reed-kellogg",
          "constituency",
          "dependency",
          "ambiguity",
          "semantics",
          "rhetoric",
          "word-tree",
          "phrase-net",
          "variants",
        ][VIEW_LABELS.indexOf(label)],
      )
    }
  })

  it("keeps the telescope token selected while moving between structures", () => {
    const { tokenRibbon, viewNavigation } = renderExplorer()
    const telescope = within(tokenRibbon).getByRole("button", { name: /^telescope/i })

    fireEvent.click(telescope)
    expect(telescope).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("1 followed")).toBeInTheDocument()

    fireEvent.click(within(viewNavigation).getByRole("button", { name: /phrase structure/i }))
    expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
      "data-selected-token-ids",
      "attachment-ambiguity:t6",
    )
    expect(within(tokenRibbon).getByRole("button", { name: /^telescope/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByText("Following across views").nextElementSibling).toHaveTextContent(
      "telescope",
    )

    fireEvent.click(within(viewNavigation).getByRole("button", { name: /word relationships/i }))
    expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
      "data-selected-token-ids",
      "attachment-ambiguity:t6",
    )
    expect(screen.getByText(/Structural token selections were preserved/i)).toBeInTheDocument()
  })

  it("exposes both authored telescope interpretations and updates the active parse", () => {
    const { viewNavigation } = renderExplorer()

    fireEvent.click(
      within(viewNavigation).getByRole("button", { name: /possible interpretations/i }),
    )

    const choices = screen.getByRole("group", { name: "Choose an interpretation" })
    const instrument = within(choices).getByRole("button", { name: /I used the telescope/i })
    const possession = within(choices).getByRole("button", {
      name: /The man had the telescope/i,
    })
    expect(within(choices).getAllByRole("button")).toHaveLength(2)
    expect(instrument).toHaveAttribute("aria-pressed", "true")
    expect(possession).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(possession)
    expect(possession).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
      "data-interpretation",
      "attachment-ambiguity:parse:possession",
    )
    expect(
      screen.getByText(/Interpretation changed to The man had the telescope/i),
    ).toBeInTheDocument()
  })

  it("clears a prior token selection and unlocks Buffalo mode when the specimen changes", () => {
    const { explorer, tokenRibbon } = renderExplorer()
    fireEvent.click(within(tokenRibbon).getByRole("button", { name: /^telescope/i }))

    const specimenGrid = document.querySelector(".sentence-specimens__grid")
    expect(specimenGrid).not.toBeNull()
    const buffalo = within(specimenGrid).getByRole("button", { name: /Buffalo mode/i })
    fireEvent.click(buffalo)

    expect(explorer).toHaveAttribute("data-buffalo-mode", "true")
    expect(buffalo).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("BUFFALO MODE")).toBeInTheDocument()
    expect(screen.getByText("no word followed")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Explore 2 sentences about power from the grammar lab, shown as word paths.",
      }),
    ).toBeInTheDocument()
    expect(explorer).toHaveAttribute("data-corpus-count", "2")
    expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
      "data-specimen",
      "buffalo",
    )
    expect(screen.getByText(/Structural selections were cleared/i)).toBeInTheDocument()
  })

  it("provides a relationship summary and recovers the complete source behind a word path", () => {
    const { container } = renderExplorer()
    const summarySection = container.querySelector(".sentence-summary")
    expect(summarySection).not.toBeNull()
    expect(summarySection).toHaveAttribute("aria-labelledby", "structural-summary-title")
    expect(within(summarySection).getByRole("heading", { level: 2 })).not.toBeEmptyDOMElement()
    expect(
      within(summarySection).getByRole("button", { name: "Copy accessible summary" }),
    ).toBeVisible()

    fireEvent.click(within(summarySection).getByText("Read every relationship"))
    expect(within(summarySection).getAllByRole("listitem").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Recover a source sentence" }))
    const recovered = container.querySelector(".sentence-source-recovery")
    expect(recovered).toHaveAttribute("aria-live", "polite")
    expect(recovered).toHaveTextContent("Love is a smoke made with the fume of sighs.")
    expect(recovered).toHaveTextContent("Romeo and Juliet")
  })

  it("resets stale structural state to the unique specimen compatible with subject and corpus", () => {
    const { container, tokenRibbon, viewNavigation } = renderExplorer()

    fireEvent.click(screen.getByRole("button", { name: "Recover a source sentence" }))
    fireEvent.click(within(tokenRibbon).getByRole("button", { name: /^telescope\b/i }))
    fireEvent.click(screen.getByRole("button", { name: "notebook" }))
    fireEvent.click(
      within(viewNavigation).getByRole("button", { name: /possible interpretations/i }),
    )
    fireEvent.click(
      within(screen.getByRole("group", { name: "Choose an interpretation" })).getByRole("button", {
        name: /The man had the telescope/i,
      }),
    )
    fireEvent.click(within(viewNavigation).getByRole("button", { name: /word paths/i }))

    chooseFilterValue({
      trigger: /Subject: love/i,
      dialog: "Subject",
      option: "rhetoric",
    })
    chooseFilterValue({
      trigger: /Corpus: Shakespeare/i,
      dialog: "Corpus",
      option: "the grammar lab",
    })

    const stage = screen.getByTestId("sentence-structure-stage")
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Explore 1 sentence about rhetoric from the grammar lab, shown as word paths.",
      }),
    ).toBeInTheDocument()
    expect(stage).toHaveAttribute("data-specimen", "rhetorical-claim")
    expect(stage).toHaveAttribute("data-selected-token-ids", "")
    expect(stage).toHaveAttribute("data-rewrite-count", "0")
    expect(stage).toHaveAttribute("data-interpretation", "default")
    expect(container.querySelector(".sentence-source-recovery")).not.toBeInTheDocument()
    expect(
      within(tokenRibbon).queryByRole("button", { name: /^telescope\b/i }),
    ).not.toBeInTheDocument()
    expect(within(tokenRibbon).getByRole("button", { name: /^analyst\b/i })).toBeInTheDocument()

    fireEvent.click(within(viewNavigation).getByRole("button", { name: /word relationships/i }))
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Explore 1 sentence about rhetoric from the grammar lab, shown as word relationships.",
      }),
    ).toBeInTheDocument()
    expect(container.querySelector(".sentence-summary")).toHaveTextContent(
      /distrusted is the authored root/i,
    )
  })

  it("shows an explicit empty corpus view instead of silently widening an incompatible scope", () => {
    const { container, viewNavigation } = renderExplorer()

    chooseFilterValue({
      trigger: /Subject: love/i,
      dialog: "Subject",
      option: "ambiguity",
    })
    fireEvent.click(within(viewNavigation).getByRole("button", { name: /phrase relationships/i }))

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Explore 0 sentences about ambiguity from Shakespeare, shown as phrase relationships.",
      }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId("sentence-structure-stage")).not.toBeInTheDocument()
    expect(container.querySelector(".sentence-stage__empty")).toHaveTextContent(
      /No matching sentences.*empty intersection/i,
    )
    expect(container.querySelector(".sentence-summary")).toHaveTextContent(
      "No matching phrase relationships in the current corpus selection.",
    )
  })

  it("uses a rewritten token for the effective word path while retaining the canonical variant", () => {
    const { container, tokenRibbon, viewNavigation } = renderExplorer()
    const telescope = within(tokenRibbon).getByRole("button", { name: /^telescope\b/i })

    fireEvent.click(telescope)
    expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
      "data-word-tree-anchor",
      "telescope",
    )
    fireEvent.click(screen.getByRole("button", { name: "notebook" }))

    const stage = screen.getByTestId("sentence-structure-stage")
    expect(stage).toHaveAttribute("data-word-tree-anchor", "notebook")
    expect(stage).toHaveAttribute("data-canonical-sentence", "I saw the man with the telescope.")
    expect(stage).toHaveAttribute("data-active-sentence", expect.stringContaining("notebook"))
    expect(container.querySelector(".sentence-rewrite__before")).toHaveTextContent("telescope")
    expect(container.querySelector(".sentence-rewrite__after")).toHaveTextContent("notebook")
    expect(screen.getByRole("group", { name: "Word path direction" })).toHaveTextContent(
      "from “notebook”",
    )

    fireEvent.click(within(viewNavigation).getByRole("button", { name: /textual variants/i }))
    expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
      "data-canonical-sentence",
      "I saw the man with the telescope.",
    )
    expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
      "data-active-sentence",
      expect.stringContaining("notebook"),
    )
  })
})
