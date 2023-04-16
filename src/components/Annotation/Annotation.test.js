import React from "react"
import { render } from '@testing-library/react'
import Annotation from "./Annotation"
import { AnnotationCalloutCircle } from "react-annotation"

const simpleNoteSettings = {
    screenCoordinates: [10, 10],
    dx: -1,
    dy: -120,
    note: {
        label: "Shortest distance home runs.",
        noWrap: true
    },
    connector: { end: "arrow" },
    type: AnnotationCalloutCircle,
    label: "Shortest distance home runs.",
    x: 445.49848889203093,
    y: 182.0050311588817,
    subject: { radius: 12.719798753644739, radiusPadding: 2 },
    i: 0

}

describe("Annotation", () => {
    it("creates a G with a React-Annotation note", () => {
        const { container } = render(
            <svg>
                <Annotation noteData={simpleNoteSettings} />
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
