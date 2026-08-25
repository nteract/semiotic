import React, { useMemo } from "react"
import { BarChart, DotPlot } from "semiotic/ordinal"
import { ThemeProvider } from "semiotic/themes/react"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import { buildAestheticPolicyShowcase } from "./aestheticPolicyStudio"
import "./AestheticPolicyStudioExamplePage.css"

const CHARTS = { BarChart, DotPlot }

const FEATURE_SHORT_LABELS = {
  "mark-scaffold-hierarchy": "Mark hierarchy",
  "palette-authorship": "Palette voice",
  "palette-economy": "Color economy",
  "typographic-hierarchy": "Type hierarchy",
  "theme-coherence": "Theme coherence",
  "editorial-emphasis": "Editorial emphasis",
}

function Score({ report, label = "Policy fit" }) {
  return (
    <div className="policy-score" data-status={report.ok ? "pass" : "warn"}>
      <span>{label}</span>
      <strong>{report.score === null ? "OFF" : Math.round(report.score)}</strong>
      <small>
        {report.score === null ? "no weighted gate" : `/ 100 · floor ${report.minimumScore}`}
      </small>
    </div>
  )
}

function WeightProfile({ profile }) {
  return (
    <div className="policy-weights" aria-label={`${profile.name} aesthetic weights`}>
      {Object.entries(profile.weights).map(([id, weight]) => (
        <div key={id} className="policy-weight-row">
          <span>{FEATURE_SHORT_LABELS[id]}</span>
          <i aria-hidden="true">
            <b style={{ width: `${(weight / 5) * 100}%` }} />
          </i>
          <strong>{weight.toFixed(1)}×</strong>
        </div>
      ))}
    </div>
  )
}

function EvidenceStrip({ report }) {
  return (
    <div className="policy-evidence-strip">
      {report.features.map((feature) => (
        <div key={feature.id} data-status={feature.status}>
          <span>{FEATURE_SHORT_LABELS[feature.id]}</span>
          <strong>{Math.round(feature.score * 100)}</strong>
          <small>{feature.message}</small>
        </div>
      ))}
    </div>
  )
}

function ChartPanel({ candidate, className = "" }) {
  const [width, ref] = useResponsiveWidth(280, 590)
  const Chart = CHARTS[candidate.component]
  return (
    <div ref={ref} className={`policy-chart ${className}`} data-candidate={candidate.id}>
      <ThemeProvider theme={candidate.theme}>
        <Chart
          {...candidate.props}
          width={width}
          height={350}
          responsiveRules={[
            {
              id: `${candidate.id}-phone`,
              when: { maxWidth: 520 },
              transform: { mode: "mobile", showLegend: false },
            },
          ]}
        />
      </ThemeProvider>
    </div>
  )
}

function OrganizationCard({ organization, ordinal }) {
  const { candidate, report } = organization.selection.selected
  const alternative = organization.selection.ranked.find(
    (entry) => entry.candidate.id !== candidate.id,
  )
  return (
    <article className="policy-organization" data-organization={organization.id}>
      <header>
        <span>POLICY 0{ordinal}</span>
        <small>{organization.sector}</small>
        <h3>{organization.shortName}</h3>
        <p>{organization.principle}</p>
      </header>
      <div className="policy-organization__weights">
        <strong>What leadership chose to reward</strong>
        <WeightProfile profile={organization.profile} />
      </div>
      <div className="policy-selection-label">
        <div>
          <span>SELECTED TREATMENT</span>
          <strong>{candidate.label}</strong>
        </div>
        <Score report={report} />
      </div>
      <ChartPanel candidate={candidate} />
      <p className="policy-decision">{candidate.decision}</p>
      <div className="policy-counterfactual">
        <span>The other treatment under this policy</span>
        <strong>{Math.round(alternative.report.score)} / 100</strong>
        <small>
          The evidence is still valid; it simply fits this organization’s declared visual priorities
          less well.
        </small>
      </div>
    </article>
  )
}

export default function AestheticPolicyStudioExamplePage() {
  const showcase = useMemo(() => buildAestheticPolicyShowcase(), [])
  const defaultAuthorship = showcase.defaultCase.report.features.find(
    (feature) => feature.id === "palette-authorship",
  )

  return (
    <ExamplePageLayout title="Aesthetic Policy Studio">
      <main className="policy-studio">
        <header className="policy-hero">
          <div>
            <span className="policy-kicker">SEMIOTIC · DESIGN GOVERNANCE BRIEFING</span>
            <h2>Taste becomes governable when the judgment is named.</h2>
            <p>
              The data does not change. The trust floor does not change. What changes is the visual
              behavior an organization has explicitly decided to value—and Semiotic keeps the
              measurement separate from that decision.
            </p>
          </div>
          <aside>
            <span>THE LEADERSHIP DECISION</span>
            <strong>Which visible qualities should our charts reliably reward?</strong>
            <small>
              Weights are policy. Measurements are evidence. The final score names both.
            </small>
          </aside>
        </header>

        <section className="policy-default" aria-labelledby="default-policy-title">
          <div className="policy-section-heading">
            <span>01 · OUT OF THE BOX</span>
            <h3 id="default-policy-title">A capable baseline, not borrowed identity.</h3>
            <p>
              Semiotic’s balanced profile makes legibility and hierarchy count most. It allows the
              familiar default palette, but records that no organization-specific palette decision
              has been made. That is a useful default—and an intentionally incomplete design system.
            </p>
          </div>
          <div className="policy-default-grid">
            <ChartPanel
              candidate={showcase.defaultCase.candidate}
              className="policy-chart--default"
            />
            <aside className="policy-default-report">
              <Score report={showcase.defaultCase.report} label="Default score" />
              <WeightProfile
                profile={{
                  name: showcase.defaultCase.report.profile,
                  weights: Object.fromEntries(
                    showcase.defaultCase.report.features.map((feature) => [
                      feature.id,
                      feature.weight,
                    ]),
                  ),
                }}
              />
              <div className="policy-default-note">
                <span>VISIBLE, NOT FATAL</span>
                <strong>{defaultAuthorship.message}</strong>
                <small>
                  Default palettes are evidence of an unmade brand decision, not proof of a bad
                  chart. The default weight is deliberately modest.
                </small>
              </div>
            </aside>
          </div>
          <EvidenceStrip report={showcase.defaultCase.report} />
        </section>

        <section className="policy-invariants" aria-labelledby="policy-invariants-title">
          <div>
            <span>THE NON-NEGOTIABLE FLOOR</span>
            <h3 id="policy-invariants-title">Aesthetic disagreement begins after comprehension.</h3>
          </div>
          <div className="policy-invariant-grid">
            {showcase.invariants.map((invariant, index) => (
              <article key={invariant.id}>
                <span>0{index + 1}</span>
                <strong>{invariant.label}</strong>
                <p>{invariant.explanation}</p>
              </article>
            ))}
          </div>
          <p className="policy-invariant-explainer">
            The receding grid is the clearest example. Stone and Bartram’s guidance supports a
            boundary—reference structure should remain visible without competing with the data—not a
            single fashionable grid color. Semiotic measures that relationship. Both organizations
            may choose radically different voices, but neither gets to make the apparatus louder
            than the evidence.
          </p>
        </section>

        <section className="policy-opposition" aria-labelledby="policy-opposition-title">
          <div className="policy-section-heading policy-section-heading--centered">
            <span>02 · TWO LEGITIMATE INSTITUTIONS</span>
            <h3 id="policy-opposition-title">Opposing weights. Different outputs. Same facts.</h3>
            <p>
              Each profile scores the same two candidate treatments. The higher-scoring treatment is
              emitted. This is not a model guessing which chart looks expensive; it is a
              reconstructable weighted decision over named, machine-visible evidence.
            </p>
          </div>
          <div className="policy-organization-grid">
            {showcase.organizations.map((organization, index) => (
              <OrganizationCard
                key={organization.id}
                organization={organization}
                ordinal={index + 1}
              />
            ))}
          </div>
        </section>

        <section className="policy-matrix" aria-labelledby="policy-matrix-title">
          <div>
            <span>THE DECISION RECORD</span>
            <h3 id="policy-matrix-title">Every selection remains auditable.</h3>
            <p>
              Northstar rewards one-color economy and estate-wide coherence; it assigns no score to
              editorial emphasis. Fieldnote heavily rewards authored palette, typographic hierarchy,
              and a selective focal accent. Neither policy alters the underlying feature
              measurements.
            </p>
          </div>
          <div className="policy-matrix-table" role="table" aria-label="Candidate policy scores">
            <div role="row" className="policy-matrix-row policy-matrix-row--header">
              <span role="columnheader">Candidate treatment</span>
              {showcase.organizations.map((organization) => (
                <strong key={organization.id} role="columnheader">
                  {organization.shortName}
                </strong>
              ))}
            </div>
            {showcase.organizations[0].selection.ranked.map(({ candidate }) => (
              <div role="row" className="policy-matrix-row" key={candidate.id}>
                <span role="rowheader">{candidate.label}</span>
                {showcase.organizations.map((organization) => {
                  const entry = organization.selection.ranked.find(
                    (ranked) => ranked.candidate.id === candidate.id,
                  )
                  const selected = organization.selection.selected.candidate.id === candidate.id
                  return (
                    <strong key={organization.id} role="cell" data-selected={selected || undefined}>
                      {Math.round(entry.report.score)}
                      {selected ? <small> selected</small> : null}
                    </strong>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        <footer className="policy-method">
          <div>
            <span>WHY THIS IS DEFENSIBLE</span>
            <h3>Boundary research, explicit policy, separate human judgment.</h3>
          </div>
          <p>
            The aggregate follows a weighted quality-function model: formulas, weights, composition,
            and interpretation stay visible. Professional style-guide practice supports
            organization-owned palette and emphasis rules. Human appeal is not inferred from the
            machine score; teams can validate it separately with BeauVis.
          </p>
          <nav aria-label="Aesthetic policy research">
            <a
              href="https://www.tableau.com/research/publications/whisper-dont-scream-grids-and-transparency"
              target="_blank"
              rel="noreferrer"
            >
              Grid hierarchy research ↗
            </a>
            <a href="https://doi.org/10.1145/3593224" target="_blank" rel="noreferrer">
              Weighted quality model ↗
            </a>
            <a
              href="https://www.datawrapper.de/blog/colors-for-data-vis-style-guides"
              target="_blank"
              rel="noreferrer"
            >
              Organizational color systems ↗
            </a>
            <a href="https://arxiv.org/abs/2207.14147" target="_blank" rel="noreferrer">
              BeauVis human scale ↗
            </a>
          </nav>
        </footer>
      </main>
    </ExamplePageLayout>
  )
}
