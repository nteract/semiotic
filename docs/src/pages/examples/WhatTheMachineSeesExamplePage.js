import React, { useCallback, useMemo, useState } from "react"
import {
  useChartSuggestions,
  LineChart,
  AreaChart,
  Scatterplot,
  BubbleChart,
  QuadrantChart,
  BarChart,
  GroupedBarChart,
  DotPlot,
  Histogram,
  BoxPlot,
  ViolinPlot,
  SwarmPlot,
  PieChart,
  DonutChart,
} from "semiotic/ai"
import { describeChart, auditAccessibility } from "semiotic/utils"
import { AccessibleNavTree, buildNavigationTree, useNavigationSync, ThemeProvider } from "semiotic"
import CodeBlock from "../../components/CodeBlock"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  WORLD_COUNTRIES,
  WORLD_DATA_RETRIEVED,
  WORLD_OBSERVATIONS,
  crossSection,
  distributionSample,
  rankByCountry,
  shareByGroup,
  singleCountryTrend,
} from "./data/worldDevelopment"
import "./WhatTheMachineSeesExamplePage.css"

// HOC names the engine can recommend → the component to render. The five
// questions below land on Line/Dot/Scatter/Histogram/Pie; the rest are here so
// a hand override in the rack still renders.
const COMPONENT_MAP = {
  LineChart,
  AreaChart,
  Scatterplot,
  BubbleChart,
  QuadrantChart,
  BarChart,
  GroupedBarChart,
  DotPlot,
  Histogram,
  BoxPlot,
  ViolinPlot,
  SwarmPlot,
  PieChart,
  DonutChart,
}

const CHART_ID = "machine-sees-chart"

const QUESTIONS = [
  {
    id: "trend",
    intent: "trend",
    kicker: "A trend over time",
    question: "How long do people live, over time?",
    blurb: "South Korea's life expectancy at birth, every year from 1990 to 2023.",
    fields: "year · life expectancy",
    matchField: "year",
    build: () => singleCountryTrend("KOR", "lifeExpectancy"),
  },
  {
    id: "rank",
    intent: "rank",
    kicker: "A ranking",
    question: "Who burns the most carbon per person?",
    blurb: "CO₂ emissions per capita, one value per country, 2023.",
    fields: "country · CO₂ per capita",
    matchField: "country",
    build: () => rankByCountry("co2PerCapita"),
  },
  {
    id: "correlation",
    intent: "correlation",
    kicker: "A relationship",
    question: "Does wealth track longevity?",
    blurb: "GDP per capita against life expectancy, one point per country, 2023.",
    fields: "GDP per capita · life expectancy",
    matchField: "country",
    build: () => crossSection(["gdpPerCapita", "lifeExpectancy"]),
  },
  {
    id: "distribution",
    intent: "distribution",
    kicker: "A distribution",
    question: "How is longevity spread across the world?",
    blurb: "Every country-year life-expectancy value, 1990–2023 — 544 of them.",
    fields: "life expectancy (544 values)",
    build: () => distributionSample("lifeExpectancy"),
  },
  {
    id: "composition",
    intent: "part-to-whole",
    kicker: "A part of a whole",
    question: "Where do these people live, by income?",
    blurb: "Population by World Bank income group across the sixteen countries, 2023.",
    fields: "income group · population",
    matchField: "income",
    build: () => shareByGroup("income", "population"),
  },
]

const LEVELS = [
  { key: "l1", tag: "L1", name: "Encoding" },
  { key: "l2", tag: "L2", name: "Statistics" },
  { key: "l3", tag: "L3", name: "Trend" },
  { key: "l4", tag: "L4", name: "Intent" },
]

const STATUS_META = {
  pass: { icon: "✓", label: "pass", className: "is-pass" },
  fail: { icon: "✗", label: "fail", className: "is-fail" },
  warn: { icon: "⚠", label: "warn", className: "is-warn" },
  manual: { icon: "○", label: "verify", className: "is-manual" },
  "not-applicable": { icon: "·", label: "n/a", className: "is-na" },
}

const implementationCode = `import {
  useChartSuggestions, describeChart, auditAccessibility,
  buildNavigationTree, AccessibleNavTree,
} from "semiotic/ai"

// 1 · The engine profiles the data and ranks every chart's capability.
const { suggestions, profile } = useChartSuggestions(data, { intent })
const top = suggestions[0]
const Chart = COMPONENT_MAP[top.component]   // top.props spreads straight in

// 2 · It describes what the chart shows (Lundgard L1–L4).
const description = describeChart(top.component, top.props, {
  capability: { family: top.family, intentScores: top.intentScores },
})

// 3 · Its own description, attached, is what clears the accessibility audit.
const enriched = { ...top.props, title, description: description.text }
const audit = auditAccessibility(top.component, enriched, { describe: true })

// 4 · And it lays out a path a screen reader can walk.
const tree = buildNavigationTree(top.component, top.props)

<Chart {...enriched} />
<AccessibleNavTree tree={tree} />
// Not one model call. Every line is a deterministic function of the data.`

export default function WhatTheMachineSeesExamplePage() {
  const [questionId, setQuestionId] = useState("trend")
  const [overrideKey, setOverrideKey] = useState(null)
  const [docsTheme] = useDocsTheme()
  const carbonTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"
  const [chartWidth, chartHostRef] = useResponsiveWidth(280, 680)

  const question = useMemo(
    () => QUESTIONS.find((q) => q.id === questionId) || QUESTIONS[0],
    [questionId]
  )
  const data = useMemo(() => question.build(), [question])

  const { suggestions, profile } = useChartSuggestions(data, {
    intent: question.intent,
    maxResults: 5,
    includeVariants: true,
  })

  const renderable = useMemo(
    () => suggestions.filter((s) => COMPONENT_MAP[s.component]),
    [suggestions]
  )
  const engineTop = renderable[0] || null
  const active =
    (overrideKey && renderable.find((s) => suggestionKey(s) === overrideKey)) ||
    engineTop
  const isOverride = Boolean(active && engineTop && suggestionKey(active) !== suggestionKey(engineTop))
  const Component = active ? COMPONENT_MAP[active.component] : null

  const description = useMemo(() => {
    if (!active) return null
    return describeChart(active.component, active.props, {
      capability: { family: active.family, intentScores: active.intentScores },
    })
  }, [active])

  const enrichedProps = useMemo(() => {
    if (!active) return null
    return {
      ...active.props,
      title: question.question,
      description: description?.text,
      summary: question.blurb,
    }
  }, [active, description, question])

  const audit = useMemo(() => {
    if (!active || !enrichedProps) return null
    return auditAccessibility(active.component, enrichedProps, { describe: true })
  }, [active, enrichedProps])

  const tree = useMemo(() => {
    if (!active) return FALLBACK_TREE
    try {
      return buildNavigationTree(active.component, active.props)
    } catch {
      return FALLBACK_TREE
    }
  }, [active])

  const sync = useNavigationSync({
    tree,
    chartId: CHART_ID,
    matchFields: question.matchField ? [question.matchField] : undefined,
  })

  const selectQuestion = useCallback((id) => {
    setQuestionId(id)
    setOverrideKey(null)
  }, [])

  return (
    <ExamplePageLayout
      title="What the Machine Sees"
      prevPage={{ title: "The Scroll You're Telling", path: "/examples/scroll-youre-telling" }}
      nextPage={{ title: "The Living System of Semiotic", path: "/examples/semiotic-architecture" }}
    >
      <p className="machine-lede">
        A moment ago, in <em>The Scroll You’re Telling</em>, a chart watched
        a person read. Turn it around. Hand Semiotic a real dataset and watch
        the <em>machine</em> read it — choose the form, justify the choice,
        narrate what it shows, audit whether you could even perceive it, and lay
        out a path through it for a screen reader. <strong>No model is called.</strong>{" "}
        Every panel below is a deterministic function of the data.
      </p>

      <section className="machine-questions" aria-label="Choose a question">
        <span className="machine-kicker">Ask the data a question</span>
        <div className="machine-question-grid">
          {QUESTIONS.map((q) => (
            <button
              type="button"
              key={q.id}
              className={q.id === questionId ? "machine-question is-active" : "machine-question"}
              aria-pressed={q.id === questionId}
              onClick={() => selectQuestion(q.id)}
            >
              <span className="machine-question-kicker">{q.kicker}</span>
              <strong>{q.question}</strong>
              <small>{q.fields}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="machine-stage">
        <div className="machine-deliberation">
          <section className="machine-panel">
            <div className="machine-panel-title">
              <span className="machine-step">01</span>
              <h2>What it sees</h2>
            </div>
            <p className="machine-panel-note">{question.blurb}</p>
            <div className="machine-profile">
              <ProfileStat label="Rows" value={profile.rowCount} />
              <ProfileStat label="Fields" value={Object.keys(profile.fields || {}).length} />
              <ProfileStat label="Time axis" value={profile.hasTimeAxis ? "yes" : "no"} />
            </div>
            <div className="machine-roles">
              {ROLE_ORDER.map((role) =>
                profile.primary?.[role] ? (
                  <span key={role} className="machine-role">
                    <i>{role}</i>
                    {profile.primary[role]}
                  </span>
                ) : null
              )}
            </div>
          </section>

          <section className="machine-panel">
            <div className="machine-panel-title">
              <span className="machine-step">02</span>
              <h2>What it weighed</h2>
            </div>
            <p className="machine-panel-note">
              Every chart’s capability, scored against this shape and the{" "}
              <strong>{question.intent}</strong> intent. Click any candidate to
              overrule the engine.
            </p>
            <div className="machine-rack">
              {renderable.map((s) => {
                const key = suggestionKey(s)
                const chosen = active && key === suggestionKey(active)
                return (
                  <button
                    type="button"
                    key={key}
                    className={`machine-suggestion ${chosen ? "is-chosen" : ""}`}
                    aria-pressed={chosen}
                    onClick={() => setOverrideKey(key)}
                  >
                    <div className="machine-suggestion-head">
                      <strong>
                        {s.component}
                        {s.variant ? <span className="machine-variant"> · {s.variant.label}</span> : null}
                      </strong>
                      <span className="machine-score">{s.score.toFixed(1)}</span>
                    </div>
                    <Rubric rubric={s.rubric} />
                    {s.reasons.length > 0 && (
                      <p className="machine-reasons">{s.reasons.join(" · ")}</p>
                    )}
                    {s.caveats.length > 0 && (
                      <p className="machine-caveats">⚠ {s.caveats.join(" · ")}</p>
                    )}
                  </button>
                )
              })}
              {renderable.length === 0 && (
                <p className="machine-empty">No renderable chart fits this shape.</p>
              )}
            </div>
          </section>
        </div>

        <div className="machine-chosen">
          <section className="machine-panel machine-panel--chart">
            <div className="machine-panel-title">
              <span className="machine-step">03</span>
              <h2>What it chose</h2>
              {active && (
                <span className="machine-chosen-tag">
                  {isOverride ? "your pick" : "engine's pick"} · {active.component}
                  {active.variant ? ` · ${active.variant.label}` : ""}
                </span>
              )}
            </div>
            <div className="machine-chart-host" ref={chartHostRef}>
              {Component && enrichedProps ? (
                <ThemeProvider theme={carbonTheme}>
                  <Component
                    key={`${active.component}-${question.id}-${carbonTheme}`}
                    {...enrichedProps}
                    chartId={CHART_ID}
                    selection={sync.selection}
                    width={chartWidth}
                    height={344}
                  />
                </ThemeProvider>
              ) : (
                <div className="machine-empty">Nothing to render.</div>
              )}
            </div>
          </section>

          <section className="machine-panel">
            <div className="machine-panel-title">
              <span className="machine-step">04</span>
              <h2>What it says</h2>
            </div>
            <p className="machine-panel-note">
              The Lundgard four-level description, generated from the config
              alone. L4 — the chart’s communicative act — comes from the same
              intent scores the ranking used.
            </p>
            <div className="machine-narration">
              {description
                ? LEVELS.map(({ key, tag, name }) => {
                    const text = description.levels?.[key]
                    if (!text) return null
                    return (
                      <div key={key} className={`machine-level is-${key}`}>
                        <span className="machine-level-tag">
                          {tag} <i>{name}</i>
                        </span>
                        <span className="machine-level-text">{text}</span>
                      </div>
                    )
                  })
                : null}
            </div>
          </section>
        </div>
      </div>

      <div className="machine-aftermath">
        <section className="machine-panel">
          <div className="machine-panel-title">
            <span className="machine-step">05</span>
            <h2>What it checked</h2>
          </div>
          <p className="machine-panel-note">
            The same chart, graded against Chartability. The description it just
            wrote — attached as the chart’s title and summary — is what clears
            the blocking failures. The warnings that remain are judgment calls a
            human still owns.
          </p>
          {audit && <Audit audit={audit} />}
        </section>

        <section className="machine-panel">
          <div className="machine-panel-title">
            <span className="machine-step">06</span>
            <h2>How it reads aloud</h2>
          </div>
          <p className="machine-panel-note">
            The structure a screen reader walks — chart → axes/series → values.
            Move through it with the arrow keys; the matching mark highlights on
            the chart, and hovering the chart moves this cursor.
          </p>
          <div className="machine-navtree">
            <AccessibleNavTree
              tree={tree}
              label={`${question.question} — navigable structure`}
              activeId={sync.activeId}
              onActiveChange={sync.onActiveChange}
              visible
            />
          </div>
        </section>
      </div>

      <section className="machine-thesis">
        <div className="machine-thesis-block">
          <span className="machine-kicker">Why determinism is the point</span>
          <h2>A chart that can explain itself is a chart you can trust an agent with</h2>
          <p>
            Generative tools are eager to draw charts and careless about whether
            the chart is right, readable, or honest. Semiotic moves that judgment
            into deterministic code that ships beside each component. The engine
            can be wrong — it sometimes ties, or makes a defensible pick you’d
            overrule — but it is never <em>opaque</em>. The reasons, the rubric,
            and the caveats are all inspectable, and identical inputs always
            yield identical output.
          </p>
        </div>
        <div className="machine-thesis-block">
          <span className="machine-kicker">It knows its own limits</span>
          <h2>The caveats are the most important thing on the page</h2>
          <p>
            “Only 16 rows — may feel sparse.” “Bubble area is harder to compare
            than length.” “Smoothing hides individual outliers.” A system that
            volunteers what’s wrong with its own recommendation is one an LLM or
            an analyst can build on without re-deriving the rules of good
            visualization — or hallucinating them. This is the trust layer
            underneath generated dataviz, not a replacement for the human on top.
          </p>
        </div>
      </section>

      <section className="machine-code">
        <div className="machine-section-heading">
          <span className="machine-kicker">Core implementation</span>
          <h2>Profile, suggest, describe, audit, navigate</h2>
          <p>
            Five pure functions from <code>semiotic/ai</code>, composed. The
            engine reads capability descriptors that ship next to every chart;
            no network, no API key, no model.
          </p>
        </div>
        <CodeBlock code={implementationCode} language="jsx" />
      </section>

      <p className="machine-source-note">
        Real data: <a href="https://data.worldbank.org" target="_blank" rel="noopener noreferrer">World Bank, World Development Indicators</a>,
        retrieved {WORLD_DATA_RETRIEVED} — {WORLD_COUNTRIES.length} countries spanning
        every World Bank region and income group, {WORLD_OBSERVATIONS.length} country-year
        observations, 1990–2023. The chart recommendations, descriptions, accessibility
        audit, and navigation tree are computed entirely in your browser with no
        language model.
      </p>
    </ExamplePageLayout>
  )
}

const ROLE_ORDER = ["x", "y", "size", "category", "series", "time"]
const FALLBACK_TREE = { id: "root", role: "chart", label: "No structure", level: 1, children: [] }

function suggestionKey(s) {
  return `${s.component}/${s.variant?.key ?? "base"}`
}

function ProfileStat({ label, value }) {
  return (
    <div className="machine-profile-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function Rubric({ rubric }) {
  const dims = [
    { key: "familiarity", label: "fam" },
    { key: "accuracy", label: "acc" },
    { key: "precision", label: "prec" },
  ]
  return (
    <div className="machine-rubric">
      {dims.map((dim) => (
        <span key={dim.key} className="machine-meter" title={`${dim.key} ${rubric[dim.key]}/5`}>
          <i>{dim.label}</i>
          <span className="machine-meter-track">
            <span
              className="machine-meter-fill"
              style={{ width: `${(rubric[dim.key] / 5) * 100}%` }}
            />
          </span>
        </span>
      ))}
    </div>
  )
}

function Audit({ audit }) {
  const s = audit.summary
  const order = ["fail", "warn", "manual"]
  const findings = audit.findings
    .filter((f) => order.includes(f.status))
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
    .slice(0, 5)
  return (
    <div className="machine-audit">
      <div className={`machine-audit-verdict ${audit.ok ? "is-ok" : "is-blocked"}`}>
        <strong>{audit.ok ? "✓ No blocking failures" : "✗ Blocking failures remain"}</strong>
        <span>
          {s.criticalsPassed}/{s.criticalsEvaluated} critical heuristics pass
        </span>
      </div>
      <div className="machine-audit-badges">
        <Badge status="pass" count={s.passes} />
        <Badge status="warn" count={s.warnings} />
        <Badge status="manual" count={s.manual} />
        <Badge status="fail" count={s.fails} />
      </div>
      <ul className="machine-findings">
        {findings.map((f) => {
          const meta = STATUS_META[f.status]
          return (
            <li key={f.id} className={`machine-finding ${meta.className}`}>
              <span className="machine-finding-icon" aria-hidden="true">{meta.icon}</span>
              <span>
                <code>{f.id}</code>
                {f.critical && <span className="machine-finding-critical"> critical</span>}
                <span className="machine-finding-msg"> — {f.message}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Badge({ status, count }) {
  const meta = STATUS_META[status]
  return (
    <span className={`machine-badge ${meta.className}`}>
      <strong>{count}</strong>
      {meta.label}
    </span>
  )
}
