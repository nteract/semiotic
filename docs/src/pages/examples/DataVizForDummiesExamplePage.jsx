import React, { useEffect, useMemo, useState } from "react"
import {
  BarChart,
  GroupedBarChart,
  Histogram,
  LineChart,
  SankeyDiagram,
  Scatterplot,
  ThemeProvider,
  Treemap,
} from "semiotic"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./DataVizForDummiesExamplePage.css"

const INK = "#18211b"
const PAPER = "#f5f0df"
const LIME = "#c7f36b"
const CORAL = "#ff6f61"
const BLUE = "#5b8def"
const GOLD = "#f1c75b"
const VIOLET = "#a77bea"
const TEAL = "#3db9a6"
const PALETTE = [LIME, CORAL, BLUE, GOLD, VIOLET, TEAL]

const SECTIONS = [
  { id: "field-guide", short: "Map", label: "The whole field" },
  { id: "ranking", short: "Rank", label: "Ranking" },
  { id: "comparison", short: "Compare", label: "Comparison" },
  { id: "change", short: "Change", label: "Change over time" },
  { id: "distribution", short: "Shape", label: "Distribution" },
  { id: "relationship", short: "Relate", label: "Relationship" },
  { id: "flow", short: "Flow", label: "Flow" },
  { id: "hierarchy", short: "Nest", label: "Hierarchy" },
  { id: "overtime", short: "OT", label: "Decision rules" },
]

const PLAYER_ROWS = [
  {
    id: "maya",
    player: "Maya ‘M-Train’ Patel",
    short: "Maya",
    points: 31,
    assists: 9,
    minutes: 34,
    rebounds: 6,
    efficiency: 29,
    role: "Guard",
  },
  {
    id: "zuri",
    player: "Zuri ‘No Notes’ Okafor",
    short: "Zuri",
    points: 27,
    assists: 5,
    minutes: 31,
    rebounds: 11,
    efficiency: 27,
    role: "Forward",
  },
  {
    id: "leo",
    player: "Leo ‘Ratio’ Santos",
    short: "Leo",
    points: 23,
    assists: 12,
    minutes: 36,
    rebounds: 4,
    efficiency: 26,
    role: "Guard",
  },
  {
    id: "aiko",
    player: "Aiko ‘Receipts’ Tan",
    short: "Aiko",
    points: 18,
    assists: 7,
    minutes: 29,
    rebounds: 8,
    efficiency: 22,
    role: "Wing",
  },
  {
    id: "omar",
    player: "Omar ‘Main Quest’ Reed",
    short: "Omar",
    points: 15,
    assists: 3,
    minutes: 24,
    rebounds: 13,
    efficiency: 21,
    role: "Center",
  },
  {
    id: "bea",
    player: "Bea ‘Side Quest’ Quinn",
    short: "Bea",
    points: 11,
    assists: 6,
    minutes: 21,
    rebounds: 5,
    efficiency: 16,
    role: "Wing",
  },
]

const SHOT_ROWS = PLAYER_ROWS.flatMap((player, index) => [
  { player: player.short, zone: "Paint", value: [14, 11, 8, 7, 9, 5][index] },
  { player: player.short, zone: "Mid", value: [5, 7, 4, 3, 2, 3][index] },
  { player: player.short, zone: "Three", value: [12, 9, 11, 8, 4, 3][index] },
])

const WEEK_ROWS = [
  [1, 18, 13],
  [2, 21, 16],
  [3, 17, 18],
  [4, 25, 19],
  [5, 23, 22],
  [6, 28, 20],
  [7, 26, 24],
  [8, 31, 23],
  [9, 29, 27],
  [10, 34, 26],
].flatMap(([week, points, assists]) => [
  { week, value: points, series: "Points" },
  { week, value: assists, series: "Team assists" },
])

const POSSESSION_LENGTHS = [
  4, 7, 8, 9, 9, 10, 11, 11, 12, 12, 13, 14, 14, 14, 15, 15, 16, 16, 17, 18, 18, 19, 20, 21, 21, 22,
  23, 24, 24, 25, 27, 29,
].map((seconds, index) => ({ id: `possession-${index + 1}`, seconds }))

const POSSESSION_NODES = [
  { id: "Inbound", type: "start" },
  { id: "Early push", type: "tempo" },
  { id: "Half court", type: "tempo" },
  { id: "Paint touch", type: "action" },
  { id: "Kick out", type: "action" },
  { id: "Reset", type: "action" },
  { id: "Score", type: "result" },
  { id: "Miss", type: "result" },
  { id: "Turnover", type: "result" },
]

const POSSESSION_EDGES = [
  ["Inbound", "Early push", 36],
  ["Inbound", "Half court", 64],
  ["Early push", "Paint touch", 25],
  ["Early push", "Kick out", 11],
  ["Half court", "Paint touch", 29],
  ["Half court", "Kick out", 21],
  ["Half court", "Reset", 14],
  ["Paint touch", "Score", 31],
  ["Paint touch", "Miss", 18],
  ["Paint touch", "Turnover", 5],
  ["Kick out", "Score", 17],
  ["Kick out", "Miss", 12],
  ["Kick out", "Turnover", 3],
  ["Reset", "Score", 5],
  ["Reset", "Miss", 5],
  ["Reset", "Turnover", 4],
].map(([source, target, value]) => ({ source, target, value }))

const PLAYBOOK_TREE = {
  name: "The playbook",
  children: [
    {
      name: "Attack",
      family: "Attack",
      children: [
        { name: "Horns", value: 22, family: "Attack" },
        { name: "Five-out", value: 18, family: "Attack" },
        { name: "Pistol", value: 12, family: "Attack" },
      ],
    },
    {
      name: "Respond",
      family: "Respond",
      children: [
        { name: "Zone breaker", value: 15, family: "Respond" },
        { name: "Press escape", value: 9, family: "Respond" },
        { name: "ATO", value: 8, family: "Respond" },
      ],
    },
    {
      name: "Defend",
      family: "Defend",
      children: [
        { name: "Switch", value: 16, family: "Defend" },
        { name: "Drop", value: 11, family: "Defend" },
        { name: "Trap", value: 7, family: "Defend" },
      ],
    },
  ],
}

const TAXONOMY_CHARTS = [
  { id: "Bar", data: ["Categories"], tasks: ["Rank", "Compare"] },
  { id: "Grouped bar", data: ["Categories", "Series"], tasks: ["Compare"] },
  { id: "Line", data: ["Time", "Series"], tasks: ["Change", "Forecast"] },
  { id: "Histogram", data: ["Numbers"], tasks: ["Find shape", "Find outliers"] },
  { id: "Scatter", data: ["Pairs", "Numbers"], tasks: ["Relate", "Find outliers"] },
  { id: "Sankey", data: ["Flows", "Network"], tasks: ["Trace", "Compare"] },
  { id: "Treemap", data: ["Hierarchy", "Categories"], tasks: ["Part to whole", "Locate"] },
]

const CHAPTER_STATS = {
  "field-guide": { scan: 72, exact: 58, change: 63, shape: 76, story: 94 },
  ranking: { scan: 98, exact: 86, change: 24, shape: 38, story: 64 },
  comparison: { scan: 88, exact: 82, change: 40, shape: 55, story: 70 },
  change: { scan: 82, exact: 68, change: 99, shape: 64, story: 91 },
  distribution: { scan: 69, exact: 56, change: 31, shape: 99, story: 77 },
  relationship: { scan: 64, exact: 76, change: 52, shape: 88, story: 84 },
  flow: { scan: 58, exact: 61, change: 57, shape: 92, story: 96 },
  hierarchy: { scan: 78, exact: 52, change: 20, shape: 90, story: 79 },
}

function buildTaxonomy(mode) {
  const field = mode === "data" ? "data" : "tasks"
  const sourceType = mode === "data" ? "data kind" : "task"
  const groups = [...new Set(TAXONOMY_CHARTS.flatMap((chart) => chart[field]))]
  const nodes = [
    ...groups.map((id) => ({ id, type: sourceType })),
    ...TAXONOMY_CHARTS.map((chart) => ({ id: chart.id, type: "chart" })),
  ]
  const edges = TAXONOMY_CHARTS.flatMap((chart) =>
    chart[field].map((group) => ({ source: group, target: chart.id, value: 1 })),
  )
  return { nodes, edges }
}

export default function DataVizForDummiesExamplePage() {
  const [docsTheme] = useDocsTheme()
  const chartTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"
  const [taxonomyMode, setTaxonomyMode] = useState("data")
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  const [pageWidth, pageRef] = useResponsiveWidth(300, 1120)
  const chartWidth =
    pageWidth < 780 ? Math.max(280, pageWidth - 28) : Math.min(710, pageWidth - 350)

  useEffect(() => {
    const elements = SECTIONS.map(({ id }) => document.getElementById(id)).filter(Boolean)
    if (!elements.length || typeof IntersectionObserver === "undefined") return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target?.id) setActiveSection(visible.target.id)
      },
      { rootMargin: "-22% 0px -58%", threshold: [0, 0.15, 0.4, 0.7] },
    )
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  const taxonomy = useMemo(() => buildTaxonomy(taxonomyMode), [taxonomyMode])
  const compact = pageWidth < 780

  return (
    <ExamplePageLayout title="Data Viz for Dummies">
      <div className="dvd" ref={pageRef}>
        <header className="dvd-hero">
          <div className="dvd-hero__copy">
            <p className="dvd-kicker">A guide to choosing a chart</p>
            <h2>
              Start with the question you want to answer.
            </h2>
            <p className="dvd-hero__lede">
              A chart choice starts with a question: who leads, what changed, how spread out are
              the values, or where did the flow go? This guide uses one fictional sports season
              to introduce the main chart families. Read the question above each example,
              compare the marks, and notice what the form makes easy to see. You do not need to
              know the component names to begin.
            </p>
            <div className="dvd-hero__chips" aria-label="Guide promises">
              <span>7 chart families</span>
              <span>2 taxonomies</span>
              <span>1 fictional season</span>
            </div>
          </div>
          <div className="dvd-card dvd-card--hero" aria-label="Chart selection scouting card">
            <div className="dvd-card__topline">
              <span>VIZ 101</span>
              <span>RC · 2026</span>
            </div>
            <strong className="dvd-card__number">01</strong>
            <div className="dvd-card__name">THE QUESTION</div>
            <div className="dvd-card__position">First pick · every draft</div>
            <div className="dvd-card__stats">
              <MiniStat label="Context" value="99" />
              <MiniStat label="Clarity" value="97" />
              <MiniStat label="Vibes" value="86" />
              <MiniStat label="Receipts" value="100" />
            </div>
          </div>
        </header>

        <nav className="dvd-nav" aria-label="Data visualization guide sections">
          <span className="dvd-nav__brand" aria-hidden="true">
            THE ROSTER
          </span>
          <div className="dvd-nav__links">
            {SECTIONS.map((section, index) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={activeSection === section.id ? "is-active" : ""}
                aria-current={activeSection === section.id ? "location" : undefined}
              >
                <i>{String(index).padStart(2, "0")}</i>
                <span className="dvd-nav__long">{section.label}</span>
                <span className="dvd-nav__short">{section.short}</span>
              </a>
            ))}
          </div>
        </nav>

        <ThemeProvider theme={chartTheme}>
          <div className="dvd-guide">
            <GuideChapter
              id="field-guide"
              number="00"
              eyebrow="Taxonomy · the pregame show"
              title="Do not ask ‘which chart?’ Ask what kind of truth is trying to get out."
              lead="The same data can suggest several charts. Sort this guide by the kind of data you have or by the task you want to do. Some chart families appear in both groups because they support more than one task."
              avoid="Use the map to narrow your choices, then check whether the data supports the comparison you want to make."
              stats={CHAPTER_STATS["field-guide"]}
            >
              <ChartPanel
                eyebrow="Interactive chart family map"
                title={
                  taxonomyMode === "data"
                    ? "Organized by kind of data"
                    : "Organized by kind of task"
                }
                note="Shared lanes are visual cousins: a line and scatterplot both welcome paired values, while bars and treemaps can both host categories—but with radically different reading costs."
                feature="Use generated descriptions + accessible tables"
                featureCopy="This map has a plain-language description and Semiotic’s default screen-reader table, so the taxonomy is not trapped inside the pixels."
              >
                <div className="dvd-segmented" aria-label="Organize chart taxonomy">
                  <button
                    type="button"
                    className={taxonomyMode === "data" ? "is-active" : ""}
                    onClick={() => setTaxonomyMode("data")}
                    aria-pressed={taxonomyMode === "data"}
                  >
                    By kind of data
                  </button>
                  <button
                    type="button"
                    className={taxonomyMode === "task" ? "is-active" : ""}
                    onClick={() => setTaxonomyMode("task")}
                    aria-pressed={taxonomyMode === "task"}
                  >
                    By kind of task
                  </button>
                </div>
                <SankeyDiagram
                  key={taxonomyMode}
                  nodes={taxonomy.nodes}
                  edges={taxonomy.edges}
                  nodeIdAccessor="id"
                  sourceAccessor="source"
                  targetAccessor="target"
                  valueAccessor="value"
                  colorBy="type"
                  colorScheme={taxonomyMode === "data" ? [BLUE, LIME] : [CORAL, LIME]}
                  edgeColorBy="source"
                  nodeWidth={14}
                  nodePaddingRatio={0.08}
                  width={chartWidth}
                  height={compact ? 430 : 470}
                  margin={{ right: 124 }}
                  showLabels
                  tooltip
                  title={`Chart taxonomy organized by ${taxonomyMode === "data" ? "data kind" : "analytical task"}`}
                  description={`A Sankey diagram connecting ${taxonomyMode === "data" ? "data structures" : "analytical tasks"} to seven appropriate chart families.`}
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="ranking"
              number="01"
              eyebrow="Bar chart · point guard"
              title="Behold the bar: clean-cut nepo baby of position, still earning the minutes."
              lead="Bars compare values by length from a common baseline. Sorting them makes the ranking easy to read and lets you compare neighboring players at a glance."
              avoid="Start the value axis at zero when bar length represents the total. A cropped baseline can make small differences look much larger."
              stats={CHAPTER_STATS.ranking}
            >
              <ChartPanel
                eyebrow="Player leaderboard · points per game"
                title="M-Train leads the room; the order does the explaining"
                note="Read from top to bottom for rank, then compare adjacent bar lengths for the size of each gap."
                feature="Use the skip-to-data table"
                featureCopy="BarChart ships an accessible table by default. Keyboard readers can skip directly to the ranked values instead of reverse-engineering painted lengths."
              >
                <BarChart
                  data={PLAYER_ROWS}
                  categoryAccessor="short"
                  valueAccessor="points"
                  orientation="horizontal"
                  sort="desc"
                  color={LIME}
                  stroke={INK}
                  strokeWidth={1.5}
                  roundedTop={4}
                  width={chartWidth}
                  height={390}
                  margin={{ top: 24, right: 24, bottom: 46, left: 62 }}
                  showGrid
                  enableHover
                  title="Rookie City player scoring leaderboard"
                  description="A horizontal bar chart ranking six fictional players by points per game, led by Maya at 31."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="comparison"
              number="02"
              eyebrow="Grouped bar · wing defender"
              title="Comparison is ranking after it acquires subplots, lore, and a shared calendar."
              lead="Grouped bars put each player’s measures together. Compare shot locations within a player, or follow the same color across players. A small number of series is easiest to keep track of."
              avoid="When there are too many groups or colors to follow, try separate small charts, a dot plot or a filter for the comparison that matters."
              stats={CHAPTER_STATS.comparison}
            >
              <ChartPanel
                eyebrow="Scoring profile · points by zone"
                title="Same totals, different basketball biographies"
                note="Zuri lives in the paint; Leo bends the perimeter. Grouping preserves both the player total and the shot-location composition."
                feature="Use keyboard-following tooltips"
                featureCopy="Semiotic’s focus ring and aria-live tooltip announcement follow arrow-key navigation, so exact zone values do not depend on a mouse hover."
              >
                <GroupedBarChart
                  data={SHOT_ROWS}
                  categoryAccessor="player"
                  groupBy="zone"
                  valueAccessor="value"
                  colorBy="zone"
                  colorScheme={[CORAL, GOLD, BLUE]}
                  width={chartWidth}
                  height={410}
                  margin={{ top: 24, right: 24, bottom: 72, left: 48 }}
                  showGrid
                  showLegend
                  legendPosition="bottom"
                  roundedTop={3}
                  title="Player points by shot zone"
                  description="A grouped bar chart comparing paint, mid-range, and three-point scoring for six players."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="change"
              number="03"
              eyebrow="Line chart · transition offense"
              title="Time enters the gym and suddenly every point has a before and an after."
              lead="A line connects observations in order. It makes changes and trends easy to follow, which is useful when comparing performance across a season or any other sequence of measurements."
              avoid="Connect values only when their order matters. Use straight segments or clearly explain smoothing so readers can distinguish observations from the path drawn between them."
              stats={CHAPTER_STATS.change}
            >
              <ChartPanel
                eyebrow="Ten-game arc · two team signals"
                title="The season found a second gear in week six"
                note="Points and team assists rise together after week five. The annotation directs attention to that change."
                feature="Use anchored, provenanced annotations"
                featureCopy="Semiotic annotations can stay attached to stable data targets and carry author, source, and lifecycle metadata beyond what appears on the plot."
              >
                <LineChart
                  data={WEEK_ROWS}
                  xAccessor="week"
                  yAccessor="value"
                  lineBy="series"
                  colorBy="series"
                  colorScheme={[LIME, VIOLET]}
                  width={chartWidth}
                  height={410}
                  margin={{ top: 28, right: 28, bottom: 56, left: 50 }}
                  xExtent={[1, 10]}
                  yExtent={[0, 38]}
                  lineWidth={3}
                  showPoints
                  pointRadius={4}
                  showGrid
                  showLegend
                  legendPosition="bottom"
                  xFormat={(value) => `W${value}`}
                  annotations={[
                    {
                      type: "text",
                      week: 6,
                      value: 28,
                      label: "the leap, receipts attached",
                      dx: 10,
                      dy: -14,
                      color: CORAL,
                    },
                  ]}
                  title="Rookie City scoring and assists over ten games"
                  description="A two-series line chart. Both scoring and assists trend upward, with a notable scoring jump at week six."
                  enableHover
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="distribution"
              number="04"
              eyebrow="Histogram · sixth player"
              title="The average arrives late, says ‘my bad,’ and misses the shape of the whole party."
              lead="A histogram groups values into ranges and counts how many fall in each. It shows where possession lengths cluster and how widely they vary. Try different bin widths to check whether a pattern depends on the grouping."
              avoid="Read the distribution as a whole. Include the sample size and bin widths, and inspect the observations before explaining an unexpected peak."
              stats={CHAPTER_STATS.distribution}
            >
              <ChartPanel
                eyebrow="Possession clock · 32 trips"
                title="Most possessions resolve in the middle; a long tail burns clock"
                note="Most possessions fall around 14–18 seconds, with a few longer ones stretching the right side of the distribution."
                feature="Use SSR for durable first paint"
                featureCopy="Histogram is registered for Semiotic’s server renderer, so the evidence can arrive as SVG before client JavaScript hydrates—useful for reports, sharing, and slower devices."
              >
                <Histogram
                  data={POSSESSION_LENGTHS}
                  valueAccessor="seconds"
                  bins={8}
                  color={BLUE}
                  stroke={PAPER}
                  strokeWidth={2}
                  width={chartWidth}
                  height={390}
                  margin={{ top: 24, right: 24, bottom: 48, left: 48 }}
                  showGrid
                  title="Distribution of possession length"
                  description="A histogram of 32 fictional possession lengths from four to twenty-nine seconds, concentrated in the middle teens."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="relationship"
              number="05"
              eyebrow="Scatterplot · two-way playmaker"
              title="Two variables meet. Correlation enters the chat. Causation remains on read."
              lead="A scatterplot compares two measurements for each observation. Look for clusters, trends and outliers. Bubble size can add a third measure when that extra comparison is useful."
              avoid="A trend shows how values vary together. To explain why, you will need to consider other factors and how the observations were selected."
              stats={CHAPTER_STATS.relationship}
            >
              <ChartPanel
                eyebrow="Minutes × assists · bubble = rebounds"
                title="Minutes create opportunity; role shapes what happens next"
                note="Leo’s assist total outruns the minutes pattern, while Omar’s large rebound bubble occupies a different job description."
                feature="Use stable point identity + linked hover"
                featureCopy="pointIdAccessor keeps each player identifiable across updates; Semiotic can publish linked-hover state so another chart or detail panel highlights the same player."
              >
                <Scatterplot
                  data={PLAYER_ROWS}
                  xAccessor="minutes"
                  yAccessor="assists"
                  sizeBy="rebounds"
                  sizeRange={[7, 20]}
                  colorBy="role"
                  colorScheme={PALETTE}
                  pointIdAccessor="id"
                  pointOpacity={0.84}
                  stroke={INK}
                  strokeWidth={1.5}
                  regression={{
                    method: "linear",
                    color: CORAL,
                    strokeWidth: 2.5,
                    label: "minutes trend",
                  }}
                  width={chartWidth}
                  height={410}
                  margin={{ top: 24, right: 30, bottom: 58, left: 50 }}
                  xExtent={[18, 39]}
                  yExtent={[0, 14]}
                  showGrid
                  showLegend={!compact}
                  legendPosition="bottom"
                  title="Minutes played and assists by player"
                  description="A scatterplot comparing minutes and assists for six players. Bubble area represents rebounds and color represents court role."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="flow"
              number="06"
              eyebrow="Sankey · floor general"
              title="A total becomes a journey: where it came from, where it went, what got lost."
              lead="A Sankey follows quantities through stages. Ribbon width shows how much takes each route, making it useful for budgets, journeys and possessions. Use consistent units so readers can follow the amounts from start to finish."
              avoid="If too many ribbons cross, filter or group the routes. Explain any gains or losses between stages so the totals remain understandable."
              stats={CHAPTER_STATS.flow}
            >
              <ChartPanel
                eyebrow="100 possessions · outcome paths"
                title="The paint is productive; resets are expensive"
                note="Follow the thickest ribbons. Early pushes and half-court sets both favor paint touches, and those touches convert more often than resets."
                feature="Use selection across coordinated views"
                featureCopy="SankeyDiagram consumes named selections and linked hover. Select a path here and a companion timeline or table can retain the same filter without bespoke mark plumbing."
              >
                <SankeyDiagram
                  nodes={POSSESSION_NODES}
                  edges={POSSESSION_EDGES}
                  nodeIdAccessor="id"
                  sourceAccessor="source"
                  targetAccessor="target"
                  valueAccessor="value"
                  colorBy="type"
                  colorScheme={[VIOLET, BLUE, GOLD, LIME]}
                  edgeColorBy="source"
                  edgeOpacity={0.72}
                  nodeWidth={16}
                  nodePaddingRatio={0.12}
                  width={chartWidth}
                  height={compact ? 430 : 450}
                  margin={{ right: 124 }}
                  showLabels
                  tooltip
                  title="One hundred possessions from inbound to result"
                  description="A Sankey diagram tracing one hundred fictional basketball possessions through tempo, action, and final outcome."
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="hierarchy"
              number="07"
              eyebrow="Treemap · roster depth"
              title="Hierarchy is a house of rooms; area tells you which rooms consume the rent."
              lead="A treemap fits a hierarchy into nested rectangles. Larger rectangles represent larger values, making it easy to locate the main branches. Labels and nesting explain how each part belongs to the whole."
              avoid="For an exact ranking, use bars. For parent-child relationships with little emphasis on values, use a tree. A treemap is useful when both structure and relative size matter."
              stats={CHAPTER_STATS.hierarchy}
            >
              <ChartPanel
                eyebrow="Playbook · usage share"
                title="Attack owns the binder; every rectangle keeps its family name"
                note="Area estimates use frequency; nesting reveals strategic family. The chart helps locate dominant plays, not read a box score to the decimal."
                feature="Use hierarchy-aware navigation"
                featureCopy="Semiotic can expose the hierarchy as a navigable tree, so readers can follow parent-child relationships with a keyboard or assistive technology."
              >
                <Treemap
                  data={PLAYBOOK_TREE}
                  childrenAccessor="children"
                  valueAccessor="value"
                  nodeIdAccessor="name"
                  colorBy="family"
                  colorScheme={{ Attack: LIME, Respond: GOLD, Defend: BLUE }}
                  padding={4}
                  stroke={INK}
                  strokeWidth={1.5}
                  width={chartWidth}
                  height={410}
                  showLabels
                  tooltip
                  title="Rookie City playbook hierarchy"
                  description="A treemap nesting nine plays inside attack, response, and defense families. Rectangle area represents fictional usage."
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>
          </div>
        </ThemeProvider>

        <section id="overtime" className="dvd-overtime">
          <div className="dvd-overtime__head">
            <p className="dvd-kicker">Choosing a chart</p>
            <h2>Name the task, then choose the form.</h2>
            <p>
              Complete the sentence “I need my reader to…” and use the tasks below to choose a
              starting point.
            </p>
          </div>
          <div className="dvd-decisions">
            <Decision
              verb="Find the leader"
              chart="Sorted bar"
              note="Common baseline. Zero drama. Elite scan game."
            />
            <Decision
              verb="Compare subgroups"
              chart="Grouped bar"
              note="Keep the legend short or facet the roster."
            />
            <Decision
              verb="See what changed"
              chart="Line"
              note="Time or another defensible order belongs on x."
            />
            <Decision
              verb="Understand spread"
              chart="Histogram"
              note="Interrogate the bins; report the sample."
            />
            <Decision
              verb="Test association"
              chart="Scatterplot"
              note="Show the points. Causality is not in the contract."
            />
            <Decision
              verb="Trace movement"
              chart="Sankey"
              note="The ribbon width must conserve one quantity."
            />
            <Decision
              verb="Browse nested parts"
              chart="Treemap"
              note="Overview first; exact comparison second."
            />
            <Decision
              verb="Say one number"
              chart="BigNumber"
              note="Add context, target, date, and what changed."
            />
          </div>
          <blockquote>
            A useful chart makes the comparison you care about easier to see.
          </blockquote>
          <div className="dvd-final-rule">
            <span>THE GOLDEN RULE</span>
            <strong>Encode the task. Preserve the evidence. Explain the weird bit.</strong>
          </div>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function GuideChapter({ id, number, eyebrow, title, lead, avoid, stats, children }) {
  return (
    <section id={id} className="dvd-chapter">
      <div className="dvd-chapter__copy">
        <div className="dvd-chapter__number">{number}</div>
        <p className="dvd-chapter__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="dvd-chapter__lead">{lead}</p>
        <div className="dvd-coach">
          <span>COACH’S CHALLENGE</span>
          <p>{avoid}</p>
        </div>
        <ScoutingStats stats={stats} />
      </div>
      <div className="dvd-chapter__stage">{children}</div>
    </section>
  )
}

function ChartPanel({ eyebrow, title, note, feature, featureCopy, children }) {
  return (
    <article className="dvd-chart-panel">
      <header>
        <p>{eyebrow}</p>
        <h3>{title}</h3>
        <span>{note}</span>
      </header>
      <div className="dvd-chart-panel__plot">{children}</div>
      <aside className="dvd-feature-note">
        <div className="dvd-feature-note__flag">
          <i aria-hidden="true">✦</i> You should think about using this feature
        </div>
        <strong>{feature}</strong>
        <p>{featureCopy}</p>
      </aside>
    </article>
  )
}

function ScoutingStats({ stats }) {
  return (
    <div className="dvd-scout" aria-label="Chart scouting ratings out of 100">
      <div className="dvd-scout__head">
        <span>SCOUTING</span>
        <small>
          OVR{" "}
          {Math.round(
            Object.values(stats).reduce((sum, value) => sum + value, 0) / Object.keys(stats).length,
          )}
        </small>
      </div>
      {Object.entries(stats).map(([label, value]) => (
        <div className="dvd-scout__row" key={label}>
          <span>{label}</span>
          <div>
            <i style={{ width: `${value}%` }} />
          </div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Decision({ verb, chart, note }) {
  return (
    <article>
      <span>I need to…</span>
      <h3>{verb}</h3>
      <strong>{chart}</strong>
      <p>{note}</p>
    </article>
  )
}
