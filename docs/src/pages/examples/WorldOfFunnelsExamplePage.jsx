import React, { useMemo, useState } from "react"
import { FunnelChart, ProcessSankey, SankeyDiagram } from "semiotic"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./WorldOfFunnelsExamplePage.css"

const POP_COLORS = {
  ink: "#101014",
  paper: "#fff7d6",
  pink: "#ff4fa3",
  yellow: "#ffd84d",
  cyan: "#14c7ff",
  green: "#42d66b",
  red: "#ff4d42",
  purple: "#8b5cf6",
}

const cohortFunnel = [
  { step: "Visit", cohort: "Original", value: 10000 },
  { step: "Visit", cohort: "Bigger buttons", value: 10000 },
  { step: "Visit", cohort: "More buttons", value: 10000 },
  { step: "Visit", cohort: "3D buttons", value: 10000 },
  { step: "Product view", cohort: "Original", value: 6400 },
  { step: "Product view", cohort: "Bigger buttons", value: 6900 },
  { step: "Product view", cohort: "More buttons", value: 6100 },
  { step: "Product view", cohort: "3D buttons", value: 5800 },
  { step: "Add to cart", cohort: "Original", value: 3200 },
  { step: "Add to cart", cohort: "Bigger buttons", value: 4100 },
  { step: "Add to cart", cohort: "More buttons", value: 3000 },
  { step: "Add to cart", cohort: "3D buttons", value: 2600 },
  { step: "Checkout", cohort: "Original", value: 1800 },
  { step: "Checkout", cohort: "Bigger buttons", value: 2700 },
  { step: "Checkout", cohort: "More buttons", value: 1600 },
  { step: "Checkout", cohort: "3D buttons", value: 1200 },
  { step: "Bought candy", cohort: "Original", value: 920 },
  { step: "Bought candy", cohort: "Bigger buttons", value: 1780 },
  { step: "Bought candy", cohort: "More buttons", value: 840 },
  { step: "Bought candy", cohort: "3D buttons", value: 610 },
]

const scenarioCases = [
  {
    id: "candy",
    label: "Candy Shop",
    eyebrow: "commerce funnel",
    question: "A button test wins, but where did the shoppers go?",
    readout: "1,380 bought candy",
    color: POP_COLORS.pink,
    preciseClaim: "Five ordered stages make the checkout leak painfully clear.",
    accurateClaim: "Search, support, returns, and loops are part of the product, not noise.",
    detourValue: 4870,
    funnel: [
      { step: "Arrive", value: 9400 },
      { step: "Product", value: 6700 },
      { step: "Cart", value: 3820 },
      { step: "Checkout", value: 2650 },
      { step: "Bought", value: 1380 },
    ],
    nodes: [
      { id: "Arrive", type: "Start" },
      { id: "Product", type: "Step" },
      { id: "About", type: "Step" },
      { id: "Search", type: "Loop" },
      { id: "Cart", type: "Step" },
      { id: "Checkout", type: "Step" },
      { id: "Support", type: "Loop" },
      { id: "Bought", type: "Good" },
      { id: "Returned shoes", type: "Bad" },
    ],
    edges: [
      { source: "Arrive", target: "Product", value: 5800 },
      { source: "Arrive", target: "About", value: 2100, detour: true },
      { source: "Arrive", target: "Search", value: 1500, detour: true },
      { source: "Product", target: "Cart", value: 3100 },
      { source: "Product", target: "Search", value: 1400, detour: true },
      { source: "Search", target: "Product", value: 1800, detour: true },
      { source: "About", target: "Product", value: 900, detour: true },
      { source: "Cart", target: "Checkout", value: 2100 },
      { source: "Cart", target: "Product", value: 720, detour: true },
      { source: "Checkout", target: "Bought", value: 1380 },
      { source: "Checkout", target: "Support", value: 360, detour: true },
      { source: "Support", target: "Checkout", value: 190, detour: true },
      { source: "Checkout", target: "Returned shoes", value: 120, detour: true },
    ],
    findings: [
      "Search is not just discovery. It is also repair after Product fails.",
      "Cart sends 720 shoppers backward, which a collapsed funnel calls abandonment.",
      "Support is late enough to look small and early enough to change outcomes.",
    ],
  },
  {
    id: "essay",
    label: "Essay Reader",
    eyebrow: "attention funnel",
    question: "The essay narrows cleanly until rereads and shares reappear.",
    readout: "980 finished",
    color: POP_COLORS.cyan,
    preciseClaim: "Completion is a crisp 8 percent, which is precise and depressing.",
    accurateClaim: "Skimming, sharing, and returning later are real reading behaviors.",
    detourValue: 6510,
    funnel: [
      { step: "Found link", value: 12000 },
      { step: "Opened essay", value: 8400 },
      { step: "Reached diagram", value: 6100 },
      { step: "Hit accuracy", value: 3100 },
      { step: "Finished", value: 980 },
    ],
    nodes: [
      { id: "Found link", type: "Start" },
      { id: "Opened essay", type: "Step" },
      { id: "Skimmed lead", type: "Loop" },
      { id: "Reached diagram", type: "Step" },
      { id: "Hit accuracy", type: "Step" },
      { id: "Shared", type: "Good" },
      { id: "Returned later", type: "Loop" },
      { id: "Finished", type: "Good" },
      { id: "Closed tab", type: "Bad" },
    ],
    edges: [
      { source: "Found link", target: "Opened essay", value: 8400 },
      { source: "Found link", target: "Closed tab", value: 3600, detour: true },
      { source: "Opened essay", target: "Skimmed lead", value: 6000, detour: true },
      { source: "Opened essay", target: "Reached diagram", value: 1800 },
      { source: "Opened essay", target: "Closed tab", value: 600, detour: true },
      { source: "Skimmed lead", target: "Reached diagram", value: 4100, detour: true },
      { source: "Skimmed lead", target: "Closed tab", value: 1900, detour: true },
      { source: "Reached diagram", target: "Hit accuracy", value: 2500 },
      { source: "Reached diagram", target: "Shared", value: 400, detour: true },
      { source: "Reached diagram", target: "Closed tab", value: 3000, detour: true },
      { source: "Hit accuracy", target: "Finished", value: 980 },
      { source: "Hit accuracy", target: "Returned later", value: 760, detour: true },
      { source: "Returned later", target: "Finished", value: 310, detour: true },
    ],
    findings: [
      "A reader who shares before finishing is not a failure case.",
      "Returning later is a loop in time, not a smaller bar.",
      "The diagram has two jobs: retention for some readers, exit ramp for others.",
    ],
  },
  {
    id: "support",
    label: "Support Desk",
    eyebrow: "service funnel",
    question: "Resolution is not a line when people retry the fix.",
    readout: "980 retained",
    color: POP_COLORS.green,
    preciseClaim: "Support looks like throughput: file, answer, fix, resolve, retain.",
    accurateClaim: "Self-service, escalation, and retry loops are the operating system.",
    detourValue: 5530,
    funnel: [
      { step: "Filed issue", value: 5200 },
      { step: "Received answer", value: 3900 },
      { step: "Tried fix", value: 2600 },
      { step: "Resolved", value: 1700 },
      { step: "Retained", value: 980 },
    ],
    nodes: [
      { id: "Filed issue", type: "Start" },
      { id: "Docs", type: "Step" },
      { id: "Chat", type: "Loop" },
      { id: "Email", type: "Step" },
      { id: "Agent", type: "Step" },
      { id: "Tried fix", type: "Step" },
      { id: "Resolved", type: "Good" },
      { id: "Retained", type: "Good" },
      { id: "Exit", type: "Bad" },
    ],
    edges: [
      { source: "Filed issue", target: "Docs", value: 2100, detour: true },
      { source: "Filed issue", target: "Chat", value: 1800, detour: true },
      { source: "Filed issue", target: "Email", value: 1300 },
      { source: "Docs", target: "Tried fix", value: 1300, detour: true },
      { source: "Docs", target: "Chat", value: 500, detour: true },
      { source: "Docs", target: "Exit", value: 300, detour: true },
      { source: "Chat", target: "Agent", value: 1600, detour: true },
      { source: "Email", target: "Agent", value: 900 },
      { source: "Agent", target: "Tried fix", value: 1800 },
      { source: "Tried fix", target: "Resolved", value: 1700 },
      { source: "Tried fix", target: "Filed issue", value: 420, detour: true },
      { source: "Resolved", target: "Retained", value: 980 },
      { source: "Resolved", target: "Exit", value: 500, detour: true },
    ],
    findings: [
      "Docs deflect work only when they reconnect cleanly to a fix.",
      "Retrying the same issue is demand, not disappearance.",
      "Retention depends on the repair loop being visible enough to improve.",
    ],
  },
]

const D = (day) => new Date(2026, 0, day).getTime()

const motifNodes = [
  { id: "Landing", category: "Stage" },
  { id: "Browse", category: "Stage" },
  { id: "Compare", category: "Stage" },
  { id: "Cart", category: "Stage" },
  { id: "Checkout", category: "Stage" },
  { id: "Purchase", category: "Outcome" },
  { id: "Support", category: "Repair" },
  { id: "Exit", category: "Outcome" },
]

const motifEdges = [
  {
    id: "happy-1",
    source: "Landing",
    target: "Browse",
    value: 52,
    motif: "happy",
    startTime: D(1),
    endTime: D(3),
  },
  {
    id: "happy-2",
    source: "Browse",
    target: "Cart",
    value: 44,
    motif: "happy",
    startTime: D(3),
    endTime: D(6),
  },
  {
    id: "happy-3",
    source: "Cart",
    target: "Checkout",
    value: 38,
    motif: "happy",
    startTime: D(6),
    endTime: D(8),
  },
  {
    id: "happy-4",
    source: "Checkout",
    target: "Purchase",
    value: 31,
    motif: "happy",
    startTime: D(8),
    endTime: D(10),
  },
  {
    id: "comparison-1",
    source: "Browse",
    target: "Compare",
    value: 27,
    motif: "comparison",
    startTime: D(3),
    endTime: D(5),
  },
  {
    id: "comparison-2",
    source: "Compare",
    target: "Browse",
    value: 19,
    motif: "comparison",
    startTime: D(5),
    endTime: D(7),
  },
  {
    id: "repair-1",
    source: "Checkout",
    target: "Support",
    value: 11,
    motif: "repair",
    startTime: D(8),
    endTime: D(11),
  },
  {
    id: "repair-2",
    source: "Support",
    target: "Checkout",
    value: 6,
    motif: "repair",
    startTime: D(11),
    endTime: D(13),
  },
  {
    id: "exit-1",
    source: "Cart",
    target: "Exit",
    value: 21,
    motif: "exit",
    startTime: D(6),
    endTime: D(9),
  },
]

const motifDomain = [D(1), D(14)]
const motifAxisTicks = [
  { date: D(1), label: "Day 1" },
  { date: D(5), label: "Day 5" },
  { date: D(9), label: "Day 9" },
  { date: D(13), label: "Day 13" },
]

const motifOptions = [
  { id: "all", label: "All motifs", title: "Happy path, comparison loop, repair loop, and exit path" },
  { id: "happy", label: "Happy path", title: "The happy path still shares space with alternatives" },
  { id: "comparison", label: "Compare loop", title: "Comparison is a loop, not a one-step drop" },
  { id: "repair", label: "Repair loop", title: "Repair work returns people to checkout" },
  { id: "exit", label: "Exit path", title: "Exit is an outcome with timing and volume" },
]

const modePanelNotes = {
  evidence: {
    precise: {
      label: "Precise reading",
      note: "The stage strip, leak tape, and funnel agree on the biggest narrowing.",
    },
    accurate: {
      label: "Accurate reading",
      note: "The same funnel stays useful as a controlled collapse, but the note marks what it cannot show.",
    },
  },
  experiment: {
    precise: {
      label: "Precise reading",
      note: "Equally effective here: cohort testing is a straight comparison, so the ordered funnel is the right instrument.",
    },
    accurate: {
      label: "Accurate reading",
      note: "Equally effective here: this question asks which cohort moved farther, not where every detour went.",
    },
  },
  argument: {
    precise: {
      label: "Precise reading",
      note: "The chart compresses the case into one comparable path.",
    },
    accurate: {
      label: "Accurate reading",
      note: "The chart opens the case into branches, loops, and recoveries.",
    },
  },
  motifs: {
    precise: {
      label: "Precise reading",
      note: "The temporal view still works, but particles pause so path volume and timing carry the comparison.",
    },
    accurate: {
      label: "Accurate reading",
      note: "Particles turn on to emphasize that these motifs are moving behaviors, not static drop-offs.",
    },
  },
  close: {
    precise: {
      label: "Precise reading",
      note: "The conclusion treats the funnel as a sharp measuring instrument.",
    },
    accurate: {
      label: "Accurate reading",
      note: "The conclusion treats the funnel as one layer in a larger flow argument.",
    },
  },
}

function formatNumber(value) {
  return value.toLocaleString("en-US")
}

function getDropRows(funnel) {
  return funnel.slice(1).map((row, index) => {
    const previous = funnel[index]
    const drop = previous.value - row.value
    return {
      from: previous.step,
      to: row.step,
      drop,
      rate: Math.round((drop / previous.value) * 100),
    }
  })
}

function Kicker({ children }) {
  return <p className="wof-kicker">{children}</p>
}

function PopPanel({ label, title, children, variant = "plain" }) {
  return (
    <section className={`wof-panel wof-panel--${variant}`}>
      <div className="wof-panel-label">{label}</div>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function MetricStrip({ metrics }) {
  return (
    <div className="wof-metrics" aria-label="Funnel metrics">
      {metrics.map((metric) => (
        <div className="wof-metric" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          {metric.note && <em>{metric.note}</em>}
        </div>
      ))}
    </div>
  )
}

function CaseSelector({ cases, selectedId, onSelect }) {
  return (
    <div className="wof-case-selector" role="group" aria-label="Choose a funnel case file">
      {cases.map((scenario, index) => (
        <button
          key={scenario.id}
          className={scenario.id === selectedId ? "is-active" : ""}
          type="button"
          onClick={() => onSelect(scenario.id)}
          aria-pressed={scenario.id === selectedId}
        >
          <span>Case {String(index + 1).padStart(2, "0")} / {scenario.eyebrow}</span>
          <strong>{scenario.label}</strong>
          <em>{scenario.question}</em>
          <b>{scenario.readout}</b>
        </button>
      ))}
    </div>
  )
}

function StageStrip({ data }) {
  const total = data[0]?.value || 1

  return (
    <ol className="wof-stage-strip" aria-label="Selected funnel stages">
      {data.map((row, index) => (
        <li
          key={row.step}
          style={{ "--stage-share": `${Math.max(9, (row.value / total) * 100)}%` }}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{row.step}</strong>
          <em>{formatNumber(row.value)}</em>
          <i aria-hidden="true" />
        </li>
      ))}
    </ol>
  )
}

function LeakTape({ rows }) {
  return (
    <div className="wof-leak-tape" aria-label="Largest step losses">
      {rows.slice(0, 3).map((row) => (
        <div key={`${row.from}-${row.to}`}>
          <span>{row.from} {"->"} {row.to}</span>
          <strong>-{formatNumber(row.drop)}</strong>
          <em>{row.rate}% leak</em>
        </div>
      ))}
    </div>
  )
}

function ModeToggle({ mode, onChange }) {
  return (
    <div className="wof-toggle" role="group" aria-label="Comparison mode">
      {[
        ["precise", "Precise"],
        ["accurate", "Accurate"],
      ].map(([id, label]) => (
        <button
          key={id}
          className={mode === id ? "is-active" : ""}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={mode === id}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function CompactCaseSelector({ cases, selectedId, onSelect }) {
  return (
    <div className="wof-compact-cases" role="group" aria-label="Choose funnel case">
      {cases.map((scenario) => (
        <button
          key={scenario.id}
          className={scenario.id === selectedId ? "is-active" : ""}
          type="button"
          onClick={() => onSelect(scenario.id)}
          aria-pressed={scenario.id === selectedId}
        >
          {scenario.label}
        </button>
      ))}
    </div>
  )
}

function ModeNote({ mode, note }) {
  return (
    <div className={`wof-mode-note wof-mode-note--${mode}`} aria-live="polite">
      <span>{note.label}</span>
      <strong>{note.note}</strong>
    </div>
  )
}

function ArgumentRibbon({ scenario, mode }) {
  return (
    <div className="wof-argument-ribbon" aria-live="polite">
      <div className={mode === "precise" ? "is-active" : ""}>
        <span>Precise</span>
        <strong>{scenario.preciseClaim}</strong>
      </div>
      <div className="wof-ribbon-vs" aria-hidden="true">VS</div>
      <div className={mode === "accurate" ? "is-active" : ""}>
        <span>Accurate</span>
        <strong>{scenario.accurateClaim}</strong>
      </div>
    </div>
  )
}

function FlowFindings({ findings }) {
  return (
    <ul className="wof-findings">
      {findings.map((finding) => (
        <li key={finding}>{finding}</li>
      ))}
    </ul>
  )
}

function MotifFocusControls({ activeMotif, onChange }) {
  return (
    <div className="wof-motif-controls" role="group" aria-label="Temporal motif focus">
      {motifOptions.map((option) => (
        <button
          key={option.id}
          className={activeMotif === option.id ? "is-active" : ""}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={activeMotif === option.id}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default function WorldOfFunnelsExamplePage() {
  const [selectedCaseId, setSelectedCaseId] = useState("candy")
  const [mode, setMode] = useState("precise")
  const [activeMotif, setActiveMotif] = useState("all")
  const [chartWidth, chartRef] = useResponsiveWidth(320, 1040)

  const selectedCase = useMemo(
    () => scenarioCases.find((scenario) => scenario.id === selectedCaseId) || scenarioCases[0],
    [selectedCaseId],
  )

  const dropRows = useMemo(() => {
    return getDropRows(selectedCase.funnel).sort((a, b) => b.drop - a.drop)
  }, [selectedCase])

  const stats = useMemo(() => {
    const first = selectedCase.funnel[0].value
    const last = selectedCase.funnel[selectedCase.funnel.length - 1].value
    const worst = dropRows[0]
    const best = cohortFunnel.find(
      (row) => row.step === "Bought candy" && row.cohort === "Bigger buttons",
    )

    return [
      {
        label: "Selected conversion",
        value: `${Math.round((last / first) * 100)}%`,
        note: `${formatNumber(last)} of ${formatNumber(first)}`,
      },
      {
        label: "Hardest visible drop",
        value: `-${worst.rate}%`,
        note: `${worst.from} -> ${worst.to}`,
      },
      {
        label: "Hidden flow exposed",
        value: `${Math.round((selectedCase.detourValue / first) * 100)}%`,
        note: "traffic outside the straight line",
      },
      {
        label: "Best A/B lift",
        value: `+${Math.round(((best.value - 920) / 920) * 100)}%`,
        note: "bigger buttons vs. original",
      },
    ]
  }, [dropRows, selectedCase])

  const chartColors = [
    POP_COLORS.pink,
    POP_COLORS.cyan,
    POP_COLORS.yellow,
    POP_COLORS.green,
    POP_COLORS.purple,
    POP_COLORS.red,
  ]

  const focusedMotif = motifOptions.find((option) => option.id === activeMotif) || motifOptions[0]
  const motifEdgesForView = useMemo(() => {
    if (activeMotif === "all") return motifEdges
    return motifEdges.map((edge) => ({
      ...edge,
      value: edge.motif === activeMotif ? edge.value : Math.max(2, Math.round(edge.value * 0.16)),
    }))
  }, [activeMotif])

  return (
    <ExamplePageLayout title="We Live in a World of Funnels">
      <div className="wof-page">
        <header className="wof-hero">
          <div className="wof-burst" aria-hidden="true">POW</div>
          <div>
            <Kicker>Precision, accuracy, and the paths we erase</Kicker>
            <p className="wof-lede">
              You think you are reading an essay. You are moving through a funnel. The
              trick is deciding when the clean shape is a useful instrument and when it
              starts hiding the actual system.
            </p>
          </div>
          <div className="wof-hero-strip" aria-hidden="true">
            <span>measure</span>
            <span>collapse</span>
            <span>compare</span>
            <span>restore the paths</span>
          </div>
        </header>

        <CaseSelector
          cases={scenarioCases}
          selectedId={selectedCaseId}
          onSelect={setSelectedCaseId}
        />

        <MetricStrip metrics={stats} />

        <div className="wof-control-row">
          <ModeToggle mode={mode} onChange={setMode} />
          <CompactCaseSelector
            cases={scenarioCases}
            selectedId={selectedCaseId}
            onSelect={setSelectedCaseId}
          />
          <p>
            Same case file, two charting attitudes. The first is excellent at comparison.
            The second admits that behavior has loops.
          </p>
        </div>

        <ArgumentRibbon scenario={selectedCase} mode={mode} />

        <div ref={chartRef} className="wof-chart-host">
          <PopPanel label="01" title={`${selectedCase.label}: the funnel as evidence`} variant="lead">
            <p>
              A simple funnel turns a process into comparable widths. It is direct,
              boardroom-friendly, and useful for a first pass. It is also a decision to
              treat all off-path behavior as loss.
            </p>
            <ModeNote mode={mode} note={modePanelNotes.evidence[mode]} />
            <StageStrip data={selectedCase.funnel} />
            <LeakTape rows={dropRows} />
            <FunnelChart
              data={selectedCase.funnel}
              stepAccessor="step"
              valueAccessor="value"
              width={chartWidth}
              height={420}
              colorScheme={[selectedCase.color]}
              title={`${selectedCase.label}: collapsed stages`}
              tooltip
            />
          </PopPanel>

          <PopPanel label="02" title="A/B funnels reward the intervention that moves the line">
            <p>
              Product funnels are often used this way: compare cohorts, color the
              winners, ship the design that carries more people deeper. The vertical
              view makes drop-off legible as retained value plus lost opportunity.
            </p>
            <ModeNote mode={mode} note={modePanelNotes.experiment[mode]} />
            <FunnelChart
              data={cohortFunnel}
              stepAccessor="step"
              valueAccessor="value"
              categoryAccessor="cohort"
              colorBy="cohort"
              colorScheme={[
                "#1d1d1f",
                POP_COLORS.green,
                POP_COLORS.cyan,
                POP_COLORS.yellow,
              ]}
              orientation="vertical"
              width={chartWidth}
              height={470}
              title="Button experiment: conversion by cohort"
              showLegend
              tooltip
            />
          </PopPanel>

          <PopPanel
            label="03"
            title={
              mode === "precise"
                ? "Precision says the story is shrinking"
                : "Accuracy says the story is branching"
            }
            variant={mode}
          >
            <p>
              Toggle the argument, not the case file. The precise view emphasizes ordered
              loss. The accurate view reveals repair, rereading, searching, and exits
              that create design questions a single funnel cannot ask.
            </p>
            <ModeNote mode={mode} note={modePanelNotes.argument[mode]} />
            {mode === "precise" ? (
              <FunnelChart
                data={selectedCase.funnel}
                stepAccessor="step"
                valueAccessor="value"
                width={chartWidth}
                height={390}
                colorScheme={[POP_COLORS.cyan]}
                title={`${selectedCase.label}: collapsed path`}
                tooltip
              />
            ) : (
              <>
                <FlowFindings findings={selectedCase.findings} />
                <SankeyDiagram
                  nodes={selectedCase.nodes}
                  edges={selectedCase.edges}
                  nodeIdAccessor="id"
                  sourceAccessor="source"
                  targetAccessor="target"
                  valueAccessor="value"
                  colorBy="type"
                  colorScheme={chartColors}
                  edgeColorBy="source"
                  nodeWidth={18}
                  nodePaddingRatio={0.08}
                  width={chartWidth}
                  height={430}
                  title={`${selectedCase.label}: observed paths with loops`}
                  tooltip
                />
              </>
            )}
          </PopPanel>

          <PopPanel label="04" title="Motifs are paths with names">
            <p>
              Teams already talk about happy paths and bad paths. A temporal process
              sankey makes those motifs explicit: repair loops, comparison loops, and
              exits all occupy time and capacity even when they are not the goal.
            </p>
            <ModeNote mode={mode} note={modePanelNotes.motifs[mode]} />
            <MotifFocusControls activeMotif={activeMotif} onChange={setActiveMotif} />
            <ProcessSankey
              nodes={motifNodes}
              edges={motifEdgesForView}
              domain={motifDomain}
              axisTicks={motifAxisTicks}
              colorBy="category"
              colorScheme={chartColors}
              width={chartWidth}
              height={480}
              title={focusedMotif.title}
              showLegend
              showParticles={mode === "accurate"}
              tooltip
            />
          </PopPanel>
        </div>

        <section className="wof-close">
          <Kicker>The Semiotic point</Kicker>
          <ModeNote mode={mode} note={modePanelNotes.close[mode]} />
          <p>
            The danger is not that funnel charts are wrong. The danger is letting the
            chart&apos;s clean shape become the system&apos;s design brief. Semiotic&apos;s value here
            is the ability to move between precise ordinal views and more accurate flow
            views without leaving the same React data-visualization surface.
          </p>
        </section>
      </div>
    </ExamplePageLayout>
  )
}
