import React from "react"
import { TemporalHistogram } from "semiotic/realtime"

const data = [
  { time: 5, value: 6, status: "Completed" },
  { time: 5, value: 2, status: "Retried" },
  { time: 15, value: 8, status: "Completed" },
  { time: 15, value: 4, status: "Retried" },
  { time: 25, value: 7, status: "Completed" },
  { time: 25, value: 3, status: "Retried" },
  { time: 35, value: 10, status: "Completed" },
  { time: 35, value: 4, status: "Retried" },
]

export default function TemporalHistogramMultiTooltipExample() {
  return (
    <TemporalHistogram
      data={data}
      binSize={10}
      categoryAccessor="status"
      colors={{ Completed: "#2563eb", Retried: "#d97706" }}
      responsiveWidth
      height={340}
      margin={{ top: 48, right: 20, bottom: 80, left: 52 }}
      timeExtent={[0, 40]}
      valueExtent={[0, 16]}
      tickFormatTime={String}
      gap={8}
      background="transparent"
      tooltip="multi"
      hoverHighlight
      legendPosition="bottom"
      title="Requests per time bin"
      description="Completed and retried requests stacked in four time bins."
      summary="Hover anywhere in a column, including the space above its stack, to compare every status in that bin."
    />
  )
}

export const temporalHistogramMultiTooltipCode = `import React from "react"
import { TemporalHistogram } from "semiotic/realtime"

const data = [
  { time: 5, value: 6, status: "Completed" },
  { time: 5, value: 2, status: "Retried" },
  { time: 15, value: 8, status: "Completed" },
  { time: 15, value: 4, status: "Retried" },
  { time: 25, value: 7, status: "Completed" },
  { time: 25, value: 3, status: "Retried" },
  { time: 35, value: 10, status: "Completed" },
  { time: 35, value: 4, status: "Retried" },
]

export default function TemporalHistogramMultiTooltipExample() {
  return (
    <TemporalHistogram
      data={data}
      binSize={10}
      categoryAccessor="status"
      colors={{ Completed: "#2563eb", Retried: "#d97706" }}
      responsiveWidth
      height={340}
      margin={{ top: 48, right: 20, bottom: 80, left: 52 }}
      timeExtent={[0, 40]}
      valueExtent={[0, 16]}
      tickFormatTime={String}
      gap={8}
      background="transparent"
      tooltip="multi"
      hoverHighlight
      legendPosition="bottom"
      title="Requests per time bin"
      description="Completed and retried requests stacked in four time bins."
      summary="Hover anywhere in a column, including the space above its stack, to compare every status in that bin."
    />
  )
}
`
