import React, { useMemo, useState } from "react"
import {
  BarChart,
  CandlestickChart,
  FunnelChart,
  GroupedBarChart,
  LineChart,
  SankeyDiagram,
  Scatterplot,
  ThemeProvider,
  TreeDiagram,
} from "semiotic"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  CHART_COLORS,
  METRIC_KEYS,
  PERSONAS,
  allPersonaRows,
  getPersona,
  metricRows,
} from "./data/datavizPeople"
import "./DatavizPeopleExamplePage.css"

const SOURCE_URL =
  "https://medium.com/nightingale/the-7-kinds-of-data-visualization-people-9964e80443a7"

const implementationCode = `import {
  CandlestickChart, FunnelChart, GroupedBarChart, LineChart,
  SankeyDiagram, Scatterplot, TreeDiagram,
} from "semiotic"

const chartFor = {
  excel: SankeyDiagram,
  tableau: GroupedBarChart,
  italians: CustomGlyphAtlas,
  media: LineChart,
  scientists: Scatterplot,
  industry: FunnelChart,
  freelancers: CustomIconGarden,
  procedural: Scatterplot,
  finance: CandlestickChart,
  devops: TerminalSankey,
  workshops: GroupedBarChart,
  dissectors: TreeDiagram,
}

// The selector changes data shape, chart type, palette, and explanatory copy.
const persona = getPersona(activePersonaId)
const Chart = chartFor[persona.id]

<Chart {...chartPropsFor(persona)} />`

export default function DatavizPeopleExamplePage() {
  const [activeId, setActiveId] = useState("excel")
  const chartTheme = "carbon"
  const [chartWidth, chartRef] = useResponsiveWidth(320, 940)
  const [profileWidth, profileRef] = useResponsiveWidth(300, 520)

  const persona = getPersona(activeId)
  const metrics = useMemo(() => metricRows(persona), [persona])
  const personaRows = useMemo(() => allPersonaRows(), [])
  const colorScheme = useMemo(
    () => Object.fromEntries(METRIC_KEYS.map((metric) => [metric.label, metric.color])),
    []
  )

  return (
    <ExamplePageLayout title="The 12 Kinds of Data Visualization People">
      <div
        className="dv7-page"
        style={{
          "--dv7-active": persona.color,
          "--dv7-accent": persona.accent,
        }}
      >
        <section className="dv7-hero">
          <div className="dv7-hero-copy">
            <p className="dv7-kicker">A Semiotic persona machine</p>
            <p className="dv7-lede">
              The 2017 essay sorted data visualization people into seven affectionate types. This
              expanded remake accepts that the taxonomy has mutated: pick a person and the argument
              changes chart form, data shape, interaction, and visual posture.
            </p>
            <p className="dv7-source-note">
              Original taxonomy from{" "}
              <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
                The 7 Kinds of Data Visualization People
              </a>
              . This version expands the cast to twelve and uses new interface art in place of the
              original Susie Lu cartoons.
            </p>
          </div>
          <PersonaConstellation activeId={activeId} />
        </section>

        <PersonaPicker activeId={activeId} onChange={setActiveId} />

        <section className="dv7-workbench" aria-label="Data visualization persona lab">
          <div className="dv7-dossier">
            <div className="dv7-dossier-head">
              <span>{persona.number}</span>
              <div>
                <p>{persona.sourceRole}</p>
                <h2>{persona.name}</h2>
              </div>
            </div>

            <blockquote>{persona.stance}</blockquote>

            <div className="dv7-briefs">
              <div>
                <span>Brief</span>
                <p>{persona.brief}</p>
              </div>
              <div>
                <span>Semiotic move</span>
                <p>{persona.semioticMove}</p>
              </div>
            </div>

            <div className="dv7-profile-chart" ref={profileRef}>
              <ThemeProvider theme={chartTheme}>
                <BarChart
                  data={metrics}
                  categoryAccessor="metric"
                  valueAccessor="value"
                  orientation="horizontal"
                  width={profileWidth}
                  height={280}
                  margin={{ top: 14, right: 18, bottom: 32, left: 92 }}
                  valueExtent={[0, 100]}
                  colorBy="colorKey"
                  colorScheme={colorScheme}
                  showLegend={false}
                  showGrid
                  title={`${persona.shortName} temperament`}
                  description={`A five-metric temperament profile for ${persona.name}.`}
                  frameProps={{ background: "transparent" }}
                />
              </ThemeProvider>
            </div>
          </div>

          <div className="dv7-stage">
            <div className="dv7-stage-head">
              <div>
                <span>Active chart</span>
                <h2>{persona.chartKind}</h2>
              </div>
              <strong>{persona.shortName}</strong>
            </div>

            <div className="dv7-chart-host" ref={chartRef}>
              <ThemeProvider theme={chartTheme}>
                <PersonaChart persona={persona} width={chartWidth} />
              </ThemeProvider>
            </div>
          </div>
        </section>

        <section className="dv7-roster">
          <div className="dv7-section-head">
            <span>Twelve chart instincts</span>
            <h2>Every type gets a native chart body</h2>
          </div>
          <div className="dv7-roster-grid">
            {PERSONAS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === activeId ? "is-active" : ""}
                style={{ "--persona-color": item.color, "--persona-accent": item.accent }}
                onClick={() => setActiveId(item.id)}
                aria-pressed={item.id === activeId}
              >
                <span>{item.number}</span>
                <strong>{item.chartLabel ?? item.chartKind}</strong>
                <small>{item.sourceRole}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="dv7-matrix-section">
          <div className="dv7-section-head">
            <span>The shared material</span>
            <h2>Same taxonomy, many visual grammars</h2>
            <p>
              The strip below keeps the five temperament metrics constant across the twelve
              personas. The large chart above is free to become a flow, dashboard, field, story,
              model, funnel, terminal gag, workshop rubric, or taxonomy.
            </p>
          </div>
          <PersonaMatrix rows={personaRows} activeId={activeId} onChange={setActiveId} />
        </section>

        <section className="dv7-code-section">
          <div className="dv7-section-head">
            <span>Implementation shape</span>
            <h2>A selector can change the entire chart grammar</h2>
          </div>
          <CodeBlock language="jsx" showCopyButton wrap code={implementationCode} />
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function PersonaPicker({ activeId, onChange }) {
  return (
    <div className="dv7-picker" aria-label="Choose a data visualization persona">
      {PERSONAS.map((persona) => (
        <button
          key={persona.id}
          type="button"
          className={persona.id === activeId ? "is-active" : ""}
          style={{ "--persona-color": persona.color, "--persona-accent": persona.accent }}
          aria-pressed={persona.id === activeId}
          onClick={() => onChange(persona.id)}
        >
          <PersonaBadge persona={persona} />
          <span>{persona.number}</span>
          <strong>{persona.shortName}</strong>
        </button>
      ))}
    </div>
  )
}

function PersonaBadge({ persona }) {
  const index = PERSONAS.findIndex((item) => item.id === persona.id)
  const hair = ["M24 20Q36 2 49 20", "M19 23Q36 7 54 23", "M21 18H52V29H21Z"][
    index % 3
  ]
  return (
    <svg className="dv7-badge" viewBox="0 0 72 72" aria-hidden="true">
      <rect x="7" y="7" width="58" height="58" rx="8" fill="var(--persona-color)" />
      <path d={hair} fill="var(--persona-accent)" stroke="#151515" strokeWidth="2" />
      <circle cx="36" cy="31" r="14" fill="#fff8dd" stroke="#151515" strokeWidth="2" />
      <path d="M28 30H44" stroke="#151515" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="31" cy="29" r="2" fill="#151515" />
      <circle cx="41" cy="29" r="2" fill="#151515" />
      <path d="M30 38Q36 42 43 38" fill="none" stroke="#151515" strokeWidth="2" />
      <path
        d="M19 61Q22 48 36 48Q50 48 53 61Z"
        fill="var(--persona-accent)"
        stroke="#151515"
        strokeWidth="2"
      />
      <path
        d={`M18 ${54 - index}H54M22 ${58 - index}H50`}
        stroke="#151515"
        strokeWidth="1.5"
        opacity="0.55"
      />
    </svg>
  )
}

function PersonaConstellation({ activeId }) {
  const activeIndex = PERSONAS.findIndex((persona) => persona.id === activeId)
  return (
    <div className="dv7-constellation" aria-hidden="true">
      <svg viewBox="0 0 360 260">
        <rect x="18" y="18" width="324" height="224" rx="8" fill="#fff8dd" />
        <path d="M42 200C92 104 154 92 206 136S288 169 320 70" fill="none" stroke="#151515" strokeWidth="3" />
        {PERSONAS.map((persona, index) => {
          const angle = -Math.PI / 2 + (index / PERSONAS.length) * Math.PI * 2
          const x = 180 + Math.cos(angle) * 105
          const y = 130 + Math.sin(angle) * 76
          const active = index === activeIndex
          return (
            <g key={persona.id} transform={`translate(${x} ${y})`}>
              <circle
                r={active ? 25 : 18}
                fill={persona.color}
                stroke="#151515"
                strokeWidth={active ? 4 : 2}
              />
              <text
                y="5"
                textAnchor="middle"
                fill="#fff8dd"
                fontSize={active ? 16 : 12}
                fontWeight="900"
                fontFamily="system-ui, sans-serif"
              >
                {persona.number}
              </text>
            </g>
          )
        })}
        <g transform="translate(124 94)">
          <rect x="0" y="0" width="112" height="72" rx="6" fill="#151515" />
          <path d="M14 52L32 35L47 44L69 18L96 39" fill="none" stroke="#fff8dd" strokeWidth="5" />
          <circle cx="69" cy="18" r="7" fill="#e0a92f" />
        </g>
      </svg>
    </div>
  )
}

function PersonaChart({ persona, width }) {
  const chartWidth = Math.max(320, width || 320)
  const chartHeight = chartWidth < 560 ? 390 : 460
  const frameProps = { background: "transparent" }

  if (persona.id === "excel") {
    return (
      <SankeyDiagram
        nodes={persona.chart.nodes}
        edges={persona.chart.edges}
        nodeIdAccessor="id"
        sourceAccessor="source"
        targetAccessor="target"
        valueAccessor="value"
        colorBy="type"
        colorScheme={CHART_COLORS}
        edgeColorBy="source"
        nodeWidth={18}
        nodePaddingRatio={0.1}
        width={chartWidth}
        height={chartHeight}
        title="Spreadsheet contraption flow"
        description="A Sankey diagram showing a spreadsheet user's path from raw CSV to public output."
        showLabels={chartWidth > 520}
        showLegend={chartWidth > 640}
        tooltip
        frameProps={frameProps}
      />
    )
  }

  if (persona.id === "tableau") {
    return (
      <GroupedBarChart
        data={persona.chart.rows}
        categoryAccessor="stage"
        groupBy="layer"
        valueAccessor="value"
        colorBy="layer"
        colorScheme={CHART_COLORS}
        width={chartWidth}
        height={chartHeight}
        margin={{ top: 24, right: 24, bottom: 56, left: 52 }}
        valueExtent={[0, 100]}
        showGrid
        showLegend
        legendPosition="bottom"
        roundedTop={4}
        title="Live demo build pressure"
        description="A grouped bar chart comparing default speed, calculations, and polish across a dashboard demo."
        tooltip
        frameProps={frameProps}
      />
    )
  }

  if (persona.id === "italians") {
    return <ItalianGlyphAtlas persona={persona} width={chartWidth} height={chartHeight} />
  }

  if (persona.id === "media") {
    return (
      <LineChart
        data={persona.chart.rows}
        xAccessor="step"
        yAccessor="value"
        lineBy="series"
        colorBy="series"
        colorScheme={[persona.color, persona.accent]}
        width={chartWidth}
        height={chartHeight}
        margin={{ top: 28, right: 28, bottom: 54, left: 48 }}
        xExtent={[0, 5]}
        yExtent={[20, 95]}
        lineWidth={3.5}
        showPoints
        pointRadius={5}
        showLegend
        legendPosition="bottom"
        xFormat={(value) => persona.chart.rows.find((row) => row.step === value)?.beat || value}
        annotations={[
          {
            type: "text",
            step: 3,
            value: 86,
            label: "reveal",
            dx: 8,
            dy: -10,
            color: persona.accent,
          },
        ]}
        title="Reader attention through a story"
        description="A two-line chart comparing reader attention and evidence load across a story sequence."
        enableHover
        frameProps={frameProps}
      />
    )
  }

  if (persona.id === "scientists") {
    return (
      <Scatterplot
        data={persona.chart.points}
        xAccessor="x"
        yAccessor="y"
        sizeBy="n"
        sizeRange={[4, 12]}
        colorBy="cohort"
        colorScheme={[persona.color, persona.accent, "#707070"]}
        width={chartWidth}
        height={chartHeight}
        margin={{ top: 24, right: 28, bottom: 50, left: 52 }}
        xExtent={[0, 100]}
        yExtent={[0, 100]}
        pointOpacity={0.78}
        pointIdAccessor="id"
        regression={{ method: "linear", color: persona.accent, strokeWidth: 3, label: "model fit" }}
        showGrid
        showLegend={chartWidth > 620}
        legendPosition="bottom"
        title="Evidence density vs design restraint"
        description="A scatterplot of fictional paper results with sample-size encoding and a linear model fit."
        tooltip
        frameProps={frameProps}
      />
    )
  }

  if (persona.id === "industry") {
    return (
      <FunnelChart
        data={persona.chart.rows}
        stepAccessor="step"
        valueAccessor="value"
        colorBy="step"
        colorScheme={[persona.color, persona.accent, "#25283d", "#e0a92f", "#2f6f88"]}
        orientation="vertical"
        width={chartWidth}
        height={chartHeight}
        margin={{ top: 28, right: 24, bottom: 70, left: 58 }}
        showLabels={chartWidth > 520}
        title="What survives the enterprise pipeline"
        description="A funnel chart showing attrition from private telemetry to public open-source evidence."
        tooltip
        frameProps={frameProps}
      />
    )
  }

  if (persona.id === "freelancers") {
    return <FunFreelancerIconGarden persona={persona} width={chartWidth} height={chartHeight} />
  }

  if (persona.id === "procedural") {
    return (
      <Scatterplot
        data={persona.chart.points}
        xAccessor="x"
        yAccessor="y"
        sizeBy="mass"
        sizeRange={[3, 18]}
        colorBy="family"
        colorScheme={CHART_COLORS}
        symbolBy="shape"
        symbolMap={{
          circle: "circle",
          square: "square",
          triangle: "triangle",
          star: "star",
          diamond: "diamond",
        }}
        width={chartWidth}
        height={chartHeight}
        margin={{ top: 24, right: 28, bottom: 46, left: 48 }}
        xExtent={[0, 100]}
        yExtent={[0, 100]}
        pointOpacity={0.68}
        pointIdAccessor="id"
        showGrid
        showLegend={chartWidth > 620}
        legendPosition="bottom"
        title="Everything encodes everything"
        description="A scatterplot with position, color, size, shape, and opacity fighting for attention."
        tooltip
        frameProps={frameProps}
      />
    )
  }

  if (persona.id === "finance") {
    return (
      <CandlestickChart
        data={persona.chart.candles}
        xAccessor="day"
        openAccessor="open"
        highAccessor="high"
        lowAccessor="low"
        closeAccessor="close"
        width={chartWidth}
        height={chartHeight}
        margin={{ top: 28, right: 34, bottom: 48, left: 56 }}
        xFormat={(value) => `D${value + 1}`}
        yFormat={(value) => `$${value}`}
        showGrid
        enableHover
        annotations={persona.chart.annotations}
        candlestickStyle={{
          upColor: persona.accent,
          downColor: persona.color,
          bodyWidth: chartWidth < 560 ? 6 : 10,
        }}
        title="Every wick has a feeling"
        description="An annotated candlestick chart with OHLC values and several emotionally over-precise callouts."
        tooltip
        frameProps={frameProps}
      />
    )
  }

  if (persona.id === "devops") {
    return (
      <TerminalSankey
        persona={persona}
        width={chartWidth}
        height={chartHeight}
        frameProps={frameProps}
      />
    )
  }

  if (persona.id === "workshops") {
    return (
      <GroupedBarChart
        data={persona.chart.rows}
        categoryAccessor="phase"
        groupBy="room"
        valueAccessor="value"
        colorBy="room"
        colorScheme={[persona.color, persona.accent]}
        width={chartWidth}
        height={chartHeight}
        margin={{ top: 24, right: 24, bottom: 56, left: 52 }}
        valueExtent={[0, 100]}
        showGrid
        showLegend
        legendPosition="bottom"
        roundedTop={4}
        title="Workshop stage rubric"
        description="A grouped bar chart comparing two workshop rooms across facilitation stages."
        tooltip
        frameProps={frameProps}
      />
    )
  }

  return (
    <TreeDiagram
      data={persona.chart.tree}
      childrenAccessor="children"
      nodeIdAccessor="id"
      orientation="vertical"
      colorByDepth
      colorScheme={CHART_COLORS}
      showLabels={chartWidth > 540}
      nodeLabel="id"
      width={chartWidth}
      height={chartHeight}
      title="Why / what / how dissection"
      description="A tree diagram separating visualization analysis into nested levels of why, what, and how."
      tooltip
      frameProps={frameProps}
    />
  )
}

function ItalianGlyphAtlas({ persona, width, height }) {
  const scale = Math.min(1, Math.max(0.62, width / 900))
  return (
    <svg
      className="dv7-custom-chart"
      viewBox="0 0 900 460"
      width={width}
      height={height}
      role="img"
      aria-label="A custom glyph atlas for The Italians persona"
    >
      <rect width="900" height="460" fill="#fff8dd" />
      <path d="M64 86H812M64 206H812M64 326H812" stroke="#151515" strokeWidth="1.2" opacity="0.24" />
      <path d="M124 48V394M304 48V394M484 48V394M664 48V394" stroke="#151515" strokeWidth="1.2" opacity="0.18" />
      <text x="64" y="52" fill="#151515" fontSize="24" fontWeight="950" fontFamily="system-ui, sans-serif">
        DATA-NATIVE EXPERIENCE ATLAS
      </text>
      <text x="64" y="82" fill={persona.color} fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif">
        Milan / New York / many tiny systems
      </text>
      {persona.chart.marks.map((mark, index) => (
        <g key={mark.label} transform={`translate(${mark.x} ${mark.y})`}>
          <circle
            r={mark.size * scale}
            fill={index % 2 ? persona.color : persona.accent}
            opacity="0.22"
            stroke="#151515"
            strokeWidth="2"
          />
          <path
            d={`M${-mark.size * 0.7} 0H${mark.size * 0.7}M0 ${-mark.size * 0.7}V${mark.size * 0.7}`}
            stroke="#151515"
            strokeWidth="2"
            opacity="0.7"
          />
          {Array.from({ length: 5 }).map((_, petal) => {
            const angle = (petal / 5) * Math.PI * 2
            const x = Math.cos(angle) * mark.size * 0.48
            const y = Math.sin(angle) * mark.size * 0.48
            return (
              <circle
                key={petal}
                cx={x}
                cy={y}
                r={Math.max(3, mark.size * 0.12)}
                fill={CHART_COLORS[(index + petal) % CHART_COLORS.length]}
                stroke="#151515"
                strokeWidth="1"
              />
            )
          })}
          <text
            x="0"
            y={mark.size * scale + 19}
            textAnchor="middle"
            fill="#151515"
            fontSize="12"
            fontWeight="850"
            fontFamily="system-ui, sans-serif"
          >
            {mark.label}
          </text>
        </g>
      ))}
      <path
        d="M80 386C164 316 238 412 326 330S468 316 556 250S700 294 814 172"
        fill="none"
        stroke="#151515"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M80 386C164 316 238 412 326 330S468 316 556 250S700 294 814 172"
        fill="none"
        stroke={persona.accent}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FunFreelancerIconGarden({ persona, width, height }) {
  return (
    <svg
      className="dv7-custom-chart"
      viewBox="0 0 900 460"
      width={width}
      height={height}
      role="img"
      aria-label="A custom icon garden for The Fun Freelancers persona"
    >
      <rect width="900" height="460" fill="#fff8dd" />
      <defs>
        <pattern id="dv7-freelancer-dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.8" fill="#151515" opacity="0.18" />
        </pattern>
      </defs>
      <rect x="24" y="24" width="852" height="412" fill="url(#dv7-freelancer-dots)" />
      {persona.chart.icons.map((icon, index) => {
        const next = persona.chart.icons[(index + 1) % persona.chart.icons.length]
        return (
          <path
            key={`link-${icon.label}`}
            d={`M${icon.x} ${icon.y} C${(icon.x + next.x) / 2} ${icon.y - 90} ${(icon.x + next.x) / 2} ${next.y + 90} ${next.x} ${next.y}`}
            fill="none"
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth="3"
            opacity="0.42"
          />
        )
      })}
      {persona.chart.icons.map((icon, index) => (
        <g key={icon.label} transform={`translate(${icon.x} ${icon.y})`}>
          <circle
            r={24 + icon.value * 0.16}
            fill={CHART_COLORS[index % CHART_COLORS.length]}
            stroke="#151515"
            strokeWidth="3"
            opacity="0.92"
          />
          <IconGlyph type={icon.icon} color="#fff8dd" />
          <text
            y={48 + icon.value * 0.04}
            textAnchor="middle"
            fill="#151515"
            fontSize="13"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
          >
            {icon.label}
          </text>
        </g>
      ))}
      <text x="48" y="58" fill="#151515" fontSize="25" fontWeight="950" fontFamily="system-ui, sans-serif">
        ICONS, PETALS, CODE, DEADLINES
      </text>
      <text x="48" y="88" fill={persona.accent} fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif">
        custom marks arranged as a working chart body
      </text>
    </svg>
  )
}

function IconGlyph({ type, color }) {
  if (type === "flower") {
    return (
      <g fill={color} stroke="#151515" strokeWidth="1.6">
        {[0, 1, 2, 3, 4, 5].map((petal) => {
          const angle = (petal / 6) * Math.PI * 2
          return (
            <ellipse
              key={petal}
              cx={Math.cos(angle) * 11}
              cy={Math.sin(angle) * 11}
              rx="6"
              ry="11"
              transform={`rotate(${(angle * 180) / Math.PI})`}
            />
          )
        })}
        <circle r="7" />
      </g>
    )
  }
  if (type === "moon") {
    return (
      <path
        d="M8-20C-10-14-18 2-12 16C-4 30 15 30 25 18C8 21-6 10-3-5C-1-15 4-20 8-20Z"
        fill={color}
        stroke="#151515"
        strokeWidth="2"
      />
    )
  }
  if (type === "shell") {
    return (
      <path
        d="M-20 18Q-12-18 0-22Q12-18 20 18ZM-10 18Q-7-8 0-22Q7-8 10 18M0-22V18"
        fill={color}
        stroke="#151515"
        strokeWidth="2"
      />
    )
  }
  if (type === "spark") {
    return (
      <path
        d="M0-25L7-7L25 0L7 7L0 25L-7 7L-25 0L-7-7Z"
        fill={color}
        stroke="#151515"
        strokeWidth="2"
      />
    )
  }
  return (
    <path
      d="M0-24L7-7L25-7L11 4L16 23L0 12L-16 23L-11 4L-25-7L-7-7Z"
      fill={color}
      stroke="#151515"
      strokeWidth="2"
    />
  )
}

function TerminalSankey({ persona, width, height, frameProps }) {
  const chartHeight = Math.max(290, height - 82)
  return (
    <div className="dv7-terminal-chart" style={{ width, minHeight: height }}>
      <div className="dv7-terminal-bar">
        <span />
        <span />
        <span />
        <code>cat flows.tsv | awk | sed | sankey</code>
      </div>
      <pre>{`$ wc -c terminal-sankey.lisp
  2048 terminal-sankey.lisp`}</pre>
      <SankeyDiagram
        nodes={persona.chart.nodes}
        edges={persona.chart.edges}
        nodeIdAccessor="id"
        sourceAccessor="source"
        targetAccessor="target"
        valueAccessor="value"
        colorBy="type"
        colorScheme={["#6f7f3f", "#10a5a5", "#e0a92f"]}
        edgeColorBy="source"
        nodeWidth={18}
        nodePaddingRatio={0.12}
        width={width}
        height={chartHeight}
        title="Terminal Sankey in 2kb"
        description="A Sankey diagram wrapped in a terminal-styled interface."
        showLabels={width > 540}
        showLegend={width > 680}
        tooltip
        frameProps={frameProps}
      />
    </div>
  )
}

function PersonaMatrix({ rows, activeId, onChange }) {
  return (
    <div className="dv7-matrix" aria-label="Persona metric matrix">
      <div className="dv7-matrix-head" />
      {METRIC_KEYS.map((metric) => (
        <div key={metric.key} className="dv7-matrix-label">
          {metric.label}
        </div>
      ))}
      {PERSONAS.map((persona) => (
        <React.Fragment key={persona.id}>
          <button
            type="button"
            className={`dv7-matrix-name ${persona.id === activeId ? "is-active" : ""}`}
            style={{ "--persona-color": persona.color }}
            aria-pressed={persona.id === activeId}
            onClick={() => onChange(persona.id)}
          >
            {persona.shortName}
          </button>
          {METRIC_KEYS.map((metric) => {
            const row = rows.find(
              (item) => item.persona === persona.shortName && item.metric === metric.label
            )
            return (
              <span
                key={`${persona.id}-${metric.key}`}
                className="dv7-matrix-cell"
                style={{
                  "--metric-color": metric.color,
                  "--metric-value": row?.value || 0,
                }}
              >
                <i />
              </span>
            )
          })}
        </React.Fragment>
      ))}
    </div>
  )
}
