import * as React from "react"
import AnnotationLabel from "react-annotation/lib/Types/AnnotationLabel"

import { AnnotationProps } from "./types/annotationTypes"
import { GenericObject } from "./types/generalTypes"

const interactivityFns = ["onDragEnd", "onDragStart", "onDrag"]

class SemioticAnnotation extends React.Component<AnnotationProps, null> {
  render() {
    const { noteData: baseNoteData } = this.props
    const { screenCoordinates } = baseNoteData

    const noteData = { ...baseNoteData }

    interactivityFns.forEach(d => {
      if (baseNoteData[d]) {
        delete noteData[d]
        const originalFn = baseNoteData[d]
        noteData[d] = updatedSettingsFromRA => {
          originalFn({
            originalSettings: baseNoteData,
            updatedSettings: updatedSettingsFromRA,
            noteIndex: baseNoteData.i
          })
        }
      }
    })

    const AnnotationType =
      typeof noteData.type === "function" ? noteData.type : AnnotationLabel

    const eventListeners = noteData.eventListeners || noteData.events || {}
    const finalStyle: GenericObject = {}
    if (noteData.events || noteData.eventListeners || noteData.editMode) {
      finalStyle.pointerEvents = "all"
    }

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
        return <AnnotationType key={`multi-annotation-${i}`} {...subjectNote} />
      })

      return (
        <g {...eventListeners} style={finalStyle}>
          {notes}
        </g>
      )
    }

    const finalAnnotation = (
      <AnnotationType events={eventListeners} {...noteData} />
    )

    if (finalStyle.pointerEvents) {
      return <g style={finalStyle}>{finalAnnotation}</g>
    }

    return finalAnnotation
  }
}

export default SemioticAnnotation
