import { describe, expect, it } from "vitest"
import {
  adaptHistoricalSnapshotMetadata,
  adaptProcessingJobMetadata,
  adaptQualityCheckMetadata,
  adaptStreamTopicMetadata,
  auditTemporalContext,
  mergeTemporalContexts,
  updateTemporalContext
} from "./temporal"
import type { TemporalContext } from "./types"

function findingIds(context: TemporalContext): string[] {
  return auditTemporalContext(context).findings.map(({ id }) => id)
}

describe("temporal metadata adapters", () => {
  it("keeps absent live freshness and completeness honestly unknown", () => {
    const context = adaptStreamTopicMetadata({ id: "orders" })

    expect(context).toMatchObject({
      presentation: { state: "live" },
      freshness: { status: "unknown" },
      completeness: { status: "unknown" },
      sources: [
        {
          id: "orders",
          kind: "stream",
          freshness: "unknown",
          completeness: "unknown"
        }
      ]
    })
    expect(findingIds(context)).toContain("time.live.freshness-unknown")
    expect(
      auditTemporalContext(context, { requireFreshnessForLive: true }).findings
    ).toContainEqual(
      expect.objectContaining({
        id: "time.live.freshness-unknown",
        status: "fail"
      })
    )
  })

  it("maps processing, quality, and snapshot clocks without vendor fields", () => {
    const processing = adaptProcessingJobMetadata({
      id: "hourly-rollup",
      observedAt: "2026-08-31T12:00:00Z",
      processedAt: "2026-08-31T12:01:00Z",
      completeness: { status: "provisional", basis: "window remains open" }
    })
    const quality = adaptQualityCheckMetadata({
      id: "source-age",
      appliesToObservedAt: "2026-08-31T12:00:00Z",
      freshness: {
        status: "fresh",
        checkedAt: "2026-08-31T12:02:00Z"
      },
      expiresAt: "2026-08-31T12:07:00Z"
    })
    const snapshot = adaptHistoricalSnapshotMetadata({
      id: "snapshot-42",
      snapshotAt: "2026-08-31T12:03:00Z",
      format: "iceberg",
      schemaVersion: "7",
      catalogRef: "catalog://metrics/hourly",
      completeness: { status: "settled", basis: "committed snapshot" }
    })

    expect(processing.processedAt).toBe("2026-08-31T12:01:00Z")
    expect(quality.sources?.[0]).toMatchObject({
      kind: "quality-check",
      observedAt: "2026-08-31T12:02:00Z",
      freshness: "fresh"
    })
    expect(snapshot).toMatchObject({
      snapshotAt: "2026-08-31T12:03:00Z",
      presentation: { state: "historical" },
      snapshot: {
        id: "snapshot-42",
        format: "iceberg",
        schemaVersion: "7",
        catalogRef: "catalog://metrics/hourly"
      }
    })
  })
})

describe("mergeTemporalContexts", () => {
  it("copies every nested record and ignores undefined updates", () => {
    const current: TemporalContext = {
      eventTime: { value: "2026-09-04T12:00:00Z", timezone: "UTC" },
      presentation: { state: "historical", label: "Snapshot" },
      freshness: { status: "unknown", basis: "Not checked" },
      watermark: { value: "2026-09-04T12:00:00Z" },
      window: {
        start: "2026-09-04T11:00:00Z",
        end: "2026-09-04T12:00:00Z",
        status: "settled"
      },
      completeness: { status: "unknown", basis: "Not checked" },
      revision: { status: "original" },
      snapshot: { id: "snapshot-1" },
      sources: [{ id: "source-1", kind: "snapshot" }]
    }
    const result = mergeTemporalContexts(current, {
      eventTime: { timezone: undefined },
      presentation: { label: undefined },
      sources: undefined
    })
    expect(result).toEqual(current)
    for (const key of Object.keys(current) as (keyof TemporalContext)[]) {
      expect(result[key]).not.toBe(current[key])
    }
    expect(result.sources?.[0]).not.toBe(current.sources?.[0])
    expect(mergeTemporalContexts(undefined)).toEqual({})
  })

  it("uses ordered precedence, stable source upserts, and mixed presentation", () => {
    const live = adaptStreamTopicMetadata({
      id: "events",
      observedAt: "2026-08-31T12:04:00Z",
      version: "1",
      freshness: {
        status: "fresh",
        heartbeatAt: "2026-08-31T12:04:00Z"
      },
      completeness: { status: "provisional" }
    })
    const snapshot = adaptHistoricalSnapshotMetadata({
      id: "history",
      snapshotAt: "2026-08-31T12:00:00Z",
      completeness: { status: "settled" }
    })
    const update: TemporalContext = {
      sources: [
        {
          id: "events",
          kind: "stream",
          version: "2",
          freshness: "fresh"
        }
      ]
    }

    const first = mergeTemporalContexts(snapshot, live, update)
    const replay = mergeTemporalContexts(snapshot, live, update)

    expect(first).toEqual(replay)
    expect(first.presentation?.state).toBe("mixed")
    expect(first.freshness?.status).toBe("unknown")
    expect(first.completeness?.status).toBe("provisional")
    expect(first.sources?.map(({ kind, id }) => `${kind}:${id}`)).toEqual([
      "snapshot:history",
      "stream:events"
    ])
    expect(first.sources?.find(({ id }) => id === "events")?.version).toBe("2")
    expect(live.sources?.[0].version).toBe("1")
  })

  it("applies immutable updates and permits an explicit settled correction", () => {
    const current = adaptStreamTopicMetadata({
      id: "readings",
      window: {
        start: "2026-08-31T12:00:00Z",
        end: "2026-08-31T13:00:00Z",
        status: "settled"
      },
      completeness: { status: "settled" }
    })
    const corrected = updateTemporalContext(current, {
      window: {
        start: "2026-08-31T12:00:00Z",
        end: "2026-08-31T13:00:00Z",
        status: "corrected"
      },
      revision: {
        status: "backfilled",
        previousArtifactId: "readings-before-late-burst",
        reason: "Late readings were included in the historical result."
      }
    })

    expect(current.window?.status).toBe("settled")
    expect(corrected.window?.status).toBe("corrected")
    expect(findingIds(corrected)).not.toContain("time.revision.status-mismatch")
    expect(findingIds(corrected)).not.toContain("time.revision.window-mismatch")
  })

  it("reconciles one source against top-level state and recognizes a top-level snapshot", () => {
    const merged = mergeTemporalContexts(
      {
        snapshot: { id: "history" },
        freshness: { status: "fresh" },
        completeness: { status: "settled" }
      },
      {
        sources: [
          {
            id: "events",
            kind: "stream",
            freshness: "stale",
            completeness: "provisional"
          }
        ]
      }
    )

    expect(merged.presentation?.state).toBe("mixed")
    expect(merged.freshness?.status).toBe("stale")
    expect(merged.completeness?.status).toBe("provisional")
  })
})

describe("auditTemporalContext", () => {
  it("rejects presenting older event-time data as wall-clock current", () => {
    const audit = auditTemporalContext(
      {
        eventTime: { value: "2026-08-31T12:00:00Z" },
        processedAt: "2026-08-31T12:05:00Z",
        presentation: { state: "historical", label: "Current total" },
        completeness: { status: "settled" }
      },
      { referenceTime: "2026-08-31T12:10:00Z" }
    )

    expect(audit.findings).toContainEqual(
      expect.objectContaining({
        id: "time.presentation.event-time-as-now",
        status: "fail"
      })
    )
  })

  it("does not mistake up-to-date language for an explicit time bound", () => {
    const currentClaim = auditTemporalContext(
      {
        eventTime: { value: "2026-08-31T12:00:00Z" },
        publishedAt: "2026-08-31T12:05:00Z",
        presentation: { state: "historical", label: "Up to date total" },
        completeness: { status: "settled" }
      },
      { referenceTime: "2026-08-31T12:10:00Z" }
    )
    const boundedClaim = auditTemporalContext(
      {
        eventTime: { value: "2026-08-31T12:00:00Z" },
        publishedAt: "2026-08-31T12:05:00Z",
        presentation: {
          state: "historical",
          label: "Current total up to 2026-08-31 12:00 UTC"
        },
        completeness: { status: "settled" }
      },
      { referenceTime: "2026-08-31T12:10:00Z" }
    )

    expect(currentClaim.findings.map(({ id }) => id)).toContain(
      "time.presentation.event-time-as-now"
    )
    expect(boundedClaim.findings.map(({ id }) => id)).not.toContain(
      "time.presentation.event-time-as-now"
    )
  })

  it("accepts explicit as-of language and an event matching the declared clock", () => {
    const bounded = auditTemporalContext(
      {
        eventTime: { value: "2026-08-31T12:00:00Z" },
        publishedAt: "2026-08-31T12:05:00Z",
        presentation: {
          state: "historical",
          label: "Current total as of 12:00 UTC"
        },
        completeness: { status: "settled" }
      },
      { referenceTime: "2026-08-31T12:10:00Z" }
    )
    const aligned = auditTemporalContext(
      {
        eventTime: { value: "2026-08-31T12:10:00Z" },
        presentation: { state: "live", label: "Live total" },
        freshness: { status: "fresh", basis: "source clock" },
        completeness: { status: "settled" }
      },
      { referenceTime: "2026-08-31T12:10:00Z" }
    )

    expect(bounded.findings.map(({ id }) => id)).not.toContain(
      "time.presentation.event-time-as-now"
    )
    expect(aligned.findings.map(({ id }) => id)).not.toContain(
      "time.presentation.event-time-as-now"
    )
  })

  it("detects provisional state presented as final", () => {
    const audit = auditTemporalContext({
      presentation: { state: "historical", label: "Final count" },
      window: {
        start: "2026-08-31T12:00:00Z",
        end: "2026-08-31T13:00:00Z",
        status: "provisional"
      },
      completeness: { status: "settled" }
    })

    expect(audit.ok).toBe(false)
    expect(audit.findings.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "time.presentation.final-mismatch",
        "time.window.provisional-as-settled"
      ])
    )
  })

  it("detects stream and snapshot state mixed without disclosure", () => {
    const audit = auditTemporalContext({
      presentation: { state: "live" },
      freshness: { status: "fresh", basis: "heartbeat" },
      completeness: { status: "provisional" },
      sources: [
        { id: "events", kind: "stream" },
        { id: "history", kind: "snapshot" }
      ]
    })

    expect(audit.ok).toBe(false)
    expect(audit.findings).toContainEqual(
      expect.objectContaining({
        id: "time.sources.mixed-undisclosed",
        status: "fail"
      })
    )
  })

  it("detects stale quality attached to fresher data", () => {
    const audit = auditTemporalContext({
      observedAt: "2026-08-31T12:05:00Z",
      freshness: { status: "fresh", basis: "source heartbeat" },
      completeness: { status: "settled" },
      sources: [
        {
          id: "source-age",
          kind: "quality-check",
          observedAt: "2026-08-31T12:00:00Z",
          freshness: "stale"
        }
      ]
    })

    expect(audit.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "time.quality.stale.source-age",
          status: "fail"
        }),
        expect.objectContaining({
          id: "time.quality.predates-data.source-age",
          status: "fail"
        })
      ])
    )
  })

  it("checks clock ordering and freshness expiry against an explicit clock", () => {
    const audit = auditTemporalContext(
      {
        eventTime: { value: "2026-08-31T12:00:00Z" },
        observedAt: "2026-08-31T12:03:00Z",
        ingestedAt: "2026-08-31T12:02:00Z",
        processedAt: "2026-08-31T12:04:00Z",
        freshness: {
          status: "fresh",
          checkedAt: "2026-08-31T12:04:00Z",
          expiresAt: "2026-08-31T12:05:00Z"
        },
        completeness: { status: "settled" }
      },
      { referenceTime: "2026-08-31T12:06:00Z" }
    )

    expect(audit.ok).toBe(false)
    expect(audit.findings.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["time.clock.order.2", "time.freshness.expired"])
    )
  })

  it("rejects impossible calendar dates and snapshots before observation", () => {
    const audit = auditTemporalContext({
      observedAt: "2026-02-28T12:00:00Z",
      snapshotAt: "2026-02-27T12:00:00Z",
      publishedAt: "2026-02-30T12:01:00Z",
      completeness: { status: "settled" }
    })

    expect(audit.findings.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "time.clock.invalid.publication-time",
        "time.clock.order.observation-snapshot"
      ])
    )
  })

  it("does not interpret explicitly provisional wording as a final label", () => {
    const audit = auditTemporalContext({
      presentation: { state: "historical", label: "Not final" },
      window: {
        start: "2026-08-31T12:00:00Z",
        end: "2026-08-31T13:00:00Z",
        status: "provisional"
      },
      completeness: { status: "provisional" }
    })

    expect(audit.findings.map(({ id }) => id)).not.toContain(
      "time.presentation.final-mismatch"
    )
  })

  it("recognizes short negative qualifiers before final-state words", () => {
    for (const label of [
      "Not yet final",
      "Never considered fully settled",
      "No longer considered complete"
    ]) {
      const audit = auditTemporalContext({
        presentation: { state: "historical", label },
        window: {
          start: "2026-08-31T12:00:00Z",
          end: "2026-08-31T13:00:00Z",
          status: "provisional"
        },
        completeness: { status: "provisional" }
      })

      expect(
        audit.findings.map(({ id }) => id),
        `unexpected final-state finding for ${label}`
      ).not.toContain("time.presentation.final-mismatch")
    }
  })

  it("reports timezone and granularity mismatches", () => {
    const audit = auditTemporalContext({
      eventTime: {
        value: "2026-08-31T12:00:00Z",
        timezone: "UTC",
        granularity: "minute"
      },
      completeness: { status: "settled" },
      sources: [
        {
          id: "daily-history",
          kind: "snapshot",
          timezone: "America/Los_Angeles",
          granularity: "day"
        }
      ]
    })

    expect(audit.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "time.timezone.mismatch",
          status: "warn"
        }),
        expect.objectContaining({
          id: "time.granularity.mismatch",
          status: "warn"
        })
      ])
    )
  })

  it("detects correction state left unchanged after a backfill", () => {
    const audit = auditTemporalContext(
      {
        window: {
          start: "2026-08-31T12:00:00Z",
          end: "2026-08-31T13:00:00Z",
          status: "settled"
        },
        completeness: { status: "settled" },
        revision: { status: "backfilled", correctionId: "correction-rate" }
      },
      {
        claims: [
          {
            id: "rate",
            kind: "observation",
            status: "supported",
            evidenceIds: ["hourly-rollup"]
          }
        ],
        corrections: [
          {
            id: "correction-rate",
            affectedClaimIds: ["rate"],
            reason: "Late records changed the result."
          }
        ]
      }
    )

    expect(audit.ok).toBe(false)
    expect(audit.findings.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "time.revision.status-mismatch",
        "time.revision.reason",
        "time.revision.previous-artifact",
        "time.revision.claim-propagation"
      ])
    )
  })

  it("returns unknown rather than false confidence when time is absent", () => {
    const audit = auditTemporalContext(undefined)

    expect(audit.ok).toBe(true)
    expect(audit.summary).toMatchObject({
      pass: 0,
      fail: 0,
      unknown: 3
    })
    expect(audit.findings.map(({ id }) => id)).toEqual([
      "time.clocks.unknown",
      "time.completeness.unknown",
      "time.freshness.unknown"
    ])
  })
})
