import type {
  Claim,
  CorrectionRecord,
  ObligationResult,
  ObligationSummary,
  TemporalContext
} from "./types"
import { eventTimePresentationFinding } from "./temporalPresentation"

export * from "./temporalAdapters"
export { eventTimePresentationFinding } from "./temporalPresentation"

export interface TemporalAuditOptions {
  /**
   * Explicit instant used for expiry and age checks. The audit never reads the
   * ambient clock, which keeps replay and server rendering deterministic.
   */
  referenceTime?: string
  /** Maximum permitted age of a quality result relative to `referenceTime`. */
  maxQualityAgeMs?: number
  /** Claims included when checking whether a correction was propagated. */
  claims?: ReadonlyArray<Claim>
  /** Correction records available for binding a revised temporal state. */
  corrections?: ReadonlyArray<CorrectionRecord>
  /** Treat an unknown or unsettled window as a failed requirement. */
  requireSettled?: boolean
  /** Treat missing, stale, or unsupported live freshness as a failure. */
  requireFreshnessForLive?: boolean
}

export interface TemporalAudit {
  ok: boolean
  sources: number
  summary: ObligationSummary
  findings: ObligationResult[]
}

function compareText(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

import { summarizeObligations as summaryFor } from "./obligations"

import {
  parseClock,
  parseFixedDurationMs,
  normalizedTimezone,
  normalizedGranularity,
  finalPresentation,
  type ParsedClock
} from "./temporalAuditHelpers"

/**
 * Audit whether temporal claims are explicit and internally coherent. This is
 * structural evidence by default. Optional policy requirements can escalate
 * missing freshness or settlement, while unknown states remain explicit.
 */
export function auditTemporalContext(
  context: TemporalContext | undefined,
  options: TemporalAuditOptions = {}
): TemporalAudit {
  const value = context ?? {}
  const findings: ObligationResult[] = []
  const clocks = [
    parseClock(
      "event time",
      "time.eventTime.value",
      value.eventTime?.value,
      findings
    ),
    parseClock(
      "observation time",
      "time.observedAt",
      value.observedAt,
      findings
    ),
    parseClock("ingestion time", "time.ingestedAt", value.ingestedAt, findings),
    parseClock(
      "processing time",
      "time.processedAt",
      value.processedAt,
      findings
    ),
    parseClock(
      "publication time",
      "time.publishedAt",
      value.publishedAt,
      findings
    )
  ].filter((clock): clock is ParsedClock => Boolean(clock))
  const snapshotClock = parseClock(
    "snapshot time",
    "time.snapshotAt",
    value.snapshotAt,
    findings
  )
  const watermarkClock = parseClock(
    "watermark frontier",
    "time.watermark.value",
    value.watermark?.value,
    findings
  )
  if (
    value.watermark?.allowedLateness !== undefined &&
    !Number.isFinite(parseFixedDurationMs(value.watermark.allowedLateness))
  ) {
    findings.push({
      id: "time.watermark.allowed-lateness-invalid",
      relation: "time",
      status: "fail",
      path: "time.watermark.allowedLateness",
      message:
        "Allowed lateness is not a nonnegative, fixed-unit ISO 8601 duration.",
      repair:
        "Use an explicit duration such as PT30S, PT5M, P2D, or P1W; calendar months and years are not fixed intervals."
    })
  }

  if (clocks.length === 0 && !snapshotClock) {
    findings.push({
      id: "time.clocks.unknown",
      relation: "time",
      status: "unknown",
      path: "time",
      message:
        "No event, observation, ingestion, processing, publication, or snapshot clock is known."
    })
  } else {
    let ordered = true
    for (let index = 1; index < clocks.length; index += 1) {
      const previous = clocks[index - 1]
      const current = clocks[index]
      if (previous.time > current.time) {
        ordered = false
        findings.push({
          id: `time.clock.order.${index}`,
          relation: "time",
          status: "fail",
          path: current.path,
          message: `${current.name} precedes the known ${previous.name}.`,
          repair:
            "Correct the clocks or document them as separate source timelines."
        })
      }
    }
    if (ordered && clocks.length > 1) {
      findings.push({
        id: "time.clock.order",
        relation: "time",
        status: "pass",
        path: "time",
        message:
          "Known event, observation, ingestion, processing, and publication clocks are ordered."
      })
    }
  }

  const publishedClock = clocks.find(({ name }) => name === "publication time")
  const observedClock = clocks.find(({ name }) => name === "observation time")
  if (
    snapshotClock &&
    observedClock &&
    snapshotClock.time < observedClock.time
  ) {
    findings.push({
      id: "time.clock.order.observation-snapshot",
      relation: "time",
      status: "fail",
      path: "time.snapshotAt",
      message:
        "The snapshot precedes the data observation time it is meant to capture.",
      repair: "Correct the observation or snapshot clock."
    })
  }
  if (
    snapshotClock &&
    publishedClock &&
    snapshotClock.time > publishedClock.time
  ) {
    findings.push({
      id: "time.clock.order.snapshot-publication",
      relation: "time",
      status: "fail",
      path: "time.snapshotAt",
      message: "The snapshot was created after the declared publication time.",
      repair:
        "Update the publication clock or identify the snapshot actually used."
    })
  }

  const freshness = value.freshness
  const live = value.presentation?.state === "live"
  const freshnessBasis = Boolean(
    freshness?.basis ||
    freshness?.heartbeatAt ||
    freshness?.checkedAt ||
    freshness?.expiresAt
  )
  if (!freshness || freshness.status === "unknown") {
    findings.push({
      id: live ? "time.live.freshness-unknown" : "time.freshness.unknown",
      relation: "time",
      status: live && options.requireFreshnessForLive ? "fail" : "unknown",
      path: "time.freshness",
      message: live
        ? "The artifact is labeled live without a known freshness state."
        : "Freshness is not known.",
      repair: live
        ? "Supply a heartbeat, expiry, check time, or documented freshness basis."
        : undefined
    })
  } else if (live && freshness.status === "stale") {
    findings.push({
      id: "time.live.stale",
      relation: "time",
      status: options.requireFreshnessForLive ? "fail" : "warn",
      path: "time.freshness.status",
      message:
        "The artifact is labeled live while its declared freshness is stale.",
      repair:
        "Expose the stale state prominently or remove the live presentation."
    })
  } else if (live && !freshnessBasis) {
    findings.push({
      id: "time.live.freshness-basis",
      relation: "time",
      status: options.requireFreshnessForLive ? "fail" : "unknown",
      path: "time.freshness",
      message:
        "The artifact is labeled live but its freshness state has no inspectable basis.",
      repair:
        "Supply a heartbeat, expiry, check time, or documented freshness basis."
    })
  } else if (live) {
    findings.push({
      id: "time.live.freshness",
      relation: "time",
      status: "pass",
      path: "time.freshness",
      message: "The live presentation has an inspectable freshness basis."
    })
  }

  const referenceClock = parseClock(
    "reference time",
    "options.referenceTime",
    options.referenceTime,
    findings
  )
  const eventTimePresentation = eventTimePresentationFinding(
    value,
    options.referenceTime
  )
  if (eventTimePresentation) findings.push(eventTimePresentation)
  const expiryClock = parseClock(
    "freshness expiry",
    "time.freshness.expiresAt",
    freshness?.expiresAt,
    findings
  )
  const checkedClock = parseClock(
    "freshness check time",
    "time.freshness.checkedAt",
    freshness?.checkedAt,
    findings
  )
  const heartbeatClock = parseClock(
    "heartbeat time",
    "time.freshness.heartbeatAt",
    freshness?.heartbeatAt,
    findings
  )
  if (checkedClock && expiryClock && checkedClock.time > expiryClock.time) {
    findings.push({
      id: "time.freshness.expiry-order",
      relation: "time",
      status: "fail",
      path: "time.freshness.expiresAt",
      message: "Freshness expires before it was checked.",
      repair: "Correct the check and expiry clocks."
    })
  }
  if (
    heartbeatClock &&
    checkedClock &&
    heartbeatClock.time > checkedClock.time
  ) {
    findings.push({
      id: "time.freshness.heartbeat-order",
      relation: "time",
      status: "fail",
      path: "time.freshness.heartbeatAt",
      message: "The heartbeat occurs after the freshness check that cites it.",
      repair: "Use a later check time or the heartbeat observed by that check."
    })
  }
  if (
    referenceClock &&
    expiryClock &&
    freshness?.status === "fresh" &&
    expiryClock.time < referenceClock.time
  ) {
    findings.push({
      id: "time.freshness.expired",
      relation: "time",
      status: "fail",
      path: "time.freshness.status",
      message: "Freshness is marked fresh after its declared expiry.",
      repair: "Refresh the state or mark it stale."
    })
  }

  const windowStart = parseClock(
    "window start",
    "time.window.start",
    value.window?.start,
    findings
  )
  const windowEnd = parseClock(
    "window end",
    "time.window.end",
    value.window?.end,
    findings
  )
  if (windowStart && windowEnd && windowStart.time >= windowEnd.time) {
    findings.push({
      id: "time.window.order",
      relation: "time",
      status: "fail",
      path: "time.window",
      message: "The temporal window does not end after it starts.",
      repair: "Supply an ordered, non-empty window."
    })
  }

  const windowStatus = value.window?.status
  const completeness = value.completeness?.status
  const incompleteWindow =
    windowStatus === "open" ||
    windowStatus === "provisional" ||
    windowStatus === "reopened"
  const finalWindow = windowStatus === "settled" || windowStatus === "corrected"
  if (
    finalWindow &&
    watermarkClock &&
    windowEnd &&
    watermarkClock.time < windowEnd.time
  ) {
    findings.push({
      id: "time.watermark.before-settled-window-end",
      relation: "time",
      status: "fail",
      path: "time.watermark.value",
      message:
        "The declared frontier has not reached the end of the settled window.",
      repair:
        "Keep the window provisional or supply the frontier that established settlement."
    })
  }
  if (incompleteWindow && completeness === "settled") {
    findings.push({
      id: "time.window.provisional-as-settled",
      relation: "time",
      status: "fail",
      path: "time.completeness.status",
      message: `A ${windowStatus} window is marked settled.`,
      repair:
        "Mark completeness partial or provisional until the window settles."
    })
  } else if (
    finalWindow &&
    (completeness === "partial" || completeness === "provisional")
  ) {
    findings.push({
      id: "time.window.settled-as-provisional",
      relation: "time",
      status: "fail",
      path: "time.completeness.status",
      message: `A ${windowStatus} window is marked ${completeness}.`,
      repair:
        "Align the window and completeness states or explain the remaining work."
    })
  } else if (windowStatus && completeness && completeness !== "unknown") {
    findings.push({
      id: "time.window.completeness",
      relation: "time",
      status: "pass",
      path: "time.window",
      message: "Window and completeness states are compatible."
    })
  }
  if (
    finalPresentation(value) &&
    (incompleteWindow || completeness !== "settled")
  ) {
    findings.push({
      id: "time.presentation.final-mismatch",
      relation: "time",
      status: "fail",
      path: "time.presentation.label",
      message:
        "The presentation says final or complete while temporal state remains unsettled.",
      repair:
        "Use provisional language or settle the declared window and completeness state."
    })
  }
  if (!completeness || completeness === "unknown") {
    findings.push({
      id: "time.completeness.unknown",
      relation: "time",
      status: "unknown",
      path: "time.completeness",
      message: "Temporal completeness is not known."
    })
  }
  if (
    options.requireSettled &&
    (!windowStatus || !["settled", "corrected"].includes(windowStatus))
  ) {
    findings.push({
      id: "time.window.settlement-required",
      relation: "time",
      status: "fail",
      path: "time.window.status",
      message:
        "Policy requires a settled window, but settlement is not established.",
      repair:
        "Wait for settlement or use a policy that permits provisional data."
    })
  }
  if (options.requireSettled && completeness !== "settled") {
    findings.push({
      id: "time.completeness.settlement-required",
      relation: "time",
      status: "fail",
      path: "time.completeness.status",
      message:
        "Policy requires settled completeness, but the artifact is not settled.",
      repair:
        "Wait for complete data or expose the artifact under a provisional policy."
    })
  }

  const sources = value.sources ?? []
  const sourceClocks = sources.map((source, index) =>
    parseClock(
      `source ${source.kind} ${source.id} observation`,
      `time.sources[${index}].observedAt`,
      source.observedAt,
      findings
    )
  )
  const frontierUpperClocks = [
    referenceClock,
    clocks.find(({ name }) => name === "ingestion time"),
    clocks.find(({ name }) => name === "processing time"),
    publishedClock,
    snapshotClock,
    ...sourceClocks.filter(
      (clock, index) =>
        clock &&
        ["processing-job", "snapshot", "publication"].includes(
          sources[index].kind
        )
    )
  ].filter((clock): clock is ParsedClock => Boolean(clock))
  if (
    watermarkClock &&
    frontierUpperClocks.length > 0 &&
    watermarkClock.time >
      Math.max(...frontierUpperClocks.map(({ time }) => time))
  ) {
    findings.push({
      id: "time.watermark.after-declared-clock",
      relation: "time",
      status: "fail",
      path: "time.watermark.value",
      message:
        "The declared frontier is later than every known processing, publication, snapshot, reference, or applicable source clock.",
      repair:
        "Correct the frontier or supply the later clock that established it."
    })
  }
  const hasStream = sources.some(({ kind }) => kind === "stream")
  const hasSnapshot =
    sources.some(({ kind }) => kind === "snapshot") || Boolean(value.snapshot)
  if (hasStream && hasSnapshot) {
    if (value.presentation?.state !== "mixed") {
      findings.push({
        id: "time.sources.mixed-undisclosed",
        relation: "time",
        status: "fail",
        path: "time.presentation.state",
        message:
          "Stream and snapshot states are combined without a mixed presentation state.",
        repair:
          "Label the artifact mixed and expose which marks or claims use each source."
      })
    } else {
      findings.push({
        id: "time.sources.mixed",
        relation: "time",
        status: "pass",
        path: "time.presentation.state",
        message:
          "The artifact discloses its combined stream and snapshot state."
      })
    }
  } else if (value.presentation?.state === "mixed") {
    findings.push({
      id: "time.sources.mixed-unresolved",
      relation: "time",
      status: "unknown",
      path: "time.sources",
      message:
        "The presentation is marked mixed, but both stream and snapshot sources are not identified."
    })
  }

  const topObservedClock = clocks.find(
    ({ name }) => name === "observation time"
  )
  for (const [sourceIndex, source] of sources.entries()) {
    if (source.kind !== "quality-check") continue
    const path = `time.sources[${sourceIndex}]`
    const sourceClock = sourceClocks[sourceIndex]
    if (!source.freshness || source.freshness === "unknown") {
      findings.push({
        id: `time.quality.freshness-unknown.${source.id}`,
        relation: "time",
        status: "unknown",
        path: `${path}.freshness`,
        message: `Quality result "${source.id}" has no known freshness state.`
      })
    } else if (source.freshness === "stale") {
      findings.push({
        id: `time.quality.stale.${source.id}`,
        relation: "time",
        status: freshness?.status === "fresh" ? "fail" : "warn",
        path: `${path}.freshness`,
        message: `Quality result "${source.id}" is stale${
          freshness?.status === "fresh"
            ? " while the artifact is marked fresh"
            : ""
        }.`,
        repair:
          "Run or attach a current quality check, or expose the stale result."
      })
    }
    if (
      sourceClock &&
      topObservedClock &&
      sourceClock.time < topObservedClock.time
    ) {
      findings.push({
        id: `time.quality.predates-data.${source.id}`,
        relation: "time",
        status: freshness?.status === "fresh" ? "fail" : "warn",
        path: `${path}.observedAt`,
        message: `Quality result "${source.id}" predates the data it appears to cover.`,
        repair:
          "Attach a quality result that covers the current data version or observation time."
      })
    }
    if (
      sourceClock &&
      referenceClock &&
      typeof options.maxQualityAgeMs === "number" &&
      Number.isFinite(options.maxQualityAgeMs) &&
      options.maxQualityAgeMs >= 0 &&
      referenceClock.time - sourceClock.time > options.maxQualityAgeMs
    ) {
      findings.push({
        id: `time.quality.age.${source.id}`,
        relation: "time",
        status: "warn",
        path: `${path}.observedAt`,
        message: `Quality result "${source.id}" exceeds the permitted age.`,
        repair: "Run a newer quality check or revise the permitted-age policy."
      })
    }
  }

  const timezoneDeclarations = [
    ...(value.eventTime?.timezone
      ? [{ path: "time.eventTime.timezone", value: value.eventTime.timezone }]
      : []),
    ...sources.flatMap((source, index) =>
      source.timezone
        ? [{ path: `time.sources[${index}].timezone`, value: source.timezone }]
        : []
    )
  ]
  const timezones = new Set(
    timezoneDeclarations.map(({ value: timezone }) =>
      normalizedTimezone(timezone)
    )
  )
  if (timezones.size > 1) {
    findings.push({
      id: "time.timezone.mismatch",
      relation: "time",
      status: "warn",
      path: "time",
      message:
        "Temporal sources declare different time zones without a normalization rule.",
      repair:
        "Normalize the clocks or record how source zones map to presentation time."
    })
  }

  const granularityDeclarations = [
    ...(value.eventTime?.granularity
      ? [
          {
            path: "time.eventTime.granularity",
            value: value.eventTime.granularity
          }
        ]
      : []),
    ...sources.flatMap((source, index) =>
      source.granularity
        ? [
            {
              path: `time.sources[${index}].granularity`,
              value: source.granularity
            }
          ]
        : []
    )
  ]
  const granularities = new Set(
    granularityDeclarations.map(({ value: granularity }) =>
      normalizedGranularity(granularity)
    )
  )
  if (granularities.size > 1) {
    findings.push({
      id: "time.granularity.mismatch",
      relation: "time",
      status: "warn",
      path: "time",
      message:
        "Temporal sources declare different granularities without an aggregation rule.",
      repair: "Name the aggregation or comparison rule across granularities."
    })
  }

  const revision = value.revision
  const correctionWindow =
    windowStatus === "reopened" || windowStatus === "corrected"
  const correctionRevision =
    revision?.status === "backfilled" || revision?.status === "corrected"
  if (correctionWindow && (!revision || revision.status === "original")) {
    findings.push({
      id: "time.revision.window-mismatch",
      relation: "challenge-and-correction",
      status: "fail",
      path: "time.revision",
      message: `The ${windowStatus} window does not declare a correction or backfill revision.`,
      repair: "Record the revision and link the prior artifact when one exists."
    })
  }
  if (correctionRevision && value.window && windowStatus === "settled") {
    findings.push({
      id: "time.revision.status-mismatch",
      relation: "challenge-and-correction",
      status: "fail",
      path: "time.window.status",
      message: `A ${revision.status} revision retains a ${windowStatus} window state.`,
      repair: "Mark the affected window reopened or corrected."
    })
  }
  if (correctionRevision && !revision.reason) {
    findings.push({
      id: "time.revision.reason",
      relation: "challenge-and-correction",
      status: "warn",
      path: "time.revision.reason",
      message: `The ${revision.status} revision has no recorded reason.`,
      repair:
        "State whether late data, backfill, recalibration, or another change caused the revision."
    })
  }
  if (correctionRevision && !revision.previousArtifactId) {
    findings.push({
      id: "time.revision.previous-artifact",
      relation: "challenge-and-correction",
      status: "unknown",
      path: "time.revision.previousArtifactId",
      message: `The ${revision.status} revision does not identify the prior artifact.`
    })
  }
  if (correctionRevision) {
    const corrections = options.corrections ?? []
    const correction = revision.correctionId
      ? corrections.find(({ id }) => id === revision.correctionId)
      : undefined
    if (!revision.correctionId) {
      findings.push({
        id: "time.revision.correction-link",
        relation: "challenge-and-correction",
        status: "unknown",
        path: "time.revision.correctionId",
        message: `The ${revision.status} revision does not identify its correction record.`,
        repair:
          "Bind the revision to the correction record that explains its claim effects."
      })
      if ((options.claims?.length ?? 0) > 0) {
        findings.push({
          id: "time.revision.claim-propagation",
          relation: "challenge-and-correction",
          status: "manual",
          path: "claims",
          message: `The ${revision.status} revision has no correction record binding it to affected claims.`,
          repair:
            "Link a correction record and preserve the affected and replacement claim states."
        })
      }
    } else if (!correction) {
      findings.push({
        id: "time.revision.correction-missing",
        relation: "challenge-and-correction",
        status: "fail",
        path: "time.revision.correctionId",
        message: `Revision correction "${revision.correctionId}" is not present in the artifact.`,
        repair: "Add the correction record or correct the revision link."
      })
    } else if (options.claims) {
      const claimsById = new Map(
        options.claims.map((claim) => [claim.id, claim])
      )
      const propagated = correction.affectedClaimIds.every((claimId) => {
        const claim = claimsById.get(claimId)
        return claim?.status === "superseded" || claim?.status === "retracted"
      })
      if (!propagated) {
        findings.push({
          id: "time.revision.claim-propagation",
          relation: "challenge-and-correction",
          status: "manual",
          path: "claims",
          message: `Correction "${correction.id}" is not reflected in every affected claim state.`,
          repair:
            "Preserve affected claims and record their superseded or retracted states."
        })
      }
    }
  }

  findings.sort((left, right) => compareText(left.id, right.id))
  const summary = summaryFor(findings)
  return {
    ok: summary.fail === 0,
    sources: sources.length,
    summary,
    findings
  }
}
