import { assessAxisLabelBoxes } from "./axisLabelAssessment"

export function readAxisLabelAssessment(svg: SVGSVGElement) {
  const root = svg.getBoundingClientRect()
  let unsupported = svg.querySelectorAll(".semiotic-axis foreignObject").length
  const labels = Array.from(
    svg.querySelectorAll<SVGTextElement>(".semiotic-axis .semiotic-axis-tick")
  ).flatMap((text, i) => {
    const box = text.getBoundingClientRect()
    if (
      !box.width ||
      !box.height ||
      !document.fonts ||
      document.fonts.status !== "loaded"
    ) {
      unsupported++
      return []
    }
    const axis =
      text.closest(".semiotic-axis")?.getAttribute("data-orient") || "unknown"
    return [
      {
        id: `${axis}:${i}`,
        axis,
        box: { x: box.x, y: box.y, width: box.width, height: box.height }
      }
    ]
  })
  return assessAxisLabelBoxes(labels, root, unsupported)
}
