import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BarChart, GroupedBarChart } from "semiotic/ordinal"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  CONDITION_COLORS,
  FIRST_TRY_FAILURES,
  FIRST_TRY_MODELS,
  GROUNDING_METRICS,
  MODEL_COLORS,
  MODEL_EVALUATION_RUN,
  MODEL_ORDER,
  SCORER_AUDIT_CASES,
  combinedGroundingDeltas,
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
    ["Requests", INTEGER.format(MODEL_EVALUATION_RUN.requestCount), "across three models"],
    [
      "Grounding",
      `${MODEL_EVALUATION_RUN.groundingRequestsPerModel}/model`,
      "50 questions × 3 evidence conditions",
    ],
    [
      "First try",
      `${MODEL_EVALUATION_RUN.firstTryRequestsPerModel}/model`,
      "one proposal, no repair pass",
    ],
    [
      "Run cost",
      USD.format(MODEL_EVALUATION_RUN.estimatedUsd),
      `${MODEL_EVALUATION_RUN.durationMinutes} minutes`,
    ],
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
  const [groundingWidth, groundingRef] = useResponsiveWidth(320, 920)
  const [firstTryWidth, firstTryRef] = useResponsiveWidth(320, 760)

  const metric =
    GROUNDING_METRICS.find((candidate) => candidate.id === metricId) ??
    GROUNDING_METRICS[0]
  const groundingRows = useMemo(() => groundingRowsForMetric(metric.id), [metric.id])
  const deltas = useMemo(
    () => MODEL_ORDER.map((model) => combinedGroundingDeltas(model)),
    [],
  )
  const maximumCost = Math.max(...FIRST_TRY_MODELS.map((row) => row.estimatedUsd))

  return (
    <div className="benchmark-chart">
      <header className="benchmark-chart__masthead">
        <div>
          <p className="benchmark-chart__eyebrow">
            OpenAI GPT-5.6 compatibility run · snapshot 2026-07-27
          </p>
          <h2>The benchmark is a chart, too.</h2>
          <p>
            A scorecard has encodings, denominators, and failure modes—just like
            the charts it judges. This one asks two different questions: can a
            model read what is there, and can it stop when the evidence runs out?
          </p>
        </div>
        <div className="benchmark-chart__stamp" aria-label="Run completed">
          <span>COMPLETE</span>
          <strong>516</strong>
          <small>requests</small>
        </div>
      </header>

      <RunLedger />

      <section className="benchmark-chart__chapter" aria-labelledby="grounding-heading">
        <div className="benchmark-chart__chapter-heading">
          <p>01 · The reading test</p>
          <h3 id="grounding-heading">One total was hiding two jobs.</h3>
          <span>
            Switch the denominator. The same responses tell a different story
            when correct answers and correct restraint stop sharing one bar.
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
            Structured grounding can help a model refuse unsupported claims.
            This run does not show that the current payload helps models recover
            more labels or values from a chart.
          </p>
        </aside>
      </section>

      <section className="benchmark-chart__chapter" aria-labelledby="first-try-heading">
        <div className="benchmark-chart__chapter-heading">
          <p>02 · The first-draft test</p>
          <h3 id="first-try-heading">Correct chart family is not enough.</h3>
          <span>
            Every proposal had one chance to validate, render visible marks, and
            avoid error diagnostics. There was no repair pass.
          </span>
        </div>

        <div className="benchmark-chart__first-try-grid">
          <div className="benchmark-chart__chart-shell benchmark-chart__chart-shell--compact" ref={firstTryRef}>
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
            <caption>
              The seven fixture families that failed at least one first attempt
            </caption>
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
            Sol’s `BigNumber` choice was not imaginary—it is a real Semiotic
            component documented in the supplied context. The failure exposed a
            render-evidence seam as much as a model miss.
          </p>
        </aside>
      </section>

      <section className="benchmark-chart__chapter" aria-labelledby="scorer-heading">
        <div className="benchmark-chart__chapter-heading">
          <p>03 · Marking the marker</p>
          <h3 id="scorer-heading">Three tiny rules changed the honest result.</h3>
          <span>
            Before publication, every score change between PNG-only and combined
            evidence was read by a person. That audit found these lexical traps.
          </span>
        </div>

        <div className="benchmark-chart__audit-grid">
          {SCORER_AUDIT_CASES.map((entry, index) => (
            <article key={entry.id}>
              <header>
                <span>0{index + 1}</span>
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
        <h3>A benchmark can catch a product seam only if it is allowed to embarrass the benchmark.</h3>
        <div>
          <p>
            Keep the split scores. Keep the failed proposals. Keep the scorer
            revision. The aggregate is useful, but the disagreements are where
            the next product work lives.
          </p>
          <p>
            For the deterministic intelligence layer that generated the
            grounding payload, continue with{" "}
            <Link to="/examples/what-the-machine-sees">What the Machine Sees</Link>.
          </p>
        </div>
      </section>

      <details className="benchmark-chart__methods">
        <summary>Methods, provenance, and limits</summary>
        <div>
          <p>
            This is a checked-in snapshot of one response per fixture and
            condition, not a repeated-trial estimate. The Responses API ran with
            reasoning effort set to none and provider storage disabled.
          </p>
          <dl>
            <div>
              <dt>Grounding fixture</dt>
              <dd>{MODEL_EVALUATION_RUN.fixtureRevision}</dd>
            </div>
            <div>
              <dt>First-try fixture</dt>
              <dd>{MODEL_EVALUATION_RUN.firstTryRevision}</dd>
            </div>
            <div>
              <dt>Scorer</dt>
              <dd>{MODEL_EVALUATION_RUN.scoringRevision}</dd>
            </div>
          </dl>
          <p>
            Cost is the runner’s locked-rate estimate, not a billing ledger.
            Small model differences should not be treated as stable without
            repeated trials.
          </p>
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
