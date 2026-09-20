import type { Datum } from "../components/charts/shared/datumTypes"

const bars = [
  { category: "A", value: 4 },
  { category: "B", value: 7 }
]
const grouped = [
  { category: "A", value: 4, group: "First" },
  { category: "A", value: 2, group: "Second" },
  { category: "B", value: 7, group: "First" },
  { category: "B", value: 3, group: "Second" }
]
const distribution = [1, 2, 3, 4, 6, 7, 8, 9].flatMap((value) => [
  { category: "A", value },
  { category: "B", value: value + 2 }
])

/** Independent examples shared by scalar-contract and registered-renderer tests. */
export const ordinalDefinitionFixtures = {
  BarChart: { data: bars },
  StackedBarChart: { data: grouped, stackBy: "group" },
  GroupedBarChart: { data: grouped, groupBy: "group" },
  SwarmPlot: { data: distribution },
  BoxPlot: { data: distribution },
  Histogram: { data: distribution, valueAccessor: "value" },
  ViolinPlot: { data: distribution },
  RidgelinePlot: { data: distribution },
  DotPlot: { data: bars },
  PieChart: { data: bars },
  DonutChart: { data: bars },
  GaugeChart: { value: 72 },
  FunnelChart: {
    data: [
      { step: "Visit", value: 100 },
      { step: "Buy", value: 30 }
    ]
  },
  RadarChart: { data: [...bars, { category: "C", value: 5 }] },
  SwimlaneChart: { data: grouped, subcategoryAccessor: "group" },
  LikertChart: {
    data: [
      { question: "Quality", score: 1 },
      { question: "Quality", score: 3 },
      { question: "Quality", score: 5 }
    ]
  }
} satisfies Record<string, Datum>
