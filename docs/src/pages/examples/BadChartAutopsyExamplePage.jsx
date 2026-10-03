import React, { useMemo, useState } from "react"
import { BarChart, DotPlot } from "semiotic/ordinal"
import { ThemeProvider } from "semiotic/themes/react"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  BAD_CHART_PROPS,
  AUTOPSY_AESTHETIC_PROFILE,
  AUTOPSY_THEME,
  REPAIRED_CHART_COMPONENT,
  REPAIRED_CHART_PROPS,
  buildAutopsyCase,
  evaluateAutopsyAesthetics,
} from "./badChartAutopsy"
import "./BadChartAutopsyExamplePage.css"

const STAGES = [
  { id: "intake", label: "Intake", verb: "See the claim" },
  { id: "diagnose", label: "Diagnose", verb: "Find the tricks" },
  { id: "prove", label: "Prove", verb: "Inspect the scene" },
  { id: "repair", label: "Repair", verb: "Publish the honest chart" },
]

const STAGE_COPY = [
  "Atlas looks far ahead of Ember. Look closely at the axis, though: the bars start at 96, making a small difference appear much larger.",
  "Check the data, scale, colors and reading aids together. The chart can use valid numbers and still present them poorly.",
  "The renderer drew all five bars. The audit then finds the problems a mark count cannot catch: the cropped baseline, low contrast and missing context.",
  "The repair keeps the data and switches to dots. Position can show this narrow range clearly without using bar lengths that exaggerate the difference. The labels explain the comparison window.",
]

function Verdict({ report, repaired = false }) {
  return (
    <div className="autopsy-verdict" data-status={report.ok ? "pass" : "fail"}>
      <span>{repaired ? "Publication gate" : "Autopsy verdict"}</span>
      <strong>{report.ok ? "PASS" : "REJECT"}</strong>
      <small>
        {report.summary.errors} errors · {report.summary.warnings} warnings ·{" "}
        {report.summary.manual} manual checks
      </small>
    </div>
  )
}

function Finding({ finding }) {
  return (
    <li className="autopsy-finding" data-severity={finding.severity}>
      <span>{finding.stage}</span>
      <strong>{finding.code}</strong>
      <p>{finding.message}</p>
      {finding.fix ? <small>{finding.fix}</small> : null}
    </li>
  )
}

function ChartSpecimen({ repaired, width }) {
  const props = repaired ? REPAIRED_CHART_PROPS : BAD_CHART_PROPS
  const Chart = repaired ? DotPlot : BarChart
  return (
    <div className="autopsy-specimen" data-kind={repaired ? "repaired" : "suspect"}>
      <div className="autopsy-specimen__tag">
        <span>{repaired ? "Evidence A-02" : "Evidence A-01"}</span>
        <strong>{repaired ? "REPAIRED" : "SUSPECT"}</strong>
      </div>
      {repaired ? (
        <div className="autopsy-specimen__deck" aria-hidden="true">
          <span>HONEST MAGNIFICATION</span>
          <strong>2.2</strong>
          <small>points separate first from fifth</small>
        </div>
      ) : null}
      <ThemeProvider theme={repaired ? AUTOPSY_THEME : undefined}>
        <Chart
          {...props}
          width={width}
          height={repaired ? 315 : 280}
          responsiveRules={[
            {
              id: "autopsy-phone",
              when: { maxWidth: 520 },
              transform: { mode: "mobile", showLegend: false },
            },
          ]}
        />
      </ThemeProvider>
    </div>
  )
}

export default function BadChartAutopsyExamplePage() {
  const [stage, setStage] = useState(0)
  const [chartWidth, chartRef] = useResponsiveWidth(300, 820)
  const autopsy = useMemo(() => buildAutopsyCase(), [])
  const [aestheticWeights, setAestheticWeights] = useState(AUTOPSY_AESTHETIC_PROFILE.weights)
  const aestheticEvaluation = useMemo(
    () => evaluateAutopsyAesthetics(aestheticWeights),
    [aestheticWeights],
  )
  const primaryFindings = autopsy.suspect.findings.filter(
    (finding) =>
      finding.severity !== "manual" &&
      [
        "NON_ZERO_BASELINE",
        "LOW_COLOR_CONTRAST",
        "MISSING_DESCRIPTION",
        "perceivable.low-contrast",
        "understandable.title-summary-caption",
      ].includes(finding.code),
  )

  const advance = () => setStage((current) => Math.min(STAGES.length - 1, current + 1))

  return (
    <ExamplePageLayout title="Bad Chart Autopsy">
      <div className="autopsy-page">
        <header className="autopsy-hero">
          <p className="autopsy-kicker">FORENSIC VISUALIZATION UNIT · CASE 24-08</p>
          <h2>A chart can render perfectly and still fail its reader.</h2>
          <p>
            Atlas appears to dominate this benchmark. Follow the audit to see how the chart
            creates that impression, then compare a repaired version using the same values.
          </p>
          <div className="autopsy-claim">
            <span>Submitted claim</span>
            <strong>“Atlas crushes the competition.”</strong>
          </div>
        </header>

        <nav className="autopsy-stages" aria-label="Autopsy stages">
          {STAGES.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-current={index === stage ? "step" : undefined}
              data-state={index < stage ? "complete" : index === stage ? "current" : "waiting"}
              onClick={() => setStage(index)}
            >
              <span>0{index + 1}</span>
              <strong>{item.label}</strong>
              <small>{item.verb}</small>
            </button>
          ))}
        </nav>

        <section className="autopsy-workbench" aria-live="polite">
          <div className="autopsy-workbench__header">
            <div>
              <span>PROCEDURE 0{stage + 1}</span>
              <h3>{STAGES[stage].label}</h3>
            </div>
            <p>{STAGE_COPY[stage]}</p>
          </div>

          <div ref={chartRef} className="autopsy-chart-stage">
            {stage < 3 ? (
              <ChartSpecimen repaired={false} width={chartWidth} />
            ) : (
              <div className="autopsy-comparison">
                <ChartSpecimen repaired={false} width={Math.max(300, chartWidth / 2 - 16)} />
                <ChartSpecimen repaired width={Math.max(300, chartWidth / 2 - 16)} />
              </div>
            )}
          </div>

          {stage >= 1 ? (
            <div className="autopsy-report">
              <Verdict report={autopsy.suspect} />
              <ol className="autopsy-findings">
                {primaryFindings.map((finding) => (
                  <Finding key={finding.id} finding={finding} />
                ))}
              </ol>
            </div>
          ) : null}

          {stage >= 2 ? (
            <section className="autopsy-evidence" aria-labelledby="scene-proof-title">
              <div>
                <span>RENDER EVIDENCE</span>
                <strong id="scene-proof-title">
                  {autopsy.suspect.evidence?.markCount ?? 0} marks observed
                </strong>
                <small>{autopsy.suspect.evidence?.status ?? "not rendered"} scene status</small>
              </div>
              <p>
                The rendering check confirms that the marks appeared. The other checks examine
                what those marks mean and whether readers can use them.
              </p>
            </section>
          ) : null}

          {stage === 3 ? (
            <section className="autopsy-repair" aria-labelledby="repair-ledger-title">
              <div className="autopsy-repair__heading">
                <div>
                  <span>REPAIR LEDGER</span>
                  <h3 id="repair-ledger-title">A clearer comparison of the same values</h3>
                </div>
                <Verdict report={autopsy.repaired} repaired />
              </div>
              <div className="autopsy-fix-grid">
                {autopsy.fixes.map((fix, index) => (
                  <article key={fix.code}>
                    <span>FIX 0{index + 1}</span>
                    <strong>{fix.code}</strong>
                    <del>{fix.before}</del>
                    <ins>{fix.after}</ins>
                    <p>{fix.effect}</p>
                  </article>
                ))}
              </div>
              <p className="autopsy-release-note">
                The repaired chart has {autopsy.repaired.evidence?.markCount ?? 0} observed marks, an accessible data table and no blocking automated findings. The audit also lists checks that need a human reader.
              </p>
              <section className="autopsy-aesthetic-gate" aria-labelledby="aesthetic-gate-title">
                <div>
                  <span>PRESENTATION GATE</span>
                  <strong id="aesthetic-gate-title">Institutional visual quality</strong>
                  <b data-status={aestheticEvaluation.ok ? "pass" : "warn"}>
                    {aestheticEvaluation.score === null
                      ? "OFF"
                      : `${Math.round(aestheticEvaluation.score)} / 100`}
                  </b>
                </div>
                <p>
                  The style check asks whether the marks stand out and how well the chart fits an
                  organization’s preferences. Inspect each measurement and its weight below.
                  Setting every weight to zero removes style scoring from the publication
                  decision.
                </p>
                <small>
                  Stone &amp; Bartram supply the hierarchy boundary; Grace supplies the weighted
                  quality-function form. Broad appeal remains a separately collected human judgment.
                </small>
                <nav aria-label="Presentation research">
                  <a
                    href="https://www.tableau.com/research/publications/whisper-dont-scream-grids-and-transparency"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Grid hierarchy research ↗
                  </a>
                  <a
                    href="https://wildlab.cs.washington.edu/Publications_files/Harrison_CHI2015.pdf"
                    target="_blank"
                    rel="noreferrer"
                  >
                    First-impression research ↗
                  </a>
                  <a href="https://doi.org/10.1145/3593224" target="_blank" rel="noreferrer">
                    Weighted quality model ↗
                  </a>
                  <a href="https://arxiv.org/abs/2207.14147" target="_blank" rel="noreferrer">
                    BeauVis human scale ↗
                  </a>
                </nav>
                <div className="autopsy-aesthetic-features">
                  {aestheticEvaluation.features.map((feature) => (
                    <label key={feature.id} data-status={feature.status}>
                      <span>
                        <strong>{feature.label}</strong>
                        <small>{feature.message}</small>
                      </span>
                      <meter min="0" max="1" value={feature.score}>
                        {Math.round(feature.score * 100)}%
                      </meter>
                      <output>{Math.round(feature.score * 100)}</output>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={feature.weight}
                        aria-label={`${feature.label} weight`}
                        onChange={(event) =>
                          setAestheticWeights((current) => ({
                            ...current,
                            [feature.id]: Number(event.target.value),
                          }))
                        }
                      />
                      <b>{feature.weight.toFixed(1)}×</b>
                    </label>
                  ))}
                </div>
              </section>
            </section>
          ) : (
            <button className="autopsy-next" type="button" onClick={advance}>
              {stage === 0
                ? "Begin autopsy"
                : stage === 1
                  ? "Inspect render evidence"
                  : "Apply repairs"}
              <span aria-hidden="true">→</span>
            </button>
          )}
        </section>

        <footer className="autopsy-close">
          <span>THE TRUST LOOP</span>
          <p>
            A useful audit checks the data, the drawing and the reading experience.
          </p>
          <code>
            evaluateChart("BarChart", suspectProps) → evaluateChart("
            {REPAIRED_CHART_COMPONENT}", repairedProps)
          </code>
        </footer>
      </div>
    </ExamplePageLayout>
  )
}
