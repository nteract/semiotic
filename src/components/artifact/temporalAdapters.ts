import type { TemporalContext, TemporalSourceState, TimeField } from "./types"

export type TemporalFreshness = NonNullable<TemporalContext["freshness"]>
export type TemporalCompleteness = NonNullable<TemporalContext["completeness"]>
export type TemporalWatermark = NonNullable<TemporalContext["watermark"]>
export type TemporalWindow = NonNullable<TemporalContext["window"]>
export type TemporalRevision = NonNullable<TemporalContext["revision"]>
export type TemporalPresentationState = NonNullable<
  NonNullable<TemporalContext["presentation"]>["state"]
>

export interface TemporalMetadataBase {
  id: string
  label?: string
  version?: string
  timezone?: string
  granularity?: string
  freshness?: TemporalFreshness
  completeness?: TemporalCompleteness
}

/** Vendor-neutral metadata for a live stream or topic. */
export interface StreamTopicMetadata extends TemporalMetadataBase {
  eventTime?: TimeField
  observedAt?: string
  ingestedAt?: string
  watermark?: TemporalWatermark
  window?: TemporalWindow
  revision?: TemporalRevision
  presentationLabel?: string
}

/** Vendor-neutral metadata for a processing job or statement. */
export interface ProcessingJobMetadata extends TemporalMetadataBase {
  eventTime?: TimeField
  observedAt?: string
  processedAt?: string
  watermark?: TemporalWatermark
  window?: TemporalWindow
  revision?: TemporalRevision
  presentationState?: TemporalPresentationState
  presentationLabel?: string
}

/**
 * Temporal facts about a quality check. The check's pass/fail result belongs in
 * quality-check evidence; this adapter records only when that result applies
 * and whether the result itself is current.
 */
export interface QualityCheckMetadata extends TemporalMetadataBase {
  checkedAt?: string
  appliesToObservedAt?: string
  heartbeatAt?: string
  expiresAt?: string
  basis?: string
}

/** Vendor-neutral metadata for a materialized historical snapshot. */
export interface HistoricalSnapshotMetadata extends TemporalMetadataBase {
  snapshotAt?: string
  dataObservedAt?: string
  format?: NonNullable<TemporalContext["snapshot"]>["format"]
  schemaVersion?: string
  catalogRef?: string
  revision?: TemporalRevision
  presentationLabel?: string
}

function unknownFreshness(kind: string): TemporalFreshness {
  return {
    status: "unknown",
    basis: `No ${kind} freshness state was supplied.`
  }
}

function unknownCompleteness(kind: string): TemporalCompleteness {
  return {
    status: "unknown",
    basis: `No ${kind} completeness state was supplied.`
  }
}

function sourceState(
  kind: TemporalSourceState["kind"],
  metadata: TemporalMetadataBase,
  observedAt?: string
): TemporalSourceState {
  return {
    id: metadata.id,
    kind,
    ...(metadata.label ? { label: metadata.label } : {}),
    ...(observedAt ? { observedAt } : {}),
    ...(metadata.version ? { version: metadata.version } : {}),
    ...(metadata.timezone ? { timezone: metadata.timezone } : {}),
    ...(metadata.granularity ? { granularity: metadata.granularity } : {}),
    freshness: metadata.freshness?.status ?? "unknown",
    completeness: metadata.completeness?.status ?? "unknown"
  }
}

/** Convert stream/topic metadata without assuming freshness or settlement. */
export function adaptStreamTopicMetadata(
  metadata: StreamTopicMetadata
): TemporalContext {
  const freshness = metadata.freshness ?? unknownFreshness("stream")
  const completeness = metadata.completeness ?? unknownCompleteness("stream")
  return {
    ...(metadata.eventTime ? { eventTime: { ...metadata.eventTime } } : {}),
    ...(metadata.observedAt ? { observedAt: metadata.observedAt } : {}),
    ...(metadata.ingestedAt ? { ingestedAt: metadata.ingestedAt } : {}),
    presentation: {
      state: "live",
      ...(metadata.presentationLabel
        ? { label: metadata.presentationLabel }
        : {})
    },
    freshness: { ...freshness },
    ...(metadata.watermark ? { watermark: { ...metadata.watermark } } : {}),
    ...(metadata.window ? { window: { ...metadata.window } } : {}),
    completeness: { ...completeness },
    ...(metadata.revision ? { revision: { ...metadata.revision } } : {}),
    sources: [sourceState("stream", metadata, metadata.observedAt)]
  }
}

/** Convert processing-job metadata while keeping its clock distinct. */
export function adaptProcessingJobMetadata(
  metadata: ProcessingJobMetadata
): TemporalContext {
  const freshness = metadata.freshness ?? unknownFreshness("processing-job")
  const completeness =
    metadata.completeness ?? unknownCompleteness("processing-job")
  return {
    ...(metadata.eventTime ? { eventTime: { ...metadata.eventTime } } : {}),
    ...(metadata.observedAt ? { observedAt: metadata.observedAt } : {}),
    ...(metadata.processedAt ? { processedAt: metadata.processedAt } : {}),
    ...(metadata.presentationState || metadata.presentationLabel
      ? {
          presentation: {
            ...(metadata.presentationState
              ? { state: metadata.presentationState }
              : {}),
            ...(metadata.presentationLabel
              ? { label: metadata.presentationLabel }
              : {})
          }
        }
      : {}),
    freshness: { ...freshness },
    ...(metadata.watermark ? { watermark: { ...metadata.watermark } } : {}),
    ...(metadata.window ? { window: { ...metadata.window } } : {}),
    completeness: { ...completeness },
    ...(metadata.revision ? { revision: { ...metadata.revision } } : {}),
    sources: [sourceState("processing-job", metadata, metadata.processedAt)]
  }
}

/** Convert quality-check timing without treating schema or test success as truth. */
export function adaptQualityCheckMetadata(
  metadata: QualityCheckMetadata
): TemporalContext {
  const suppliedFreshness = metadata.freshness
  const freshness: TemporalFreshness = {
    status: suppliedFreshness?.status ?? "unknown",
    ...(metadata.checkedAt
      ? { checkedAt: metadata.checkedAt }
      : suppliedFreshness?.checkedAt
        ? { checkedAt: suppliedFreshness.checkedAt }
        : {}),
    ...(metadata.heartbeatAt
      ? { heartbeatAt: metadata.heartbeatAt }
      : suppliedFreshness?.heartbeatAt
        ? { heartbeatAt: suppliedFreshness.heartbeatAt }
        : {}),
    ...(metadata.expiresAt
      ? { expiresAt: metadata.expiresAt }
      : suppliedFreshness?.expiresAt
        ? { expiresAt: suppliedFreshness.expiresAt }
        : {}),
    ...(metadata.basis
      ? { basis: metadata.basis }
      : suppliedFreshness?.basis
        ? { basis: suppliedFreshness.basis }
        : { basis: "No quality-result freshness basis was supplied." })
  }
  return {
    ...(metadata.appliesToObservedAt
      ? { observedAt: metadata.appliesToObservedAt }
      : {}),
    freshness,
    ...(metadata.completeness
      ? { completeness: { ...metadata.completeness } }
      : {}),
    sources: [
      sourceState(
        "quality-check",
        metadata,
        metadata.checkedAt ?? suppliedFreshness?.checkedAt
      )
    ]
  }
}

/** Convert snapshot metadata without assuming that materialization is settled. */
export function adaptHistoricalSnapshotMetadata(
  metadata: HistoricalSnapshotMetadata
): TemporalContext {
  const freshness = metadata.freshness ?? unknownFreshness("snapshot")
  const completeness = metadata.completeness ?? unknownCompleteness("snapshot")
  return {
    ...(metadata.dataObservedAt ? { observedAt: metadata.dataObservedAt } : {}),
    ...(metadata.snapshotAt ? { snapshotAt: metadata.snapshotAt } : {}),
    presentation: {
      state: "historical",
      ...(metadata.presentationLabel
        ? { label: metadata.presentationLabel }
        : {})
    },
    freshness: { ...freshness },
    completeness: { ...completeness },
    ...(metadata.revision ? { revision: { ...metadata.revision } } : {}),
    snapshot: {
      id: metadata.id,
      ...(metadata.format ? { format: metadata.format } : {}),
      ...(metadata.schemaVersion
        ? { schemaVersion: metadata.schemaVersion }
        : {}),
      ...(metadata.catalogRef ? { catalogRef: metadata.catalogRef } : {})
    },
    sources: [sourceState("snapshot", metadata, metadata.snapshotAt)]
  }
}

function definedEntries<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as Partial<T>
}

function mergeRecord<T extends object>(
  previous: T | undefined,
  next: T | undefined
): T | undefined {
  if (!previous && !next) return undefined
  return {
    ...(previous ? definedEntries(previous) : {}),
    ...(next ? definedEntries(next) : {})
  } as T
}

function sourceKey(source: TemporalSourceState): string {
  return `${source.kind}\u0000${source.id}`
}

function compareText(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function mergedSources(
  previous: TemporalSourceState[] | undefined,
  next: TemporalSourceState[] | undefined
): TemporalSourceState[] | undefined {
  if (!previous && !next) return undefined
  const sources = new Map<string, TemporalSourceState>()
  for (const source of [...(previous ?? []), ...(next ?? [])]) {
    const key = sourceKey(source)
    sources.set(key, {
      ...sources.get(key),
      ...definedEntries(source)
    } as TemporalSourceState)
  }
  return [...sources.values()].sort(
    (left, right) =>
      compareText(left.kind, right.kind) || compareText(left.id, right.id)
  )
}

const TEMPORAL_RECORD_KEYS = [
  "eventTime",
  "presentation",
  "freshness",
  "watermark",
  "window",
  "completeness",
  "revision",
  "snapshot"
] as const

function reconcileSourceStates(context: TemporalContext): TemporalContext {
  const sources = context.sources ?? []
  if (sources.length === 0) return context

  const freshnessStates = [
    ...(context.freshness ? [context.freshness.status] : []),
    ...sources.map(({ freshness }) => freshness ?? "unknown")
  ]
  const freshnessStatus: TemporalFreshness["status"] = freshnessStates.includes(
    "stale"
  )
    ? "stale"
    : freshnessStates.includes("unknown")
      ? "unknown"
      : "fresh"

  const completenessStates = [
    ...(context.completeness ? [context.completeness.status] : []),
    ...sources
      .filter(({ kind }) => kind !== "quality-check")
      .map(({ completeness }) => completeness ?? "unknown")
  ]
  const completenessStatus: TemporalCompleteness["status"] | undefined =
    completenessStates.length === 0
      ? undefined
      : completenessStates.includes("unknown")
        ? "unknown"
        : completenessStates.includes("partial")
          ? "partial"
          : completenessStates.includes("provisional")
            ? "provisional"
            : "settled"

  return {
    ...context,
    freshness:
      context.freshness?.status === freshnessStatus
        ? context.freshness
        : {
            ...context.freshness,
            status: freshnessStatus,
            basis:
              "Conservative state derived from all declared temporal sources."
          },
    ...(completenessStatus
      ? {
          completeness:
            context.completeness?.status === completenessStatus
              ? context.completeness
              : {
                  ...context.completeness,
                  status: completenessStatus,
                  basis:
                    "Conservative state derived from all applicable temporal sources."
                }
        }
      : {})
  }
}

/**
 * Merge contexts in precedence order. Later defined fields win, source records
 * are upserted by kind and id, and output source order is stable. Combining a
 * stream and snapshot is always labeled `mixed` so neither state is hidden.
 */
export function mergeTemporalContexts(
  ...contexts: ReadonlyArray<TemporalContext | undefined>
): TemporalContext {
  let merged: TemporalContext = {}
  for (const candidate of contexts) {
    if (!candidate) continue
    const previous = merged
    merged = {
      ...previous,
      ...definedEntries(candidate)
    }
    // Each nested record is copied exactly once. Keep this key list shared so
    // every temporal field follows the same defined-value merge semantics.
    for (const key of TEMPORAL_RECORD_KEYS) {
      const record = mergeRecord<object>(previous[key], candidate[key])
      if (record) Object.assign(merged, { [key]: record })
    }
    const sources = mergedSources(previous.sources, candidate.sources)
    if (sources) merged.sources = sources
  }

  const kinds = new Set(merged.sources?.map(({ kind }) => kind) ?? [])
  const hasSnapshot =
    kinds.has("snapshot") || Boolean(merged.snapshot || merged.snapshotAt)
  if (kinds.has("stream") && hasSnapshot) {
    merged.presentation = { ...merged.presentation, state: "mixed" }
  }
  return reconcileSourceStates(merged)
}

/** Apply one immutable, deterministic update to a temporal context. */
export function updateTemporalContext(
  current: TemporalContext,
  update: TemporalContext
): TemporalContext {
  return mergeTemporalContexts(current, update)
}
