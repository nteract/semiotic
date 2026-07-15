import React from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import SentenceStructureExplorer from "./SentenceStructureExplorer"

const LOVE_SMOKE_SOURCE_ID = "shakespeare:romeo-and-juliet:1-1:love-smoke"
const DEFAULT_CANONICAL_ID = "shakespeare:loves-labors-lost:1-2:love-familiar-devil"

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
          "data-corpus-sentence-id": props.specimen?.corpusSentenceId ?? "none",
          "data-interpretation": props.interpretationId,
          "data-selected-token-ids": props.selectedTokenIds.join(","),
          "data-rewrite-count": Object.keys(props.rewrites ?? {}).length,
          "data-canonical-sentence": props.specimen?.text ?? "",
          "data-active-sentence": (props.tokens ?? []).map((token) => token.text).join(" "),
          "data-word-tree-anchor": props.wordTree?.anchor ?? "",
          "data-word-tree-source-count": props.wordTree?.sources?.length ?? 0,
          "data-phrase-net-edge-count": props.phraseNet?.edges?.length ?? 0,
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

const VIEWS = [
  ["a sentence diagram", "reed-kellogg"],
  ["phrase structure", "constituency"],
  ["word relationships", "dependency"],
  ["possible interpretations", "ambiguity"],
  ["a meaning graph", "semantics"],
  ["an argument structure", "rhetoric"],
  ["word paths", "word-tree"],
  ["phrase relationships", "phrase-net"],
  ["textual variants", "variants"],
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
  it("opens with all nine corpus-backed views and one shared Shakespeare sentence", () => {
    const { explorer, viewNavigation } = renderExplorer()

    const title = screen.getByRole("heading", {
      level: 3,
      name: "Explore 20 sentences about love from Shakespeare, shown as word paths.",
    })
    expect(within(title).getAllByRole("button")).toHaveLength(4)
    expect(explorer).toHaveAttribute("data-corpus-sentence-id", DEFAULT_CANONICAL_ID)

    const buttons = within(viewNavigation).getAllByRole("button")
    expect(buttons).toHaveLength(9)
    expect(buttons.map((button) => button.textContent)).toEqual(
      VIEWS.map(([label], index) =>
        expect.stringMatching(new RegExp(`^0${index + 1}.*${label}$`, "i")),
      ),
    )

    for (const [label, view] of VIEWS) {
      fireEvent.click(within(viewNavigation).getByRole("button", { name: new RegExp(label, "i") }))
      const stage = screen.getByTestId("sentence-structure-stage")
      expect(stage).toHaveAttribute("data-view", view)
      expect(stage).toHaveAttribute("data-corpus-sentence-id", DEFAULT_CANONICAL_ID)
      expect(stage).toHaveAttribute(
        "data-canonical-sentence",
        "Love is a familiar; love is a devil.",
      )
    }

    expect(
      screen.queryByRole("heading", { name: /outside the Shakespeare filter/i }),
    ).not.toBeInTheDocument()
  })

  it("preserves a token from the canonical corpus row while moving between views", () => {
    const { tokenRibbon, viewNavigation } = renderExplorer()
    const familiar = within(tokenRibbon).getByRole("button", { name: /^familiar/i })

    fireEvent.click(familiar)
    const selectedId = screen
      .getByTestId("sentence-structure-stage")
      .getAttribute("data-selected-token-ids")
    expect(selectedId).toMatch(/corpus-specimen:shakespeare:.*:t3$/)
    expect(familiar).toHaveAttribute("aria-pressed", "true")

    for (const label of ["a sentence diagram", "word relationships", "a meaning graph"]) {
      fireEvent.click(within(viewNavigation).getByRole("button", { name: new RegExp(label, "i") }))
      expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
        "data-selected-token-ids",
        selectedId,
      )
    }
    expect(screen.getByText("Following across views").nextElementSibling).toHaveTextContent(
      "familiar",
    )
  })

  it("derives both interpretations and the ambiguity comparison from the same corpus row", () => {
    const { viewNavigation } = renderExplorer()
    fireEvent.click(
      within(viewNavigation).getByRole("button", { name: /possible interpretations/i }),
    )

    const choices = screen.getByRole("group", { name: "Choose an interpretation" })
    const primary = within(choices).getByRole("button", { name: /Primary attachment/i })
    const alternative = within(choices).getByRole("button", { name: /Alternative attachment/i })
    expect(primary).toHaveAttribute("aria-pressed", "true")
    expect(alternative).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(alternative)
    expect(alternative).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
      "data-interpretation",
      expect.stringMatching(/:parse:alternative$/),
    )
    expect(screen.getByRole("blockquote")).toHaveTextContent(
      "Love is a familiar; love is a devil.",
    )
    expect(screen.getAllByRole("button", { name: "Alternative attachment" }).at(-1)).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("lets a corpus row become canonical and clears stale structural state", () => {
    const { explorer, tokenRibbon, viewNavigation } = renderExplorer()
    fireEvent.click(within(tokenRibbon).getByRole("button", { name: /^familiar/i }))

    const sentenceGrid = document.querySelector(".sentence-specimens__grid")
    const venus = within(sentenceGrid).getByRole("button", { name: /Venus and Adonis/i })
    fireEvent.click(venus)

    expect(venus).toHaveAttribute("aria-pressed", "true")
    expect(explorer).toHaveAttribute(
      "data-corpus-sentence-id",
      "shakespeare:venus-and-adonis:149:love-spirit",
    )
    expect(screen.getByText("no word followed")).toBeInTheDocument()
    expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
      "data-canonical-sentence",
      "Love is a spirit all compact of fire, not gross to sink, but light, and will aspire.",
    )

    fireEvent.click(within(viewNavigation).getByRole("button", { name: /a sentence diagram/i }))
    expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
      "data-corpus-sentence-id",
      "shakespeare:venus-and-adonis:149:love-spirit",
    )
  })

  it("recovers the complete source behind a word path", () => {
    const { container } = renderExplorer()
    const summary = container.querySelector(".sentence-summary")
    fireEvent.click(within(summary).getByText("Read every relationship"))
    expect(within(summary).getAllByRole("listitem").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Recover a source sentence" }))
    const recovered = container.querySelector(".sentence-source-recovery")
    expect(recovered).toHaveTextContent("Love is a smoke made with the fume of sighs.")
    expect(recovered).toHaveTextContent("Romeo and Juliet")
  })

  it("changes subject to a Shakespeare canonical with complete structure", () => {
    const { explorer, tokenRibbon, viewNavigation } = renderExplorer()
    chooseFilterValue({ trigger: /Subject: love/i, dialog: "Subject", option: "ambiguity" })

    expect(explorer).toHaveAttribute(
      "data-corpus-sentence-id",
      "shakespeare:hamlet:3-4:cruel-kind",
    )
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Explore 2 sentences about ambiguity from Shakespeare, shown as word paths.",
      }),
    ).toBeInTheDocument()
    expect(within(tokenRibbon).getByRole("button", { name: /^cruel/i })).toBeInTheDocument()

    for (const label of ["a sentence diagram", "phrase structure", "an argument structure"]) {
      fireEvent.click(within(viewNavigation).getByRole("button", { name: new RegExp(label, "i") }))
      expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
        "data-corpus-sentence-id",
        "shakespeare:hamlet:3-4:cruel-kind",
      )
    }
  })

  it("keeps work and subject choices nonempty and canonical within the exact intersection", () => {
    const { explorer } = renderExplorer()
    chooseFilterValue({
      trigger: /Corpus: Shakespeare/i,
      dialog: "Corpus",
      option: "Julius Caesar",
    })

    expect(explorer).toHaveAttribute("data-corpus-count", "4")
    expect(explorer.getAttribute("data-corpus-sentence-id")).toMatch(/^shakespeare:julius-caesar:/)

    chooseFilterValue({
      trigger: /Subject: any subject/i,
      dialog: "Subject",
      option: "death",
    })
    expect(explorer).toHaveAttribute("data-corpus-count", "2")
    expect(explorer).toHaveAttribute(
      "data-corpus-sentence-id",
      "shakespeare:julius-caesar:2-2:cowards-and-valiant",
    )
  })

  it("uses a rewritten Shakespeare token as the word-path anchor and retains the canonical row", () => {
    const { container, tokenRibbon, viewNavigation } = renderExplorer()
    const love = within(tokenRibbon).getAllByRole("button", { name: /^love,/i })[0]
    fireEvent.click(love)
    fireEvent.click(screen.getByRole("button", { name: "desire" }))

    const stage = screen.getByTestId("sentence-structure-stage")
    expect(stage).toHaveAttribute("data-word-tree-anchor", "desire")
    expect(stage).toHaveAttribute("data-canonical-sentence", "Love is a familiar; love is a devil.")
    expect(stage).toHaveAttribute("data-active-sentence", expect.stringContaining("desire"))
    expect(container.querySelector(".sentence-rewrite__before")).toHaveTextContent("Love")
    expect(container.querySelector(".sentence-rewrite__after")).toHaveTextContent("desire")

    fireEvent.click(within(viewNavigation).getByRole("button", { name: /textual variants/i }))
    expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute(
      "data-corpus-sentence-id",
      DEFAULT_CANONICAL_ID,
    )
    expect(screen.getByTestId("sentence-structure-stage")).toHaveAttribute("data-rewrite-count", "1")
  })
})
