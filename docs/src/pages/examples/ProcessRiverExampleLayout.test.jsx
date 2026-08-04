import React from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import ProcessRiverExampleLayout from "./ProcessRiverExampleLayout"

function wrap(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe("ProcessRiverExampleLayout", () => {
  it("renders theme class + shared process-river structure without sibling BEM roots", () => {
    const { container } = wrap(
      <ProcessRiverExampleLayout
        pageTitle="Test River"
        themeClass="demo-river-theme"
        masthead={{
          kicker: "A HISTORY RIVER",
          title: <h2>DEMO<br />RIVER</h2>,
          copy: <p>Conserved width through time.</p>,
          tagline: "Time falls.",
        }}
        readingKey={[
          { icon: "↓", title: "READ DOWN", body: "Time runs top to bottom." },
          { icon: "≈", title: "FOLLOW WIDTH", body: "Mass is conserved." },
          { icon: "↯", title: "WATCH SHAPE", body: "Splits and merges." },
        ]}
        river={{
          idPrefix: "demo",
          kicker: "01 / River",
          title: "The main chart",
          intro: "A process river.",
          chart: <div data-testid="demo-chart">chart</div>,
          reader: <aside data-testid="demo-reader">reader</aside>,
          caption: "Width is a share of the endpoint.",
        }}
        findings={{
          kicker: "02 / Findings",
          title: "Three shapes",
          items: [
            { eyebrow: "A", title: "First", body: "One." },
            { eyebrow: "B", title: "Second", body: "Two." },
          ],
        }}
        method={{
          kicker: "04 / Method",
          title: "How width is defined",
          body: <p>Endpoint carried backward.</p>,
          sources: [
            { id: "s1", href: "https://example.com", label: "Data", title: "Source", use: "ledger" },
          ],
        }}
        code={{
          kicker: "05 / Code",
          title: "Minimal ProcessSankey",
          intro: "Vertical orientation.",
          source: "<ProcessSankey orientation=\"vertical\" />",
        }}
        footer={{
          kicker: "DEMO / FOOTER",
          tagline: "Scaffold with tokens only.",
          stats: "1 chart · 0 sibling imports",
        }}
      />,
    )

    const root = container.querySelector(".process-river.demo-river-theme")
    expect(root).toBeTruthy()
    expect(container.querySelector(".germany-becoming")).toBeNull()
    expect(container.querySelector(".usa-becoming")).toBeNull()

    expect(screen.getByText("A HISTORY RIVER")).toBeTruthy()
    expect(screen.getByTestId("demo-chart")).toBeTruthy()
    expect(screen.getByTestId("demo-reader")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "The main chart" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Three shapes" })).toBeTruthy()
    expect(screen.getByText("Source")).toBeTruthy()
    expect(screen.getByText("Scaffold with tokens only.")).toBeTruthy()
  })
})
