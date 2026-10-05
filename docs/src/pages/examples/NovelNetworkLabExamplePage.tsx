import * as React from "react"
import { useEffect, useId, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ThemeProvider, useTheme } from "semiotic/themes/react"
import { useSelectionActions } from "semiotic/network"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import ExamplePageLayout from "./ExamplePageLayout"
import ChartPane from "./novel-network-lab/ChartPane"
import {
  departments,
  delivered,
  ledger,
  questions,
  resolution,
  REVISION,
  totalHandoffs,
  views,
  type ViewId,
} from "./novel-network-lab/data"
import "./novel-network-lab/lab.css"

const generationNames = [
  "Original stages",
  "Group serial interiors",
  "Contain feedback components",
  "Apply editorial and format groups",
]
const isView = (value: string | null): value is ViewId => views.some((view) => view.id === value)

function NovelNetworkLab() {
  const [params, setParams] = useSearchParams()
  const theme = useTheme()
  const question = questions.find((item) => item.id === params.get("question")) ?? questions[0]
  const left = isView(params.get("a")) ? (params.get("a") as ViewId) : question.pair[0]
  const right = isView(params.get("b")) ? (params.get("b") as ViewId) : question.pair[1]
  const selected = ledger.nodes.find((node) => node.id === params.get("stage"))?.id ?? question.node
  const node = ledger.nodes.find((item) => item.id === selected)!
  const [expanded, setExpanded] = useState<"A" | "B" | null>(null)
  const [generation, setGeneration] = useState(resolution.pages.length - 1)
  const name = `novel-lab-${useId()}`
  const { selectPoints, clear } = useSelectionActions(name)
  useEffect(() => {
    selectPoints({ nodeId: [selected] })
    return clear
  }, [selected, selectPoints, clear])
  const colors = useMemo(
    () =>
      Object.fromEntries(
        departments.map((department, index) => [
          department,
          theme.colors.categorical[index % theme.colors.categorical.length],
        ]),
      ),
    [theme.colors.categorical],
  )
  const update = (entries: Record<string, string>) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        Object.entries(entries).forEach(([key, value]) => next.set(key, value))
        return next
      },
      { replace: true },
    )
  const select = (id: string) => update({ stage: id })
  const incident = ledger.edges.filter(
    (edge) => edge.source === selected || edge.target === selected,
  )
  const journeys = ledger.manuscripts.filter((book) => book.nodePath.includes(selected))
  const routeCounts = [...new Set(ledger.manuscripts.map((book) => book.route))].map((route) => {
    const books = ledger.manuscripts.filter((book) => book.route === route)
    return { route, count: books.length, path: books[0].nodePath }
  })
  const showResolution = [left, right].some((view) => view === "atlas" || view === "loom")
  const download = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { revision: REVISION, synthetic: true, intervalSeconds: 86400, ...ledger },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "novel-network-lab.json"
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const pane = (side: "A" | "B", viewId: ViewId) => (
    <ChartPane
      key={side}
      side={side}
      viewId={viewId}
      onView={(id) => update({ [side === "A" ? "a" : "b"]: id })}
      selected={selected}
      onSelect={select}
      selectionName={name}
      colors={colors}
      expanded={expanded === side}
      onExpand={() => setExpanded(expanded === side ? null : side)}
      generation={generation}
    />
  )

  return (
    <div className="novel-lab">
      <header className="novel-intro">
        <p className="novel-kicker">One dataset / eight network views</p>
        <p className="novel-deck">Choose a network view by the question you need to answer.</p>
        <p>
          Follow a synthetic batch of novels through acquisition, editing, review, and publication.
          Every view uses the same manuscript ledger. Revisions, shortcuts, and parallel handoffs
          make different properties visible in different charts.
        </p>
        <dl className="novel-stats">
          {[
            ["Manuscripts", 48],
            ["Stages", 14],
            ["Edge records", 21],
            ["Handoffs", totalHandoffs],
            ["Delivered", delivered],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="novel-questions" aria-labelledby="novel-question-heading">
        <div className="novel-section-heading">
          <span>01</span>
          <h2 id="novel-question-heading">Start with a question</h2>
        </div>
        <div className="novel-question-list">
          {questions.map((item, index) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={item.id === question.id}
              onClick={() => {
                update({ question: item.id, a: item.pair[0], b: item.pair[1], stage: item.node })
                setExpanded(null)
              }}
            >
              <span>0{index + 1}</span>
              {item.title}
            </button>
          ))}
        </div>
        <div className="novel-finding" aria-live="polite">
          <strong>Finding in this dataset</strong>
          <p>{question.finding}</p>
        </div>
      </section>

      <section aria-labelledby="novel-compare-heading">
        <div className="novel-section-heading">
          <span>02</span>
          <h2 id="novel-compare-heading">Compare the views</h2>
        </div>
        <div className="novel-compare-controls">
          <p>
            Change either view. Hover marks for counts; click a stage to pin it. Expand a panel for
            more space. Wide diagrams scroll horizontally.
          </p>
          <button type="button" onClick={() => update({ a: right, b: left })}>
            Swap A / B
          </button>
        </div>
        <div className="novel-legend" aria-label="Department colors">
          {departments.map((department) => (
            <span key={department}>
              <i style={{ background: colors[department] }} />
              {department}
            </span>
          ))}
          <small>
            Department colors apply to Force, Sankey, and Chord. Other encodings are described below
            each view.
          </small>
        </div>
        {showResolution && (
          <label className="novel-generation">
            Resolution through{" "}
            <select
              value={generation}
              onChange={(event) => setGeneration(Number(event.target.value))}
            >
              {generationNames.map((label, i) => (
                <option key={label} value={i}>
                  {i}. {label}
                </option>
              ))}
            </select>
            <span>Original edge IDs are retained at every generation.</span>
          </label>
        )}
        <div className={`novel-comparison${expanded ? " novel-comparison-expanded" : ""}`}>
          {expanded !== "B" && pane("A", left)}
          {expanded !== "A" && pane("B", right)}
        </div>
      </section>

      <section className="novel-inspector" aria-labelledby="novel-inspector-heading">
        <div className="novel-inspector-overview">
          <div className="novel-section-heading">
            <span>03</span>
            <h2 id="novel-inspector-heading">Inspect a stage</h2>
          </div>
          <label>
            Pinned stage
            <select value={selected} onChange={(event) => select(event.target.value)}>
              {ledger.nodes.map((item) => (
                <option key={item.id}>{item.id}</option>
              ))}
            </select>
          </label>
          <div aria-live="polite" data-testid="novel-stage-summary">
            <h3>{selected}</h3>
            <p>
              {node.department} · {node.visits} visits from {node.manuscripts} manuscripts.
            </p>
            <p>
              {node.incoming} incoming and {node.outgoing} outgoing handoffs. A revision creates
              another visit, not another manuscript.
            </p>
          </div>
          <p className="novel-small">
            This pin follows the original stage ID across views. In the Atlas, outlined groups
            contain the stage; clicking a group opens its membership and Cutaway.
          </p>
        </div>
        <div className="novel-inspector-edges">
          <h3>Original handoffs touching {selected}</h3>
          <div
            className="novel-table-scroll"
            tabIndex={0}
            role="region"
            aria-label={`Handoffs touching ${selected}`}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">From → to</th>
                  <th scope="col">Channel</th>
                  <th scope="col">Handoffs</th>
                  <th scope="col">Manuscripts</th>
                </tr>
              </thead>
              <tbody>
                {incident.map((edge) => (
                  <tr key={edge.id}>
                    <td>
                      <button type="button" onClick={() => select(edge.source)}>
                        {edge.source}
                      </button>{" "}
                      →{" "}
                      <button type="button" onClick={() => select(edge.target)}>
                        {edge.target}
                      </button>
                    </td>
                    <td>{edge.channel}</td>
                    <td>{edge.value}</td>
                    <td>{new Set(edge.manuscriptIds).size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details>
            <summary>
              {journeys.length} manuscript paths through {selected}
            </summary>
            <ul className="novel-paths">
              {journeys.map((book) => (
                <li key={book.id}>
                  <strong>{book.id}</strong> {book.nodePath.join(" → ")}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </section>

      <section className="novel-guide" aria-labelledby="novel-guide-heading">
        <div className="novel-section-heading">
          <span>04</span>
          <h2 id="novel-guide-heading">Match the chart to the task</h2>
        </div>
        <div className="novel-guide-grid">
          {views.map((view) => (
            <div key={view.id}>
              <h3>{view.name}</h3>
              <p>{view.question}</p>
              <p className="novel-small">{view.limit}</p>
              <button
                type="button"
                onClick={() => {
                  update({ b: view.id })
                  setExpanded(null)
                  document
                    .getElementById("novel-compare-heading")
                    ?.scrollIntoView({ block: "start" })
                }}
              >
                Compare in B ↑
              </button>
            </div>
          ))}
        </div>
        <p>
          Tree, Treemap, Circle Pack, and Orbit views require a hierarchy. This ledger is a directed
          graph with cycles and multiple parents; choosing a spanning tree would discard
          relationships. The Dependency Forest makes that distinction explicit while retaining
          residual edges. See the <Link to="/charts/tree-diagram">Tree Diagram documentation</Link>{" "}
          for genuinely hierarchical data.
        </p>
      </section>

      <section className="novel-source" aria-labelledby="novel-source-heading">
        <div className="novel-section-heading">
          <span>05</span>
          <h2 id="novel-source-heading">Inspect the shared dataset</h2>
        </div>
        <p>
          This is authored synthetic data, not a publishing benchmark. Six route templates generate
          48 individual manuscript paths. The 434 handoffs are counted directly from consecutive
          visits. Copy → Proof has two separately identified channels. All charts use those nodes,
          edges, and paths; no chart substitutes an unrelated fixture.
        </p>
        <p>
          For the Flow Circuit, counts are aggregated over one declared 24-hour interval and
          converted to per-second rates. Modules count completed stage visits, including intake and
          terminal stages; pipes count handoffs. Individual event times, queue stock, and capacity
          are unavailable. Motion is disabled because the data cannot support a replay.
        </p>
        <div
          className="novel-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Manuscript route templates"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Route</th>
                <th scope="col">Manuscripts</th>
                <th scope="col">Complete path</th>
              </tr>
            </thead>
            <tbody>
              {routeCounts.map((route) => (
                <tr key={route.route}>
                  <th scope="row">{route.route}</th>
                  <td>{route.count}</td>
                  <td>{route.path.join(" → ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details>
          <summary>All 21 original edge records</summary>
          <div
            className="novel-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Complete edge ledger"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Original edge ID</th>
                  <th scope="col">Handoffs</th>
                  <th scope="col">Manuscripts</th>
                </tr>
              </thead>
              <tbody>
                {ledger.edges.map((edge) => (
                  <tr key={edge.id}>
                    <th scope="row">{edge.id}</th>
                    <td>{edge.value}</td>
                    <td>{new Set(edge.manuscriptIds).size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <button type="button" onClick={download}>
          Download the shared ledger (JSON)
        </button>
        <p className="novel-small">
          Revision {REVISION}. View choices and the pinned stage are saved in this page’s URL. Full
          Code includes the ledger generator, chart setup, and styles.
        </p>
      </section>
    </div>
  )
}

export default function NovelNetworkLabExamplePage() {
  const [theme] = useDocsTheme()
  return (
    <ExamplePageLayout
      title="The Novel Network Lab"
      prevPage={undefined}
      nextPage={undefined}
      showContractPanels={false}
    >
      <ThemeProvider theme={theme === "light" ? "light" : "dark"}>
        <NovelNetworkLab />
      </ThemeProvider>
    </ExamplePageLayout>
  )
}
