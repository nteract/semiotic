import React, { useState } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import AdventureAnnotation from "./components/AdventureAnnotation"
import AnchoredChat from "./components/AnchoredChat"
import CgaShell from "./components/CgaShell"
import ChoicePanel from "./components/ChoicePanel"
import DataSummaryPanel from "./components/DataSummaryPanel"

function ChatHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open cached-roof comment
      </button>
      <AnchoredChat
        open={open}
        title="M.ZORK (offline)"
        anchorLabel="Cached roof observation"
        messages={["A timestamp is not necessarily the time something happened."]}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

function SummaryHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-keyshortcuts="D">
        Open data summary
      </button>
      <DataSummaryPanel
        open={open}
        title="Executive telemetry · data summary"
        summary="Displayed time and observed time remain distinct."
        columns={[
          { key: "timestamp", label: "Event time" },
          { key: "observedAt", label: "Observed time" },
          { key: "cacheAgeMinutes", label: "Cache age" },
        ]}
        rows={[
          {
            id: "badge-roof-0914",
            timestamp: "09:14",
            observedAt: "09:06",
            cacheAgeMinutes: 8,
          },
        ]}
        caption="Executive telemetry fields needed to judge the roof ping"
        onClose={() => setOpen(false)}
      />
    </>
  )
}

function ChoiceResolutionHarness() {
  const [resolved, setResolved] = useState(false)
  return (
    <ChoicePanel
      choices={[
        { id: "roof", label: "Trust the roof" },
        { id: "cache", label: "Compare observed time" },
      ]}
      onChoose={() => setResolved(true)}
      resolution={
        resolved
          ? {
              title: "Cache busted. Helicopter drama cancelled.",
              explanation: "The displayed roof ping was eight minutes stale.",
            }
          : undefined
      }
    />
  )
}

describe("Analyst Adventure accessibility primitives", () => {
  it("exposes chart annotations as named, stateful native buttons", () => {
    const onActivate = vi.fn()
    render(
      <AdventureAnnotation
        annotationId="executive-cached-roof"
        label="M.ZORK (offline) left a comment"
        active={false}
        onActivate={onActivate}
      >
        MZ
      </AdventureAnnotation>,
    )

    const widget = screen.getByRole("button", {
      name: "M.ZORK (offline) left a comment",
    })
    expect(widget).toHaveAttribute("data-annotation-id", "executive-cached-roof")
    expect(widget).toHaveAttribute("aria-pressed", "false")

    widget.focus()
    fireEvent.click(widget)
    expect(widget).toHaveFocus()
    expect(onActivate).toHaveBeenCalledWith(
      "executive-cached-roof",
      expect.objectContaining({ type: "click" }),
    )
  })

  it("focuses an opened annotation chat, closes it with Escape, and restores focus", async () => {
    render(<ChatHarness />)
    const trigger = screen.getByRole("button", { name: "Open cached-roof comment" })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole("dialog", { name: "M.ZORK (offline)" })
    expect(dialog).toHaveAttribute("open")
    expect(dialog).toHaveAttribute("aria-modal", "false")
    expect(
      screen.getByText("A timestamp is not necessarily the time something happened."),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Close annotation chat" })).toHaveFocus(),
    )

    fireEvent.keyDown(dialog, { key: "Escape" })
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it("presents the data summary as a labelled native table and closes it with Escape", async () => {
    render(<SummaryHarness />)
    const trigger = screen.getByRole("button", { name: "Open data summary" })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole("dialog", {
      name: "Executive telemetry · data summary",
    })
    expect(dialog).toHaveAttribute("aria-modal", "false")
    expect(screen.getByRole("table")).toHaveAccessibleName(
      "Executive telemetry fields needed to judge the roof ping",
    )
    expect(screen.getByRole("columnheader", { name: "Event time" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Observed time" })).toBeInTheDocument()
    expect(screen.getByRole("rowheader", { name: "09:14" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "09:06" })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Close data summary" })).toHaveFocus(),
    )

    fireEvent.keyDown(dialog, { key: "Escape" })
    await waitFor(() => expect(dialog).not.toHaveAttribute("open"))
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it("keeps narrative, chart, choices, and support in semantic reading order", () => {
    const { container } = render(
      <CgaShell
        title="ANALYST ADVENTURE"
        location={{ title: "Executive Suite" }}
        narrative={<p>Read the two clocks.</p>}
        chart={<div>Executive telemetry chart</div>}
        chartLabel="Executive Suite analytical puzzle"
        choices={
          <ChoicePanel
            choices={[
              { id: "roof", label: "Trust the roof" },
              { id: "cache", label: "Compare observed time" },
            ]}
          />
        }
        status={<p>Credibility 100</p>}
        evidence={<p>Evidence diskette empty</p>}
      />,
    )

    const narrative = container.querySelector(".aa-shell__narrative")
    const chart = screen.getByRole("region", { name: "Executive Suite analytical puzzle" })
    const choices = container.querySelector(".aa-shell__choices")
    const support = screen.getByRole("complementary", { name: "Case status and evidence" })

    expect(narrative.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(chart.compareDocumentPosition(choices) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(choices.compareDocumentPosition(support) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole("button", { name: "Trust the roof" })).toHaveAttribute(
      "aria-keyshortcuts",
      "1",
    )
    expect(screen.getByRole("button", { name: "Compare observed time" })).toHaveAttribute(
      "aria-keyshortcuts",
      "2",
    )
  })

  it("replaces solved choices with a focused analytical debrief", async () => {
    const { container } = render(<ChoiceResolutionHarness />)

    fireEvent.click(screen.getByRole("button", { name: "Compare observed time" }))

    expect(screen.queryByRole("button", { name: "Trust the roof" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Compare observed time" })).not.toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Cache busted. Helicopter drama cancelled." }),
    ).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(
      "The displayed roof ping was eight minutes stale.",
    )
    await waitFor(() =>
      expect(container.querySelector(".aa-choice-panel__resolution")).toHaveFocus(),
    )
  })
})
