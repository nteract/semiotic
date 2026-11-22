import * as React from "react"
import { render, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Scatterplot } from "semiotic/xy"
import { ThemeProvider } from "../ThemeProvider"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import type { AutoPlaceAnnotations } from "../recipes/annotationLayout"
import { describeChart } from "../ai/describeChart"
import { buildNavigationTree } from "../ai/navigationTree"

const full = "The last week includes provisional readings."
const note = {
  type: "text", x: 2, y: 2, dx: -18, dy: 12, label: "Preliminary results",
  audienceText: { long: full, short: "Provisional" },
  mobileText: "Latest week*"
}
const props = {
  data: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
  xAccessor: "x" as const, yAccessor: "y" as const, width: 400, height: 250,
  title: "Weekly readings", summary: "Survey results.",
  annotations: [note, { type: "text", x: 1, y: 1, label: "First week", cohesion: "blended" }]
}
const expert = { familiarity: { Scatterplot: 5 } }

describe("annotation policy on a public chart", () => {
  it.each(["light", "dark"] as const)("cascades theme, chart and note cohesion in %s live and static output", async mode => {
    const theme = { mode, annotationCohesion: "layer" as const, colors: { annotation: "#347566" } }
    const view = (layout?: AutoPlaceAnnotations) => (
      <ThemeProvider theme={theme}><Scatterplot {...props} autoPlaceAnnotations={layout} /></ThemeProvider>
    )
    const { container, rerender } = render(view())
    for (const layout of [undefined, { audience: expert, cohesion: "blended" as const }]) {
      rerender(view(layout))
      const { svg, evidence } = renderChartWithEvidence("Scatterplot", { ...props, theme, autoPlaceAnnotations: layout })
      expect(evidence.markCount).toBe(2)
      expect(evidence.annotationCount).toBe(2)
      const exported = new DOMParser().parseFromString(svg, "image/svg+xml")
      for (const root of [container, exported]) {
        await waitFor(() => {
          expect(root.querySelectorAll(".annotation-cohesion--blended")).toHaveLength(layout ? 2 : 1)
          expect(root.querySelectorAll(".annotation-cohesion--layer")).toHaveLength(layout ? 0 : 1)
          expect(Array.from(root.querySelectorAll(".annotation-cohesion--blended text")).map(t => t.textContent))
            .toContain("First week")
        })
      }
      if (layout) {
        expect(container.querySelector('[role="note"]')).toHaveTextContent(`Survey results. ${full}`)
        expect(exported.querySelector("svg > desc")?.textContent).toBe(full)
        for (const root of [container, exported]) {
          expect(root.querySelector(".annotation-cohesion--blended text")?.textContent).toBe("Provisional")
        }
      } else {
        expect(exported.querySelector(".semiotic-annotations")?.getAttribute("style")).toContain("#347566")
      }
    }
  })

  it("uses mobile wording while retaining the long reading in the SVG, prose and navigation tree", () => {
    const config = { ...props, autoPlaceAnnotations: { audience: expert, mobile: true } }
    const { svg } = renderChartWithEvidence("Scatterplot", config)
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
    expect(doc.querySelector(".semiotic-annotations text")?.textContent).toBe("Latest week*")
    expect(doc.querySelector("svg > desc")?.textContent).toBe(full)
    expect(describeChart("Scatterplot", config).annotations).toContain(full)
    const branch = buildNavigationTree("Scatterplot", config).children?.find(node => node.id === "annotations")
    expect(branch?.children?.[0].label).toContain(full)
  })

  it("uses mobile cohesion ahead of the theme, while letting a note override both", () => {
    const { svg } = renderChartWithEvidence("Scatterplot", {
      ...props,
      theme: { annotationCohesion: "blended" },
      autoPlaceAnnotations: { mobile: { cohesion: "layer" } }
    })
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
    expect(doc.querySelector(".annotation-cohesion--layer text")?.textContent).toBe("Latest week*")
    expect(doc.querySelector(".annotation-cohesion--blended text")?.textContent).toBe("First week")
  })

  it("retains the original label when only a short variant exists and omits retracted notes", () => {
    const { svg } = renderChartWithEvidence("Scatterplot", {
      ...props,
      annotations: [
        { ...note, audienceText: { short: "Brief" } },
        { ...note, lifecycle: { status: "retracted" } }
      ],
      autoPlaceAnnotations: { audience: expert }
    })
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
    expect(doc.querySelector(".semiotic-annotations text")?.textContent).toBe("Brief")
    expect(doc.querySelector("svg > desc")?.textContent).toBe(note.label)
  })

  it("produces identical static SVG with and without unused audience variants", () => {
    const { audienceText: _unused, ...plain } = note
    const config = { ...props, autoPlaceAnnotations: { mobile: true } }
    const { svg } = renderChartWithEvidence("Scatterplot", config)
    expect(svg).toBe(renderChartWithEvidence("Scatterplot", { ...config, annotations: [plain, props.annotations[1]] }).svg)
  })
})
