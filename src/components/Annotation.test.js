import React from "react"
import { render } from '@testing-library/react'
import Annotation from "./Annotation"

const calloutCircleSettings = {
    screenCoordinates: [10, 10],
    dx: -1,
    dy: -120,
    note: {
        label: "Shortest distance home runs.",
        noWrap: true
    },
    connector: { end: "arrow" },
    type: "callout-circle",
    label: "Shortest distance home runs.",
    x: 445.49848889203093,
    y: 182.0050311588817,
    subject: { radius: 12.719798753644739, radiusPadding: 2 },
    i: 0
}

describe("Annotation", () => {
    it("creates a G with proper annotation structure", () => {
        const { container } = render(
            <svg>
                <Annotation noteData={calloutCircleSettings} />
            </svg>
        )

        const annotations = container.getElementsByClassName('annotation')
        const annotationSubjects = container.getElementsByClassName("annotation-subject")
        const annotationConnectors =
          container.getElementsByClassName("annotation-connector")
        expect(annotations.length).toEqual(1)
        expect(annotationSubjects.length).toEqual(1)
        expect(annotationConnectors.length).toEqual(1)
    })
})

describe("Note text positioning", () => {
    it("places text above the note anchor when dy < 0 in topBottom orientation", () => {
        const noteData = {
            x: 200, y: 200,
            dx: 0, dy: -50,
            note: { label: "Test Label" },
            connector: { end: "none" },
            type: "label",
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        const noteContent = container.querySelector(".annotation-note-content")
        expect(noteContent).toBeTruthy()

        // The label text element
        const labelText = container.querySelector(".annotation-note-label")
        expect(labelText).toBeTruthy()

        // With dy < 0, text content should be shifted upward.
        // The annotation-note-content group should have a negative y transform
        // to position text above the note anchor point.
        const contentTransform = noteContent.getAttribute("transform")
        if (contentTransform) {
            const yMatch = contentTransform.match(/translate\([^,]*,\s*(-?[\d.]+)\)/)
            if (yMatch) {
                expect(Number(yMatch[1])).toBeLessThan(0)
            }
        } else {
            // If no transform on content, check that text y attributes are negative
            const yAttr = labelText.getAttribute("y")
            expect(Number(yAttr)).toBeLessThan(0)
        }
    })

    it("places text below the note anchor when dy > 0 in topBottom orientation", () => {
        const noteData = {
            x: 200, y: 100,
            dx: 0, dy: 50,
            note: { label: "Test Label" },
            connector: { end: "none" },
            type: "label",
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        const labelText = container.querySelector(".annotation-note-label")
        expect(labelText).toBeTruthy()

        // With dy > 0, text content should have positive y positioning
        // (text flows below the note anchor)
        const noteContent = container.querySelector(".annotation-note-content")
        const contentTransform = noteContent.getAttribute("transform")
        if (contentTransform) {
            const yMatch = contentTransform.match(/translate\([^,]*,\s*(-?[\d.]+)\)/)
            if (yMatch) {
                expect(Number(yMatch[1])).toBeGreaterThanOrEqual(0)
            }
        }
        // In either case, first tspan should have positive dy
        const tspans = labelText.querySelectorAll("tspan")
        expect(tspans.length).toBeGreaterThan(0)
        expect(Number(tspans[0].getAttribute("dy"))).toBeGreaterThan(0)
    })

    it("centers text horizontally with align=middle in topBottom orientation", () => {
        const noteData = {
            x: 200, y: 200,
            dx: 0, dy: -30,
            note: { label: "Centered Text", align: "middle" },
            connector: { end: "none" },
            type: "label",
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        const labelText = container.querySelector(".annotation-note-label")
        expect(labelText).toBeTruthy()
        expect(labelText.getAttribute("text-anchor")).toEqual("middle")
    })

    it("centers text vertically with align=middle in leftRight orientation", () => {
        const noteData = {
            x: 100, y: 200,
            dx: 80, dy: 0,
            note: { label: "Side Label", orientation: "leftRight", align: "middle" },
            connector: { end: "none" },
            type: "label",
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        const noteContent = container.querySelector(".annotation-note-content")
        expect(noteContent).toBeTruthy()

        // With leftRight + middle, content should be shifted up by half the text height
        const contentTransform = noteContent.getAttribute("transform")
        if (contentTransform) {
            const yMatch = contentTransform.match(/translate\([^,]*,\s*(-?[\d.]+)\)/)
            if (yMatch) {
                expect(Number(yMatch[1])).toBeLessThan(0)
            }
        } else {
            const labelText = container.querySelector(".annotation-note-label")
            const yAttr = labelText.getAttribute("y")
            expect(Number(yAttr)).toBeLessThan(0)
        }
    })
})

describe("Annotation subject rendering", () => {
    it("renders a callout-circle subject with correct radius", () => {
        const noteData = {
            x: 100, y: 100,
            dx: 30, dy: -30,
            note: { label: "Circle" },
            connector: { end: "arrow" },
            type: "callout-circle",
            subject: { radius: 20, radiusPadding: 5 },
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        const circle = container.querySelector(".annotation-subject circle")
        expect(circle).toBeTruthy()
        expect(circle.getAttribute("r")).toEqual("25")
    })

    it("renders a callout-rect subject", () => {
        const noteData = {
            x: 50, y: 50,
            dx: 30, dy: -30,
            note: { label: "Rect" },
            connector: { end: "arrow" },
            type: "callout-rect",
            subject: { width: 100, height: 60 },
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        const rect = container.querySelector(".annotation-subject rect")
        expect(rect).toBeTruthy()
        expect(rect.getAttribute("width")).toEqual("100")
        expect(rect.getAttribute("height")).toEqual("60")
    })

    it("renders xy-threshold horizontal line when only subject.x1/x2 provided", () => {
        const noteData = {
            x: 300, y: 150,
            dx: 0, dy: -20,
            note: { label: "Threshold" },
            connector: { end: "none" },
            type: "xy-threshold",
            subject: { x1: 100, x2: 500 },
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        const subjectLine = container.querySelector(".annotation-subject line")
        expect(subjectLine).toBeTruthy()

        // Should render a horizontal line at y=0 (local coords) spanning x1-x to x2-x
        const y1 = Number(subjectLine.getAttribute("y1"))
        const y2 = Number(subjectLine.getAttribute("y2"))
        expect(y1).toEqual(y2)  // horizontal line

        const x1 = Number(subjectLine.getAttribute("x1"))
        const x2 = Number(subjectLine.getAttribute("x2"))
        expect(x2 - x1).toBeGreaterThan(0)  // line has length
    })

    it("renders xy-threshold vertical line when subject.x is defined", () => {
        const noteData = {
            x: 200, y: 0,
            dx: 50, dy: 20,
            note: { label: "X threshold" },
            connector: { end: "arrow" },
            type: "xy-threshold",
            subject: { x: 200, y1: 0, y2: 300 },
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        const subjectLine = container.querySelector(".annotation-subject line")
        expect(subjectLine).toBeTruthy()

        // vertical line: x1 === x2
        const x1 = Number(subjectLine.getAttribute("x1"))
        const x2 = Number(subjectLine.getAttribute("x2"))
        expect(x1).toEqual(x2)

        const y1 = Number(subjectLine.getAttribute("y1"))
        const y2 = Number(subjectLine.getAttribute("y2"))
        expect(Math.abs(y2 - y1)).toBeGreaterThan(0)  // line has length
    })

    it("renders bracket subject with width", () => {
        const noteData = {
            x: 50, y: 0,
            note: { title: "Category A" },
            type: "bracket",
            subject: { type: "curly", width: 100, depth: -30 },
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        const bracketPath = container.querySelector(".annotation-subject path")
        expect(bracketPath).toBeTruthy()
        expect(bracketPath.getAttribute("d")).toBeTruthy()
    })
})

describe("Connector rendering", () => {
    it("renders an arrow when connector.end is arrow", () => {
        const noteData = {
            x: 100, y: 100,
            dx: 50, dy: -50,
            note: { label: "Arrow" },
            connector: { end: "arrow" },
            type: "label",
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        const connectorGroup = container.querySelector(".annotation-connector")
        expect(connectorGroup).toBeTruthy()
        // Should have a line and an arrow path
        expect(connectorGroup.querySelector("line")).toBeTruthy()
        expect(connectorGroup.querySelector("path")).toBeTruthy()
    })

    it("renders no arrow when connector.end is none", () => {
        const noteData = {
            x: 100, y: 100,
            dx: 50, dy: -50,
            note: { label: "No Arrow" },
            connector: { end: "none" },
            type: "label",
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        const connectorGroup = container.querySelector(".annotation-connector")
        expect(connectorGroup).toBeTruthy()
        expect(connectorGroup.querySelector("line")).toBeTruthy()
        expect(connectorGroup.querySelector("path")).toBeFalsy()
    })

    it("starts connector at circle perimeter for callout-circle", () => {
        const noteData = {
            x: 200, y: 200,
            dx: 100, dy: 0,
            note: { label: "Circle connector" },
            connector: { end: "arrow" },
            type: "callout-circle",
            subject: { radius: 30, radiusPadding: 0 },
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        const line = container.querySelector(".annotation-connector line")
        expect(line).toBeTruthy()

        // With dx=100, dy=0, angle is 0, so startX should be at radius (30)
        const x1 = Number(line.getAttribute("x1"))
        expect(x1).toBeCloseTo(30, 0)
    })
})

describe("Disable prop", () => {
    it("hides connector when disable includes 'connector'", () => {
        const noteData = {
            x: 100, y: 100,
            dx: 50, dy: 20,
            note: { label: "Test" },
            connector: { end: "arrow" },
            type: "xy-threshold",
            subject: { x: 100, y1: 0, y2: 300 },
            disable: ["connector", "note"],
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        // Connector should not render
        const connectorGroup = container.querySelector(".annotation-connector")
        expect(connectorGroup).toBeFalsy()

        // Note should not render
        const noteGroup = container.querySelector(".annotation-note")
        expect(noteGroup).toBeFalsy()

        // Subject should still render
        const subjectGroup = container.querySelector(".annotation-subject")
        expect(subjectGroup).toBeTruthy()
    })

    it("hides subject when disable includes 'subject'", () => {
        const noteData = {
            x: 100, y: 100,
            dx: 50, dy: -30,
            note: { label: "No Subject" },
            connector: { end: "arrow" },
            type: "callout-circle",
            subject: { radius: 20, radiusPadding: 5 },
            disable: ["subject"],
            i: 0
        }
        const { container } = render(
            <svg><Annotation noteData={noteData} /></svg>
        )

        // Subject should not render
        const subjectGroup = container.querySelector(".annotation-subject")
        expect(subjectGroup).toBeFalsy()

        // Connector and note should still render
        const connectorGroup = container.querySelector(".annotation-connector")
        expect(connectorGroup).toBeTruthy()
        const noteGroup = container.querySelector(".annotation-note")
        expect(noteGroup).toBeTruthy()
    })
})
