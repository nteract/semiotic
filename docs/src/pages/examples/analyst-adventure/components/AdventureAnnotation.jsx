import React from "react"

/** A crisp, focusable widget for Semiotic annotation render rules. */
export function AdventureAnnotation({
  id,
  annotationId = id,
  label = "Open chart annotation",
  children,
  tone = "cyan",
  active,
  disabled = false,
  onActivate,
  className = "",
  style,
}) {
  return (
    <button
      type="button"
      className={`aa-annotation aa-annotation--${tone} ${className}`.trim()}
      style={style}
      disabled={disabled}
      aria-label={label}
      aria-pressed={typeof active === "boolean" ? active : undefined}
      data-annotation-id={annotationId}
      onClick={(event) => onActivate?.(annotationId, event)}
    >
      <span className="aa-annotation__reticle" aria-hidden="true">
        +
      </span>
      {children ? <span className="aa-annotation__label">{children}</span> : null}
    </button>
  )
}

export default AdventureAnnotation
