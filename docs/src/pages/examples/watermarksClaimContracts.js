import {
  auditClaims,
  buildArtifactContract,
  fingerprintValue,
  supersedeClaim,
} from "semiotic/artifact"

export const WATERMARK_CORRECTION_REASON =
  "A late or replayed event changed a window that had already settled."

function pluralEvents(count) {
  return `${count} ${count === 1 ? "event" : "events"}`
}

function evidenceFor(artifactId, suffix, rows, observedAt, scope) {
  return {
    id: `${artifactId}.evidence.${suffix}`,
    role: "source-data",
    label: "Rows in the declared event-time window",
    fingerprint: fingerprintValue(rows).fingerprint,
    dataVersion: `${artifactId}:${suffix}`,
    observedAt,
    scope: { ...scope, eventCount: rows.length },
    relationship: "descriptive",
  }
}

function contractFor({ scenarioId, stage, rows, claims, evidence }) {
  return buildArtifactContract(
    "EventDropChart",
    {
      data: rows,
      title: stage.label,
      description: claims.at(-1)?.text,
    },
    {
      id: `watermarks:${scenarioId}:${stage.id}`,
      title: stage.label,
      createdAt: stage.time.ingestedAt,
      revision: stage.id === "late-corrected" ? "2" : "1",
      intents: "explain-stream-time",
      purpose: {
        communicativeAct:
          "Explain event-time window state without treating arrival order as event order.",
        stakes: "informational",
        allowedUses: ["Inspect the deterministic replay and its declared window state"],
        prohibitedUses: ["Treat the replay fixture as an operational stream"],
      },
      claims,
      evidence,
      time: stage.time,
      reception: {
        channels: [{ channel: "visual" }, { channel: "screen-reader" }, { channel: "agent" }],
        description: claims.at(-1)?.text,
        dataFallback: true,
      },
      contestability: { sourceRequestsAllowed: true },
      accountability: {
        generatedBy: "Semiotic deterministic watermarks example",
        dataSources: ["Checked-in replay scenario"],
      },
    },
  )
}

/** Build real claim and correction records for one deterministic replay stage. */
export function buildWatermarkStageContract({
  scenarioId,
  stage,
  windowBounds,
  windowEvents,
  eventsBeforeSettlement,
  correctionId,
}) {
  const artifactId = `watermarks:${scenarioId}:${stage.id}`
  const scope = {
    scenarioId,
    eventId: stage.eventId,
    windowStartSeconds: windowBounds.start,
    windowEndSeconds: windowBounds.end,
  }
  const currentEvidence = evidenceFor(
    artifactId,
    "current-window",
    windowEvents,
    stage.time.ingestedAt,
    scope,
  )
  const status = stage.id === "live-open" ? "provisional" : "supported"
  const claim = {
    id: `${artifactId}.claim.current-window`,
    text:
      stage.id === "live-open"
        ? `The ${windowBounds.start}–${windowBounds.end}s event-time window remains open with ${pluralEvents(windowEvents.length)} visible at the declared arrival frontier.`
        : `The ${windowBounds.start}–${windowBounds.end}s event-time window settled with ${pluralEvents(windowEvents.length)}.`,
    kind: "observation",
    status,
    evidenceIds: [currentEvidence.id],
    asOf: stage.time.ingestedAt,
    authoredBy: { kind: "system", name: "Deterministic watermark replay" },
    scope: { ...scope, eventCount: windowEvents.length },
  }

  if (stage.id !== "late-corrected") {
    const contract = contractFor({
      scenarioId,
      stage,
      rows: windowEvents,
      claims: [claim],
      evidence: [currentEvidence],
    })
    return {
      contract,
      audit: auditClaims(contract, {
        data: windowEvents,
        now: stage.time.ingestedAt,
        requireEvidenceIdentity: true,
      }),
    }
  }

  const previousRows = eventsBeforeSettlement
  const previousEvidence = evidenceFor(
    artifactId,
    "before-late-arrival",
    previousRows,
    stage.time.watermark?.value,
    scope,
  )
  const previousClaim = {
    ...claim,
    id: `${artifactId}.claim.before-late-arrival`,
    text: `Before ${stage.eventId} arrived, the ${windowBounds.start}–${windowBounds.end}s event-time window was reported settled with ${pluralEvents(previousRows.length)}.`,
    evidenceIds: [previousEvidence.id],
    scope: { ...scope, eventCount: previousRows.length },
  }
  const replacementClaim = {
    ...claim,
    id: `${artifactId}.claim.after-late-arrival`,
    text: `After ${stage.eventId} arrived, the corrected ${windowBounds.start}–${windowBounds.end}s event-time window contains ${pluralEvents(windowEvents.length)}.`,
  }
  const initial = contractFor({
    scenarioId,
    stage,
    rows: windowEvents,
    claims: [previousClaim],
    evidence: [previousEvidence, currentEvidence],
  })
  const superseded = supersedeClaim(initial, previousClaim.id, replacementClaim, {
    id: correctionId,
    reason: WATERMARK_CORRECTION_REASON,
    createdAt: stage.time.ingestedAt,
    createdBy: { kind: "system", name: "Deterministic watermark replay" },
  })
  const contract = {
    ...superseded,
    reception: {
      ...superseded.reception,
      description: replacementClaim.text,
    },
  }

  return {
    contract,
    audit: auditClaims(contract, {
      data: windowEvents,
      now: stage.time.ingestedAt,
      requireEvidenceIdentity: true,
    }),
  }
}
