import React from "react"

/**
 * Invisible debug hit-target. Looks like ordinary text (inherits font/color,
 * cursor: text, no hover/focus chrome) but warps into a room when clicked.
 *
 * Uses onMouseDown (not only onClick) so parent handlers / focus stealers
 * cannot swallow the gesture before click fires.
 */
export function SecretRoomWarp({
  children,
  onWarp,
  label = "Secret room warp",
  className = "",
}) {
  const fire = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onWarp?.()
  }

  return (
    <button
      type="button"
      className={`aa-secret-warp ${className}`.trim()}
      onMouseDown={fire}
      onClick={fire}
      // Keep it out of the tab order — secrets are pointer-only.
      tabIndex={-1}
      aria-hidden="true"
      title=""
      data-secret-warp={label}
    >
      {children}
    </button>
  )
}

/** Split a room title so a designated word can host a secret warp. */
export function withSecretTitleWarp(title, { word = "Lies", onWarp } = {}) {
  if (typeof title !== "string" || !onWarp) return title
  // Match regardless of the page's uppercase CSS transform.
  const lowerTitle = title.toLowerCase()
  const lowerWord = word.toLowerCase()
  const index = lowerTitle.lastIndexOf(lowerWord)
  if (index < 0) return title
  const before = title.slice(0, index)
  const matched = title.slice(index, index + word.length)
  const after = title.slice(index + word.length)
  return (
    <>
      {before}
      <SecretRoomWarp onWarp={onWarp} label={`Warp via ${word}`}>
        {matched}
      </SecretRoomWarp>
      {after}
    </>
  )
}

export default SecretRoomWarp
