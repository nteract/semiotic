import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { interpolateRgb } from "d3-interpolate"
import { AreaChart, DifferenceChart, LineChart, Scatterplot } from "semiotic"
import { NetworkCustomChart, useForceLayout } from "semiotic/network"
import { XYCustomChart } from "semiotic/xy"
import { curvedEdgePath } from "semiotic/recipes"
import { useReducedMotion } from "semiotic/utils"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import * as G from "./data/gestaltData"
import "./GestaltPrinciplesExamplePage.css"

const CHAPTERS = [
  {
    roman: "I",
    slug: "similarity",
    short: "Similarity",
    tab: "Similarity, Proximity & Enclosure",
  },
  {
    roman: "II",
    slug: "common-fate",
    short: "Common Fate",
    tab: "Common Fate, Parallelism & Connectedness",
  },
  {
    roman: "III",
    slug: "past-experience",
    short: "Past Experience",
    tab: "Proximity & Past Experience",
  },
  {
    roman: "IV",
    slug: "figure-ground",
    short: "Figure / Ground",
    tab: "Figure/Ground & Metastability",
  },
  {
    roman: "V",
    slug: "continuity",
    short: "Continuity",
    tab: "Continuity & Closure",
  },
]

const STAGE_BG = { background: "transparent" }
const EMPTY_NETWORK = []

export default function GestaltPrinciplesExamplePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedChapter = CHAPTERS.findIndex(
    (chapter) => chapter.slug === searchParams.get("chapter"),
  )
  const active = requestedChapter >= 0 ? requestedChapter : 0
  const setActive = useCallback(
    (index) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set("chapter", CHAPTERS[index].slug)
        return next
      }, { replace: true, preventScrollReset: true })
    },
    [setSearchParams],
  )
  const Chapter = [
    ChapterSimilarity,
    ChapterCommonFate,
    ChapterPastExperience,
    ChapterFigureGround,
    ChapterContinuity,
  ][active]

  return (
    <ExamplePageLayout
      title="The Gestalt of Data Visualization"
    >
      <div className="gestalt-page">
        <div className="gz-hero">
          <span className="gz-kicker">Perception Lab</span>
          <p className="gz-lede">
            Gestalt is a <em>pragmatic</em> part of building charts—necessary the moment you do
            more than a plain bar or line. This is a working remake of a 2015 essay series. Each
            principle is shown where it actually lives: the encoding it powers, or the chart it
            quietly sabotages.
          </p>
        </div>

        <nav className="gz-tabs" role="tablist" aria-label="Chapters">
          {CHAPTERS.map((c, i) => (
            <button
              key={c.roman}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`gz-tab ${i === active ? "is-active" : ""}`}
              onClick={() => setActive(i)}
            >
              <span className="gz-tab-roman">{c.roman}</span>
              <span className="gz-tab-text">
                <span className="gz-tab-short">{c.short}</span>
                <span className="gz-tab-full">{c.tab}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="gz-chapter-wrap">
          <Chapter />
        </div>

        <GestaltGaze />
        <Credits />
      </div>
    </ExamplePageLayout>
  )
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------
function Stepper({ steps, active, onChange }) {
  return (
    <div className="gz-stepper" role="tablist" aria-label="Steps">
      {steps.map((label, i) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={i === active}
          className={`gz-step ${i === active ? "is-active" : ""}`}
          onClick={() => onChange(i)}
        >
          <span className="gz-step-num">{i + 1}</span>
          {label}
        </button>
      ))}
    </div>
  )
}

// `children` is a render function `(width) => node` so the chart is sized to
// its own stage column (measured here), never the full exhibit row.
function Exhibit({
  plate,
  title,
  intro,
  steps,
  active,
  onStep,
  caption,
  actions,
  stageClass,
  children,
}) {
  const [w, stageRef] = useResponsiveWidth(260, 820)
  return (
    <div className="gz-exhibit">
      <div className="gz-exhibit-side">
        <span className="gz-plate">Fig. {plate}</span>
        <h3 className="gz-exhibit-title">{title}</h3>
        {intro ? <p className="gz-exhibit-intro">{intro}</p> : null}
        {steps ? <Stepper steps={steps} active={active} onChange={onStep} /> : null}
        {caption ? <p className="gz-caption">{caption}</p> : null}
        {actions ? <div className="gz-actions">{actions}</div> : null}
      </div>
      <div className={`gz-exhibit-stage ${stageClass || ""}`}>
        <div className="gz-stage-inner" ref={stageRef}>
          {children(w)}
        </div>
      </div>
    </div>
  )
}

function BareStage({ children }) {
  const [w, stageRef] = useResponsiveWidth(260, 820)
  return (
    <div className="gz-mini gz-stage--bare">
      <div className="gz-stage-inner" ref={stageRef}>
        {children(w)}
      </div>
    </div>
  )
}

function GestaltLayoutLoading() {
  return (
    <div className="gz-layout-loading" role="status" aria-live="polite">
      <span aria-hidden="true" />
      Arranging network…
    </div>
  )
}

function ChapterHead({ roman, title, children }) {
  return (
    <div className="gz-chapter-head">
      <span className="gz-roman" aria-hidden="true">
        {roman}
      </span>
      <div>
        <h2 className="gz-chapter-title">{title}</h2>
        <p className="gz-chapter-intro">{children}</p>
      </div>
    </div>
  )
}

function ToggleRow({ label, value, onChange, options }) {
  return (
    <div className="gz-toggle-row">
      <span className="gz-toggle-label">{label}</span>
      <div className="gz-toggle">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`gz-toggle-btn ${value === o.value ? "is-active" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ===========================================================================
// CHAPTER I — Similarity, Proximity & Enclosure
// ===========================================================================
const SIMILARITY_STEPS = ["Base", "Similarity", "Proximity", "Enclosure"]
const SIMILARITY_CAPTIONS = {
  0: "All forty marks share the same neutral gray, so the field has no grouping signal yet.",
  1: "Shared visual properties read as a shared category. Hue is poor at quantity but excellent at category, so the highlighted marks now belong together.",
  2: "Open a gap and proximity alone splits the field into two groups — ten on the left, thirty on the right — though nothing else changed. It is why sorted or grouped bars 'just read right.'",
  3: "Enclosure is the strongest of the three signals and the rarest in practice — a clean border around algorithm-placed marks is hard to compute. Here a rect-enclose annotation does it.",
}

function ChapterSimilarity() {
  const [step, setStep] = useState(0)
  const [encoding, setEncoding] = useState("color")

  const grid = useMemo(() => G.buildGestaltGrid(), [])
  const data = useMemo(
    () => grid.map((d) => ({ ...d, x: step >= 2 ? d.px : d.gx })),
    [grid, step]
  )

  const annotations =
    step >= 3
      ? [
          {
            type: "rect-enclose",
            coordinates: [
              { x: 0, y: 0 },
              { x: 2 + G.PROXIMITY_GAP, y: G.GRID_ROWS - 1 },
            ],
            color: G.INK,
            padding: 16,
            label: "Group A",
          },
          {
            type: "rect-enclose",
            coordinates: [
              { x: 3 + G.PROXIMITY_GAP, y: 0 },
              { x: G.GRID_COLS - 1 + G.PROXIMITY_GAP, y: G.GRID_ROWS - 1 },
            ],
            color: G.INK,
            padding: 16,
            label: "Group B",
          },
        ]
      : undefined

  let encodingProps
  if (step === 0) {
    encodingProps = { color: G.GRAY }
  } else if (encoding === "color") {
    encodingProps = { colorBy: "group", colorScheme: [G.GRAY, G.RED] }
  } else {
    encodingProps = {
      color: G.GRAY,
      symbolBy: "group",
      symbolMap: { calm: "circle", active: "square" },
    }
  }

  return (
    <section className="gz-chapter">
      <ChapterHead roman="I" title="Similarity, Proximity & Enclosure">
        The three most basic grouping principles. Once you name how a graphic
        signals category — even something as plain as shared color — you also
        start noticing the signals it sends by accident.
      </ChapterHead>

      <Exhibit
        plate="1"
        title="Three ways to say 'these belong together'"
        steps={SIMILARITY_STEPS}
        active={step}
        onStep={setStep}
        caption={SIMILARITY_CAPTIONS[step]}
        stageClass="gz-stage--bare"
        actions={
          step === 1 ? (
            <ToggleRow
              label="Encode similarity by"
              value={encoding}
              onChange={setEncoding}
              options={[
                { value: "color", label: "Color" },
                { value: "shape", label: "Shape" },
              ]}
            />
          ) : null
        }
      >
        {(w) => (
          <Scatterplot
            data={data}
            xAccessor="x"
            yAccessor="y"
            pointIdAccessor="id"
            width={w}
            height={320}
            margin={{ top: 16, right: 18, bottom: 16, left: 18 }}
            xExtent={G.GRID_X_EXTENT}
            yExtent={G.GRID_Y_EXTENT}
            pointRadius={12}
            pointOpacity={1}
            stroke={G.INK}
            strokeWidth={1.4}
            animate={{ duration: 650 }}
            annotations={annotations}
            showLegend={false}
            enableHover={false}
            frameProps={STAGE_BG}
            {...encodingProps}
          />
        )}
      </Exhibit>

      <p className="gz-aside">
        <strong>Revelation.</strong> Watch the transition between steps. The
        order in which marks move and recolor is itself a signal — the original
        essay called this "revelation." Animated charts carry memory of prior
        position and color, so sequencing has to be deliberate.
      </p>
    </section>
  )
}

// ===========================================================================
// CHAPTER II — Common Fate, Parallelism & Connectedness
// ===========================================================================
const FATE_STEPS = ["Common Fate", "Parallelism", "Slopegraph"]
const SLOPE_TRANSITION_MS = 700
const SLOPE_LABEL_FONT_SIZE = 11
const PARALLELISM_RIGHT_MARGIN = 30
const SLOPEGRAPH_RIGHT_MARGIN =
  Math.max(...G.SLOPE_SERIES.map((series) => series.id.length)) *
    SLOPE_LABEL_FONT_SIZE *
    0.6 +
  10
const FATE_CAPTIONS = {
  0: "Three marks fall together, two rise together — and you instantly group them by shared motion. That is common fate.",
  1: "Freeze the motion into paths and you get parallelism: lines with the same slope read as one group. Parallelism is fossilized common fate.",
  2: "Add the axis and category labels and the parallel paths become a slopegraph: five measures changing from start to end.",
}
const LINK_STEPS = ["Dots", "Connected", "Curved edges"]
const LINK_CAPTIONS = {
  0: "Twelve dots. With no lines, only proximity speaks — and in a network, proximity barely means anything.",
  1: "Connect them and connectedness takes over: circles joined by a line fuse into a single shape. You cannot un-see the handful of 'objects' here, even though the placement is arbitrary.",
  2: "Straight edges also fake parallelism — same-angle lines look related when they are not. Curving the edges dampens that false signal; edge bundling takes it further.",
}

function ChapterCommonFate() {
  const [stepA, setStepA] = useState(0)
  const [phase, setPhase] = useState(0)
  const [slopeProgress, setSlopeProgress] = useState(0)
  const [stepB, setStepB] = useState(0)
  const reducedMotion = useReducedMotion()

  const setFateStep = useCallback((nextStep) => {
    if (nextStep !== 2) setSlopeProgress(0)
    setStepA(nextStep)
  }, [])

  useEffect(() => {
    if (stepA !== 0 || reducedMotion) return undefined
    const timer = window.setInterval(() => {
      setPhase((current) => (current ? 0 : 1))
    }, 1700)
    return () => window.clearInterval(timer)
  }, [stepA, reducedMotion])

  useEffect(() => {
    if (stepA !== 2) return undefined
    if (reducedMotion) {
      // Skip the tween; land on the finished slopegraph immediately.
      setSlopeProgress(1)
      return undefined
    }
    const startedAt = performance.now()
    let frame
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / SLOPE_TRANSITION_MS)
      setSlopeProgress(progress)
      if (progress < 1) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [stepA, reducedMotion])

  const slopeTransition =
    slopeProgress < 0.5
      ? 4 * slopeProgress ** 3
      : 1 - (-2 * slopeProgress + 2) ** 3 / 2
  const slopeColorScheme = useMemo(
    () =>
      Object.fromEntries(
        G.SLOPE_SERIES.map((series) => [
          series.id,
          interpolateRgb(
            G.SLOPE_DIR_COLORS[series.dir],
            G.SLOPE_CATEGORY_COLORS[series.id],
          )(slopeTransition),
        ]),
      ),
    [slopeTransition],
  )
  const slopeAnnotations = useMemo(
    () =>
      G.SLOPE_SERIES.map((series) => ({
        type: "text",
        t: 1,
        value: series.end,
        label: series.id,
        dx: 6,
        dy: 0,
        color: slopeColorScheme[series.id],
        opacity: slopeTransition,
        fontSize: SLOPE_LABEL_FONT_SIZE,
      })),
    [slopeColorScheme, slopeTransition],
  )

  return (
    <section className="gz-chapter">
      <ChapterHead roman="II" title="Common Fate, Parallelism & Connectedness">
        Motion and the implication of motion. The marks are just lines and
        circles, but how they move, how steep they are, and what they touch
        produce very different perceived structures.
      </ChapterHead>

      <Exhibit
        plate="2"
        title="Motion becomes line"
        steps={FATE_STEPS}
        active={stepA}
        onStep={setFateStep}
        caption={FATE_CAPTIONS[stepA]}
        stageClass={stepA < 2 ? "gz-stage--bare" : undefined}
      >
        {(w) =>
          stepA === 0 ? (
            <Scatterplot
              data={G.commonFatePoints(phase)}
              xAccessor="x"
              yAccessor="value"
              pointIdAccessor="id"
              width={w}
              height={320}
              margin={{ top: 18, right: 18, bottom: 18, left: 18 }}
              xExtent={[-0.04, 1.04]}
              yExtent={[-0.3, 9]}
              colorBy="dir"
              colorScheme={[G.BLUE, G.RED]}
              pointRadius={15}
              pointOpacity={1}
              stroke={G.INK}
              strokeWidth={1.4}
              animate={{ duration: 1500 }}
              showLegend={false}
              enableHover={false}
              frameProps={{ ...STAGE_BG, showAxes: false }}
            />
          ) : (
            <LineChart
              data={G.slopeLineData()}
              xAccessor="t"
              yAccessor="value"
              lineBy="series"
              colorBy={stepA === 2 ? "series" : "dir"}
              colorScheme={
                stepA === 2
                  ? slopeColorScheme
                  : [G.BLUE, G.RED]
              }
              width={w}
              height={320}
              margin={
                stepA === 2
                  ? {
                      top: 18,
                      right:
                        PARALLELISM_RIGHT_MARGIN +
                        (SLOPEGRAPH_RIGHT_MARGIN - PARALLELISM_RIGHT_MARGIN) *
                          slopeTransition,
                      bottom: 34,
                      left: 26,
                    }
                  : { top: 18, right: 30, bottom: 34, left: 26 }
              }
              xExtent={[-0.04, 1.04]}
              yExtent={[-0.3, 9]}
              lineWidth={3.5}
              showPoints
              pointRadius={5}
              curve="linear"
              xFormat={(t) => (t < 0.5 ? "start" : "end")}
              annotations={stepA === 2 ? slopeAnnotations : undefined}
              showLegend={false}
              enableHover={false}
              frameProps={
                stepA === 2
                  ? {
                      ...STAGE_BG,
                      showAxes: true,
                      axes: [
                        { orient: "left" },
                        {
                          orient: "bottom",
                          tickValues: [0, 1],
                          tickFormat: (t) => (t === 0 ? "start" : "end"),
                        },
                      ],
                    }
                  : { ...STAGE_BG, showAxes: false }
              }
            />
          )
        }
      </Exhibit>

      <Exhibit
        plate="3"
        title="A line makes a thing"
        steps={LINK_STEPS}
        active={stepB}
        onStep={setStepB}
        caption={LINK_CAPTIONS[stepB]}
        stageClass="gz-stage--bare"
      >
        {(w) => (
          <NetworkCustomChart
            nodes={G.LINK_NODES}
            edges={G.LINK_EDGES}
            layout={linkLayout}
            layoutConfig={{ step: stepB, pos: G.LINK_LAYOUT, edges: G.LINK_EDGES }}
            width={w}
            height={400}
            enableHover
          />
        )}
      </Exhibit>
    </section>
  )
}

// ===========================================================================
// CHAPTER III — Proximity & Past Experience
// ===========================================================================
const PAST_STEPS = ["The layout", "Proximity problem", "Past experience"]

function ChapterPastExperience() {
  const [step, setStep] = useState(0)
  const [seed, setSeed] = useState(7)
  const [prevSeed, setPrevSeed] = useState(null)

  const { positions: pos } = useForceLayout(G.NET_NODES, G.NET_EDGES, { seed })
  const { positions: prevPositions, status: prevStatus } = useForceLayout(
    prevSeed == null ? EMPTY_NETWORK : G.NET_NODES,
    prevSeed == null ? EMPTY_NETWORK : G.NET_EDGES,
    { seed: prevSeed ?? seed },
  )
  const prev = prevSeed != null && prevStatus === "ready" ? prevPositions : null
  const problem = useMemo(
    () => pos ? G.findProximityProblem(G.NET_NODES, G.NET_EDGES, pos) : null,
    [pos]
  )

  const again = useCallback(() => {
    setPrevSeed(seed)
    setSeed(Math.floor(Math.random() * 1e9))
  }, [seed])

  const captions = {
    0: "A force-directed layout pushes unconnected nodes apart and pulls connected ones together — the same simulation Semiotic's ForceDirectedGraph runs. One disconnected node is held on screen only by gravity.",
    1: `Once it settles, mark the offenders red: nodes drawn within ${Math.round(
      (problem?.threshold ?? 0) * 100
    )}% of the canvas of each other while sitting at least ${
      problem?.minHops ?? "several"
    } steps apart in the graph. Proximity is lying about similarity.`,
    2: prev
      ? "Same graph, same forces, new run. The gray ghost is the previous layout; arrows show how far each node jumped. Mirroring, rotation, and re-packing make the 'same' network look entirely different — and readers expect it to look the same."
      : "Hit Again to re-run the very same graph through the very same layout, and watch how little the result resembles the last one.",
  }

  return (
    <section className="gz-chapter">
      <ChapterHead roman="III" title="Proximity & Past Experience">
        Position cannot be left to chance, even when it does not encode a
        dimension. A scatterplot earns its positions from the data; a network
        layout invents them — and that is where proximity and past experience
        turn against the reader.
      </ChapterHead>

      <Exhibit
        plate="4"
        title="The same network, never the same picture"
        steps={PAST_STEPS}
        active={step}
        onStep={setStep}
        caption={captions[step]}
        stageClass="gz-stage--bare"
        actions={
          <button type="button" className="gz-btn" onClick={again}>
            Again <span aria-hidden="true">↻</span>
          </button>
        }
      >
        {(w) => pos && problem ? (
          <NetworkCustomChart
            nodes={G.NET_NODES}
            edges={G.NET_EDGES}
            layout={netLayout}
            layoutConfig={{
              step,
              pos,
              prev,
              edges: G.NET_EDGES,
              problemIds: [...problem.problemIds],
            }}
            width={w}
            height={440}
            enableHover
          />
        ) : <GestaltLayoutLoading />}
      </Exhibit>

      <p className="gz-aside">
        The same tension haunts circle-packing, dendrograms, and Sankey
        diagrams: a reader expects identical inputs to produce an identical
        picture, and expects nearness to mean kinship. A curated, deterministic
        layout — one that fixes rotation and the placement of loose pieces — is
        the real fix.
      </p>
    </section>
  )
}

// ===========================================================================
// CHAPTER IV — Figure/Ground & Metastability
// ===========================================================================
const FG_STEPS = ["Ambiguous", "Bars rise", "Bars reverse", "Settle"]
const FG_CAPTIONS = {
  0: "A bar chart — or two bar charts, depending on how you look at it. Five bars rise from the bottom; five grow from the left; they share one square. With nothing outlined, your eye flips between them.",
  1: "Outline the rising bars and they snap forward as the figure; the rest drops back to ground.",
  2: "Outline the other set and figure and ground reverse. Your memory of the first reading makes the flip feel unstable — that is metastability.",
  3: "Mute one set to a neutral gray and the contest ends. Past experience plus low saturation fixes which chart is the figure.",
}
const APPROVAL_STEPS = ["Lines", "Areas", "Difference"]
const APPROVAL_CAPTIONS = {
  0: "Approval ratings for two administrations, sampled across each first term. The lines are the obvious figure — you read each trajectory against the axis (note the post-9/11 spike to 89%).",
  1: "But a line chart implicitly encloses an area. Shade it and a different figure appears: the magnitude beneath each line.",
  2: "A third figure lives between the lines — the difference, shaded by whoever leads. That is Playfair's difference chart (Semiotic's DifferenceChart). It was in the data all along; figure/ground decides which one you see.",
}

function ChapterFigureGround() {
  const [stepA, setStepA] = useState(0)
  const [stepB, setStepB] = useState(0)

  const bars = useMemo(() => G.buildFigureGroundBars(), [])
  const approvalFlat = useMemo(
    () =>
      G.APPROVAL.flatMap((d) => [
        { series: "Bush", x: d.x, value: d.bush },
        { series: "Obama", x: d.x, value: d.obama },
      ]),
    []
  )

  return (
    <section className="gz-chapter">
      <ChapterHead roman="IV" title="Figure/Ground & Metastability">
        Even a simple chart can be ambiguous about what the figure is. A reader
        drifts between the available readings — sometimes usefully, sometimes
        not. A good designer decides which figure wins.
      </ChapterHead>

      <Exhibit
        plate="5"
        title="One square, two charts"
        steps={FG_STEPS}
        active={stepA}
        onStep={setStepA}
        caption={FG_CAPTIONS[stepA]}
        stageClass="gz-stage--bare"
      >
        {(w) => (
          <XYCustomChart
            data={bars}
            layout={figureGroundLayout}
            layoutConfig={{ step: stepA }}
            width={w}
            height={340}
            xExtent={[0, 5]}
            yExtent={[0, 5]}
            margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
            enableHover
            frameProps={STAGE_BG}
          />
        )}
      </Exhibit>

      <Exhibit
        plate="6"
        title="Three figures hiding in one chart"
        steps={APPROVAL_STEPS}
        active={stepB}
        onStep={setStepB}
        caption={APPROVAL_CAPTIONS[stepB]}
      >
        {(w) =>
          stepB === 0 ? (
            <LineChart
              data={approvalFlat}
              xAccessor="x"
              yAccessor="value"
              lineBy="series"
              colorBy="series"
              colorScheme={[G.BLUE, G.RED]}
              width={w}
              height={330}
              margin={{ top: 18, right: 20, bottom: 30, left: 38 }}
              xExtent={[0, 58]}
              yExtent={[30, 92]}
              lineWidth={2.5}
              showLegend
              legendPosition="bottom"
              enableHover
              frameProps={STAGE_BG}
            />
          ) : stepB === 1 ? (
            <AreaChart
              data={approvalFlat}
              xAccessor="x"
              yAccessor="value"
              areaBy="series"
              colorBy="series"
              colorScheme={[G.BLUE, G.RED]}
              width={w}
              height={330}
              margin={{ top: 18, right: 20, bottom: 30, left: 38 }}
              xExtent={[0, 58]}
              yExtent={[30, 92]}
              areaOpacity={0.5}
              showLine
              showLegend
              legendPosition="bottom"
              enableHover
              frameProps={STAGE_BG}
            />
          ) : (
            <DifferenceChart
              data={G.APPROVAL}
              xAccessor="x"
              seriesAAccessor="bush"
              seriesBAccessor="obama"
              seriesALabel="Bush"
              seriesBLabel="Obama"
              seriesAColor={G.BLUE}
              seriesBColor={G.RED}
              width={w}
              height={330}
              margin={{ top: 18, right: 20, bottom: 30, left: 38 }}
              xExtent={[0, 58]}
              yExtent={[30, 92]}
              areaOpacity={0.55}
              showLegend
              legendPosition="bottom"
              enableHover
              frameProps={STAGE_BG}
            />
          )
        }
      </Exhibit>
    </section>
  )
}

// ===========================================================================
// CHAPTER V — Continuity & Closure (completing the canonical set)
// ===========================================================================
const CONTINUITY_STEPS = ["Points", "Connect", "Smooth"]
const CONTINUITY_CAPTIONS = {
  0: "A scatter of twelve readings. The upward trend is latent — you have to work to see it.",
  1: "Connect them and good continuation takes over: the eye follows the path as one rising thing. This is why the line chart is the default for trends.",
  2: "Smooth the curve and continuity dominates completely — at the cost of implying readings between the points that were never measured.",
}
const CLOSURE_STEPS = ["Open", "Closed"]
const CLOSURE_CAPTIONS = {
  0: "Points along a parabola with the middle omitted. Your eye still completes the missing arc into one continuous curve — that is closure.",
  1: "Make the inference explicit with a regression overlay. The whole the eye already saw is now drawn through the gap.",
}

function ChapterContinuity() {
  const [stepA, setStepA] = useState(0)
  const [stepB, setStepB] = useState(0)

  const cross = useMemo(() => G.crossingLines(), [])
  const closure = useMemo(() => G.closureCurve(), [])

  return (
    <section className="gz-chapter">
      <ChapterHead roman="V" title="Continuity & Closure">
        The two canonical principles the original essays never reached. Both are
        about completion: the eye prefers a smooth, continuous path, and it will
        finish a shape that is only implied.
      </ChapterHead>

      <Exhibit
        plate="7"
        title="The eye follows the path"
        steps={CONTINUITY_STEPS}
        active={stepA}
        onStep={setStepA}
        caption={CONTINUITY_CAPTIONS[stepA]}
        stageClass="gz-stage--bare"
        actions={
          <p className="gz-microcaption">
            Below: two lines crossing. You follow each continuous path
            <em> through</em> the intersection, not around the corner.
          </p>
        }
      >
        {(w) =>
          stepA === 0 ? (
            <Scatterplot
              data={G.CONTINUITY}
              xAccessor="x"
              yAccessor="y"
              width={w}
              height={300}
              margin={{ top: 18, right: 18, bottom: 18, left: 18 }}
              xExtent={[-0.5, 11.5]}
              yExtent={[0, 58]}
              color={G.INK}
              pointRadius={6}
              showLegend={false}
              enableHover={false}
              frameProps={STAGE_BG}
            />
          ) : (
            <LineChart
              data={G.CONTINUITY}
              xAccessor="x"
              yAccessor="y"
              width={w}
              height={300}
              margin={{ top: 18, right: 18, bottom: 18, left: 18 }}
              xExtent={[-0.5, 11.5]}
              yExtent={[0, 58]}
              stroke={G.BLUE}
              color={G.BLUE}
              lineWidth={3}
              showPoints
              pointRadius={5}
              curve={stepA === 2 ? "catmullRom" : "linear"}
              showLegend={false}
              enableHover={false}
              frameProps={STAGE_BG}
            />
          )
        }
      </Exhibit>

      <BareStage>
        {(w) => (
          <LineChart
            data={cross}
            xAccessor="x"
            yAccessor="y"
            lineBy="series"
            colorBy="series"
            colorScheme={[G.RED, G.BLUE]}
            width={w}
            height={170}
            margin={{ top: 14, right: 16, bottom: 16, left: 16 }}
            xExtent={[0, 10]}
            yExtent={[0, 56]}
            lineWidth={3}
            showLegend={false}
            enableHover={false}
            frameProps={STAGE_BG}
          />
        )}
      </BareStage>

      <Exhibit
        plate="8"
        title="Finishing what isn't there"
        steps={CLOSURE_STEPS}
        active={stepB}
        onStep={setStepB}
        caption={CLOSURE_CAPTIONS[stepB]}
        stageClass="gz-stage--bare"
      >
        {(w) => (
          <Scatterplot
            data={closure}
            xAccessor="x"
            yAccessor="y"
            width={w}
            height={300}
            margin={{ top: 18, right: 18, bottom: 18, left: 18 }}
            xExtent={[-1, 21]}
            yExtent={[0, 70]}
            color={G.INK}
            pointRadius={6}
            regression={
              stepB === 1
                ? {
                    method: "polynomial",
                    order: 2,
                    color: G.RED,
                    strokeWidth: 3,
                    label: "inferred",
                  }
                : undefined
            }
            showLegend={false}
            enableHover={false}
            frameProps={STAGE_BG}
          />
        )}
      </Exhibit>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Closing synthesis + credits
// ---------------------------------------------------------------------------
function GestaltGaze() {
  return (
    <section className="gz-gaze">
      <span className="gz-kicker">The Gestalt Gaze</span>
      <h2>The whole is other than the sum of its parts</h2>
      <p>
        Every chart sends signals you did not author: marks that fall near each
        other, a more saturated hue, a transition that implies cause. When that
        signal is just a byproduct of a palette or a layout, it is a failure on
        the part of the person who made the chart. The fix is not to retreat to
        bare bars and lines — it is to see the gestalt your graphics are
        sending, and to bend it on purpose.
      </p>
    </section>
  )
}

function Credits() {
  return (
    <div className="gz-credits">
      <p>
        A transition of Elijah Meeks's 2015 essays{" "}
        <em>Gestalt Principles for Data Visualization</em> (
        <a
          href="https://emeeks.github.io/gestaltdataviz/section1.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          §1
        </a>
        ,{" "}
        <a
          href="https://emeeks.github.io/gestaltdataviz/section2.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          §2
        </a>
        ,{" "}
        <a
          href="https://emeeks.github.io/gestaltdataviz/section3.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          §3
        </a>
        ,{" "}
        <a
          href="https://emeeks.github.io/gestaltdataviz/section4.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          §4
        </a>
        ) — bespoke D3 then, Semiotic charts now. Approval data from the
        American Presidency Project at UCSB and Gallup.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom layout functions (network + XY escape hatches)
// ---------------------------------------------------------------------------
function makeMapper(plot, pad) {
  const inset = pad == null ? 18 : pad
  return {
    mx: (nx) => plot.x + inset + nx * (plot.width - 2 * inset),
    my: (ny) => plot.y + inset + ny * (plot.height - 2 * inset),
  }
}

// Chapter II — connectedness: dots, then straight edges, then curved edges.
function linkLayout(ctx) {
  const { plot } = ctx.dimensions
  const { step, pos, edges } = ctx.config
  const { mx, my } = makeMapper(plot, 22)

  const sceneEdges =
    step >= 1
      ? edges.map((e) => {
          const a = { x: mx(pos[e.source].x), y: my(pos[e.source].y) }
          const b = { x: mx(pos[e.target].x), y: my(pos[e.target].y) }
          const style = { stroke: G.INK, strokeWidth: 1.6, opacity: 0.82 }
          if (step === 1) {
            return { type: "line", x1: a.x, y1: a.y, x2: b.x, y2: b.y, style, datum: e }
          }
          const orientation =
            Math.abs(b.x - a.x) > Math.abs(b.y - a.y) ? "horizontal" : "vertical"
          return {
            type: "curved",
            pathD: curvedEdgePath(a, b, { orientation }),
            style,
            datum: e,
          }
        })
      : []

  const sceneNodes = ctx.nodes.map((n) => {
    const p = pos[n.id]
    return {
      type: "circle",
      cx: mx(p.x),
      cy: my(p.y),
      r: 13,
      style: { fill: G.BLUE, stroke: G.INK, strokeWidth: 1.5 },
      datum: n.data || n,
      id: n.id,
    }
  })

  return { sceneNodes, sceneEdges }
}

// Chapter III — proximity problem + past-experience ghost & arrows.
function netLayout(ctx) {
  const { plot } = ctx.dimensions
  const { step, pos, prev, edges, problemIds } = ctx.config
  const { mx, my } = makeMapper(plot, 22)
  const problem = new Set(problemIds)

  const sceneEdges = edges.map((e) => ({
    type: "line",
    x1: mx(pos[e.source].x),
    y1: my(pos[e.source].y),
    x2: mx(pos[e.target].x),
    y2: my(pos[e.target].y),
    style: { stroke: G.INK, strokeWidth: 1.3, opacity: 0.6 },
    datum: e,
  }))

  const sceneNodes = ctx.nodes.map((n) => {
    const p = pos[n.id]
    const isProblem = step >= 1 && problem.has(n.id)
    return {
      type: "circle",
      cx: mx(p.x),
      cy: my(p.y),
      r: 10,
      style: {
        fill: isProblem ? G.RED : G.BLUE,
        stroke: G.INK,
        strokeWidth: 1.4,
      },
      datum: n.data || n,
      id: n.id,
    }
  })

  let overlays = null
  if (step === 2 && prev) {
    const moves = ctx.nodes
      .map((n) => {
        const cur = pos[n.id]
        const old = prev[n.id]
        if (!old) return null
        return {
          id: n.id,
          ax: mx(old.x),
          ay: my(old.y),
          bx: mx(cur.x),
          by: my(cur.y),
        }
      })
      .filter(Boolean)

    overlays = (
      <g className="gz-ghost-layer">
        <defs>
          <marker
            id="gz-arrowhead"
            markerWidth="9"
            markerHeight="9"
            refX="6.5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L7,3 L0,6 Z" fill={G.INK} />
          </marker>
        </defs>
        {moves.map((m) => (
          <g key={m.id}>
            <circle cx={m.ax} cy={m.ay} r={9} fill={G.GRAY} opacity={0.4} />
            <line
              x1={m.ax}
              y1={m.ay}
              x2={m.bx}
              y2={m.by}
              stroke={G.INK}
              strokeWidth={1.4}
              opacity={0.55}
              markerEnd="url(#gz-arrowhead)"
            />
          </g>
        ))}
      </g>
    )
  }

  return { sceneNodes, sceneEdges, overlays }
}

// Chapter IV — the interlocking dual bar chart.
function fgStyle(bar, step) {
  const isV = bar.kind === "vertical"
  const palePink = "#d79b92"
  const paleYellow = "#e6cd84"
  if (step === 0) return { fill: isV ? palePink : paleYellow, stroke: "none" }
  if (step === 1) {
    return isV
      ? { fill: G.RED, stroke: G.INK, strokeWidth: 2.5 }
      : { fill: paleYellow, stroke: "none" }
  }
  if (step === 2) {
    return isV
      ? { fill: palePink, stroke: "none" }
      : { fill: G.YELLOW, stroke: G.INK, strokeWidth: 2.5 }
  }
  return isV
    ? { fill: G.GRAY, stroke: "none" }
    : { fill: G.YELLOW, stroke: G.INK, strokeWidth: 2.5 }
}

function figureGroundLayout(ctx) {
  const { plot } = ctx.dimensions
  const { step } = ctx.config
  const cells = G.FG_CELLS
  const cell = Math.min(plot.width, plot.height) / cells
  const side = cell * cells
  const ox = plot.x + (plot.width - side) / 2
  const oy = plot.y + (plot.height - side) / 2

  const nodes = ctx.data.map((bar) => {
    const isV = bar.kind === "vertical"
    let x
    let y
    let w
    let h
    if (isV) {
      const i = bar.index
      w = cell
      h = i * cell
      x = ox + i * cell
      y = oy + side - h
    } else {
      const j = bar.index
      x = ox
      y = oy + j * cell
      w = (cells - j) * cell
      h = cell
    }
    return {
      type: "rect",
      x,
      y,
      w,
      h,
      style: fgStyle(bar, step),
      datum: bar,
      _transitionKey: bar.id,
    }
  })

  return { nodes }
}
