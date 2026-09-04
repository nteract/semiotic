import type {
  ComponentPropsWithoutRef,
  ElementType,
  SyntheticEvent
} from "react"
import type {
  ArtifactContract,
  Claim,
  EvidenceRef,
  ObligationResult,
  ObligationStatus
} from "./types"
import {
  summarizeArtifactInspection,
  type ArtifactInspectorEvaluation
} from "./artifactInspectorSummary"
import {
  ArtifactInspectorAlternativesSection,
  ArtifactInspectorHistorySection,
  ArtifactInspectorTimeSection
} from "./ArtifactInspectorContextSections"

export type ArtifactInspectorSection =
  | "details"
  | "claims"
  | "evidence"
  | "time"
  | "history"
  | "alternatives"
  | "policy"
  | "machine"

export interface ArtifactInspectorProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> {
  /** Complete interpretation sidecar to inspect. */
  contract: ArtifactContract
  /** Optional result from `evaluateArtifact`; absence is shown as unknown. */
  evaluation?: ArtifactInspectorEvaluation
  /** Accessible heading for the surface. */
  title?: string
  /** Heading depth used when embedding the inspector in a page. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  /** Controlled native disclosure state. Omit to let each `details` element manage itself. */
  expandedSections?: ReadonlyArray<ArtifactInspectorSection>
  /** Observe disclosure changes for analytics or controlled hosts. */
  onDisclosureChange?: (
    section: ArtifactInspectorSection,
    expanded: boolean
  ) => void
}

function claimLabel(claim: Claim): string {
  return claim.text ?? `Structured ${claim.kind} claim ${claim.id}`
}

function evidenceLabel(evidence: EvidenceRef): string {
  return evidence.label ?? evidence.source?.name ?? evidence.id
}

function statusCounts(
  obligations: ReadonlyArray<ObligationResult>
): Array<[ObligationStatus, number]> {
  const order: ObligationStatus[] = [
    "fail",
    "warn",
    "manual",
    "unknown",
    "pass",
    "not-applicable"
  ]
  return order.flatMap((status) => {
    const count = obligations.filter((item) => item.status === status).length
    return count > 0 ? [[status, count] as [ObligationStatus, number]] : []
  })
}

function canonicalJsonValue(
  value: unknown,
  ancestors = new Set<object>()
): unknown {
  if (value === null || typeof value !== "object") {
    return typeof value === "bigint" ? value.toString() : value
  }
  if (ancestors.has(value)) return "[Circular]"
  ancestors.add(value)
  try {
    if (Array.isArray(value)) {
      return value.map((item) => canonicalJsonValue(item, ancestors))
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(
          ([, item]) =>
            !["undefined", "function", "symbol"].includes(typeof item)
        )
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, canonicalJsonValue(item, ancestors)])
    )
  } finally {
    ancestors.delete(value)
  }
}

function machineReadableText(
  contract: ArtifactContract,
  evaluation: ArtifactInspectorEvaluation | undefined
): string {
  const payload = {
    contract,
    evaluation: evaluation
      ? {
          alternatives: evaluation.alternatives ?? [],
          manualChecks: evaluation.manualChecks ?? [],
          obligations: evaluation.obligations,
          policy: evaluation.policy,
          status: evaluation.status
        }
      : {
          reason: "No policy evaluation was supplied",
          status: "unknown"
        },
    format: "semiotic-artifact-inspection/v1"
  }
  return JSON.stringify(canonicalJsonValue(payload), null, 2)
}

function isSectionOpen(
  sections: ReadonlyArray<ArtifactInspectorSection> | undefined,
  section: ArtifactInspectorSection
): boolean | undefined {
  return sections ? sections.includes(section) : undefined
}

/**
 * Accessible, progressively disclosed view of an artifact contract.
 *
 * The always-visible summary distinguishes verified signals from unknown and
 * manual-review states. Native `details` elements keep the deeper contract and
 * evaluation readable without requiring JavaScript-managed disclosure state.
 */
export function ArtifactInspector({
  contract,
  evaluation,
  title = "Artifact details",
  headingLevel = 2,
  expandedSections,
  onDisclosureChange,
  className,
  ...sectionProps
}: ArtifactInspectorProps) {
  const summary = summarizeArtifactInspection(contract, evaluation)
  const Heading = `h${headingLevel}` as ElementType
  const classes = ["semiotic-artifact-inspector", className]
    .filter(Boolean)
    .join(" ")
  const toggleHandler = (section: ArtifactInspectorSection) =>
    onDisclosureChange
      ? (event: SyntheticEvent<HTMLDetailsElement>) => {
          if (event.target !== event.currentTarget) return
          onDisclosureChange(section, event.currentTarget.open)
        }
      : undefined
  const reviewLabel =
    summary.review.status === "required"
      ? `${summary.review.count} manual review item${summary.review.count === 1 ? "" : "s"}`
      : summary.review.status === "clear"
        ? "No manual review items reported"
        : "Manual review state is unknown"

  return (
    <section
      {...sectionProps}
      className={classes}
      aria-label={
        sectionProps["aria-label"] ??
        (sectionProps["aria-labelledby"] ? undefined : title)
      }
      data-outcome={summary.outcome}
    >
      <header className="semiotic-artifact-inspector__header">
        <Heading>{title}</Heading>
        {contract.artifact.title ? <p>{contract.artifact.title}</p> : null}
        <p role="status" aria-live="polite" aria-atomic="true">
          <strong>{summary.outcomeLabel}</strong>
        </p>
      </header>

      <dl className="semiotic-artifact-inspector__summary">
        <div data-signal="status">
          <dt>Status</dt>
          <dd>{summary.outcome}</dd>
        </div>
        <div data-signal="time" data-state={summary.time.status}>
          <dt>Time</dt>
          <dd>
            {summary.time.label} ({summary.time.status})
          </dd>
        </div>
        <div data-signal="claims">
          <dt>Claims</dt>
          <dd>
            {summary.claims.supported} supported · {summary.claims.unresolved}{" "}
            unresolved · {summary.claims.total} total
          </dd>
        </div>
        <div data-signal="evidence">
          <dt>Evidence</dt>
          <dd>
            {summary.evidence.referenced} referenced ·{" "}
            {summary.evidence.unreferenced} unreferenced ·{" "}
            {summary.evidence.missingReferences} missing reference
            {summary.evidence.missingReferences === 1 ? "" : "s"}
          </dd>
        </div>
        <div data-signal="policy" data-state={summary.policy.status}>
          <dt>Policy</dt>
          <dd>{summary.policy.label}</dd>
        </div>
        <div data-signal="review" data-state={summary.review.status}>
          <dt>Review</dt>
          <dd>{reviewLabel}</dd>
        </div>
      </dl>

      <details
        className="semiotic-artifact-inspector__details"
        open={isSectionOpen(expandedSections, "details")}
        onToggle={toggleHandler("details")}
      >
        <summary>
          Inspect claims, evidence, policy, and machine-readable detail
        </summary>

        <details
          open={isSectionOpen(expandedSections, "claims")}
          onToggle={toggleHandler("claims")}
        >
          <summary>Claims ({contract.claims.length})</summary>
          {contract.claims.length > 0 ? (
            <ol>
              {contract.claims.map((claim) => (
                <li key={claim.id} data-status={claim.status}>
                  <strong>{claimLabel(claim)}</strong>
                  <dl>
                    <div>
                      <dt>Status</dt>
                      <dd>{claim.status}</dd>
                    </div>
                    <div>
                      <dt>Kind</dt>
                      <dd>{claim.kind}</dd>
                    </div>
                    <div>
                      <dt>Evidence</dt>
                      <dd>
                        {claim.evidenceIds.length > 0
                          ? claim.evidenceIds.join(", ")
                          : "Unknown — no evidence reference is declared"}
                      </dd>
                    </div>
                    {claim.uncertainty ? (
                      <div>
                        <dt>Uncertainty</dt>
                        <dd>
                          {claim.uncertainty.description ??
                            claim.uncertainty.kind}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ol>
          ) : (
            <p>Unknown — no claims are declared.</p>
          )}
        </details>

        <ArtifactInspectorTimeSection
          contract={contract}
          fallbackLabel={summary.time.label}
          open={isSectionOpen(expandedSections, "time")}
          onToggle={toggleHandler("time")}
        />

        <ArtifactInspectorHistorySection
          contract={contract}
          open={isSectionOpen(expandedSections, "history")}
          onToggle={toggleHandler("history")}
        />

        <ArtifactInspectorAlternativesSection
          contract={contract}
          evaluation={evaluation}
          open={isSectionOpen(expandedSections, "alternatives")}
          onToggle={toggleHandler("alternatives")}
        />

        <details
          open={isSectionOpen(expandedSections, "evidence")}
          onToggle={toggleHandler("evidence")}
        >
          <summary>Evidence ({contract.evidence.length})</summary>
          {contract.evidence.length > 0 ? (
            <ul>
              {contract.evidence.map((evidence) => (
                <li key={evidence.id}>
                  <strong>{evidenceLabel(evidence)}</strong>
                  <dl>
                    <div>
                      <dt>Identifier</dt>
                      <dd>{evidence.id}</dd>
                    </div>
                    <div>
                      <dt>Role</dt>
                      <dd>{evidence.role}</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>
                        {evidence.source?.uri ??
                          evidence.source?.name ??
                          "Unknown — no source is declared"}
                      </dd>
                    </div>
                    <div>
                      <dt>Fingerprint</dt>
                      <dd>
                        {evidence.fingerprint ??
                          "Unknown — no fingerprint is declared"}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <p>Unknown — no evidence records are declared.</p>
          )}
        </details>

        <details
          open={isSectionOpen(expandedSections, "policy")}
          onToggle={toggleHandler("policy")}
        >
          <summary>Policy and review</summary>
          {evaluation ? (
            <>
              <p>
                {evaluation.policy.id}@{evaluation.policy.version} ·{" "}
                {statusCounts(evaluation.obligations)
                  .map(([status, count]) => `${count} ${status}`)
                  .join(" · ") || "No obligations reported"}
              </p>
              {evaluation.obligations.length > 0 ? (
                <ul>
                  {evaluation.obligations.map((obligation) => (
                    <li key={obligation.id} data-status={obligation.status}>
                      <strong>{obligation.status}</strong> ·{" "}
                      {obligation.message}
                      {obligation.repair ? (
                        <span> Suggested repair: {obligation.repair}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p>Unknown — no policy evaluation was supplied.</p>
          )}
          <p>
            <strong>Manual review</strong>
          </p>
          {summary.review.items.length > 0 ? (
            <ul>
              {summary.review.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>{reviewLabel}.</p>
          )}
          <p>
            <strong>Unknown signals</strong>
          </p>
          {summary.unknowns.items.length > 0 ? (
            <ul>
              {summary.unknowns.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No unknown signals were reported.</p>
          )}
        </details>

        <details
          open={isSectionOpen(expandedSections, "machine")}
          onToggle={toggleHandler("machine")}
        >
          <summary>Machine-readable JSON</summary>
          <pre aria-label="Machine-readable artifact inspection" tabIndex={0}>
            <code>{machineReadableText(contract, evaluation)}</code>
          </pre>
        </details>
      </details>
    </section>
  )
}
