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
  describeChart,
  auditAccessibility,
  AccessibleNavTree,
  buildNavigationTree,
  useNavigationSync,
  ThemeProvider,
  ChartRecipe,
  IntentMark,
  auditObservedScene,
} from "semiotic/ai"
import { XYCustomChart } from "semiotic/xy"
import { waffleLayout } from "semiotic/recipes"
import { Link } from "react-router-dom"
import CodeBlock from "../../components/CodeBlock"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import { waffleRecipeManifest } from "../custom-charts/waffleRecipeManifest"
import ExamplePageLayout from "./ExamplePageLayout"
import { urineWheelRecipeManifest } from "./urineWheelRecipeManifest"
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
  [waffleRecipeManifest.id]: ChartRecipe,
}

const CHART_ID = "machine-sees-chart"
const WAFFLE_CHART_ID = "machine-sees-waffle"
const WAFFLE_COLORS = ["#4e79a7", "#f28e2c", "#59a14f", "#e15759", "#b07aa1"]
const WAFFLE_CONFIG = {
  rows: 10,
  columns: 10,
  gutter: 3,
  categoryAccessor: "income",
  valueAccessor: "population",
}

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

  const activeIntentManifest = useMemo(
    () => active
      ? intentManifestForCandidate(active, question, description)
      : null,
    [active, description, question],
  )

  const sync = useNavigationSync({
    tree,
    chartId: CHART_ID,
    matchFields: question.matchField ? [question.matchField] : undefined,
  })

  const customRecipeData = useMemo(() => shareByGroup("income", "population"), [])
  const customRecipeWidth = Math.min(chartWidth, 520)
  const customDescription = useMemo(
    () => waffleRecipeManifest.description({
      data: customRecipeData,
      config: WAFFLE_CONFIG,
    }),
    [customRecipeData],
  )
  const customNavigation = useMemo(
    () => waffleRecipeManifest.navigation({
      data: customRecipeData,
      config: WAFFLE_CONFIG,
    }),
    [customRecipeData],
  )
  const observedWaffle = useMemo(
    () => observeWaffleScene(customRecipeData, WAFFLE_CONFIG, customRecipeWidth, 300),
    [customRecipeData, customRecipeWidth],
  )

  const selectQuestion = useCallback((id) => {
    setQuestionId(id)
    setOverrideKey(null)
  }, [])

  return (
    <ExamplePageLayout
      title="What the Machine Sees"
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
              Built-in charts and registered recipes, scored against this shape and the{" "}
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
                        {s.displayName || s.component}
                        {s.variant ? <span className="machine-variant"> · {s.variant.label}</span> : null}
                      </strong>
                      <span>
                        <small className="machine-candidate-kind">{s.candidateKind}</small>
                        <span className="machine-score">{s.score.toFixed(1)}</span>
                      </span>
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
                  {isOverride ? "your pick" : "engine's pick"} · {active.displayName || active.component}
                  {active.variant ? ` · ${active.variant.label}` : ""}
                </span>
              )}
            </div>
            {activeIntentManifest && (
              <IntentMark
                manifest={activeIntentManifest}
                className="machine-intent-mark"
              />
            )}
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

      <section className="machine-custom-recipe">
        <div className="machine-section-heading machine-section-heading--custom">
          <span className="machine-kicker">Custom recipe contract · v0</span>
          <h2>The chart exposes the intent behind its design.</h2>
          <p>
            The frame knows how to render rectangles. The recipe manifest states that they mean
            repeated units, that the analytical intent is part-to-whole, and that readers should
            navigate category summaries before moving into the one hundred individual cells.
          </p>
        </div>

        <div className="machine-custom-hero">
          <div className="machine-custom-chart">
            <div className="machine-panel-title">
              <span className="machine-step">A</span>
              <h2>{waffleRecipeManifest.name}</h2>
              <span className="machine-chosen-tag">clean proof</span>
            </div>
            <ThemeProvider theme={carbonTheme}>
              <XYCustomChart
                data={customRecipeData}
                recipe={waffleRecipeManifest}
                recipeId={waffleRecipeManifest.id}
                layout={waffleLayout}
                layoutConfig={WAFFLE_CONFIG}
                colorScheme={WAFFLE_COLORS}
                chartId={WAFFLE_CHART_ID}
                width={customRecipeWidth}
                height={300}
                margin={12}
                enableHover
                accessibleTable
                title="Population by World Bank income group"
                description={customDescription.text}
                summary="One hundred cells normalize the total population represented in the sample; navigation and text aggregate those cells back into meaningful income groups."
              />
            </ThemeProvider>
            <WaffleLegend categories={observedWaffle.categories} />
          </div>

          <aside className="machine-custom-contract">
            <span className="machine-kicker">Why leave the catalog?</span>
            <h3>{waffleRecipeManifest.designContract.whyCustom}</h3>
            <p>{waffleRecipeManifest.designContract.whyNotDefault}</p>
            <dl>
              <div>
                <dt>Primary intent</dt>
                <dd>part-to-whole</dd>
              </div>
              <div>
                <dt>Semantic unit</dt>
                <dd>category, not cell</dd>
              </div>
              <div>
                <dt>Reception strength</dt>
                <dd>memorable + explainable</dd>
              </div>
            </dl>
            <div className="machine-flagship-note">
              <strong>Recipe B · high flavor</strong>
              <Link to="/examples/urine-wheel">{urineWheelRecipeManifest.name}</Link>
              <p>
                A bar chart would erase the historical spectrum, the color-to-diagnosis
                relationships, and the situated act of reading the wheel.
              </p>
              <code>{urineWheelRecipeManifest.id}</code>
            </div>
            <IntentMark
              manifest={intentManifestForRecipe(
                waffleRecipeManifest,
                customDescription,
                "machine-sees-waffle",
              )}
              className="machine-intent-mark"
            />
          </aside>
        </div>

        <div className="machine-custom-grid">
          <section className="machine-panel machine-custom-panel">
            <div className="machine-panel-title">
              <span className="machine-step">01</span>
              <h2>Recipe manifest</h2>
            </div>
            <p className="machine-panel-note">
              Meaning that cannot be recovered from rectangles alone.
            </p>
            <pre className="machine-manifest-json">
              {JSON.stringify(manifestForDisplay(waffleRecipeManifest, WAFFLE_CONFIG), null, 2)}
            </pre>
          </section>

          <section className="machine-panel machine-custom-panel">
            <div className="machine-panel-title">
              <span className="machine-step">02</span>
              <h2>Generated L1–L4 description</h2>
            </div>
            <div className="machine-narration">
              {LEVELS.map(({ key, tag, name }) => (
                <div key={key} className={`machine-level is-${key}`}>
                  <span className="machine-level-tag">
                    {tag} <i>{name}</i>
                  </span>
                  <span className="machine-level-text">{customDescription.levels[key]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="machine-panel machine-custom-panel">
            <div className="machine-panel-title">
              <span className="machine-step">03</span>
              <h2>Navigation tree</h2>
            </div>
            <p className="machine-panel-note">
              Four category nodes summarize the 100-cell visual surface.
            </p>
            <div className="machine-navtree machine-custom-navtree">
              <AccessibleNavTree
                tree={customNavigation}
                label="Waffle recipe — category navigation"
                visible
              />
            </div>
          </section>

          <section className="machine-panel machine-custom-panel">
            <div className="machine-panel-title">
              <span className="machine-step">04</span>
              <h2>Observed-scene audit</h2>
            </div>
            <p className="machine-panel-note">
              The actual Waffle layout is run at this viewport and checked against its manifest.
            </p>
            <ObservedRecipeAudit audit={observedWaffle} />
          </section>
        </div>
      </section>

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

function manifestForDisplay(recipe, config = {}) {
  return {
    id: recipe.id,
    name: recipe.name,
    frameFamily: recipe.frameFamily,
    portability: recipe.portability,
    dataRoles: recipe.dataRoles.map((role) => ({
      ...role,
      field: role.accessor && config[role.accessor] ? config[role.accessor] : role.field,
    })),
    encodings: recipe.encodings,
    intents: recipe.intents,
    reception: recipe.reception,
    designContract: recipe.designContract,
    accessibility: recipe.accessibility,
  }
}

function observeWaffleScene(data, config, width, height) {
  const margin = { top: 12, right: 12, bottom: 12, left: 12 }
  const plot = {
    x: 0,
    y: 0,
    width: Math.max(0, width - margin.left - margin.right),
    height: Math.max(0, height - margin.top - margin.bottom),
  }
  const colorByCategory = new Map()
  const resolveColor = (category) => {
    if (!colorByCategory.has(category)) {
      colorByCategory.set(
        category,
        WAFFLE_COLORS[colorByCategory.size % WAFFLE_COLORS.length],
      )
    }
    return colorByCategory.get(category)
  }
  const result = waffleLayout({
    data,
    scales: {},
    dimensions: {
      width: plot.width,
      height: plot.height,
      margin,
      plot,
    },
    theme: {
      semantic: {},
      categorical: WAFFLE_COLORS,
    },
    resolveColor,
    config,
  })
  const nodes = result.nodes || []
  const categories = new Map()

  for (const node of nodes) {
    const category = String(node.datum?.category ?? "Uncategorized")
    const existing = categories.get(category)
    if (existing) {
      existing.units += 1
    } else {
      categories.set(category, {
        category,
        value: Number(node.datum?.value) || 0,
        units: 1,
        color: node.style?.fill,
      })
    }
  }

  const navigationTree = waffleRecipeManifest.navigation({
    data,
    config,
  })
  const audit = auditObservedScene({
    recipe: waffleRecipeManifest,
    scene: result,
    inputData: data,
    dimensions: { width, height, plot },
    theme: { background: "#ffffff", categorical: WAFFLE_COLORS },
    layoutConfig: config,
    chart: {
      title: "Population by World Bank income group",
      summary: "One hundred cells normalize the represented population.",
      description: waffleRecipeManifest.description({ data, config }).text,
      accessibleTable: true,
      navigationTree,
    },
  })

  return {
    categories: [...categories.values()],
    ...audit,
  }
}

function WaffleLegend({ categories }) {
  return (
    <div className="machine-waffle-legend" aria-label="Income group unit counts">
      {categories.map((category) => (
        <span key={category.category}>
          <i style={{ background: category.color }} aria-hidden="true" />
          <strong>{category.category}</strong>
          <small>{category.units} cells</small>
        </span>
      ))}
    </div>
  )
}

function ObservedRecipeAudit({ audit }) {
  const icons = { pass: "✓", warn: "⚠", fail: "✗", manual: "○" }
  return (
    <div className="machine-recipe-audit">
      <div className={`machine-audit-verdict ${audit.ok ? "is-ok" : "is-blocked"}`}>
        <strong>{audit.summary.passes} observed checks pass</strong>
        <span>{audit.summary.marks} scene nodes inspected</span>
      </div>
      <h3>Declared semantics</h3>
      <p>
        Roles: {audit.declaredSemantics.dataRoles.join(", ")} · intents:{" "}
        {audit.declaredSemantics.intents.join(", ")} · fallback:{" "}
        {audit.declaredSemantics.fallbackDeclared ? "declared" : "missing"}
      </p>
      <h3>Observed evidence</h3>
      <ul>
        {audit.observedSceneEvidence.map((finding) => (
          <li key={finding.id} className={`is-${finding.status}`}>
            <span aria-hidden="true">{icons[finding.status]}</span>
            <span>
              <code>{finding.id}</code>
              <small>{finding.message}</small>
            </span>
          </li>
        ))}
      </ul>
      <h3>Manual AT and reception checks</h3>
      <ul>
        {audit.manualATChecks.map((finding) => (
          <li key={finding.id} className="is-manual">
            <span aria-hidden="true">{icons.manual}</span>
            <span>
              <code>{finding.id}</code>
              <small>{finding.message}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function intentManifestForRecipe(recipe, description, chartId) {
  const primaryIntent = recipe.intents.find(
    (intent) => typeof intent === "object" && intent.strength === "primary",
  )
  const primary =
    typeof primaryIntent === "string"
      ? primaryIntent
      : primaryIntent?.id || primaryIntent?.name ||
        (typeof recipe.intents[0] === "string"
          ? recipe.intents[0]
          : recipe.intents[0]?.id || recipe.intents[0]?.name)
  return {
    ididVersion: "0.1",
    chartId,
    title: recipe.name,
    intent: {
      primary: primary || "explanation",
      secondary: recipe.intents
        .map((intent) => typeof intent === "string" ? intent : intent.id || intent.name)
        .filter((intent) => intent && intent !== primary),
      communicativeAct: description?.levels?.l4,
    },
    audience: {
      primary: recipe.audience?.primary,
      familiarityAssumptions: recipe.audience?.familiarity,
      literacyTargets: recipe.audience?.literacyTargets?.map((target) => ({
        feature: target.concept,
        rationale: target.rationale,
      })),
    },
    reception: recipe.reception,
    designContract: {
      chartFamily: recipe.frameFamily,
      whyThisForm: recipe.designContract.whyThisForm || recipe.designContract.whyCustom,
      whyNotDefault: recipe.designContract.whyNotDefault,
      risks: recipe.reception?.risks,
      misuse: recipe.designContract.misuse,
    },
    accessibility: {
      description: description?.text,
      navigation: true,
      dataFallback: recipe.accessibility.fallbackTable,
      manualChecks: [
        "screen-reader behavior",
        "keyboard order quality",
        "metaphor comprehension",
      ],
    },
    provenance: {
      dataSources: ["World Bank, World Development Indicators"],
      reviewStatus: "docs demo",
      generatedBy: "Semiotic recipe intelligence",
    },
  }
}

function intentManifestForCandidate(candidate, question, description) {
  if (candidate.recipeId === waffleRecipeManifest.id) {
    return intentManifestForRecipe(
      waffleRecipeManifest,
      description,
      CHART_ID,
    )
  }
  return {
    ididVersion: "0.1",
    chartId: CHART_ID,
    title: question.question,
    intent: {
      primary: question.intent,
      communicativeAct: description?.levels?.l4,
    },
    reception: {
      channels: ["visual", "interactive", "screen-reader", "agent"],
      strengths: ["familiar", "deterministic", "agent-readable"],
      scaffolds: ["description", "accessible table", "navigation tree"],
    },
    designContract: {
      chartFamily: candidate.family,
      whyThisForm: candidate.reasons[0],
      risks: candidate.caveats,
    },
    accessibility: {
      description: description?.text,
      navigation: true,
      dataFallback: true,
      manualChecks: ["screen-reader behavior", "keyboard order quality"],
    },
  }
}
