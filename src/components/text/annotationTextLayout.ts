/** Internal bridge: the optional text entry supplies this callback to notes. */
export interface AnnotationNoteText {
  label?: string
  title?: string
  wrap?: number
  noWrap?: boolean
  _noteLayout?: (note: AnnotationNoteText) => AnnotationNoteLayout | undefined
}

export interface AnnotationNoteLayout {
  labelLines: string[]
  titleLines: string[]
  width: number
  height: number
  textProps: {
    "data-text-layout": string
    fontFamily: string
    fontSize: number
    fontWeight: string | number
    fontStyle: "normal"
  }
  lineHeight: number
  titleFontWeight: string | number
}

/** Project frame annotations into the common live/static note renderer. */
export function annotationNote(note: AnnotationNoteText): AnnotationNoteText {
  return {
    label: note.label,
    title: note.title,
    wrap: note.wrap || 120,
    noWrap: typeof note._noteLayout === "function" ? note.noWrap : undefined,
    _noteLayout: note._noteLayout
  }
}

export function measureAnnotationNote(
  note: AnnotationNoteText
): AnnotationNoteLayout | undefined {
  return typeof note._noteLayout === "function"
    ? note._noteLayout(note)
    : undefined
}

/** Shared fallback for rendering and placement, retaining their existing estimates. */
export function wrapAnnotationText(
  text: string | undefined,
  wrap: number,
  charWidth: number
): string[] {
  if (!text) return []
  const maxChars = Math.max(1, Math.floor(wrap / charWidth))
  const lines: string[] = []
  let line = ""
  for (const word of text.split(/\s+/)) {
    if (!word) continue
    if (line && line.length + 1 + word.length > maxChars) {
      lines.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  return lines
}
