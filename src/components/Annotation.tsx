import * as React from "react"

type AnnotationEventHandlers = Record<string, (e: React.SyntheticEvent) => void>

type AnnotationNote = {
  label?: string
  title?: string
  wrap?: number
  orientation?: string
  align?: string
  noWrap?: boolean
  /** Render note text in a foreignObject for browser-native HTML wrapping. */
  useHTML?: boolean
  /** Alias for useHTML. */
  html?: boolean
}

type AnnotationConnector = {
  end?: "arrow"
  type?: "line" | "curve"
  curve?: number
}

type AnnotationSubject = {
  radius?: number
  radiusPadding?: number
  width?: number
  height?: number
  custom?: React.ReactElement | React.ReactElement[]
  x?: number
  y?: number
  x1?: number
  x2?: number
  y1?: number
  y2?: number
  type?: string
  depth?: number
  [key: string]: unknown
}

type AnnotationRendererProps = {
  connector?: AnnotationConnector
  color?: string
  className?: string
  disable?: string[]
  dx?: number
  dy?: number
  events?: AnnotationEventHandlers
  note?: AnnotationNote
  nx?: number
  ny?: number
  opacity?: number
  strokeDasharray?: string
  subject?: AnnotationSubject
  type?: string
  x?: number | number[]
  y?: number | number[]
  "data-testid"?: string
}

/** Props for the single-annotation renderer. Consumed only by `SemioticAnnotation`
 *  below; the broader annotation API flows through the frame-level `annotations`
 *  array and its `svgAnnotationRules` hook. */
export interface AnnotationProps {
  noteData: {
    eventListeners?: AnnotationEventHandlers
    events?: AnnotationEventHandlers
    type: string
    screenCoordinates?: number[][]
    /** When truthy, `screenCoordinates` is read as a sequence of anchor points
     *  and one annotation renders per coordinate with `nx`/`ny` shared. */
    coordinates?: boolean
    noteHeight?: number | ((d: Record<string, unknown>) => number)
    noteWidth?: number | ((d: Record<string, unknown>) => number)
    x: number | number[]
    y: number | number[]
    nx?: number
    ny?: number
    dx?: number
    dy?: number
    note: AnnotationNote
    i?: number
    fixedPosition?: boolean
    label?: string
    connector?: AnnotationConnector
    subject?: AnnotationSubject
    color?: string
    className?: string
    disable?: string[]
    /** SVG opacity cascaded to every stroked/filled child of the annotation. */
    opacity?: number
    /** SVG stroke-dasharray cascaded to every stroked child of the annotation. */
    strokeDasharray?: string
    [key: string]: unknown
  }
}

function wrapText(
  text: string,
  wrap: number = 120,
  charWidth: number = 8
): string[] {
  if (!text) return []
  const maxChars = Math.max(1, Math.floor(wrap / charWidth))
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    if (currentLine && currentLine.length + 1 + word.length > maxChars) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

function bracketPath(
  type: string,
  span: number,
  depth: number,
  isVertical: boolean
): string {
  if (type === "curly") {
    if (isVertical) {
      return `M0,0 C${depth * 0.6},0 ${depth * 0.4},${span / 2} ${depth},${span / 2} C${depth * 0.4},${span / 2} ${depth * 0.6},${span} 0,${span}`
    }
    return `M0,0 C0,${depth * 0.6} ${span / 2},${depth * 0.4} ${span / 2},${depth} C${span / 2},${depth * 0.4} ${span},${depth * 0.6} ${span},0`
  }
  // square bracket
  if (isVertical) {
    return `M0,0 L${depth},0 L${depth},${span} L0,${span}`
  }
  return `M0,0 L0,${depth} L${span},${depth} L${span},0`
}

function renderNote(
  note: AnnotationNote | undefined,
  dx: number,
  dy: number,
  color?: string
) {
  if (!note) return <g className="annotation-note" />
  const {
    label,
    title,
    orientation: explicitOrientation,
    align: explicitAlign,
    wrap = 120,
    noWrap
  } = note

  if (!label && !title) return <g className="annotation-note" />

  let orientation = explicitOrientation
  if (!orientation) {
    orientation = Math.abs(dx) > Math.abs(dy) ? "leftRight" : "topBottom"
  }

  let align = explicitAlign
  if (!align || align === "dynamic") {
    if (orientation === "topBottom") {
      align = dx >= 0 ? "left" : "right"
    } else {
      align = dy >= 0 ? "top" : "bottom"
    }
  }

  let textAnchor: "start" | "middle" | "end" = "start"
  if (orientation === "topBottom") {
    if (align === "right") textAnchor = "end"
    else if (align === "middle") textAnchor = "middle"
  } else {
    textAnchor = dx >= 0 ? "start" : "end"
  }

  const lineHeight = 16
  const labelPad = 2
  const padding = 4
  const titleLines =
    title ? (noWrap ? [title] : wrapText(title, wrap)) : []
  const labelLines =
    label ? (noWrap ? [label] : wrapText(label, wrap)) : []
  const useHTML = note.useHTML || note.html

  // For leftRight orientation, offset text horizontally away from the note-line
  const textX = orientation === "leftRight"
    ? (textAnchor === "end" ? -padding : padding)
    : 0

  let yOffset = 0
  const textElements: React.ReactElement[] = []

  const textFill = color || "var(--semiotic-annotation-color, var(--semiotic-text, #333))"

  if (useHTML) {
    const width = wrap
    const totalLines = titleLines.length + labelLines.length
    const height = Math.max(lineHeight, totalLines * lineHeight + (title && label ? labelPad : 0))
    const foreignObjectX = textAnchor === "end"
      ? textX - width
      : textAnchor === "middle"
        ? textX - width / 2
        : textX
    const textAlign = textAnchor === "end"
      ? "right"
      : textAnchor === "middle"
        ? "center"
        : "left"
    textElements.push(
      <foreignObject
        key="annotation-note-html"
        className="annotation-note-html"
        x={foreignObjectX}
        y={-lineHeight}
        width={width}
        height={height + lineHeight}
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            color: textFill,
            fontSize: "12px",
            lineHeight: `${lineHeight}px`,
            overflow: "visible",
            textAlign,
            whiteSpace: noWrap ? "nowrap" : "normal",
            wordBreak: "break-word"
          }}
        >
          {title && <div className="annotation-note-title" style={{ fontWeight: "bold" }}>{title}</div>}
          {label && <div className="annotation-note-label">{label}</div>}
        </div>
      </foreignObject>
    )
    yOffset = titleLines.length * lineHeight
  } else {
    if (titleLines.length > 0) {
      textElements.push(
        <text
          key="annotation-note-title"
          className="annotation-note-title"
          fill={textFill}
          textAnchor={textAnchor}
          fontWeight="bold"
        >
          {titleLines.map((line, i) => (
            <tspan key={i} x={textX} dy={i === 0 ? 0 : lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      )
      yOffset = titleLines.length * lineHeight
    }

    if (labelLines.length > 0) {
      textElements.push(
        <text
          key="annotation-note-label"
          className="annotation-note-label"
          fill={textFill}
          textAnchor={textAnchor}
          y={yOffset}
        >
          {labelLines.map((line, i) => (
            <tspan key={i} x={textX} dy={i === 0 ? 0 : lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      )
    }
  }

  let noteLine = null
  if ((title || label) && (dx !== 0 || dy !== 0)) {
    if (orientation === "topBottom") {
      const lineWidth = Math.min(wrap, 120)
      let x1 = 0
      let x2 = lineWidth
      if (textAnchor === "end") {
        x1 = -lineWidth
        x2 = 0
      } else if (textAnchor === "middle") {
        x1 = -lineWidth / 2
        x2 = lineWidth / 2
      }
      noteLine = (
        <line
          className="note-line"
          x1={x1}
          x2={x2}
          y1={0}
          y2={0}
          stroke={color || "var(--semiotic-text-secondary, currentColor)"}
        />
      )
    } else {
      const totalHeight =
        (titleLines.length + labelLines.length) * lineHeight +
        (labelLines.length > 0 ? lineHeight : 0)
      let y1 = 0
      let y2 = totalHeight
      if (align === "bottom") {
        y1 = -totalHeight
        y2 = 0
      } else if (align === "middle") {
        y1 = -totalHeight / 2
        y2 = totalHeight / 2
      }
      noteLine = (
        <line
          className="note-line"
          x1={0}
          x2={0}
          y1={y1}
          y2={y2}
          stroke={color || "var(--semiotic-text-secondary, currentColor)"}
        />
      )
    }
  }

  // Compute vertical offset for note content based on orientation and alignment.
  // With first tspan dy=0, the first baseline sits at the content group's y.
  // Subsequent lines are spaced by lineHeight. Total baseline span = (N-1)*lineHeight.
  // labelPad is the gap between the note-line and the nearest text.
  const totalLines = titleLines.length + labelLines.length
  const baselineSpan = Math.max(0, totalLines - 1) * lineHeight
  const labelGap = (labelLines.length > 0 && titleLines.length > 0) ? labelPad : 0
  const visualHeight = baselineSpan + lineHeight + labelGap
  let contentYOffset = 0

  if (orientation === "topBottom") {
    if (dy < 0) {
      // Place text above the note-line
      contentYOffset = -(baselineSpan + labelPad)
    } else {
      // Place text below the note-line
      contentYOffset = labelPad + lineHeight
    }
  } else if (orientation === "leftRight") {
    if (align === "middle") {
      contentYOffset = -(visualHeight / 2) + lineHeight / 2
    } else if (align === "bottom" || dy < 0) {
      contentYOffset = -(baselineSpan + labelPad)
    } else {
      contentYOffset = labelPad + lineHeight
    }
  }

  const contentTransform = contentYOffset !== 0
    ? `translate(0,${contentYOffset})`
    : undefined

  return (
    <g className="annotation-note" transform={`translate(${dx},${dy})`}>
      <g className="annotation-note-content" transform={contentTransform}>{textElements}</g>
      {noteLine}
    </g>
  )
}

function renderSubject(
  type: string,
  subject?: AnnotationSubject,
  color?: string,
  annotX?: number,
  annotY?: number
) {
  const elements: React.ReactElement[] = []

  switch (type) {
    case "callout-circle": {
      const totalRadius =
        (subject?.radius || 0) + (subject?.radiusPadding || 0)
      if (totalRadius > 0) {
        elements.push(
          <circle
            key="subject-circle"
            r={totalRadius}
            fill="none"
            stroke={color || "var(--semiotic-text-secondary, currentColor)"}
          />
        )
      }
      break
    }
    case "callout-rect": {
      const width = subject?.width || 0
      const height = subject?.height || 0
      if (width > 0 || height > 0) {
        elements.push(
          <rect
            key="subject-rect"
            width={width}
            height={height}
            fill="none"
            stroke={color || "var(--semiotic-text-secondary, currentColor)"}
          />
        )
      }
      break
    }
    case "callout-custom": {
      if (subject?.custom) {
        const customElements = Array.isArray(subject.custom)
          ? subject.custom
          : [subject.custom]
        elements.push(...customElements)
      }
      break
    }
    case "xy-threshold": {
      const x = annotX || 0
      const y = annotY || 0

      if (subject?.x !== undefined) {
        const y1 = (subject.y1 || 0) - y
        const y2 = (subject.y2 || 0) - y
        const sx = (subject.x || 0) - x
        elements.push(
          <line
            key="threshold-line"
            x1={sx}
            y1={y1}
            x2={sx}
            y2={y2}
            stroke={color || "var(--semiotic-text-secondary, currentColor)"}
            strokeDasharray="5,5"
          />
        )
      } else if (subject?.y !== undefined) {
        const x1 = (subject.x1 || 0) - x
        const x2 = (subject.x2 || 0) - x
        const sy = (subject.y || 0) - y
        elements.push(
          <line
            key="threshold-line"
            x1={x1}
            y1={sy}
            x2={x2}
            y2={sy}
            stroke={color || "var(--semiotic-text-secondary, currentColor)"}
            strokeDasharray="5,5"
          />
        )
      } else if (subject?.x1 !== undefined || subject?.x2 !== undefined) {
        // Horizontal threshold line when only x1/x2 provided (no subject.x or subject.y)
        const x1 = (subject.x1 || 0) - x
        const x2 = (subject.x2 || 0) - x
        elements.push(
          <line
            key="threshold-line"
            x1={x1}
            y1={0}
            x2={x2}
            y2={0}
            stroke={color || "var(--semiotic-text-secondary, currentColor)"}
            strokeDasharray="5,5"
          />
        )
      } else if (subject?.y1 !== undefined || subject?.y2 !== undefined) {
        // Vertical threshold line when only y1/y2 provided (no subject.x or subject.y)
        const y1 = (subject.y1 || 0) - y
        const y2 = (subject.y2 || 0) - y
        elements.push(
          <line
            key="threshold-line"
            x1={0}
            y1={y1}
            x2={0}
            y2={y2}
            stroke={color || "var(--semiotic-text-secondary, currentColor)"}
            strokeDasharray="5,5"
          />
        )
      }
      break
    }
    case "bracket": {
      const bracketType = subject?.type || "curly"
      const span = subject?.width ?? subject?.height
      const depth = subject?.depth || 30
      const isVertical = subject?.width === undefined

      if (span !== undefined) {
        elements.push(
          <path
            key="bracket-path"
            d={bracketPath(bracketType, span, depth, isVertical)}
            fill="none"
            stroke={color || "var(--semiotic-text-secondary, currentColor)"}
          />
        )
      }
      break
    }
  }

  return <g className="annotation-subject">{elements}</g>
}

function renderConnector(
  dx: number,
  dy: number,
  connector?: AnnotationConnector,
  color?: string,
  type?: string,
  subject?: AnnotationSubject
) {
  const elements: React.ReactElement[] = []

  let startX = 0
  let startY = 0

  if (
    (type === "callout-circle" || type === "label") &&
    subject?.radius
  ) {
    const totalRadius =
      (subject.radius || 0) + (subject.radiusPadding || 0)
    if (totalRadius > 0 && (dx !== 0 || dy !== 0)) {
      const angle = Math.atan2(dy, dx)
      startX = Math.cos(angle) * totalRadius
      startY = Math.sin(angle) * totalRadius
    }
  } else if (type === "callout-rect" && subject) {
    const w = subject.width || 0
    const h = subject.height || 0
    if (w > 0 || h > 0) {
      const cx = w / 2
      const cy = h / 2
      const tdx = dx - cx
      const tdy = dy - cy
      if (tdx !== 0 || tdy !== 0) {
        const absTdx = Math.abs(tdx)
        const absTdy = Math.abs(tdy)
        const hw = w / 2
        const hh = h / 2
        const t =
          absTdx * hh > absTdy * hw ? hw / absTdx : hh / absTdy
        startX = cx + tdx * t
        startY = cy + tdy * t
      }
    }
  } else if (type === "bracket" && subject) {
    const width = subject.width
    const height = subject.height
    const depth = subject.depth || 30
    if (width !== undefined) {
      startX = width / 2
      startY = depth
    } else if (height !== undefined) {
      startX = depth
      startY = height / 2
    }
  }

  const connectorLength = Math.sqrt(
    (dx - startX) ** 2 + (dy - startY) ** 2
  )

  if (connectorLength > 0.5) {
    const stroke = color || "var(--semiotic-text-secondary, currentColor)"
    // Swoopy/curved connector — opt-in via `connector.type: "curve"`. Meeks'
    // essay names the curved connector as a first-class-annotation expectation
    // (vs. a graphical-primitive library like swoopyDrag.js). A quadratic
    // bezier bows the connector by `connector.curve` (a fraction of the
    // connector length, default 0.25) along the perpendicular; flip the sign
    // to bow the other way. The straight-line branch below is byte-identical
    // to the previous behavior when `type` isn't `"curve"`.
    const isCurve = connector?.type === "curve"

    // Arrowhead sits at the subject end; its angle follows the connector's
    // initial direction — start→control for a curve, start→note for a line.
    let arrowAngle = Math.atan2(dy - startY, dx - startX)

    if (isCurve) {
      const midX = (startX + dx) / 2
      const midY = (startY + dy) / 2
      const nx = -(dy - startY) / connectorLength
      const ny = (dx - startX) / connectorLength
      const bend = (connector?.curve ?? 0.25) * connectorLength
      const cx = midX + nx * bend
      const cy = midY + ny * bend
      elements.push(
        <path
          key="connector-line"
          className="connector-curve"
          d={`M${startX},${startY}Q${cx},${cy} ${dx},${dy}`}
          fill="none"
          stroke={stroke}
        />
      )
      arrowAngle = Math.atan2(cy - startY, cx - startX)
    } else {
      elements.push(
        <line
          key="connector-line"
          x1={startX}
          y1={startY}
          x2={dx}
          y2={dy}
          stroke={stroke}
        />
      )
    }

    if (connector?.end === "arrow") {
      const arrowSize = 10
      const angleOffset = 16 / 180 * Math.PI
      const a1x = startX + arrowSize * Math.cos(arrowAngle + angleOffset)
      const a1y = startY + arrowSize * Math.sin(arrowAngle + angleOffset)
      const a2x = startX + arrowSize * Math.cos(arrowAngle - angleOffset)
      const a2y = startY + arrowSize * Math.sin(arrowAngle - angleOffset)

      elements.push(
        <path
          key="connector-arrow"
          d={`M${startX},${startY}L${a1x},${a1y}L${a2x},${a2y}Z`}
          fill={stroke}
          stroke="none"
        />
      )
    }
  }

  return <g className="annotation-connector">{elements}</g>
}

function AnnotationRenderer(props: AnnotationRendererProps) {
  const {
    x: rawX = 0,
    y: rawY = 0,
    dx: baseDx,
    dy: baseDy,
    nx,
    ny,
    note,
    connector,
    subject,
    type,
    color,
    className,
    disable,
    opacity,
    strokeDasharray,
    events = {},
    "data-testid": dataTestId
  } = props

  const x = Array.isArray(rawX) ? rawX[0] ?? 0 : rawX
  const y = Array.isArray(rawY) ? rawY[0] ?? 0 : rawY
  const disableSet = new Set(Array.isArray(disable) ? disable : [])

  let dx = baseDx || 0
  let dy = baseDy || 0

  if (nx !== undefined && nx !== null) dx = nx - x
  if (ny !== undefined && ny !== null) dy = ny - y

  const resolvedType = typeof type === "string" ? type : "label"

  // For bracket type, auto-position note at bracket midpoint tip
  if (resolvedType === "bracket" && subject && dx === 0 && dy === 0) {
    if (subject.width !== undefined) {
      dx = subject.width / 2
      const depthVal = subject.depth || 30
      dy = depthVal + (depthVal >= 0 ? 5 : -5)
    } else if (subject.height !== undefined) {
      const depthVal = subject.depth || 30
      dx = depthVal + (depthVal >= 0 ? 5 : -5)
      dy = subject.height / 2
    }
  }

  // `opacity` and `strokeDasharray` cascade as SVG presentation
  // attributes from the wrapping <g> to every stroked/filled child,
  // which is exactly what the freshness lifecycle treatment needs:
  // dim aging, dash stale, etc., without touching every subject/
  // connector/note renderer.
  return (
    <g
      className={`annotation ${className || ""}`.trim()}
      transform={`translate(${x},${y})`}
      data-testid={dataTestId}
      {...(opacity != null && { opacity })}
      {...(strokeDasharray && { strokeDasharray })}
      {...events}
    >
      {!disableSet.has("connector") && renderConnector(dx, dy, connector, color, resolvedType, subject)}
      {!disableSet.has("subject") && renderSubject(resolvedType, subject, color, x, y)}
      {!disableSet.has("note") && renderNote(note, dx, dy, color)}
    </g>
  )
}

export default function SemioticAnnotation(props: AnnotationProps) {
  const { noteData } = props
  const { screenCoordinates } = noteData

  const annotationType =
    typeof noteData.type === "string" ? noteData.type : "label"

  const eventListeners = noteData.eventListeners || noteData.events || {}

  if (noteData.coordinates && screenCoordinates) {
    const setNX = noteData.nx || screenCoordinates[0][0] + (noteData.dx ?? 0)
    const setNY = noteData.ny || screenCoordinates[0][1] + (noteData.dy ?? 0)
    const notes = screenCoordinates.map((d, i) => {
      const subjectNote = Object.assign({}, noteData, {
        note: i === 0 ? noteData.note : { label: "" },
        x: d[0],
        y: d[1],
        nx: setNX,
        ny: setNY
      })
      return (
        <AnnotationRenderer
          data-testid="semiotic-annotation"
          key={`multi-annotation-${i}`}
          {...subjectNote}
          type={annotationType}
        />
      )
    })

    return <g>{notes}</g>
  }

  const keyData = noteData.note || { title: "none", label: noteData.label }
  const annotationKey = `${keyData.label}-${keyData.title}-${noteData.i}`

  return (
    <AnnotationRenderer
      data-testid="semiotic-annotation"
      key={annotationKey}
      events={eventListeners}
      {...noteData}
      type={annotationType}
    />
  )
}
