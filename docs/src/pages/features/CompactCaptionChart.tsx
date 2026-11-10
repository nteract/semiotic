import React from "react"
import { LineChart } from "semiotic/xy"
import type { LineChartProps } from "semiotic/xy"

const data = [
  { week: 1, channel: "Direct", orders: 18 },
  { week: 2, channel: "Direct", orders: 26 },
  { week: 3, channel: "Direct", orders: 23 },
  { week: 4, channel: "Direct", orders: 34 },
  { week: 1, channel: "Partner", orders: 12 },
  { week: 2, channel: "Partner", orders: 15 },
  { week: 3, channel: "Partner", orders: 19 },
  { week: 4, channel: "Partner", orders: 21 },
]
const latestWeek = Math.max(...data.map((d) => d.week))
const latest = data.filter((d) => d.week === latestWeek)
const total = latest.reduce((sum, d) => sum + d.orders, 0)
const summary = `Week ${latestWeek} has ${latest.map((d) => `${d.orders} ${d.channel.toLowerCase()}`).join(" and ")} orders, totaling ${total}.`
const colors = { Direct: "#2457c5", Partner: "#a34b00" }

// These props contain real data and plain annotations, so they also work in
// renderChart("LineChart", compactCaptionProps) or a serialized chart config.
export const compactCaptionProps: LineChartProps = {
  data,
  xAccessor: "week",
  yAccessor: "orders",
  lineBy: "channel",
  colorBy: "channel",
  colorScheme: colors,
  width: 640,
  height: 300,
  margin: { top: 24, right: 20, bottom: 86, left: 48 },
  showLegend: false,
  title: "Weekly orders by channel",
  description: `Direct and partner orders over four weeks. ${summary}`,
  summary,
  accessibleTable: true,
  annotations: [
    ...latest.flatMap((d, i) => [
      {
        type: "frame-text",
        text: "●",
        position: i === 0 ? "bottom-left" : "bottom-right",
        dx: i === 0 ? 0 : -84,
        dy: 46,
        fontSize: 12,
        fill: colors[d.channel as keyof typeof colors],
      },
      {
        type: "frame-text",
        text: `${d.channel}: ${d.orders}`,
        position: i === 0 ? "bottom-left" : "bottom-right",
        dx: i === 0 ? 12 : 0,
        dy: 46,
        fontSize: 12,
      },
    ]),
    {
      type: "frame-text",
      text: `Week ${latestWeek} · ${total} orders`,
      // Keep the total on a separate baseline so the legend fits narrow hosts.
      position: "bottom-left",
      dy: 64,
      fontSize: 12,
    },
  ],
}

export default function CompactCaptionChart() {
  return <LineChart {...compactCaptionProps} responsiveWidth />
}
