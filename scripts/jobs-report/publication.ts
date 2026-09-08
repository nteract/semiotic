import { evaluateArtifact, fingerprintValue } from "semiotic/artifact"
import { renderChartWithEvidence } from "semiotic/server"
import {
  verifyBriefing,
  type Briefing
} from "../../docs/src/pages/examples/jobs-report/packet"
import type { JobsSnapshot } from "../../docs/src/pages/examples/jobs-report/model"

export interface DemoReview {
  schemaVersion: 1
  scope: "demonstration-only"
  subject: string
  reviewedAt: string
  expiresAt: string
  reviewer: string
  decisions: { id: string; outcome: "checked"; rationale: string }[]
}
export function publicationCheck(
  snapshot: JobsSnapshot,
  briefing: Briefing,
  review?: DemoReview,
  now = new Date().toISOString(),
  outputFingerprint?: string
) {
  verifyBriefing(snapshot, briefing)
  const evaluation = evaluateArtifact(
    briefing.component,
    briefing.props,
    briefing.contract,
    {
      policy: "exploratory",
      now: briefing.asOf,
      render: renderChartWithEvidence,
      recommendRepresentation: false
    }
  )
  const open = evaluation.obligations.filter(({ status }) => status !== "pass")
  const requirements = [
    ...(/^sha256:[a-f0-9]{64}$/.test(outputFingerprint ?? "")
      ? []
      : [
          {
            id: "host.output-identity",
            status: "unknown",
            message:
              "The complete exported files must be identified before their review can be accepted."
          }
        ]),
    ...open.map(({ id, status, message }) => ({ id, status, message })),
    {
      id: "host.source-substitution",
      status: "manual",
      message: briefing.sourceException
    },
    {
      id: "host.editorial-review",
      status: "manual",
      message:
        "Review the complete rendered graphic, exact values and prose for this edition."
    }
  ]
  const subject = fingerprintValue({
    briefing,
    requirements,
    sceneHash: evaluation.render?.sceneHash,
    outputFingerprint: outputFingerprint ?? null
  }).fingerprint
  const hardFailure =
    evaluation.status === "refuse" ||
    open.some(({ status }) => status === "fail") ||
    !evaluation.render ||
    evaluation.render.empty
  const reviewMatches =
    review?.schemaVersion === 1 &&
    review.scope === "demonstration-only" &&
    review.subject === subject &&
    Boolean(review.reviewer.trim()) &&
    Number.isFinite(Date.parse(now)) &&
    Date.parse(review.reviewedAt) <= Date.parse(now) &&
    Date.parse(review.expiresAt) > Date.parse(now) &&
    Date.parse(review.reviewedAt) < Date.parse(review.expiresAt)
  const unresolved = requirements.filter(
    (requirement) =>
      requirement.status === "unknown" ||
      !reviewMatches ||
      !review?.decisions.some(
        (decision) =>
          decision.id === requirement.id &&
          decision.outcome === "checked" &&
          decision.rationale.trim().length >= 12
      )
  )
  const status = hardFailure
    ? "refuse"
    : unresolved.length
      ? "conditional"
      : "ready-for-demo"
  return {
    status,
    artifactStatus: evaluation.status,
    publishable: false,
    demoReady: status === "ready-for-demo",
    subject,
    outputFingerprint,
    requirements,
    unresolved,
    reviewMatches: Boolean(reviewMatches),
    evaluation,
    reason:
      status === "ready-for-demo"
        ? "A matching demonstration receipt satisfies the example host check. It is not authenticated editorial approval."
        : "Export completion and CLI exit zero do not authorize publication. Open checks remain attached."
  }
}
