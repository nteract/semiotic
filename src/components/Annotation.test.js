import React from "react"
import { mount } from "enzyme"
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

    /*
    it("renders without crashing", () => {
        shallow(<Annotation noteData={simpleNoteSettings} />)
    })
    */
    const mountedLayerWithOptions = mount(
        <svg>
            <Annotation
                noteData={simpleNoteSettings}
            />
        </svg>
    )
    it("creates a G with a React-Annotation note", () => {
        expect(mountedLayerWithOptions.find("g.annotation").length).toEqual(1)
        expect(mountedLayerWithOptions.find("g.annotation-subject").length).toEqual(1)
        expect(mountedLayerWithOptions.find("g.annotation-connector").length).toEqual(1)
    })


})
