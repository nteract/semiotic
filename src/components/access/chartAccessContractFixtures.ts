/**
 * Baseline access contracts for the first three covered charts.
 *
 * These are explicitly maintained representative fixtures, not generated
 * artifacts. They are reviewed with the access contract and may be expanded as
 * coverage grows.
 */
import {
  createChartAccessContract,
  type ChartAccessContract,
} from "./chartAccessContract"

const lineData = [
  { date: "2026-01-01", value: 12 },
  { date: "2026-02-01", value: 18 },
  { date: "2026-03-01", value: 15 },
]

const barData = [
  { region: "North", total: 42 },
  { region: "South", total: 31 },
  { region: "East", total: 27 },
]

const streamRows = [
  { time: 1, value: 4 },
  { time: 2, value: 7 },
]

export const LINE_CHART_ACCESS_CONTRACT: ChartAccessContract =
  createChartAccessContract({
    component: "LineChart",
    props: {
      data: lineData,
      xAccessor: "date",
      yAccessor: "value",
      title: "Weekly active users",
      description:
        "Daily active users from January through March, with a February peak.",
      summary:
        "Use keyboard mark navigation to inspect each point; the linked table lists exact values.",
    },
    options: { navigable: true },
  })

export const BAR_CHART_ACCESS_CONTRACT: ChartAccessContract =
  createChartAccessContract({
    component: "BarChart",
    props: {
      data: barData,
      categoryAccessor: "region",
      valueAccessor: "total",
      title: "Orders by region",
      description:
        "Three regions compared by order count; North leads and East trails.",
      summary:
        "The accessible table preserves category labels and numeric totals for exact reading.",
    },
    options: { navigable: true },
  })

export const REALTIME_LINE_CHART_ACCESS_CONTRACT: ChartAccessContract =
  createChartAccessContract({
    component: "RealtimeLineChart",
    props: {
      data: streamRows,
      timeAccessor: "time",
      valueAccessor: "value",
      title: "Requests per second",
      description:
        "A bounded live window of requests per second with stale-state indication available through useStreamStatus.",
      summary:
        "The current window is exposed as an accessible table; status changes should be announced by the host application.",
    },
    options: {
      realtime: true,
      navigable: false,
      streamStatus: [
        { status: "idle", lastPushTime: null },
        { status: "active", lastPushTime: 1000 },
        { status: "active", lastPushTime: 2000 },
        { status: "active", lastPushTime: 3000 },
        { status: "stale", lastPushTime: 4000 },
      ],
      streamHistoryLimit: 5,
    },
  })
