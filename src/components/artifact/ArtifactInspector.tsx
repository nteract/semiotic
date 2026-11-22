import { useMemo } from "react"
import {
  InspectorDisclosure,
  renderInspectorField,
  mapInspectorRows,
  recordId
} from "./ArtifactInspectorElements"
import type { ComponentPropsWithoutRef, ElementType } from "react"
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
  /** Sections held open by the host. Omit to let readers toggle each section independently. */
  expandedSections?: ReadonlyArray<ArtifactInspectorSection>
  /** Reports a native toggle, or requests a change to a controlled section. */
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

function obligationSummary(
  obligations: ReadonlyArray<ObligationResult>
): string {
  const order: ObligationStatus[] = [
    "fail",
    "warn",
    "manual",
    "unknown",
    "pass",
    "not-applicable"
  ]
  const counts = new Map<ObligationStatus, number>()
  for (const { status } of obligations)
    counts.set(status, (counts.get(status) ?? 0) + 1)
  return (
    order
      .filter((status) => counts.has(status))
      .map((status) => `${counts.get(status)} ${status}`)
      .join(" · ") || "No obligations reported"
  )
}

function canonicalJsonValue(
  value: unknown,
  ancestors = new Set<object>()
): unknown {
  if (typeof value === "bigint") return String(value)
  if (typeof value === "function") return undefined
  if (value === null || typeof value !== "object") return value
  if (ancestors.has(value)) return "[Circular]"
  ancestors.add(value)
  const visit = (item: unknown) => canonicalJsonValue(item, ancestors)
  const object = value as Record<string, unknown>
  const result = Array.isArray(value)
    ? value.map(visit)
    : Object.fromEntries(
        Object.keys(object)
          .sort()
          .map((key) => [key, visit(object[key])])
      )
  ancestors.delete(value)
  return result
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
  const { summary, machineText, policyText } = useMemo(
    () => ({
      summary: summarizeArtifactInspection(contract, evaluation),
      machineText: machineReadableText(contract, evaluation),
      policyText: evaluation && obligationSummary(evaluation.obligations)
    }),
    [contract, evaluation]
  )
  const disclosure = { expandedSections, onDisclosureChange }
  const Heading = `h${headingLevel}` as ElementType
  const classes = ["semiotic-artifact-inspector", className]
    .filter(Boolean)
    .join(" ")
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
        {renderInspectorField("Status", summary.outcome, "status")}
        {renderInspectorField(
          "Time",
          `${summary.time.label} (${summary.time.status})`,
          "time",
          summary.time.status
        )}
        {renderInspectorField(
          "Claims",
          `${summary.claims.supported} supported · ${summary.claims.unresolved} unresolved · ${summary.claims.total} total`,
          "claims"
        )}
        {renderInspectorField(
          "Evidence",
          `${summary.evidence.referenced} referenced · ${summary.evidence.unreferenced} unreferenced · ${summary.evidence.missingReferences} missing reference${summary.evidence.missingReferences === 1 ? "" : "s"}`,
          "evidence"
        )}
        {renderInspectorField(
          "Policy",
          summary.policy.label,
          "policy",
          summary.policy.status
        )}
        {renderInspectorField(
          "Review",
          reviewLabel,
          "review",
          summary.review.status
        )}
      </dl>

      <InspectorDisclosure
        className="semiotic-artifact-inspector__details"
        {...disclosure}
        section="details"
        label="Inspect claims, evidence, policy, and machine-readable detail"
      >
        <InspectorDisclosure
          {...disclosure}
          section="claims"
          label={`Claims (${contract.claims.length})`}
        >
          {contract.claims.length > 0 ? (
            <ol>
              {mapInspectorRows(contract.claims, recordId, (claim, key) => (
                <li key={key} data-status={claim.status}>
                  <strong>{claimLabel(claim)}</strong>
                  <dl>
                    {renderInspectorField("Status", claim.status)}
                    {renderInspectorField("Kind", claim.kind)}
                    {renderInspectorField(
                      "Evidence",
                      claim.evidenceIds.length > 0
                        ? claim.evidenceIds.join(", ")
                        : "Unknown — no evidence reference is declared"
                    )}
                    {claim.uncertainty
                      ? renderInspectorField(
                          "Uncertainty",
                          claim.uncertainty.description ??
                            claim.uncertainty.kind
                        )
                      : null}
                  </dl>
                </li>
              ))}
            </ol>
          ) : (
            <p>Unknown — no claims are declared.</p>
          )}
        </InspectorDisclosure>

        <ArtifactInspectorTimeSection
          contract={contract}
          fallbackLabel={summary.time.label}
          {...disclosure}
        />

        <ArtifactInspectorHistorySection contract={contract} {...disclosure} />

        <ArtifactInspectorAlternativesSection
          contract={contract}
          evaluation={evaluation}
          {...disclosure}
        />

        <InspectorDisclosure
          {...disclosure}
          section="evidence"
          label={`Evidence (${contract.evidence.length})`}
        >
          {contract.evidence.length > 0 ? (
            <ul>
              {mapInspectorRows(
                contract.evidence,
                recordId,
                (evidence, key) => (
                  <li key={key}>
                    <strong>{evidenceLabel(evidence)}</strong>
                    <dl>
                      {renderInspectorField("Identifier", evidence.id)}
                      {renderInspectorField("Role", evidence.role)}
                      {renderInspectorField(
                        "Source",
                        evidence.source?.uri ??
                          evidence.source?.name ??
                          "Unknown — no source is declared"
                      )}
                      {renderInspectorField(
                        "Fingerprint",
                        evidence.fingerprint ??
                          "Unknown — no fingerprint is declared"
                      )}
                    </dl>
                  </li>
                )
              )}
            </ul>
          ) : (
            <p>Unknown — no evidence records are declared.</p>
          )}
        </InspectorDisclosure>

        <InspectorDisclosure
          {...disclosure}
          section="policy"
          label="Policy and review"
        >
          {evaluation ? (
            <>
              <p>
                {evaluation.policy.id}@{evaluation.policy.version} ·{" "}
                {policyText}
              </p>
              {evaluation.obligations.length > 0 ? (
                <ul>
                  {mapInspectorRows(
                    evaluation.obligations,
                    recordId,
                    (obligation, key) => (
                      <li key={key} data-status={obligation.status}>
                        <strong>{obligation.status}</strong> ·{" "}
                        {obligation.message}
                        {obligation.repair ? (
                          <span> Suggested repair: {obligation.repair}</span>
                        ) : null}
                      </li>
                    )
                  )}
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
        </InspectorDisclosure>

        <InspectorDisclosure
          {...disclosure}
          section="machine"
          label="Machine-readable JSON"
        >
          <pre aria-label="Machine-readable artifact inspection" tabIndex={0}>
            <code>{machineText}</code>
          </pre>
        </InspectorDisclosure>
      </InspectorDisclosure>
    </section>
  )
}
