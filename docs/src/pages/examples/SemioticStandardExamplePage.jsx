import { useMemo, useState } from "react"
import { StackedAreaChart, Heatmap, LineChart, Scatterplot } from "semiotic/xy"
import { BarChart, BoxPlot, DonutChart, Histogram } from "semiotic/ordinal"
import { ForceDirectedGraph, SankeyDiagram, Treemap } from "semiotic/network"
import { DistanceCartogram, FlowMap, ProportionalSymbolMap } from "semiotic/geo"
import { GaltonBoardChart, GauntletChart } from "semiotic/physics"
import { ThemeProvider } from "semiotic/themes/react"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  WORLD_COUNTRIES,
  WORLD_DATA_RETRIEVED,
  WORLD_DATA_SOURCE,
  WORLD_DATA_SOURCE_URL,
  WORLD_LATEST_YEAR,
  WORLD_OBSERVATIONS,
} from "./data/worldDevelopment"
import "./SemioticStandardExamplePage.css"

const RED = "#ed1c24"
const INK = "#11110e"
const BLUE = "#343d96"
const ORANGE = "#ed6711"
const WARM_GRAY = "#8f8782"
const PAPER = "#e7e9f1"

const METRICS = [
  {
    key: "lifeExpectancy",
    code: "LIFE",
    number: "01",
    label: "Life expectancy",
    unit: "years at birth",
    fieldCode: "SP.DYN.LE00.IN",
    focusIso: "KOR",
    peers: ["KOR", "NGA", "DEU"],
    relationField: "gdpPerCapita",
    relationLabel: "GDP / capita",
    accent: RED,
    scheme: "reds",
    seed: 11,
  },
  {
    key: "gdpPerCapita",
    code: "CAPITAL",
    number: "02",
    label: "GDP per capita",
    unit: "current US$",
    fieldCode: "NY.GDP.PCAP.CD",
    focusIso: "USA",
    peers: ["USA", "CHN", "IND"],
    relationField: "lifeExpectancy",
    relationLabel: "life expectancy",
    accent: BLUE,
    scheme: "blues",
    seed: 22,
  },
  {
    key: "co2PerCapita",
    code: "CARBON",
    number: "03",
    label: "CO₂ per capita",
    unit: "tonnes / person",
    fieldCode: "EN.GHG.CO2.PC.CE.AR5",
    focusIso: "USA",
    peers: ["USA", "CHN", "BRA"],
    relationField: "gdpPerCapita",
    relationLabel: "GDP / capita",
    accent: ORANGE,
    scheme: "oranges",
    seed: 33,
  },
]

const COUNTRY_COORDINATES = {
  USA: [-98.58, 39.83],
  CHN: [104.2, 35.86],
  IND: [78.96, 20.59],
  JPN: [138.25, 36.2],
  DEU: [10.45, 51.17],
  BRA: [-51.93, -14.24],
  NGA: [8.68, 9.08],
  IDN: [113.92, -0.79],
  MEX: [-102.55, 23.63],
  ETH: [40.49, 9.15],
  KOR: [127.77, 35.91],
  NOR: [8.47, 60.47],
  ZAF: [22.94, -30.56],
  EGY: [30.8, 26.82],
  VNM: [108.28, 14.06],
  BGD: [90.36, 23.68],
}

const REGION_SHORT = {
  "North America": "N. America",
  "East Asia & Pacific": "E. Asia",
  "South Asia": "S. Asia",
  "Europe & Central Asia": "Europe",
  "Latin America & Caribbean": "L. America",
  "Sub-Saharan Africa": "Africa",
  "Middle East & North Africa": "MENA",
}

const CHART_META = [
  ["LINE CHART", "DEPLOY FOR TRAJECTORY", "INDEX · ORDERED TRACE"],
  ["STACKED AREA CHART", "DEPLOY FOR MAGNITUDE", "ICON · FILLED VOLUME"],
  ["SCATTERPLOT", "DEPLOY FOR RELATION", "INDEX · COVARIATION"],
  ["HEATMAP", "DEPLOY FOR PATTERN", "SYMBOL · COLOR GRAMMAR"],
  ["BAR CHART", "DEPLOY FOR COMPARISON", "SYMBOL · LENGTH CODE"],
  ["HISTOGRAM", "DEPLOY FOR DISTRIBUTION", "INDEX · FREQUENCY TRACE"],
  ["BOX PLOT", "DEPLOY FOR ROBUST SPREAD", "SYMBOL · STATISTICAL GLYPH"],
  ["DONUT", "DEPLOY FOR COMPOSITION", "ICON · BOUNDED WHOLE"],
  ["FORCE GRAPH", "DEPLOY FOR TOPOLOGY", "INDEX · RELATIONAL PULL"],
  ["SANKEY", "DEPLOY FOR FLOW", "ICON · CONSERVED RIBBON"],
  ["TREEMAP", "DEPLOY FOR HIERARCHY", "ICON · CONTAINMENT"],
  ["SYMBOL MAP", "DEPLOY FOR LOCATED MAGNITUDE", "ICON + SYMBOL · PLACE / SIZE"],
  ["FLOW MAP", "DEPLOY FOR ORIGIN–DESTINATION", "INDEX · DIRECTIONAL ARC"],
  ["DISTANCE CARTOGRAM", "DEPLOY WHEN COST IS SPACE", "ICON DISTORTED BY SEMANTICS"],
  ["GAUNTLET", "DEPLOY FOR COMPOUND TRADEOFF", "INDEX · BURDEN IN MOTION"],
  ["GALTON BOARD", "DEPLOY WHEN PROCESS EXPLAINS", "INDEX · CAUSE MADE VISIBLE"],
]

// Plate C assigns every chart exactly once: six inline, one context figure,
// and the remaining nine in the evidence table.
const REPORT_INLINE_CHARTS = [0, 2, 5, 7, 14, 15]
const REPORT_CONTEXT_CHART = 11
const REPORT_TABLE_CHARTS = [1, 3, 4, 6, 8, 9, 10, 12, 13]

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function extent(values) {
  return [Math.min(...values), Math.max(...values)]
}

function sumBy(rows, accessor) {
  return rows.reduce((total, row) => total + accessor(row), 0)
}

function formatSignalValue(metric, value) {
  if (!Number.isFinite(value)) return "not available"
  if (metric.key === "gdpPerCapita") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)
  }
  const formatted = value.toFixed(1)
  return metric.key === "lifeExpectancy" ? `${formatted} years` : `${formatted} tonnes`
}

function formatSignalChange(metric, value) {
  if (!Number.isFinite(value)) return "not available"
  const sign = value > 0 ? "+" : ""
  if (metric.key === "gdpPerCapita") {
    return `${sign}${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)}`
  }
  return `${sign}${value.toFixed(1)} ${metric.key === "lifeExpectancy" ? "years" : "tonnes"}`
}

function buildDataset(metric) {
  const countryMeta = new Map(WORLD_COUNTRIES.map((country) => [country.iso3, country]))
  const latest = WORLD_OBSERVATIONS.filter(
    (row) => row.year === WORLD_LATEST_YEAR && row[metric.key] != null,
  ).map((row) => {
    const [lon, lat] = COUNTRY_COORDINATES[row.iso3]
    return {
      ...row,
      id: row.iso3,
      name: row.country,
      lon,
      lat,
      value: row[metric.key],
      relation: row[metric.relationField],
      regionShort: REGION_SHORT[row.region] || row.region,
    }
  })

  const [valueMin, valueMax] = extent(latest.map((row) => row.value))
  const span = valueMax - valueMin || 1
  const valueMedian = median(latest.map((row) => row.value))
  const normalizedLatest = latest.map((row) => ({
    ...row,
    normalized: (row.value - valueMin) / span,
    signalClass: row.value >= valueMedian ? "HIGH" : "LOW",
  }))
  const latestByIso = new Map(normalizedLatest.map((row) => [row.iso3, row]))
  const focus = latestByIso.get(metric.focusIso) || normalizedLatest[0]

  const trend = WORLD_OBSERVATIONS.filter(
    (row) => row.iso3 === metric.focusIso && row[metric.key] != null,
  ).map((row) => ({ ...row, value: row[metric.key] }))

  const multiTrend = WORLD_OBSERVATIONS.filter(
    (row) =>
      metric.peers.includes(row.iso3) &&
      row[metric.key] != null &&
      (row.year % 2 === 0 || row.year === WORLD_LATEST_YEAR),
  ).map((row) => ({ ...row, value: row[metric.key] }))

  const heatmap = WORLD_OBSERVATIONS.filter(
    (row) => row[metric.key] != null && (row.year % 5 === 0 || row.year === WORLD_LATEST_YEAR),
  ).map((row) => ({
    x: row.year,
    y: WORLD_COUNTRIES.findIndex((country) => country.iso3 === row.iso3),
    value: row[metric.key],
    country: row.country,
  }))

  const distribution = WORLD_OBSERVATIONS.filter((row) => row[metric.key] != null).map((row) => ({
    ...row,
    value: row[metric.key],
  }))

  const donut = [
    {
      status: "ABOVE MEDIAN",
      population: sumBy(
        normalizedLatest.filter((row) => row.value >= valueMedian),
        (row) => row.population,
      ),
    },
    {
      status: "BELOW MEDIAN",
      population: sumBy(
        normalizedLatest.filter((row) => row.value < valueMedian),
        (row) => row.population,
      ),
    },
  ]

  const regions = [...new Set(normalizedLatest.map((row) => row.region))]
  const forceNodes = [
    ...regions.map((region) => ({
      id: `region:${region}`,
      label: REGION_SHORT[region] || region,
      type: "REGION",
      size: 1,
    })),
    ...normalizedLatest.map((row) => ({
      ...row,
      type: "COUNTRY",
      size: 0.25 + row.normalized,
    })),
  ]
  const forceEdges = normalizedLatest.map((row) => ({
    source: `region:${row.region}`,
    target: row.iso3,
    value: 1 + row.normalized * 4,
  }))

  const sankeyEdgeMap = new Map()
  for (const row of normalizedLatest) {
    const source = `income:${row.income}`
    const target = `region:${row.region}`
    const key = `${source}|${target}`
    const value = Math.sqrt(row.population) * (0.18 + row.normalized)
    sankeyEdgeMap.set(key, {
      source,
      target,
      value: (sankeyEdgeMap.get(key)?.value || 0) + value,
    })
  }
  const sankeyEdges = [...sankeyEdgeMap.values()]
  const sankeyNodeIds = [...new Set(sankeyEdges.flatMap((edge) => [edge.source, edge.target]))]
  const sankeyNodes = sankeyNodeIds.map((id) => ({
    id,
    type: id.startsWith("income:") ? "INCOME" : "REGION",
  }))

  const treemap = {
    name: "WORLD BANK SAMPLE",
    children: regions.map((region) => ({
      name: REGION_SHORT[region] || region,
      children: normalizedLatest
        .filter((row) => row.region === region)
        .map((row) => ({
          name: row.iso3,
          value: row.population,
          signalClass: row.signalClass,
          metricValue: row.value,
        })),
    })),
  }

  const flows = []
  for (const region of regions) {
    const members = normalizedLatest
      .filter((row) => row.region === region)
      .sort((a, b) => a.value - b.value)
    if (members.length < 2) continue
    const source = members[0]
    const target = members[members.length - 1]
    flows.push({
      id: `${source.iso3}-${target.iso3}`,
      source: source.iso3,
      target: target.iso3,
      value: target.value - source.value,
      region,
    })
  }

  const cartogramPoints = normalizedLatest.map((row) => ({
    ...row,
    cost: row.iso3 === focus.iso3 ? 0 : Math.abs(row.value - focus.value) / span + 0.03,
  }))

  const galton = WORLD_OBSERVATIONS.filter(
    (row) => row[metric.key] != null && (row.year % 10 === 0 || row.year === WORLD_LATEST_YEAR),
  ).map((row) => ({
    ...row,
    id: `${row.iso3}-${row.year}`,
    value: row[metric.key],
    countryName: countryMeta.get(row.iso3)?.name || row.iso3,
  }))

  const gauntlet = [
    {
      ...focus,
      id: `gauntlet-${metric.key}-${focus.iso3}`,
      positives: ["signal", "signal2"],
      negatives: ["burden", "burden2", "burden3"],
      viability: Math.round(45 + focus.normalized * 50),
    },
  ]

  return {
    metric,
    latest: normalizedLatest,
    focus,
    trend,
    multiTrend,
    heatmap,
    distribution,
    donut,
    forceNodes,
    forceEdges,
    sankeyNodes,
    sankeyEdges,
    treemap,
    flows,
    cartogramPoints,
    gauntlet,
    galton,
    valueExtent: [valueMin, valueMax],
    valueMedian,
  }
}

function chartDescription(name, instruction, metric) {
  return `${name}. ${instruction.toLowerCase()} using ${metric.label}, ${metric.unit}, from World Bank data.`
}

function buildChartDefinitions(dataset) {
  const { metric } = dataset
  const compactPalette = [metric.accent, INK, BLUE, ORANGE, WARM_GRAY]
  const relationIsLog = metric.relationField === "gdpPerCapita"
  const common = (mode, width, height, index) => ({
    mode,
    width,
    height,
    description: chartDescription(CHART_META[index][0], CHART_META[index][1], metric),
    accessibleTable: false,
    className: "ss-semiotic-chart",
  })

  const renders = [
    (mode, width, height) => (
      <LineChart
        {...common(mode, width, height, 0)}
        data={dataset.trend}
        xAccessor="year"
        yAccessor="value"
        curve="monotoneX"
        color={metric.accent}
        lineWidth={mode === "sparkline" ? 3 : 7}
        showPoints={false}
      />
    ),
    (mode, width, height) => (
      <StackedAreaChart
        {...common(mode, width, height, 1)}
        data={dataset.multiTrend}
        xAccessor="year"
        yAccessor="value"
        areaBy="country"
        colorBy="country"
        colorScheme={compactPalette}
        areaOpacity={0.78}
        curve="monotoneX"
      />
    ),
    (mode, width, height) => (
      <Scatterplot
        {...common(mode, width, height, 2)}
        data={dataset.latest}
        xAccessor="value"
        yAccessor="relation"
        yScaleType={relationIsLog ? "log" : "linear"}
        xScaleType={metric.key === "gdpPerCapita" ? "log" : "linear"}
        sizeBy="population"
        sizeRange={mode === "sparkline" ? [1.5, 4.5] : [4, 12]}
        color={metric.accent}
        stroke={INK}
        strokeWidth={mode === "sparkline" ? 0.5 : 2}
        pointOpacity={0.9}
      />
    ),
    (mode, width, height) => (
      <Heatmap
        {...common(mode, width, height, 3)}
        data={dataset.heatmap}
        xAccessor="x"
        yAccessor="y"
        valueAccessor="value"
        colorScheme={metric.scheme}
        cellBorderColor={PAPER}
        cellBorderWidth={mode === "sparkline" ? 0 : 1.5}
      />
    ),
    (mode, width, height) => (
      <BarChart
        {...common(mode, width, height, 4)}
        data={[...dataset.latest].sort((a, b) => b.value - a.value).slice(0, 10)}
        categoryAccessor="iso3"
        valueAccessor="value"
        sort="desc"
        color={metric.accent}
        stroke={INK}
        strokeWidth={mode === "sparkline" ? 0 : 1.5}
        roundedTop={mode === "sparkline" ? 0 : 4}
        barPadding={mode === "sparkline" ? 1 : 3}
        showCategoryTicks={false}
      />
    ),
    (mode, width, height) => (
      <Histogram
        {...common(mode, width, height, 5)}
        data={dataset.distribution}
        valueAccessor="value"
        bins={mode === "sparkline" ? 12 : 20}
        color={metric.accent}
        stroke={PAPER}
        strokeWidth={mode === "sparkline" ? 0 : 1}
        showCategoryTicks={false}
      />
    ),
    (mode, width, height) => (
      <BoxPlot
        {...common(mode, width, height, 6)}
        data={dataset.distribution}
        categoryAccessor="income"
        valueAccessor="value"
        colorBy="income"
        colorScheme={compactPalette}
        showOutliers={mode !== "sparkline"}
        showCategoryTicks={false}
        stroke={INK}
        strokeWidth={mode === "sparkline" ? 0.5 : 2}
      />
    ),
    (mode, width, height) => (
      <DonutChart
        {...common(mode, width, height, 7)}
        data={dataset.donut}
        categoryAccessor="status"
        valueAccessor="population"
        colorBy="status"
        colorScheme={[metric.accent, INK]}
        innerRadius={mode === "sparkline" ? Math.max(3, height * 0.16) : height * 0.2}
        stroke={PAPER}
        strokeWidth={mode === "sparkline" ? 0.5 : 4}
        cornerRadius={mode === "sparkline" ? 0 : 5}
      />
    ),
    (mode, width, height) => (
      <ForceDirectedGraph
        {...common(mode, width, height, 8)}
        nodes={dataset.forceNodes}
        edges={dataset.forceEdges}
        colorBy="type"
        colorScheme={[INK, metric.accent]}
        nodeSize="size"
        nodeSizeRange={mode === "sparkline" ? [1.5, 4] : [4, 11]}
        edgeWidth="value"
        edgeColor={WARM_GRAY}
        edgeOpacity={0.65}
        iterations={90}
        layoutExecution="sync"
      />
    ),
    (mode, width, height) => (
      <SankeyDiagram
        {...common(mode, width, height, 9)}
        nodes={dataset.sankeyNodes}
        edges={dataset.sankeyEdges}
        valueAccessor="value"
        colorBy="type"
        showLegend={false}
        colorScheme={[metric.accent, INK]}
        edgeColorBy={() => metric.accent}
        edgeOpacity={0.88}
        orientation="horizontal"
        nodeWidth={mode === "sparkline" ? 4 : 10}
        nodePaddingRatio={mode === "sparkline" ? 0.08 : 0.16}
      />
    ),
    (mode, width, height) => (
      <Treemap
        {...common(mode, width, height, 10)}
        data={dataset.treemap}
        childrenAccessor="children"
        valueAccessor="value"
        nodeIdAccessor="name"
        colorBy="signalClass"
        colorScheme={{ HIGH: metric.accent, LOW: INK }}
        padding={mode === "sparkline" ? 0.5 : 3}
        stroke={PAPER}
        strokeWidth={mode === "sparkline" ? 0 : 2}
      />
    ),
    (mode, width, height) => (
      <ProportionalSymbolMap
        {...common(mode, width, height, 11)}
        points={dataset.latest}
        sizeBy="value"
        sizeRange={mode === "sparkline" ? [1, 3.5] : [4, 15]}
        colorBy="signalClass"
        colorScheme={{ HIGH: metric.accent, LOW: INK }}
        projection="equalEarth"
        fitPadding={mode === "sparkline" ? 0 : 0.08}
        graticule={mode === "sparkline" ? false : { stroke: WARM_GRAY, strokeOpacity: 0.3 }}
        stroke={PAPER}
        strokeWidth={mode === "sparkline" ? 0.25 : 1.5}
      />
    ),
    (mode, width, height) => (
      <FlowMap
        {...common(mode, width, height, 12)}
        nodes={dataset.latest}
        flows={dataset.flows}
        nodeIdAccessor="id"
        valueAccessor="value"
        edgeColorBy={() => metric.accent}
        colorScheme={[metric.accent]}
        edgeWidthRange={mode === "sparkline" ? [0.5, 1.5] : [2, 8]}
        edgeOpacity={0.9}
        flowStyle={mode === "sparkline" ? "basic" : "arc"}
        projection="equalEarth"
        fitPadding={mode === "sparkline" ? 0 : 0.08}
        graticule={mode === "sparkline" ? false : { stroke: WARM_GRAY, strokeOpacity: 0.25 }}
      />
    ),
    (mode, width, height) => (
      <DistanceCartogram
        {...common(mode, width, height, 13)}
        points={dataset.cartogramPoints}
        nodeIdAccessor="id"
        center={dataset.focus.id}
        costAccessor="cost"
        costLabel="semantic gap"
        strength={0.82}
        projection="equalEarth"
        colorBy="signalClass"
        colorScheme={{ HIGH: metric.accent, LOW: INK }}
        pointRadius={mode === "sparkline" ? 1.5 : 6}
        showRings={mode === "sparkline" ? 3 : 4}
        showNorth={false}
        transition={0}
        fitPadding={mode === "sparkline" ? 0 : 0.08}
      />
    ),
    (mode, width, height) => (
      <GauntletChart
        {...common(mode, width, height, 14)}
        data={dataset.gauntlet}
        idAccessor="id"
        positiveAccessor="positives"
        negativeAccessor="negatives"
        initialViability="viability"
        gates={[
          { id: "cut-negative", label: "cut-negative", color: INK },
          { id: "cut-positive", label: "cut-positive", color: RED },
        ]}
        events={[
          {
            id: "ev-cut-positive",
            gateId: "cut-positive",
            time: 1,
            // Gate effect: cut the positive signals. (The sim now settles on
            // sustained quiescence, so rerunMS no longer depends on popping every
            // force-held body — these pops are the gate demonstration itself.)
            effects: [{ popPositive: ["signal"], summary: "Signal removed." }],
          },
          {
            id: "ev-cut-negative",
            gateId: "cut-negative",
            time: 2,
            effects: [{ popNegative: ["burden"], summary: "Burden removed." }],
          },
        ]}
        positiveProperties={[
          {
            id: "signal",
            label: metric.label,
            short: "+",
            color: RED,
            value: 2,
            buoyancy: 2,
            radius: mode === "sparkline" ? 2 : 4,
            spring: false,
          },
          {
            id: "signal2",
            label: metric.label,
            short: "+",
            color: RED,
            value: 2,
            buoyancy: 2,
            radius: mode === "sparkline" ? 2 : 4,
            spring: false,
          },
        ]}
        negativeProperties={[
          {
            id: "burden",
            label: metric.relationLabel,
            short: "−",
            color: INK,
            load: 1,
            radius: mode === "sparkline" ? 2 : 4,
            spring: false,
          },
          {
            id: "burden2",
            label: metric.relationLabel,
            short: "−",
            color: INK,
            load: 1,
            radius: mode === "sparkline" ? 2 : 4,
            spring: false,
          },
          {
            id: "burden3",
            label: metric.relationLabel,
            short: "−",
            color: INK,
            load: 1,
            radius: mode === "sparkline" ? 2 : 4,
            spring: false,
          },
        ]}
        coreBody={() => ({
          shape: { type: "circle", radius: mode === "sparkline" ? 3 : 8 },
          mass: mode === "sparkline" ? 2 : 5,
          vx: mode === "sparkline" ? 24 : 42,
        })}
        crashDetection={false}
        showChrome
        frameProps={{
          bodyStyle: (body) => ({
            fill: body.datum?.kind === "gauntlet-negative" ? INK : RED,
            stroke: PAPER,
            strokeWidth: mode === "sparkline" ? 0 : 1.2,
          }),
        }}
        rerunMS={1000}
      />
    ),
    (mode, width, height) => (
      <GaltonBoardChart
        {...common(mode, width, height, 15)}
        data={dataset.galton}
        valueAccessor="value"
        valueExtent={dataset.valueExtent}
        bins={mode === "sparkline" ? 7 : 11}
        pegRows={mode === "sparkline" ? 6 : 10}
        ballRadius={mode === "sparkline" ? 1.5 : 2.6}
        rerunMS={1000}
        styleRules={[
          {
            when: true,
            style: {
              fill: metric.accent,
              stroke: INK,
              strokeWidth: mode === "sparkline" ? 0 : 0.7,
            },
          },
        ]}
        seed={metric.seed}
      />
    ),
  ]

  return CHART_META.map(([name, instruction, semiology], index) => ({
    id: String(index + 1).padStart(2, "0"),
    name,
    instruction,
    semiology,
    family:
      index < 4
        ? "XY"
        : index < 8
          ? "ORDINAL"
          : index < 11
            ? "NETWORK"
            : index < 14
              ? "GEO"
              : "PHYSICS",
    render: renders[index],
  }))
}

function StandardTile({ chart }) {
  const [width, hostRef] = useResponsiveWidth(180, 250)
  const titleId = `standard-chart-${chart.id}`
  return (
    <figure className="ss-tile" aria-labelledby={titleId}>
      <div className="ss-icon-frame">
        <span className="ss-frame-notch ss-frame-notch--top" aria-hidden="true" />
        <span className="ss-frame-notch ss-frame-notch--bottom" aria-hidden="true" />
        <div className="ss-chart-host" ref={hostRef}>
          {chart.render("context", width, 172)}
        </div>
      </div>
      <figcaption className="ss-caption">
        <div className="ss-caption-top">
          <span className="ss-number">{chart.id}.</span>
          <h3 id={titleId}>{chart.name}</h3>
          <span className={`ss-family ss-family--${chart.family.toLowerCase()}`}>
            {chart.family}
          </span>
        </div>
        <strong>{chart.instruction}</strong>
        <span>{chart.semiology}</span>
      </figcaption>
    </figure>
  )
}

function DeploymentCell({ chart }) {
  return (
    <div className="ss-deploy-cell">
      <div className="ss-deploy-label">
        <span>{chart.id}</span>
        <strong>{chart.name}</strong>
      </div>
      <div className="ss-spark-host">{chart.render("sparkline", 118, 36)}</div>
      <code>mode=&quot;sparkline&quot;</code>
    </div>
  )
}

function InlineSparkline({ chart }) {
  return (
    <figure className="ss-inline-chart" title={chart.name}>
      <figcaption>
        <span>{chart.id}</span>
        {chart.name}
      </figcaption>
      <div className="ss-inline-plot">{chart.render("sparkline", 108, 32)}</div>
    </figure>
  )
}

function AppliedContextFigure({ chart, dataset }) {
  const [width, hostRef] = useResponsiveWidth(260, 560)
  return (
    <figure className="ss-report-figure">
      <div className="ss-report-figure-head">
        <span>FIG. 01 / LOCATED MAGNITUDE</span>
        <code>mode=&quot;context&quot;</code>
      </div>
      <div className="ss-report-context-host" ref={hostRef}>
        {chart.render("context", width, 220)}
      </div>
      <figcaption>
        <strong>{dataset.metric.label}</strong> at {dataset.latest.length} country locations in {WORLD_LATEST_YEAR};
        symbol area carries magnitude and red/black carries position relative to the sample median.
      </figcaption>
    </figure>
  )
}

function AppliedExample({ charts, dataset }) {
  const { metric } = dataset
  const [lineChart, scatterplot, histogram, donut, gauntlet, galton] =
    REPORT_INLINE_CHARTS.map((index) => charts[index])
  const ranked = [...dataset.latest].sort((a, b) => b.value - a.value)
  const leader = ranked[0]
  const trailer = ranked[ranked.length - 1]
  const trendStart = dataset.trend[0]
  const trendEnd = dataset.trend[dataset.trend.length - 1]
  const populationTotal = sumBy(dataset.donut, (row) => row.population)
  const aboveMedianShare = populationTotal
    ? (dataset.donut[0].population / populationTotal) * 100
    : 0
  const tableNotes = [
    `${metric.peers.join(", ")} supply the reference trajectories.`,
    `${dataset.latest.length} country rows across the full observation period reveal persistent and missing bands.`,
    `${leader.iso3} leads the current sample at ${formatSignalValue(metric, leader.value)}.`,
    `Income groups retain their own median, quartiles, whiskers, and outlier structure.`,
    `${dataset.forceNodes.length} country and region nodes are connected by ${dataset.forceEdges.length} memberships.`,
    `${dataset.sankeyEdges.length} aggregated income-to-region pathways preserve weighted flow.`,
    `Population supplies area while ${metric.label} supplies the red/black class.`,
    `${dataset.flows.length} within-region routes run from the lower to the higher current value.`,
    `${dataset.focus.iso3} is the origin; ring distance encodes normalized signal difference.`,
  ]

  return (
    <section className="ss-field-use" aria-labelledby="ss-field-use-title">
      <div className="ss-use-head">
        <div>
          <span className="ss-section-code">PLATE C / FIELD DEPLOYMENT</span>
          <h2 id="ss-field-use-title">A REPORT, NOT A GALLERY</h2>
        </div>
        <p>
          One live dataset moves through prose, a figure, and a table. Change the channel above;
          every claim and every embedded chart is recomputed together.
        </p>
      </div>

      <div className="ss-report-lead">
        <div className="ss-report-copy">
          <span className="ss-report-kicker">SITUATION REPORT / {metric.code}</span>
          <div className="ss-report-paragraph" role="paragraph">
            Start with {dataset.focus.name}: its{" "}
            {metric.key === "gdpPerCapita" ? metric.label : metric.label.toLowerCase()} trajectory
            <InlineSparkline chart={lineChart} />
            changed by {formatSignalChange(metric, trendEnd.value - trendStart.value)} from {trendStart.year} to {trendEnd.year}.
            Across the current country sample, the relationship with {metric.relationLabel}
            <InlineSparkline chart={scatterplot} />
            sits beside a historical distribution
            <InlineSparkline chart={histogram} />
            whose current median is {formatSignalValue(metric, dataset.valueMedian)}. Countries above that median account for {aboveMedianShare.toFixed(0)}% of represented population
            <InlineSparkline chart={donut} />.
            Read as a decision problem, the signal and its burden travel together
            <InlineSparkline chart={gauntlet} />;
            read as a process, repeated observations settle into an outcome distribution
            <InlineSparkline chart={galton} />.
          </div>
          <div className="ss-report-extremes">
            <span>
              <small>HIGH</small>
              <strong>{leader.iso3}</strong>
              {formatSignalValue(metric, leader.value)}
            </span>
            <span>
              <small>LOW</small>
              <strong>{trailer.iso3}</strong>
              {formatSignalValue(metric, trailer.value)}
            </span>
          </div>
        </div>

        <AppliedContextFigure chart={charts[REPORT_CONTEXT_CHART]} dataset={dataset} />
      </div>

      <div className="ss-report-table-wrap">
        <table className="ss-report-table">
          <caption>Supporting evidence / remaining sparkline deployments</caption>
          <thead>
            <tr>
              <th scope="col">Code / instrument</th>
              <th scope="col">Live signal</th>
              <th scope="col">Reading supplied to the report</th>
            </tr>
          </thead>
          <tbody>
            {REPORT_TABLE_CHARTS.map((chartIndex, rowIndex) => {
              const chart = charts[chartIndex]
              return (
                <tr key={chart.id}>
                  <th scope="row">
                    <span>{chart.id}</span>
                    <strong>{chart.name}</strong>
                    <small>{chart.family}</small>
                  </th>
                  <td>
                    <div className="ss-table-spark">{chart.render("sparkline", 150, 40)}</div>
                  </td>
                  <td>{tableNotes[rowIndex]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SignPrimer() {
  return (
    <section className="ss-primer" aria-label="Semiotic field legend">
      <div>
        <span className="ss-primer-symbol" aria-hidden="true">
          ○
        </span>
        <strong>ICON</strong>
        <p>
          Resembles what it means. A map keeps the shape of place; a filled area resembles volume.
        </p>
      </div>
      <div>
        <span className="ss-primer-symbol ss-primer-symbol--index" aria-hidden="true">
          ↗
        </span>
        <strong>INDEX</strong>
        <p>
          Points to a condition. A trace records change; a settled particle records forces acting on
          it.
        </p>
      </div>
      <div>
        <span className="ss-primer-symbol ss-primer-symbol--symbol" aria-hidden="true">
          ▥
        </span>
        <strong>SYMBOL</strong>
        <p>
          Depends on convention. Length, color, bins, and quartiles only speak after a reader learns
          the code.
        </p>
      </div>
    </section>
  )
}

export default function SemioticStandardExamplePage() {
  const [metricKey, setMetricKey] = useState(METRICS[0].key)
  const metric = METRICS.find((candidate) => candidate.key === metricKey) || METRICS[0]
  const dataset = useMemo(() => buildDataset(metric), [metric])
  const charts = useMemo(() => buildChartDefinitions(dataset), [dataset])
  const handleTabKeyDown = (event, index) => {
    let nextIndex
    if (event.key === "ArrowRight") nextIndex = (index + 1) % METRICS.length
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + METRICS.length) % METRICS.length
    else if (event.key === "Home") nextIndex = 0
    else if (event.key === "End") nextIndex = METRICS.length - 1
    else return
    event.preventDefault()
    setMetricKey(METRICS[nextIndex].key)
    event.currentTarget.parentElement?.querySelectorAll("[role='tab']")[nextIndex]?.focus()
  }

  return (
    <ExamplePageLayout title="Semiotic Standard: Chart Deployment Codes">
      <ThemeProvider theme="light">
        <div className="ss-page" style={{ "--ss-signal": metric.accent }}>
          <header className="ss-header">
            <div className="ss-title-block">
              <span className="ss-issue">FIELD STANDARD / CONTEXT CHARTMODE</span>
              <h2>SEMIOTIC STANDARD</h2>
            </div>
            <div className="ss-header-copy">
              <strong>FOR ALL ANALYTICAL SIGNAL, RELATIONSHIP &amp; PROCESS DISPLAY</strong>
              <span>ISSUE 16 · WORLD DATA · 2026</span>
            </div>
          </header>

          <div className="ss-rule" aria-hidden="true">
            <span />
          </div>

          <section className="ss-intro">
            <div>
              <span className="ss-section-code">READ BEFORE DEPLOYMENT</span>
              <h2>The chart is not the data. It is the sign system.</h2>
            </div>
            <p>
              Sixteen real Semiotic charts carry the same incoming signal through five frame
              families.
              <code> mode=&quot;context&quot;</code> removes explanatory decoration so encoding has
              to do the work. Change the signal below; the visual task—and the warning attached to
              it—stays fixed.
            </p>
          </section>

          <SignPrimer />

          <section className="ss-console" aria-labelledby="ss-input-title">
            <div className="ss-console-head">
              <div>
                <span className="ss-section-code">INCOMING DATASET / SELECT ONE</span>
                <h2 id="ss-input-title">WORLD BANK INDICATOR CHANNEL</h2>
              </div>
              <div className="ss-readout" aria-live="polite">
                <span>SIGNAL</span>
                <strong>{metric.code}</strong>
                <small>{metric.fieldCode}</small>
              </div>
            </div>
            <div className="ss-tabs" role="tablist" aria-label="World Bank indicator datasets">
              {METRICS.map((candidate) => (
                <button
                  key={candidate.key}
                  type="button"
                  role="tab"
                  id={`ss-dataset-tab-${candidate.key}`}
                  aria-controls="ss-data-sheet"
                  aria-selected={candidate.key === metric.key}
                  tabIndex={candidate.key === metric.key ? 0 : -1}
                  className={candidate.key === metric.key ? "is-active" : ""}
                  onClick={() => setMetricKey(candidate.key)}
                  onKeyDown={(event) => handleTabKeyDown(event, METRICS.indexOf(candidate))}
                >
                  <span>{candidate.number}</span>
                  <strong>{candidate.label}</strong>
                  <small>{candidate.unit}</small>
                </button>
              ))}
            </div>
            <div className="ss-signal-strip">
              <span>
                <b>{dataset.latest.length}</b> countries
              </span>
              <span>
                <b>{WORLD_OBSERVATIONS.length}</b> observations
              </span>
              <span>
                <b>1990–{WORLD_LATEST_YEAR}</b> time span
              </span>
              <span>
                <b>{dataset.focus.iso3}</b> trace reference
              </span>
              <span>
                <b>{metric.relationLabel}</b> relation channel
              </span>
            </div>
          </section>

          <div
            id="ss-data-sheet"
            className="ss-data-sheet"
            role="tabpanel"
            aria-labelledby={`ss-dataset-tab-${metric.key}`}
            tabIndex={0}
          >
            <section className="ss-standard" aria-labelledby="ss-standard-title">
              <div className="ss-section-head">
                <div>
                  <span className="ss-section-code">PLATE A / RECOGNITION RANGE</span>
                  <h2 id="ss-standard-title">WHEN TO DEPLOY THESE CHARTS</h2>
                </div>
                <div className="ss-mode-stamp">
                  <span>ACTIVE CONFIGURATION</span>
                  <code>mode=&quot;context&quot;</code>
                </div>
              </div>
              <div className="ss-grid">
                {charts.map((chart) => (
                  <StandardTile key={chart.id} chart={chart} />
                ))}
              </div>
            </section>

            <section className="ss-deployment" aria-labelledby="ss-deployment-title">
              <div className="ss-deployment-head">
                <div>
                  <span className="ss-section-code">PLATE B / EMBEDDED RANGE</span>
                  <h2 id="ss-deployment-title">SAME SIGNALS. MINIMUM DECORATION.</h2>
                </div>
                <p>
                  Once the chart type is known, redeploy the same component as an inline status
                  mark. Sparkline mode is a change of context—not a second implementation.
                </p>
              </div>
              <div className="ss-deploy-grid">
                {charts.map((chart) => (
                  <DeploymentCell key={chart.id} chart={chart} />
                ))}
              </div>
              <div className="ss-code-order">
                <span>ONE COMPONENT / TWO DUTY STATIONS</span>
                <code>{`<Chart {...signal} mode="context" />  →  <Chart {...signal} mode="sparkline" />`}</code>
              </div>
            </section>

            <AppliedExample charts={charts} dataset={dataset} />
          </div>

          <section className="ss-doctrine">
            <div className="ss-doctrine-mark" aria-hidden="true">
              !
            </div>
            <div>
              <span className="ss-section-code">FINAL OPERATING RULE</span>
              <h2>Compact does not mean context-free.</h2>
              <p>
                When axes, legends, labels, and hover fall away, the surrounding sentence must name
                the measure, unit, population, and time. A sparkline can indicate; it cannot testify
                alone.
              </p>
            </div>
          </section>

          <p className="ss-source">
            Real data:{" "}
            <a href={WORLD_DATA_SOURCE_URL} target="_blank" rel="noopener noreferrer">
              {WORLD_DATA_SOURCE}
            </a>
            , retrieved {WORLD_DATA_RETRIEVED}. Sixteen countries spanning every World Bank region
            and income group; indicators are {WORLD_LATEST_YEAR} snapshots and 1990–
            {WORLD_LATEST_YEAR} series. Geographic marks use approximate country centers. Network,
            flow, and semantic-distance relationships are deterministic derivations of those
            indicator values and World Bank groupings.
          </p>
        </div>
      </ThemeProvider>
    </ExamplePageLayout>
  )
}
