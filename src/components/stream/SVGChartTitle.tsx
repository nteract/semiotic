import type { ReactNode } from "react"
import { TITLE_BASELINE } from "./titleLayout"

interface SVGChartTitleProps {
  title?: string | ReactNode
  totalWidth: number
  marginTop: number
}

/** Shared SVG title chrome, kept separate from the axis/annotation overlay. */
export function SVGChartTitle({ title, totalWidth, marginTop }: SVGChartTitleProps) {
  if (!title) return null

  if (typeof title !== "string") {
    return (
      <foreignObject x={0} y={0} width={totalWidth} height={marginTop}>
        {title}
      </foreignObject>
    )
  }

  return (
    <text
      x={totalWidth / 2}
      y={TITLE_BASELINE}
      textAnchor="middle"
      fontWeight="bold"
      fill="var(--semiotic-text, #333)"
      fontSize={14}
      className="semiotic-chart-title"
      style={{
        userSelect: "none",
        fontSize: "var(--semiotic-title-font-size, 14px)",
        fontFamily: "var(--semiotic-title-font-family, var(--semiotic-font-family, sans-serif))",
        fontWeight: "var(--semiotic-title-font-weight, bold)"
      }}
    >
      {title}
    </text>
  )
}
