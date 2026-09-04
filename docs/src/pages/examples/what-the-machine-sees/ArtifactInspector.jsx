import React, { useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ARTIFACT_POLICIES, evaluateArtifact } from "semiotic/artifact"
import DrawerDialog from "../../../components/DrawerDialog"
import {
  buildMachineArtifactRecord,
  MACHINE_ARTIFACT_RETRIEVED_AT,
} from "./buildMachineArtifactRecord"
import "./ArtifactInspector.css"

const POLICY_IDS = ["exploratory", "editorial"]
const OPEN_STATUSES = new Set(["fail", "warn", "manual", "unknown"])

function shortFingerprint(value) {
  if (!value) return "not recorded"
  const [algorithm, digest = value] = value.split(":")
  return `${algorithm}:${digest.slice(0, 14)}…`
}

function valuePreview(value) {
  if (value === undefined) return "not supplied"
  const rendered = typeof value === "string" ? value : JSON.stringify(value)
  return rendered.length > 92 ? `${rendered.slice(0, 89)}…` : rendered
}

function StatusPill({ children, status }) {
  return <span className={`machine-artifact-status is-${status}`}>{children ?? status}</span>
}

function InspectorSection({ id, eyebrow, title, children }) {
  return (
    <section className="machine-artifact-section" aria-labelledby={`${id}-title`}>
      <span className="machine-artifact-eyebrow">{eyebrow}</span>
      <h3 id={`${id}-title`}>{title}</h3>
      {children}
    </section>
  )
}

export default function ArtifactInspector({
  active,
  data,
  description,
  enrichedProps,
  question,
  suggestions,
}) {
  const [open, setOpen] = useState(false)
  const [policyId, setPolicyId] = useState("exploratory")
  const closeRef = useRef(null)
  const record = useMemo(
    () =>
      buildMachineArtifactRecord({
        active,
        data,
        description,
        enrichedProps,
        question,
        suggestions,
      }),
    [active, data, description, enrichedProps, question, suggestions],
  )

  const evaluation = useMemo(() => {
    if (!record || !active || !enrichedProps) return null
    return evaluateArtifact(active.component, { ...enrichedProps, data }, record.contract, {
      data,
      policy: policyId,
      now: MACHINE_ARTIFACT_RETRIEVED_AT,
      describe: true,
      navigable: true,
    })
  }, [active, data, enrichedProps, policyId, record])

  const packetHref = useMemo(() => {
    if (!record) return ""
    return `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(record.packet, null, 2),
    )}`
  }, [record])

  if (!record || !evaluation) return null

  const { contract, changes, packet } = record
  const openWork = evaluation.obligations.filter(({ status }) => OPEN_STATUSES.has(status))
  const currentPolicy = ARTIFACT_POLICIES[policyId]
  const corrections = contract.contestability?.corrections ?? []
  const claimUncertainty = contract.claims.filter(({ uncertainty }) => uncertainty)

  return (
    <section className="machine-artifact-launch" aria-labelledby="machine-artifact-launch-title">
      <div>
        <span className="machine-kicker">Progressive disclosure</span>
        <h2 id="machine-artifact-launch-title">What travels with the chart</h2>
        <p>
          The chart still renders normally. An optional, versioned sidecar records what it claims,
          what supports those claims, when the evidence applies, and what must survive export.
        </p>
        <div className="machine-artifact-launch-actions">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            Inspect claims and evidence
          </button>
          <Link to="/artifacts/overview">Read the artifact contract guide</Link>
        </div>
      </div>
      <dl className="machine-artifact-glance">
        <div>
          <dt>Claims</dt>
          <dd>{contract.claims.length}</dd>
        </div>
        <div>
          <dt>Evidence records</dt>
          <dd>{contract.evidence.length}</dd>
        </div>
        <div>
          <dt>Corrections</dt>
          <dd>{corrections.length}</dd>
        </div>
        <div>
          <dt>Current check</dt>
          <dd>
            <StatusPill status={evaluation.status}>{evaluation.status}</StatusPill>
          </dd>
        </div>
      </dl>

      <DrawerDialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="machine-artifact-inspector-title"
        className="machine-artifact-drawer"
        backdropClassName="machine-artifact-backdrop"
        initialFocusRef={closeRef}
      >
        <header className="machine-artifact-drawer-header">
          <div>
            <span className="machine-artifact-eyebrow">
              Contract format {contract.contractVersion} · Artifact revision{" "}
              {contract.artifact.revision}
            </span>
            <h2 id="machine-artifact-inspector-title">Artifact inspector</h2>
            <p>{contract.artifact.title}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="machine-artifact-close"
            onClick={() => setOpen(false)}
            aria-label="Close artifact inspector"
          >
            ×
          </button>
        </header>

        <fieldset className="machine-artifact-policy">
          <legend>Evaluation policy</legend>
          <div className="machine-artifact-policy-grid">
            <div className="machine-artifact-policy-summary">
              <span>Policy outcome</span>
              <strong role="status" aria-live="polite" aria-atomic="true">
                {currentPolicy.label} · {evaluation.status} · {openWork.length} visible item
                {openWork.length === 1 ? "" : "s"} to resolve or accept
              </strong>
            </div>
            <div className="machine-artifact-policy-options">
              {POLICY_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={policyId === id}
                  onClick={() => setPolicyId(id)}
                >
                  {ARTIFACT_POLICIES[id].label} policy
                </button>
              ))}
            </div>
            <small>
              Active policy: {evaluation.policy.id}@{evaluation.policy.version}
            </small>
          </div>
        </fieldset>

        <nav className="machine-artifact-jump" aria-label="Artifact inspector sections">
          <a href="#machine-artifact-claims-title">Claims</a>
          <a href="#machine-artifact-evidence-title">Evidence</a>
          <a href="#machine-artifact-time-title">Time</a>
          <a href="#machine-artifact-changes-title">Changes</a>
          <a href="#machine-artifact-alternatives-title">Alternatives</a>
          <a href="#machine-artifact-packet-title">Packet</a>
        </nav>

        <div className="machine-artifact-drawer-body">
          <InspectorSection id="machine-artifact-claims" eyebrow="01" title="Claims">
            <p className="machine-artifact-section-note">
              Status is attached to each statement; replaced wording remains inspectable.
            </p>
            <ol className="machine-artifact-claim-list">
              {contract.claims.map((claim) => (
                <li key={claim.id} className={claim.status === "superseded" ? "is-muted" : ""}>
                  <div>
                    <StatusPill status={claim.status} />
                    <code>{claim.kind}</code>
                  </div>
                  <p>{claim.text || "Structured claim without display text"}</p>
                  <small>
                    Support: {claim.evidenceIds.length ? claim.evidenceIds.join(", ") : "none"}
                  </small>
                </li>
              ))}
            </ol>
          </InspectorSection>

          <InspectorSection id="machine-artifact-evidence" eyebrow="02" title="Evidence">
            <p className="machine-artifact-section-note">
              Identity, source, transformation, and a bounded preview stay distinct from generated
              prose.
            </p>
            <div className="machine-artifact-evidence-list">
              {contract.evidence.map((item) => (
                <article key={item.id}>
                  <header>
                    <StatusPill status="known">{item.role}</StatusPill>
                    <code>{shortFingerprint(item.fingerprint)}</code>
                  </header>
                  <h4>{item.label || item.id}</h4>
                  {item.source?.uri ? (
                    <a href={item.source.uri} target="_blank" rel="noopener noreferrer">
                      {item.source.name || item.source.uri}
                    </a>
                  ) : null}
                  {item.transformation?.description ? (
                    <p>{item.transformation.description}</p>
                  ) : null}
                  {item.sample ? (
                    <details>
                      <summary>
                        Bounded preview · {item.sample.values.length} of {item.sample.rowCount} rows
                      </summary>
                      <pre
                        role="region"
                        aria-label={`Bounded evidence preview for ${item.label || item.id}`}
                        tabIndex={0}
                      >
                        {JSON.stringify(item.sample.values, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          </InspectorSection>

          <InspectorSection id="machine-artifact-time" eyebrow="03" title="Time and uncertainty">
            <dl className="machine-artifact-facts">
              <div>
                <dt>Presentation</dt>
                <dd>{contract.time?.presentation?.state || "unknown"}</dd>
              </div>
              <div>
                <dt>Evidence window</dt>
                <dd>
                  {contract.time?.window?.start.slice(0, 10)} →{" "}
                  {contract.time?.window?.end.slice(0, 10)}
                </dd>
              </div>
              <div>
                <dt>Completeness</dt>
                <dd>{contract.time?.completeness?.status || "unknown"}</dd>
              </div>
              <div>
                <dt>Freshness</dt>
                <dd>{contract.time?.freshness?.status || "unknown"}</dd>
              </div>
            </dl>
            <ul className="machine-artifact-uncertainty-list">
              {claimUncertainty.map((claim) => (
                <li key={claim.id}>
                  <code>{claim.id}</code>
                  <span>
                    {claim.uncertainty.kind}:{" "}
                    {claim.uncertainty.description || "No detail supplied"}
                  </span>
                </li>
              ))}
            </ul>
          </InspectorSection>

          <InspectorSection
            id="machine-artifact-changes"
            eyebrow="04"
            title="Changes and corrections"
          >
            {corrections.map((correction) => (
              <article className="machine-artifact-correction" key={correction.id}>
                <StatusPill status="corrected">correction</StatusPill>
                <p>{correction.reason}</p>
                <small>
                  {correction.affectedClaimIds.join(", ")} →{" "}
                  {correction.replacementClaimIds?.join(", ") || "no replacement"}
                </small>
              </article>
            ))}
            <details className="machine-artifact-diff">
              <summary>{changes.length} field-level changes from the prior contract</summary>
              <ul>
                {changes.slice(0, 12).map((change, index) => (
                  <li key={`${change.path}-${index}`}>
                    <code>{change.kind}</code>
                    <span>{change.path}</span>
                    <small>
                      {valuePreview(change.before)} → {valuePreview(change.after)}
                    </small>
                  </li>
                ))}
              </ul>
            </details>
          </InspectorSection>

          <InspectorSection
            id="machine-artifact-alternatives"
            eyebrow="05"
            title="Alternative forms"
          >
            <p className="machine-artifact-section-note">
              Alternatives are outcomes to consider, not a hidden confidence score.
            </p>
            <ul className="machine-artifact-alternative-list">
              {evaluation.alternatives.slice(0, 5).map((alternative) => (
                <li key={alternative.id}>
                  <strong>{alternative.label}</strong>
                  <span>
                    {alternative.reasons?.[0] ||
                      alternative.caveats?.[0] ||
                      "Available when the reader's task changes."}
                  </span>
                </li>
              ))}
            </ul>
          </InspectorSection>

          <InspectorSection id="machine-artifact-packet" eyebrow="06" title="Transfer packet">
            <p className="machine-artifact-section-note">
              The JSON packet carries the contract fields supported by this format, and its transfer
              report names any omissions. This download excludes bounded evidence previews, so it
              does not assert full-fidelity preservation.
            </p>
            <dl className="machine-artifact-facts">
              <div>
                <dt>Format</dt>
                <dd>{packet.transfer.format}</dd>
              </div>
              <div>
                <dt>Preservation</dt>
                <dd>{packet.transfer.preservation}</dd>
              </div>
              <div>
                <dt>Omitted</dt>
                <dd>{packet.transfer.omittedPaths.join(", ") || "nothing"}</dd>
              </div>
            </dl>
            <div className="machine-artifact-download-row">
              <a
                className="machine-artifact-download"
                href={packetHref}
                download={`${contract.artifact.id}.artifact.json`}
              >
                Download packet JSON
              </a>
              <Link to="/artifacts/overview">Implementation guide</Link>
            </div>
          </InspectorSection>
        </div>
      </DrawerDialog>
    </section>
  )
}
