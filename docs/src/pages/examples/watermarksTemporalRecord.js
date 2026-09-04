import {
  adaptStreamTopicMetadata,
  auditTemporalContext,
  updateTemporalContext,
} from "semiotic/artifact"
import {
  buildWatermarkStageContract,
  WATERMARK_CORRECTION_REASON,
} from "./watermarksClaimContracts"

const REPLAY_EPOCH_MS = Date.parse("2026-01-01T00:00:00.000Z")

function finiteTime(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function replayTimestamp(value) {
  const seconds = finiteTime(value) ?? 0
  return new Date(REPLAY_EPOCH_MS + seconds * 1000).toISOString()
}

export function replaySeconds(value) {
  const time = typeof value === "string" ? Date.parse(value) : Number.NaN
  return Number.isFinite(time) ? (time - REPLAY_EPOCH_MS) / 1000 : undefined
}

export function temporalDurationSeconds(value) {
  const match = /^PT([0-9]+(?:\.[0-9]+)?)S$/i.exec(value ?? "")
  return match ? Number(match[1]) : undefined
}

function boundsFor(event, windowSize) {
  const eventTime = finiteTime(event?.eventTime) ?? 0
  const start = Math.floor(eventTime / windowSize) * windowSize
  return { start, end: start + windowSize }
}

function closesAt(event, windowSize, allowedLateness) {
  return boundsFor(event, windowSize).end + allowedLateness
}

function byLatestEvent(left, right) {
  return Number(right.eventTime) - Number(left.eventTime)
}

function byLatestArrival(left, right) {
  return Number(right.arrivalTime) - Number(left.arrivalTime)
}

function sourceUpdate(scenarioId, eventTime, completeness) {
  return {
    id: `watermarks:${scenarioId}`,
    kind: "stream",
    label: "Deterministic event replay",
    observedAt: replayTimestamp(eventTime),
    timezone: "UTC",
    granularity: "second",
    freshness: "fresh",
    completeness,
  }
}

function stageUpdate({
  scenarioId,
  event,
  currentTime,
  watermark,
  windowSize,
  status,
  completeness,
  presentationLabel,
  revision,
}) {
  const bounds = boundsFor(event, windowSize)
  return {
    eventTime: {
      field: "eventTime",
      value: replayTimestamp(event.eventTime),
      timezone: "UTC",
      granularity: "second",
    },
    observedAt: replayTimestamp(event.eventTime),
    ingestedAt: replayTimestamp(currentTime),
    presentation: { state: "live", label: presentationLabel },
    freshness: {
      status: "fresh",
      checkedAt: replayTimestamp(currentTime),
      heartbeatAt: replayTimestamp(currentTime),
      expiresAt: replayTimestamp(currentTime + 1),
      basis: "The deterministic replay cursor is the declared arrival frontier.",
    },
    watermark: {
      value: replayTimestamp(watermark),
      policy: "Arrival frontier minus the declared late allowance",
      allowedLateness: `PT${Math.max(0, allowedLatenessFor(watermark, currentTime))}S`,
    },
    window: {
      start: replayTimestamp(bounds.start),
      end: replayTimestamp(bounds.end),
      status,
    },
    completeness: {
      status: completeness,
      basis:
        completeness === "settled"
          ? "The watermark passed this event-time window."
          : "The watermark has not passed this event-time window.",
    },
    ...(revision ? { revision } : {}),
    sources: [sourceUpdate(scenarioId, event.eventTime, completeness)],
  }
}

function allowedLatenessFor(watermark, currentTime) {
  return Math.round((currentTime - watermark) * 1e6) / 1e6
}

function auditStage(stage, referenceTime, claimInputs) {
  const claims = buildWatermarkStageContract({
    ...claimInputs,
    stage,
  })
  const audit = auditTemporalContext(stage.time, {
    referenceTime,
    claims: claims.contract.claims,
    corrections: claims.contract.contestability?.corrections,
  })
  return {
    ...stage,
    audit,
    contract: claims.contract,
    claimAudit: claims.audit,
  }
}

function payloadStage(stage) {
  return {
    id: stage.id,
    label: stage.label,
    eventId: stage.eventId,
    time: stage.time,
    claimState: {
      contractVersion: stage.contract.contractVersion,
      artifact: stage.contract.artifact,
      claims: stage.contract.claims,
      evidence: stage.contract.evidence,
      corrections: stage.contract.contestability?.corrections ?? [],
      audit: {
        ok: stage.claimAudit.ok,
        fail: stage.claimAudit.summary.fail,
        warn: stage.claimAudit.summary.warn,
      },
    },
    audit: {
      ok: stage.audit.ok,
      fail: stage.audit.summary.fail,
      warn: stage.audit.summary.warn,
      manual: stage.audit.summary.manual,
      unknown: stage.audit.summary.unknown,
    },
  }
}

/**
 * Build replay time states from the same events and controls that drive the
 * physics chart. No ambient clock is read, so replay, tests, and exported JSON
 * describe the same event-time windows.
 */
export function buildWatermarkTemporalRecord({
  scenarioId,
  events,
  arrivedEvents,
  currentTime,
  windowSize,
  allowedLateness,
}) {
  const arrivalFrontier = finiteTime(currentTime) ?? 0
  const safeWindowSize = Math.max(1, finiteTime(windowSize) ?? 1)
  const safeAllowedLateness = Math.max(0, finiteTime(allowedLateness) ?? 0)
  const watermark = arrivalFrontier - safeAllowedLateness
  const arrived = (arrivedEvents ?? [])
    .filter(
      (event) =>
        finiteTime(event?.eventTime) !== undefined &&
        finiteTime(event?.arrivalTime) !== undefined &&
        Number(event.arrivalTime) <= arrivalFrontier,
    )
    .map((event) => ({ ...event }))
  const openEvent = arrived
    .filter((event) => closesAt(event, safeWindowSize, safeAllowedLateness) >= arrivalFrontier)
    .sort(byLatestEvent)[0]
  const settledEvent = arrived
    .filter(
      (event) =>
        closesAt(event, safeWindowSize, safeAllowedLateness) < arrivalFrontier &&
        Number(event.arrivalTime) <= closesAt(event, safeWindowSize, safeAllowedLateness),
    )
    .sort(byLatestEvent)[0]
  const correctedEvent = arrived
    .filter(
      (event) => Number(event.arrivalTime) > closesAt(event, safeWindowSize, safeAllowedLateness),
    )
    .sort(byLatestArrival)[0]
  const referenceTime = replayTimestamp(arrivalFrontier)
  const stages = []
  const claimInputsFor = (event, correctionId) => {
    const windowBounds = boundsFor(event, safeWindowSize)
    const windowEvents = arrived.filter(
      (candidate) =>
        Number(candidate.eventTime) >= windowBounds.start &&
        Number(candidate.eventTime) < windowBounds.end,
    )
    return {
      scenarioId,
      windowBounds,
      windowEvents,
      eventsBeforeSettlement: windowEvents.filter(
        (candidate) => Number(candidate.arrivalTime) <= windowBounds.end + safeAllowedLateness,
      ),
      ...(correctionId ? { correctionId } : {}),
    }
  }

  let previousTime
  if (openEvent) {
    const update = stageUpdate({
      scenarioId,
      event: openEvent,
      currentTime: arrivalFrontier,
      watermark,
      windowSize: safeWindowSize,
      status: "open",
      completeness: "provisional",
      presentationLabel: `Live processing state as of the ${arrivalFrontier}s arrival frontier`,
      revision: { status: "original" },
    })
    const time = adaptStreamTopicMetadata({
      id: `watermarks:${scenarioId}`,
      label: "Deterministic event replay",
      eventTime: update.eventTime,
      observedAt: update.observedAt,
      ingestedAt: update.ingestedAt,
      presentationLabel: update.presentation.label,
      freshness: update.freshness,
      watermark: update.watermark,
      window: update.window,
      completeness: update.completeness,
      revision: update.revision,
      timezone: "UTC",
      granularity: "second",
    })
    previousTime = time
    stages.push(
      auditStage(
        {
          id: "live-open",
          label: "Live / open",
          eventId: openEvent.id,
          time,
        },
        referenceTime,
        claimInputsFor(openEvent),
      ),
    )
  }

  if (settledEvent) {
    const update = stageUpdate({
      scenarioId,
      event: settledEvent,
      currentTime: arrivalFrontier,
      watermark,
      windowSize: safeWindowSize,
      status: "settled",
      completeness: "settled",
      presentationLabel: `Settled event-time window through ${boundsFor(settledEvent, safeWindowSize).end}s`,
      revision: { status: "original" },
    })
    const time = previousTime ? updateTemporalContext(previousTime, update) : update
    previousTime = time
    stages.push(
      auditStage(
        {
          id: "settled",
          label: "Settled",
          eventId: settledEvent.id,
          time,
        },
        referenceTime,
        claimInputsFor(settledEvent),
      ),
    )
  }

  if (correctedEvent) {
    const correctionId = `watermarks:${scenarioId}:late-arrival:${correctedEvent.id}`
    const update = stageUpdate({
      scenarioId,
      event: correctedEvent,
      currentTime: arrivalFrontier,
      watermark,
      windowSize: safeWindowSize,
      status: "corrected",
      completeness: "settled",
      presentationLabel: `Corrected after late arrival ${correctedEvent.id} at ${correctedEvent.arrivalTime}s`,
      revision: {
        status: "backfilled",
        previousArtifactId: `watermarks:${scenarioId}:before-${correctedEvent.id}`,
        correctionId,
        reason: WATERMARK_CORRECTION_REASON,
      },
    })
    const time = previousTime ? updateTemporalContext(previousTime, update) : update
    stages.push(
      auditStage(
        {
          id: "late-corrected",
          label: "Late arrival / corrected",
          eventId: correctedEvent.id,
          time,
        },
        referenceTime,
        claimInputsFor(correctedEvent, correctionId),
      ),
    )
  }

  const current = stages.find(({ id }) => id === "live-open") ?? stages[stages.length - 1]
  return {
    current,
    stages,
    payload: {
      schema: "semiotic.time-state/0.1",
      scenarioId,
      referenceTime,
      eventCount: (events ?? []).length,
      arrivedEventCount: arrived.length,
      states: stages.map(payloadStage),
    },
  }
}

export function describeWatermarkTemporalStage(stage) {
  const time = stage?.time ?? {}
  const eventTime = replaySeconds(time.eventTime?.value)
  const arrivalTime = replaySeconds(time.ingestedAt)
  const watermark = replaySeconds(time.watermark?.value)
  const windowStart = replaySeconds(time.window?.start)
  const windowEnd = replaySeconds(time.window?.end)
  const status = time.window?.status ?? "unknown"
  const completeness = time.completeness?.status ?? "unknown"

  if (stage?.id === "late-corrected") {
    return `${stage.eventId} belongs to the ${windowStart}–${windowEnd}s event-time window. It was visible by the ${arrivalTime}s arrival frontier after that window settled, so the revision is ${time.revision?.status ?? "unknown"}, the window is ${status}, and completeness is ${completeness}.`
  }
  if (stage?.id === "settled") {
    return `${stage.eventId} occurred at ${eventTime}s. By the ${arrivalTime}s arrival frontier, the ${watermark}s watermark had passed its ${windowStart}–${windowEnd}s window; the window and completeness are both ${status}.`
  }
  return `${stage?.eventId ?? "The newest event"} occurred at ${eventTime}s. At the ${arrivalTime}s arrival frontier, the watermark is ${watermark}s and its ${windowStart}–${windowEnd}s window remains ${status}; completeness is ${completeness}.`
}
