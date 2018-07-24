// @flow
import React from "react"
import AnnotationLabel from "react-annotation/lib/Types/AnnotationLabel"

type Props = {
  noteData: {
    eventListeners: Object,
    events: Object,
    type: *,
    screenCoordinates: Array<Array<number>>,
    // What is this type supposed to be? It gets used only in a boolean context
    // I mostly assume this is used to indicate the presence of `nx`, `ny`, `dx`, `dy`
    coordinates: boolean,
    nx: number,
    ny: number,
    dx: number,
    dy: number,
    // TODO: What should this be typed as?
    note: Object
  }
}

class SemioticAnnotation extends React.Component<Props, null> {
  render() {
    const { noteData } = this.props
    const { screenCoordinates } = noteData

    const Label =
      typeof noteData.type === "function" ? noteData.type : AnnotationLabel

    const eventListeners = noteData.eventListeners || noteData.events || {}

    if (noteData.coordinates && screenCoordinates) {
      //Multisubject annotation
      const setNX = noteData.nx || screenCoordinates[0][0] + noteData.dx
      const setNY = noteData.ny || screenCoordinates[0][1] + noteData.dy
      const notes = screenCoordinates.map((d, i) => {
        const subjectNote = Object.assign({}, noteData, {
          note: i === 0 ? noteData.note : { label: "" },
          x: d[0],
          y: d[1],
          nx: setNX,
          ny: setNY
        })

        return <Label key={`multi-annotation-${i}`} {...subjectNote} />
      })

      const finalStyle = {}
      if (noteData.events || noteData.eventListeners) {
        finalStyle.pointerEvents = "all"
      }

      return (
        <g {...eventListeners} style={finalStyle}>
          {notes}
        </g>
      )
    }

    const finalAnnotation = <Label events={eventListeners} {...noteData} />

    if (noteData.events) {
      return <g style={{ pointerEvents: "all" }}>{finalAnnotation}</g>
    }

    return finalAnnotation
  }
}

export default SemioticAnnotation
