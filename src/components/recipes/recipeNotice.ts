import { createElement } from "react"

// Keep omissions visible in canvas charts and exported SVG without fake marks.
export const RECIPE_NOTICE_HEIGHT = 18

export function recipeNotice(
  plot: { x: number; y: number; width: number; height: number },
  shown: number,
  total: number,
  unit: string,
  reason: string
) {
  if (shown === total) return null
  const text = `${shown} of ${total} ${unit} shown`
  return createElement(
    "text",
    {
      key: "recipe-notice",
      x: plot.x,
      y: plot.y + plot.height - 4,
      fontSize: 11,
      fill: "var(--semiotic-text, currentColor)",
      pointerEvents: "none",
      role: "img",
      "aria-label": `${text}. ${reason}`
    },
    createElement("title", null, reason),
    text
  )
}
