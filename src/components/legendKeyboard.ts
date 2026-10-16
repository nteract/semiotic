import type * as React from "react"

/** Navigate every option in a categorical or gradient listbox. Focus updates its roving tab stop. */
export function moveLegendFocus(event: React.KeyboardEvent<SVGElement>, horizontal: boolean) {
  const { key, currentTarget } = event
  const previousKey = horizontal ? "ArrowLeft" : "ArrowUp"
  const nextKey = horizontal ? "ArrowRight" : "ArrowDown"
  if (key !== previousKey && key !== nextKey && key !== "Home" && key !== "End") return
  event.preventDefault()
  const options = Array.from(currentTarget.closest("[role='listbox']")?.querySelectorAll<SVGElement>("[role='option']") ?? [])
  const nextIndex = key === "Home" ? 0 : key === "End" ? options.length - 1
    : (options.indexOf(currentTarget) + (key === nextKey ? 1 : -1) + options.length) % options.length
  options[nextIndex]?.focus()
}
