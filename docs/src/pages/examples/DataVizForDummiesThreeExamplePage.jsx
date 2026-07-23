import React, { useEffect, useState } from "react"
import {
  CirclePack,
  ConnectedScatterplot,
  DifferenceChart,
  DotPlot,
  RidgelinePlot,
  ThemeProvider,
  TreeDiagram,
  ViolinPlot,
} from "semiotic"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./DataVizForDummiesExamplePage.css"
import "./DataVizForDummiesThreeExamplePage.css"

const INK = "#18211b"
const PAPER = "#f5f0df"
const GOLD = "#ffd166"
const CYAN = "#63d8ff"
const CORAL = "#ff6f61"
const BLUE = "#5b8def"
const VIOLET = "#a77bea"
const MINT = "#76e5c2"
const PALETTE = [GOLD, CYAN, CORAL, BLUE, VIOLET, MINT]

const SECTIONS = [
  { id: "matchup-lab", short: "Lab", label: "The matchup lab" },
  { id: "light-ranking", short: "Dot", label: "Light ranking" },
  { id: "full-shape", short: "Violin", label: "Full shape" },
  { id: "many-shapes", short: "Ridges", label: "Many shapes" },
  { id: "the-gap", short: "Gap", label: "The gap" },
  { id: "trajectory", short: "Path", label: "Trajectory" },
  { id: "ancestry", short: "Tree", label: "Ancestry" },
  { id: "nested-scale", short: "Pack", label: "Nested scale" },
  { id: "postgame", short: "Review", label: "Decision rules" },
]

const MATCHUPS = [
  {
    challenger: "Dot plot",
    starter: "Bar chart",
    call: "when the baseline can whisper",
    cost: "magnitude is less immediate",
  },
  {
    challenger: "Violin plot",
    starter: "Box plot",
    call: "when distribution shape matters",
    cost: "density is estimated, not observed",
  },
  {
    challenger: "Ridgeline plot",
    starter: "Heatmap",
    call: "when many shapes need silhouettes",
    cost: "overlap complicates exact comparison",
  },
  {
    challenger: "Difference chart",
    starter: "Line chart",
    call: "when the gap is the protagonist",
    cost: "each series becomes supporting context",
  },
  {
    challenger: "Connected scatter",
    starter: "Scatterplot",
    call: "when sequence explains the relationship",
    cost: "crossing paths can become knotty",
  },
  {
    challenger: "Tree diagram",
    starter: "Treemap",
    call: "when ancestry matters more than size",
    cost: "the layout consumes more room",
  },
  {
    challenger: "Circle pack",
    starter: "Treemap",
    call: "when nested scale needs visible containers",
    cost: "circles waste space and resist precision",
  },
]

const LINEUP_RATINGS = [
  { lineup: "Tempo five", rating: 12.4, unit: "Small" },
  { lineup: "Switch crew", rating: 9.1, unit: "Defense" },
  { lineup: "Twin towers", rating: 6.8, unit: "Big" },
  { lineup: "Bench spark", rating: 3.6, unit: "Bench" },
  { lineup: "Closing five", rating: 11.2, unit: "Core" },
  { lineup: "Rookie run", rating: -2.3, unit: "Bench" },
  { lineup: "Press break", rating: 5.2, unit: "Core" },
]

const RELEASE_DISTRIBUTIONS = {
  "Catch + shoot": [
    0.34, 0.36, 0.37, 0.39, 0.4, 0.41, 0.42, 0.43, 0.44, 0.44, 0.45, 0.46, 0.46, 0.47, 0.48, 0.48,
    0.49, 0.5, 0.51, 0.52, 0.54, 0.56, 0.58, 0.61,
  ],
  "Pull-up": [
    0.46, 0.5, 0.52, 0.54, 0.56, 0.58, 0.59, 0.6, 0.61, 0.63, 0.65, 0.66, 0.68, 0.69, 0.7, 0.72,
    0.74, 0.75, 0.77, 0.79, 0.82, 0.85, 0.88, 0.94,
  ],
  "At rim": [
    0.18, 0.2, 0.21, 0.22, 0.23, 0.24, 0.25, 0.25, 0.26, 0.27, 0.28, 0.29, 0.3, 0.31, 0.32, 0.33,
    0.34, 0.35, 0.36, 0.38, 0.39, 0.41, 0.44, 0.48,
  ],
}
const RELEASE_TIMES = Object.entries(RELEASE_DISTRIBUTIONS).flatMap(([shot, values]) =>
  values.map((seconds, index) => ({ id: `${shot}-${index}`, shot, seconds })),
)

const QUARTER_DISTANCES = {
  Q1: [1, 2, 3, 4, 4, 5, 6, 7, 8, 11, 14, 17, 20, 22, 23, 24, 25, 25, 26, 27, 28],
  Q2: [0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 8, 12, 18, 21, 22, 23, 24, 25, 26, 27, 29],
  Q3: [1, 2, 3, 4, 5, 7, 10, 14, 18, 20, 21, 22, 23, 24, 24, 25, 26, 27, 28, 29, 30],
  Q4: [0, 1, 2, 3, 3, 4, 5, 6, 9, 13, 17, 20, 22, 23, 24, 25, 26, 27, 28, 29, 31],
  OT: [1, 2, 3, 4, 5, 6, 8, 12, 16, 19, 21, 22, 23, 24, 25, 26, 27, 28, 30, 31, 32],
}
const SHOT_DISTANCES = Object.entries(QUARTER_DISTANCES).flatMap(([period, values]) =>
  values.map((feet, index) => ({ id: `${period}-${index}`, period, feet })),
)

const SCORE_EXPECTATION = [
  [1, 104, 101],
  [2, 99, 103],
  [3, 108, 105],
  [4, 102, 106],
  [5, 111, 107],
  [6, 114, 108],
  [7, 106, 109],
  [8, 112, 110],
  [9, 109, 111],
  [10, 118, 112],
  [11, 113, 114],
  [12, 121, 115],
].map(([game, actual, expected]) => ({ game, actual, expected }))

const GAME_TRAJECTORY = [
  [1, 94, 101],
  [2, 97, 99],
  [3, 96, 106],
  [4, 100, 103],
  [5, 102, 109],
  [6, 99, 113],
  [7, 103, 105],
  [8, 101, 111],
  [9, 105, 108],
  [10, 104, 116],
  [11, 102, 112],
  [12, 106, 119],
].map(([game, pace, offense]) => ({ id: `game-${game}`, game, pace, offense }))

const PLAY_CALL_TREE = {
  name: "Rookie City offense",
  children: [
    {
      name: "Early clock",
      children: [{ name: "Drag screen" }, { name: "Wide pin" }, { name: "Rim run" }],
    },
    {
      name: "Half court",
      children: [
        {
          name: "Horns",
          children: [{ name: "Dive" }, { name: "Flare" }],
        },
        {
          name: "Five-out",
          children: [{ name: "Back cut" }, { name: "Ghost" }],
        },
      ],
    },
    {
      name: "Late clock",
      children: [{ name: "Maya iso" }, { name: "Leo pick" }, { name: "Zuri post" }],
    },
  ],
}

const ROSTER_MINUTES = {
  name: "240 minutes",
  children: [
    {
      name: "Guards",
      family: "Guards",
      children: [
        { name: "Maya", value: 34, family: "Guards" },
        { name: "Leo", value: 36, family: "Guards" },
        { name: "Nia", value: 18, family: "Guards" },
      ],
    },
    {
      name: "Wings",
      family: "Wings",
      children: [
        { name: "Zuri", value: 31, family: "Wings" },
        { name: "Aiko", value: 29, family: "Wings" },
        { name: "Bea", value: 21, family: "Wings" },
      ],
    },
    {
      name: "Bigs",
      family: "Bigs",
      children: [
        { name: "Omar", value: 24, family: "Bigs" },
        { name: "Imani", value: 27, family: "Bigs" },
        { name: "Theo", value: 20, family: "Bigs" },
      ],
    },
  ],
}

const CHAPTER_STATS = {
  "matchup-lab": { scan: 78, exact: 66, change: 72, shape: 91, story: 95 },
  "light-ranking": { scan: 93, exact: 91, change: 31, shape: 56, story: 69 },
  "full-shape": { scan: 68, exact: 54, change: 26, shape: 100, story: 83 },
  "many-shapes": { scan: 82, exact: 47, change: 63, shape: 99, story: 90 },
  "the-gap": { scan: 86, exact: 72, change: 98, shape: 88, story: 96 },
  trajectory: { scan: 62, exact: 69, change: 94, shape: 92, story: 99 },
  ancestry: { scan: 81, exact: 51, change: 25, shape: 96, story: 91 },
  "nested-scale": { scan: 76, exact: 43, change: 22, shape: 97, story: 88 },
}

export default function DataVizForDummiesThreeExamplePage() {
  const [docsTheme] = useDocsTheme()
  const chartTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"
  const [matchupMode, setMatchupMode] = useState("call")
  const [treeOrientation, setTreeOrientation] = useState("horizontal")
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id)
  const [pageWidth, pageRef] = useResponsiveWidth(300, 1120)
  const chartWidth =
    pageWidth < 780 ? Math.max(280, pageWidth - 28) : Math.min(710, pageWidth - 350)
  const compact = pageWidth < 780
  const hierarchySize = Math.min(chartWidth, compact ? 370 : 470)

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
    <ExamplePageLayout title="Data Viz for Dummies III">
      <div className="dvd dvd--third" ref={pageRef}>
        <header className="dvd-hero">
          <div className="dvd-hero__copy">
            <p className="dvd-kicker">The matchup lab · same questions, sharper substitutions</p>
            <h2>Every good chart has a good reason to sit down.</h2>
            <p className="dvd-hero__lede">
              Parts I and II built the roster. Part III studies substitutions. A bar becomes a dot
              when ink should recede; a box unfurls into a violin when shape matters; a scatterplot
              grows a path when sequence enters the arena. The question is no longer “can this chart
              work?” but “what does it reveal that the starter leaves on the bench?”
            </p>
            <div className="dvd-hero__chips" aria-label="Guide promises">
              <span>7 chart matchups</span>
              <span>7 explicit tradeoffs</span>
              <span>1 continuing season</span>
            </div>
          </div>
          <div className="dvd-card dvd-card--hero" aria-label="Third chart selection scouting card">
            <div className="dvd-card__topline">
              <span>VIZ 303</span>
              <span>RC · 2026</span>
            </div>
            <strong className="dvd-card__number">03</strong>
            <div className="dvd-card__name">THE MATCHUP</div>
            <div className="dvd-card__position">Read the defense · make the sub</div>
            <div className="dvd-card__stats">
              <MiniStat label="Fit" value="100" />
              <MiniStat label="Shape" value="98" />
              <MiniStat label="Range" value="94" />
              <MiniStat label="Ego" value="12" />
            </div>
          </div>
        </header>

        <nav className="dvd-nav" aria-label="Third data visualization guide sections">
          <span className="dvd-nav__brand" aria-hidden="true">
            THE LAB
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
              id="matchup-lab"
              number="00"
              eyebrow="Substitution matrix · fit over fame"
              title="The alternative chart must reveal enough to pay for its extra reading cost."
              lead="Every challenger in this guide has a familiar starter behind it. The substitution succeeds when the new geometry protects a feature the old chart compresses: shape, sequence, ancestry, or enclosure."
              avoid="Novelty is not a matchup advantage. If the alternative needs three paragraphs of explanation and changes no conclusion, put the starter back in."
              stats={CHAPTER_STATS["matchup-lab"]}
            >
              <ChartPanel
                eyebrow="Interactive substitution board"
                title={
                  matchupMode === "call"
                    ? "Why the challenger checks in"
                    : "What the substitution costs"
                }
                note="Every specialist carries a tradeoff. Toggle from the reason to make the switch to the reading burden you accept in return."
                feature="Use paired alternatives during review"
                featureCopy="Semiotic’s chart components share accessors and interaction contracts, making it practical to prototype two defensible encodings before committing to one."
              >
                <div className="dvd-segmented" aria-label="Inspect chart matchup tradeoffs">
                  <button
                    type="button"
                    className={matchupMode === "call" ? "is-active" : ""}
                    onClick={() => setMatchupMode("call")}
                    aria-pressed={matchupMode === "call"}
                  >
                    Why make the sub
                  </button>
                  <button
                    type="button"
                    className={matchupMode === "cost" ? "is-active" : ""}
                    onClick={() => setMatchupMode("cost")}
                    aria-pressed={matchupMode === "cost"}
                  >
                    What it costs
                  </button>
                </div>
                <div className="dvd3-matchups" role="list">
                  {MATCHUPS.map((matchup, index) => (
                    <article key={matchup.challenger} role="listitem">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <small>Instead of {matchup.starter}</small>
                        <h4>{matchup.challenger}</h4>
                      </div>
                      <p>{matchupMode === "call" ? matchup.call : matchup.cost}</p>
                    </article>
                  ))}
                </div>
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="light-ranking"
              number="01"
              eyebrow="Dot plot · low-usage sniper"
              title="A bar loses its body and the value stops shouting."
              lead="Dot plots rank categories with less ink than bars. Position on a common scale still supports accurate comparison, while the empty baseline makes room for negative values, reference lines, and compact dashboards."
              avoid="Dots do not communicate magnitude as viscerally as lengths. If the audience needs to feel how much larger the leader is, the bar may still own the matchup."
              stats={CHAPTER_STATS["light-ranking"]}
            >
              <ChartPanel
                eyebrow="Seven lineups · net rating"
                title="Tempo five leads; rookie run crosses below zero"
                note="A dot handles positive and negative ratings without bars extending in two directions. The common scale does the comparison work."
                feature="Use a fixed extent to keep the reference meaningful"
                featureCopy="DotPlot accepts an explicit value extent, so zero and the distance around it remain stable across filters or live updates."
              >
                <DotPlot
                  data={LINEUP_RATINGS}
                  categoryAccessor="lineup"
                  valueAccessor="rating"
                  colorBy="unit"
                  colorScheme={PALETTE}
                  orientation="horizontal"
                  sort="desc"
                  dotRadius={8}
                  valueExtent={[-5, 15]}
                  width={chartWidth}
                  height={410}
                  margin={{ top: 28, right: 124, bottom: 54, left: 92 }}
                  showGrid
                  title="Net rating by Rookie City lineup"
                  description="A horizontal dot plot ranking seven fictional lineups by net rating, from plus 12.4 to minus 2.3."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="full-shape"
              number="02"
              eyebrow="Violin plot · film-room x-ray"
              title="The box plot opens its coat and reveals where the observations actually gather."
              lead="A violin mirrors an estimated density around each category. Width shows where values are common; the IQR overlay keeps median and middle spread available. It answers not only ‘how variable?’ but ‘what kind of variable?’"
              avoid="The silhouette is a model built from the sample. Sparse data can produce an authoritative-looking blob with very little authority. Report n and inspect the bandwidth or bin choice."
              stats={CHAPTER_STATS["full-shape"]}
            >
              <ChartPanel
                eyebrow="Shot mechanics · release time by attempt"
                title="At-rim attempts snap quickly; pull-ups spread and linger"
                note="Each violin contains 24 attempts. The broad parts locate common release times; the inner summary prevents the shape from becoming pure interpretive dance."
                feature="Use showIQR to pair shape with summary"
                featureCopy="ViolinPlot can layer the familiar interquartile range onto the density, preserving a statistical anchor while adding distribution detail."
              >
                <ViolinPlot
                  data={RELEASE_TIMES}
                  categoryAccessor="shot"
                  valueAccessor="seconds"
                  colorBy="shot"
                  colorScheme={[GOLD, VIOLET, CYAN]}
                  bins={28}
                  showIQR
                  valueExtent={[0.1, 1]}
                  width={chartWidth}
                  height={420}
                  margin={{ top: 28, right: 137, bottom: 72, left: 54 }}
                  showGrid
                  title="Shot release-time distributions"
                  description="Three violin plots compare release-time distributions for catch-and-shoot, pull-up, and at-rim attempts."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="many-shapes"
              number="03"
              eyebrow="Ridgeline plot · deep rotation"
              title="Several distributions line up, overlap politely, and tell time sideways."
              lead="Ridgelines stack one-sided densities so a reader can scan how shape shifts across many groups. They work best when sequence already orders the rows—quarters, months, cohorts—and the silhouette itself is the comparison."
              avoid="Overlap is a design choice, not free real estate. Too much hides baselines; too little wastes the form. Exact group-to-group comparisons remain easier in aligned small multiples."
              stats={CHAPTER_STATS["many-shapes"]}
            >
              <ChartPanel
                eyebrow="Shot distance · period by period"
                title="The offense drifts outward after halftime"
                note="Q1 mixes rim pressure and perimeter attempts. Q3, Q4, and overtime build larger shoulders in the twenties—the three-point line announcing itself by silhouette."
                feature="Use amplitude to control overlap honestly"
                featureCopy="RidgelinePlot exposes amplitude directly. Tune it for legible comparison, then keep the same setting across every category."
              >
                <RidgelinePlot
                  data={SHOT_DISTANCES}
                  categoryAccessor="period"
                  valueAccessor="feet"
                  colorBy="period"
                  colorScheme={[GOLD, CYAN, CORAL, VIOLET, MINT]}
                  bins={24}
                  amplitude={1.8}
                  valueExtent={[0, 33]}
                  width={chartWidth}
                  height={430}
                  margin={{ top: 28, right: 124, bottom: 56, left: 52 }}
                  showGrid
                  title="Shot-distance distributions by period"
                  description="Five ridgelines compare fictional shot-distance distributions from the first quarter through overtime."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="the-gap"
              number="04"
              eyebrow="Difference chart · matchup scoreboard"
              title="Two lines stop competing for attention; the space between them takes the lead."
              lead="Difference charts fill the gap between two series and switch color when leadership changes. Use them when above-versus-below, actual-versus-expected, or candidate-A-versus-candidate-B is the analytical sentence."
              avoid="The fill can make a tiny gap feel enormous if the scale is cropped. Keep the source lines visible and remember that colored area encodes difference, not a third measured series."
              stats={CHAPTER_STATS["the-gap"]}
            >
              <ChartPanel
                eyebrow="Actual score × expected score · twelve games"
                title="Rookie City alternates between overperformance and regression"
                note="Gold means actual scoring cleared expectation; blue means it fell short. Crossovers are the events, so the chart interpolates them instead of letting blocks collide."
                feature="Use interpolated crossover segments"
                featureCopy="DifferenceChart computes the exact crossing between observations, keeping the two colored claims continuous rather than switching at an arbitrary tick."
              >
                <DifferenceChart
                  data={SCORE_EXPECTATION}
                  xAccessor="game"
                  seriesAAccessor="actual"
                  seriesBAccessor="expected"
                  seriesALabel="Actual"
                  seriesBLabel="Expected"
                  seriesAColor={GOLD}
                  seriesBColor={BLUE}
                  showLines
                  showPoints
                  pointRadius={3.5}
                  lineWidth={2.5}
                  areaOpacity={0.68}
                  xExtent={[1, 12]}
                  yExtent={[94, 124]}
                  xFormat={(value) => `G${value}`}
                  width={chartWidth}
                  height={410}
                  margin={{ top: 28, right: 28, bottom: 58, left: 52 }}
                  showGrid
                  showLegend
                  legendPosition="bottom"
                  title="Actual versus expected scoring"
                  description="A difference chart compares actual and expected points across twelve fictional games, highlighting over- and under-performance."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="trajectory"
              number="05"
              eyebrow="Connected scatterplot · transition playmaker"
              title="A scatterplot acquires memory, and the relationship becomes a journey."
              lead="Connected scatterplots combine two quantitative axes with an ordering variable—usually time. The path reveals loops, reversals, and phases that an ordinary point cloud discards. Color progression helps recover where the journey begins and ends."
              avoid="Connection implies sequence, not causation. Crossing lines and many observations quickly create a knot, so label anchors, simplify the path, and consider animation or small multiples for longer histories."
              stats={CHAPTER_STATS.trajectory}
            >
              <ChartPanel
                eyebrow="Pace × offensive rating · game order"
                title="The season wanders before finding fast and efficient"
                note="The path starts at game one in the lower-left neighborhood and ends at game twelve in the upper-right, but the route includes two clear retreats."
                feature="Use orderAccessor as explicit narrative grammar"
                featureCopy="ConnectedScatterplot sorts by the ordering field before drawing and carries that value into tooltips, so array order never becomes an invisible assumption."
              >
                <ConnectedScatterplot
                  data={GAME_TRAJECTORY}
                  xAccessor="pace"
                  yAccessor="offense"
                  orderAccessor="game"
                  orderLabel="Game"
                  pointIdAccessor="id"
                  pointRadius={6}
                  xExtent={[92, 108]}
                  yExtent={[96, 122]}
                  width={chartWidth}
                  height={420}
                  margin={{ top: 28, right: 30, bottom: 58, left: 58 }}
                  showGrid
                  title="Pace and offensive-rating trajectory"
                  description="A connected scatterplot follows twelve fictional games through pace and offensive rating, ordered from game one to game twelve."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="ancestry"
              number="06"
              eyebrow="Tree diagram · coaching staff"
              title="Hierarchy stretches out its branches and shows exactly who descends from whom."
              lead="Trees spend space to make ancestry explicit. Every edge means parent-child; every level means depth. Use them for taxonomies, organizations, decision paths, and playbooks when structure matters more than how much area each leaf occupies."
              avoid="A tree is not a generic network. Cross-links, shared parents, and loops violate its contract. If the relationships escape ancestry, choose a graph that can admit them."
              stats={CHAPTER_STATS.ancestry}
            >
              <ChartPanel
                eyebrow="Offensive playbook · family to action"
                title="Clock state branches into sets, then into the final call"
                note="The half-court branch needs an extra level because sets mediate actions. The tree shows that difference in grammar immediately."
                feature="Use orientation to fit the hierarchy, not fashion"
                featureCopy="TreeDiagram can lay the same nested object horizontally, vertically, or radially. Choose based on depth, breadth, and label length."
              >
                <div className="dvd-segmented" aria-label="Choose tree orientation">
                  <button
                    type="button"
                    className={treeOrientation === "horizontal" ? "is-active" : ""}
                    onClick={() => setTreeOrientation("horizontal")}
                    aria-pressed={treeOrientation === "horizontal"}
                  >
                    Horizontal
                  </button>
                  <button
                    type="button"
                    className={treeOrientation === "radial" ? "is-active" : ""}
                    onClick={() => setTreeOrientation("radial")}
                    aria-pressed={treeOrientation === "radial"}
                  >
                    Radial
                  </button>
                </div>
                <TreeDiagram
                  key={treeOrientation}
                  data={PLAY_CALL_TREE}
                  layout="tree"
                  orientation={treeOrientation}
                  childrenAccessor="children"
                  nodeIdAccessor="name"
                  colorByDepth
                  colorScheme={PALETTE}
                  edgeStyle="curve"
                  nodeSize={7}
                  width={chartWidth}
                  height={compact ? 470 : 440}
                  margin={{ top: 34, right: 48, bottom: 42, left: 48 }}
                  showLabels={!compact || treeOrientation === "horizontal"}
                  title="Rookie City offensive play-call hierarchy"
                  description="A tree diagram organizing offensive calls by clock state, set, and final action."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>

            <GuideChapter
              id="nested-scale"
              number="07"
              eyebrow="Circle pack · roster bubbles"
              title="Hierarchy keeps its containers; magnitude rolls into nested circles."
              lead="Circle packing encloses children inside parents and sizes leaves by value. Compared with a treemap, it sacrifices space and precision for unmistakable grouping and an organic overview that helps readers browse nested clusters."
              avoid="Circle area is difficult to compare, and packing leaves unused gaps. If ranking or efficient space usage is the job, choose bars or a treemap."
              stats={CHAPTER_STATS["nested-scale"]}
            >
              <ChartPanel
                eyebrow="Roster allocation · 240 player-minutes"
                title="Position families contain the rotation they consume"
                note="The enclosing circles make guards, wings, and bigs visually undeniable. Leaf area approximates minutes; labels recover identity."
                feature="Use hierarchy-aware accessible navigation"
                featureCopy="CirclePack preserves the parent-child model behind the geometry, allowing assistive navigation to expose family, child, and value without relying on circle area."
              >
                <CirclePack
                  data={ROSTER_MINUTES}
                  childrenAccessor="children"
                  valueAccessor="value"
                  nodeIdAccessor="name"
                  colorBy="family"
                  colorScheme={{ Guards: GOLD, Wings: CYAN, Bigs: VIOLET }}
                  circleOpacity={0.72}
                  padding={5}
                  stroke={INK}
                  strokeWidth={1.2}
                  width={hierarchySize}
                  height={hierarchySize}
                  showLabels
                  title="Player-minute allocation by position family"
                  description="A circle pack nests nine players inside guard, wing, and big position groups. Circle area represents minutes."
                  tooltip
                  frameProps={{ background: "transparent" }}
                />
              </ChartPanel>
            </GuideChapter>
          </div>
        </ThemeProvider>

        <section id="postgame" className="dvd-overtime">
          <div className="dvd-overtime__head">
            <p className="dvd-kicker">Postgame · substitution review</p>
            <h2>Change the chart only when the analytical sentence changes with it.</h2>
            <p>
              The challenger earns the minutes by preserving a feature the starter compresses. Name
              that feature before the switch.
            </p>
          </div>
          <div className="dvd-decisions">
            <Decision
              verb="Rank with less ink"
              chart="Dot plot"
              note="Position stays precise; magnitude becomes quieter."
            />
            <Decision
              verb="Reveal distribution shape"
              chart="Violin"
              note="Keep n and bandwidth in the scouting report."
            />
            <Decision
              verb="Scan many distributions"
              chart="Ridgeline"
              note="Ordered categories make the silhouettes cohere."
            />
            <Decision
              verb="Make the gap primary"
              chart="Difference"
              note="Show both source lines and protect the scale."
            />
            <Decision
              verb="Show a two-metric journey"
              chart="Connected scatter"
              note="Order is data; crossings need landmarks."
            />
            <Decision
              verb="Expose ancestry"
              chart="Tree"
              note="Every edge must mean parent-child."
            />
            <Decision
              verb="Browse nested magnitude"
              chart="Circle pack"
              note="Enclosure first; exact comparison later."
            />
            <Decision
              verb="No feature changes"
              chart="Keep the starter"
              note="Novelty has not earned a substitution."
            />
          </div>
          <blockquote>
            A chart choice is not a personality reveal. It is a matchup decision with evidence on
            the line.
          </blockquote>
          <div className="dvd-final-rule">
            <span>THE THIRD RULE</span>
            <strong>Identify the hidden feature. Make the sub. Declare the cost.</strong>
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
