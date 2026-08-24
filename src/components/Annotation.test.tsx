import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import * as React from "react"
import Annotation, { type AnnotationProps } from "./Annotation"

type NoteData = AnnotationProps["noteData"]

function note(overrides: Partial<NoteData> = {}): NoteData {
  return {
    type: "label",
    x: 0,
    y: 0,
    note: { label: "Test label" },
    ...overrides
  }
}

function renderAnnotation(overrides: Partial<NoteData> = {}) {
  return render(
    <svg>
      <Annotation noteData={note(overrides)} />
    </svg>
  )
}

function required<T extends Element>(
  container: HTMLElement,
  selector: string
): T {
  const element = container.querySelector<T>(selector)
  expect(element).not.toBeNull()
  if (!element) throw new Error(`Missing annotation element: ${selector}`)
  return element
}

describe("Annotation structure and note positioning", () => {
  it("renders the annotation, subject, and connector structure", () => {
    const { container } = renderAnnotation({
      type: "callout-circle",
      x: 445,
      y: 182,
      dx: -1,
      dy: -120,
      connector: { end: "arrow" },
      subject: { radius: 12, radiusPadding: 2 }
    })

    expect(container.querySelectorAll(".annotation")).toHaveLength(1)
    expect(container.querySelectorAll(".annotation-subject")).toHaveLength(1)
    expect(container.querySelectorAll(".annotation-connector")).toHaveLength(1)
  })

  it("places top/bottom note text on the side selected by dy", () => {
    const above = renderAnnotation({ x: 200, y: 200, dy: -50 })
    const aboveContent = required<SVGGElement>(
      above.container,
      ".annotation-note-content"
    )
    const aboveTransform = aboveContent.getAttribute("transform")
    const aboveY = aboveTransform?.match(
      /translate\([^,]*,\s*(-?[\d.]+)\)/
    )?.[1]
    expect(Number(aboveY)).toBeLessThan(0)

    above.unmount()

    const below = renderAnnotation({ x: 200, y: 100, dy: 50 })
    const belowContent = required<SVGGElement>(
      below.container,
      ".annotation-note-content"
    )
    const belowTransform = belowContent.getAttribute("transform")
    const belowY = belowTransform?.match(
      /translate\([^,]*,\s*(-?[\d.]+)\)/
    )?.[1]
    expect(Number(belowY)).toBeGreaterThanOrEqual(0)

    const firstLine = required<SVGTSpanElement>(
      below.container,
      ".annotation-note-label tspan"
    )
    expect(Number(firstLine.getAttribute("dy"))).toBe(0)
  })

  it("centers top/bottom text when align is middle", () => {
    const { container } = renderAnnotation({
      x: 200,
      y: 200,
      dy: -30,
      note: { label: "Centered text", align: "middle" }
    })

    expect(
      required<SVGTextElement>(
        container,
        ".annotation-note-label"
      ).getAttribute("text-anchor")
    ).toBe("middle")
  })

  it("centers left/right text vertically when align is middle", () => {
    const { container } = renderAnnotation({
      x: 100,
      y: 200,
      dx: 80,
      note: {
        label: "Side label",
        orientation: "leftRight",
        align: "middle"
      }
    })

    const transform = required<SVGGElement>(
      container,
      ".annotation-note-content"
    ).getAttribute("transform")
    const y = transform?.match(/translate\([^,]*,\s*(-?[\d.]+)\)/)?.[1] ?? "0"
    expect(Number(y)).toBeLessThanOrEqual(0)
  })
})

describe("Annotation subjects", () => {
  it("renders a callout-circle with radius padding", () => {
    const { container } = renderAnnotation({
      type: "callout-circle",
      subject: { radius: 20, radiusPadding: 5 }
    })

    expect(
      required<SVGCircleElement>(
        container,
        ".annotation-subject circle"
      ).getAttribute("r")
    ).toBe("25")
  })

  it("renders callout-rect dimensions", () => {
    const { container } = renderAnnotation({
      type: "callout-rect",
      subject: { width: 100, height: 60 }
    })
    const rect = required<SVGRectElement>(container, ".annotation-subject rect")

    expect(rect.getAttribute("width")).toBe("100")
    expect(rect.getAttribute("height")).toBe("60")
  })

  it("renders a horizontal xy-threshold from x1/x2", () => {
    const { container } = renderAnnotation({
      type: "xy-threshold",
      x: 300,
      y: 150,
      subject: { x1: 100, x2: 500 }
    })
    const line = required<SVGLineElement>(container, ".annotation-subject line")

    expect(Number(line.getAttribute("y1"))).toBe(
      Number(line.getAttribute("y2"))
    )
    expect(
      Number(line.getAttribute("x2")) - Number(line.getAttribute("x1"))
    ).toBeGreaterThan(0)
  })

  it("renders a vertical xy-threshold from subject.x", () => {
    const { container } = renderAnnotation({
      type: "xy-threshold",
      x: 200,
      subject: { x: 200, y1: 0, y2: 300 }
    })
    const line = required<SVGLineElement>(container, ".annotation-subject line")

    expect(Number(line.getAttribute("x1"))).toBe(
      Number(line.getAttribute("x2"))
    )
    expect(
      Math.abs(
        Number(line.getAttribute("y2")) - Number(line.getAttribute("y1"))
      )
    ).toBeGreaterThan(0)
  })

  it("renders a bracket path", () => {
    const { container } = renderAnnotation({
      type: "bracket",
      note: { title: "Category A" },
      subject: { type: "curly", width: 100, depth: -30 }
    })

    expect(
      required<SVGPathElement>(
        container,
        ".annotation-subject path"
      ).getAttribute("d")
    ).toBeTruthy()
  })
})

describe("Annotation connectors", () => {
  const connectorBase: Partial<NoteData> = {
    x: 100,
    y: 100,
    dx: 40,
    dy: -40
  }

  it("renders a straight line and arrowhead by default", () => {
    const { container } = renderAnnotation({
      ...connectorBase,
      connector: { end: "arrow" }
    })
    const group = required<SVGGElement>(container, ".annotation-connector")

    expect(group.querySelector("line")).not.toBeNull()
    expect(group.querySelector("path")).not.toBeNull()
    expect(container.innerHTML).not.toContain("connector-curve")
  })

  it("supports an explicit no-arrow connector", () => {
    const { container } = renderAnnotation({
      ...connectorBase,
      connector: { end: "none" }
    })
    const group = required<SVGGElement>(container, ".annotation-connector")

    expect(group.querySelector("line")).not.toBeNull()
    expect(group.querySelector("path")).toBeNull()
  })

  it("starts a callout-circle connector at the subject perimeter", () => {
    const { container } = renderAnnotation({
      type: "callout-circle",
      x: 200,
      y: 200,
      dx: 100,
      dy: 0,
      connector: { end: "arrow" },
      subject: { radius: 30, radiusPadding: 0 }
    })

    expect(
      Number(
        required<SVGLineElement>(
          container,
          ".annotation-connector line"
        ).getAttribute("x1")
      )
    ).toBeCloseTo(30, 0)
  })

  it("renders a quadratic curve when requested", () => {
    const { container } = renderAnnotation({
      ...connectorBase,
      connector: { type: "curve", end: "arrow" }
    })
    const curve = required<SVGPathElement>(container, ".connector-curve")

    expect(curve.getAttribute("d")).toMatch(/^M0,0Q/)
  })

  it("keeps the closed arrowhead on a curved connector", () => {
    const { container } = renderAnnotation({
      ...connectorBase,
      connector: { type: "curve", end: "arrow" }
    })
    const paths = Array.from(
      container.querySelectorAll<SVGPathElement>(".annotation-connector path")
    )

    expect(
      paths.some((path) => /^M0,0L.*Z$/.test(path.getAttribute("d") ?? ""))
    ).toBe(true)
  })
})

describe("Annotation disable controls", () => {
  it("can hide the connector and note while retaining the subject", () => {
    const { container } = renderAnnotation({
      type: "xy-threshold",
      x: 100,
      y: 100,
      dx: 50,
      dy: 20,
      connector: { end: "arrow" },
      subject: { x: 100, y1: 0, y2: 300 },
      disable: ["connector", "note"]
    })

    expect(container.querySelector(".annotation-connector")).toBeNull()
    expect(container.querySelector(".annotation-note")).toBeNull()
    expect(container.querySelector(".annotation-subject")).not.toBeNull()
  })

  it("can hide the subject while retaining the connector and note", () => {
    const { container } = renderAnnotation({
      type: "callout-circle",
      x: 100,
      y: 100,
      dx: 50,
      dy: -30,
      connector: { end: "arrow" },
      subject: { radius: 20, radiusPadding: 5 },
      disable: ["subject"]
    })

    expect(container.querySelector(".annotation-subject")).toBeNull()
    expect(container.querySelector(".annotation-connector")).not.toBeNull()
    expect(container.querySelector(".annotation-note")).not.toBeNull()
  })
})
