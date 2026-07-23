import React, { useEffect, useState } from "react"
import {
  BubbleChart,
  CandlestickChart,
  DonutChart,
  GaugeChart,
  LikertChart,
  MinimapChart,
  MultiAxisLineChart,
  OrbitDiagram,
  PieChart,
  ProcessSankey,
  QuadrantChart,
  ScatterplotMatrix,
  StackedAreaChart,
  SwarmPlot,
  SwimlaneChart,
  ThemeProvider,
} from "semiotic"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./DataVizForDummiesExamplePage.css"
import "./DataVizForDummiesFourExamplePage.css"

const GOLD = "#ffd166"
const CYAN = "#63d8ff"
const CORAL = "#ff6f61"
const BLUE = "#5b8def"
const VIOLET = "#a77bea"
const MINT = "#76e5c2"
const PALETTE = [GOLD, CYAN, CORAL, BLUE, VIOLET, MINT]

const SECTIONS = [
  { id: "last-roster", short: "Roster", label: "The last roster" },
  { id: "share", short: "Share", label: "Parts of a whole" },
  { id: "verdict", short: "Call", label: "Targets and verdicts" },
  { id: "population", short: "Crowd", label: "Visible populations" },
  { id: "diagnosis", short: "Read", label: "Multivariate diagnosis" },
  { id: "layered-time", short: "Time", label: "Layered time" },
  { id: "navigation", short: "Nav", label: "Time navigation" },
  { id: "systems", short: "System", label: "Systems in motion" },
  { id: "final-whistle", short: "Review", label: "Decision rules" },
]

const ROTATIONS = [
  {
    unit: "Share",
    charts: "Pie · Donut",
    question: "How is one whole divided?",
    warning: "Keep the number of slices low.",
  },
  {
    unit: "Verdict",
    charts: "Gauge · Likert",
    question: "Where do we stand against a standard?",
    warning: "The standard must be defensible.",
  },
  {
    unit: "Population",
    charts: "Swarm · Bubble",
    question: "Which observations or magnitudes matter?",
    warning: "Packing and area reduce precision.",
  },
  {
    unit: "Diagnosis",
    charts: "Quadrant · Scatterplot matrix",
    question: "Which multivariate pattern needs action?",
    warning: "Every extra variable raises reading cost.",
  },
  {
    unit: "Layered time",
    charts: "Stacked area · Multi-axis · Candlestick",
    question: "Which structure rides on the time axis?",
    warning: "Shared time does not mean shared scale.",
  },
  {
    unit: "Navigation",
    charts: "Swimlane · Minimap",
    question: "Where and when should the reader look?",
    warning: "Overview and detail need a clear contract.",
  },
  {
    unit: "Systems",
    charts: "Orbit · Process Sankey",
    question: "Is the system organized by relation or timed flow?",
    warning: "Layout metaphor must match system behavior.",
  },
]

const SHOT_SHARE = [
  { zone: "Rim", attempts: 82 },
  { zone: "Corner three", attempts: 54 },
  { zone: "Above break", attempts: 61 },
  { zone: "Midrange", attempts: 29 },
  { zone: "Free throws", attempts: 34 },
]

const SURVEY_LEVELS = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]
const SURVEY_COUNTS = [
  ["The pace creates good shots", 4, 8, 10, 31, 27],
  ["Roles are clear", 7, 11, 15, 29, 18],
  ["The bench changes games", 13, 16, 18, 21, 12],
  ["Defense travels", 3, 7, 9, 32, 29],
]
const FAN_SURVEY = SURVEY_COUNTS.flatMap(([question, ...counts]) =>
  counts.map((count, index) => ({ question, level: SURVEY_LEVELS[index], count })),
)

const PLAYER_SAMPLES = [
  ["Guards", "Maya", 18, 9, 34, "Starter"],
  ["Guards", "Leo", 15, 12, 36, "Starter"],
  ["Guards", "Nia", 9, 5, 18, "Bench"],
  ["Guards", "Ivy", 7, 4, 14, "Bench"],
  ["Wings", "Zuri", 16, 8, 31, "Starter"],
  ["Wings", "Aiko", 13, 7, 29, "Starter"],
  ["Wings", "Bea", 10, 6, 21, "Bench"],
  ["Wings", "Sol", 8, 5, 16, "Bench"],
  ["Bigs", "Omar", 17, 7, 24, "Starter"],
  ["Bigs", "Imani", 14, 6, 27, "Starter"],
  ["Bigs", "Theo", 11, 4, 20, "Bench"],
  ["Bigs", "June", 8, 3, 13, "Bench"],
].map(([position, player, impact, effort, minutes, role], index) => ({
  id: `player-${index}`,
  position,
  player,
  impact,
  effort,
  minutes,
  role,
  usage: 11 + impact * 0.9,
  efficiency: 88 + impact * 1.9 - effort * 0.55,
  assists: position === "Guards" ? 2 + effort * 0.8 : 1 + effort * 0.35,
  rebounds: position === "Bigs" ? 3 + impact * 0.55 : 2 + impact * 0.22,
}))

const LINEUP_MIX = [
  [1, 38, 35, 27],
  [2, 34, 37, 29],
  [3, 31, 39, 30],
  [4, 36, 38, 26],
  [5, 29, 41, 30],
  [6, 27, 42, 31],
  [7, 32, 40, 28],
  [8, 25, 44, 31],
  [9, 23, 45, 32],
  [10, 21, 46, 33],
  [11, 24, 43, 33],
  [12, 20, 47, 33],
].flatMap(([game, starters, bridge, bench]) => [
  { game, unit: "Starters", share: starters },
  { game, unit: "Bridge", share: bridge },
  { game, unit: "Bench", share: bench },
])

const DUAL_AXIS = [
  [1, 96, 7.2],
  [2, 99, 6.8],
  [3, 101, 7.8],
  [4, 98, 8.4],
  [5, 103, 8.1],
  [6, 105, 9.2],
  [7, 102, 8.7],
  [8, 107, 9.6],
  [9, 109, 9.1],
  [10, 108, 10.2],
  [11, 111, 10.6],
  [12, 113, 11.1],
].map(([game, pace, threes]) => ({ game, pace, threes }))

const GAME_RANGES = [
  [1, 101, 108, 94, 105],
  [2, 105, 112, 99, 103],
  [3, 103, 115, 101, 111],
  [4, 111, 114, 100, 104],
  [5, 104, 119, 102, 116],
  [6, 116, 121, 107, 109],
  [7, 109, 117, 103, 114],
  [8, 114, 123, 110, 121],
  [9, 121, 124, 111, 116],
  [10, 116, 126, 113, 123],
  [11, 123, 128, 115, 119],
  [12, 119, 132, 118, 129],
].map(([game, open, high, low, close]) => ({ game, open, high, low, close }))

const PRACTICE_LANES = [
  ["Court", "Warm-up", 18],
  ["Court", "Half-court", 42],
  ["Court", "Scrimmage", 36],
  ["Film", "Opponent", 24],
  ["Film", "Self scout", 31],
  ["Weight room", "Strength", 28],
  ["Weight room", "Mobility", 17],
  ["Recovery", "Treatment", 22],
  ["Recovery", "Nutrition", 14],
]
.map(([lane, drill, minutes]) => ({ lane, drill, minutes }))

const SEASON_DETAIL = Array.from({ length: 32 }, (_, index) => {
  const game = index + 1
  return {
    game,
    rating: 99 + game * 0.42 + Math.sin(game * 0.8) * 4.2 + (game > 20 ? 2.5 : 0),
  }
})

const SYSTEM_TREE = {
  name: "Rookie City",
  children: [
    {
      name: "Creation",
      children: [{ name: "Maya" }, { name: "Leo" }, { name: "Nia" }],
    },
    {
      name: "Finishing",
      children: [{ name: "Zuri" }, { name: "Aiko" }, { name: "Omar" }],
    },
    {
      name: "Coverage",
      children: [{ name: "Imani" }, { name: "Theo" }, { name: "Bea" }],
    },
  ],
}

const PROCESS_NODES = [
  { id: "Inbound", group: "Start", xExtent: ["2026-01-01", "2026-01-12"] },
  { id: "Early offense", group: "Phase" },
  { id: "Half court", group: "Phase" },
  { id: "Advantage", group: "Action" },
  { id: "Reset", group: "Action" },
  { id: "Shot", group: "Result", xExtent: ["2026-03-12", "2026-04-02"] },
]
const PROCESS_EDGES = [
  ["in-early", "Inbound", "Early offense", 36, "2026-01-08", "2026-01-26"],
  ["in-half", "Inbound", "Half court", 64, "2026-01-10", "2026-02-02"],
  ["early-adv", "Early offense", "Advantage", 31, "2026-02-02", "2026-02-18"],
  ["early-reset", "Early offense", "Reset", 5, "2026-02-03", "2026-02-21"],
  ["half-adv", "Half court", "Advantage", 39, "2026-02-09", "2026-03-01"],
  ["half-reset", "Half court", "Reset", 25, "2026-02-11", "2026-03-04"],
  ["adv-shot", "Advantage", "Shot", 70, "2026-03-08", "2026-03-25"],
  ["reset-shot", "Reset", "Shot", 30, "2026-03-10", "2026-03-29"],
].map(([id, source, target, value, startTime, endTime]) => ({
  id,
  source,
  target,
  value,
  startTime,
  endTime,
}))

const CHAPTER_STATS = {
  "last-roster": { scan: 82, exact: 57, change: 79, shape: 93, story: 98 },
  share: { scan: 95, exact: 48, change: 18, shape: 91, story: 88 },
  verdict: { scan: 94, exact: 74, change: 35, shape: 72, story: 96 },
  population: { scan: 77, exact: 61, change: 24, shape: 100, story: 84 },
  diagnosis: { scan: 69, exact: 71, change: 36, shape: 97, story: 91 },
  "layered-time": { scan: 74, exact: 66, change: 100, shape: 86, story: 94 },
  navigation: { scan: 91, exact: 82, change: 96, shape: 78, story: 88 },
  systems: { scan: 65, exact: 43, change: 93, shape: 100, story: 97 },
}

export default function DataVizForDummiesFourExamplePage() {
  const [docsTheme] = useDocsTheme()
  const chartTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  const [shareChart, setShareChart] = useState("pie")
  const [verdictChart, setVerdictChart] = useState("gauge")
  const [populationChart, setPopulationChart] = useState("swarm")
  const [diagnosisChart, setDiagnosisChart] = useState("quadrant")
  const [timeChart, setTimeChart] = useState("stacked")
  const [navigationChart, setNavigationChart] = useState("swimlane")
  const [systemChart, setSystemChart] = useState("orbit")
  const [pageWidth, pageRef] = useResponsiveWidth(300, 1120)
  const chartWidth =
    pageWidth < 780 ? Math.max(280, pageWidth - 28) : Math.min(710, pageWidth - 350)
  const compact = pageWidth < 780
  const radialSize = Math.min(chartWidth, compact ? 360 : 470)
  const matrixCell = Math.max(86, Math.min(148, Math.floor((chartWidth - 18) / 3)))

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
    <ExamplePageLayout title="Data Viz for Dummies IV">
      <div className="dvd dvd--fourth" ref={pageRef}>
        <header className="dvd-hero">
          <div className="dvd-hero__copy">
            <p className="dvd-kicker">Special teams · complete the core chart roster</p>
            <h2>The last charts are not obscure. They are specific.</h2>
            <p className="dvd-hero__lede">
              Parts I through III covered the reliable starters and their sharpest substitutes.
              Part IV finishes the core Semiotic roster: fifteen charts whose value appears when
              the question includes a whole, a threshold, a third variable, a long timeline, or a
              system moving through time.
            </p>
            <div className="dvd-hero__chips" aria-label="Guide promises">
              <span>15 remaining charts</span>
              <span>7 decision boundaries</span>
              <span>1 complete roster</span>
            </div>
          </div>
          <div className="dvd-card dvd-card--hero" aria-label="Fourth chart selection scouting card">
            <div className="dvd-card__topline">
              <span>VIZ 404</span>
              <span>RC · 2026</span>
            </div>
            <strong className="dvd-card__number">04</strong>
            <div className="dvd-card__name">SPECIAL TEAMS</div>
            <div className="dvd-card__position">Specific question · specific geometry</div>
            <div className="dvd-card__stats">
              <MiniStat label="Range" value="100" />
              <MiniStat label="Fit" value="99" />
              <MiniStat label="Depth" value="96" />
              <MiniStat label="Filler" value="00" />
            </div>
          </div>
        </header>

        <nav className="dvd-nav" aria-label="Fourth data visualization guide sections">
          <span className="dvd-nav__brand" aria-hidden="true">THE PLAYBOOK</span>
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
              id="last-roster"
              number="00"
              eyebrow="Completion board · fifteen charts, seven jobs"
              title="Specialists make sense when the question arrives before the chart."
              lead="The remaining roster is easiest to remember in rotations, not alphabetically. Each group protects one kind of structure: a whole, a judgment scale, a population, a multivariate decision, layered time, navigation, or a moving system."
              avoid="Do not treat this page as permission to use the most elaborate available chart. Specific charts have narrow winning conditions—and unusually clear reasons to stay seated."
              stats={CHAPTER_STATS["last-roster"]}
            >
              <ChartPanel
                eyebrow="The final rotation board"
                title="Every remaining chart has a sentence it is waiting to finish"
                note="Start with the question in the third column. The chart names are the answer only after that sentence is true."
                feature="Group components by analytical contract"
                featureCopy="Semiotic’s named components make intent visible in code: the component name documents the question while shared props keep the implementation familiar."
              >
                <div className="dvd4-roster" role="list">
                  {ROTATIONS.map((rotation, index) => (
                    <article key={rotation.unit} role="listitem">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <small>{rotation.unit}</small>
                        <h4>{rotation.charts}</h4>
                      </div>
                      <p>{rotation.question}</p>
                      <em>{rotation.warning}</em>
                    </article>
                  ))}
                </div>
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="share"
              number="01"
              eyebrow="Pie + donut · one whole, few parts"
              title="A circle earns the ball when the whole is the headline."
              lead="Pie and donut charts trade precise ranking for immediate part-to-whole recognition. Pie gives the wedges maximum area; donut opens a center for a total, status, or annotation. Both need a short category list and a meaningful total."
              avoid="Never use several pies when the real task is comparison across groups. Aligned bars will expose differences that rotating angles conceal."
              stats={CHAPTER_STATS.share}
            >
              <ChartPanel
                eyebrow="Shot diet · 260 attempts"
                title={shareChart === "pie" ? "Pie: let wedges own the stage" : "Donut: reserve the center for the whole"}
                note="The same five-category total changes form without changing its claim. Toggle to see what the center space costs and buys."
                feature="Use centerContent only when it adds information"
                featureCopy="DonutChart can place the total inside the ring. If the center merely repeats the title, PieChart gives the data more room."
              >
                <ChartToggle
                  label="Choose a part-to-whole chart"
                  value={shareChart}
                  onChange={setShareChart}
                  options={[["pie", "Pie"], ["donut", "Donut"]]}
                />
                {shareChart === "pie" ? (
                  <PieChart
                    data={SHOT_SHARE}
                    categoryAccessor="zone"
                    valueAccessor="attempts"
                    colorScheme={PALETTE}
                    width={radialSize}
                    height={radialSize}
                    margin={{ top: 18, right: compact ? 18 : 118, bottom: 18, left: 18 }}
                    showLegend={!compact}
                    title="Rookie City shot-attempt share"
                    description="A pie chart divides 260 fictional attempts among five shot zones."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                ) : (
                  <DonutChart
                    data={SHOT_SHARE}
                    categoryAccessor="zone"
                    valueAccessor="attempts"
                    colorScheme={PALETTE}
                    innerRadius={radialSize * 0.19}
                    centerContent={<span className="dvd4-center-total"><strong>260</strong> attempts</span>}
                    width={radialSize}
                    height={radialSize}
                    margin={{ top: 18, right: compact ? 18 : 118, bottom: 18, left: 18 }}
                    showLegend={!compact}
                    title="Rookie City shot-attempt share"
                    description="A donut chart divides 260 fictional attempts among five shot zones and shows the total in its center."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                )}
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="verdict"
              number="02"
              eyebrow="Gauge + Likert · judgment made visible"
              title="A value becomes a verdict only after the standard enters the picture."
              lead="A gauge locates one current value inside named performance zones. A Likert chart aggregates ordered responses around a neutral center. One summarizes status; the other preserves disagreement."
              avoid="A gauge without a consequential threshold is decorative speedometer chrome. A Likert chart without ordered, balanced response levels is just a badly labeled stacked bar."
              stats={CHAPTER_STATS.verdict}
            >
              <ChartPanel
                eyebrow="Season pulse · operational status + fan sentiment"
                title={verdictChart === "gauge" ? "Gauge: one number crosses a standard" : "Likert: consensus and dissent share the floor"}
                note="The gauge compresses the current call to 74. The Likert view expands four claims into the distribution of opinion behind them."
                feature="Name thresholds and preserve neutral responses"
                featureCopy="GaugeChart accepts labeled threshold zones; LikertChart derives polarity from the ordered levels array and handles the neutral category explicitly."
              >
                <ChartToggle
                  label="Choose a verdict chart"
                  value={verdictChart}
                  onChange={setVerdictChart}
                  options={[["gauge", "Gauge"], ["likert", "Likert"]]}
                />
                {verdictChart === "gauge" ? (
                  <GaugeChart
                    value={74}
                    min={0}
                    max={100}
                    thresholds={[
                      { value: 55, color: CORAL, label: "Reset" },
                      { value: 75, color: GOLD, label: "Compete" },
                      { value: 100, color: MINT, label: "Contend" },
                    ]}
                    valueFormat={(value) => `${value} / 100`}
                    width={chartWidth}
                    height={370}
                    title="Rookie City season pulse"
                    description="A gauge places the team's fictional season pulse of 74 between reset, compete, and contend thresholds."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                ) : (
                  <LikertChart
                    data={FAN_SURVEY}
                    categoryAccessor="question"
                    levelAccessor="level"
                    countAccessor="count"
                    levels={SURVEY_LEVELS}
                    colorScheme={[CORAL, "#f3a38f", "#c8c8c8", CYAN, BLUE]}
                    width={chartWidth}
                    height={430}
                    margin={{ top: 28, right: 24, bottom: 72, left: compact ? 96 : 156 }}
                    showLegend
                    legendPosition="bottom"
                    title="Fan pulse survey"
                    description="A diverging Likert chart shows agreement and disagreement with four fictional statements about Rookie City."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                )}
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="population"
              number="03"
              eyebrow="Swarm + bubble · every body counts"
              title="Show every observation, then decide whether size deserves a voice."
              lead="A swarm exposes individual values while packing overlaps aside. A bubble chart moves observations onto two quantitative axes and gives a third measure to area. The first protects the crowd; the second promotes multivariate magnitude."
              avoid="Bubble area is not a precision channel, and swarm packing is not a second measurement. Treat both as readable displacement, never as a hidden axis."
              stats={CHAPTER_STATS.population}
            >
              <ChartPanel
                eyebrow="Rotation workload · players remain identifiable"
                title={populationChart === "swarm" ? "Swarm: the distribution keeps every player" : "Bubble: minutes become a third dimension"}
                note="The swarm compares impact inside position groups. The bubble view asks whether usage and efficiency justify each player’s minutes."
                feature="Use color and size for different questions"
                featureCopy="SwarmPlot can encode a group without losing individual values. BubbleChart adds sizeBy, but the tooltip should recover exact magnitude."
              >
                <ChartToggle
                  label="Choose a population chart"
                  value={populationChart}
                  onChange={setPopulationChart}
                  options={[["swarm", "Swarm"], ["bubble", "Bubble"]]}
                />
                {populationChart === "swarm" ? (
                  <SwarmPlot
                    data={PLAYER_SAMPLES}
                    categoryAccessor="position"
                    valueAccessor="impact"
                    colorBy="role"
                    colorScheme={{ Starter: GOLD, Bench: CYAN }}
                    orientation="vertical"
                    pointRadius={8}
                    valueExtent={[0, 20]}
                    width={chartWidth}
                    height={420}
                    margin={{ top: 26, right: 106, bottom: 62, left: 48 }}
                    showGrid
                    showLegend
                    title="Player impact by position group"
                    description="A swarm plot shows twelve fictional players' impact ratings, grouped by position and colored by role."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                ) : (
                  <BubbleChart
                    data={PLAYER_SAMPLES}
                    xAccessor="usage"
                    yAccessor="efficiency"
                    sizeBy="minutes"
                    sizeRange={[7, 24]}
                    colorBy="position"
                    colorScheme={[GOLD, CYAN, VIOLET]}
                    xExtent={[18, 30]}
                    yExtent={[108, 122]}
                    width={chartWidth}
                    height={420}
                    margin={{ top: 26, right: 112, bottom: 58, left: 58 }}
                    showGrid
                    showLegend
                    title="Usage, efficiency, and minutes"
                    description="A bubble chart compares player usage and efficiency, with bubble area representing minutes."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                )}
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="diagnosis"
              number="04"
              eyebrow="Quadrant + scatterplot matrix · multivariate film room"
              title="One view makes a decision; the other searches for the reason."
              lead="Quadrants impose meaningful cut lines on two measures and name the resulting actions. A scatterplot matrix compares every pair in a small metric set to expose correlations, clusters, and redundant variables."
              avoid="Quadrant lines are policy, not natural law. Matrix cells multiply quickly, so three or four purposeful fields beat a wall of tiny plots."
              stats={CHAPTER_STATS.diagnosis}
            >
              <ChartPanel
                eyebrow="Player development · decision view + diagnostic view"
                title={diagnosisChart === "quadrant" ? "Quadrant: thresholds turn position into action" : "Matrix: pairwise evidence tests the story"}
                note="The quadrant asks who needs investment now. The matrix checks whether impact, usage, assists, and rebounds move together across roles."
                feature="Separate decision thresholds from exploratory structure"
                featureCopy="QuadrantChart labels policy regions directly. ScatterplotMatrix coordinates hover across cells so the same player stays traceable."
              >
                <ChartToggle
                  label="Choose a diagnostic chart"
                  value={diagnosisChart}
                  onChange={setDiagnosisChart}
                  options={[["quadrant", "Quadrant"], ["matrix", "Scatter matrix"]]}
                />
                {diagnosisChart === "quadrant" ? (
                  <QuadrantChart
                    data={PLAYER_SAMPLES}
                    xAccessor="impact"
                    yAccessor="effort"
                    xCenter={12}
                    yCenter={6}
                    quadrants={{
                      topRight: { label: "Build around", color: MINT },
                      topLeft: { label: "Develop", color: GOLD },
                      bottomRight: { label: "Protect", color: CYAN },
                      bottomLeft: { label: "Reassess", color: CORAL },
                    }}
                    colorBy="position"
                    colorScheme={[GOLD, CYAN, VIOLET]}
                    pointIdAccessor="id"
                    pointRadius={7}
                    width={chartWidth}
                    height={430}
                    margin={{ top: 28, right: 114, bottom: 58, left: 52 }}
                    showGrid
                    showLegend
                    title="Player impact and effort decision matrix"
                    description="A quadrant chart divides twelve players into build-around, develop, protect, and reassess regions."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                ) : (
                  <ScatterplotMatrix
                    data={PLAYER_SAMPLES}
                    fields={["impact", "assists", "rebounds"]}
                    fieldLabels={{ impact: "Impact", assists: "Assists", rebounds: "Rebounds" }}
                    colorBy="position"
                    colorScheme={[GOLD, CYAN, VIOLET]}
                    cellSize={matrixCell}
                    cellGap={5}
                    pointRadius={4}
                    diagonal="histogram"
                    brushMode={false}
                    hoverMode
                    showLegend={!compact}
                    title="Player metric scatterplot matrix"
                    description="A three-by-three scatterplot matrix compares impact, assists, and rebounds for twelve fictional players."
                    tooltip
                  />
                )}
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="layered-time"
              number="05"
              eyebrow="Stacked area + multi-axis + candlestick · time with extra structure"
              title="The time axis stays familiar while the analytical grammar changes."
              lead="Stacked area tracks a changing total and its composition. Multi-axis lines compare two differently scaled measures that share timing. Candlesticks preserve open, high, low, and close—or simply a range—inside every period."
              avoid="Composition, dual scale, and interval are three different claims. Do not choose among them by silhouette; choose by the structure each observation actually contains."
              stats={CHAPTER_STATS["layered-time"]}
            >
              <ChartPanel
                eyebrow="Twelve games · three temporal contracts"
                title={{
                  stacked: "Stacked area: composition changes with the season",
                  multi: "Multi-axis: timing aligns, units remain separate",
                  candle: "Candlestick: every game contains a range and direction",
                }[timeChart]}
                note={{
                  stacked: "Rotation share totals 100% in every game while the bridge unit expands.",
                  multi: "Pace and made threes rise together, but their axes preserve different units.",
                  candle: "Open and close show scoring direction; the wick keeps the full expected range.",
                }[timeChart]}
                feature="Match the component to the observation schema"
                featureCopy="Named accessors—areaBy, per-series yAccessor, and OHLC fields—make the temporal claim explicit and auditable."
              >
                <ChartToggle
                  label="Choose a layered time chart"
                  value={timeChart}
                  onChange={setTimeChart}
                  options={[["stacked", "Stacked area"], ["multi", "Multi-axis"], ["candle", "Candlestick"]]}
                />
                {timeChart === "stacked" && (
                  <StackedAreaChart
                    data={LINEUP_MIX}
                    xAccessor="game"
                    yAccessor="share"
                    areaBy="unit"
                    colorBy="unit"
                    colorScheme={[GOLD, CYAN, VIOLET]}
                    xExtent={[1, 12]}
                    yExtent={[0, 100]}
                    width={chartWidth}
                    height={420}
                    margin={{ top: 28, right: 112, bottom: 58, left: 52 }}
                    showGrid
                    showLegend
                    title="Lineup share across twelve games"
                    description="A stacked area chart shows starters, bridge lineups, and bench lineups composing 100 percent of minutes in each game."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                )}
                {timeChart === "multi" && (
                  <MultiAxisLineChart
                    data={DUAL_AXIS}
                    xAccessor="game"
                    series={[
                      { yAccessor: "pace", label: "Pace", color: CYAN, extent: [94, 115] },
                      { yAccessor: "threes", label: "Made threes", color: GOLD, extent: [6, 12] },
                    ]}
                    width={chartWidth}
                    height={420}
                    margin={{ top: 28, right: 58, bottom: 62, left: 58 }}
                    showGrid
                    showLegend
                    legendPosition="bottom"
                    title="Pace and made threes"
                    description="A dual-axis line chart compares pace and made three-pointers across twelve fictional games."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                )}
                {timeChart === "candle" && (
                  <CandlestickChart
                    data={GAME_RANGES}
                    xAccessor="game"
                    openAccessor="open"
                    highAccessor="high"
                    lowAccessor="low"
                    closeAccessor="close"
                    candlestickStyle={{ upColor: MINT, downColor: CORAL, bodyWidth: 10 }}
                    xExtent={[0, 13]}
                    yExtent={[90, 135]}
                    width={chartWidth}
                    height={420}
                    margin={{ top: 28, right: 28, bottom: 58, left: 52 }}
                    showGrid
                    title="Game scoring outlook ranges"
                    description="A candlestick chart shows opening forecast, high, low, and closing forecast for twelve games."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                )}
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="navigation"
              number="06"
              eyebrow="Swimlane + minimap · overview guides attention"
              title="When time gets crowded or long, give the reader somewhere to stand."
              lead="Swimlanes organize events or tasks into stable rows so overlap becomes schedule. A minimap compresses a long series into an overview and lets a brush choose the detail window. One separates concurrent work; the other preserves long-range context."
              avoid="A swimlane is not a duration chart unless the value truly represents duration. A minimap is wasted space when the entire series is already legible at once."
              stats={CHAPTER_STATS.navigation}
            >
              <ChartPanel
                eyebrow="Practice plan + season detail"
                title={navigationChart === "swimlane" ? "Swimlane: stable rows untangle concurrent work" : "Minimap: the overview controls the close-up"}
                note={navigationChart === "swimlane" ? "Training blocks remain grouped by place while drill length stays comparable." : "Brush the overview to inspect part of a 32-game rating history without losing the season arc."}
                feature="Let overview and detail share the same data"
                featureCopy="MinimapChart renders one series twice and exposes the brush extent. SwimlaneChart keeps lane and task accessors separate."
              >
                <ChartToggle
                  label="Choose a navigation chart"
                  value={navigationChart}
                  onChange={setNavigationChart}
                  options={[["swimlane", "Swimlane"], ["minimap", "Minimap"]]}
                />
                {navigationChart === "swimlane" ? (
                  <SwimlaneChart
                    data={PRACTICE_LANES}
                    categoryAccessor="lane"
                    subcategoryAccessor="drill"
                    valueAccessor="minutes"
                    colorBy="drill"
                    colorScheme={PALETTE}
                    orientation="horizontal"
                    width={chartWidth}
                    height={410}
                    margin={{ top: 26, right: 132, bottom: 58, left: 82 }}
                    showGrid
                    showLegend
                    title="Practice plan by facility lane"
                    description="A swimlane chart groups nine practice blocks by court, film room, weight room, and recovery."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                ) : (
                  <MinimapChart
                    data={SEASON_DETAIL}
                    xAccessor="game"
                    yAccessor="rating"
                    brushExtent={[9, 21]}
                    minimap={{ height: 82, showAxes: false, background: "transparent" }}
                    showPoints
                    pointRadius={3}
                    fillArea
                    areaOpacity={0.18}
                    colorScheme={[CYAN]}
                    yExtent={[94, 118]}
                    width={chartWidth}
                    height={460}
                    margin={{ top: 28, right: 24, bottom: 48, left: 52 }}
                    showGrid
                    title="Season rating with overview minimap"
                    description="A line chart details games nine through twenty-one while a brushable minimap preserves the full 32-game season."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                )}
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="systems"
              number="07"
              eyebrow="Orbit + process Sankey · systems need verbs"
              title="A system can revolve around relationships or move through timed states."
              lead="Orbit diagrams turn hierarchy into a center-and-satellite metaphor, emphasizing levels and affiliation. Process Sankey adds real time to flow: nodes become lanes with lifetimes and ribbons travel between them at dated intervals."
              avoid="Orbit motion is not evidence of measured motion. Process Sankey needs actual start and end times; without temporal events, an ordinary Sankey is the honest choice."
              stats={CHAPTER_STATS.systems}
            >
              <ChartPanel
                eyebrow="Team system · relational model + temporal model"
                title={systemChart === "orbit" ? "Orbit: roles circle the shared system" : "Process Sankey: possession moves through dated phases"}
                note={systemChart === "orbit" ? "The static orbit stresses affiliation and depth without pretending the players literally revolve." : "Timed ribbons show when possession mass transfers between phases, including a cycle-safe reset."}
                feature="Choose the network layout from the system’s verb"
                featureCopy="OrbitDiagram encodes nested affiliation; ProcessSankey requires temporal accessors and permits cycles when every transfer still moves forward in time."
              >
                <ChartToggle
                  label="Choose a systems chart"
                  value={systemChart}
                  onChange={setSystemChart}
                  options={[["orbit", "Orbit"], ["process", "Process Sankey"]]}
                />
                {systemChart === "orbit" ? (
                  <OrbitDiagram
                    data={SYSTEM_TREE}
                    childrenAccessor="children"
                    nodeIdAccessor="name"
                    orbitMode="flat"
                    colorByDepth
                    colorScheme={PALETTE}
                    animated={false}
                    showLabels={!compact}
                    nodeRadius={(node) => node.depth === 0 ? 13 : node.data?.children ? 9 : 6}
                    width={radialSize}
                    height={radialSize}
                    title="Rookie City role orbit"
                    description="An orbit diagram places creation, finishing, and coverage groups around the team, with players orbiting each group."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                ) : (
                  <ProcessSankey
                    nodes={PROCESS_NODES}
                    edges={PROCESS_EDGES}
                    domain={["2026-01-01", "2026-04-05"]}
                    axisTicks={[
                      { date: "2026-01-01", label: "Inbound" },
                      { date: "2026-02-01", label: "Organize" },
                      { date: "2026-03-01", label: "Create" },
                      { date: "2026-04-01", label: "Finish" },
                    ]}
                    colorBy="group"
                    colorScheme={PALETTE}
                    width={chartWidth}
                    height={470}
                    margin={{ top: 30, right: compact ? 28 : 112, bottom: 52, left: 34 }}
                    showLegend={!compact}
                    showLabels
                    showLaneRails
                    edgeOpacity={0.64}
                    title="Timed possession process"
                    description="A process Sankey follows one hundred fictional possessions through dated offensive phases to a shot."
                    tooltip
                    frameProps={{ background: "transparent" }}
                  />
                )}
              </ChartPanel>
            </GuideChapter>
          </div>
        </ThemeProvider>

        <section id="final-whistle" className="dvd-overtime">
          <div className="dvd-overtime__head">
            <p className="dvd-kicker">Final whistle · the complete roster</p>
            <h2>The rare chart is ordinary when its question is precise.</h2>
            <p>
              Parts I–IV now cover every named core XY, ordinal, and network chart in Semiotic.
              Keep the question, data contract, and reading cost on the same scouting report.
            </p>
          </div>
          <div className="dvd-decisions">
            <Decision verb="Divide one whole" chart="Pie or donut" note="Few parts; one meaningful total." />
            <Decision verb="Judge against a standard" chart="Gauge or Likert" note="Status for one value; sentiment for a crowd." />
            <Decision verb="Keep individuals visible" chart="Swarm or bubble" note="Use size only when the third measure matters." />
            <Decision verb="Act on several measures" chart="Quadrant or matrix" note="Decide with thresholds; diagnose pairwise." />
            <Decision verb="Add structure to time" chart="Area, multi-axis, candle" note="Composition, separate scale, or interval." />
            <Decision verb="Navigate dense time" chart="Swimlane or minimap" note="Separate concurrency or brush long context." />
            <Decision verb="Explain a moving system" chart="Orbit or process Sankey" note="Affiliation is not temporal flow." />
            <Decision verb="The contract is unclear" chart="Return to the question" note="Specificity is the entry fee." />
          </div>
          <blockquote>
            Completion does not mean using every chart. It means knowing why every chart might earn
            its one perfect possession.
          </blockquote>
          <div className="dvd-final-rule">
            <span>THE FOURTH RULE</span>
            <strong>Name the structure that makes the specialist necessary.</strong>
          </div>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function ChartToggle({ label, value, onChange, options }) {
  return (
    <div className="dvd-segmented dvd4-toggle" aria-label={label}>
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          className={value === id ? "is-active" : ""}
          onClick={() => onChange(id)}
          aria-pressed={value === id}
        >
          {text}
        </button>
      ))}
    </div>
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
            Object.values(stats).reduce((sum, value) => sum + value, 0) /
              Object.keys(stats).length,
          )}
        </small>
      </div>
      {Object.entries(stats).map(([label, value]) => (
        <div className="dvd-scout__row" key={label}>
          <span>{label}</span>
          <div><i style={{ width: `${value}%` }} /></div>
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
