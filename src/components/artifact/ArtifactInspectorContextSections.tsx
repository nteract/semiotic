import {
  InspectorDisclosure,
  renderInspectorField,
  mapInspectorRows,
  recordId,
  type DisclosureOptions
} from "./ArtifactInspectorElements"
import type { ArtifactContract } from "./types"
import type { ArtifactInspectorEvaluation } from "./artifactInspectorSummary"

interface DisclosureSectionProps extends DisclosureOptions {
  contract: ArtifactContract
}

interface TimeSectionProps extends DisclosureSectionProps {
  fallbackLabel: string
}

const timestamps = [
  ["observedAt", "Observed"],
  ["ingestedAt", "Ingested"],
  ["processedAt", "Processed"],
  ["publishedAt", "Published"],
  ["snapshotAt", "Snapshot"]
] as const

export function ArtifactInspectorTimeSection({
  contract,
  fallbackLabel,
  ...disclosure
}: TimeSectionProps) {
  const time = contract.time
  return (
    <InspectorDisclosure
      {...disclosure}
      section="time"
      label="Time and as-of state"
    >
      {time ? (
        <>
          <dl>
            {renderInspectorField(
              "Presentation",
              time.presentation?.label ??
                time.presentation?.state ??
                "Unknown — no presentation state is declared"
            )}
            {renderInspectorField(
              "Event time",
              <>
                {time.eventTime?.value ??
                  time.eventTime?.field ??
                  "Unknown — no event-time value or field is declared"}
                {time.eventTime?.timezone
                  ? ` · ${time.eventTime.timezone}`
                  : ""}
                {time.eventTime?.granularity
                  ? ` · ${time.eventTime.granularity}`
                  : ""}
              </>
            )}
            {renderInspectorField(
              "Window",
              time.window
                ? `${time.window.start} through ${time.window.end} · ${time.window.status}`
                : "Unknown — no reporting window is declared"
            )}
            {timestamps.map(([key, label]) =>
              renderInspectorField(label, time[key] ?? "Unknown")
            )}
            {renderInspectorField(
              "Freshness",
              time.freshness
                ? `${time.freshness.status}${time.freshness.basis ? ` · ${time.freshness.basis}` : ""}`
                : "Unknown — no freshness check is declared"
            )}
            {renderInspectorField(
              "Completeness",
              time.completeness
                ? `${time.completeness.status}${time.completeness.basis ? ` · ${time.completeness.basis}` : ""}`
                : "Unknown — no completeness state is declared"
            )}
            {renderInspectorField(
              "Watermark",
              time.watermark
                ? `${time.watermark.value}${time.watermark.allowedLateness ? ` · allowed lateness ${time.watermark.allowedLateness}` : ""}`
                : "Not declared"
            )}
          </dl>
          {time.sources?.length ? (
            <>
              <p>
                <strong>Source clocks</strong>
              </p>
              <ul>
                {mapInspectorRows(time.sources, recordId, (source, key) => (
                  <li key={key}>
                    <strong>{source.label ?? source.id}</strong> · {source.kind}
                    {source.observedAt ? ` · ${source.observedAt}` : ""} ·
                    freshness {source.freshness ?? "unknown"} · completeness{" "}
                    {source.completeness ?? "unknown"}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : (
        <p>{fallbackLabel}.</p>
      )}
    </InspectorDisclosure>
  )
}

export function ArtifactInspectorHistorySection({
  contract,
  ...disclosure
}: DisclosureSectionProps) {
  return (
    <InspectorDisclosure
      {...disclosure}
      section="history"
      label="Corrections and history"
    >
      {contract.time?.revision ? (
        <p>
          Revision state: <strong>{contract.time.revision.status}</strong>
          {contract.time.revision.reason
            ? ` · ${contract.time.revision.reason}`
            : ""}
          {contract.time.revision.previousArtifactId
            ? ` · previous artifact ${contract.time.revision.previousArtifactId}`
            : ""}
        </p>
      ) : (
        <p>Unknown — no temporal revision state is declared.</p>
      )}
      {contract.contestability?.corrections?.length ? (
        <ul>
          {mapInspectorRows(
            contract.contestability.corrections,
            recordId,
            (correction, key) => (
              <li key={key}>
                <strong>{correction.id}</strong> · {correction.reason} ·
                affected{" "}
                {correction.affectedClaimIds.join(", ") || "no named claims"}
                {correction.replacementClaimIds?.length
                  ? ` · replacements ${correction.replacementClaimIds.join(", ")}`
                  : ""}
                {correction.createdAt ? ` · ${correction.createdAt}` : ""}
              </li>
            )
          )}
        </ul>
      ) : (
        <p>No correction history is declared.</p>
      )}
      {contract.contestability?.challenges?.length ? (
        <>
          <p>
            <strong>Challenges</strong>
          </p>
          <ul>
            {mapInspectorRows(
              contract.contestability.challenges,
              recordId,
              (challenge, key) => (
                <li key={key}>
                  <strong>{challenge.status}</strong> · claim{" "}
                  {challenge.claimId} · {challenge.reason}
                </li>
              )
            )}
          </ul>
        </>
      ) : null}
      {contract.accountability?.reviews?.length ? (
        <>
          <p>
            <strong>Reviews</strong>
          </p>
          <ul>
            {mapInspectorRows(
              contract.accountability.reviews,
              recordId,
              (review, key) => (
                <li key={key}>
                  <strong>{review.status}</strong>
                  {review.reviewer?.name ? ` · ${review.reviewer.name}` : ""}
                  {review.reviewedAt ? ` · ${review.reviewedAt}` : ""}
                  {review.rationale ? ` · ${review.rationale}` : ""}
                </li>
              )
            )}
          </ul>
        </>
      ) : null}
      {contract.accountability?.actions?.length ? (
        <>
          <p>
            <strong>Recorded actions</strong>
          </p>
          <ul>
            {mapInspectorRows(
              contract.accountability.actions,
              recordId,
              (action, key) => (
                <li key={key}>
                  <strong>{action.status ?? "recorded"}</strong> ·{" "}
                  {action.action}
                  {action.claimIds.length
                    ? ` · claims ${action.claimIds.join(", ")}`
                    : ""}
                  {action.actedAt ? ` · ${action.actedAt}` : ""}
                </li>
              )
            )}
          </ul>
        </>
      ) : null}
    </InspectorDisclosure>
  )
}

interface AlternativesSectionProps extends DisclosureSectionProps {
  evaluation: ArtifactInspectorEvaluation | undefined
}

export function ArtifactInspectorAlternativesSection({
  contract,
  evaluation,
  ...disclosure
}: AlternativesSectionProps) {
  return (
    <InspectorDisclosure
      {...disclosure}
      section="alternatives"
      label="Alternative views"
    >
      <dl>
        {renderInspectorField(
          "Selected form",
          contract.form?.chartFamily ?? "Unknown — no chart family is declared"
        )}
        {renderInspectorField(
          "Why this form",
          contract.form?.whyThisForm ??
            "Unknown — no representation rationale is declared"
        )}
      </dl>
      {contract.contestability?.alternativeViews?.length ? (
        <ul>
          {mapInspectorRows(
            contract.contestability.alternativeViews,
            recordId,
            (view, key) => (
              <li key={key}>
                <strong>{view.label}</strong>
                {view.rationale ? ` · ${view.rationale}` : ""}
              </li>
            )
          )}
        </ul>
      ) : (
        <p>No named alternative views are declared.</p>
      )}
      {evaluation?.alternatives?.length ? (
        <>
          <p>
            <strong>Evaluation alternatives</strong>
          </p>
          <ul>
            {mapInspectorRows(
              evaluation.alternatives,
              recordId,
              (alternative, key) => (
                <li key={key}>
                  <strong>{alternative.label}</strong>
                  {alternative.reasons?.length
                    ? ` · ${alternative.reasons.join(" ")}`
                    : ""}
                </li>
              )
            )}
          </ul>
        </>
      ) : null}
      {contract.form?.rejectedAlternatives?.length ? (
        <>
          <p>
            <strong>Considered but not selected</strong>
          </p>
          <ul>
            {mapInspectorRows(
              contract.form.rejectedAlternatives,
              (alternative) =>
                JSON.stringify([
                  alternative.representation,
                  alternative.reason
                ]),
              (alternative, key) => (
                <li key={key}>
                  <strong>{alternative.representation}</strong> ·{" "}
                  {alternative.reason}
                </li>
              )
            )}
          </ul>
        </>
      ) : null}
    </InspectorDisclosure>
  )
}
