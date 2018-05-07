import React from "react"
import AnnotationLabel from "react-annotation/lib/Types/AnnotationLabel"

import PropTypes from "prop-types"

class SemioticAnnotation extends React.Component {
  render() {
    const { noteData } = this.props
    const { screenCoordinates } = noteData

    noteData.type =
      typeof noteData.type === "function" ? noteData.type : AnnotationLabel

    const eventListeners = noteData.eventListeners || {}

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

        return <noteData.type key={`multi-annotation-${i}`} {...subjectNote} />
      })

      return <g events={eventListeners}>{notes}</g>
    }

    return <noteData.type events={eventListeners} {...noteData} />
  }
}

SemioticAnnotation.propTypes = {
  noteData: PropTypes.object
}

export default SemioticAnnotation
