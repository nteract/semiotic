import React from 'react';

function marginOffsetFn(orient, axisSettings, marginOffset) {
  if (typeof marginOffset === "number") {
    return marginOffset
  }
  if (axisSettings && axisSettings.find((d) => d.props.orient === orient)) {
    return 50
  }
  return 10
}

const keyFromSVGAnnotations = (
  adjustableAnnotations,
  annotationProcessor,
  size
) => {
  return `${adjustableAnnotations
    .map(adjustedAnnotationKeyMapper)
    .join(",")}${JSON.stringify(annotationProcessor)}${size.join(",")}`
}

function adjustedAnnotationKeyMapper(d) {
  if (!d.props?.noteData) {
    return ""
  }
  const { note = {} } = d.props.noteData
  const { label, title } = note
  const id =
    d.props.noteData.id || `${d.props.noteData.x}-${d.props.noteData.y}`
  return `${id}-${label}=${title}`
}

function safeStringify(value) {
  const seen = new Set()
  return JSON.stringify(value, (k, v) => {
    if (seen.has(v)) {
      return "..."
    }
    if (typeof v === "object") {
      seen.add(v)
      if (k === "note") {
        return `${v.label}-${v.title}`
      }
      if (k === "connector") {
        return `${v.end}-${v.type}`
      }
      if (k === "subject") {
        return `${v.radius}`
      }
      if (typeof v.column === "object") {
        return `${v.column.x}-${v.column.y}-${v.column.name}`
      }

      if (
        v.voronoiX ||
        v.voronoiY ||
        v.x ||
        v.y ||
        v.dx ||
        v.dy ||
        v.label ||
        v.type ||
        v.key ||
        v.hierarchicalID ||
        v.id ||
        v.name
      ) {
        return `${v.voronoiX}-${v.voronoiY}-${v.dx}-${v.dy}-${v.x}-${v.y}-${v.label}-${v.type}-${v.key}-${v.hierarchicalID}-${v.id}-${v.name}`
      }

      return "..."
    }
    return v
  })
}

function noteDataWidth(noteData, charWidth = 8, layoutNoteWidth) {
  let { noteWidth = layoutNoteWidth } = noteData

  let noteWidthFn = noteWidth

  if (typeof noteWidth === "number") {
    noteWidthFn = () => noteWidth
  }

  const wrap = (noteData.note && noteData.note.wrap) || 120
  const noteText = noteData.note.label || noteData.note.label || ""
  const width =
    (noteWidth && noteWidthFn(noteData)) ||
    (React.isValidElement(noteData.note)
      ? 100
      : Math.min(wrap, noteText.length * charWidth))
  return width
}

function noteDataHeight(
  noteData,
  charWidth = 8,
  lineHeight = 20,
  layoutNoteHeight
) {
  let { noteHeight = layoutNoteHeight } = noteData

  let noteHeightFn = noteHeight

  if (typeof noteHeight === "number") {
    noteHeightFn = () => noteHeight
  }
  const wrap = (noteData.note && noteData.note.wrap) || 120
  const text = noteData.note.label || noteData.note.title || ""
  
  const height =
    (noteHeight && noteHeightFn(noteData)) ||
    (React.isValidElement(noteData.note)
      ? 30
      : Math.ceil((text.length * charWidth) / wrap) * lineHeight +
        (noteData.note.label && noteData.note.title ? lineHeight : 0))

  return height
}

export {
  marginOffsetFn,
  adjustedAnnotationKeyMapper,
  safeStringify,
  noteDataWidth,
  noteDataHeight,
  keyFromSVGAnnotations
}
