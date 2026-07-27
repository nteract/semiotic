import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BarChart, GroupedBarChart } from "semiotic/ordinal"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  CONDITION_COLORS,
  FOLLOW_UP_FIRST_TRY_FIXTURES,
  FOLLOW_UP_FIRST_TRY_MODELS,
  FOLLOW_UP_RUN,
  FIRST_TRY_FAILURES,
  FIRST_TRY_MODELS,
  GROUNDING_METRICS,
  MODEL_COLORS,
  MODEL_EVALUATION_RUN,
  MODEL_ORDER,
  SCORER_AUDIT_CASES,
  TOTAL_ESTIMATED_USD,
  TOTAL_RECORDED_REQUESTS,
  combinedGroundingDeltas,
  followUpGroundingRows,
  groundingRowsForMetric,
} from "./data/modelEvaluationRun"
import "./ModelEvaluationExamplePage.css"

const INTEGER = new Intl.NumberFormat("en-US")
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function signed(value) {
  if (value > 0) return `+${value}`
  return String(value)
}

function Delta({ value, label }) {
  const kind = value > 0 ? "gain" : value < 0 ? "loss" : "even"
  return (
    <span className="benchmark-chart__delta" data-kind={kind}>
      <strong>{signed(value)}</strong>
      <small>{label}</small>
    </span>
  )
}

function ScoreTooltip({ datum }) {
  const row = datum?.data ?? datum
  return (
    <span className="benchmark-chart__tooltip">
      <strong>{row.model}</strong>
      <span>{row.conditionLabel}</span>
      <b>
        {row.passed}/{row.denominator}
      </b>
    </span>
  )
}

function RunLedger() {
  const rows = [
    [
      "Complete baseline",
      INTEGER.format(MODEL_EVALUATION_RUN.requestCount),
      "one response per case",
    ],
    [
      "Repeated follow-up",
      INTEGER.format(FOLLOW_UP_RUN.requestCount),
      `${FOLLOW_UP_RUN.trialCount} targeted trials`,
    ],
    [
      "Repeated scope",
      `${FOLLOW_UP_RUN.answerableQuestions} + ${FOLLOW_UP_RUN.firstTryFixtures}`,
      "answerable questions + generation fixtures",
    ],
    ["Recorded cost", USD.format(TOTAL_ESTIMATED_USD), "baseline plus follow-up"],
  ]
  return (
    <dl className="benchmark-chart__ledger">
      {rows.map(([label, value, note]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            <strong>{value}</strong>
            <span>{note}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function ModelEvaluationReadingRoom() {
  const [metricId, setMetricId] = useState("overall")
  const [followUpWidth, followUpRef] = useResponsiveWidth(320, 920)
  const [groundingWidth, groundingRef] = useResponsiveWidth(320, 920)
  const [firstTryWidth, firstTryRef] = useResponsiveWidth(320, 760)

  const metric =
    GROUNDING_METRICS.find((candidate) => candidate.id === metricId) ?? GROUNDING_METRICS[0]
  const groundingRows = useMemo(() => groundingRowsForMetric(metric.id), [metric.id])
  const repeatedGroundingRows = useMemo(() => followUpGroundingRows(), [])
  const deltas = useMemo(() => MODEL_ORDER.map((model) => combinedGroundingDeltas(model)), [])
  const maximumCost = Math.max(...FIRST_TRY_MODELS.map((row) => row.estimatedUsd))
  const perfectFollowUpFixtures = FOLLOW_UP_FIRST_TRY_FIXTURES.filter(
    (row) => row.passed === row.attempted,
  ).length
  const gaugeFollowUp = FOLLOW_UP_FIRST_TRY_FIXTURES.find((row) => row.fixtureId === "gauge-static")

  return (
    <div className="benchmark-chart">
      <header className="benchmark-chart__masthead">
        <div>
          <p className="benchmark-chart__eyebrow">
            OpenAI GPT-5.6 compatibility evidence · snapshot 2026-07-27
          </p>
          <h2>The benchmark is a chart, too.</h2>
          <p>
            A scorecard has encodings, denominators, and failure modes—just like the charts it
            judges. This one asks two different questions: can a model read what is there, and can
            it stop when the evidence runs out?
          </p>
        </div>
        <div className="benchmark-chart__stamp" aria-label="Run completed">
          <span>COMPLETE</span>
          <strong>{INTEGER.format(TOTAL_RECORDED_REQUESTS)}</strong>
          <small>recorded requests</small>
        </div>
      </header>

      <RunLedger />

      <section className="benchmark-chart__chapter" aria-labelledby="follow-up-heading">
        <div className="benchmark-chart__chapter-heading">
          <p>Post-merge repeated trials</p>
          <h3 id="follow-up-heading">The revised payload recovered the answerable lookups.</h3>
          <span>
            Twenty answerable questions and seven generation fixtures were repeated across every
            model. PNG-only stayed in the run as a control.
          </span>
        </div>

        <div className="benchmark-chart__chart-shell" ref={followUpRef}>
          <GroupedBarChart
            data={repeatedGroundingRows}
            categoryAccessor="model"
            groupBy="conditionLabel"
            valueAccessor="passed"
            colorBy="conditionLabel"
            colorScheme={CONDITION_COLORS}
            valueExtent={[0, 60]}
            sort={false}
            width={followUpWidth}
            height={360}
            showGrid
            showLegend
            legendPosition="bottom"
            legendInteraction="isolate"
            enableHover
            tooltip={(datum) => <ScoreTooltip datum={datum} />}
            categoryLabel="Model"
            valueLabel="Correct answerable outcomes (of 60)"
            title="Repeated answerable outcomes"
            description="Across three targeted trials, PNG plus grounding and grounding-only each passed all 180 answerable outcomes. PNG-only passed 139 of 180."
            summary="The revised source-fact payload recovered every targeted answerable lookup across Sol, Terra, and Luna. This follow-up did not repeat the unanswerable questions."
            accessibleTable
          />
        </div>

        <div className="benchmark-chart__first-try-grid">
          <div className="benchmark-chart__finding">
            <span>First-attempt generation</span>
            <strong>{perfectFollowUpFixtures} fixtures held across every model and trial.</strong>
            <p>
              The remaining fixture, <code>gauge-static</code>, passed {gaugeFollowUp?.passed}/
              {gaugeFollowUp?.attempted}. Luna twice added an unsupported HOC prop to an otherwise
              valid BigNumber proposal.
            </p>
          </div>
          <div className="benchmark-chart__cost-strip" aria-label="Repeated generation by model">
            {FOLLOW_UP_FIRST_TRY_MODELS.map((row) => (
              <article key={row.model}>
                <header>
                  <strong>{row.model}</strong>
                  <span>{row.modelId}</span>
                </header>
                <div
                  className="benchmark-chart__cost-meter"
                  aria-label={`${row.model} passed ${row.passed} of ${row.attempted}`}
                >
                  <i
                    style={{
                      width: `${(row.passed / row.attempted) * 100}%`,
                      background: MODEL_COLORS[row.model],
                    }}
                  />
                </div>
                <dl>
                  <div>
                    <dt>Passing proposals</dt>
                    <dd>
                      {row.passed}/{row.attempted}
                    </dd>
                  </div>
                  <div>
                    <dt>Pass rate</dt>
                    <dd>{Math.round((row.passed / row.attempted) * 100)}%</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>

        <aside className="benchmark-chart__margin-note">
          <strong>What the repeat establishes</strong>
          <p>
            The source-fact revision fixed the tested value, hierarchy, geo, and physics lookups. It
            does not update the baseline’s abstention result, because the thirty unanswerable
            questions were outside this targeted run.
          </p>
        </aside>
      </section>

      <section className="benchmark-chart__chapter" aria-labelledby="grounding-heading">
        <div className="benchmark-chart__chapter-heading">
          <p>Original baseline · reader grounding</p>
          <h3 id="grounding-heading">Grounding improved restraint, not chart reading.</h3>
          <span>
            Compare correct answers with correct restraint instead of compressing both into the same
            bar.
          </span>
        </div>

        <div className="benchmark-chart__metric-controls" aria-label="Score to compare">
          {GROUNDING_METRICS.map((candidate) => (
            <button
              type="button"
              key={candidate.id}
              aria-label={`${candidate.shortLabel}, score out of ${candidate.denominator}`}
              aria-pressed={candidate.id === metric.id}
              onClick={() => setMetricId(candidate.id)}
            >
              <span>{candidate.shortLabel}</span>
              <small>out of {candidate.denominator}</small>
            </button>
          ))}
        </div>

        <div className="benchmark-chart__finding" role="status" aria-live="polite">
          <span>{metric.label}</span>
          <strong>{metric.finding}</strong>
          <p>{metric.note}</p>
        </div>

        <div className="benchmark-chart__chart-shell" ref={groundingRef}>
          <GroupedBarChart
            key={metric.id}
            data={groundingRows}
            categoryAccessor="model"
            groupBy="conditionLabel"
            valueAccessor="passed"
            colorBy="conditionLabel"
            colorScheme={CONDITION_COLORS}
            valueExtent={[0, metric.denominator]}
            sort={false}
            width={groundingWidth}
            height={360}
            showGrid
            showLegend
            legendPosition="bottom"
            legendInteraction="isolate"
            enableHover
            tooltip={(datum) => <ScoreTooltip datum={datum} />}
            categoryLabel="Model"
            valueLabel={`Correct ${metric.label.toLowerCase()} (of ${metric.denominator})`}
            title={`${metric.label} by model and evidence condition`}
            description={`${metric.finding} ${metric.note}`}
            summary="The combined reader-grounding payload improved Sol's aggregate score through abstention, tied the PNG-only totals for Terra and Luna, and did not improve answerable-question accuracy."
            accessibleTable
          />
        </div>

        <div className="benchmark-chart__delta-grid">
          {deltas.map((row) => (
            <article key={row.model}>
              <header>
                <i style={{ background: MODEL_COLORS[row.model] }} aria-hidden="true" />
                <span>{row.model}</span>
                <small>combined minus PNG</small>
              </header>
              <div>
                <Delta value={row.overall} label="overall" />
                <Delta value={row.answerable} label="answered" />
                <Delta value={row.unanswerable} label="abstained" />
              </div>
            </article>
          ))}
        </div>

        <aside className="benchmark-chart__margin-note">
          <strong>What survived the comparison</strong>
          <p>
            Structured grounding can help a model refuse unsupported claims. This run does not show
            that the current payload helps models recover more labels or values from a chart.
          </p>
        </aside>
      </section>

      <section className="benchmark-chart__chapter" aria-labelledby="first-try-heading">
        <div className="benchmark-chart__chapter-heading">
          <p>Original baseline · first-attempt generation</p>
          <h3 id="first-try-heading">Chart choice did not guarantee a valid render.</h3>
          <span>
            Every proposal had one chance to validate, render visible marks, and avoid error
            diagnostics. There was no repair pass.
          </span>
        </div>

        <div className="benchmark-chart__first-try-grid">
          <div
            className="benchmark-chart__chart-shell benchmark-chart__chart-shell--compact"
            ref={firstTryRef}
          >
            <BarChart
              data={FIRST_TRY_MODELS}
              categoryAccessor="model"
              valueAccessor="passed"
              colorBy="model"
              colorScheme={MODEL_COLORS}
              valueExtent={[0, 22]}
              orientation="horizontal"
              sort={false}
              width={firstTryWidth}
              height={250}
              showGrid
              enableHover
              categoryLabel="Model"
              valueLabel="Passing first attempts (of 22)"
              title="First-attempt Semiotic proposals"
              description="Sol passed 21 of 22 first attempts. Terra and Luna each passed 17 of 22."
              summary="A pass requires valid props, visible render evidence, and no error diagnostics."
              accessibleTable
            />
          </div>

          <div className="benchmark-chart__cost-strip" aria-label="Cost and latency by model">
            {FIRST_TRY_MODELS.map((row) => (
              <article key={row.model}>
                <header>
                  <strong>{row.model}</strong>
                  <span>{row.modelId}</span>
                </header>
                <div
                  className="benchmark-chart__cost-meter"
                  aria-label={`${row.model} estimated cost ${USD.format(row.estimatedUsd)}`}
                >
                  <i
                    style={{
                      width: `${(row.estimatedUsd / maximumCost) * 100}%`,
                      background: MODEL_COLORS[row.model],
                    }}
                  />
                </div>
                <dl>
                  <div>
                    <dt>172 requests</dt>
                    <dd>{USD.format(row.estimatedUsd)}</dd>
                  </div>
                  <div>
                    <dt>Average response</dt>
                    <dd>{INTEGER.format(row.averageLatencyMs)} ms</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>

        <div className="benchmark-chart__failure-table-wrap">
          <table className="benchmark-chart__failure-table">
            <caption>Failures by fixture family</caption>
            <thead>
              <tr>
                <th scope="col">Fixture</th>
                <th scope="col">What it taught us</th>
                {MODEL_ORDER.map((model) => (
                  <th key={model} scope="col">
                    {model}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FIRST_TRY_FAILURES.map((failure) => (
                <tr key={failure.fixtureId}>
                  <th scope="row">
                    <span>{failure.label}</span>
                    <code>{failure.fixtureId}</code>
                  </th>
                  <td>
                    <b>{failure.kind}</b>
                    {failure.lesson}
                  </td>
                  {MODEL_ORDER.map((model) => {
                    const failed = failure.models.includes(model)
                    return (
                      <td key={model}>
                        <span
                          className="benchmark-chart__failure-mark"
                          data-failed={failed ? "true" : "false"}
                          aria-label={`${model} ${failed ? "failed" : "passed"} this fixture`}
                        >
                          {failed ? "×" : "·"}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="benchmark-chart__margin-note benchmark-chart__margin-note--blue">
          <strong>The oracle was part of the system under test</strong>
          <p>
            Sol’s `BigNumber` choice was not imaginary—it is a real Semiotic component documented in
            the supplied context. The failure exposed a render-evidence seam as much as a model
            miss.
          </p>
        </aside>
      </section>

      <section className="benchmark-chart__chapter" aria-labelledby="scorer-heading">
        <div className="benchmark-chart__chapter-heading">
          <p>Scorer audit</p>
          <h3 id="scorer-heading">The scorer needed a manual review.</h3>
          <span>
            Before publication, every score change between PNG-only and combined evidence was read
            by a person. That audit found these lexical traps.
          </span>
        </div>

        <div className="benchmark-chart__audit-grid">
          {SCORER_AUDIT_CASES.map((entry) => (
            <article key={entry.id}>
              <header>
                <strong>{entry.label}</strong>
              </header>
              <p className="benchmark-chart__audit-expected">{entry.expected}</p>
              <blockquote>{entry.answer}</blockquote>
              <div className="benchmark-chart__verdict-shift" aria-label="Scorer correction">
                <span data-verdict={entry.before}>before: {entry.before}</span>
                <i aria-hidden="true">→</i>
                <span data-verdict={entry.after}>corrected: {entry.after}</span>
              </div>
              <p>{entry.reason}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="benchmark-chart__conclusion">
        <p>THE READING</p>
        <h3>The repeat separates repaired contracts from residual risk.</h3>
        <div>
          <p>
            The revised grounding payload held across every repeated answerable outcome. Six
            generation fixtures also held everywhere. BigNumber’s remaining HOC-prop confusion stays
            visible as the next narrow contract problem.
          </p>
          <p>
            For the deterministic intelligence layer that generated the grounding payload, continue
            with <Link to="/examples/what-the-machine-sees">What the Machine Sees</Link>.
          </p>
        </div>
      </section>

      <details className="benchmark-chart__methods">
        <summary>Methods, provenance, and limits</summary>
        <div>
          <p>
            This page preserves the complete one-response baseline and adds three repeated targeted
            trials. The follow-up covers the seven generation fixtures that previously failed and
            all twenty answerable grounding questions; it does not carry forward untouched cases.
            The Responses API ran with reasoning effort set to none and provider storage disabled.
          </p>
          <dl>
            <div>
              <dt>Grounding fixture</dt>
              <dd>{MODEL_EVALUATION_RUN.fixtureRevision}</dd>
            </div>
            <div>
              <dt>First-try fixture</dt>
              <dd>{FOLLOW_UP_RUN.firstTryRevision}</dd>
            </div>
            <div>
              <dt>Follow-up requests</dt>
              <dd>{INTEGER.format(FOLLOW_UP_RUN.requestCount)}</dd>
            </div>
            <div>
              <dt>Scorer</dt>
              <dd>{MODEL_EVALUATION_RUN.scoringRevision}</dd>
            </div>
          </dl>
          <p>
            Cost is the runner’s locked-rate estimate, not a billing ledger. The repeat supports
            claims only for its targeted fixtures and answerable questions.
          </p>
          <a
            href="https://github.com/nteract/semiotic/tree/main/evals/reports/openai-follow-up"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the repeated follow-up report
          </a>
          <a
            href="https://github.com/nteract/semiotic/tree/main/evals/reports/openai-gpt-5.6-2026-07-27"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the scored reports and request ledger
          </a>
        </div>
      </details>
    </div>
  )
}

export default function ModelEvaluationExamplePage() {
  return (
    <ExamplePageLayout title="The Benchmark Is a Chart, Too">
      <ModelEvaluationReadingRoom />
    </ExamplePageLayout>
  )
}
