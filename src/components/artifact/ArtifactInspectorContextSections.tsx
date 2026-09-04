import type { ReactEventHandler } from "react"
import type { ArtifactContract } from "./types"
import type { ArtifactInspectorEvaluation } from "./artifactInspectorSummary"

interface DisclosureSectionProps {
  contract: ArtifactContract
  open: boolean | undefined
  onToggle: ReactEventHandler<HTMLDetailsElement> | undefined
}

interface TimeSectionProps extends DisclosureSectionProps {
  fallbackLabel: string
}

export function ArtifactInspectorTimeSection({
  contract,
  fallbackLabel,
  open,
  onToggle
}: TimeSectionProps) {
  const time = contract.time
  return (
    <details open={open} onToggle={onToggle}>
      <summary>Time and as-of state</summary>
      {time ? (
        <>
          <dl>
            <div>
              <dt>Presentation</dt>
              <dd>
                {time.presentation?.label ??
                  time.presentation?.state ??
                  "Unknown — no presentation state is declared"}
              </dd>
            </div>
            <div>
              <dt>Event time</dt>
              <dd>
                {time.eventTime?.value ??
                  time.eventTime?.field ??
                  "Unknown — no event-time value or field is declared"}
                {time.eventTime?.timezone
                  ? ` · ${time.eventTime.timezone}`
                  : ""}
                {time.eventTime?.granularity
                  ? ` · ${time.eventTime.granularity}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>Window</dt>
              <dd>
                {time.window
                  ? `${time.window.start} through ${time.window.end} · ${time.window.status}`
                  : "Unknown — no reporting window is declared"}
              </dd>
            </div>
            <div>
              <dt>Observed</dt>
              <dd>{time.observedAt ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Ingested</dt>
              <dd>{time.ingestedAt ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Processed</dt>
              <dd>{time.processedAt ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Published</dt>
              <dd>{time.publishedAt ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Snapshot</dt>
              <dd>{time.snapshotAt ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Freshness</dt>
              <dd>
                {time.freshness
                  ? `${time.freshness.status}${time.freshness.basis ? ` · ${time.freshness.basis}` : ""}`
                  : "Unknown — no freshness check is declared"}
              </dd>
            </div>
            <div>
              <dt>Completeness</dt>
              <dd>
                {time.completeness
                  ? `${time.completeness.status}${time.completeness.basis ? ` · ${time.completeness.basis}` : ""}`
                  : "Unknown — no completeness state is declared"}
              </dd>
            </div>
            <div>
              <dt>Watermark</dt>
              <dd>
                {time.watermark
                  ? `${time.watermark.value}${time.watermark.allowedLateness ? ` · allowed lateness ${time.watermark.allowedLateness}` : ""}`
                  : "Not declared"}
              </dd>
            </div>
          </dl>
          {time.sources?.length ? (
            <>
              <p>
                <strong>Source clocks</strong>
              </p>
              <ul>
                {time.sources.map((source) => (
                  <li key={source.id}>
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
    </details>
  )
}

export function ArtifactInspectorHistorySection({
  contract,
  open,
  onToggle
}: DisclosureSectionProps) {
  return (
    <details open={open} onToggle={onToggle}>
      <summary>Corrections and history</summary>
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
          {contract.contestability.corrections.map((correction) => (
            <li key={correction.id}>
              <strong>{correction.id}</strong> · {correction.reason} · affected{" "}
              {correction.affectedClaimIds.join(", ") || "no named claims"}
              {correction.replacementClaimIds?.length
                ? ` · replacements ${correction.replacementClaimIds.join(", ")}`
                : ""}
              {correction.createdAt ? ` · ${correction.createdAt}` : ""}
            </li>
          ))}
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
            {contract.contestability.challenges.map((challenge) => (
              <li key={challenge.id}>
                <strong>{challenge.status}</strong> · claim {challenge.claimId}{" "}
                · {challenge.reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {contract.accountability?.reviews?.length ? (
        <>
          <p>
            <strong>Reviews</strong>
          </p>
          <ul>
            {contract.accountability.reviews.map((review) => (
              <li key={review.id}>
                <strong>{review.status}</strong>
                {review.reviewer?.name ? ` · ${review.reviewer.name}` : ""}
                {review.reviewedAt ? ` · ${review.reviewedAt}` : ""}
                {review.rationale ? ` · ${review.rationale}` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {contract.accountability?.actions?.length ? (
        <>
          <p>
            <strong>Recorded actions</strong>
          </p>
          <ul>
            {contract.accountability.actions.map((action) => (
              <li key={action.id}>
                <strong>{action.status ?? "recorded"}</strong> · {action.action}
                {action.claimIds.length
                  ? ` · claims ${action.claimIds.join(", ")}`
                  : ""}
                {action.actedAt ? ` · ${action.actedAt}` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </details>
  )
}

interface AlternativesSectionProps extends DisclosureSectionProps {
  evaluation: ArtifactInspectorEvaluation | undefined
}

export function ArtifactInspectorAlternativesSection({
  contract,
  evaluation,
  open,
  onToggle
}: AlternativesSectionProps) {
  return (
    <details open={open} onToggle={onToggle}>
      <summary>Alternative views</summary>
      <dl>
        <div>
          <dt>Selected form</dt>
          <dd>
            {contract.form?.chartFamily ??
              "Unknown — no chart family is declared"}
          </dd>
        </div>
        <div>
          <dt>Why this form</dt>
          <dd>
            {contract.form?.whyThisForm ??
              "Unknown — no representation rationale is declared"}
          </dd>
        </div>
      </dl>
      {contract.contestability?.alternativeViews?.length ? (
        <ul>
          {contract.contestability.alternativeViews.map((view) => (
            <li key={view.id}>
              <strong>{view.label}</strong>
              {view.rationale ? ` · ${view.rationale}` : ""}
            </li>
          ))}
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
            {evaluation.alternatives.map((alternative) => (
              <li key={alternative.id}>
                <strong>{alternative.label}</strong>
                {alternative.reasons?.length
                  ? ` · ${alternative.reasons.join(" ")}`
                  : ""}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {contract.form?.rejectedAlternatives?.length ? (
        <>
          <p>
            <strong>Considered but not selected</strong>
          </p>
          <ul>
            {contract.form.rejectedAlternatives.map((alternative) => (
              <li key={`${alternative.representation}:${alternative.reason}`}>
                <strong>{alternative.representation}</strong> ·{" "}
                {alternative.reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </details>
  )
}
