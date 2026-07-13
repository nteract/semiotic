import * as React from "react"

export type BrushKeyboardAction =
  | { type: "nudge"; direction: "left" | "right" | "up" | "down"; resize: boolean }
  | { type: "clear" }

export interface BrushAccessibilityOptions {
  label?: string
  description?: string
  onAction?: (action: BrushKeyboardAction) => void
}

const DEFAULT_DESCRIPTION = "Use arrow keys to move the selected range, Shift plus an arrow key to resize it, and Escape to clear it."

function actionForKey(event: React.KeyboardEvent<SVGSVGElement>): BrushKeyboardAction | null {
  if (event.key === "Escape") return { type: "clear" }
  if (event.key === "ArrowLeft") return { type: "nudge", direction: "left", resize: event.shiftKey }
  if (event.key === "ArrowRight") return { type: "nudge", direction: "right", resize: event.shiftKey }
  if (event.key === "ArrowUp") return { type: "nudge", direction: "up", resize: event.shiftKey }
  if (event.key === "ArrowDown") return { type: "nudge", direction: "down", resize: event.shiftKey }
  return null
}

/** Shared ARIA and keyboard vocabulary for frame-owned D3 brushes. */
export function useBrushAccessibility({
  label = "Data range brush",
  description = DEFAULT_DESCRIPTION,
  onAction,
}: BrushAccessibilityOptions = {}) {
  const descriptionId = React.useId().replace(/:/g, "")
  const actionRef = React.useRef(onAction)
  actionRef.current = onAction
  const onKeyDown = React.useCallback((event: React.KeyboardEvent<SVGSVGElement>) => {
    const action = actionForKey(event)
    if (!action) return
    event.preventDefault()
    actionRef.current?.(action)
  }, [])

  return {
    description,
    descriptionId: `semiotic-brush-description-${descriptionId}`,
    svgProps: {
      role: "region",
      tabIndex: 0,
      "aria-label": label,
      "aria-describedby": `semiotic-brush-description-${descriptionId}`,
      onKeyDown,
    },
  }
}
