import React from 'react'
import { AxisSummaryTypeSettings } from "./../types/generalTypes"

export interface SummaryGraphicProps {
  translation: {
    left: Array<number>,
    right: Array<number>,
    top: Array<number>,
    bottom: Array<number>
  },
  orient: "left" | "right" | "top" | "bottom",
  decoratedSummaryType: {
    type: string
  },
  summaryWidth: number,
  renderedSummary: any,
  points?: React.ReactNode
}

function translateX({ t, o, w }: { t: string, o: string, w: number }) { 
  if ((t === "contour" ||
    t === "boxplot") &&
    (o === "left" || o === "right")) {
    return w / 2
  } else { 
    return 0
  }
}

function translateY({ t, o, w }: { t: string, o: string, w: number }) { 
  if ((t === "contour" ||
    t === "boxplot") &&
    (o === "top" || o === "bottom")) {
    return w / 2
  } else { 
    return 0
  }
}

export default function SummaryGraphic(props: SummaryGraphicProps) { 
  const { 
    translation,
    orient,
    decoratedSummaryType,
    summaryWidth,
    renderedSummary,
    points
  } = props
  return (
      <g transform={`translate(${translation[orient]})`}>
        <g
          transform={`translate(${translateX({t:decoratedSummaryType.type, o: orient, w: summaryWidth})},${translateY({t:decoratedSummaryType.type, o: orient, w: summaryWidth})})`}
        >
          {renderedSummary.marks}
        </g>
        {points}
      </g>
    )
}
