import { bumpAnnotations } from "./annotationHandling"

const annotations = [
    { props: { noteData: { x: 400, y: 40, note: { label: "Test label", wrap: 200 } } } },
    { props: { noteData: { x: 400, y: 40, note: { label: "Test label that is very very very long, like longer than it should be you know", wrap: 200 } } } },
    { props: { noteData: { x: 400, y: 50, note: { title: "Test label in title prop", wrap: 200 } } } }
]
const size = [500, 500]

const annotationProcessor = {
    type: "bump"
    /*,characterWidth?: number
    lineWidth?: number
    lineHeight?: number
    padding?: number
    iterations?: number
    pointSizeFunction?: Function
    labelSizeFunction?: Function
    marginOffset?: number
    */
}
describe("annotationHandling", () => {

    const bumpedAnnotations = bumpAnnotations(annotations,
        annotationProcessor,
        size
    )

    const annotation1 = bumpedAnnotations[0].props.noteData
    const annotation2 = bumpedAnnotations[1].props.noteData
    const annotation3 = bumpedAnnotations[2].props.noteData

    it("basicLabelSizeFunction works with simple notes", () => {
        expect(annotation1.nx).toBeLessThan(annotation2.nx)
        expect(annotation2.ny).toBeLessThan(annotation3.ny)
    })

}
)