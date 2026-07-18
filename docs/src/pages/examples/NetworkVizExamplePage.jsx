import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ChordDiagram, ForceDirectedGraph, SankeyDiagram, TreeDiagram } from "semiotic"
import { NetworkCustomChart, useForceLayout } from "semiotic/network"
import { networkHitTarget } from "semiotic/recipes"
import { useReducedMotion } from "semiotic/utils"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import * as N from "./data/networkVizData"
import "./NetworkVizExamplePage.css"

const CHAPTERS = [
  {
    num: "1",
    slug: "what-a-network-is",
    title: "What a Network Is",
    short: "What a network is",
  },
  {
    num: "2",
    slug: "static-layouts",
    title: "Drawing Without Physics",
    short: "Static layouts",
  },
  {
    num: "3",
    slug: "hairball",
    title: "The Hairball, and How It Lies",
    short: "The hairball",
  },
  {
    num: "4",
    slug: "reading-edges",
    title: "Reading the Edges",
    short: "Reading edges",
  },
  {
    num: "5",
    slug: "reading-nodes",
    title: "Reading the Nodes",
    short: "Reading nodes",
  },
  {
    num: "6",
    slug: "finding-structure",
    title: "Finding Structure",
    short: "Finding structure",
  },
  {
    num: "7",
    slug: "beyond-node-link",
    title: "Beyond the Node-Link",
    short: "Beyond node-link",
  },
  {
    num: "8",
    slug: "network-toy",
    title: "The Network Toy",
    short: "The network toy",
  },
]

const STAGE_BG = { background: "transparent" }

export default function NetworkVizExamplePage() {
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
    ChapterWhat,
    ChapterStatic,
    ChapterHairball,
    ChapterEdges,
    ChapterNodes,
    ChapterStructure,
    ChapterBeyond,
    ChapterToy,
  ][active]

  return (
    <ExamplePageLayout
      title="Drawing Networks"
    >
      <div className="nv-book">
        <div className="nv-cover">
          <span className="nv-imprint">A Visual Primer</span>
          <p className="nv-blurb">
            A node-link diagram is the easiest network picture to make and the hardest to read. This
            primer rebuilds a 2015 network-visualization workshop—every technique as a working
            chart—and ends with an interactive toy for thinking <em>with</em> a graph instead of
            only looking at one.
          </p>
        </div>

        <div className="nv-layout">
          <aside className="nv-toc" aria-label="Contents">
            <div className="nv-toc-head">Contents</div>
            <ol className="nv-toc-list">
              {CHAPTERS.map((c, i) => (
                <li key={c.num}>
                  <button
                    type="button"
                    className={`nv-toc-link ${i === active ? "is-active" : ""}`}
                    aria-current={i === active ? "true" : undefined}
                    onClick={() => setActive(i)}
                  >
                    <span className="nv-toc-num">{c.num}</span>
                    <span>{c.short}</span>
                  </button>
                </li>
              ))}
            </ol>
            <Link className="nv-toc-aside" to="/examples/gestalt-principles">
              See also: The Gestalt of Data Visualization →
            </Link>
          </aside>

          <div className="nv-main">
            <Chapter />
            <nav className="nv-pager" aria-label="Chapter navigation">
              <button
                type="button"
                className="nv-pager-btn"
                disabled={active === 0}
                onClick={() => setActive(Math.max(0, active - 1))}
              >
                ← {active > 0 ? CHAPTERS[active - 1].title : ""}
              </button>
              <button
                type="button"
                className="nv-pager-btn nv-pager-next"
                disabled={active === CHAPTERS.length - 1}
                onClick={() => setActive(Math.min(CHAPTERS.length - 1, active + 1))}
              >
                {active < CHAPTERS.length - 1 ? CHAPTERS[active + 1].title : ""} →
              </button>
            </nav>
            <Colophon />
          </div>
        </div>
      </div>
    </ExamplePageLayout>
  )
}

// ---------------------------------------------------------------------------
// Shared presentation building blocks
// ---------------------------------------------------------------------------
function ChapterHead({ num, title, lead }) {
  return (
    <div className="nv-chapter-head">
      <span className="nv-chapter-num">Chapter {num}</span>
      <h2 className="nv-chapter-title">{title}</h2>
      <p className="nv-lead">{lead}</p>
    </div>
  )
}

function Stage({ height, minWidth = 240, maxWidth = 760, children }) {
  const [w, ref] = useResponsiveWidth(minWidth, maxWidth)
  return (
    <div className="nv-stage" style={{ minHeight: height }}>
      <div className="nv-stage-inner" ref={ref}>
        {children(w)}
      </div>
    </div>
  )
}

function Plate({ fig, caption, controls, height, children, minWidth, maxWidth }) {
  return (
    <figure className="nv-plate">
      {controls ? <div className="nv-controls">{controls}</div> : null}
      <Stage height={height} minWidth={minWidth} maxWidth={maxWidth}>
        {children}
      </Stage>
      <figcaption>
        <span className="nv-fig">Fig. {fig}</span> {caption}
      </figcaption>
    </figure>
  )
}

function Stepper({ steps, active, onChange }) {
  return (
    <div className="nv-stepper" role="tablist">
      {steps.map((s, i) => (
        <button
          key={s}
          type="button"
          role="tab"
          aria-selected={i === active}
          className={`nv-step ${i === active ? "is-active" : ""}`}
          onClick={() => onChange(i)}
        >
          {s}
        </button>
      ))}
    </div>
  )
}

function Toggle({ label, options, value, onChange }) {
  return (
    <span className="nv-toggle-group">
      <span className="nv-toggle-label">{label}</span>
      <span className="nv-toggle">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`nv-toggle-btn ${value === o.value ? "is-active" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </span>
    </span>
  )
}

function Switch({ label, value, onChange }) {
  return (
    <button
      type="button"
      className={`nv-switch ${value ? "is-on" : ""}`}
      aria-pressed={value}
      onClick={() => onChange(!value)}
    >
      <i aria-hidden="true" />
      {label}
    </button>
  )
}

function NetworkLayoutLoading() {
  return (
    <div className="nv-layout-loading" role="status" aria-live="polite">
      <span aria-hidden="true" />
      Arranging network…
    </div>
  )
}

function useAnimatedNetworkPositions(target, duration = 700) {
  const reducedMotion = useReducedMotion()
  const [positions, setPositions] = useState(target)
  const positionsRef = useRef(target)

  useEffect(() => {
    // Keep the last usable layout visible if an asynchronous target is not
    // ready yet. This avoids replacing a reader's mental map with a loader.
    if (!target) return

    const from = positionsRef.current
    if (!from || reducedMotion) {
      positionsRef.current = target
      setPositions(target)
      return
    }

    const ids = Object.keys(target)
    const moved = ids.some((id) => {
      const start = from[id]
      const end = target[id]
      return start && (start.x !== end.x || start.y !== end.y)
    })
    if (!moved) {
      positionsRef.current = target
      setPositions(target)
      return
    }

    let frame = 0
    const startedAt = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = {}
      for (const id of ids) {
        const end = target[id]
        const start = from[id] || end
        next[id] = {
          x: start.x + (end.x - start.x) * eased,
          y: start.y + (end.y - start.y) * eased,
        }
      }
      positionsRef.current = next
      setPositions(next)

      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        positionsRef.current = target
        setPositions(target)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, reducedMotion])

  return {
    positions,
    animating: !!target && !!positions && positions !== target,
  }
}

// ===========================================================================
// CHAPTER 1 — What a network is
// ===========================================================================
const TYPE_STEPS = ["Hierarchy", "Directed acyclic", "General graph"]
const TYPE_CAPTIONS = {
  0: "A hierarchy is the friendliest network: every node has one parent, so a tidy tree reads top-to-bottom with no ambiguity.",
  1: "A directed acyclic graph (DAG) lets a node have several parents but never loops back — a flow you can still read left-to-right. Here, characters flow to the community they anchor.",
  2: "Most interesting networks are neither. Connections loop, cross, and double back, and no single reading order survives — which is the whole problem this primer is about.",
}

function ChapterWhat() {
  const [step, setStep] = useState(0)
  const core = useMemo(() => N.coreGraph(), [])
  const sankey = useMemo(() => N.membershipSankey(N.LESMIS_NODES, N.LESMIS_EDGES, 10), [])

  return (
    <section className="nv-chapter">
      <ChapterHead
        num="1"
        title="What a Network Is"
        lead="We visualize networks to reason about systems and relationships, not because they look cool — and the kind of network decides how hard the picture will be to read. Three families recur, in rising order of difficulty."
      />
      <p>
        Networks also vary along three axes worth naming before you draw one:
        <strong> directionality</strong> (do edges point, or merely connect?),
        <strong> multipart</strong> structure (is it one kind of node, or several — people and
        places, say?), and <strong> edge complexity</strong> (weight, parallel edges, even negative
        links). Every choice below is really a choice about how to make one of those legible.
      </p>

      <Plate
        fig="1.1"
        height={360}
        controls={<Stepper steps={TYPE_STEPS} active={step} onChange={setStep} />}
        caption={TYPE_CAPTIONS[step]}
      >
        {(w) =>
          step === 0 ? (
            <TreeDiagram
              data={N.TYPE_TREE}
              childrenAccessor="children"
              nodeIdAccessor="id"
              orientation="vertical"
              colorByDepth
              colorScheme={N.COMMUNITY_COLORS}
              showLabels
              nodeLabel="id"
              width={w}
              height={340}
              frameProps={STAGE_BG}
            />
          ) : step === 1 ? (
            <SankeyDiagram
              nodes={sankey.nodes}
              edges={sankey.edges}
              nodeIdAccessor="id"
              valueAccessor="value"
              colorBy="group"
              colorScheme={N.COMMUNITY_COLORS}
              edgeColorBy="source"
              orientation="horizontal"
              showLabels
              width={w}
              height={340}
              frameProps={STAGE_BG}
            />
          ) : (
            <ForceDirectedGraph
              nodes={core.nodes}
              edges={core.edges}
              nodeIdAccessor="id"
              colorBy="group"
              colorScheme={N.COMMUNITY_COLORS}
              nodeSize={9}
              showLabels
              nodeLabel="id"
              enableHover
              width={w}
              height={340}
              frameProps={STAGE_BG}
            />
          )
        }
      </Plate>
    </section>
  )
}

// ===========================================================================
// CHAPTER 2 — Static layouts (arc / matrix / circular)
// ===========================================================================
const STATIC_STEPS = ["Arc diagram", "Adjacency matrix", "Circular (avoid)"]
const STATIC_CAPTIONS = {
  0: "An arc diagram lines the nodes up and draws each connection as an arc. Order the line well — here by community — and clusters surface as nested bundles of arcs.",
  1: "An adjacency matrix never overlaps an edge: every connection is a filled cell. It scales to dense graphs that would be hopeless as node-link, at the cost of reading practice.",
  2: "A circular layout looks orderly but earns nothing — position carries no meaning and every edge crosses the interior. It is the layout to reach for last, not first.",
}

function ChapterStatic() {
  const [step, setStep] = useState(0)
  const core = useMemo(() => N.coreGraph(), [])
  const ids = useMemo(() => N.orderedIds(core.nodes, core.edges), [core])
  const groupOf = useMemo(() => Object.fromEntries(core.nodes.map((n) => [n.id, n.group])), [core])
  const maxValue = useMemo(() => Math.max(...core.edges.map((e) => e.value), 1), [core])
  const valueByPair = useMemo(() => {
    const m = new Map()
    for (const e of core.edges) {
      const key = e.source < e.target ? `${e.source}|${e.target}` : `${e.target}|${e.source}`
      m.set(key, (m.get(key) || 0) + e.value)
    }
    return m
  }, [core])
  const arcPos = useMemo(() => N.arcLayout(ids), [ids])
  const circPos = useMemo(() => N.circularLayout(ids), [ids])

  return (
    <section className="nv-chapter">
      <ChapterHead
        num="2"
        title="Drawing Without Physics"
        lead="Before the force-directed layout took over, networks were drawn deterministically — the same data always producing the same picture. Two of those static forms are still the most readable network charts you can make."
      />
      <Plate
        fig="2.1"
        height={420}
        controls={<Stepper steps={STATIC_STEPS} active={step} onChange={setStep} />}
        caption={STATIC_CAPTIONS[step]}
      >
        {(w) => (
          <NetworkCustomChart
            nodes={core.nodes}
            edges={core.edges}
            layout={step === 1 ? matrixLayout : nodeLinkLayout}
            layoutConfig={
              step === 1
                ? { ids, valueByPair, groupOf, maxValue }
                : {
                    pos: step === 0 ? arcPos : circPos,
                    edges: core.edges,
                    edgeShape: step === 0 ? "arc" : "line",
                    colorMode: "group",
                    groupOf,
                    baseRadius: 6,
                    labels: step === 0,
                  }
            }
            width={w}
            height={400}
            enableHover
          />
        )}
      </Plate>
    </section>
  )
}

// ===========================================================================
// CHAPTER 3 — The hairball and how it lies
// ===========================================================================
const HAIR_STEPS = ["The whole graph", "Filter weak ties", "How it lies"]

function ChapterHairball() {
  const [step, setStep] = useState(0)
  const nodes = N.LESMIS_NODES
  const groupOf = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n.group])), [nodes])
  const strong = useMemo(() => N.LESMIS_EDGES.filter((e) => e.value >= 3), [])
  const { positions: posFull } = useForceLayout(nodes, N.LESMIS_EDGES, { seed: 11 })
  const { positions: posStrong } = useForceLayout(nodes, strong, { seed: 11 })
  const problem = useMemo(
    () => (posFull ? N.findProximityProblem(nodes, N.LESMIS_EDGES, posFull) : null),
    [nodes, posFull],
  )

  const edges = step === 1 ? strong : N.LESMIS_EDGES
  const pos = step === 1 ? posStrong : posFull
  const captions = {
    0: `All ${N.LESMIS_NODES.length} characters and every co-appearance at once. Color marks the communities the algorithm found, but the picture is still a hairball — no amount of palette fixes an over-full node-link diagram.`,
    1: "Keep only the strong ties (three or more scenes together) and the cast falls into legible groups. Filtering, not styling, is usually what rescues a network.",
    2: `The force layout also lies. The marks in red sit close together on screen yet are ${problem?.minHops ?? "several"}+ steps apart in the graph — proximity pretending to be kinship. (More on this in the gestalt primer.)`,
  }

  return (
    <section className="nv-chapter">
      <ChapterHead
        num="3"
        title="The Hairball, and How It Lies"
        lead="Drop a whole edge list into a force-directed layout and you get the chart everyone pictures when they hear 'network': a dense, twitching hairball. It is the default, and it is almost never the answer."
      />
      <Plate
        fig="3.1"
        height={440}
        controls={<Stepper steps={HAIR_STEPS} active={step} onChange={setStep} />}
        caption={captions[step]}
      >
        {(w) =>
          pos ? (
            <NetworkCustomChart
              nodes={nodes}
              edges={edges}
              layout={nodeLinkLayout}
              layoutConfig={{
                pos,
                edges,
                colorMode: "group",
                groupOf,
                baseRadius: 6,
                highlight:
                  step === 2 && problem
                    ? { problem: problem.problemIds, problemRestFill: N.RULE }
                    : null,
              }}
              width={w}
              height={420}
              enableHover
            />
          ) : (
            <NetworkLayoutLoading />
          )
        }
      </Plate>
    </section>
  )
}

// ===========================================================================
// CHAPTER 4 — Reading the edges
// ===========================================================================
const EDGE_STEPS = ["Plain", "Arrowheads", "Curved", "By weight", "Reciprocity"]
const EDGE_ENC = ["line", "arrow", "curved", "weighted", "reciprocity"]
const EDGE_CAPTIONS = {
  0: "Plain undirected lines: who is connected, nothing more. Often that is all you need — but this network is directed, and the lines are hiding it.",
  1: "An arrowhead marks the target. Cheap and conventional, but on a dense graph the heads pile up into illegible clots.",
  2: "Curving each edge frees the two directions of a reciprocal pair and dampens the false parallelism of bundled straight lines.",
  3: "Edge width carries weight. Here thicker means a stronger tie — a second channel of information riding the same line.",
  4: "Sometimes direction matters less than reciprocity. Teal edges are returned (a tie in both directions); oxblood ones are one-way.",
}

function ChapterEdges() {
  const [step, setStep] = useState(0)
  const edges = useMemo(() => N.markReciprocity(N.EDGE_DEMO_EDGES), [])
  const maxValue = useMemo(() => Math.max(...edges.map((e) => e.value), 1), [edges])

  return (
    <section className="nv-chapter">
      <ChapterHead
        num="4"
        title="Reading the Edges"
        lead="A line between two nodes is a topological claim — they are connected — and a graphical primitive with slope, length, and width to spend. Each of those can carry direction, weight, or kind, if you choose deliberately."
      />
      <Plate
        fig="4.1"
        height={380}
        maxWidth={560}
        controls={<Stepper steps={EDGE_STEPS} active={step} onChange={setStep} />}
        caption={EDGE_CAPTIONS[step]}
      >
        {(w) => (
          <NetworkCustomChart
            nodes={N.EDGE_DEMO_NODES}
            edges={edges}
            layout={edgeEncodingLayout}
            layoutConfig={{ pos: N.EDGE_DEMO_LAYOUT, edges, encoding: EDGE_ENC[step], maxValue }}
            width={w}
            height={360}
            enableHover
          />
        )}
      </Plate>
    </section>
  )
}

// ===========================================================================
// CHAPTER 5 — Reading the nodes
// ===========================================================================
function ChapterNodes() {
  const [sizing, setSizing] = useState("degree")
  const [labels, setLabels] = useState(true)
  const [hover, setHover] = useState(null)
  const nodes = N.LESMIS_NODES
  const edges = N.LESMIS_EDGES
  const groupOf = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n.group])), [nodes])
  const { positions: pos } = useForceLayout(nodes, edges, { seed: 5 })
  const sizeById = useMemo(
    () => (sizing === "none" ? null : N.centralityFor(sizing, nodes, edges)),
    [sizing, nodes, edges],
  )
  const ego = useMemo(
    () => (hover ? N.egoIds(nodes, edges, hover, 1) : null),
    [hover, nodes, edges],
  )

  return (
    <section className="nv-chapter">
      <ChapterHead
        num="5"
        title="Reading the Nodes"
        lead="A node can be a dot, or a dot sized by how central it is, or a labelled object you can interrogate. Each addition buys meaning and spends clarity, so add them on purpose and let interaction hide what isn't needed."
      />
      <Plate
        fig="5.1"
        height={440}
        controls={
          <>
            <Toggle
              label="Size by"
              value={sizing}
              onChange={setSizing}
              options={[
                { value: "none", label: "Nothing" },
                { value: "degree", label: "Degree" },
                { value: "betweenness", label: "Betweenness" },
              ]}
            />
            <Switch label="Labels" value={labels} onChange={setLabels} />
          </>
        }
        caption="Hover any character to light up its ego network — itself and its immediate neighbours. It is the simplest, most orienting thing you can add to a graph. Size now encodes each node's centrality."
      >
        {(w) =>
          pos ? (
            <NetworkCustomChart
              nodes={nodes}
              edges={edges}
              layout={nodeLinkLayout}
              layoutConfig={{
                pos,
                edges,
                colorMode: "group",
                groupOf,
                baseRadius: 6,
                sizeById,
                labels,
                highlight: ego ? { active: true, ego } : null,
              }}
              width={w}
              height={420}
              enableHover
              onObservation={(obs) => {
                if (!obs) return
                if (obs.type === "hover") setHover(idOf(obs.datum))
                else if (obs.type === "hover-end") setHover(null)
              }}
            />
          ) : (
            <NetworkLayoutLoading />
          )
        }
      </Plate>
    </section>
  )
}

// ===========================================================================
// CHAPTER 6 — Finding structure
// ===========================================================================
const STRUCT_STEPS = ["Colour by community", "Pull the groups apart"]

function ChapterStructure() {
  const [step, setStep] = useState(0)
  const nodes = N.LESMIS_NODES
  const edges = N.LESMIS_EDGES
  const groupOf = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n.group])), [nodes])
  const { positions: posForce } = useForceLayout(nodes, edges, { seed: 5 })
  const posGrid = useMemo(() => gridByGroup(nodes), [nodes])
  const targetPositions = step === 0 ? posForce : posGrid
  const { positions: pos, animating } = useAnimatedNetworkPositions(targetPositions)
  const groups = useMemo(
    () => [...new Set(nodes.map((n) => n.group))].sort((a, b) => a - b),
    [nodes],
  )

  const captions = {
    0: "Community detection (here, the novel's own books) breaks the abstract whole into nameable chunks. Coloring by community is the single most useful thing you can do to a tangled graph.",
    1: "Pull each community into its own cell and color gains a spatial counterpart. Intrapartition links recede while interpartition links retain their emphasis, making connections between communities easier to trace.",
  }

  return (
    <section className="nv-chapter">
      <ChapterHead
        num="6"
        title="Finding Structure"
        lead="A network is hard precisely because it is one undifferentiated whole. The fix is to decompose it: detect communities, name them after a prominent member, and give each one a place of its own."
      />
      <Plate
        fig="6.1"
        height={460}
        controls={<Stepper steps={STRUCT_STEPS} active={step} onChange={setStep} />}
        caption={captions[step]}
      >
        {(w) =>
          pos ? (
            <NetworkCustomChart
              nodes={nodes}
              edges={edges}
              layout={nodeLinkLayout}
              layoutConfig={{
                pos,
                edges,
                colorMode: "group",
                groupOf,
                baseRadius: 6,
                groupLabels: step === 1 && !animating ? groups : null,
                interGroupEdgeOpacity: step === 1 ? 0.1 : null,
              }}
              width={w}
              height={440}
              enableHover
            />
          ) : (
            <NetworkLayoutLoading />
          )
        }
      </Plate>
    </section>
  )
}

// ===========================================================================
// CHAPTER 7 — Beyond the node-link
// ===========================================================================
const BEYOND_STEPS = ["Chord", "Sankey"]
const BEYOND_CAPTIONS = {
  0: "A chord diagram drops the nodes entirely and shows only the flow between communities — every ribbon a count of shared scenes. It answers 'which groups touch?' far better than any hairball.",
  1: "In the Sankey, each character flows as a ribbon into its community and ribbon width records degree. The same relationships can now be read left to right.",
}

function ChapterBeyond() {
  const [step, setStep] = useState(0)
  const chord = useMemo(() => N.communityChord(N.LESMIS_NODES, N.LESMIS_EDGES), [])
  const sankey = useMemo(() => N.membershipSankey(N.LESMIS_NODES, N.LESMIS_EDGES, 16), [])

  return (
    <section className="nv-chapter">
      <ChapterHead
        num="7"
        title="Beyond the Node-Link"
        lead="A node-link diagram emphasizes individual ties. For questions about flow or aggregate relationships, abandon the dots and use a layout built for those quantities."
      />
      <p>
        The same instinct powers Semiotic&apos;s advanced network work — Sankey variants for non-tree
        flows, multimodal projections, canvas rendering for graphs too large to draw as SVG, and
        constraint-based layouts that make the force algorithm behave. The lesson is constant: match
        the representation to the question, not to the data structure.
      </p>
      <Plate
        fig="7.1"
        height={440}
        controls={<Stepper steps={BEYOND_STEPS} active={step} onChange={setStep} />}
        caption={BEYOND_CAPTIONS[step]}
      >
        {(w) =>
          step === 0 ? (
            <ChordDiagram
              nodes={chord.nodes}
              edges={chord.edges}
              valueAccessor="value"
              colorBy="group"
              colorScheme={N.COMMUNITY_COLORS}
              edgeColorBy="source"
              showLabels
              width={w}
              height={420}
              frameProps={STAGE_BG}
            />
          ) : (
            <SankeyDiagram
              nodes={sankey.nodes}
              edges={sankey.edges}
              nodeIdAccessor="id"
              valueAccessor="value"
              colorBy="group"
              colorScheme={N.COMMUNITY_COLORS}
              edgeColorBy="source"
              orientation="horizontal"
              showLabels
              width={w}
              height={420}
              frameProps={STAGE_BG}
            />
          )
        }
      </Plate>
    </section>
  )
}

// ===========================================================================
// CHAPTER 8 — The Network Toy
// ===========================================================================
const TOY_SAMPLES = N.SAMPLE_GRAPHS

function ChapterToy() {
  const [sampleId, setSampleId] = useState("lesmis")
  const [seed, setSeed] = useState(3)
  const [sizing, setSizing] = useState("degree")
  const [labels, setLabels] = useState(false)
  const [communities, setCommunities] = useState(true)
  const [spatial, setSpatial] = useState(false)
  const [hover, setHover] = useState(null)
  const [path, setPath] = useState({ source: null, target: null })
  const [deleted, setDeleted] = useState(() => new Set())

  const sample = useMemo(() => TOY_SAMPLES.find((s) => s.id === sampleId), [sampleId])
  const rawGraph = useMemo(() => sample.build(seed), [sample, seed])
  const graph = useMemo(() => {
    if (deleted.size === 0) return rawGraph
    const nodes = rawGraph.nodes.filter((n) => !deleted.has(n.id))
    const edges = rawGraph.edges.filter((e) => !deleted.has(e.source) && !deleted.has(e.target))
    return { ...rawGraph, nodes, edges }
  }, [rawGraph, deleted])

  // Lay out the complete sample once. Deleting a node only filters the
  // rendered topology, so every surviving node keeps its exact position and
  // the reader's mental map is preserved.
  const { positions: pos } = useForceLayout(rawGraph.nodes, rawGraph.edges, { seed })
  const groupOf = useMemo(
    () => Object.fromEntries(graph.nodes.map((n) => [n.id, n.group])),
    [graph],
  )
  const sizeById = useMemo(
    () => (sizing === "none" ? null : N.centralityFor(sizing, graph.nodes, graph.edges)),
    [sizing, graph],
  )
  const problem = useMemo(
    () => (spatial && pos ? N.findProximityProblem(graph.nodes, graph.edges, pos) : null),
    [spatial, graph, pos],
  )
  const pathList = useMemo(
    () =>
      path.source && path.target
        ? N.shortestPath(graph.nodes, graph.edges, path.source, path.target)
        : [],
    [path, graph],
  )

  const highlight = useMemo(() => {
    if (spatial && problem) return { problem: problem.problemIds }
    if (pathList.length > 1) {
      const ids = new Set(pathList)
      const edgeKeys = new Set()
      for (let i = 0; i < pathList.length - 1; i += 1) {
        edgeKeys.add(`${pathList[i]}|${pathList[i + 1]}`)
        edgeKeys.add(`${pathList[i + 1]}|${pathList[i]}`)
      }
      return {
        active: true,
        path: ids,
        pathEdges: edgeKeys,
        sourceId: path.source,
        targetId: path.target,
      }
    }
    const focus = hover || path.source
    if (focus) {
      return {
        active: true,
        ego: N.egoIds(graph.nodes, graph.edges, focus, 1),
        sourceId: path.source,
      }
    }
    return null
  }, [spatial, problem, pathList, hover, path, graph])

  const onClick = useCallback((datum) => {
    const id = idOf(datum)
    if (!id) return
    setSpatial(false)
    setPath((p) => {
      if (!p.source) return { source: id, target: null }
      if (!p.target && id !== p.source) return { source: p.source, target: id }
      return { source: id, target: null }
    })
  }, [])

  const deleteRandom = useCallback(() => {
    const live = graph.nodes
    if (live.length <= 3) return
    const victim = live[Math.floor(Math.random() * live.length)]
    setDeleted((d) => new Set(d).add(victim.id))
  }, [graph])

  const reset = useCallback(() => {
    setDeleted(new Set())
    setPath({ source: null, target: null })
    setSpatial(false)
    setSeed((s) => s + 1)
  }, [])

  const hoverNode = hover || path.source
  const hoverStats = hoverNode
    ? {
        id: hoverNode,
        degree: N.degreeMap(graph.nodes, graph.edges)[hoverNode] || 0,
      }
    : null

  return (
    <section className="nv-chapter">
      <ChapterHead
        num="8"
        title="The Network Toy"
        lead="Every technique in this primer, gathered into one sandbox. The toy that taught its author network analysis — pathfinding, centrality, ego networks, the spatial problem — rebuilt with Semiotic's custom-layout escape hatch. Play."
      />

      <div className="nv-toy-controls">
        <Toggle
          label="Graph"
          value={sampleId}
          onChange={(v) => {
            setSampleId(v)
            reset()
          }}
          options={TOY_SAMPLES.map((s) => ({ value: s.id, label: s.label }))}
        />
        <Toggle
          label="Size by"
          value={sizing}
          onChange={setSizing}
          options={[
            { value: "none", label: "—" },
            { value: "degree", label: "Degree" },
            { value: "betweenness", label: "Betweenness" },
            { value: "closeness", label: "Closeness" },
          ]}
        />
        <Switch label="Communities" value={communities} onChange={setCommunities} />
        <Switch label="Labels" value={labels} onChange={setLabels} />
        <Switch
          label="Spatial problem"
          value={spatial}
          onChange={(v) => {
            setSpatial(v)
            if (v) setPath({ source: null, target: null })
          }}
        />
        <button type="button" className="nv-btn" onClick={() => setSeed((s) => s + 1)}>
          Shuffle
        </button>
        <button type="button" className="nv-btn" onClick={deleteRandom}>
          Delete a node
        </button>
        <button type="button" className="nv-btn nv-btn-quiet" onClick={reset}>
          Reset
        </button>
      </div>

      <div className="nv-toy">
        <Stage height={520} maxWidth={900}>
          {(w) =>
            pos ? (
              <NetworkCustomChart
                nodes={graph.nodes}
                edges={graph.edges}
                layout={nodeLinkLayout}
                layoutConfig={{
                  pos,
                  edges: graph.edges,
                  colorMode: communities ? "group" : "uniform",
                  groupOf,
                  baseRadius: 6,
                  sizeById,
                  labels,
                  highlight,
                }}
                width={w}
                height={500}
                enableHover
                onClick={onClick}
                onObservation={(obs) => {
                  if (!obs) return
                  if (obs.type === "hover") setHover(idOf(obs.datum))
                  else if (obs.type === "hover-end") setHover(null)
                }}
              />
            ) : (
              <NetworkLayoutLoading />
            )
          }
        </Stage>

        <aside className="nv-toy-readout">
          <div className="nv-readout-row">
            <span>Nodes</span>
            <strong>{graph.nodes.length}</strong>
          </div>
          <div className="nv-readout-row">
            <span>Edges</span>
            <strong>{graph.edges.length}</strong>
          </div>
          <div className="nv-readout-divider" />
          {hoverStats ? (
            <>
              <div className="nv-readout-focus">{hoverStats.id}</div>
              <div className="nv-readout-row">
                <span>Degree</span>
                <strong>{hoverStats.degree}</strong>
              </div>
            </>
          ) : (
            <p className="nv-readout-hint">Hover a node for its ego network.</p>
          )}
          <div className="nv-readout-divider" />
          {path.source && path.target ? (
            <p className="nv-readout-path">
              {pathList.length > 1 ? (
                <>
                  Shortest path{" "}
                  <strong>
                    {path.source} → {path.target}
                  </strong>
                  : {pathList.length - 1} step{pathList.length - 1 === 1 ? "" : "s"}
                  <span className="nv-readout-route">{pathList.join(" → ")}</span>
                </>
              ) : (
                <>
                  No path between {path.source} and {path.target}.
                </>
              )}
            </p>
          ) : path.source ? (
            <p className="nv-readout-hint">
              <strong>{path.source}</strong> selected — click another node to find the shortest
              path.
            </p>
          ) : (
            <p className="nv-readout-hint">Click two nodes to trace a path.</p>
          )}
        </aside>
      </div>
      <p className="nv-toy-note">
        Sizing runs Brandes betweenness and closeness in the browser; pathfinding is a breadth-first
        search; the spatial-problem detector is the same one behind the gestalt primer. Delete a
        node and every measure recomputes.
      </p>
    </section>
  )
}

function Colophon() {
  return (
    <div className="nv-colophon">
      <p>
        After Elijah Meeks&apos;s 2015 workshop{" "}
        <a href="https://elijahmeeks.com/networkviz/" target="_blank" rel="noopener noreferrer">
          Creating Effective Network Data Visualization with D3
        </a>{" "}
        and the{" "}
        <a href="http://dhs.stanford.edu/dh/networks/" target="_blank" rel="noopener noreferrer">
          Introduction to Networks
        </a>{" "}
        toy — bespoke D3 then, Semiotic now. Network data: the Les Misérables co-appearance graph
        (Knuth), the canonical force-layout test set.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function idOf(datum) {
  if (!datum) return null
  return datum.id ?? datum.data?.id ?? null
}

// Pull each community into a cell of a near-square grid; place its members on
// a small ring inside the cell. Returns normalized { id: {x, y} }.
function gridByGroup(nodes) {
  const groups = [...new Set(nodes.map((n) => n.group))].sort((a, b) => a - b)
  const cols = Math.ceil(Math.sqrt(groups.length))
  const rows = Math.ceil(groups.length / cols)
  const cellW = 1 / cols
  const cellH = 1 / rows
  const pos = {}
  groups.forEach((g, gi) => {
    const cx = (gi % cols) * cellW + cellW / 2
    const cy = Math.floor(gi / cols) * cellH + cellH / 2
    const members = nodes.filter((n) => n.group === g)
    const r = Math.min(cellW, cellH) * 0.36
    members.forEach((n, i) => {
      if (members.length === 1) {
        pos[n.id] = { x: cx, y: cy }
        return
      }
      const a = (i / members.length) * Math.PI * 2
      pos[n.id] = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
    })
  })
  return pos
}

// ---------------------------------------------------------------------------
// Custom network layouts
// ---------------------------------------------------------------------------
function makeMapper(plot, pad) {
  const inset = pad == null ? 26 : pad
  return {
    mx: (nx) => plot.x + inset + nx * (plot.width - 2 * inset),
    my: (ny) => plot.y + inset + ny * (plot.height - 2 * inset),
  }
}

// The workhorse: node-link with optional arcs, weighting, sizing, labels,
// community color, and ego/path/spatial highlighting.
function nodeLinkLayout(ctx) {
  const { plot } = ctx.dimensions
  const cfg = ctx.config
  const { mx, my } = makeMapper(plot, cfg.pad ?? 28)
  const pos = cfg.pos || {}
  const edges = cfg.edges || []
  const hl = cfg.highlight || null
  const dim = !!(hl && hl.active)
  const sizeById = cfg.sizeById
  const base = cfg.baseRadius ?? 7
  const maxV = cfg.maxValue || 1
  const radiusOf = (id) => (sizeById ? 3 + (sizeById[id] || 0) * 14 : base)

  const sceneEdges = edges
    .map((e, i) => {
      const pa = pos[e.source]
      const pb = pos[e.target]
      if (!pa || !pb) return null
      const a = { x: mx(pa.x), y: my(pa.y) }
      const b = { x: mx(pb.x), y: my(pb.y) }
      const inPath =
        hl?.pathEdges &&
        (hl.pathEdges.has(`${e.source}|${e.target}`) || hl.pathEdges.has(`${e.target}|${e.source}`))
      const inEgo = hl?.ego && hl.ego.has(e.source) && hl.ego.has(e.target)
      let stroke = N.INK
      if (cfg.reciprocalColor) stroke = e.reciprocal ? N.COMMUNITY_COLORS[1] : N.OXBLOOD
      if (inPath) stroke = N.OXBLOOD
      let width = cfg.weightByValue ? 0.8 + (e.value / maxV) * 5 : 1.1
      if (inPath) width = 3
      let opacity = 0.42
      const sourceGroup = cfg.groupOf?.[e.source]
      const isInterGroup = sourceGroup == null || sourceGroup != cfg.groupOf[e.target]
      if (isInterGroup && cfg.interGroupEdgeOpacity != null) {
        opacity = cfg.interGroupEdgeOpacity
      }
      if (dim) opacity = inPath || inEgo ? 0.9 : 0.05
      const style = { stroke, strokeWidth: width, opacity }
      if (cfg.edgeShape === "arc") {
        const cxm = (a.x + b.x) / 2
        const cym = a.y - Math.abs(b.x - a.x) * 0.55 - 8
        return {
          type: "curved",
          pathD: `M${a.x},${a.y} Q${cxm},${cym} ${b.x},${b.y}`,
          style,
          datum: e,
        }
      }
      return { type: "line", x1: a.x, y1: a.y, x2: b.x, y2: b.y, style, datum: e, _k: i }
    })
    .filter(Boolean)

  const sceneNodes = ctx.nodes
    .map((n) => {
      const p = pos[n.id]
      if (!p) return null
      const r = radiusOf(n.id)
      let fill =
        cfg.colorMode === "group"
          ? N.groupColor(cfg.groupOf?.[n.id])
          : cfg.colorMode === "uniform"
            ? N.OXBLOOD
            : N.INK
      let stroke = N.INK
      let sw = 1
      let opacity = 1
      if (hl?.problem) {
        fill = hl.problem.has(n.id) ? "#c0341d" : (hl.problemRestFill ?? fill)
      }
      if (dim) {
        const on = (hl.ego && hl.ego.has(n.id)) || (hl.path && hl.path.has(n.id))
        if (!on) opacity = 0.16
      }
      if (hl && (n.id === hl.sourceId || n.id === hl.targetId)) {
        stroke = N.OXBLOOD
        sw = 3
      }
      return {
        type: "circle",
        cx: mx(p.x),
        cy: my(p.y),
        r,
        style: { fill, stroke, strokeWidth: sw, opacity },
        datum: n.data || n,
        id: n.id,
      }
    })
    .filter(Boolean)

  let labels
  if (cfg.labels) {
    labels = ctx.nodes
      .map((n) => {
        const p = pos[n.id]
        if (!p) return null
        const on = !dim || (hl.ego && hl.ego.has(n.id)) || (hl.path && hl.path.has(n.id))
        return {
          x: mx(p.x),
          y: my(p.y) - radiusOf(n.id) - 5,
          text: n.id,
          anchor: "middle",
          fontSize: 11,
          fill: on ? N.INK : "rgba(42,36,29,0.22)",
          stroke: N.PAPER,
          strokeWidth: 3,
          paintOrder: "stroke",
        }
      })
      .filter(Boolean)
  }

  let overlays = null
  if (cfg.groupLabels) {
    const labelPos = {}
    cfg.groupLabels.forEach((g) => {
      const members = ctx.nodes.filter((n) => cfg.groupOf?.[n.id] === g)
      if (!members.length) return
      const xs = members.map((m) => pos[m.id]?.x).filter((v) => v != null)
      const ys = members.map((m) => pos[m.id]?.y).filter((v) => v != null)
      labelPos[g] = {
        x: mx(xs.reduce((s, v) => s + v, 0) / xs.length),
        y: my(Math.min(...ys)) - 12,
      }
    })
    overlays = (
      <g>
        {cfg.groupLabels.map((g) =>
          labelPos[g] ? (
            <text
              key={g}
              x={labelPos[g].x}
              y={labelPos[g].y}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill={N.groupColor(g)}
            >
              Community {g + 1}
            </text>
          ) : null,
        )}
      </g>
    )
  }

  return { sceneNodes, sceneEdges, labels, overlays }
}

// Adjacency matrix — one filled cell per connection, never an overlapping edge.
function matrixLayout(ctx) {
  const { plot } = ctx.dimensions
  const cfg = ctx.config
  const ids = cfg.ids
  const n = ids.length
  const side = Math.min(plot.width, plot.height) * 0.84
  const ox = plot.x + (plot.width - side) / 2 + 18
  const oy = plot.y + (plot.height - side) / 2 + 6
  const cell = (side - 18) / n

  const sceneNodes = []
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue
      const key = ids[i] < ids[j] ? `${ids[i]}|${ids[j]}` : `${ids[j]}|${ids[i]}`
      const v = cfg.valueByPair.get(key)
      if (!v) continue
      sceneNodes.push({
        type: "rect",
        x: ox + j * cell,
        y: oy + i * cell,
        w: cell - 1.5,
        h: cell - 1.5,
        style: {
          fill: N.groupColor(cfg.groupOf[ids[i]]),
          opacity: 0.3 + 0.65 * (v / cfg.maxValue),
        },
        datum: { a: ids[i], b: ids[j], value: v },
        id: `${ids[i]}-${ids[j]}`,
      })
    }
  }

  const labels = ids.map((id, i) => ({
    x: ox - 6,
    y: oy + i * cell + cell / 2 + 3,
    text: id,
    anchor: "end",
    fontSize: 10,
    fill: N.INK,
  }))

  const overlays = (
    <g>
      {ids.map((id, j) => (
        <text
          key={id}
          transform={`translate(${ox + j * cell + cell / 2 + 3},${oy - 6}) rotate(-50)`}
          fontSize="10"
          fill={N.INK}
          textAnchor="start"
        >
          {id}
        </text>
      ))}
    </g>
  )

  return { sceneNodes, labels, overlays }
}

// Directed edge encodings drawn as SVG overlays (so arrowheads + curves work),
// with transparent hit targets for interaction + accessibility.
function edgeEncodingLayout(ctx) {
  const { plot } = ctx.dimensions
  const cfg = ctx.config
  const { mx, my } = makeMapper(plot, 36)
  const R = 14
  const enc = cfg.encoding
  const max = cfg.maxValue || 1

  const trim = (a, b, r) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.hypot(dx, dy) || 1
    return {
      fx: a.x + (dx / d) * r,
      fy: a.y + (dy / d) * r,
      tx: b.x - (dx / d) * r,
      ty: b.y - (dy / d) * r,
    }
  }

  const edgeEls = cfg.edges
    .map((e, i) => {
      const pa = cfg.pos[e.source]
      const pb = cfg.pos[e.target]
      if (!pa || !pb) return null
      const a = { x: mx(pa.x), y: my(pa.y) }
      const b = { x: mx(pb.x), y: my(pb.y) }
      const s = trim(a, b, R)
      let stroke = N.INK
      let width = 1.6
      let marker
      if (enc === "weighted") width = 0.8 + (e.value / max) * 6
      if (enc === "reciprocity") {
        stroke = e.reciprocal ? N.COMMUNITY_COLORS[1] : N.OXBLOOD
        width = 2.4
      }
      if (enc === "arrow") marker = "url(#nv-arrow)"
      if (enc === "curved") {
        const dr = Math.hypot(b.x - a.x, b.y - a.y) * 1.1
        marker = "url(#nv-arrow)"
        return (
          <path
            key={i}
            d={`M${s.fx},${s.fy}A${dr},${dr} 0 0,1 ${s.tx},${s.ty}`}
            fill="none"
            stroke={stroke}
            strokeWidth={width}
            markerEnd={marker}
            opacity={0.85}
          />
        )
      }
      return (
        <line
          key={i}
          x1={s.fx}
          y1={s.fy}
          x2={s.tx}
          y2={s.ty}
          stroke={stroke}
          strokeWidth={width}
          markerEnd={marker}
          opacity={0.85}
        />
      )
    })
    .filter(Boolean)

  const nodeEls = ctx.nodes
    .map((n) => {
      const p = cfg.pos[n.id]
      if (!p) return null
      const x = mx(p.x)
      const y = my(p.y)
      return (
        <g key={n.id}>
          <circle
            cx={x}
            cy={y}
            r={R}
            fill={N.groupColor(n.data?.group ?? n.group)}
            stroke={N.INK}
            strokeWidth={1.2}
          />
          <text x={x} y={y + R + 13} textAnchor="middle" fontSize="11" fill={N.INK}>
            {n.id}
          </text>
        </g>
      )
    })
    .filter(Boolean)

  const overlays = (
    <g>
      <defs>
        <marker id="nv-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 z" fill={N.INK} />
        </marker>
      </defs>
      {edgeEls}
      {nodeEls}
    </g>
  )

  const sceneNodes = ctx.nodes
    .map((n) => {
      const p = cfg.pos[n.id]
      if (!p) return null
      return networkHitTarget({ x: mx(p.x), y: my(p.y), r: R, datum: n.data || n, id: n.id })
    })
    .filter(Boolean)

  return { sceneNodes, overlays }
}
