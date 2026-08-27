import * as Semiotic from "../../dist/semiotic.module.min.js"
import * as SemioticGeo from "../../dist/geo.module.min.js"
import * as SemioticPhysics from "../../dist/physics.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  LinkedCharts,
  CategoryColorProvider,
  ChartGrid,
  Scatterplot,
  BarChart,
  LineChart,
  AreaChart,
  StackedAreaChart,
  DonutChart,
  PieChart,
  FunnelChart,
  GroupedBarChart,
  StackedBarChart,
  BoxPlot,
  DotPlot,
  Histogram,
  RidgelinePlot,
  SwarmPlot,
  ViolinPlot,
  RadarChart,
  WaterfallChart,
  BubbleChart,
  BumpChart,
  CandlestickChart,
  ConnectedScatterplot,
  DifferenceChart,
  Heatmap,
  MultiAxisLineChart,
  QuadrantChart,
  LikertChart,
  SwimlaneChart,
  RealtimeHeatmap,
  RealtimeHistogram,
  RealtimeLineChart,
  RealtimeSwarmChart,
  RealtimeWaterfallChart,
  TemporalHistogram,
  ChordDiagram,
  CirclePack,
  ForceDirectedGraph,
  OrbitDiagram,
  ProcessSankey,
  SankeyDiagram,
  TreeDiagram,
  Treemap,
} = Semiotic

const {
  ChoroplethMap,
  DistanceCartogram,
  FlowMap,
  ProportionalSymbolMap,
} = SemioticGeo

const {
  CollisionSwarmChart,
  CrucibleChart,
  EventDropChart,
  GaltonBoardChart,
  GauntletChart,
  PacketFlowChart,
  ProcessFlowChart,
  UnitPileChart,
} = SemioticPhysics

const TestCase = ({ title, children, testId, key }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId, key: key || testId },
    React.createElement("h2", null, title),
    children
  )

const LinkedHoverEvidenceChart = ({ label, testId, children }) =>
  React.createElement(
    "div",
    {
      "data-linked-hover-chart": testId,
      style: { minWidth: 0 },
    },
    React.createElement(
      "div",
      { style: { fontSize: 12, fontWeight: 600, marginBottom: 4 } },
      label
    ),
    children
  )

// ── Shared test data (deterministic) ────────────────────────────────────

const dashboardData = [
  { region: "North", month: 1, revenue: 120, units: 30 },
  { region: "North", month: 2, revenue: 140, units: 35 },
  { region: "North", month: 3, revenue: 160, units: 40 },
  { region: "South", month: 1, revenue: 90, units: 22 },
  { region: "South", month: 2, revenue: 110, units: 28 },
  { region: "South", month: 3, revenue: 130, units: 33 },
  { region: "East", month: 1, revenue: 70, units: 18 },
  { region: "East", month: 2, revenue: 85, units: 21 },
  { region: "East", month: 3, revenue: 100, units: 25 },
]

const barSummary = [
  { region: "North", total: 420 },
  { region: "South", total: 330 },
  { region: "East", total: 255 },
]

const scatterData = [
  { region: "North", x: 30, y: 120 },
  { region: "North", x: 35, y: 140 },
  { region: "North", x: 40, y: 160 },
  { region: "South", x: 22, y: 90 },
  { region: "South", x: 28, y: 110 },
  { region: "South", x: 33, y: 130 },
  { region: "East", x: 18, y: 70 },
  { region: "East", x: 21, y: 85 },
  { region: "East", x: 25, y: 100 },
]

const groupedCategoryData = [
  { region: "North", segment: "Enterprise", value: 28 },
  { region: "North", segment: "SMB", value: 18 },
  { region: "South", segment: "Enterprise", value: 20 },
  { region: "South", segment: "SMB", value: 16 },
  { region: "East", segment: "Enterprise", value: 16 },
  { region: "East", segment: "SMB", value: 11 },
]

const statisticalData = [
  { category: "Alpha", value: 20 },
  { category: "Alpha", value: 24 },
  { category: "Alpha", value: 29 },
  { category: "Alpha", value: 32 },
  { category: "Alpha", value: 38 },
  { category: "Beta", value: 14 },
  { category: "Beta", value: 18 },
  { category: "Beta", value: 22 },
  { category: "Beta", value: 28 },
  { category: "Beta", value: 35 },
  { category: "Gamma", value: 30 },
  { category: "Gamma", value: 33 },
  { category: "Gamma", value: 37 },
  { category: "Gamma", value: 42 },
  { category: "Gamma", value: 47 },
]

const statisticalScatterData = statisticalData.map((d, i) => ({
  ...d,
  x: d.value,
  y: i % 5,
}))

const crosshairPrimaryData = [
  { month: 1, value: 84 },
  { month: 2, value: 118 },
  { month: 3, value: 100 },
  { month: 4, value: 132 },
  { month: 5, value: 176 },
]

const crosshairSecondaryData = [
  { month: 1, value: 148 },
  { month: 2, value: 126 },
  { month: 3, value: 96 },
  { month: 4, value: 112 },
  { month: 5, value: 88 },
]

const waveOneHoverSourceData = [
  { metric: "Speed", x: 20, y: 80 },
  { metric: "Quality", x: 50, y: 55 },
  { metric: "Reach", x: 80, y: 30 },
]

const xyFamilyHoverSourceData = [
  { cohort: "Alpha", x: 20, y: 80 },
  { cohort: "Beta", x: 50, y: 50 },
  { cohort: "Gamma", x: 80, y: 20 },
]

const xyFamilyPointData = [
  { cohort: "Alpha", x: 16, y: 78, size: 34, value: 18 },
  { cohort: "Alpha", x: 26, y: 68, size: 22, value: 32 },
  { cohort: "Beta", x: 44, y: 48, size: 28, value: 45 },
  { cohort: "Beta", x: 56, y: 58, size: 18, value: 38 },
  { cohort: "Gamma", x: 74, y: 28, size: 32, value: 62 },
  { cohort: "Gamma", x: 84, y: 18, size: 24, value: 76 },
]

const xyFamilyBumpData = [
  { cohort: "Alpha", series: "Alpha", quarter: "Q1", value: 80 },
  { cohort: "Beta", series: "Beta", quarter: "Q1", value: 60 },
  { cohort: "Gamma", series: "Gamma", quarter: "Q1", value: 40 },
  { cohort: "Alpha", series: "Alpha", quarter: "Q2", value: 58 },
  { cohort: "Beta", series: "Beta", quarter: "Q2", value: 72 },
  { cohort: "Gamma", series: "Gamma", quarter: "Q2", value: 48 },
  { cohort: "Alpha", series: "Alpha", quarter: "Q3", value: 66 },
  { cohort: "Beta", series: "Beta", quarter: "Q3", value: 52 },
  { cohort: "Gamma", series: "Gamma", quarter: "Q3", value: 78 },
]

const xyFamilyCandlestickData = [
  { cohort: "Alpha", x: 1, open: 48, high: 68, low: 40, close: 62 },
  { cohort: "Beta", x: 2, open: 60, high: 72, low: 46, close: 52 },
  { cohort: "Gamma", x: 3, open: 54, high: 82, low: 50, close: 76 },
]

const xyFamilyHeatmapData = [
  { cohort: "Alpha", x: 1, y: 1, value: 18 },
  { cohort: "Alpha", x: 1, y: 2, value: 26 },
  { cohort: "Beta", x: 2, y: 1, value: 42 },
  { cohort: "Beta", x: 2, y: 2, value: 50 },
  { cohort: "Gamma", x: 3, y: 1, value: 68 },
  { cohort: "Gamma", x: 3, y: 2, value: 82 },
]

const multiAxisHoverSourceData = [
  { __ma_series: "Revenue", x: 20, y: 80 },
  { __ma_series: "Signups", x: 80, y: 20 },
]

const multiAxisEvidenceData = [
  { month: 1, revenue: 40, signups: 140 },
  { month: 2, revenue: 58, signups: 118 },
  { month: 3, revenue: 46, signups: 165 },
  { month: 4, revenue: 72, signups: 132 },
]

const differenceHoverSourceData = [
  { __diffWinner: "A", x: 20, y: 80 },
  { __diffWinner: "B", x: 80, y: 20 },
]

const differenceEvidenceData = [
  { x: 1, a: 62, b: 42 },
  { x: 2, a: 70, b: 52 },
  { x: 3, a: 48, b: 68 },
  { x: 4, a: 44, b: 74 },
  { x: 5, a: 78, b: 56 },
]

const networkFamilyNodes = [
  { id: "alpha-in", name: "Alpha input", cohort: "Alpha", value: 18 },
  { id: "alpha-out", name: "Alpha output", cohort: "Alpha", value: 14 },
  { id: "beta-in", name: "Beta input", cohort: "Beta", value: 15 },
  { id: "beta-out", name: "Beta output", cohort: "Beta", value: 12 },
  { id: "gamma-in", name: "Gamma input", cohort: "Gamma", value: 12 },
  { id: "gamma-out", name: "Gamma output", cohort: "Gamma", value: 10 },
]

const networkFamilyEdges = [
  {
    id: "alpha-flow",
    source: "alpha-in",
    target: "alpha-out",
    value: 18,
    cohort: "Alpha",
    startTime: 1,
    endTime: 7,
  },
  {
    id: "beta-flow",
    source: "beta-in",
    target: "beta-out",
    value: 15,
    cohort: "Beta",
    startTime: 2,
    endTime: 8,
  },
  {
    id: "gamma-flow",
    source: "gamma-in",
    target: "gamma-out",
    value: 12,
    cohort: "Gamma",
    startTime: 3,
    endTime: 9,
  },
]

const networkFamilyHierarchy = {
  name: "Portfolio",
  cohort: "All",
  children: [
    {
      name: "Alpha",
      cohort: "Alpha",
      children: [
        { name: "Alpha one", cohort: "Alpha", value: 18 },
        { name: "Alpha two", cohort: "Alpha", value: 12 },
      ],
    },
    {
      name: "Beta",
      cohort: "Beta",
      children: [
        { name: "Beta one", cohort: "Beta", value: 15 },
        { name: "Beta two", cohort: "Beta", value: 10 },
      ],
    },
    {
      name: "Gamma",
      cohort: "Gamma",
      children: [
        { name: "Gamma one", cohort: "Gamma", value: 12 },
        { name: "Gamma two", cohort: "Gamma", value: 8 },
      ],
    },
  ],
}

const geoFamilyAreas = [
  {
    type: "Feature",
    cohort: "Alpha",
    properties: { name: "Alpha region", cohort: "Alpha", value: 18 },
    geometry: {
      type: "Polygon",
      coordinates: [[[-18, 42], [-18, 54], [-4, 54], [-4, 42], [-18, 42]]],
    },
  },
  {
    type: "Feature",
    cohort: "Beta",
    properties: { name: "Beta region", cohort: "Beta", value: 14 },
    geometry: {
      type: "Polygon",
      coordinates: [[[-2, 42], [-2, 54], [12, 54], [12, 42], [-2, 42]]],
    },
  },
  {
    type: "Feature",
    cohort: "Gamma",
    properties: { name: "Gamma region", cohort: "Gamma", value: 10 },
    geometry: {
      type: "Polygon",
      coordinates: [[[14, 42], [14, 54], [28, 54], [28, 42], [14, 42]]],
    },
  },
]

const geoFamilyPoints = [
  { id: "alpha", lon: -12, lat: 44, cohort: "Alpha", magnitude: 18, cost: 0 },
  { id: "beta", lon: 5, lat: 54, cohort: "Beta", magnitude: 14, cost: 35 },
  { id: "gamma", lon: 22, lat: 46, cohort: "Gamma", magnitude: 10, cost: 70 },
]

const geoFamilyFlows = [
  { id: "alpha-flow", source: "alpha", target: "beta", cohort: "Alpha", value: 18 },
  { id: "beta-flow", source: "beta", target: "gamma", cohort: "Beta", value: 14 },
  { id: "gamma-flow", source: "gamma", target: "alpha", cohort: "Gamma", value: 10 },
]

const staticOrdinalHoverSourceData = [
  { phase: "Alpha", x: 20, y: 80 },
  { phase: "Beta", x: 50, y: 50 },
  { phase: "Gamma", x: 80, y: 20 },
]

const staticOrdinalLikertData = [
  { prompt: "Clarity", phase: "Alpha", responses: 52 },
  { prompt: "Clarity", phase: "Beta", responses: 30 },
  { prompt: "Clarity", phase: "Gamma", responses: 18 },
  { prompt: "Usefulness", phase: "Alpha", responses: 34 },
  { prompt: "Usefulness", phase: "Beta", responses: 38 },
  { prompt: "Usefulness", phase: "Gamma", responses: 28 },
]

const staticOrdinalSwimlaneData = [
  { lane: "Design", phase: "Alpha", value: 18 },
  { lane: "Design", phase: "Beta", value: 12 },
  { lane: "Design", phase: "Gamma", value: 8 },
  { lane: "Engineering", phase: "Alpha", value: 14 },
  { lane: "Engineering", phase: "Beta", value: 20 },
  { lane: "Engineering", phase: "Gamma", value: 10 },
]

const realtimeHoverSourceData = [
  { cohort: "Alpha", x: 20, y: 80 },
  { cohort: "Beta", x: 50, y: 50 },
  { cohort: "Gamma", x: 80, y: 20 },
]

const realtimeHistogramData = [
  { cohort: "Alpha", time: 5, value: 8 },
  { cohort: "Beta", time: 25, value: 12 },
  { cohort: "Gamma", time: 45, value: 6 },
]

const realtimeLineData = [
  { cohort: "Beta", time: 5, value: 18 },
  { cohort: "Beta", time: 15, value: 32 },
  { cohort: "Beta", time: 25, value: 24 },
  { cohort: "Beta", time: 35, value: 42 },
  { cohort: "Beta", time: 45, value: 30 },
  { cohort: "Beta", time: 55, value: 48 },
]

const realtimeSwarmData = [
  { cohort: "Alpha", time: 8, value: 14 },
  { cohort: "Alpha", time: 14, value: 24 },
  { cohort: "Beta", time: 26, value: 38 },
  { cohort: "Beta", time: 32, value: 30 },
  { cohort: "Gamma", time: 44, value: 48 },
  { cohort: "Gamma", time: 52, value: 40 },
]

const realtimeWaterfallData = [
  { cohort: "Alpha", time: 5, value: 16 },
  { cohort: "Alpha", time: 15, value: -5 },
  { cohort: "Beta", time: 25, value: 12 },
  { cohort: "Beta", time: 35, value: -8 },
  { cohort: "Gamma", time: 45, value: 18 },
  { cohort: "Gamma", time: 55, value: -6 },
]

const realtimeHeatmapData = [
  { cohort: "Alpha", time: 8, value: 12 },
  { cohort: "Alpha", time: 12, value: 18 },
  { cohort: "Beta", time: 28, value: 28 },
  { cohort: "Beta", time: 32, value: 34 },
  { cohort: "Gamma", time: 48, value: 44 },
  { cohort: "Gamma", time: 52, value: 50 },
]

function RealtimeLinkedHoverCohort() {
  const heatmapRef = React.useRef(null)
  const histogramRef = React.useRef(null)
  const lineRef = React.useRef(null)
  const swarmRef = React.useRef(null)
  const waterfallRef = React.useRef(null)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const inputs = [
      [heatmapRef, realtimeHeatmapData],
      [histogramRef, realtimeHistogramData],
      [lineRef, realtimeLineData],
      [swarmRef, realtimeSwarmData],
      [waterfallRef, realtimeWaterfallData],
    ]
    for (const [chartRef, rows] of inputs) chartRef.current?.pushMany(rows)
    setReady(
      inputs.every(
        ([chartRef, rows]) => chartRef.current?.getData().length === rows.length
      )
    )
  }, [])

  const selection = {
    name: "realtime-family-cohort",
    unselectedOpacity: 0.12,
  }
  const commonTimeProps = {
    timeAccessor: "time",
    valueAccessor: "value",
    timeExtent: [0, 60],
    valueExtent: [0, 60],
    width: 230,
    height: 190,
    showAxes: false,
    showLegend: false,
    selection,
  }

  return React.createElement(
    LinkedCharts,
    { showLegend: false },
    React.createElement(
      "div",
      { "data-realtime-cohort-ready": ready ? "true" : "false" },
      React.createElement(
        ChartGrid,
        { columns: 3 },
        LinkedHoverEvidenceChart({
          label: "Realtime hover source",
          testId: "realtime-cohort-source",
          children: React.createElement(Scatterplot, {
            data: realtimeHoverSourceData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "cohort",
            width: 230,
            height: 190,
            margin: 24,
            xExtent: [0, 100],
            yExtent: [0, 100],
            pointRadius: 8,
            hoverRadius: 30,
            linkedHover: {
              name: "realtime-family-cohort",
              fields: ["cohort"],
            },
            selection: { name: "realtime-family-cohort" },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "RealtimeHeatmap (push)",
          testId: "RealtimeHeatmap",
          children: React.createElement(RealtimeHeatmap, {
            ...commonTimeProps,
            ref: heatmapRef,
            heatmapXBins: 3,
            heatmapYBins: 3,
            aggregation: "count",
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "RealtimeHistogram (push)",
          testId: "RealtimeHistogram",
          children: React.createElement(RealtimeHistogram, {
            ...commonTimeProps,
            ref: histogramRef,
            binSize: 20,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "RealtimeLineChart (push)",
          testId: "RealtimeLineChart",
          children: React.createElement(RealtimeLineChart, {
            ...commonTimeProps,
            ref: lineRef,
            stroke: "#7c3aed",
            strokeWidth: 4,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "RealtimeSwarmChart (push)",
          testId: "RealtimeSwarmChart",
          children: React.createElement(RealtimeSwarmChart, {
            ...commonTimeProps,
            ref: swarmRef,
            categoryAccessor: "cohort",
            radius: 7,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "RealtimeWaterfallChart (push)",
          testId: "RealtimeWaterfallChart",
          children: React.createElement(RealtimeWaterfallChart, {
            ...commonTimeProps,
            ref: waterfallRef,
            gap: 3,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "TemporalHistogram (bounded)",
          testId: "TemporalHistogram",
          children: React.createElement(TemporalHistogram, {
            ...commonTimeProps,
            data: realtimeHistogramData,
            binSize: 20,
          }),
        })
      )
    )
  )
}

const physicsHoverSourceData = [
  { cohort: "Alpha", x: 20, y: 80 },
  { cohort: "Beta", x: 50, y: 50 },
  { cohort: "Gamma", x: 80, y: 20 },
]

const physicsCollisionData = [
  { id: "ca1", cohort: "Alpha", lane: "North", score: 18 },
  { id: "ca2", cohort: "Alpha", lane: "South", score: 28 },
  { id: "cb1", cohort: "Beta", lane: "North", score: 44 },
  { id: "cb2", cohort: "Beta", lane: "South", score: 54 },
  { id: "cg1", cohort: "Gamma", lane: "North", score: 72 },
  { id: "cg2", cohort: "Gamma", lane: "South", score: 82 },
]

const physicsEventData = [
  { id: "ea", cohort: "Alpha", time: 6, arrivalTime: 2 },
  { id: "ea2", cohort: "Alpha", time: 14, arrivalTime: 4 },
  { id: "eb", cohort: "Beta", time: 26, arrivalTime: 6 },
  { id: "eb2", cohort: "Beta", time: 34, arrivalTime: 8 },
  { id: "eg", cohort: "Gamma", time: 46, arrivalTime: 10 },
  { id: "eg2", cohort: "Gamma", time: 54, arrivalTime: 12 },
]

const physicsGaltonData = [
  { id: "ga1", cohort: "Alpha", value: 8 },
  { id: "ga2", cohort: "Alpha", value: 14 },
  { id: "ga3", cohort: "Alpha", value: 20 },
  { id: "gb1", cohort: "Beta", value: 26 },
  { id: "gb2", cohort: "Beta", value: 32 },
  { id: "gb3", cohort: "Beta", value: 38 },
  { id: "gg1", cohort: "Gamma", value: 44 },
  { id: "gg2", cohort: "Gamma", value: 50 },
  { id: "gg3", cohort: "Gamma", value: 56 },
]

const physicsPileData = [
  { id: "pa", cohort: "Alpha", category: "Alpha", value: 5 },
  { id: "pb", cohort: "Beta", category: "Beta", value: 4 },
  { id: "pg", cohort: "Gamma", category: "Gamma", value: 6 },
]

const physicsCrucibleData = [
  { id: "ma", label: "Alpha material", category: "Alpha", cohort: "Alpha", amount: 8 },
  { id: "mb", label: "Beta material", category: "Beta", cohort: "Beta", amount: 6 },
  { id: "mg", label: "Gamma material", category: "Gamma", cohort: "Gamma", amount: 5 },
]

const physicsGauntletData = [
  {
    id: "qa",
    label: "Alpha project",
    cohort: "Alpha",
    positives: ["signal", "reserve"],
    negatives: [],
  },
  {
    id: "qb",
    label: "Beta project",
    cohort: "Beta",
    positives: ["signal", "reserve"],
    negatives: [],
  },
  {
    id: "qg",
    label: "Gamma project",
    cohort: "Gamma",
    positives: ["signal", "reserve"],
    negatives: [],
  },
]

const physicsFlowNodes = [
  { id: "source", label: "Source", x: 0.08, y: 0.5 },
  { id: "sink", label: "Sink", x: 0.92, y: 0.5 },
]

const physicsPacketLinks = [
  { id: "fa", cohort: "Alpha", source: "source", target: "sink", value: 8 },
  { id: "fb", cohort: "Beta", source: "source", target: "sink", value: 6 },
  { id: "fg", cohort: "Gamma", source: "source", target: "sink", value: 5 },
]

const physicsProcessData = [
  { id: "wa", cohort: "Alpha", stage: "work" },
  { id: "wb", cohort: "Beta", stage: "review" },
  { id: "wg", cohort: "Gamma", stage: "work" },
]

const physicsProcessStages = [
  { id: "work", label: "Work", force: 10 },
  { id: "review", label: "Review", force: 8 },
  { id: "done", label: "Done", absorb: true },
]

function PhysicsHoverSource({ selectionName, testId }) {
  return LinkedHoverEvidenceChart({
    label: "Physics hover source",
    testId,
    children: React.createElement(Scatterplot, {
      data: physicsHoverSourceData,
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "cohort",
      width: 260,
      height: 200,
      margin: 24,
      xExtent: [0, 100],
      yExtent: [0, 100],
      pointRadius: 8,
      hoverRadius: 30,
      linkedHover: { name: selectionName, fields: ["cohort"] },
      selection: { name: selectionName },
      showLegend: false,
    }),
  })
}

function usePhysicsSettledCallbacks(chartNames) {
  const [settled, setSettled] = React.useState(() => new Set())
  const callbacks = React.useMemo(
    () =>
      Object.fromEntries(
        chartNames.map((chartName) => [
          chartName,
          (state, previousState) => {
            if (state !== "settled" || previousState !== "running") return
            setSettled((current) => {
              if (current.has(chartName)) return current
              const next = new Set(current)
              next.add(chartName)
              return next
            })
          },
        ])
      ),
    [chartNames]
  )
  return {
    callbacks,
    ready: settled.size === chartNames.length,
    settled,
  }
}

const SETTLED_PHYSICS_NAMES = [
  "CollisionSwarmChart",
  "EventDropChart",
  "GaltonBoardChart",
  "UnitPileChart",
]

function SettledPhysicsLinkedHoverCohort() {
  const readiness = usePhysicsSettledCallbacks(SETTLED_PHYSICS_NAMES)
  const selection = {
    name: "physics-settled-cohort",
    unselectedOpacity: 0.12,
  }
  const common = {
    size: [280, 210],
    colorBy: "cohort",
    selection,
    showProjection: true,
  }

  return React.createElement(
    LinkedCharts,
    { showLegend: false },
    React.createElement(
      "div",
      { "data-physics-settled-ready": readiness.ready ? "true" : "false" },
      React.createElement(
        ChartGrid,
        { columns: 2 },
        React.createElement(PhysicsHoverSource, {
          selectionName: "physics-settled-cohort",
          testId: "physics-settled-source",
        }),
        LinkedHoverEvidenceChart({
          label: "CollisionSwarmChart (settled)",
          testId: "CollisionSwarmChart",
          children: React.createElement(CollisionSwarmChart, {
            ...common,
            data: physicsCollisionData,
            xAccessor: "score",
            groupAccessor: "lane",
            xExtent: [0, 100],
            collisionIterations: 100,
            settle: true,
            onSimulationStateChange:
              readiness.callbacks.CollisionSwarmChart,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "EventDropChart (settled)",
          testId: "EventDropChart",
          children: React.createElement(EventDropChart, {
            ...common,
            data: physicsEventData,
            timeAccessor: "time",
            arrivalAccessor: "arrivalTime",
            windows: { size: 20 },
            timeExtent: [0, 60],
            timeScale: 0.2,
            onSimulationStateChange: readiness.callbacks.EventDropChart,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "GaltonBoardChart (settled)",
          testId: "GaltonBoardChart",
          children: React.createElement(GaltonBoardChart, {
            ...common,
            data: physicsGaltonData,
            valueAccessor: "value",
            valueExtent: [0, 60],
            bins: 6,
            pegRows: 5,
            ballRadius: 5,
            onSimulationStateChange: readiness.callbacks.GaltonBoardChart,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "UnitPileChart (settled)",
          testId: "UnitPileChart",
          children: React.createElement(UnitPileChart, {
            ...common,
            data: physicsPileData,
            categoryAccessor: "category",
            valueAccessor: "value",
            unitValue: 1,
            ballRadius: 5,
            onSimulationStateChange: readiness.callbacks.UnitPileChart,
          }),
        })
      )
    )
  )
}

const AUTHORED_PHYSICS_SIM_NAMES = ["ProcessFlowChart"]

function useMaterializedPhysicsRef(ref) {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    let frame = 0
    const inspect = () => {
      if ((ref.current?.getData().length ?? 0) > 0) {
        setReady(true)
        return
      }
      frame = requestAnimationFrame(inspect)
    }
    frame = requestAnimationFrame(inspect)
    return () => cancelAnimationFrame(frame)
  }, [ref])
  return ready
}

function AuthoredPhysicsLinkedHoverCohort() {
  const simulationReadiness = usePhysicsSettledCallbacks(
    AUTHORED_PHYSICS_SIM_NAMES
  )
  const [crucibleReady, setCrucibleReady] = React.useState(false)
  const [gauntletReady, setGauntletReady] = React.useState(false)
  const packetRef = React.useRef(null)
  const packetReady = useMaterializedPhysicsRef(packetRef)
  const selection = {
    name: "physics-authored-cohort",
    unselectedOpacity: 0.12,
  }
  const ready =
    crucibleReady && gauntletReady && packetReady && simulationReadiness.ready

  return React.createElement(
    LinkedCharts,
    { showLegend: false },
    React.createElement(
      "div",
      {
        "data-physics-authored-ready": ready ? "true" : "false",
        "data-physics-authored-ready-parts": [
          crucibleReady ? "CrucibleChart" : "",
          gauntletReady ? "GauntletChart" : "",
          packetReady ? "PacketFlowChart" : "",
          ...simulationReadiness.settled,
        ]
          .filter(Boolean)
          .join(","),
      },
      React.createElement(
        ChartGrid,
        { columns: 2 },
        React.createElement(PhysicsHoverSource, {
          selectionName: "physics-authored-cohort",
          testId: "physics-authored-source",
        }),
        LinkedHoverEvidenceChart({
          label: "CrucibleChart (terminal snapshot)",
          testId: "CrucibleChart",
          children: React.createElement(CrucibleChart, {
            data: physicsCrucibleData,
            phases: [{ id: "assay", label: "Assay", duration: 1, motion: "mix" }],
            idAccessor: "id",
            labelAccessor: "label",
            categoryAccessor: "category",
            amountAccessor: "amount",
            colorBy: "category",
            playback: "snapshot",
            size: [300, 220],
            showProjection: true,
            selection,
            onStateChange: (state) => {
              if (state.complete) setCrucibleReady(true)
            },
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "GauntletChart (terminal event)",
          testId: "GauntletChart",
          children: React.createElement(GauntletChart, {
            data: physicsGauntletData,
            idAccessor: "id",
            labelAccessor: "label",
            positiveAccessor: "positives",
            negativeAccessor: "negatives",
            positiveProperties: [
              { id: "signal", label: "Signal" },
              { id: "reserve", label: "Reserve" },
            ],
            negativeProperties: [{ id: "drag", label: "Drag" }],
            gates: [{ id: "review", label: "Review", time: 0.25 }],
            events: [
              {
                id: "finish",
                label: "Finish",
                time: 0.25,
                gateId: "review",
                final: true,
                effects: [
                  { popPositive: ["signal"], addNegative: ["drag"] },
                ],
              },
            ],
            size: [300, 220],
            showProjection: true,
            selection,
            frameProps: { config: { kernel: { seed: 7 } } },
            onStateChange: (states) => {
              if (
                states.length === physicsGauntletData.length &&
                states.every((state) => state.eventsApplied.includes("finish"))
              ) {
                setGauntletReady(true)
              }
            },
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "PacketFlowChart (authored routes)",
          testId: "PacketFlowChart",
          children: React.createElement(PacketFlowChart, {
            ref: packetRef,
            nodes: physicsFlowNodes,
            links: physicsPacketLinks,
            colorBy: "cohort",
            size: [300, 220],
            reducedMotion: true,
            showNodeLabels: true,
            particleRate: 1,
            maxParticles: 12,
            selection,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "ProcessFlowChart (authored stages)",
          testId: "ProcessFlowChart",
          children: React.createElement(ProcessFlowChart, {
            data: physicsProcessData,
            stages: physicsProcessStages,
            idAccessor: "id",
            stageAccessor: "stage",
            colorBy: "cohort",
            size: [300, 220],
            settle: true,
            showProjection: true,
            selection,
            onSimulationStateChange:
              simulationReadiness.callbacks.ProcessFlowChart,
          }),
        })
      )
    )
  )
}

const waveOneRadarData = [
  { series: "Current", metric: "Speed", score: 78 },
  { series: "Current", metric: "Quality", score: 62 },
  { series: "Current", metric: "Reach", score: 48 },
  { series: "Target", metric: "Speed", score: 90 },
  { series: "Target", metric: "Quality", score: 82 },
  { series: "Target", metric: "Reach", score: 72 },
]

const waveOneWaterfallData = [
  { metric: "Speed", change: 24 },
  { metric: "Quality", change: -8 },
  { metric: "Reach", change: 15 },
]

// ── Test cases ──────────────────────────────────────────────────────────

const examples = [
  // 1. LinkedCharts with hover cross-highlighting
  TestCase({
    title: "Linked Hover: Scatter + Bar",
    testId: "linked-hover",
    children: React.createElement(
      CategoryColorProvider,
      { categories: ["North", "South", "East"] },
      React.createElement(
        LinkedCharts,
        { showLegend: true },
        React.createElement(
          ChartGrid,
          { columns: 2 },
          React.createElement(Scatterplot, {
            data: scatterData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "region",
            width: 350,
            height: 250,
            linkedHover: { name: "hl", fields: ["region"] },
            selection: { name: "hl" },
            showLegend: false,
          }),
          React.createElement(BarChart, {
            data: barSummary,
            categoryAccessor: "region",
            valueAccessor: "total",
            colorBy: "region",
            width: 350,
            height: 250,
            selection: { name: "hl" },
            showLegend: false,
          })
        )
      )
    ),
  }),

  // 2. ChartGrid with emphasis
  TestCase({
    title: "ChartGrid with Emphasis",
    testId: "grid-emphasis",
    children: React.createElement(
      ChartGrid,
      { columns: 2 },
      React.createElement(LineChart, {
        data: dashboardData.filter((d) => d.region === "North"),
        xAccessor: "month",
        yAccessor: "revenue",
        width: 350,
        height: 200,
        emphasis: "primary",
      }),
      React.createElement(BarChart, {
        data: barSummary,
        categoryAccessor: "region",
        valueAccessor: "total",
        width: 350,
        height: 200,
      }),
      React.createElement(Scatterplot, {
        data: scatterData,
        xAccessor: "x",
        yAccessor: "y",
        width: 350,
        height: 200,
      })
    ),
  }),

  // 3. Empty state rendering
  TestCase({
    title: "Empty State",
    testId: "empty-state",
    children: React.createElement(LineChart, {
      data: [],
      xAccessor: "x",
      yAccessor: "y",
      width: 350,
      height: 200,
    }),
  }),

  // 4. Multiple linked charts (3-way)
  TestCase({
    title: "Three-Way Linked Charts",
    testId: "three-way-linked",
    children: React.createElement(
      CategoryColorProvider,
      { categories: ["North", "South", "East"] },
      React.createElement(
        LinkedCharts,
        null,
        React.createElement(
          ChartGrid,
          { columns: 3 },
          React.createElement(Scatterplot, {
            data: scatterData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "region",
            width: 250,
            height: 200,
            linkedHover: { name: "hl", fields: ["region"] },
            selection: { name: "hl" },
            showLegend: false,
          }),
          React.createElement(BarChart, {
            data: barSummary,
            categoryAccessor: "region",
            valueAccessor: "total",
            colorBy: "region",
            width: 250,
            height: 200,
            selection: { name: "hl" },
            showLegend: false,
          }),
          React.createElement(LineChart, {
            data: dashboardData,
            xAccessor: "month",
            yAccessor: "revenue",
            lineBy: "region",
            colorBy: "region",
            width: 250,
            height: 200,
            selection: { name: "hl" },
            showLegend: false,
          })
        )
      )
    ),
  }),

  // 5. XY family linked-hover targets
  TestCase({
    title: "Linked Hover: XY series targets",
    testId: "xy-linked-hover",
    children: React.createElement(
      CategoryColorProvider,
      { categories: ["North", "South", "East"] },
      React.createElement(
        LinkedCharts,
        null,
        React.createElement(
          ChartGrid,
          { columns: 4 },
          React.createElement(Scatterplot, {
            data: scatterData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "region",
            width: 220,
            height: 180,
            linkedHover: { name: "xyhl", fields: ["region"] },
            selection: { name: "xyhl" },
            showLegend: false,
          }),
          React.createElement(LineChart, {
            data: dashboardData,
            xAccessor: "month",
            yAccessor: "revenue",
            lineBy: "region",
            colorBy: "region",
            width: 220,
            height: 180,
            selection: { name: "xyhl" },
            showLegend: false,
          }),
          React.createElement(AreaChart, {
            data: dashboardData,
            xAccessor: "month",
            yAccessor: "revenue",
            areaBy: "region",
            colorBy: "region",
            width: 220,
            height: 180,
            selection: { name: "xyhl" },
            showLegend: false,
          }),
          React.createElement(StackedAreaChart, {
            data: dashboardData,
            xAccessor: "month",
            yAccessor: "revenue",
            areaBy: "region",
            colorBy: "region",
            width: 220,
            height: 180,
            selection: { name: "xyhl" },
            showLegend: false,
          })
        )
      )
    ),
  }),

  // 6. Ordinal composition linked-hover targets
  TestCase({
    title: "Linked Hover: Ordinal composition targets",
    testId: "ordinal-linked-hover",
    children: React.createElement(
      CategoryColorProvider,
      { categories: ["North", "South", "East"] },
      React.createElement(
        LinkedCharts,
        null,
        React.createElement(
          ChartGrid,
          { columns: 3 },
          React.createElement(Scatterplot, {
            data: scatterData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "region",
            width: 240,
            height: 190,
            linkedHover: { name: "ordhl", fields: ["region"] },
            selection: { name: "ordhl" },
            showLegend: false,
          }),
          React.createElement(GroupedBarChart, {
            data: groupedCategoryData,
            categoryAccessor: "region",
            valueAccessor: "value",
            groupBy: "segment",
            colorBy: "region",
            width: 240,
            height: 190,
            selection: { name: "ordhl" },
            showLegend: false,
          }),
          React.createElement(StackedBarChart, {
            data: groupedCategoryData,
            categoryAccessor: "region",
            valueAccessor: "value",
            stackBy: "segment",
            colorBy: "region",
            width: 240,
            height: 190,
            selection: { name: "ordhl" },
            showLegend: false,
          }),
          React.createElement(DonutChart, {
            data: barSummary,
            categoryAccessor: "region",
            valueAccessor: "total",
            colorBy: "region",
            width: 240,
            height: 220,
            selection: { name: "ordhl" },
            showLegend: false,
          }),
          React.createElement(PieChart, {
            data: barSummary,
            categoryAccessor: "region",
            valueAccessor: "total",
            colorBy: "region",
            width: 240,
            height: 220,
            selection: { name: "ordhl" },
            showLegend: false,
          }),
          React.createElement(FunnelChart, {
            data: barSummary,
            stepAccessor: "region",
            valueAccessor: "total",
            colorBy: "region",
            width: 240,
            height: 190,
            selection: { name: "ordhl" },
            showLegend: false,
          })
        )
      )
    ),
  }),

  // 7. Statistical ordinal linked-hover targets
  TestCase({
    title: "Linked Hover: Statistical ordinal targets",
    testId: "statistical-linked-hover",
    children: React.createElement(
      CategoryColorProvider,
      { categories: ["Alpha", "Beta", "Gamma"] },
      React.createElement(
        LinkedCharts,
        null,
        React.createElement(
          ChartGrid,
          { columns: 4 },
          React.createElement(Scatterplot, {
            data: statisticalScatterData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "category",
            width: 220,
            height: 180,
            linkedHover: { name: "stathl", fields: ["category"] },
            selection: { name: "stathl" },
            showLegend: false,
          }),
          React.createElement(BoxPlot, {
            data: statisticalData,
            categoryAccessor: "category",
            valueAccessor: "value",
            colorBy: "category",
            width: 220,
            height: 180,
            selection: { name: "stathl" },
            showLegend: false,
          }),
          React.createElement(DotPlot, {
            data: statisticalData,
            categoryAccessor: "category",
            valueAccessor: "value",
            colorBy: "category",
            width: 220,
            height: 180,
            selection: { name: "stathl" },
            showLegend: false,
          }),
          React.createElement(Histogram, {
            data: statisticalData,
            categoryAccessor: "category",
            valueAccessor: "value",
            colorBy: "category",
            width: 220,
            height: 180,
            selection: { name: "stathl" },
            showLegend: false,
          }),
          React.createElement(RidgelinePlot, {
            data: statisticalData,
            categoryAccessor: "category",
            valueAccessor: "value",
            colorBy: "category",
            width: 220,
            height: 180,
            selection: { name: "stathl" },
            showLegend: false,
          }),
          React.createElement(SwarmPlot, {
            data: statisticalData,
            categoryAccessor: "category",
            valueAccessor: "value",
            colorBy: "category",
            width: 220,
            height: 180,
            selection: { name: "stathl" },
            showLegend: false,
          }),
          React.createElement(ViolinPlot, {
            data: statisticalData,
            categoryAccessor: "category",
            valueAccessor: "value",
            colorBy: "category",
            width: 220,
            height: 180,
            selection: { name: "stathl" },
            showLegend: false,
          })
        )
      )
    ),
  }),

  // 8. X-position linked-hover click lock
  TestCase({
    title: "Linked Hover: Locked x-position crosshair",
    testId: "linked-crosshair-lock",
    children: React.createElement(
      LinkedCharts,
      null,
      React.createElement(
        ChartGrid,
        { columns: 2 },
        React.createElement(LineChart, {
          data: crosshairPrimaryData,
          xAccessor: "month",
          yAccessor: "value",
          width: 320,
          height: 180,
          margin: 20,
          xExtent: [1, 5],
          yExtent: [0, 200],
          color: "#38bdf8",
          showPoints: true,
          pointRadius: 4,
          hoverRadius: 80,
          tooltip: false,
          linkedHover: { name: "lockhl", mode: "x-position", xField: "month" },
          showLegend: false,
          frameProps: { background: "#111827" },
        }),
        React.createElement(LineChart, {
          data: crosshairSecondaryData,
          xAccessor: "month",
          yAccessor: "value",
          width: 320,
          height: 180,
          margin: 20,
          xExtent: [1, 5],
          yExtent: [0, 200],
          color: "#f97316",
          showPoints: true,
          pointRadius: 4,
          hoverRadius: 80,
          tooltip: false,
          linkedHover: { name: "lockhl", mode: "x-position", xField: "month" },
          showLegend: false,
          frameProps: { background: "#111827" },
        })
      )
    ),
  }),

  // 9. Wave 1 named HOCs: RadarChart + static WaterfallChart
  TestCase({
    title: "Linked Hover: Radar and Waterfall targets",
    testId: "wave-one-hoc-linked-hover",
    children: React.createElement(
      LinkedCharts,
      { showLegend: false },
      React.createElement(
        ChartGrid,
        { columns: 3 },
        React.createElement(Scatterplot, {
          data: waveOneHoverSourceData,
          xAccessor: "x",
          yAccessor: "y",
          colorBy: "metric",
          width: 240,
          height: 210,
          margin: 30,
          xExtent: [0, 100],
          yExtent: [0, 100],
          pointRadius: 7,
          hoverRadius: 28,
          linkedHover: { name: "wave-one-hocs", fields: ["metric"] },
          selection: { name: "wave-one-hocs" },
          showLegend: false,
        }),
        React.createElement(RadarChart, {
          data: waveOneRadarData,
          categoryAccessor: "metric",
          valueAccessor: "score",
          seriesAccessor: "series",
          colorBy: "series",
          width: 240,
          height: 210,
          selection: { name: "wave-one-hocs" },
          showLegend: false,
        }),
        React.createElement(WaterfallChart, {
          data: waveOneWaterfallData,
          xAccessor: "metric",
          yAccessor: "change",
          width: 240,
          height: 210,
          selection: { name: "wave-one-hocs" },
          showLegend: false,
        })
      )
    ),
  }),

  // 10. Remaining deterministic XY HOCs. Each chart is individually
  // addressable so the Playwright contract can prove its rendered pixels
  // changed before the family snapshot is accepted as linked-hover evidence.
  TestCase({
    title: "Linked Hover: Deterministic XY family",
    testId: "deterministic-xy-linked-hover",
    children: React.createElement(
      LinkedCharts,
      { showLegend: false },
      React.createElement(
        ChartGrid,
        { columns: 3 },
        LinkedHoverEvidenceChart({
          label: "Cohort hover source",
          testId: "cohort-source",
          children: React.createElement(Scatterplot, {
            data: xyFamilyHoverSourceData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "cohort",
            width: 230,
            height: 190,
            margin: 24,
            xExtent: [0, 100],
            yExtent: [0, 100],
            pointRadius: 8,
            hoverRadius: 30,
            linkedHover: { name: "xy-family-cohort", fields: ["cohort"] },
            selection: { name: "xy-family-cohort" },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "BubbleChart",
          testId: "BubbleChart",
          children: React.createElement(BubbleChart, {
            data: xyFamilyPointData,
            xAccessor: "x",
            yAccessor: "y",
            sizeBy: "size",
            colorBy: "cohort",
            width: 230,
            height: 190,
            selection: { name: "xy-family-cohort", unselectedOpacity: 0.18 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "BumpChart",
          testId: "BumpChart",
          children: React.createElement(BumpChart, {
            data: xyFamilyBumpData,
            xAccessor: "quarter",
            yAccessor: "value",
            lineBy: "series",
            width: 230,
            height: 190,
            showLabels: false,
            selection: { name: "xy-family-cohort", unselectedOpacity: 0.18 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "CandlestickChart",
          testId: "CandlestickChart",
          children: React.createElement(CandlestickChart, {
            data: xyFamilyCandlestickData,
            xAccessor: "x",
            openAccessor: "open",
            highAccessor: "high",
            lowAccessor: "low",
            closeAccessor: "close",
            width: 230,
            height: 190,
            selection: { name: "xy-family-cohort", unselectedOpacity: 0.18 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "ConnectedScatterplot",
          testId: "ConnectedScatterplot",
          children: React.createElement(ConnectedScatterplot, {
            data: xyFamilyPointData,
            xAccessor: "x",
            yAccessor: "y",
            orderAccessor: "x",
            width: 230,
            height: 190,
            pointRadius: 6,
            selection: { name: "xy-family-cohort", unselectedOpacity: 0.18 },
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "Heatmap",
          testId: "Heatmap",
          children: React.createElement(Heatmap, {
            data: xyFamilyHeatmapData,
            xAccessor: "x",
            yAccessor: "y",
            valueAccessor: "value",
            width: 230,
            height: 190,
            selection: { name: "xy-family-cohort", unselectedOpacity: 0.18 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "QuadrantChart",
          testId: "QuadrantChart",
          children: React.createElement(QuadrantChart, {
            data: xyFamilyPointData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "cohort",
            xCenter: 50,
            yCenter: 50,
            width: 230,
            height: 190,
            selection: { name: "xy-family-cohort", unselectedOpacity: 0.18 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "Multi-axis hover source",
          testId: "multi-axis-source",
          children: React.createElement(Scatterplot, {
            data: multiAxisHoverSourceData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "__ma_series",
            width: 230,
            height: 190,
            margin: 24,
            xExtent: [0, 100],
            yExtent: [0, 100],
            pointRadius: 8,
            hoverRadius: 30,
            linkedHover: { name: "xy-family-multi-axis", fields: ["__ma_series"] },
            selection: { name: "xy-family-multi-axis" },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "MultiAxisLineChart",
          testId: "MultiAxisLineChart",
          children: React.createElement(MultiAxisLineChart, {
            data: multiAxisEvidenceData,
            xAccessor: "month",
            series: [
              { yAccessor: "revenue", label: "Revenue", color: "#2563eb" },
              { yAccessor: "signups", label: "Signups", color: "#dc2626" },
            ],
            width: 230,
            height: 190,
            selection: { name: "xy-family-multi-axis", unselectedOpacity: 0.18 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "Difference hover source",
          testId: "difference-source",
          children: React.createElement(Scatterplot, {
            data: differenceHoverSourceData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "__diffWinner",
            width: 230,
            height: 190,
            margin: 24,
            xExtent: [0, 100],
            yExtent: [0, 100],
            pointRadius: 8,
            hoverRadius: 30,
            linkedHover: { name: "xy-family-difference", fields: ["__diffWinner"] },
            selection: { name: "xy-family-difference" },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "DifferenceChart",
          testId: "DifferenceChart",
          children: React.createElement(DifferenceChart, {
            data: differenceEvidenceData,
            xAccessor: "x",
            seriesAAccessor: "a",
            seriesBAccessor: "b",
            width: 230,
            height: 190,
            showPoints: true,
            selection: { name: "xy-family-difference", unselectedOpacity: 0.18 },
            showLegend: false,
          }),
        })
      )
    ),
  }),

  // 11. Deterministic network and hierarchy forms. The source uses the same
  // authored `cohort` field carried by every node and edge so the browser test
  // can prove that each target repaints from a real shared selection.
  TestCase({
    title: "Linked Hover: Deterministic network family",
    testId: "deterministic-network-linked-hover",
    children: React.createElement(
      LinkedCharts,
      { showLegend: false },
      React.createElement(
        ChartGrid,
        { columns: 3 },
        LinkedHoverEvidenceChart({
          label: "Network hover source",
          testId: "network-cohort-source",
          children: React.createElement(Scatterplot, {
            data: xyFamilyHoverSourceData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "cohort",
            width: 230,
            height: 200,
            margin: 24,
            xExtent: [0, 100],
            yExtent: [0, 100],
            pointRadius: 8,
            hoverRadius: 30,
            linkedHover: { name: "network-family-cohort", fields: ["cohort"] },
            selection: { name: "network-family-cohort" },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "ChordDiagram",
          testId: "ChordDiagram",
          children: React.createElement(ChordDiagram, {
            nodes: networkFamilyNodes,
            edges: networkFamilyEdges,
            colorBy: "cohort",
            width: 230,
            height: 200,
            showLabels: false,
            animate: false,
            selection: { name: "network-family-cohort", unselectedOpacity: 0.12 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "CirclePack",
          testId: "CirclePack",
          children: React.createElement(CirclePack, {
            data: networkFamilyHierarchy,
            valueAccessor: "value",
            colorBy: "cohort",
            width: 230,
            height: 200,
            showLabels: false,
            animate: false,
            selection: { name: "network-family-cohort", unselectedOpacity: 0.12 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "ForceDirectedGraph",
          testId: "ForceDirectedGraph",
          children: React.createElement(ForceDirectedGraph, {
            nodes: networkFamilyNodes,
            edges: networkFamilyEdges,
            colorBy: "cohort",
            width: 230,
            height: 200,
            iterations: 120,
            layoutExecution: "sync",
            showLabels: false,
            animate: false,
            selection: { name: "network-family-cohort", unselectedOpacity: 0.12 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "OrbitDiagram",
          testId: "OrbitDiagram",
          children: React.createElement(OrbitDiagram, {
            data: networkFamilyHierarchy,
            colorBy: "cohort",
            width: 230,
            height: 200,
            showLabels: false,
            animated: false,
            selection: { name: "network-family-cohort", unselectedOpacity: 0.12 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "ProcessSankey",
          testId: "ProcessSankey",
          children: React.createElement(ProcessSankey, {
            nodes: networkFamilyNodes,
            edges: networkFamilyEdges,
            domain: [0, 10],
            colorBy: "cohort",
            width: 230,
            height: 200,
            packing: "off",
            maxValueScale: 1,
            layoutExecution: "sync",
            selectionDatum: "raw",
            showLabels: false,
            showLaneRails: true,
            selection: { name: "network-family-cohort", unselectedOpacity: 0.12 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "SankeyDiagram",
          testId: "SankeyDiagram",
          children: React.createElement(SankeyDiagram, {
            nodes: networkFamilyNodes,
            edges: networkFamilyEdges,
            colorBy: "cohort",
            width: 230,
            height: 200,
            showLabels: false,
            animate: false,
            selection: { name: "network-family-cohort", unselectedOpacity: 0.12 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "TreeDiagram",
          testId: "TreeDiagram",
          children: React.createElement(TreeDiagram, {
            data: networkFamilyHierarchy,
            colorBy: "cohort",
            width: 230,
            height: 200,
            showLabels: false,
            animate: false,
            selection: { name: "network-family-cohort", unselectedOpacity: 0.12 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "Treemap",
          testId: "Treemap",
          children: React.createElement(Treemap, {
            data: networkFamilyHierarchy,
            valueAccessor: "value",
            colorBy: "cohort",
            width: 230,
            height: 200,
            showLabels: false,
            animate: false,
            selection: { name: "network-family-cohort", unselectedOpacity: 0.12 },
            showLegend: false,
          }),
        })
      )
    ),
  }),

  // 12. Deterministic geo forms. GeoJSON features carry `cohort` both as a
  // legal top-level foreign member (style predicates) and in `properties`
  // (hover payloads), while points and flows carry the same authored field.
  TestCase({
    title: "Linked Hover: Deterministic geo family",
    testId: "deterministic-geo-linked-hover",
    children: React.createElement(
      LinkedCharts,
      { showLegend: false },
      React.createElement(
        ChartGrid,
        { columns: 3 },
        LinkedHoverEvidenceChart({
          label: "Geo hover source",
          testId: "geo-cohort-source",
          children: React.createElement(Scatterplot, {
            data: xyFamilyHoverSourceData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "cohort",
            width: 230,
            height: 200,
            margin: 24,
            xExtent: [0, 100],
            yExtent: [0, 100],
            pointRadius: 8,
            hoverRadius: 30,
            linkedHover: { name: "geo-family-cohort", fields: ["cohort"] },
            selection: { name: "geo-family-cohort" },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "ChoroplethMap",
          testId: "ChoroplethMap",
          children: React.createElement(ChoroplethMap, {
            areas: geoFamilyAreas,
            valueAccessor: "value",
            width: 230,
            height: 200,
            fitPadding: 0.1,
            animate: false,
            selection: { name: "geo-family-cohort", unselectedOpacity: 0.12 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "DistanceCartogram",
          testId: "DistanceCartogram",
          children: React.createElement(DistanceCartogram, {
            points: geoFamilyPoints,
            nodeIdAccessor: "id",
            xAccessor: "lon",
            yAccessor: "lat",
            center: "alpha",
            costAccessor: "cost",
            colorBy: "cohort",
            width: 230,
            height: 200,
            fitPadding: 0.1,
            transition: 0,
            animate: false,
            selection: { name: "geo-family-cohort", unselectedOpacity: 0.12 },
            showLegend: false,
            showRingLabels: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "FlowMap",
          testId: "FlowMap",
          children: React.createElement(FlowMap, {
            nodes: geoFamilyPoints,
            flows: geoFamilyFlows,
            nodeIdAccessor: "id",
            xAccessor: "lon",
            yAccessor: "lat",
            valueAccessor: "value",
            edgeColorBy: "cohort",
            width: 230,
            height: 200,
            fitPadding: 0.1,
            lineType: "line",
            showParticles: false,
            animate: false,
            selection: { name: "geo-family-cohort", unselectedOpacity: 0.12 },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "ProportionalSymbolMap",
          testId: "ProportionalSymbolMap",
          children: React.createElement(ProportionalSymbolMap, {
            points: geoFamilyPoints,
            xAccessor: "lon",
            yAccessor: "lat",
            sizeBy: "magnitude",
            colorBy: "cohort",
            width: 230,
            height: 200,
            fitPadding: 0.15,
            animate: false,
            selection: { name: "geo-family-cohort", unselectedOpacity: 0.12 },
            showLegend: false,
          }),
        })
      )
    ),
  }),

  // 13. The two remaining static ordinal HOCs share the caller-visible
  // `phase` field. Likert's pre-aggregation must preserve that alias so its
  // selection contract matches Swimlane's direct rows.
  TestCase({
    title: "Linked Hover: Remaining static ordinal charts",
    testId: "deterministic-static-ordinal-linked-hover",
    children: React.createElement(
      LinkedCharts,
      { showLegend: false },
      React.createElement(
        ChartGrid,
        { columns: 3 },
        LinkedHoverEvidenceChart({
          label: "Static ordinal hover source",
          testId: "static-ordinal-source",
          children: React.createElement(Scatterplot, {
            data: staticOrdinalHoverSourceData,
            xAccessor: "x",
            yAccessor: "y",
            colorBy: "phase",
            width: 260,
            height: 220,
            margin: 28,
            xExtent: [0, 100],
            yExtent: [0, 100],
            pointRadius: 8,
            hoverRadius: 30,
            linkedHover: {
              name: "static-ordinal-phase",
              fields: ["phase"],
            },
            selection: { name: "static-ordinal-phase" },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "LikertChart",
          testId: "LikertChart",
          children: React.createElement(LikertChart, {
            data: staticOrdinalLikertData,
            categoryAccessor: "prompt",
            levelAccessor: "phase",
            countAccessor: "responses",
            levels: ["Alpha", "Beta", "Gamma"],
            width: 300,
            height: 220,
            animate: false,
            selection: {
              name: "static-ordinal-phase",
              unselectedOpacity: 0.12,
            },
            showLegend: false,
          }),
        }),
        LinkedHoverEvidenceChart({
          label: "SwimlaneChart",
          testId: "SwimlaneChart",
          children: React.createElement(SwimlaneChart, {
            data: staticOrdinalSwimlaneData,
            categoryAccessor: "lane",
            subcategoryAccessor: "phase",
            valueAccessor: "value",
            colorBy: "phase",
            width: 300,
            height: 220,
            animate: false,
            selection: {
              name: "static-ordinal-phase",
              unselectedOpacity: 0.12,
            },
            showLegend: false,
          }),
        })
      )
    ),
  }),

  // 14. Five realtime charts exercise their public imperative handles with
  // `data` omitted. TemporalHistogram is intentionally the bounded sibling,
  // so it uses its required `data` prop while sharing the same linked cohort.
  TestCase({
    title: "Linked Hover: Realtime family public contracts",
    testId: "deterministic-realtime-linked-hover",
    children: React.createElement(RealtimeLinkedHoverCohort),
  }),

  // 15. Physics forms with a distribution reading wait for the actual public
  // running→settled signal before linked-selection fingerprints are sampled.
  TestCase({
    title: "Linked Hover: Settled physics family",
    testId: "deterministic-settled-physics-linked-hover",
    children: React.createElement(SettledPhysicsLinkedHoverCohort),
  }),

  // 16. Authored-state physics forms use terminal snapshots/events/routes and
  // stages. Readiness comes from domain state plus the shared settle callback.
  TestCase({
    title: "Linked Hover: Authored and terminal physics family",
    testId: "deterministic-authored-physics-linked-hover",
    children: React.createElement(AuthoredPhysicsLinkedHoverCohort),
  }),
]

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(React.Fragment, null, ...examples))
