import * as React from "react"
import { render, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Scatterplot } from "semiotic/xy"
import { ThemeProvider } from "../ThemeProvider"
import { renderChartWithEvidence } from "../server/renderToStaticSVG"
import type { AutoPlaceAnnotations } from "../recipes/annotationLayout"
import { describeChart } from "../ai/describeChart"
import { buildNavigationTree } from "../ai/navigationTree"
import { buildReaderGrounding } from "../ai/readerGrounding"

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
  it("keeps the location of the persistent note in live and static charts", async () => {
    const primary = { type: "text", x: 1.5, y: 1.5, label: "Core", emphasis: "primary" }
    const secondary = { ...primary, label: "Detail", emphasis: "secondary" }
    const policy = { density: { maxAnnotations: 1 }, progressiveDisclosure: true }
    const config = (annotations: typeof primary[]) => ({ ...props, annotations, autoPlaceAnnotations: policy })
    const { container, rerender } = render(<Scatterplot {...config([primary])} />)
    const coordinates = (el: Element) => [el.getAttribute("x"), el.getAttribute("y")]
    const live = () => within(container).findByText("Core", { selector: "svg text" })
    const exported = (notes: typeof primary[]) => {
      const { svg } = renderChartWithEvidence("Scatterplot", config(notes))
      return new DOMParser().parseFromString(svg, "image/svg+xml")
    }
    const solo = coordinates(await live())
    const batch = [secondary, primary]
    rerender(<Scatterplot {...config(batch)} />)
    expect(coordinates(await live())).toEqual(solo)
    for (const root of [exported(batch), container]) {
      expect(root.querySelector(".annotation-deferred")?.textContent).toBe("Detail")
    }
    const core = (root: Document) => Array.from(root.querySelectorAll("text")).find(el => el.textContent === "Core")!
    expect(coordinates(core(exported(batch)))).toEqual(coordinates(core(exported([primary]))))
  })

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

  const frameNote = {
    ...note,
    label: "Replacement note",
    audienceText: { long: "An editorial correction replaced the first reading.", short: "Corrected" },
  }
  it.each([
    {
      name: "an audience in frameProps", frameProps: { autoPlaceAnnotations: { audience: expert } },
      visual: "Provisional", reading: full
    },
    {
      name: "a disabled frame override", autoPlaceAnnotations: { audience: expert },
      frameProps: { autoPlaceAnnotations: false }, visual: note.label, reading: note.label
    },
    {
      name: "notes and audience in frameProps", frameProps: { annotations: [frameNote], autoPlaceAnnotations: { audience: expert } },
      visual: "Corrected", reading: frameNote.audienceText.long
    },
    {
      name: "frame notes with a chart-level audience", autoPlaceAnnotations: { audience: expert },
      frameProps: { annotations: [frameNote] }, visual: "Corrected", reading: frameNote.audienceText.long
    }
  ])("uses the rendered reading for $name in prose and navigation", async ({ frameProps, autoPlaceAnnotations, visual, reading }) => {
    const config = { ...props, annotations: [note], autoPlaceAnnotations, frameProps }
    const { container } = render(<Scatterplot {...config} />)
    const { svg } = renderChartWithEvidence("Scatterplot", config)
    const exported = new DOMParser().parseFromString(svg, "image/svg+xml")
    expect(await within(container).findByText(visual, { selector: "svg text" })).toBeVisible()
    expect(exported.querySelector(".semiotic-annotations text")?.textContent).toBe(visual)
    expect(describeChart("Scatterplot", config).annotations).toContain(`labeled "${reading}"`)
    const branch = buildNavigationTree("Scatterplot", config).children?.find(node => node.id === "annotations")
    expect(branch?.children?.[0].label).toContain(`labeled "${reading}"`)
    expect(buildReaderGrounding("Scatterplot", config).description.annotations).toContain(reading)
  })

  it("keeps a frame override that clears chart notes, including generated regression notes", () => {
    const config = { ...props, regression: true, frameProps: { annotations: [], autoPlaceAnnotations: { audience: expert } } }
    expect(renderChartWithEvidence("Scatterplot", config).evidence.annotationCount).toBe(0)
    expect(describeChart("Scatterplot", config).annotations).toBeUndefined()
    expect(buildNavigationTree("Scatterplot", config).children?.some(n => n.id === "annotations")).toBe(false)
  })

  it("respects the physics charts' top-level annotation precedence and falls back to frame props", () => {
    const config = {
      data: [{ id: "a", value: 1 }, { id: "b", value: 2 }], valueAccessor: "value", bins: 3,
      frameProps: { annotations: [frameNote], autoPlaceAnnotations: { audience: expert } }
    }
    for (const [chartProps, visual, reading] of [
      [config, frameNote.audienceText.short, frameNote.audienceText.long],
      [{ ...config, annotations: [note], autoPlaceAnnotations: false }, note.label, note.label]
    ] as const) {
      const { svg } = renderChartWithEvidence("GaltonBoardChart", chartProps)
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
      expect(doc.querySelector(".semiotic-annotations text")?.textContent).toBe(visual)
      expect(describeChart("GaltonBoardChart", chartProps).annotations).toContain(reading)
      const branch = buildNavigationTree("GaltonBoardChart", chartProps).children?.find(n => n.id === "annotations")
      expect(branch?.children?.[0].label).toContain(reading)
    }
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
