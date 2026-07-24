import React, { useEffect, useState } from "react"
import {
  AreaChart,
  BoxPlot,
  ChordDiagram,
  ForceDirectedGraph,
  FunnelChart,
  Heatmap,
  StackedBarChart,
  ThemeProvider,
} from "semiotic"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./DataVizForDummiesExamplePage.css"
import "./DataVizForDummiesTwoExamplePage.css"

const INK = "#18211b"
const PAPER = "#f5f0df"
const MINT = "#76e5c2"
const TANGERINE = "#ff8a4c"
const BLUE = "#5b8def"
const GOLD = "#f1c75b"
const VIOLET = "#a77bea"
const PINK = "#ef78a8"
const PALETTE = [MINT, TANGERINE, BLUE, GOLD, VIOLET, PINK]

const SECTIONS = [
  { id: "second-unit", short: "Bench", label: "The second unit" },
  { id: "composition", short: "Share", label: "Composition" },
  { id: "volume", short: "Volume", label: "Volume over time" },
  { id: "comparison-spread", short: "Spread", label: "Compare spread" },
  { id: "matrix", short: "Grid", label: "Two dimensions" },
  { id: "attrition", short: "Drop", label: "Attrition" },
  { id: "exchange", short: "Swap", label: "Exchange" },
  { id: "topology", short: "Link", label: "Topology" },
  { id: "film-room", short: "Film", label: "Decision rules" },
]

const SECOND_ROSTER = [
  {
    chart: "Stacked bar",
    data: "categories + components",
    task: "compare totals and shares",
    warning: "tiny middle segments are hard to compare",
  },
  {
    chart: "Area",
    data: "ordered values",
    task: "emphasize volume over time",
    warning: "the baseline becomes part of the claim",
  },
  {
    chart: "Box plot",
    data: "groups of observations",
    task: "compare spread and outliers",
    warning: "the raw distribution is summarized away",
  },
  {
    chart: "Heatmap",
    data: "two dimensions + magnitude",
    task: "find clusters and hot spots",
    warning: "color is poor at exact lookup",
  },
  {
    chart: "Funnel",
    data: "ordered stages",
    task: "locate drop-off",
    warning: "stages must describe one cohort",
  },
  {
    chart: "Chord",
    data: "small many-to-many network",
    task: "inspect reciprocal exchange",
    warning: "ribbons become spaghetti quickly",
  },
  {
    chart: "Force graph",
    data: "nodes + relationships",
    task: "discover topology and clusters",
    warning: "position is emergent, not a metric",
  },
]

const ATTENDANCE_MIX = [
  ["Comets", 48, 22, 30],
  ["Owls", 55, 18, 27],
  ["Foxes", 41, 29, 30],
  ["Pilots", 62, 16, 22],
  ["Waves", 46, 20, 34],
  ["Stars", 58, 25, 17],
].flatMap(([game, members, students, walkups]) => [
  { game, audience: "Members", share: members },
  { game, audience: "Students", share: students },
  { game, audience: "Walk-ups", share: walkups },
])

const SEASON_ATTENDANCE = [
  4100, 4380, 4210, 4720, 5010, 4880, 5360, 5590, 5480, 6020, 6310, 6590,
].map((attendance, index) => ({ game: index + 1, attendance }))

const WAIT_TIMES = {
  "North grill": [4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 9, 17],
  "East pizza": [3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8],
  "South snacks": [2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 6, 6],
  "West tacos": [5, 5, 6, 6, 7, 7, 8, 8, 9, 10, 11, 14],
}
const CONCESSION_WAITS = Object.entries(WAIT_TIMES).flatMap(([stand, values]) =>
  values.map((minutes, index) => ({ id: `${stand}-${index}`, stand, minutes })),
)

const TIME_LABELS = {
  1: "5:30",
  2: "6:00",
  3: "6:30",
  4: "7:00",
  5: "Half",
  6: "Final",
}
const ZONE_LABELS = { 1: "North", 2: "East", 3: "South", 4: "West" }
const TRAFFIC_VALUES = [
  [22, 38, 69, 44, 81, 28],
  [18, 31, 58, 63, 74, 35],
  [12, 25, 47, 55, 92, 31],
  [16, 29, 61, 49, 67, 24],
]
const CONCOURSE_TRAFFIC = TRAFFIC_VALUES.flatMap((row, zoneIndex) =>
  row.map((traffic, timeIndex) => ({
    time: timeIndex + 1,
    zone: zoneIndex + 1,
    traffic,
  })),
)

const TICKET_FUNNEL = [
  { step: "Saw offer", fans: 2400 },
  { step: "Visited", fans: 1460 },
  { step: "Picked seats", fans: 910 },
  { step: "Purchased", fans: 620 },
  { step: "Attended", fans: 571 },
]

const ARENA_ZONES = ["Seats", "Concourse", "Food", "Team shop", "Plaza"].map((id) => ({
  id,
}))
const ARENA_MOVEMENT = [
  ["Seats", "Concourse", 74],
  ["Concourse", "Seats", 61],
  ["Concourse", "Food", 48],
  ["Food", "Seats", 39],
  ["Seats", "Team shop", 18],
  ["Team shop", "Concourse", 14],
  ["Plaza", "Concourse", 44],
  ["Concourse", "Plaza", 27],
  ["Food", "Team shop", 9],
  ["Team shop", "Plaza", 7],
].map(([source, target, value]) => ({ source, target, value }))

const STAFF_NODES = [
  { id: "Game ops", group: "Operations", degree: 18 },
  { id: "Security", group: "Operations", degree: 14 },
  { id: "Facilities", group: "Operations", degree: 10 },
  { id: "Ticketing", group: "Guest", degree: 12 },
  { id: "Guest care", group: "Guest", degree: 15 },
  { id: "Accessibility", group: "Guest", degree: 9 },
  { id: "Social", group: "Media", degree: 11 },
  { id: "Broadcast", group: "Media", degree: 13 },
  { id: "Stats desk", group: "Media", degree: 8 },
  { id: "Coaches", group: "Team", degree: 12 },
  { id: "Medical", group: "Team", degree: 9 },
  { id: "Equipment", group: "Team", degree: 7 },
]
const STAFF_EDGES = [
  ["Game ops", "Security", 5],
  ["Game ops", "Facilities", 4],
  ["Game ops", "Broadcast", 4],
  ["Game ops", "Guest care", 5],
  ["Security", "Guest care", 3],
  ["Security", "Medical", 3],
  ["Facilities", "Accessibility", 3],
  ["Ticketing", "Guest care", 5],
  ["Ticketing", "Social", 2],
  ["Guest care", "Accessibility", 4],
  ["Social", "Broadcast", 4],
  ["Social", "Stats desk", 3],
  ["Broadcast", "Stats desk", 5],
  ["Broadcast", "Coaches", 2],
  ["Stats desk", "Coaches", 4],
  ["Coaches", "Medical", 3],
  ["Coaches", "Equipment", 4],
  ["Medical", "Equipment", 2],
  ["Equipment", "Facilities", 2],
].map(([source, target, weight]) => ({ source, target, weight }))

const CHAPTER_STATS = {
  "second-unit": { scan: 74, exact: 61, change: 67, shape: 82, story: 92 },
  composition: { scan: 89, exact: 62, change: 54, shape: 78, story: 84 },
  volume: { scan: 83, exact: 66, change: 95, shape: 72, story: 90 },
  "comparison-spread": { scan: 72, exact: 77, change: 28, shape: 98, story: 76 },
  matrix: { scan: 93, exact: 48, change: 68, shape: 96, story: 79 },
  attrition: { scan: 91, exact: 80, change: 51, shape: 73, story: 94 },
  exchange: { scan: 59, exact: 46, change: 38, shape: 91, story: 95 },
  topology: { scan: 57, exact: 42, change: 45, shape: 99, story: 93 },
}

export default function DataVizForDummiesTwoExamplePage() {
  const [docsTheme] = useDocsTheme()
  const chartTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"
  const [rosterMode, setRosterMode] = useState("task")
  const [funnelOrientation, setFunnelOrientation] = useState("horizontal")
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  const [pageWidth, pageRef] = useResponsiveWidth(300, 1120)
  const chartWidth =
    pageWidth < 780 ? Math.max(280, pageWidth - 28) : Math.min(710, pageWidth - 350)
  const compact = pageWidth < 780
  const chordSize = Math.min(chartWidth, compact ? 370 : 470)

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

  return (
    <ExamplePageLayout title="Data Viz for Dummies II">
      <div className="dvd dvd--second" ref={pageRef}>
        <header className="dvd-hero">
          <div className="dvd-hero__copy">
            <p className="dvd-kicker">The second unit · more shapes, same film room</p>
            <h2>The starters cannot play every question.</h2>
            <p className="dvd-hero__lede">
              The first guide drafted bars, lines, scatters, histograms, Sankeys, and treemaps.
              Excellent roster. Still: some questions arrive wearing composition, attrition,
              matrices, and many-to-many chaos. Send in the bench—specialists whose geometry earns
              its minutes only when the game calls for it.
            </p>
            <div className="dvd-hero__chips" aria-label="Guide promises">
              <span>7 more chart families</span>
              <span>1 fictional arena</span>
              <span>0 default pie charts</span>
            </div>
          </div>
          <div
            className="dvd-card dvd-card--hero"
            aria-label="Second chart selection scouting card"
          >
            <div className="dvd-card__topline">
              <span>VIZ 202</span>
              <span>RC · 2026</span>
            </div>
            <strong className="dvd-card__number">02</strong>
            <div className="dvd-card__name">THE SECOND UNIT</div>
            <div className="dvd-card__position">Specialists · matchup dependent</div>
            <div className="dvd-card__stats">
              <MiniStat label="Range" value="96" />
              <MiniStat label="Shape" value="99" />
              <MiniStat label="Drama" value="91" />
              <MiniStat label="Context" value="100" />
            </div>
          </div>
        </header>

        <nav className="dvd-nav" aria-label="Second data visualization guide sections">
          <span className="dvd-nav__brand" aria-hidden="true">
            THE BENCH
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
              id="second-unit"
              number="00"
              eyebrow="Roster check · seven specialists"
              title="A chart earns the call-up by matching the structure of the question."
              lead="These are not upgrades from the first seven and they are not decorative difficulty settings. Each trades some general readability for one specific superpower: composition, density, stage loss, reciprocity, or topology."
              avoid="Complex-looking data does not automatically require a complex-looking chart. Start with the plainest view that preserves the claim; call a specialist when the simpler chart drops something essential."
              stats={CHAPTER_STATS["second-unit"]}
            >
              <ChartPanel
                eyebrow="Interactive second-unit board"
                title={
                  rosterMode === "task"
                    ? "Scouted by the job to be done"
                    : "Scouted by the data they expect"
                }
                note="Toggle the lens. The chart names stay put; what changes is the reason each one deserves a roster spot."
                feature="Use the chart contract as a preflight check"
                featureCopy="Every Semiotic chart exposes an opinionated data shape. Matching your rows to that contract before styling catches a surprising number of analytical fouls."
              >
                <div className="dvd-segmented" aria-label="Organize second chart roster">
                  <button
                    type="button"
                    className={rosterMode === "task" ? "is-active" : ""}
                    onClick={() => setRosterMode("task")}
                    aria-pressed={rosterMode === "task"}
                  >
                    By analytical task
                  </button>
                  <button
                    type="button"
                    className={rosterMode === "data" ? "is-active" : ""}
                    onClick={() => setRosterMode("data")}
                    aria-pressed={rosterMode === "data"}
                  >
                    By data shape
                  </button>
                </div>
                <div className="dvd2-roster" role="list">
                  {SECOND_ROSTER.map((entry, index) => (
                    <article key={entry.chart} role="listitem">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <h4>{entry.chart}</h4>
                      <strong>{rosterMode === "task" ? entry.task : entry.data}</strong>
                      <p>{rosterMode === "task" ? entry.data : entry.task}</p>
                      <small>Watch: {entry.warning}</small>
                    </article>
                  ))}
                </div>
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="composition"
              number="01"
              eyebrow="Stacked bar · combo guard"
              title="The total has a group chat, and every segment brought receipts."
              lead="A stacked bar carries two readings at once: overall magnitude and the parts that compose it. Normalize every bar to 100% when the mix matters more than the crowd size; keep raw totals when both scale and composition deserve the floor."
              avoid="Only the first segment enjoys a common baseline. If readers must compare every component precisely, grouped bars or small multiples are more honest teammates."
              stats={CHAPTER_STATS.composition}
            >
              <ChartPanel
                eyebrow="Six home games · audience mix"
                title="The opponent changes who fills the building"
                note="Every game sums to 100%. Pilots night leans on members; Foxes night recruits the student section."
                feature="Use normalize when share is the actual measure"
                featureCopy="StackedBarChart performs the percentage conversion while retaining the source values for tooltips and the accessible table."
              >
                <StackedBarChart
                  data={ATTENDANCE_MIX}
                  categoryAccessor="game"
                  stackBy="audience"
                  valueAccessor="share"
                  normalize
                  colorBy="audience"
                  colorScheme={[MINT, GOLD, BLUE]}
                  width={chartWidth}
                  height={410}
                  margin={{ top: 26, right: 24, bottom: 68, left: 52 }}
                  showGrid
                  showLegend
                  legendPosition="bottom"
                  roundedTop={3}
                  title="Audience composition by home game"
                  description="A one-hundred-percent stacked bar chart comparing member, student, and walk-up shares across six fictional home games."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="volume"
              number="02"
              eyebrow="Area chart · power forward"
              title="A line learned to occupy space, so the baseline joined the argument."
              lead="Area gives time-series magnitude visual weight. It is useful when the quantity itself—attendance, inventory, volume, demand—matters more than tiny point-to-point differences. The filled region makes sustained scale feel sustained."
              avoid="Because area is measured to a baseline, a cropped y-axis overstates the drama. Multiple opaque areas also hide one another; use stacking only when the series form a meaningful total."
              stats={CHAPTER_STATS.volume}
            >
              <ChartPanel
                eyebrow="Twelve-game season · building attendance"
                title="A wobbling climb becomes a genuinely fuller arena"
                note="The fill makes the season-long rise legible as volume, while points preserve the fact that these are twelve measured games—not a continuous sensor feed."
                feature="Use semantic gradients to give the fill a job"
                featureCopy="AreaChart can fade toward the baseline or use value-anchored color stops. Gradients should clarify direction or threshold, never cosplay as atmospheric lighting."
              >
                <AreaChart
                  data={SEASON_ATTENDANCE}
                  xAccessor="game"
                  yAccessor="attendance"
                  colorScheme={[MINT]}
                  gradientFill={{ stops: [
                    { offset: 0, opacity: 0.82 },
                    { offset: 1, opacity: 0.08 },
                  ] }}
                  showLine
                  lineWidth={3}
                  showPoints
                  pointRadius={4}
                  width={chartWidth}
                  height={410}
                  margin={{ top: 28, right: 28, bottom: 54, left: 64 }}
                  xExtent={[1, 12]}
                  yExtent={[0, 7000]}
                  xFormat={(value) => `G${value}`}
                  yFormat={(value) => `${Math.round(Number(value) / 1000)}k`}
                  showGrid
                  title="Attendance across twelve home games"
                  description="An area chart showing fictional home-game attendance rising from 4,100 to 6,590 across twelve games."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="comparison-spread"
              number="03"
              eyebrow="Box plot · defensive specialist"
              title="The median is only one player; the box plot brings the entire rotation."
              lead="Box plots compare distributions compactly: median, middle half, whiskers, and unusual observations. They excel when several groups need the same statistical x-ray and individual dots would become a pollen storm."
              avoid="A box can conceal bimodality, sample size, and every charming wrinkle of shape. For small datasets, show the raw points too; for full density, consider a violin or ridgeline plot."
              stats={CHAPTER_STATS["comparison-spread"]}
            >
              <ChartPanel
                eyebrow="Concession waits · twelve checks per stand"
                title="East pizza is steady; north grill has one cursed possession"
                note="Compare medians first, then box height, then whiskers. The lone 17-minute dot is an incident, not the north stand’s typical identity."
                feature="Use outliers as investigation links"
                featureCopy="BoxPlot can retain outlier marks and tooltips, letting a compact statistical summary lead back to the exceptional source observation."
              >
                <BoxPlot
                  data={CONCESSION_WAITS}
                  categoryAccessor="stand"
                  valueAccessor="minutes"
                  colorBy="stand"
                  colorScheme={[TANGERINE, GOLD, MINT, BLUE]}
                  showOutliers
                  width={chartWidth}
                  height={410}
                  margin={{ top: 28, right: 130, bottom: 82, left: 52 }}
                  valueExtent={[0, 18]}
                  showGrid
                  title="Concession wait times by stand"
                  description="Four box plots compare twelve fictional wait-time observations per concession stand, including a seventeen-minute north-grill outlier."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="matrix"
              number="04"
              eyebrow="Heatmap · zone defense"
              title="When two categorical axes collide, color patrols the entire floor."
              lead="A heatmap turns repeated comparisons into a visual field. Instead of reading 24 numbers one by one, the eye spots hot columns, quiet rows, and suspicious intersections. Order both axes with intent; adjacency is doing analytical work."
              avoid="Color supports pattern detection, not precision. Include a legend, use a perceptually ordered scale, and do not let a rainbow manufacture boundaries the data never had."
              stats={CHAPTER_STATS.matrix}
            >
              <ChartPanel
                eyebrow="Arena traffic · zone × game moment"
                title="Halftime is the boss battle, especially in the south"
                note="The fifth column lights up across every zone. South’s value of 92 is the operational hotspot that deserves staffing, signage, and perhaps nacho diplomacy."
                feature="Use a continuous gradient legend"
                featureCopy="Heatmap maps values through a sequential scale and can expose that scale as a legend, keeping intensity comparable across every cell."
              >
                <Heatmap
                  data={CONCOURSE_TRAFFIC}
                  xAccessor="time"
                  yAccessor="zone"
                  valueAccessor="traffic"
                  xFormat={(value) => TIME_LABELS[value] || value}
                  yFormat={(value) => ZONE_LABELS[value] || value}
                  colorScheme="viridis"
                  showValues={!compact}
                  showLegend
                  legendPosition="bottom"
                  legend={{ legendDistance: 48 }}
                  cellBorderColor={PAPER}
                  cellBorderWidth={2}
                  width={chartWidth}
                  height={410}
                  margin={{ top: 28, right: 26, bottom: 112, left: 66 }}
                  xExtent={[0.5, 6.5]}
                  yExtent={[0.5, 4.5]}
                  title="Concourse traffic by arena zone and game moment"
                  description="A four-by-six heatmap of fictional concourse traffic. Halftime is busiest in every zone, peaking in the south."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="attrition"
              number="05"
              eyebrow="Funnel · transition tracker"
              title="Every stage asks the same cohort: who is still with us?"
              lead="Funnels make sequential loss explicit. They fit conversion paths where each stage is a subset of the previous one: saw, visited, selected, purchased, attended. The steepest narrowing points to the next question, not automatically the next fix."
              avoid="Never funnel unrelated stage totals into a fake journey. If people can skip, re-enter, branch, or loop, use a Sankey or process view that admits the truth."
              stats={CHAPTER_STATS.attrition}
            >
              <ChartPanel
                eyebrow="Ticket journey · one campaign cohort"
                title="The leakiest handoff happens before seat selection"
                note="Of 2,400 fans who saw the offer, 1,460 visited and 910 picked seats. The chart locates loss; research must explain it."
                feature="Use orientation to match the reading context"
                featureCopy="FunnelChart can switch between a centered top-to-bottom funnel and a vertical retained-plus-dropoff view without changing the source rows."
              >
                <div className="dvd-segmented" aria-label="Choose funnel orientation">
                  <button
                    type="button"
                    className={funnelOrientation === "horizontal" ? "is-active" : ""}
                    onClick={() => setFunnelOrientation("horizontal")}
                    aria-pressed={funnelOrientation === "horizontal"}
                  >
                    Classic funnel
                  </button>
                  <button
                    type="button"
                    className={funnelOrientation === "vertical" ? "is-active" : ""}
                    onClick={() => setFunnelOrientation("vertical")}
                    aria-pressed={funnelOrientation === "vertical"}
                  >
                    Retained + dropoff
                  </button>
                </div>
                <FunnelChart
                  key={funnelOrientation}
                  data={TICKET_FUNNEL}
                  stepAccessor="step"
                  valueAccessor="fans"
                  orientation={funnelOrientation}
                  color={TANGERINE}
                  stroke={INK}
                  strokeWidth={1.2}
                  connectorOpacity={0.24}
                  showLabels
                  width={chartWidth}
                  height={compact ? 470 : 430}
                  margin={
                    funnelOrientation === "vertical"
                      ? { top: 34, right: 22, bottom: 82, left: 58 }
                      : { top: 18, right: 24, bottom: 18, left: 24 }
                  }
                  title="Ticket campaign conversion funnel"
                  description="A five-stage funnel following one fictional ticket cohort from offer impression through game attendance."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="exchange"
              number="06"
              eyebrow="Chord diagram · passing savant"
              title="A circle of categories starts swapping volume across the lane."
              lead="Chord diagrams summarize many-to-many exchange among a small cast. Arc size shows each category’s total involvement; ribbons reveal who trades with whom. They favor the overview—dominant participants, reciprocal pairs, surprising connections—over exact route lookup."
              avoid="The readable category limit arrives early. If labels crowd or ribbons braid into upholstery, filter, aggregate, or switch to an adjacency matrix."
              stats={CHAPTER_STATS.exchange}
            >
              <ChartPanel
                eyebrow="Arena movement · observed zone transitions"
                title="Seats and concourse run the motion offense"
                note="The thickest two-way relationship joins seats and concourse. Food receives a strong concourse stream, then returns much of it toward the seats."
                feature="Use edgeColorBy to preserve the origin"
                featureCopy="ChordDiagram can color every ribbon by its source or target, making direction recoverable even when the path bends through the center."
              >
                <ChordDiagram
                  nodes={ARENA_ZONES}
                  edges={ARENA_MOVEMENT}
                  nodeIdAccessor="id"
                  sourceAccessor="source"
                  targetAccessor="target"
                  valueAccessor="value"
                  colorScheme={PALETTE}
                  edgeColorBy="source"
                  edgeOpacity={0.66}
                  padAngle={0.035}
                  groupWidth={18}
                  width={chordSize}
                  height={chordSize}
                  showLabels
                  title="Movement between five arena zones"
                  description="A chord diagram summarizing fictional transitions among seats, concourse, food, team shop, and plaza."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="topology"
              number="07"
              eyebrow="Force-directed graph · connective tissue"
              title="Relationships pull together; clusters emerge without assigned seats."
              lead="A force graph treats connections as springs and nodes as repelling bodies. Dense neighborhoods gather, bridges sit between groups, and isolates drift. It is exploratory topology: useful for seeing structure you did not already encode as a hierarchy."
              avoid="Coordinates are an outcome of the simulation, not measured values. Do not say one node is north of another as though geography happened. Layouts can also vary, so preserve stable identity and explain the forces."
              stats={CHAPTER_STATS.topology}
            >
              <ChartPanel
                eyebrow="Game-night staff · handoff network"
                title="Game ops is the hub; broadcast and guest care bridge worlds"
                note="Department colors reveal local clusters. Cross-color edges identify the people whose coordination keeps a small arena problem from becoming a large arena anecdote."
                feature="Use worker layout when the roster gets large"
                featureCopy="ForceDirectedGraph can choose synchronous or worker execution. The worker path keeps expensive settling away from the interface thread while stable node IDs preserve interaction."
              >
                <ForceDirectedGraph
                  nodes={STAFF_NODES}
                  edges={STAFF_EDGES}
                  nodeIdAccessor="id"
                  sourceAccessor="source"
                  targetAccessor="target"
                  colorBy="group"
                  colorScheme={[TANGERINE, MINT, BLUE, VIOLET]}
                  nodeSize="degree"
                  nodeSizeRange={[7, 18]}
                  edgeWidth="weight"
                  edgeColor="#8b938d"
                  edgeOpacity={0.58}
                  nodeStroke={INK}
                  nodeStrokeWidth={1.5}
                  iterations={320}
                  forceStrength={0.16}
                  layoutExecution="sync"
                  width={chartWidth}
                  height={450}
                  showLabels={!compact}
                  showLegend
                  legendPosition="bottom"
                  title="Game-night staff coordination network"
                  description="A force-directed graph of twelve fictional arena roles. Node size represents coordination load and color represents department."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>
          </div>
        </ThemeProvider>

        <section id="film-room" className="dvd-overtime">
          <div className="dvd-overtime__head">
            <p className="dvd-kicker">Film room · matchup notes</p>
            <h2>Specialists are powerful because their contracts are narrow.</h2>
            <p>
              Call the chart whose tradeoffs preserve the thing your reader must notice. Then tell
              them what the geometry cannot prove.
            </p>
          </div>
          <div className="dvd-decisions">
            <Decision
              verb="Compare a changing mix"
              chart="Stacked bar"
              note="Normalize for share; retain totals when scale matters."
            />
            <Decision
              verb="Feel sustained magnitude"
              chart="Area"
              note="Use a meaningful baseline and restrained overlap."
            />
            <Decision
              verb="Compare group spread"
              chart="Box plot"
              note="Report n; show raw points when the sample is small."
            />
            <Decision
              verb="Find a two-way pattern"
              chart="Heatmap"
              note="Order the axes and provide the color scale."
            />
            <Decision
              verb="Locate stage loss"
              chart="Funnel"
              note="One cohort, ordered subsets, no secret re-entry."
            />
            <Decision
              verb="Survey reciprocal flow"
              chart="Chord"
              note="Keep the cast small and aggregate ruthlessly."
            />
            <Decision
              verb="Explore relationships"
              chart="Force graph"
              note="Position is simulated; links are the evidence."
            />
            <Decision
              verb="Need exact values"
              chart="Table first"
              note="A chart may accompany lookup; it cannot replace it."
            />
          </div>
          <blockquote>
            The bench is not where lesser charts wait. It is where specific questions find the exact
            strange geometry they deserve.
          </blockquote>
          <div className="dvd-final-rule">
            <span>THE SECOND RULE</span>
            <strong>Call the specialist. Name the tradeoff. Keep the evidence in bounds.</strong>
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
