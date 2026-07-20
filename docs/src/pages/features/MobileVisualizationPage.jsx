import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ChartContainer,
  LineChart,
  MobileAnnotationCalloutList,
  MobileChartContainer,
  MobileStandardControls,
  Scatterplot,
  SmallMultipleChart,
} from "semiotic"
import { mobileAnnotationStrategy } from "semiotic/recipes"

import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

const trendData = [
  {
    id: "Checkout conversion",
    coordinates: [
      { week: 1, value: 3.2 },
      { week: 2, value: 3.5 },
      { week: 3, value: 3.1 },
      { week: 4, value: 3.8 },
      { week: 5, value: 4.1 },
      { week: 6, value: 3.9 },
      { week: 7, value: 4.4 },
      { week: 8, value: 4.7 },
    ],
  },
]

const campaignData = [
  { id: "search", channel: "Search", sessions: 88, conversion: 3.6, spend: 48 },
  { id: "email", channel: "Email", sessions: 38, conversion: 5.4, spend: 12 },
  { id: "social", channel: "Social", sessions: 72, conversion: 2.8, spend: 34 },
  { id: "retargeting", channel: "Retargeting", sessions: 44, conversion: 4.9, spend: 28 },
  { id: "sms", channel: "SMS", sessions: 18, conversion: 6.1, spend: 7 },
  { id: "display", channel: "Display", sessions: 95, conversion: 1.7, spend: 42 },
]

const campaignAnnotations = [
  {
    type: "callout",
    pointId: "sms",
    label: "SMS converts best, but sample size is small.",
    mobileText: "Best rate, small sample",
    shortText: "Best rate",
    emphasis: "primary",
    radius: 12,
  },
  {
    type: "label",
    pointId: "email",
    label: "Email is the efficient baseline.",
    mobileText: "Efficient baseline",
    shortText: "Email",
  },
  {
    type: "label",
    pointId: "display",
    label: "Display spends heavily for weak conversion.",
    mobileText: "Weak conversion",
    shortText: "Display drag",
    emphasis: "secondary",
  },
  {
    type: "label",
    pointId: "retargeting",
    label: "Retargeting has mid-volume lift.",
    mobileText: "Mid-volume lift",
    shortText: "Lift",
    emphasis: "secondary",
  },
]

const customSignals = [
  { label: "Speed", value: 84, detail: "Fast enough for thumb scanning" },
  { label: "Context", value: 67, detail: "Summary remains available" },
  { label: "Notes", value: 51, detail: "Annotation budget is controlled" },
  { label: "Custom", value: 73, detail: "Custom marks receive semantics" },
]

const regionalTrends = [
  {
    id: "north",
    title: "North",
    subtitle: "steady recovery",
    summary: "Ends highest after a mid-period dip.",
    data: [
      { week: 1, value: 3.1 },
      { week: 2, value: 3.3 },
      { week: 3, value: 3.0 },
      { week: 4, value: 3.7 },
      { week: 5, value: 4.1 },
      { week: 6, value: 4.6 },
    ],
  },
  {
    id: "south",
    title: "South",
    subtitle: "late acceleration",
    summary: "Flat early, then a strong two-week lift.",
    data: [
      { week: 1, value: 2.4 },
      { week: 2, value: 2.5 },
      { week: 3, value: 2.6 },
      { week: 4, value: 3.0 },
      { week: 5, value: 3.8 },
      { week: 6, value: 4.2 },
    ],
  },
  {
    id: "west",
    title: "West",
    subtitle: "volatile",
    summary: "Highest variance; inspect before comparing endpoints.",
    data: [
      { week: 1, value: 3.8 },
      { week: 2, value: 4.6 },
      { week: 3, value: 3.4 },
      { week: 4, value: 4.8 },
      { week: 5, value: 3.7 },
      { week: 6, value: 4.4 },
    ],
  },
  {
    id: "east",
    title: "East",
    subtitle: "softening",
    summary: "Declines after week four despite a strong start.",
    data: [
      { week: 1, value: 4.2 },
      { week: 2, value: 4.4 },
      { week: 3, value: 4.5 },
      { week: 4, value: 4.1 },
      { week: 5, value: 3.6 },
      { week: 6, value: 3.4 },
    ],
  },
]

const mobileSemantics = {
  primaryTask: "compare_recent_change",
  preferredInteraction: "tap",
  summary:
    "Conversion rose from 3.2% to 4.7% over eight weeks. The mobile view should preserve trend, endpoint, and annotation priority.",
  risks: ["hover_only_detail", "overcrowded_annotations", "small_touch_targets"],
  recommendations: [
    "Use a mobile mode preset before hiding information manually.",
    "Keep one primary annotation visible and defer secondary notes.",
    "Expose a text summary next to the chart container.",
  ],
}

const customSemantics = {
  primaryTask: "scan_status",
  preferredInteraction: "tap",
  summary:
    "Four operational signals are shown as tappable bars. Mobile mode stacks labels and increases target height.",
  customVisualization: true,
  interoperability: ["ChartContainer", "mobileSemantics", "custom SVG"],
}

const mobileContainerCode = `const mobileSemantics = {
  primaryTask: "compare_recent_change",
  preferredInteraction: "tap",
  summary: "Conversion rose from 3.2% to 4.7% over eight weeks.",
  risks: ["hover_only_detail", "overcrowded_annotations", "small_touch_targets"],
}

<ChartContainer
  title="Checkout conversion"
  subtitle="ChartContainer owns mobile decoration; the chart owns encoding."
  actions={{ dataSummary: true, export: true }}
  mobile={{
    breakpoint: 480,
    chartMode: "mobile",
    mobileInteraction: true,
    semantics: mobileSemantics,
    summary: "Mobile summary: conversion rose 1.5 points in eight weeks.",
    hideToolbar: false,
    allowHorizontalScroll: false,
  }}
>
  <LineChart
    data={trendData}
    lineBy="id"
    xAccessor="week"
    yAccessor="value"
  />
</ChartContainer>`

const mobileChartContainerCode = `<MobileChartContainer
  title="Checkout conversion"
  subtitle="Opinionated mobile composition on top of ChartContainer."
  mobileSummary="Conversion rose from 3.2% to 4.7%. The primary mobile task is comparing recent change, not exploring every weekly value."
  chips={[
    { id: "trend", label: "Trend", description: "8 weeks" },
    { id: "drivers", label: "Drivers", description: "summary" },
    { id: "risk", label: "Risk", description: "small screen" },
  ]}
  detailTitle="Reading notes"
  detail={
    <ul>
      <li>Keep the title, summary, and data-summary action available.</li>
      <li>Use chips for coarse task switching instead of a cramped legend.</li>
      <li>Use chartDefaults for chart-specific direct-label defaults.</li>
    </ul>
  }
  chartDefaults={{ directLabel: true, showLegend: false }}
  mobileSemantics={mobileSemantics}
>
  <LineChart
    data={trendData}
    lineBy="id"
    xAccessor="week"
    yAccessor="value"
  />
</MobileChartContainer>`

const smallMultipleCode = `<SmallMultipleChart
  items={regionalTrends}
  valueAccessor="value"
  sharedExtent
  linkedBy={["week"]}
  mobileColumns={1}
  tabletColumns={2}
  columns={4}
  chartHeight={190}
  mobileSemantics={{
    strategy: "small-multiples",
    summary: "Four regional trend panels share one y extent and stack vertically on phones.",
    interaction: {
      primary: "tap",
      hoverFallback: "tap-to-lock",
      targetSize: 44,
    },
  }}
>
  {(region, { chartProps }) => (
    <LineChart
      {...chartProps}
      data={[{ id: region.id, coordinates: region.data }]}
      lineBy="id"
      lineDataAccessor="coordinates"
      xAccessor="week"
      yAccessor="value"
      xLabel="Week"
      yLabel="Conversion %"
    />
  )}
</SmallMultipleChart>`

const annotationCode = `<Scatterplot
  data={campaignData}
  xAccessor="sessions"
  yAccessor="conversion"
  pointIdAccessor="id"
  annotations={[
    {
      type: "callout",
      pointId: "sms",
      label: "SMS converts best, but sample size is small.",
      mobileText: "Best rate, small sample",
      shortText: "Best rate",
      emphasis: "primary",
    },
    {
      type: "label",
      pointId: "display",
      label: "Display spends heavily for weak conversion.",
      mobileText: "Weak conversion",
      emphasis: "secondary",
    },
  ]}
  autoPlaceAnnotations={{
    mobile: {
      breakpoint: 480,
      maxAnnotations: 2,
      minVisible: 1,
      progressiveDisclosure: true,
      preferShortText: true,
      cohesion: "layer",
    },
  }}
/>`

const mobileAnnotationStrategyCode = `import { mobileAnnotationStrategy } from "semiotic/recipes"
import { MobileAnnotationCalloutList } from "semiotic"

const mobileNotes = mobileAnnotationStrategy(annotations, {
  active: true,
  strategy: "callout-list",
  maxPlotAnnotations: 1,
  maxCalloutItems: 4,
  preferShortText: true,
})

<MobileChartContainer
  title="Campaign conversion"
  detailTitle="Additional notes"
  detail={<MobileAnnotationCalloutList items={mobileNotes.calloutList} />}
>
  <Scatterplot
    data={campaigns}
    annotations={mobileNotes.visible}
    autoPlaceAnnotations={{
      mobile: {
        strategy: "callout-list",
        maxAnnotations: 1,
        progressiveDisclosure: true,
        preferShortText: true,
      },
    }}
  />
</MobileChartContainer>`

const customCode = `function CustomMobileGlyphChart({ mode, mobileSemantics, data }) {
  const isMobile = mode === "mobile"

  return (
    <svg role="img" aria-label={mobileSemantics?.summary}>
      {data.map((d, i) => (
        <g key={d.label} transform={isMobile ? \`translate(0, \${i * 46})\` : \`translate(\${i * 150}, 0)\`}>
          <rect
            width={isMobile ? 280 : 120}
            height={isMobile ? 32 : 88}
            rx={12}
          />
          <text>{d.label}</text>
        </g>
      ))}
    </svg>
  )
}

<ChartContainer
  title="Custom mobile visualization"
  mobile={{
    chartMode: "mobile",
    mobileInteraction: true,
    semantics: {
      summary: "Custom marks receive the same mobile contract as built-in charts.",
      customVisualization: true,
    },
  }}
>
  <CustomMobileGlyphChart data={signals} />
</ChartContainer>`

function ToggleButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.toggleButton,
        ...(active ? styles.toggleButtonActive : {}),
      }}
    >
      {children}
    </button>
  )
}

function MetricPill({ label, value }) {
  return (
    <div style={styles.metricPill}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
    </div>
  )
}

function ApiRow({ name, type, description }) {
  return (
    <tr>
      <td style={styles.apiName}><code>{name}</code></td>
      <td style={styles.apiType}><code>{type}</code></td>
      <td style={styles.apiDescription}>{description}</td>
    </tr>
  )
}

function CustomMobileGlyphChart({
  data = customSignals,
  mode = "primary",
  mobileSemantics,
  width = 620,
}) {
  const isMobile = mode === "mobile" || width < 480
  const chartWidth = isMobile ? 320 : 620
  const chartHeight = isMobile ? data.length * 48 + 24 : 190
  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <figure style={styles.customFigure}>
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label={mobileSemantics?.summary || "Custom mobile visualization"}
      >
        <rect
          x="0"
          y="0"
          width={chartWidth}
          height={chartHeight}
          rx="18"
          fill="var(--surface-2, #f7f4ee)"
        />
        {data.map((d, i) => {
          const barWidth = isMobile
            ? Math.max(34, (d.value / maxValue) * 214)
            : Math.max(34, (d.value / maxValue) * 104)
          const x = isMobile ? 88 : 28 + i * 148
          const y = isMobile ? 24 + i * 48 : 34
          return (
            <g key={d.label} transform={`translate(${x}, ${y})`}>
              <text
                x={isMobile ? -72 : 0}
                y={isMobile ? 22 : 112}
                fill="var(--text-secondary, #60656f)"
                fontSize={isMobile ? 12 : 13}
                fontWeight="700"
              >
                {d.label}
              </text>
              <rect
                x="0"
                y="0"
                width={isMobile ? 214 : 104}
                height={isMobile ? 30 : 92}
                rx="12"
                fill="rgba(39, 56, 89, 0.12)"
              />
              <rect
                x="0"
                y="0"
                width={barWidth}
                height={isMobile ? 30 : 92}
                rx="12"
                fill={i % 2 === 0 ? "#1f7a6d" : "#c65d32"}
              />
              <text
                x={isMobile ? barWidth + 8 : 52}
                y={isMobile ? 21 : 50}
                fill={isMobile ? "var(--text-primary, #232323)" : "#fff"}
                fontSize={isMobile ? 13 : 18}
                fontWeight="800"
                textAnchor={isMobile ? "start" : "middle"}
              >
                {d.value}
              </text>
              {!isMobile && (
                <text
                  x="52"
                  y="72"
                  fill="#fff"
                  fontSize="10"
                  textAnchor="middle"
                  opacity="0.84"
                >
                  score
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption style={styles.customCaption}>
        <strong>Received mode:</strong> <code>{mode}</code>.{" "}
        <strong>Semantic summary:</strong>{" "}
        {mobileSemantics?.summary || "No mobile semantics provided."}
      </figcaption>
    </figure>
  )
}

function MobilePreviewDemo() {
  const [previewWidth, setPreviewWidth] = useState(390)
  const [containerMobile, setContainerMobile] = useState(true)
  const [mobileAnnotations, setMobileAnnotations] = useState(true)
  const isPhone = previewWidth <= 480
  const chartWidth = Math.max(280, previewWidth - 44)
  const chartMode = containerMobile && isPhone ? undefined : isPhone ? "mobile" : "primary"
  const containerMobileConfig =
    containerMobile && isPhone
      ? {
          breakpoint: 480,
          chartMode: "mobile",
          semantics: mobileSemantics,
          summary:
            "Mobile summary: checkout conversion rose from 3.2% to 4.7%. Keep the endpoint and one primary note visible.",
          allowHorizontalScroll: false,
        }
      : false

  const annotationPolicy = useMemo(
    () =>
      mobileAnnotations
        ? {
            mobile: {
              breakpoint: 480,
              strategy: "callout-list",
              maxAnnotations: 2,
              maxCalloutItems: 4,
              minVisible: 1,
              progressiveDisclosure: true,
              preferShortText: true,
              cohesion: "layer",
            },
          }
        : true,
    [mobileAnnotations]
  )
  const mobileAnnotationSplit = useMemo(
    () =>
      mobileAnnotationStrategy(campaignAnnotations, {
        width: chartWidth,
        strategy: "callout-list",
        maxPlotAnnotations: 2,
        maxCalloutItems: 4,
        preferShortText: true,
      }),
    [chartWidth]
  )

  return (
    <section style={styles.demoShell}>
      <div style={styles.controlPanel}>
        <div>
          <div style={styles.controlLabel}>Preview width</div>
          <div style={styles.toggleRow}>
            <ToggleButton active={previewWidth === 390} onClick={() => setPreviewWidth(390)}>
              390px phone
            </ToggleButton>
            <ToggleButton active={previewWidth === 720} onClick={() => setPreviewWidth(720)}>
              720px tablet
            </ToggleButton>
          </div>
        </div>

        <div>
          <div style={styles.controlLabel}>Container behavior</div>
          <div style={styles.toggleRow}>
            <ToggleButton active={containerMobile} onClick={() => setContainerMobile(true)}>
              mobile on
            </ToggleButton>
            <ToggleButton active={!containerMobile} onClick={() => setContainerMobile(false)}>
              manual chart mode
            </ToggleButton>
          </div>
        </div>

        <div>
          <div style={styles.controlLabel}>Annotations</div>
          <div style={styles.toggleRow}>
            <ToggleButton active={mobileAnnotations} onClick={() => setMobileAnnotations(true)}>
              mobile policy
            </ToggleButton>
            <ToggleButton active={!mobileAnnotations} onClick={() => setMobileAnnotations(false)}>
              default layout
            </ToggleButton>
          </div>
        </div>
      </div>

      <div style={styles.metricsGrid}>
        <MetricPill label="Chart width" value={`${previewWidth}px`} />
        <MetricPill
          label="ChartMode"
          value={containerMobile && isPhone ? "mobile injected" : chartMode}
        />
        <MetricPill
          label="Annotation budget"
          value={mobileAnnotations && isPhone ? "2 visible" : "default"}
        />
      </div>

      <div style={styles.phoneRail}>
        <div style={{ ...styles.phoneFrame, width: previewWidth }}>
          <ChartContainer
            title="Checkout conversion"
            subtitle="Container decoration, chart mode, and semantics adapt together."
            actions={{ dataSummary: true, export: true }}
            mobile={containerMobileConfig}
            height={300}
          >
            <LineChart
              data={trendData}
              lineBy="id"
              xAccessor="week"
              yAccessor="value"
              xLabel="Week"
              yLabel="Conversion %"
              mode={chartMode}
              width={chartWidth}
              height={280}
              colorScheme={["#1f7a6d"]}
            />
          </ChartContainer>
        </div>
      </div>

      <div style={styles.annotationCard}>
        <h3 id="annotation-preview">Annotation preview</h3>
        <p>
          Shrinking the plot below the mobile breakpoint applies the mobile
          annotation budget. Primary notes stay visible, secondary notes can be
          deferred, and long copy is replaced by <code>mobileText</code> or{" "}
          <code>shortText</code>.
        </p>
        <Scatterplot
          data={campaignData}
          xAccessor="sessions"
          yAccessor="conversion"
          pointIdAccessor="id"
          annotations={mobileAnnotations ? mobileAnnotationSplit.visible : campaignAnnotations}
          autoPlaceAnnotations={annotationPolicy}
          width={chartWidth}
          height={300}
          xLabel="Sessions"
          yLabel="Conversion %"
        />
        {mobileAnnotations && (
          <div style={{ marginTop: 12 }}>
            <MobileAnnotationCalloutList
              items={mobileAnnotationSplit.calloutList}
              title="Notes moved out of the plot"
            />
          </div>
        )}
      </div>
    </section>
  )
}

export default function MobileVisualizationPage() {
  const [brushRange, setBrushRange] = useState([2, 7])
  const [legendActive, setLegendActive] = useState({ search: true, email: true, social: false })

  return (
    <PageLayout
      title="Mobile Visualization"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Mobile Visualization", path: "/features/mobile-visualization" },
      ]}
      prevPage={{ title: "Chart Modes", path: "/features/chart-modes" }}
      nextPage={{
        title: "Streaming System Model",
        path: "/features/streaming-system-model",
      }}
    >
      <p>
        Mobile data visualization in Semiotic is not a separate rendering tier.
        It is a coordinated set of defaults and contracts across{" "}
        <code>ChartMode</code>, <code>ChartContainer</code>, annotations, and
        custom visualization components. The goal is to keep the analytical
        task intact while reducing decoration, increasing tap affordance, preserving
        summaries, and letting agents understand what a mobile chart can safely
        do.
      </p>

      <div style={styles.statusPanel}>
        <strong>Current implementation status:</strong> built-in chart mode,
        container mobile options, rendered standard controls, annotation mobile policy, custom-child
        semantic injection, the first mobile interaction contract, and
        mobile-first small multiples are available for mobile authoring.
        Tap-to-lock linked-hover detail and helper-based tap-to-select are
        wired through shared setup at phone widths. A Playwright mobile preview
        harness now checks 320, 360, 390, 430, and 768 pixel layouts for
        overflow, painted/labeled canvases, callout-list notes, accessible data
        summary actions, non-hover detail paths, target sizing, and snapshots.
        Runtime <code>responsiveRules</code> now feed <code>useChartMode</code>{" "}
        across built-in HOCs and custom chart scaffolds, reusable chart-family
        mobile recipes are exported from <code>semiotic/recipes</code>, and{" "}
        <code>ChartContainer mobileAudit=&quot;warn&quot;</code> exposes the static
        audit while authoring. Shared mobile behavior covers frame-level
        background-tap clearing, mobile-aware hit radius, rendered standard
        controls, and deeper chart-family responsive recipes. Remaining work is
        frame-specific automatic brush/zoom state synchronization beyond the
        explicit state-driven pattern.
      </div>

      <div style={styles.mobileSectionGrid}>
        <Link to="/features/mobile/controls" style={styles.mobileSectionCard}>
          <strong>Mobile Standard Controls</strong>
          <span>
            Interactive brush, zoom, and legend controls wired to real chart
            state.
          </span>
        </Link>
        <Link to="/features/mobile/recipes" style={styles.mobileSectionCard}>
          <strong>Mobile Recipes &amp; Transforms</strong>
          <span>
            Family-specific density, profile, label, annotation, and semantics
            recipes.
          </span>
        </Link>
        <Link to="/examples/mobile-data-visualization" style={styles.mobileSectionCard}>
          <strong>State-of-the-art example</strong>
          <span>
            The research-backed mobile visualization review and technique demo.
          </span>
        </Link>
      </div>

      <h2 id="interactive-demo">Interactive demo</h2>
      <p>
        Use the controls to compare a phone-width chart against a wider tablet
        slot. The phone configuration lets <code>ChartContainer</code> inject{" "}
        <code>mode=&quot;mobile&quot;</code> into the child chart and passes a
        mobile semantics object alongside it. The annotation panel uses the same
        width to show how mobile annotation policies reduce persistent note
        density without deleting author intent.
      </p>

      <MobilePreviewDemo />

      <h2 id="chartmode-mobile">ChartMode: mobile</h2>
      <p>
        <code>mode=&quot;mobile&quot;</code> is the chart-level preset. It is
        for phone-sized slots where axes still matter, but legends, roomy
        margins, and hover-first assumptions usually do not. Unlike{" "}
        <code>sparkline</code>, mobile mode keeps labels available by default
        because phone charts are often the main chart, not decorative context.
      </p>
      <p>
        Matching <code>responsiveRules</code> now resolve before{" "}
        <code>useChartMode</code> across built-in HOCs and custom chart
        scaffolds. That means a phone rule can switch to{" "}
        <code>mode=&quot;mobile&quot;</code>, suppress axes or legends, and provide{" "}
        <code>mobileInteraction</code> or <code>mobileSemantics</code> without
        requiring a separate chart component. Use the chart-family mobile
        recipes when you want a portable starting point for common phone
        transforms. Rules currently resolve from chart props and resolved chart
        size; frame-wide measured container-query behavior remains a strategy
        item rather than something authors should assume.
      </p>

      <table style={styles.apiTable}>
        <tbody>
          <ApiRow
            name="mode"
            type={'"primary" | "context" | "sparkline" | "mobile"'}
            description="Selects a default chart posture. Mobile sets phone-sized dimensions, tighter margins, hover support where available, no legend by default, and preserved labels."
          />
          <ApiRow
            name="responsiveRules"
            type="ResponsiveRule[]"
            description="Semantic responsive transforms applied before chart mode defaults across built-in HOCs and custom chart scaffolds, covering mobile mode, decoration, mobileInteraction, and mobileSemantics."
          />
          <ApiRow
            name="mobileChartFamilyRecipe"
            type='"line" | "area" | "ordinal" | "scatter" | "network" | "geo" | "small-multiple"'
            description="Recipe helper from semiotic/recipes that returns props, responsiveRules, mobileInteraction, and mobileSemantics with family-specific density, profile, label, annotation, margin, and standard-control defaults."
          />
          <ApiRow
            name="mobileBrushAlternatives"
            type="(options) => { mobileInteraction, mobileSemantics, controls }"
            description="Returns a brush-friendly mobile interaction and semantics bundle so range inputs, chip filters, clear actions, or steppers can sit beside drag gestures."
          />
          <ApiRow
            name="MobileStandardControls"
            type="{ controls, brush, zoom, legend, targetSize }"
            description="Rendered touch-sized range, zoom, and legend controls for mobile alternatives to drag, wheel, and hover-heavy interactions."
          />
          <ApiRow
            name="useMobileRangeControls"
            type="{ value, xExtent, brush, zoom, setValue }"
            description="State helper for wiring MobileStandardControls to xExtent, filtered data, minimaps, or custom chart range state."
          />
        </tbody>
      </table>

      <h2 id="chartcontainer-mobile">ChartContainer mobile</h2>
      <p>
        <code>ChartContainer</code> owns the surrounding mobile experience:
        title, subtitle, summary, toolbar wrapping, target sizing, scroll
        fallback, and the semantic contract passed to a single child chart. This
        is the right layer for behavior that should work for built-in charts and
        custom charts.
      </p>

      <CodeBlock code={mobileContainerCode} language="jsx" />

      <h2 id="mobile-chart-container">MobileChartContainer</h2>
      <p>
        <code>MobileChartContainer</code> is the opinionated M3 composition
        layer. It does not replace <code>ChartContainer</code>; it wraps it and
        preserves export, copy-config, data summary, notification, loading, and
        description behavior. The added layer is mobile-specific: summary cards,
        chip controls, an inline or sheet detail panel, and optional{" "}
        <code>chartDefaults</code> for chart-specific mobile defaults such as
        direct labels.
      </p>

      <div style={styles.mobileContainerDemo}>
        <MobileChartContainer
          title="Checkout conversion"
          subtitle="A phone-first shell over the same LineChart."
          actions={{ dataSummary: true, export: true }}
          mobileSummary="Conversion rose from 3.2% to 4.7%. The mobile view keeps the trend, endpoint, and one primary reading task visible before the plot."
          chips={[
            { id: "trend", label: "Trend", description: "8 weeks" },
            { id: "drivers", label: "Drivers", description: "summary" },
            { id: "risk", label: "Risk", description: "audit" },
          ]}
          detailTitle="Reading notes"
          detail={
            <ul>
              <li>Summary comes before the chart at the mobile breakpoint.</li>
              <li>Chips provide coarse task switching without a cramped legend.</li>
              <li>The detail sheet keeps explanatory context out of the plot.</li>
            </ul>
          }
          chartDefaults={{ directLabel: true, showLegend: false }}
          mobileSemantics={mobileSemantics}
        >
          <LineChart
            data={trendData}
            lineBy="id"
            xAccessor="week"
            yAccessor="value"
            xLabel="Week"
            yLabel="Conversion %"
            width={360}
            height={260}
            colorScheme={["#1f7a6d"]}
          />
        </MobileChartContainer>
      </div>

      <CodeBlock code={mobileChartContainerCode} language="jsx" />

      <h2 id="small-multiple-chart">SmallMultipleChart</h2>
      <p>
        <code>SmallMultipleChart</code> is the M4 responsive small-multiple
        composition. It stacks panels vertically on phones, keeps panel titles
        and summaries outside the plot, shares y/value extents by default, and
        can inject linked hover, selection, mobile interaction, and mobile
        semantics into each child chart. The child chart still owns its mark
        encoding; the wrapper owns the repeated-panel reading structure.
      </p>
      <p>
        It now shares the existing <code>LinkedCharts</code> coordination layer:
        when <code>linkedBy</code>, <code>linkedHover</code>,{" "}
        <code>selection</code>, or a unified legend is requested,{" "}
        <code>SmallMultipleChart</code> provides a <code>LinkedCharts</code>{" "}
        wrapper unless it is already inside one. <code>ScatterplotMatrix</code>{" "}
        already uses <code>LinkedCharts</code> internally for its cross-cell
        selection store, so both multi-chart approaches now share the same
        provider model instead of growing parallel coordination systems.
      </p>

      <div style={styles.smallMultipleDemo}>
        <SmallMultipleChart
          items={regionalTrends}
          valueAccessor="value"
          sharedExtent
          linkedBy={["week"]}
          mobileColumns={1}
          tabletColumns={2}
          columns={4}
          chartHeight={190}
          mobileSemantics={{
            strategy: "small-multiples",
            summary:
              "Four regional trend panels share one y extent and stack vertically on phones.",
            interaction: {
              primary: "tap",
              hoverFallback: "tap-to-lock",
              targetSize: 44,
            },
          }}
        >
          {(region, { chartProps }) => (
            <LineChart
              {...chartProps}
              data={[{ id: region.id, coordinates: region.data }]}
              lineBy="id"
              lineDataAccessor="coordinates"
              xAccessor="week"
              yAccessor="value"
              xLabel="Week"
              yLabel="Conversion %"
              colorScheme={["#1f7a6d"]}
              width={280}
            />
          )}
        </SmallMultipleChart>
      </div>

      <CodeBlock code={smallMultipleCode} language="jsx" />

      <h3 id="multi-chart-interop">Multi-chart interop</h3>
      <p>
        Use <code>SmallMultipleChart</code> when every panel repeats the same
        analytical encoding with shared extents. Use <code>LinkedCharts</code>{" "}
        directly when the views are heterogeneous. Use <code>ChartGrid</code>{" "}
        for dashboard layout; it now shares the same mobile column vocabulary
        through <code>mobileColumns</code>, <code>tabletColumns</code>, and{" "}
        <code>chartDefaults</code>. Use <code>ContextLayout</code> for
        primary-plus-context views; it now stacks context panels at the mobile
        breakpoint by default.
      </p>

      <h2 id="mobile-interaction">Mobile interaction</h2>
      <p>
        <code>mobileInteraction</code> is the shared touch contract for built-in
        charts, custom charts, audits, and portable specs. When a chart is in a
        phone-sized slot, Semiotic resolves a default policy that treats tap as
        the non-hover path: linked-hover detail can be locked on tap, selection
        can be driven from the same linked fields, the intended target size is
        explicit, and future brush/zoom alternatives can read the same object.
      </p>

      <CodeBlock
        code={`<Scatterplot
  data={campaigns}
  xAccessor="sessions"
  yAccessor="conversion"
  linkedHover={{ name: "campaign", fields: ["channel"] }}
  selection={{ name: "campaign" }}
  mode="mobile"
  mobileInteraction={{
    tapToSelect: true,
    tapToLockTooltip: true,
    clearSelection: "backgroundTap",
    targetSize: 44,
    snap: "nearestDatum",
    standardControls: "all",
  }}
/>`}
        language="jsx"
      />

      <table style={styles.apiTable}>
        <thead>
          <tr>
            <th style={styles.apiHeader}>Option</th>
            <th style={styles.apiHeader}>Type</th>
            <th style={styles.apiHeader}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <ApiRow
            name="mobile"
            type="boolean | ChartContainerMobileOptions"
            description="Enables the mobile container contract. Pass an object when you need breakpoint, summary, semantics, or toolbar control."
          />
          <ApiRow
            name="mobile.breakpoint"
            type="number"
            description="Viewport width used by the container CSS. The default is 480."
          />
          <ApiRow
            name="mobile.chartMode"
            type={'ChartMode | false'}
            description="Mode injected into a single child chart when the child has not already declared its own mode. Use false when a custom child manages layout itself."
          />
          <ApiRow
            name="mobile.mobileInteraction"
            type="boolean | MobileInteractionConfig"
            description="Touch policy injected into a single child chart when the child has not already declared mobileInteraction. Defaults to true when mobile is enabled."
          />
          <ApiRow
            name="mobile.semantics"
            type="MobileVisualizationContract"
            description="Machine-readable mobile intent, risks, and recommendations. Built-in intelligence and custom charts can consume the same object."
          />
          <ApiRow
            name="mobileAudit"
            type={'"warn" | true | { viewportWidth, targetSize, visible }'}
            description="Optional ChartContainer authoring audit. Requires chartConfig; logs mobile findings and can render a compact visible warning banner."
          />
          <ApiRow
            name="mobile.summary"
            type="ReactNode"
            description="Short phone summary rendered by the container at the mobile breakpoint."
          />
          <ApiRow
            name="mobile.allowHorizontalScroll"
            type="boolean"
            description="Last-resort fallback for legacy or deliberately wide custom visualizations. Prefer transformed mobile layouts first."
          />
          <ApiRow
            name="mobile.hideToolbar"
            type="boolean"
            description="Hides toolbar actions at the mobile breakpoint when action controls would compete with the reading task."
          />
          <ApiRow
            name="mobile.standardControls"
            type={'"brush" | "zoom" | "legend" | "all" | string[] | MobileStandardControlsProps'}
            description="Renders mobile-only standard controls in ChartContainer and mirrors the same request into mobileInteraction.standardControls."
          />
          <ApiRow
            name="mobileInteraction"
            type="boolean | MobileInteractionConfig"
            description="Touch-first chart interaction contract. Defaults activate for mode='mobile' or phone-width shared setup; explicit props override."
          />
          <ApiRow
            name="mobileInteraction.tapToLockTooltip"
            type="boolean"
            description="Locks linked-hover detail on tap so tooltip/cross-highlight information is reachable without hover."
          />
          <ApiRow
            name="mobileInteraction.tapToSelect"
            type="boolean"
            description="Uses the linked fields to write a point selection on tap when a selection target is available."
          />
          <ApiRow
            name="mobileInteraction.targetSize"
            type="number"
            description="Declared comfortable touch target in CSS pixels. Shared behavior helpers use it for mobile-aware hit-radius plumbing and audits check it statically."
          />
          <ApiRow
            name="mobileInteraction.standardControls"
            type={'boolean | "brush" | "zoom" | "legend" | "all" | string[]'}
            description="Declares which complex gestures have rendered alternatives. ChartContainer can render the matching MobileStandardControls UI from mobile.standardControls."
          />
          <ApiRow
            name="mobileInteraction.snap"
            type={'"nearestDatum" | "none"'}
            description="Declares the intended touch hit-testing model for imprecise input. Nearest-datum snapping is the mobile default."
          />
        </tbody>
      </table>


      <h3>Rendered standard controls</h3>
      <p>
        <code>MobileStandardControls</code> is the rendered counterpart to the
        <code>standardControls</code> mobile interaction contract. It gives brush,
        zoom, and legend interactions a touch-sized control path instead of
        relying on drag, wheel, or hover-only gestures.
      </p>
      <div style={{ maxWidth: 430, marginBottom: 16 }}>
        <MobileStandardControls
          controls={["brush", "legend", "zoom"]}
          brush={{
            label: "Weeks in focus",
            domain: [1, 8],
            value: brushRange,
            step: 1,
            onChange: setBrushRange,
            onClear: () => setBrushRange([1, 8]),
          }}
          zoom={{
            onZoomIn: () => setBrushRange(([start, end]) => [Math.min(end - 1, start + 1), end]),
            onZoomOut: () => setBrushRange(([start, end]) => [Math.max(1, start - 1), Math.min(8, end + 1)]),
            onReset: () => setBrushRange([1, 8]),
          }}
          legend={{
            items: [
              { id: "search", label: "Search", color: "#2f6f9f", active: legendActive.search },
              { id: "email", label: "Email", color: "#f28e2b", active: legendActive.email },
              { id: "social", label: "Social", color: "#59a14f", active: legendActive.social },
            ],
            onToggle: (id, active) => setLegendActive((current) => ({ ...current, [id]: active })),
            onShowAll: () => setLegendActive({ search: true, email: true, social: true }),
            onHideAll: () => setLegendActive({ search: false, email: false, social: false }),
          }}
        />
      </div>

      <p>
        In responsive applications, gate <code>mobile</code> from your layout
        breakpoint or set <code>mobile.chartMode=false</code> when the child
        visualization already has its own mobile state. The container breakpoint
        controls CSS affordances; the <code>chartMode</code> option controls prop
        injection.
      </p>

      <h2 id="mobile-annotations">Mobile annotations</h2>
      <p>
        Annotations are often the first thing to fail on a phone. Semiotic's
        mobile policy combines existing placement behaviors rather than adding a
        parallel annotation system. It can cap visible notes, preserve a minimum
        count, defer secondary notes through progressive disclosure, prefer short
        mobile copy, and maintain layer cohesion for related notes.
      </p>
      <p>
        For charts that need more than one or two explanatory notes, use the pure
        <code> mobileAnnotationStrategy()</code> recipe. It ranks annotations,
        keeps the highest-priority notes in the plot, and returns a{" "}
        <code>calloutList</code> for notes that should move into a mobile detail
        panel, card, or <code>MobileAnnotationCalloutList</code>. This is the
        mobile equivalent of keeping labels near the data while moving secondary
        prose out of the collision zone.
      </p>

      <CodeBlock code={annotationCode} language="jsx" />
      <CodeBlock code={mobileAnnotationStrategyCode} language="jsx" />

      <table style={styles.apiTable}>
        <tbody>
          <ApiRow
            name="mobileAnnotationStrategy"
            type="(annotations, config) => { visible, calloutList, deferred, hidden }"
            description="Pure recipe for splitting mobile plot annotations from external callout-list notes. Works with built-in and custom visualizations."
          />
          <ApiRow
            name="MobileAnnotationCalloutList"
            type="React component"
            description="Small renderer for the calloutList returned by mobileAnnotationStrategy. Use inside MobileChartContainer detail panels, cards, or custom layouts."
          />
          <ApiRow
            name="autoPlaceAnnotations.mobile.strategy"
            type={'"plot" | "callout-list" | "hybrid"'}
            description="Shared strategy vocabulary for the in-plot annotation layout and external mobile callout splitting."
          />
          <ApiRow
            name="autoPlaceAnnotations.mobile.breakpoint"
            type="number"
            description="Width at or below which the mobile annotation policy is active."
          />
          <ApiRow
            name="autoPlaceAnnotations.mobile.maxAnnotations"
            type="number"
            description="Maximum persistent note annotations at phone width."
          />
          <ApiRow
            name="autoPlaceAnnotations.mobile.minVisible"
            type="number"
            description="Minimum persistent note count after density filtering."
          />
          <ApiRow
            name="autoPlaceAnnotations.mobile.progressiveDisclosure"
            type="boolean"
            description="Keeps deferred notes available for hover/focus reveal instead of dropping them completely."
          />
          <ApiRow
            name="autoPlaceAnnotations.mobile.preferShortText"
            type="boolean"
            description="Uses annotation.mobileText, then annotation.shortText, before the full label when mobile is active."
          />
          <ApiRow
            name="autoPlaceAnnotations.mobile.cohesion"
            type={'"layer"'}
            description="Keeps related note layers together when the layout has to shed or place annotations."
          />
        </tbody>
      </table>

      <h2 id="mobile-preview-harness">Mobile preview and CI harness</h2>
      <p>
        The mobile preview harness is a Playwright integration page rather than
        a static checklist. It renders <code>ChartContainer mobile</code>,{" "}
        <code>MobileChartContainer</code>, <code>SmallMultipleChart</code>,{" "}
        <code>mobileAnnotationStrategy()</code>, and{" "}
        <code>MobileAnnotationCalloutList</code> at common phone and tablet
        widths: 320, 360, 390, 430, and 768 pixels.
      </p>
      <p>
        The gate checks for document and chart overflow, painted and labeled
        canvases, mobile callout-list output, accessible data-summary actions,
        standard detail panels that prevent hover-only reading, explicit touch
        targets, critical SVG label overlap, console/runtime errors, and a
        screenshot baseline for each width. Future checks can extend the same
        harness with chart-family-specific assertions.
      </p>
      <CodeBlock code={"npm run check:mobile-visualization"} language="bash" />

      <h2 id="custom-visualizations">Custom visualizations are first-class</h2>
      <p>
        Mobile support should not stop at the built-in chart components.
        <code>ChartContainer mobile</code> injects the same{" "}
        <code>mode</code>, <code>mobileInteraction</code>, and{" "}
        <code>mobileSemantics</code> props into a single custom React child. That
        child can render SVG, Canvas, HTML, WebGL, or a recipe-driven layout and
        still participate in the same mobile, accessibility, and intelligence
        contract.
      </p>

      <div style={styles.customDemoShell}>
        <ChartContainer
          title="Custom mobile visualization"
          subtitle="The child receives mode and mobileSemantics from ChartContainer."
          mobile={{
            chartMode: "mobile",
            mobileInteraction: true,
            semantics: customSemantics,
            summary:
              "Custom summary: four operational signals are converted into larger tappable bars.",
          }}
          height={300}
        >
          <CustomMobileGlyphChart data={customSignals} width={390} />
        </ChartContainer>
      </div>

      <CodeBlock code={customCode} language="jsx" />

      <p>
        This is the interoperability path for advanced visualization work:
        custom charts opt into the same semantics object that powers audit,
        recommendation, generated UI, and future MCP/agent wiring. If the custom
        child wants total control, pass{" "}
        <code>{'mobile={{ chartMode: false }}'}</code>{" "}
        and read <code>mobileSemantics</code> only.
      </p>

      <h2 id="practical-rules">Practical rules</h2>
      <div style={styles.rulesGrid}>
        <div style={styles.ruleCard}>
          <h3>Preserve the task</h3>
          <p>
            Do not shrink a desktop dashboard until it fits. Decide whether the
            phone task is comparison, monitoring, lookup, or explanation, then
            choose the chart mode and annotation budget around that task.
          </p>
        </div>
        <div style={styles.ruleCard}>
          <h3>Prefer transformation over scroll</h3>
          <p>
            Horizontal scrolling is useful for legacy content and dense
            timelines, but it should be an explicit fallback. Start with mobile
            mode, shorter annotations, fewer visible notes, and direct labels.
          </p>
        </div>
        <div style={styles.ruleCard}>
          <h3>Make intelligence portable</h3>
          <p>
            Put mobile assumptions in <code>mobileSemantics</code>. That makes a
            custom chart explainable to audits, assistants, generated UI, and
            downstream renderers instead of hiding the rationale in component
            code.
          </p>
        </div>
      </div>

      <h2 id="related-pages">Related pages</h2>
      <ul>
        <li>
          <Link to="/features/chart-container">Chart Container</Link> for
          toolbar, export, summaries, loading, error, and notification decoration.
        </li>
        <li>
          <Link to="/features/chart-modes">Chart Modes</Link> for primary,
          context, sparkline, and mobile chart presets.
        </li>
        <li>
          <Link to="/annotations">Annotations</Link> for placement,
          density, provenance, lifecycle, and responsive annotation behavior.
        </li>
        <li>
          <Link to="/custom-charts/overview">Custom Charts</Link> for the
          extension points that should consume <code>mobileSemantics</code>.
        </li>
      </ul>
    </PageLayout>
  )
}

const styles = {
  statusPanel: {
    padding: 16,
    margin: "20px 0",
    borderRadius: 14,
    border: "1px solid rgba(31, 122, 109, 0.28)",
    background:
      "linear-gradient(135deg, rgba(31, 122, 109, 0.12), rgba(198, 93, 50, 0.08))",
    color: "var(--text-primary)",
    lineHeight: 1.55,
  },
  mobileSectionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    margin: "18px 0 30px",
  },
  mobileSectionCard: {
    display: "grid",
    gap: 8,
    padding: 16,
    borderRadius: 16,
    border: "1px solid var(--surface-3)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    textDecoration: "none",
    lineHeight: 1.45,
  },
  demoShell: {
    display: "grid",
    gap: 18,
    margin: "22px 0 34px",
  },
  controlPanel: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--surface-3)",
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-secondary)",
    marginBottom: 8,
  },
  toggleRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  toggleButton: {
    border: "1px solid var(--surface-3)",
    borderRadius: 999,
    padding: "7px 11px",
    background: "transparent",
    color: "var(--text-primary)",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  toggleButtonActive: {
    background: "#1f7a6d",
    borderColor: "#1f7a6d",
    color: "#fff",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10,
  },
  metricPill: {
    padding: 12,
    borderRadius: 14,
    background: "var(--surface-2)",
    border: "1px solid var(--surface-3)",
  },
  metricLabel: {
    display: "block",
    fontSize: 12,
    color: "var(--text-secondary)",
    marginBottom: 4,
  },
  metricValue: {
    display: "block",
    fontSize: 16,
    color: "var(--text-primary)",
  },
  phoneRail: {
    overflowX: "auto",
    padding: "20px 8px",
    borderRadius: 20,
    background:
      "radial-gradient(circle at 10% 10%, rgba(198, 93, 50, 0.16), transparent 32%), radial-gradient(circle at 88% 18%, rgba(31, 122, 109, 0.16), transparent 34%), var(--surface-1)",
    border: "1px solid var(--surface-3)",
  },
  phoneFrame: {
    margin: "0 auto",
    maxWidth: "100%",
    padding: 12,
    borderRadius: 28,
    background: "var(--surface-2)",
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.18)",
    border: "1px solid var(--surface-3)",
  },
  annotationCard: {
    padding: 16,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--surface-3)",
    overflowX: "auto",
  },
  apiTable: {
    width: "100%",
    borderCollapse: "collapse",
    margin: "16px 0 24px",
    fontSize: 14,
  },
  apiHeader: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid var(--surface-3)",
    color: "var(--text-secondary)",
  },
  apiName: {
    verticalAlign: "top",
    padding: "11px 12px",
    borderBottom: "1px solid var(--surface-3)",
    width: "24%",
  },
  apiType: {
    verticalAlign: "top",
    padding: "11px 12px",
    borderBottom: "1px solid var(--surface-3)",
    width: "28%",
    color: "var(--text-secondary)",
  },
  apiDescription: {
    verticalAlign: "top",
    padding: "11px 12px",
    borderBottom: "1px solid var(--surface-3)",
    lineHeight: 1.5,
  },
  customDemoShell: {
    maxWidth: 560,
    margin: "18px 0 24px",
  },
  mobileContainerDemo: {
    maxWidth: 440,
    margin: "18px 0 24px",
  },
  smallMultipleDemo: {
    maxWidth: 760,
    margin: "18px 0 24px",
  },
  customFigure: {
    margin: 0,
  },
  customCaption: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 1.5,
    color: "var(--text-secondary)",
  },
  rulesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    margin: "18px 0 28px",
  },
  ruleCard: {
    padding: 16,
    borderRadius: 16,
    background: "var(--surface-2)",
    border: "1px solid var(--surface-3)",
  },
}
