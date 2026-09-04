import React from "react"
import { Link } from "react-router-dom"
import {
  buildArtifactContract,
  createArtifactPacket,
  evaluateArtifact,
  fingerprintValue,
} from "semiotic/artifact"
import { ArtifactInspector } from "semiotic/artifact/react"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import "./ArtifactContractsOverviewPage.css"

const DEMO_DATA = [
  { year: 2022, value: 18 },
  { year: 2023, value: 24 },
  { year: 2024, value: 21 },
  { year: 2025, value: 29 },
]

const DEMO_PROPS = {
  data: DEMO_DATA,
  xAccessor: "year",
  yAccessor: "value",
  title: "Example measure by year",
  description: "A four-year line series from an inline documentation fixture.",
  summary: "Values rise overall, with a decline in 2024.",
  showPoints: true,
  accessibleTable: true,
}

const MINIMAL_CONTRACT = buildArtifactContract("LineChart", DEMO_PROPS, {
  id: "artifact-contract-minimal-example",
  intents: "trend",
})

const DEMO_FINGERPRINT = fingerprintValue(DEMO_DATA).fingerprint
const STRICT_CONTRACT = buildArtifactContract("LineChart", DEMO_PROPS, {
  id: "artifact-contract-strict-example",
  title: DEMO_PROPS.title,
  createdAt: "2026-09-01T00:00:00.000Z",
  intents: "trend",
  purpose: {
    communicativeAct: "Show the direction and year-to-year variation in an example measure.",
    decisionContext: "Documentation only",
    stakes: "informational",
    allowedUses: ["Learn the artifact contract workflow"],
    prohibitedUses: ["Treat the fixture as evidence about a real population"],
  },
  claims: [
    {
      id: "fixture.trend",
      text: "The fixture ends higher in 2025 than it begins in 2022.",
      kind: "observation",
      status: "supported",
      evidenceIds: ["fixture.rows"],
      scope: {
        firstYear: 2022,
        lastYear: 2025,
        unit: "fixture value",
      },
      uncertainty: {
        kind: "qualitative",
        description: "The statement is descriptive; it does not estimate a population effect.",
      },
      asOf: "2025-12-31T23:59:59.000Z",
      authoredBy: { kind: "system", name: "Semiotic documentation fixture" },
    },
  ],
  evidence: [
    {
      id: "fixture.rows",
      role: "source-data",
      label: "Inline documentation rows",
      fingerprint: DEMO_FINGERPRINT,
      dataVersion: "artifact-overview-fixture-v1",
      observedAt: "2025-12-31T23:59:59.000Z",
      relationship: "descriptive",
    },
  ],
  time: {
    eventTime: { field: "year", timezone: "UTC", granularity: "year" },
    observedAt: "2025-12-31T23:59:59.000Z",
    processedAt: "2026-09-01T00:00:00.000Z",
    snapshotAt: "2026-09-01T00:00:00.000Z",
    presentation: { state: "historical", label: "Historical fixture through 2025" },
    freshness: {
      status: "stale",
      checkedAt: "2026-09-01T00:00:00.000Z",
      basis: "This fixed fixture is not a live source.",
    },
    window: {
      start: "2022-01-01T00:00:00.000Z",
      end: "2025-12-31T23:59:59.000Z",
      status: "settled",
    },
    completeness: { status: "settled", basis: "All four authored fixture rows are present." },
    revision: { status: "original" },
  },
  reception: {
    channels: [
      { channel: "visual", disclosure: "standard", navigation: true },
      { channel: "screen-reader", disclosure: "detailed", navigation: true },
      { channel: "agent", disclosure: "detailed", rawData: "bounded" },
    ],
    description: DEMO_PROPS.description,
    dataFallback: true,
    manualChecks: ["Confirm that the wording fits the intended audience."],
  },
  form: {
    chartFamily: "xy",
    whyThisForm: "A line connects ordered yearly observations without implying more precision.",
    rejectedAlternatives: [
      {
        representation: "Table",
        reason: "A table preserves exact values but makes the overall direction slower to scan.",
      },
    ],
    risks: ["A connected line can invite interpolation between annual observations."],
  },
  contestability: {
    sourceRequestsAllowed: true,
    alternativeViews: [
      {
        id: "fixture-table",
        label: "Exact-value table",
        rationale: "Use when exact lookup matters more than shape.",
      },
    ],
  },
  accountability: {
    authors: [{ kind: "system", name: "Semiotic documentation fixture" }],
    generatedBy: "Deterministic example module",
    dataSources: ["Inline documentation fixture"],
    codeRef: "docs/src/pages/artifacts/ArtifactContractsOverviewPage.jsx",
  },
  inheritance: {
    requiredPaths: ["purpose", "claims", "evidence", "time", "contestability"],
    privacy: "public",
    rawDataDefault: "exclude",
    preservation: "full-fidelity",
  },
})

export const STRICT_EVALUATION = evaluateArtifact("LineChart", DEMO_PROPS, STRICT_CONTRACT, {
  data: DEMO_DATA,
  policy: "editorial",
  now: "2026-09-01T00:00:00.000Z",
  describe: true,
  navigable: true,
})

export const STRICT_PACKET =
  STRICT_EVALUATION.status === "acceptable"
    ? createArtifactPacket(STRICT_CONTRACT, {
        format: "static-package",
        includeEvidenceSamples: false,
      })
    : null

export const STRICT_PACKET_RESULT = STRICT_PACKET?.transfer.preservation ?? "withheld"

const MINIMAL_CODE = `import { buildArtifactContract } from "semiotic/artifact"

const contract = buildArtifactContract("LineChart", chartProps, {
  intents: "trend",
})

// The chart renders exactly as before. The contract is an optional sidecar.
// The builder marks missing claims, evidence, and time as unknown.`

export const STRICT_CODE = `import {
  createArtifactPacket,
  evaluateArtifact,
} from "semiotic/artifact"
import { renderChartWithEvidence } from "semiotic/server"

export function prepareArtifactForPublication({
  component,
  chartProps,
  contract,
  data,
  evaluatedAt,
}) {
  const evaluation = evaluateArtifact(component, chartProps, contract, {
    data,
    policy: "editorial",
    // Supply the workflow clock explicitly so review and expiry checks are reproducible.
    now: evaluatedAt,
    // Strict release policies require evidence from the painted scene.
    render: renderChartWithEvidence,
  })

  if (evaluation.status !== "acceptable") {
    return { evaluation, packet: null }
  }

  const packet = createArtifactPacket(contract, {
    format: "static-package",
    includeEvidenceSamples: false,
  })

  return { evaluation, packet }
}`

export const TEMPORAL_ADAPTER_CODE = `import {
  adaptHistoricalSnapshotMetadata,
  adaptProcessingJobMetadata,
  adaptStreamTopicMetadata,
  mergeTemporalContexts,
} from "semiotic/artifact"

const streamTime = adaptStreamTopicMetadata({
  id: "kafka:metrics.v1",
  label: "Kafka topic metrics.v1",
  eventTime: { field: "event_at", timezone: "UTC" },
  observedAt: "2026-09-01T12:00:00Z",
  ingestedAt: "2026-09-01T12:00:05Z",
  watermark: { value: "2026-09-01T11:55:00Z" },
  completeness: { status: "provisional" },
})

const jobTime = adaptProcessingJobMetadata({
  id: "flink:hourly-rollup",
  label: "Flink hourly rollup",
  observedAt: "2026-09-01T12:00:00Z",
  processedAt: "2026-09-01T12:01:00Z",
  completeness: { status: "provisional", basis: "Window remains open" },
})

const snapshotTime = adaptHistoricalSnapshotMetadata({
  id: "tableflow:snapshot-42",
  label: "Tableflow materialized snapshot",
  dataObservedAt: "2026-09-01T12:00:00Z",
  snapshotAt: "2026-09-01T12:02:00Z",
  format: "iceberg",
  schemaVersion: "42",
  catalogRef: "catalog://metrics/hourly",
  completeness: {
    status: "unknown",
    basis: "A committed snapshot does not prove source completeness",
  },
})

// The merged value uses Semiotic's vendor-neutral TemporalContext shape.
export const temporalContext = mergeTemporalContexts(
  streamTime,
  jobTime,
  snapshotTime,
)`

export const INSPECTOR_CODE = `import { ArtifactInspector } from "semiotic/artifact/react"

export function PublishedChartDetails({ contract, evaluation }) {
  return (
    <ArtifactInspector
      contract={contract}
      evaluation={evaluation}
      title="How to read this chart"
    />
  )
}`

const CONTRACT_PARTS = [
  ["Purpose", "Intended task, decision context, stakes, allowed uses, and prohibited uses."],
  ["Claims", "Bounded statements with status, scope, uncertainty, and stable identifiers."],
  ["Evidence", "Source identity, fingerprints, transformations, and links back to claims."],
  ["Time", "Event time, observation time, freshness, window state, and revision state."],
  ["Reception", "Visual, screen-reader, agent, print, and low-bandwidth requirements."],
  ["Correction", "Challenges, replacements, retractions, and the history they must preserve."],
  ["Transfer", "A packet that names preserved and omitted fields when the artifact moves."],
]

export default function ArtifactContractsOverviewPage() {
  const minimalUnknowns = Object.entries(MINIMAL_CONTRACT.fieldStatus ?? {})
  const strictOpenWork = STRICT_EVALUATION.obligations.filter(({ status }) =>
    ["fail", "warn", "manual", "unknown"].includes(status),
  )

  return (
    <PageLayout
      title="Artifact Contracts"
      breadcrumbs={[
        { label: "Artifacts", path: "/artifacts" },
        { label: "Overview", path: "/artifacts/overview" },
      ]}
      nextPage={{ title: "Benchmark", path: "/artifacts/benchmark" }}
    >
      <p className="artifact-overview-lede">
        An artifact contract is an <strong>opt-in, versioned interpretation sidecar</strong> for a
        chart, dashboard, story, alert, or agent answer. It records meaning and limits that pixels
        and component props cannot carry reliably on their own.
      </p>

      <aside className="artifact-overview-boundary" role="note">
        <strong>The rendering boundary stays intact.</strong>
        <span>
          Existing charts do not need a contract, and adding one does not change their visual
          output. Adopt the fields and policy consequence that match the work's stakes.
        </span>
      </aside>

      <section>
        <h2>One record, several answerable questions</h2>
        <p>
          The contract does not collapse quality into a badge. It keeps distinct questions
          inspectable so a reader, reviewer, export pipeline, or agent can see what is known and
          what still needs judgment.
        </p>
        <div className="artifact-overview-parts">
          {CONTRACT_PARTS.map(([title, description]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Minimal path: declare purpose, preserve unknowns</h2>
        <p>
          Start beside an existing chart. The builder derives stable configuration and data
          fingerprints, records the declared intent, and marks missing claims, evidence, and time as
          unknown. Other optional sections remain absent until supplied. Unknown is a valid state;
          it prevents inference from being presented as source truth.
        </p>
        <div className="artifact-overview-path-grid">
          <CodeBlock
            code={MINIMAL_CODE}
            language="jsx"
            codeAreaLabel="Minimal artifact contract code"
          />
          <aside className="artifact-overview-live-card">
            <span>Live result</span>
            <strong>{MINIMAL_CONTRACT.artifact.id}</strong>
            <ul>
              {minimalUnknowns.map(([path, field]) => (
                <li key={path}>
                  <code>{path}</code>
                  <span>{field.status}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section>
        <h2>Strict-policy path: evaluate before publication</h2>
        <p>
          Higher-stakes workflows can require attributable evidence, settled time, accessible
          reception, correction paths, accountability, and preservation. Policy changes the
          consequence—acceptable, conditional, or refuse—without changing the underlying facts.
        </p>
        <p>
          Conditional means open work, not publication approval. Current accessibility audits
          retain manual checks even with a successful render, so this strict example deliberately
          withholds its packet. General review records do not discharge those checks.
          prepareArtifactRevision likewise returns publishable: false for conditional results.
          Attributable, revision-bound manual-check resolution remains host workflow work.
        </p>
        <div className="artifact-overview-path-grid">
          <CodeBlock
            code={STRICT_CODE}
            language="jsx"
            codeAreaLabel="Strict publication check code"
          />
          <aside className="artifact-overview-live-card is-strict">
            <span>Editorial policy · live result</span>
            <strong className={`is-${STRICT_EVALUATION.status}`}>{STRICT_EVALUATION.status}</strong>
            <dl>
              <div>
                <dt>Contract</dt>
                <dd>{STRICT_EVALUATION.validation.artifact.valid ? "valid" : "invalid"}</dd>
              </div>
              <div>
                <dt>Open work</dt>
                <dd>{strictOpenWork.length}</dd>
              </div>
              <div>
                <dt>Repairs</dt>
                <dd>{STRICT_EVALUATION.repairs.length}</dd>
              </div>
              <div>
                <dt>Packet</dt>
                <dd>{STRICT_PACKET_RESULT}</dd>
              </div>
            </dl>
            <p>
              This browser-side preview does not invent server-render evidence. The publication
              sample supplies a real renderer; this live packet stays withheld while render proof
              or other obligations remain unresolved.
            </p>
          </aside>
        </div>
      </section>

      <section>
        <h2>Map infrastructure metadata at the boundary</h2>
        <p>
          A small adapter can translate broker, processing-job, and materialized-snapshot metadata
          into one temporal shape. The example values are synthetic integration records, not vendor
          SDK objects, so no SDK dependency crosses into the artifact contract.
        </p>
        <div className="artifact-overview-path-grid">
          <CodeBlock
            code={TEMPORAL_ADAPTER_CODE}
            language="jsx"
            codeAreaLabel="Synthetic stream job and snapshot adapter code"
          />
          <aside className="artifact-overview-live-card is-adapter" role="note">
            <span>Validation boundary</span>
            <strong>Valid structure is not semantic truth</strong>
            <p>
              A schema-valid temporal record proves that required fields and states are shaped
              correctly. It does not prove that source values are accurate, a watermark is honest, a
              window is complete, or a claim is supported. Those remain separate evidence and review
              obligations.
            </p>
          </aside>
        </div>
      </section>

      <section>
        <h2>Give readers a reusable inspection surface</h2>
        <p>
          The React entry keeps the core contract utilities renderer-independent. Its concise
          summary exposes status, time, claims, evidence, policy, and review signals before native
          disclosure controls reveal as-of details, correction history, alternatives, and stable
          JSON.
        </p>
        <div className="artifact-overview-inspector-grid">
          <CodeBlock
            code={INSPECTOR_CODE}
            language="jsx"
            codeAreaLabel="Artifact inspector React code"
          />
          <ArtifactInspector
            className="artifact-overview-inspector"
            contract={STRICT_CONTRACT}
            evaluation={STRICT_EVALUATION}
            title="How to read this fixture"
            headingLevel={3}
          />
        </div>
      </section>

      <section>
        <h2>Policy is a consequence layer</h2>
        <div className="artifact-overview-policy-grid">
          <article>
            <span>Explore</span>
            <h3>Keep incomplete work inspectable</h3>
            <p>
              The exploratory policy exposes gaps and alternatives while allowing an unfinished
              artifact to remain visible.
            </p>
          </article>
          <article>
            <span>Publish</span>
            <h3>Require evidence and settled language</h3>
            <p>
              The editorial policy can refuse unsupported claims, unknown time, or missing relations
              instead of hiding them behind presentation quality.
            </p>
          </article>
          <article>
            <span>Operate</span>
            <h3>Gate action on live state</h3>
            <p>
              Operational streaming policy adds freshness, completeness, and review requirements
              when people or systems may act on a changing view.
            </p>
          </article>
        </div>
        <p>
          A policy exception is an accountable, bounded review record—not a silent switch. It names
          the rule, rationale, owner, and a future expiry or review time. Evaluation reports applied
          and rejected exceptions separately; missing, invalid, or expired bounds fail closed.
        </p>
      </section>

      <section>
        <h2>Transfer meaning, not just pixels</h2>
        <p>
          <code>createArtifactPacket</code> produces a portable JSON sidecar with an explicit
          transfer report. A PNG or SVG may remain useful while losing correction history or data
          detail; the report makes that loss visible instead of implying full fidelity.
        </p>
        <ol className="artifact-overview-sequence">
          <li>
            <strong>Build</strong>
            <span>Author or derive only what the system can support.</span>
          </li>
          <li>
            <strong>Evaluate</strong>
            <span>Apply a named, versioned policy for the intended use.</span>
          </li>
          <li>
            <strong>Inspect</strong>
            <span>Expose claims, evidence, time, corrections, and alternatives progressively.</span>
          </li>
          <li>
            <strong>Transfer</strong>
            <span>Package the sidecar and report any loss.</span>
          </li>
        </ol>
      </section>

      <aside className="artifact-overview-example-link">
        <div>
          <span>See the complete interaction</span>
          <h2>Open a chart's local inspector</h2>
          <p>
            The flagship example builds the contract from the same deterministic inputs as the
            visible chart, preserves a corrected scope claim, compares policy outcomes, and
            downloads a transfer packet.
          </p>
        </div>
        <Link to="/examples/what-the-machine-sees">What the Machine Sees →</Link>
      </aside>
    </PageLayout>
  )
}
