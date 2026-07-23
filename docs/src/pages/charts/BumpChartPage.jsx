import React, { useState } from "react"
import { BumpChart } from "semiotic"
import { Link } from "react-router-dom"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"

const periods = [2019, 2020, 2021, 2022, 2023, 2024]
const teams = [
  "Alpha", "Bravo", "Cinder", "Delta", "Ember",
  "Fjord", "Grove", "Harbor", "Indigo", "Juniper",
]

const valuesA = {
  Alpha: [96, 82, 73, 91, 88, 84],
  Bravo: [88, 94, 67, 72, 91, 79],
  Cinder: [76, 70, 95, 80, 69, 92],
  Delta: [69, 86, 81, 65, 77, 88],
  Ember: [82, 64, 88, 74, 85, 68],
  Fjord: [61, 78, 60, 83, 63, 75],
  Grove: [73, 58, 76, 57, 72, 60],
  Harbor: [55, 73, 54, 69, 55, 70],
  Indigo: [49, 51, 70, 49, 66, 52],
  Juniper: [43, 46, 45, 61, 47, 58],
}

const valuesB = {
  Alpha: [66, 97, 71, 90, 75, 93],
  Bravo: [94, 73, 92, 65, 95, 76],
  Cinder: [79, 88, 62, 96, 68, 87],
  Delta: [87, 64, 98, 72, 89, 67],
  Ember: [72, 91, 80, 84, 61, 97],
  Fjord: [61, 79, 57, 78, 72, 63],
  Grove: [76, 55, 74, 59, 65, 73],
  Harbor: [58, 75, 52, 69, 79, 54],
  Indigo: [52, 49, 68, 55, 51, 71],
  Juniper: [45, 58, 47, 51, 57, 49],
}

function rows(values) {
  return teams.flatMap(team =>
    periods.map((year, index) => ({ year, team, score: values[team][index] })),
  )
}

const dataA = rows(valuesA)
const dataB = rows(valuesB)

const chartProps = [
  { name: "data", type: "array", required: true, description: "Flat rows containing one magnitude per series and ranking column." },
  { name: "xAccessor", type: "string | function", default: '"x"', description: "Ranking column. First-seen order determines the x-axis order." },
  { name: "yAccessor", type: "string | function", default: '"y"', description: "Magnitude used to calculate rank and ribbon width." },
  { name: "lineBy", type: "string | function", default: '"series"', description: "Series identity carried across ranking columns." },
  { name: "rankDirection", type: '"descending" | "ascending"', default: '"descending"', description: "Whether high or low magnitudes receive rank 1." },
  { name: "ribbon", type: "boolean", default: "false", description: "Draw magnitude-encoded ribbons instead of fixed-width lines." },
  { name: "ribbonSizeRange", type: "[number, number]", default: "[4, 28]", description: "Minimum and maximum full ribbon width in pixels." },
  { name: "curve", type: '"smooth" | "linear"', default: '"smooth"', description: "Horizontal-tangent S-curves or straight transitions." },
  { name: "highlightTop", type: "number", default: null, description: "Color only the N series with the best overall mean rank." },
  { name: "neutralColor", type: "string", default: "theme muted", description: "Shared color for trajectories outside highlightTop." },
  { name: "colorScheme", type: "string | string[] | object", default: "theme categorical", description: "Categorical colors for trajectories. Theme colors remain the default." },
  { name: "color", type: "string", default: null, description: "Uniform trajectory and point color." },
  { name: "styleRules", type: "array", default: null, description: "Apply ordered, data-aware fill, stroke, and opacity rules." },
  { name: "stroke / strokeWidth / opacity", type: "string / number / number", default: null, description: "Shared primitive styling applied to ribbons, lines, and optional points." },
  { name: "showLabels", type: 'boolean | "start" | "end" | "both"', default: "true", description: "Show trajectory labels at either endpoint." },
  { name: "xFormat / yFormat", type: "function", default: null, description: "Format time or ordered x labels and original values in tooltips." },
  { name: "annotations", type: "array", default: null, description: "Chart annotations; x positions can use the original x values, including Date objects." },
  { name: "showLegend", type: "boolean", default: "false", description: "Show a categorical legend in addition to the default endpoint labels." },
  { name: "hoverHighlight", type: 'boolean | "series"', default: "true", description: "Dim every trajectory except the series under the pointer." },
  { name: "animate", type: "boolean | object", default: "false", description: "Animate rank, ribbon-width, line-to-ribbon, and enter/exit changes." },
]

const exampleCode = `import { useState } from "react"
import { BumpChart } from "semiotic"

function RankingExample() {
  const [ribbon, setRibbon] = useState(false)
  const [updated, setUpdated] = useState(false)

  return (
    <>
      <button onClick={() => setRibbon(value => !value)}>
        {ribbon ? "Show lines" : "Show ribbons"}
      </button>
      <button onClick={() => setUpdated(value => !value)}>
        Change rankings
      </button>
      <BumpChart
        data={updated ? dataB : dataA}
        xAccessor="year"
        yAccessor="score"
        lineBy="team"
        ribbon={ribbon}
        highlightTop={5}
        animate={{ duration: 750, easing: "ease-out", intro: false }}
        width={760}
        height={430}
      />
    </>
  )
}`

function AnimatedRibbonExample() {
  const [ribbon, setRibbon] = useState(false)
  const [updated, setUpdated] = useState(false)

  const buttonStyle = {
    padding: "8px 16px",
    borderRadius: 5,
    border: "1px solid var(--surface-3)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    cursor: "pointer",
    fontWeight: 650,
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setRibbon(value => !value)}
          style={buttonStyle}
        >
          {ribbon ? "Show lines" : "Show ribbons"}
        </button>
        <button
          type="button"
          onClick={() => setUpdated(value => !value)}
          style={buttonStyle}
        >
          Change rankings
        </button>
      </div>
      <BumpChart
        data={updated ? dataB : dataA}
        xAccessor="year"
        yAccessor="score"
        lineBy="team"
        ribbon={ribbon}
        highlightTop={5}
        hoverHighlight
        animate={{ duration: 750, easing: "ease-out", intro: false }}
        responsiveWidth
        height={430}
        title="Ten competitors across six seasons"
        description="A bump chart that transitions between fixed-width lines and magnitude-encoded ribbons. The five best overall competitors use categorical colors; the remaining five are neutral."
        summary="Toggle line and ribbon modes, or change the ranking scenario. Hover a trajectory to isolate its complete ranking path."
      />
    </div>
  )
}

export default function BumpChartPage() {
  return (
    <PageLayout
      title="BumpChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "XY Charts", path: "/charts" },
        { label: "BumpChart", path: "/charts/bump-chart" },
      ]}
      prevPage={{ title: "Line Chart", path: "/charts/line-chart" }}
      nextPage={{ title: "Area Chart", path: "/charts/area-chart" }}
    >
      <ComponentMeta
        componentName="BumpChart"
        importStatement='import { BumpChart } from "semiotic"'
        tier="charts"
        wraps="StreamXYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "LineChart", path: "/charts/line-chart" },
          { name: "AreaChart", path: "/charts/area-chart" },
          { name: "SankeyDiagram", path: "/charts/sankey-diagram" },
        ]}
      />

      <p>
        BumpChart ranks every series within each x-column. Set <code>ribbon=&#123;true&#125;</code>{" "}
        to encode the original magnitude as area while retaining rank as vertical position.
        Trajectory colors, neutral marks, axes, labels, and tooltips resolve through the active
        Semiotic theme. The standard primitive styling, style-rule, legend, selection,
        annotation, responsive, and accessibility props are available as well.
      </p>

      <ChartGrounding component="BumpChart" />

      <h2 id="interactive-example">Interactive line-to-ribbon bump chart</h2>
      <p>
        Switch between a traditional fixed-width bump chart and magnitude-encoded ribbons, or click
        <strong> Change rankings</strong> to animate a second ordering scenario. Both modes share
        the same centerline and boundary geometry, so the line-to-ribbon transition only changes
        screen-space width. Hover a trajectory to highlight its full path. Only the five series
        with the best mean rank receive categorical colors; the other five share one neutral color.
      </p>

      <AnimatedRibbonExample />
      <CodeBlock code={exampleCode} language="jsx" />

      <h2 id="ribbon-geometry">Why the ribbons keep their weight</h2>
      <p>
        Ordinary area interpolation moves upper and lower edges vertically. On a steep rank change,
        that projection makes a wide band appear pinched. BumpChart samples the centerline and
        offsets each boundary along its local perpendicular, following the approach of{" "}
        <a href="https://github.com/emeeks/d3.svg.ribbon">d3.svg.ribbon</a>. The requested width is
        preserved even through large jumps, and the fixed sample count gives the frame transition
        engine stable vertices to interpolate.
      </p>

      <h2 id="props">Props</h2>
      <PropTable componentName="BumpChart" props={chartProps} />

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/charts/line-chart">LineChart</Link> — plot the raw values without ranking.</li>
        <li><Link to="/charts/area-chart">AreaChart</Link> — interpolate a conventional value band.</li>
        <li><Link to="/charts/sankey-diagram">SankeyDiagram</Link> — show conserved flow between stages.</li>
      </ul>
    </PageLayout>
  )
}
