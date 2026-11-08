import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "semiotic/server/edge"
import { compactCaptionProps } from "./CompactCaptionChart"

describe("compact legend/caption composition", () => {
  it("exports real lines and a serializable text row within the reserved chart margin", () => {
    const props = JSON.parse(JSON.stringify(compactCaptionProps))
    const { svg, evidence } = renderChartWithEvidence("LineChart", props, { precision: 3 })
    expect(evidence.empty).toBe(false)
    expect(evidence.markCountByType.line).toBe(2)
    expect(evidence.xDomain).toEqual([1, 4])
    expect(evidence.annotationCount).toBe(5)
    expect(evidence.ariaLabel).toBe(props.description)
    const document = new DOMParser().parseFromString(svg, "image/svg+xml")
    expect(document.querySelector("parsererror")).toBeNull()
    const labels = ["Direct: 34", "Partner: 21", "Week 4 · 55 orders"]
    const row = labels.map((label) => {
      const text = [...document.querySelectorAll("text")].find((node) => node.textContent === label)
      expect(text, label).toBeDefined()
      return text!
    })
    expect(row.map((text) => Number(text.getAttribute("x")))).toEqual([12, 162, 572])
    expect(row.map((text) => text.getAttribute("text-anchor"))).toEqual(["start", "start", "end"])
    for (const text of row) {
      // Include the renderer's plot translation (including space for the title).
      const transform = text.closest("g[transform]")!.getAttribute("transform")!
      const [, , top] = transform.match(/translate\(([-\d.]+)[ ,]+([-\d.]+)\)/)!
      const y = Number(text.getAttribute("y")) + Number(top)
      expect(y).toBe(278)
      expect(y).toBeLessThan(props.height)
      expect(y).toBeGreaterThan(props.height - props.margin.bottom)
    }
    expect(svg).toContain("34 direct and 21 partner orders")
    expect(svg).toContain(props.title)
    const swatches = [...document.querySelectorAll("text")].filter(
      (text) => text.textContent === "●",
    )
    expect(swatches.map((text) => text.getAttribute("fill"))).toEqual(["#2457c5", "#a34b00"])
  })
})
