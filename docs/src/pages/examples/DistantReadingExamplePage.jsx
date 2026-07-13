import React, { useMemo, useState } from "react"
import { BarChart, LineChart, SankeyDiagram, Scatterplot, ThemeProvider } from "semiotic"
import CodeBlock from "../../components/CodeBlock"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  BOOKS,
  CORPUS_CHAPTER_FINGERPRINTS,
  PHASES,
  SIGNALS,
  getBook,
  phaseRows,
  signalById,
  signalRows,
  topChapterFor,
} from "./data/distantReading"
import "./DistantReadingExamplePage.css"

const TYPE_COLORS = ["#4f6fb3", "#d95f43", "#1f9a8a", "#e0a92f", "#b33b65", "#6d7340"]

const implementationCode = `import { LineChart, BarChart, SankeyDiagram } from "semiotic"
import { BOOKS, signalRows, phaseRows } from "./data/distantReading"

const book = BOOKS.find((d) => d.id === "frankenstein")
const activeSignal = "interiority"

<LineChart
  data={signalRows(book, activeSignal)}
  xAccessor="chapter"
  yAccessor="value"
  yExtent={[0, 100]}
/>

<BarChart
  data={phaseRows(book, activeSignal)}
  categoryAccessor="phase"
  valueAccessor="score"
  orientation="horizontal"
/>

<SankeyDiagram
  nodes={book.network.nodes}
  edges={book.network.edges}
  nodeIdAccessor="id"
  sourceAccessor="source"
  targetAccessor="target"
  valueAccessor="value"
/>`

export default function DistantReadingExamplePage() {
  const [bookId, setBookId] = useState("frankenstein")
  const [signalId, setSignalId] = useState("interiority")
  const [hoverChapter, setHoverChapter] = useState(null)
  const [docsTheme] = useDocsTheme()
  const chartTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"

  const [lineWidth, lineHostRef] = useResponsiveWidth(320, 680)
  const [barWidth, barHostRef] = useResponsiveWidth(320, 520)
  const [flowWidth, flowHostRef] = useResponsiveWidth(320, 980)
  const [scatterWidth, scatterHostRef] = useResponsiveWidth(320, 620)

  const book = useMemo(() => getBook(bookId), [bookId])
  const signal = signalById(signalId)
  const focusChapter = hoverChapter || topChapterFor(book, signalId)
  const dominant = signalById(focusChapter.dominantSignal)

  const lineData = useMemo(() => signalRows(book, signalId), [book, signalId])
  const phaseData = useMemo(() => phaseRows(book, signalId), [book, signalId])
  const weightedEdges = useMemo(() => {
    const emphasis = 0.85 + book.averages[signalId] / 180
    return book.network.edges.map((edge) => ({
      ...edge,
      value: Math.max(4, Math.round(edge.value * emphasis)),
    }))
  }, [book, signalId])

  return (
    <ExamplePageLayout title="Can You Know a Book Better Without Reading It?">
      <div
        className="distant-reading-page"
        style={{
          "--dr-active": signal.color,
          "--dr-book": book.color,
          "--dr-book-accent": book.accent,
        }}
      >
        <section className="dr-hero">
          <div className="dr-hero-copy">
            <p className="dr-kicker">A remake of the distant-reading essay</p>
            <p className="dr-lede">
              This interface compares four novels through chapter signals, narrative phases, and
              character flows. Use those views to locate structural changes, then return to the
              text with a more specific question.
            </p>
          </div>
          <BookShelf activeId={book.id} />
        </section>

        <BookSelector activeId={book.id} onChange={setBookId} />

        <section className="dr-book-brief" aria-label="Selected book profile">
          <div className="dr-book-title-block">
            <span>{book.year}</span>
            <h2>{book.title}</h2>
            <p>{book.author}</p>
          </div>
          <p className="dr-book-claim">{book.claim}</p>
          <div className="dr-stats">
            <Readout value={book.chapters.length} label="chapter bins" />
            <Readout value={formatNumber(book.words)} label="modeled words" />
            <Readout value={`Ch. ${book.peak.chapter}`} label="peak pressure" />
            <Readout value={book.volatility} label="volatility" />
          </div>
        </section>

        <section className="dr-reading-table">
          <div className="dr-section-head">
            <span>01</span>
            <div>
              <h2>The book as a signal field</h2>
              <p>
                Pick a signal, then scan the chapter map. A tall mark identifies a chapter where
                that signal is concentrated and gives you a place to ask what changed.
              </p>
            </div>
          </div>

          <SignalControl activeId={signal.id} onChange={setSignalId} />

          <div className="dr-passage-layout">
            <PassageMap
              book={book}
              signal={signal}
              focusChapter={focusChapter}
              onHover={setHoverChapter}
            />
            <div className="dr-inspection" aria-live="polite">
              <span>{signal.label} close-up</span>
              <strong>{focusChapter.label}</strong>
              <p>
                {signal.description} Score: <b>{focusChapter[signal.id]}</b>. Dominant texture:
                <i style={{ color: dominant.color }}> {dominant.label.toLowerCase()}</i>. Estimated
                local weight: <b>{formatNumber(focusChapter.words)} words</b>.
              </p>
            </div>
          </div>
        </section>

        <section className="dr-chart-grid">
          <article className="dr-panel">
            <div className="dr-panel-head">
              <span>02</span>
              <h2>{signal.label} through the book</h2>
              <p>
                A chapter-level trace lets the reader see where the chosen signal gathers, breaks,
                and returns.
              </p>
            </div>
            <div className="dr-chart-host" ref={lineHostRef}>
              <ThemeProvider theme={chartTheme}>
                <LineChart
                  data={lineData}
                  xAccessor="chapter"
                  yAccessor="value"
                  width={lineWidth}
                  height={330}
                  margin={{ top: 20, right: 24, bottom: 42, left: 48 }}
                  yExtent={[0, 100]}
                  stroke={signal.color}
                  lineWidth={3.5}
                  showPoints
                  pointRadius={4}
                  xFormat={(value) => `Ch. ${value}`}
                  yFormat={(value) => `${value}`}
                  enableHover
                  showLegend={false}
                  title={`${book.title}: ${signal.label.toLowerCase()} signal by chapter`}
                  description={`A line chart of the ${signal.label.toLowerCase()} signal across ${book.chapters.length} chapter bins in ${book.title}.`}
                  frameProps={{ background: "transparent" }}
                />
              </ThemeProvider>
            </div>
          </article>

          <article className="dr-panel">
            <div className="dr-panel-head">
              <span>03</span>
              <h2>Where that signal lives</h2>
              <p>
                The same chapter scores are collapsed into narrative phases, trading local detail
                for a quicker structural read.
              </p>
            </div>
            <div className="dr-chart-host" ref={barHostRef}>
              <ThemeProvider theme={chartTheme}>
                <BarChart
                  data={phaseData}
                  categoryAccessor="phase"
                  valueAccessor="score"
                  orientation="horizontal"
                  width={barWidth}
                  height={300}
                  margin={{ top: 20, right: 28, bottom: 34, left: 126 }}
                  valueExtent={[0, 100]}
                  colorBy="phase"
                  colorScheme={PHASES.map((phase) => phase.color)}
                  showLegend={false}
                  title={`${signal.label} signal by narrative phase`}
                  description={`Average ${signal.label.toLowerCase()} signal for the opening, entanglement, crisis, and aftermath phases of ${book.title}.`}
                  frameProps={{ background: "transparent" }}
                />
              </ThemeProvider>
            </div>
          </article>
        </section>

        <section className="dr-flow-section">
          <div className="dr-section-head">
            <span>04</span>
            <div>
              <h2>A distant reading still has characters</h2>
              <p>
                The Sankey traces who frames whom, which forces mediate action, and which places
                organize the book. It summarizes modeled relationships rather than plot events.
              </p>
            </div>
          </div>
          <div className="dr-flow-copy">
            <div>
              <span>Question</span>
              <strong>{book.question}</strong>
            </div>
            <div>
              <span>Source note</span>
              <p>{book.sourceNote}</p>
            </div>
          </div>
          <div className="dr-flow-chart" ref={flowHostRef}>
            <ThemeProvider theme={chartTheme}>
              <SankeyDiagram
                nodes={book.network.nodes}
                edges={weightedEdges}
                nodeIdAccessor="id"
                sourceAccessor="source"
                targetAccessor="target"
                valueAccessor="value"
                colorBy="type"
                colorScheme={TYPE_COLORS}
                edgeColorBy="source"
                nodeWidth={18}
                nodePaddingRatio={0.08}
                width={flowWidth}
                height={430}
                showLegend
                title={`${book.title}: narrative pressure map`}
                description={`A Sankey diagram connecting the major narrative roles, forces, places, and framing devices in ${book.title}.`}
                tooltip
              />
            </ThemeProvider>
          </div>
        </section>

        <section className="dr-corpus-section">
          <div className="dr-panel dr-corpus-chart">
            <div className="dr-panel-head">
              <span>05</span>
              <h2>Corpus fingerprints</h2>
              <p>
                Each dot is a chapter. The books keep their color, so clustering shows when
                different novels briefly occupy the same signal territory.
              </p>
            </div>
            <div className="dr-chart-host" ref={scatterHostRef}>
              <ThemeProvider theme={chartTheme}>
                <Scatterplot
                  data={CORPUS_CHAPTER_FINGERPRINTS}
                  xAccessor="voice"
                  yAccessor="danger"
                  pointIdAccessor="id"
                  width={scatterWidth}
                  height={330}
                  margin={{ top: 22, right: 28, bottom: 48, left: 52 }}
                  xExtent={[0, 90]}
                  yExtent={[0, 90]}
                  pointRadius={5.5}
                  pointOpacity={0.78}
                  colorBy="title"
                  colorScheme={BOOKS.map((book) => book.color)}
                  showLegend={false}
                  enableHover
                  xFormat={(value) => `${value}`}
                  yFormat={(value) => `${value}`}
                  title="Chapter-level voice load vs threat load"
                  description="A scatterplot comparing every modeled chapter from the four books by voice signal and threat signal, colored by novel."
                  frameProps={{ background: "transparent" }}
                />
              </ThemeProvider>
            </div>
          </div>

          <div className="dr-signature-list">
            {BOOKS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={item.id === book.id ? "is-active" : ""}
                onClick={() => setBookId(item.id)}
              >
                <span style={{ background: item.color }} />
                <strong>{item.title}</strong>
                <small>
                  Voice {item.averages.voice} / motion {item.averages.motion} / interior{" "}
                  {item.averages.interiority} / threat {item.averages.danger}
                </small>
              </button>
            ))}
          </div>
        </section>

        <section className="dr-code-section">
          <div className="dr-section-head">
            <span>06</span>
            <div>
              <h2>Visualization changes the first question</h2>
              <p>
                The data model is intentionally small: four local signal arrays, phase summaries,
                and a network per book. These views prepare questions for close reading; they do
                not interpret a passage or settle what a novel means.
              </p>
            </div>
          </div>
          <CodeBlock language="jsx" showCopyButton wrap code={implementationCode} />
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function BookSelector({ activeId, onChange }) {
  return (
    <div className="dr-book-selector" aria-label="Choose a book profile">
      {BOOKS.map((book) => (
        <button
          type="button"
          key={book.id}
          className={book.id === activeId ? "is-active" : ""}
          style={{ "--book-color": book.color }}
          onClick={() => onChange(book.id)}
        >
          <span>{book.year}</span>
          <strong>{book.title}</strong>
          <small>{book.author}</small>
        </button>
      ))}
    </div>
  )
}

function SignalControl({ activeId, onChange }) {
  return (
    <div className="dr-signal-control" role="group" aria-label="Choose signal">
      {SIGNALS.map((signal) => (
        <button
          type="button"
          key={signal.id}
          className={signal.id === activeId ? "is-active" : ""}
          style={{ "--signal-color": signal.color }}
          onClick={() => onChange(signal.id)}
        >
          <i aria-hidden="true" />
          <span>{signal.label}</span>
        </button>
      ))}
    </div>
  )
}

function PassageMap({ book, signal, focusChapter, onHover }) {
  const max = Math.max(...book.chapters.map((chapter) => chapter[signal.id]), 1)
  return (
    <div
      className="dr-passage-map"
      style={{ "--chapter-count": book.chapters.length }}
      onMouseLeave={() => onHover(null)}
    >
      {book.chapters.map((chapter) => {
        const dominant = signalById(chapter.dominantSignal)
        const phase = PHASES.find((item) => item.id === chapter.phase) || PHASES[0]
        const active = chapter.chapter === focusChapter.chapter
        return (
          <button
            type="button"
            key={chapter.chapter}
            className={active ? "is-active" : ""}
            style={{
              "--cell-fill": dominant.color,
              "--cell-phase": phase.color,
              "--cell-score": `${Math.max(16, (chapter[signal.id] / max) * 100)}%`,
            }}
            onFocus={() => onHover(chapter)}
            onBlur={() => onHover(null)}
            onMouseEnter={() => onHover(chapter)}
            aria-label={`${chapter.label}: ${signal.label} score ${chapter[signal.id]}`}
          >
            <span />
          </button>
        )
      })}
    </div>
  )
}

function BookShelf({ activeId }) {
  return (
    <svg className="dr-bookshelf" viewBox="0 0 520 250" role="img" aria-label="Four distant-reading book profiles">
      <rect x="18" y="28" width="484" height="184" rx="20" fill="#fff8e8" stroke="#1f2528" strokeWidth="3" />
      <path d="M42 196H478" stroke="#1f2528" strokeWidth="7" strokeLinecap="round" />
      {BOOKS.map((book, index) => {
        const x = 72 + index * 96
        const active = book.id === activeId
        const width = active ? 62 : 46
        const height = active ? 150 : 132
        const y = 196 - height
        return (
          <g key={book.id} transform={`translate(${x} ${y})`}>
            <rect
              x="0"
              y="0"
              width={width}
              height={height}
              rx="7"
              fill={book.color}
              stroke="#1f2528"
              strokeWidth="3"
            />
            <rect x="8" y="12" width={width - 16} height="12" rx="6" fill="#fff8e8" opacity="0.78" />
            {book.signature.map((row, rowIndex) => (
              <rect
                key={row.label}
                x="10"
                y={42 + rowIndex * 20}
                width={(width - 20) * (row.value / 90)}
                height="9"
                rx="4.5"
                fill={row.color}
              />
            ))}
            <text
              x={width / 2}
              y={height - 16}
              textAnchor="middle"
              fill="#fff8e8"
              fontFamily="Georgia, serif"
              fontSize="12"
              fontWeight="700"
            >
              {book.year}
            </text>
          </g>
        )
      })}
      <path
        d="M74 35C136 18 185 40 235 31C297 20 356 19 442 38"
        fill="none"
        stroke="#1f9a8a"
        strokeWidth="3"
        strokeDasharray="8 10"
      />
      <text x="260" y="232" textAnchor="middle" fill="#1f2528" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="800">
        SIGNALS BEFORE SENTENCES
      </text>
    </svg>
  )
}

function Readout({ value, label }) {
  return (
    <div className="dr-readout">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value)
}
