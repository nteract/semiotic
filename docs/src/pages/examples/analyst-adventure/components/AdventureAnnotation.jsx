import React from "react"

/**
 * Chart-anchored secret/comment hotspot for Analyst Adventure.
 * Early-80s CGA monogram ping: corner reticle + speech caret, not a chunky panel.
 */
export function AdventureAnnotation({
  id,
  annotationId = id,
  label = "Open chart annotation",
  children,
  tone = "cyan",
  /** Which edge of the monogram points at the anchored mark. */
  caret = "bottom",
  active,
  disabled = false,
  onActivate,
  className = "",
  style,
}) {
  const monogram =
    children == null || children === ""
      ? "?"
      : typeof children === "string" || typeof children === "number"
        ? children
        : children
  const caretSide = caret === "top" ? "top" : "bottom"

  return (
    <button
      type="button"
      className={`aa-annotation aa-annotation--${tone} aa-annotation--caret-${caretSide} ${className}`.trim()}
      style={style}
      disabled={disabled}
      aria-label={label}
      aria-pressed={typeof active === "boolean" ? active : undefined}
      data-annotation-id={annotationId}
      onClick={(event) => onActivate?.(annotationId, event)}
    >
      <span className="aa-annotation__face" aria-hidden="true">
        <span className="aa-annotation__corners" />
        <span className="aa-annotation__mono">{monogram}</span>
        <span className="aa-annotation__caret" />
      </span>
    </button>
  )
}

export default AdventureAnnotation
