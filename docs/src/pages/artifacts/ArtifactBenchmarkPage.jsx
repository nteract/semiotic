import React from "react"
import { Link } from "react-router-dom"
import PageLayout from "../../components/PageLayout"
import benchmarkSummary from "./artifactBenchmarkSummary.generated.json"
import "./ArtifactContractsOverviewPage.css"

export const BENCHMARK_REPORT_PATH = benchmarkSummary.downloadPath

export const BENCHMARK_LIMITATIONS = [
  `This is a small corpus: ${benchmarkSummary.corpus.cases} mutated pairs and ${benchmarkSummary.measurements.positiveControls.total} positive controls.`,
  "The fixtures, mutations, and expected finding prefixes are self-authored in this repository; there is no independent annotation or external holdout set.",
  `Render evidence currently covers only the ${benchmarkSummary.corpus.rendererScope} path, not every component or renderer.`,
  "The benchmark does not establish source truth, reader comprehension, assistive-technology task success, or safe decisions in practice.",
]

export function formatBenchmarkRate(rate) {
  if (rate == null) return "Unavailable"
  const percentage = rate * 100
  return `${Number.isInteger(percentage) ? percentage : percentage.toFixed(1)}%`
}

function Fraction({ matched, total }) {
  return (
    <strong className="artifact-benchmark-result">
      {matched}/{total}
    </strong>
  )
}

export default function ArtifactBenchmarkPage() {
  const detection = benchmarkSummary.measurements.pairedMutationDetection
  const controls = benchmarkSummary.measurements.positiveControls
  const precision = benchmarkSummary.measurements.refusalPrecision

  return (
    <PageLayout
      title="Artifact Contract benchmark"
      breadcrumbs={[
        { label: "Artifacts", path: "/artifacts" },
        { label: "Benchmark", path: "/artifacts/benchmark" },
      ]}
      prevPage={{ title: "Artifact Contracts", path: "/artifacts/overview" }}
      nextPage={{ title: "Policy and Contributions", path: "/artifacts/governance" }}
    >
      <p className="artifact-overview-lede">
        This deterministic benchmark asks whether Artifact Contract checks surface declared
        integrity problems after a paired mutation, while separately checking that defensible
        positive controls are not incorrectly refused.
      </p>

      <aside className="artifact-overview-boundary" role="note">
        <strong>Implementation evidence, not certification.</strong>
        <span>
          These measurements describe version {benchmarkSummary.benchmarkVersion} of a small,
          self-authored corpus. They provide no field evidence and do not replace domain, editorial,
          accessibility, or audience review.
        </span>
      </aside>

      <section>
        <h2>Measured results</h2>
        <div className="artifact-overview-parts">
          <article>
            <h3>Paired mutation detection</h3>
            <p>
              <Fraction matched={detection.detected} total={detection.total} />
              <span>
                {formatBenchmarkRate(detection.rate)} of paired cases met the declared detection
                criterion.
              </span>
            </p>
          </article>
          <article>
            <h3>Positive-control false refusal</h3>
            <p>
              <Fraction matched={controls.falseRefusals} total={controls.expectedNotRefuse} />
              <span>
                {formatBenchmarkRate(controls.falseRefusalRate)} across explicitly labeled
                not-refuse controls.
              </span>
            </p>
          </article>
          <article>
            <h3>Refusal precision</h3>
            <p>
              <strong className="artifact-benchmark-result">
                {formatBenchmarkRate(precision.value)}
              </strong>
              <span>{precision.reason}</span>
            </p>
          </article>
        </div>
      </section>

      <section>
        <h2>What those numbers mean</h2>
        <p>
          Paired mutation detection is a mutation test: every declared finding prefix had to appear
          after, and not before, its paired mutation set. It measures detection of these authored
          perturbations, not general recall, accuracy, or effectiveness on unseen artifacts.
        </p>
        <p>
          The positive-control result answers a different question. All {controls.total} explicitly
          labeled defensible bases were observed as not-refuse, producing {controls.falseRefusals}{" "}
          false refusals. The mutated cases declare expected findings but do not carry complete
          should-refuse labels, so a refusal precision denominator is unavailable.
        </p>
        <div className="artifact-overview-parts">
          <article>
            <h3>Expected findings</h3>
            <p>
              <Fraction
                matched={benchmarkSummary.measurements.expectedFindings.matched}
                total={benchmarkSummary.measurements.expectedFindings.total}
              />
              <span>Declared finding prefixes matched.</span>
            </p>
          </article>
          <article>
            <h3>Expected unknowns</h3>
            <p>
              <Fraction
                matched={benchmarkSummary.measurements.expectedUnknownPaths.matched}
                total={benchmarkSummary.measurements.expectedUnknownPaths.total}
              />
              <span>Declared unknown paths remained visible.</span>
            </p>
          </article>
          <article>
            <h3>Corpus coverage</h3>
            <p>
              <strong className="artifact-benchmark-result">
                {benchmarkSummary.corpus.tracks} tracks
              </strong>
              <span>
                {benchmarkSummary.corpus.relations} relations and{" "}
                {benchmarkSummary.corpus.mutations} mutation types.
              </span>
            </p>
          </article>
        </div>
      </section>

      <section>
        <h2>Scope and limitations</h2>
        <ul>
          {BENCHMARK_LIMITATIONS.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
        <p>
          Treat these results as reproducible repository evidence for the responsible-practice
          framework, not as a trust badge or a claim that the checks generalize beyond the tested
          cases.
        </p>
      </section>

      <aside className="artifact-overview-example-link">
        <div>
          <span>Complete generated report</span>
          <h2>Inspect every case and finding</h2>
          <p>
            The downloadable JSON includes case-level fingerprints, before-and-after evaluation
            states, detected findings, unknown paths, coverage tables, and positive-control results.
          </p>
        </div>
        <a href={BENCHMARK_REPORT_PATH} download>
          Download benchmark JSON
        </a>
      </aside>

      <p>
        For policy boundaries and contribution guidance, continue to{" "}
        <Link to="/artifacts/governance">Policy and Contributions</Link>.
      </p>
    </PageLayout>
  )
}
