import type { ScorecardFixture } from "./qualityScorecard"

/**
 * Canonical scorecard fixtures — the test set that descriptor tuning is
 * measured against. Curated by hand. Each entry pairs a dataset with the
 * intent the human expert would search by and the chart(s) the expert would
 * pick. Stress-test fixtures (single-column, broken GeoJSON, etc.) set
 * `expectsNoFit: true` to confirm the engine honestly rejects rather than
 * forces a recommendation.
 *
 * To add a new fixture: keep it small (≤ ~50 rows), name it descriptively,
 * pick the most-defensible expert answer. The scorecard tolerates the expert
 * pick appearing anywhere in the top-3 — close-second behavior counts as
 * agreement.
 */

const monthlyRevenueMultiSeries = (() => {
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const regions = ["EU", "NA", "APAC"]
  return regions.flatMap((region, regionIdx) =>
    months.map((month) => ({
      month,
      revenue: 800 + month * (200 + regionIdx * 40) + Math.sin(month) * 150,
      region
    }))
  )
})()

const monthlyRevenueOneSeries = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  revenue: 1000 + i * 150 + Math.sin(i / 2) * 100
}))

const productSales = [
  { product: "Widget", units: 480 },
  { product: "Gadget", units: 620 },
  { product: "Sprocket", units: 290 },
  { product: "Whatsit", units: 740 },
  { product: "Doohickey", units: 410 }
]

const surveySatisfaction = Array.from({ length: 150 }, (_, i) => ({
  respondent_id: i + 1,
  satisfaction: Math.max(
    1,
    Math.min(10, 6 + Math.sin(i / 7) * 2 + Math.random() * 3 - 1)
  ),
  cohort: ["Beta", "GA", "Enterprise"][i % 3]
}))

const studyHoursVsGrade = Array.from({ length: 80 }, (_, i) => {
  const hours = Math.max(0, Math.random() * 40)
  return {
    student_id: `s${i + 1}`,
    hours,
    grade: Math.min(100, hours * 1.8 + 30 + (Math.random() - 0.5) * 20)
  }
})

const conversionFunnel = [
  { stage: "Visit", users: 10000 },
  { stage: "Signup", users: 2400 },
  { stage: "Trial", users: 1100 },
  { stage: "Paid", users: 380 }
]

const orgHierarchy = {
  name: "Acme",
  children: [
    {
      name: "Engineering",
      children: [
        { name: "Platform", value: 18 },
        { name: "Product", value: 22 }
      ]
    },
    {
      name: "Sales",
      children: [
        { name: "EMEA", value: 12 },
        { name: "AMER", value: 26 }
      ]
    },
    { name: "Ops", value: 9 }
  ]
}

const transitionNetwork = {
  nodes: [
    { id: "draft" },
    { id: "review" },
    { id: "approved" },
    { id: "shipped" },
    { id: "rejected" }
  ],
  edges: [
    { source: "draft", target: "review", value: 100 },
    { source: "review", target: "approved", value: 60 },
    { source: "review", target: "rejected", value: 40 },
    { source: "approved", target: "shipped", value: 58 }
  ]
}

const usGeoFeatures = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "CA",
      properties: { name: "California", value: 39 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-124, 32],
            [-114, 32],
            [-114, 42],
            [-124, 42],
            [-124, 32]
          ]
        ]
      }
    },
    {
      type: "Feature",
      id: "TX",
      properties: { name: "Texas", value: 29 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-106, 26],
            [-93, 26],
            [-93, 36],
            [-106, 36],
            [-106, 26]
          ]
        ]
      }
    },
    {
      type: "Feature",
      id: "NY",
      properties: { name: "New York", value: 19 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-79, 40],
            [-72, 40],
            [-72, 45],
            [-79, 45],
            [-79, 40]
          ]
        ]
      }
    }
  ]
}

const flatSingleColumn = Array.from({ length: 50 }, (_, i) => ({
  observation: 50 + Math.sin(i / 4) * 12 + Math.random() * 6
}))

// Three-numeric scatter — fixture for BubbleChart
const economiesByCountry = [
  {
    country: "USA",
    gdp_per_capita: 70,
    hours_worked: 1700,
    population_size: 330
  },
  {
    country: "UK",
    gdp_per_capita: 48,
    hours_worked: 1500,
    population_size: 67
  },
  {
    country: "Germany",
    gdp_per_capita: 53,
    hours_worked: 1330,
    population_size: 84
  },
  {
    country: "Japan",
    gdp_per_capita: 40,
    hours_worked: 1600,
    population_size: 125
  },
  {
    country: "France",
    gdp_per_capita: 45,
    hours_worked: 1480,
    population_size: 67
  },
  {
    country: "Italy",
    gdp_per_capita: 38,
    hours_worked: 1700,
    population_size: 60
  },
  {
    country: "Spain",
    gdp_per_capita: 32,
    hours_worked: 1640,
    population_size: 47
  },
  {
    country: "Canada",
    gdp_per_capita: 52,
    hours_worked: 1690,
    population_size: 38
  },
  {
    country: "Australia",
    gdp_per_capita: 56,
    hours_worked: 1700,
    population_size: 26
  },
  {
    country: "South Korea",
    gdp_per_capita: 35,
    hours_worked: 1900,
    population_size: 52
  }
]

// Multi-measure time series for MultiAxisLineChart
const websiteMetrics = Array.from({ length: 24 }, (_, i) => ({
  month: i + 1,
  page_views: Math.round(50000 + i * 1200 + Math.sin(i / 3) * 8000),
  conversion_rate: 2.5 + Math.sin(i / 4) * 0.8 + i * 0.05,
  avg_session_seconds: Math.round(120 + i * 2 + Math.cos(i / 5) * 15)
}))

// Categorical × series × value for GroupedBarChart / StackedBarChart
const salesByRegionAndProduct = [
  { product: "Widget", region: "EU", units: 480 },
  { product: "Widget", region: "NA", units: 620 },
  { product: "Widget", region: "APAC", units: 290 },
  { product: "Gadget", region: "EU", units: 320 },
  { product: "Gadget", region: "NA", units: 740 },
  { product: "Gadget", region: "APAC", units: 410 },
  { product: "Sprocket", region: "EU", units: 200 },
  { product: "Sprocket", region: "NA", units: 380 },
  { product: "Sprocket", region: "APAC", units: 150 },
  { product: "Whatsit", region: "EU", units: 290 },
  { product: "Whatsit", region: "NA", units: 550 },
  { product: "Whatsit", region: "APAC", units: 180 }
]

// Coerce to exactly-two-series shape by partitioning evenly
const revenueVsExpensesTwoSeries = [
  ...Array.from({ length: 24 }, (_, i) => ({
    month: i + 1,
    amount: 100 + i * 8 + Math.sin(i / 3) * 25,
    series: "revenue"
  })),
  ...Array.from({ length: 24 }, (_, i) => ({
    month: i + 1,
    amount: 80 + i * 6 + Math.cos(i / 4) * 15,
    series: "expenses"
  }))
]

// OHLC time series for CandlestickChart
const stockPrices = Array.from({ length: 30 }, (_, i) => {
  const base = 100 + i * 1.2 + Math.sin(i / 4) * 8
  const open = base + (Math.random() - 0.5) * 4
  const close = base + (Math.random() - 0.5) * 4
  const high = Math.max(open, close) + Math.random() * 3
  const low = Math.min(open, close) - Math.random() * 3
  return { day: i + 1, open, high, low, close }
})

// Ordered-sequence scatter for ConnectedScatterplot
const usaUnemploymentVsInflation = Array.from({ length: 20 }, (_, i) => ({
  year: 2005 + i,
  unemployment: 5 + Math.sin(i / 2) * 2 + (i > 4 && i < 10 ? 3 : 0),
  inflation: 2 + Math.cos(i / 3) * 1.5
}))

const sparseThreeRow = [
  { name: "A", value: 12 },
  { name: "B", value: 34 },
  { name: "C", value: 8 }
]

// Flat array of transition events. The canonical input shape for SankeyDiagram /
// ProcessSankey / ChordDiagram / ForceDirectedGraph — should fit even though
// the data is rows, not a {nodes, edges} object. Exercises the
// detectTransitionNetwork path in profileData.
const transitionEvents = [
  {
    case: "deal-001",
    stage: "Inbound Lead",
    nextStage: "Qualified",
    startTime: "2024-04-01T09:00:00",
    value: 18
  },
  {
    case: "deal-001",
    stage: "Qualified",
    nextStage: "Discovery",
    startTime: "2024-04-01T13:00:00",
    value: 16
  },
  {
    case: "deal-001",
    stage: "Discovery",
    nextStage: "Proposal",
    startTime: "2024-04-02T11:00:00",
    value: 14
  },
  {
    case: "deal-001",
    stage: "Proposal",
    nextStage: "Closed Won",
    startTime: "2024-04-04T09:00:00",
    value: 12
  },
  {
    case: "deal-002",
    stage: "Inbound Lead",
    nextStage: "Qualified",
    startTime: "2024-04-01T10:00:00",
    value: 10
  },
  {
    case: "deal-002",
    stage: "Qualified",
    nextStage: "Discovery",
    startTime: "2024-04-02T09:00:00",
    value: 9
  },
  {
    case: "deal-002",
    stage: "Discovery",
    nextStage: "Proposal",
    startTime: "2024-04-03T09:00:00",
    value: 7
  },
  {
    case: "deal-002",
    stage: "Proposal",
    nextStage: "Closed Lost",
    startTime: "2024-04-04T11:00:00",
    value: 5
  },
  {
    case: "deal-003",
    stage: "Signup",
    nextStage: "Activated",
    startTime: "2024-04-01T08:30:00",
    value: 28
  },
  {
    case: "deal-003",
    stage: "Activated",
    nextStage: "Trial",
    startTime: "2024-04-01T10:00:00",
    value: 24
  },
  {
    case: "deal-003",
    stage: "Trial",
    nextStage: "Subscribed",
    startTime: "2024-04-02T10:00:00",
    value: 18
  }
]

// Category × category matrix with a numeric value — fixture for Heatmap.
// Dense enough (8 services × 7 weekdays = 56 cells) that a matrix is the
// honest expert answer over grouped bars.
const incidentsByServiceAndDay = (() => {
  const services = [
    "auth", "billing", "search", "ingest",
    "notify", "reports", "exports", "webhooks"
  ]
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  return services.flatMap((service, si) =>
    days.map((day, di) => ({
      service,
      day,
      incidents: Math.round(
        2 + Math.abs(Math.sin(si * 1.7 + di)) * 9 + (di >= 5 ? -1.5 : 1.5)
      )
    }))
  )
})()

// Single focal value against an implicit 0–100 plan — fixture for GaugeChart.
const capacityUtilization = [{ metric: "Cluster capacity used", value: 78 }]

// Geo flows: FeatureCollection + point nodes + weighted origin→destination
// flows — the shape profileData's geo branch exposes as profile.geo.points /
// profile.geo.flows. Fixture for FlowMap.
const shippingFlows = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "outline",
      properties: { name: "Region" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-125, 24],
            [-66, 24],
            [-66, 50],
            [-125, 50],
            [-125, 24]
          ]
        ]
      }
    }
  ],
  points: [
    { id: "SEA", lon: -122.3, lat: 47.6 },
    { id: "SFO", lon: -122.4, lat: 37.8 },
    { id: "DEN", lon: -104.9, lat: 39.7 },
    { id: "ORD", lon: -87.6, lat: 41.9 },
    { id: "ATL", lon: -84.4, lat: 33.7 },
    { id: "JFK", lon: -73.8, lat: 40.6 }
  ],
  flows: [
    { source: "SEA", target: "ORD", value: 320 },
    { source: "SFO", target: "JFK", value: 540 },
    { source: "SFO", target: "ATL", value: 210 },
    { source: "DEN", target: "ORD", value: 180 },
    { source: "ORD", target: "JFK", value: 460 },
    { source: "ATL", target: "JFK", value: 250 }
  ]
}

// Geo points with a travel-cost field — fixture for DistanceCartogram
// (cost-space distortion around a center point).
const travelTimesFromHQ = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "outline",
      properties: { name: "Region" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-125, 24],
            [-66, 24],
            [-66, 50],
            [-125, 50],
            [-125, 24]
          ]
        ]
      }
    }
  ],
  points: [
    { id: "HQ", lon: -122.4, lat: 37.8, cost: 0 },
    { id: "Seattle", lon: -122.3, lat: 47.6, cost: 95 },
    { id: "Denver", lon: -104.9, lat: 39.7, cost: 150 },
    { id: "Chicago", lon: -87.6, lat: 41.9, cost: 245 },
    { id: "Atlanta", lon: -84.4, lat: 33.7, cost: 280 },
    { id: "New York", lon: -73.8, lat: 40.6, cost: 330 }
  ]
}

export const CANONICAL_FIXTURES: ReadonlyArray<ScorecardFixture> = [
  // Time-series family
  {
    name: "monthly revenue with regions, intent=trend",
    shape: "12 months × 3 regions, numeric month, numeric revenue",
    data: monthlyRevenueMultiSeries,
    intent: "trend",
    expected: ["LineChart", "AreaChart", "MinimapChart"]
  },
  {
    name: "monthly revenue with regions, intent=compare-series",
    shape: "12 months × 3 regions",
    data: monthlyRevenueMultiSeries,
    intent: "compare-series",
    expected: ["LineChart", "GroupedBarChart"]
  },
  {
    name: "monthly revenue with regions, intent=composition-over-time",
    shape: "12 months × 3 regions, additive",
    data: monthlyRevenueMultiSeries,
    intent: "composition-over-time",
    expected: ["StackedAreaChart", "StackedBarChart"]
  },
  {
    name: "monthly revenue single series, intent=trend",
    shape: "12 months, no series",
    data: monthlyRevenueOneSeries,
    intent: "trend",
    expected: ["LineChart", "AreaChart"]
  },
  // Categorical family
  {
    name: "product sales, intent=rank",
    shape: "5 products, single numeric measure",
    data: productSales,
    intent: "rank",
    expected: ["BarChart", "DotPlot"]
  },
  {
    name: "product sales, intent=part-to-whole",
    shape: "5 products, single numeric measure",
    data: productSales,
    intent: "part-to-whole",
    expected: ["PieChart", "DonutChart", "BarChart"]
  },
  // Distribution family
  {
    name: "satisfaction scores, intent=distribution",
    shape: "150 numeric observations across 3 cohorts",
    data: surveySatisfaction,
    intent: "distribution",
    expected: ["Histogram", "BoxPlot", "ViolinPlot"]
  },
  {
    name: "satisfaction scores, intent=compare-categories",
    shape: "150 obs × 3 cohorts",
    data: surveySatisfaction,
    intent: "compare-categories",
    expected: ["BoxPlot", "ViolinPlot", "SwarmPlot"]
  },
  // Relationship family
  {
    name: "hours vs grade, intent=correlation",
    shape: "80 students, hours + grade",
    data: studyHoursVsGrade,
    intent: "correlation",
    expected: ["Scatterplot"]
  },
  {
    name: "hours vs grade, intent=outlier-detection",
    shape: "80 students",
    data: studyHoursVsGrade,
    intent: "outlier-detection",
    expected: ["Scatterplot"]
  },
  // Flow family
  {
    name: "conversion funnel, intent=flow",
    shape: "4 stages, descending values",
    data: conversionFunnel,
    intent: "flow",
    expected: ["FunnelChart"]
  },
  // Hierarchy family (rawInput payload)
  {
    name: "org chart, intent=hierarchy",
    shape: "3-deep org tree",
    data: [],
    rawInput: orgHierarchy,
    intent: "hierarchy",
    expected: ["TreeDiagram", "Treemap", "CirclePack"]
  },
  // Network family (rawInput payload)
  {
    name: "approval workflow transitions, intent=flow",
    shape: "5 nodes / 4 weighted edges",
    data: [],
    rawInput: transitionNetwork,
    intent: "flow",
    expected: ["SankeyDiagram", "ChordDiagram"]
  },
  // Geo family (rawInput payload)
  {
    name: "US states with values, intent=geo",
    shape: "3 polygon features with numeric values",
    data: [],
    rawInput: usGeoFeatures,
    intent: "geo",
    expected: ["ChoroplethMap", "ProportionalSymbolMap"]
  },

  // Three-numeric scatter — exercises BubbleChart
  {
    name: "country economies, intent=correlation",
    shape: "10 countries × 3 numeric measures (gdp, hours, population)",
    data: economiesByCountry,
    intent: "correlation",
    expected: ["Scatterplot", "BubbleChart"]
  },
  // Multi-measure time-series — exercises MultiAxisLineChart
  {
    name: "website metrics with 3 measures, intent=compare-series",
    shape: "24 months × 3 numeric measures with different ranges",
    data: websiteMetrics,
    intent: "compare-series",
    expected: ["MultiAxisLineChart", "LineChart"]
  },
  // Category × series × value — exercises GroupedBarChart / StackedBarChart
  {
    name: "sales by region and product, intent=compare-series",
    shape: "12 rows = 4 products × 3 regions",
    data: salesByRegionAndProduct,
    intent: "compare-series",
    expected: ["GroupedBarChart", "StackedBarChart"]
  },
  {
    name: "sales by region and product, intent=part-to-whole",
    shape: "12 rows = 4 products × 3 regions",
    data: salesByRegionAndProduct,
    intent: "part-to-whole",
    expected: ["StackedBarChart", "PieChart"]
  },
  // Exactly-two-series temporal — exercises DifferenceChart
  {
    name: "revenue vs expenses, intent=compare-series",
    shape: "48 rows = 24 months × 2 series",
    data: revenueVsExpensesTwoSeries,
    intent: "compare-series",
    expected: ["DifferenceChart", "LineChart", "GroupedBarChart"]
  },
  // OHLC — exercises CandlestickChart
  {
    name: "stock OHLC prices, intent=change-detection",
    shape: "30 days × open/high/low/close",
    data: stockPrices,
    intent: "change-detection",
    expected: ["CandlestickChart", "LineChart"]
  },
  // Ordered-sequence scatter — exercises ConnectedScatterplot
  {
    name: "unemployment vs inflation by year, intent=correlation",
    shape: "20 years × 2 measures, ordered by year",
    data: usaUnemploymentVsInflation,
    intent: "correlation",
    expected: ["ConnectedScatterplot", "Scatterplot"]
  },

  // Transition events — flat array of edges with stage/nextStage/startTime/value.
  // Should be auto-derived into a network so flow charts fit.
  {
    name: "transition events, intent=flow",
    shape: "11 stage transitions across 3 deals with startTime + value",
    data: transitionEvents,
    intent: "flow",
    expected: ["SankeyDiagram", "ProcessSankey", "ChordDiagram"]
  },

  // Category × category matrix — exercises Heatmap
  {
    name: "incidents by service and weekday, intent=compare-categories",
    shape: "56 cells = 8 services × 7 weekdays, numeric incident count",
    data: incidentsByServiceAndDay,
    intent: "compare-categories",
    expected: ["Heatmap", "GroupedBarChart"]
  },
  // Single focal value — exercises GaugeChart (BigNumber is the co-equal
  // expert answer for an unthresholded single value, so both count).
  {
    name: "capacity utilization single value, intent=part-to-whole",
    shape: "1 row, one numeric value against an implicit 0–100 plan",
    data: capacityUtilization,
    intent: "part-to-whole",
    expected: ["GaugeChart", "BigNumber"]
  },
  // Geo origin→destination flows — exercises FlowMap
  {
    name: "shipping flows between cities, intent=flow",
    shape: "6 lat/lon nodes, 6 weighted flows, 1 outline feature",
    data: [],
    rawInput: shippingFlows,
    intent: "flow",
    expected: ["FlowMap"]
  },
  // Geo points with travel cost — exercises DistanceCartogram
  {
    name: "travel times from HQ, intent=geo",
    shape: "6 lat/lon points with a cost field measured from a center",
    data: [],
    rawInput: travelTimesFromHQ,
    intent: "geo",
    expected: ["DistanceCartogram", "ProportionalSymbolMap"]
  },

  // Stress fixtures — expect no fitting chart for these.
  {
    name: "flat single column",
    shape: "50 rows, one numeric column",
    data: flatSingleColumn,
    // intentionally no intent — we want the engine to refuse this whole class.
    expected: ["Histogram"] // a histogram is genuinely the best (only) fit here
  },
  {
    name: "sparse 3-row data, intent=rank",
    shape: "3 rows total",
    data: sparseThreeRow,
    intent: "rank",
    expected: ["BarChart", "DotPlot"]
  }
]
