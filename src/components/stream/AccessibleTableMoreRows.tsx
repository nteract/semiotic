import * as React from "react"
import { PAGE_SIZE, SHOW_MORE_BUTTON_STYLE } from "./accessibleTableStyles"

/** Shared paging control; its preceding sibling is the table receiving focus. */
export function AccessibleTableMoreRows({
  remaining,
  kind = "row",
  onClick
}: {
  remaining: number
  kind?: "row" | "node" | "edge"
  onClick: React.MouseEventHandler<HTMLButtonElement>
}) {
  if (remaining <= 0) return null
  return (
    <button
      type="button"
      className="semiotic-accessible-data-table-show-more"
      onClick={onClick}
      style={SHOW_MORE_BUTTON_STYLE}
    >
      Show {Math.min(PAGE_SIZE, remaining)} more {kind}
      {remaining === 1 ? "" : "s"} ({remaining} remaining)
    </button>
  )
}
