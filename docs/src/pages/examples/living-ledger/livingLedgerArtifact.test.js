import { describe, expect, it } from "vitest"
import { auditClaims, auditTemporalContext, validateArtifactContract } from "semiotic/artifact"
import {
  REPLAY_DATES,
  SERVICE_SYSTEMS,
  SERVICE_SYSTEM_IDS,
  SOURCE_MANIFEST,
  deriveSnapshot,
  pulseSeriesFor,
} from "./livingLedgerData"
import { buildLivingLedgerArtifact, inspectLivingLedgerArtifact } from "./livingLedgerArtifact"

function recordFor(systemId, dayIndex = 179) {
  const snapshot = deriveSnapshot(dayIndex)
  const system = snapshot.systems.find((candidate) => candidate.id === systemId)
  const pulse = pulseSeriesFor(systemId, dayIndex)
  return buildLivingLedgerArtifact({
    system,
    pulse,
    thresholds: pulse.thresholds,
    events: snapshot.events,
    manifest: SOURCE_MANIFEST,
    replayDate: REPLAY_DATES[dayIndex],
    dayIndex,
  })
}

describe("Living Ledger Artifact Contract", () => {
  it("keeps every selected service system serializable and valid", () => {
    for (const system of SERVICE_SYSTEMS) {
      const { contract } = recordFor(system.id)
      expect(validateArtifactContract(contract), system.id).toMatchObject({
        valid: true,
        errors: [],
      })
      expect(
        auditClaims(contract).findings.filter(({ status }) => status === "fail"),
        system.id,
      ).toEqual([])
      expect(
        auditTemporalContext(contract.time, {
          referenceTime: "2026-07-12T00:00:00.000Z",
        }).findings.filter(({ status }) => status === "fail"),
        system.id,
      ).toEqual([])
      expect(JSON.parse(JSON.stringify(contract)), system.id).toEqual(contract)
    }
  })

  it("builds a deterministic, valid record from the selected replay state", () => {
    const first = recordFor(SERVICE_SYSTEM_IDS.coral)
    const second = recordFor(SERVICE_SYSTEM_IDS.coral)
    const inspection = inspectLivingLedgerArtifact(first.contract)

    expect(second).toEqual(first)
    expect(validateArtifactContract(first.contract)).toMatchObject({ valid: true, errors: [] })
    expect(auditClaims(first.contract).findings.filter(({ status }) => status === "fail")).toEqual([])
    expect(
      auditTemporalContext(first.contract.time, {
        referenceTime: "2026-07-12T00:00:00.000Z",
      }).findings.filter(({ status }) => status === "fail"),
    ).toEqual([])
    expect(first.contract.artifact).toMatchObject({
      component: "LineChart",
      revision: "179",
      dataFingerprint: expect.stringMatching(/^sha256:/),
    })
    expect(inspection.claim).toMatchObject({
      status: "supported",
      evidenceIds: [inspection.transformation.id],
      scope: {
        serviceSystemId: SERVICE_SYSTEM_IDS.coral,
        serviceFailureClaim: false,
      },
    })
    expect(inspection.transformation.transformation.inputEvidenceIds.length).toBeGreaterThan(1)
    expect(inspection.sources.map(({ source }) => source.name)).toContain(
      "NOAA Coral Reef Watch Degree Heating Week",
    )
    expect(inspection.thresholds).toHaveLength(1)
    expect(first.grounding).toMatchObject({
      channel: "screen-reader",
      claims: [expect.objectContaining({ id: inspection.claim.id })],
      time: expect.objectContaining({ snapshotAt: "2026-07-12T00:00:00.000Z" }),
    })
  })

  it("keeps claim, transformation, clock, and uncertainty recoverable without chart pixels", () => {
    const { contract } = recordFor(SERVICE_SYSTEM_IDS.pollination)
    const inspection = inspectLivingLedgerArtifact(contract)

    expect(inspection.claim.text).toContain("modeled crop demand")
    expect(inspection.transformation).toMatchObject({
      role: "transformation",
      label: "Selected-system replay projection",
      transformation: {
        kind: "filter",
        description: expect.stringContaining("bounded alert rule"),
      },
    })
    expect(inspection.time).toMatchObject({
      eventTime: { field: "lastObservedAt", timezone: "UTC", granularity: "day" },
      presentation: { state: "historical", label: "Fixed replay through 2026-07-12" },
      window: { status: "settled" },
    })
    expect(inspection.uncertainty).toMatchObject({
      kind: "qualitative",
      description: expect.stringContaining("Confidence is medium"),
    })
    expect(inspection.claim.scope).toMatchObject({
      evidenceRole: "ecological-capacity",
      outcomeClaim: true,
    })
  })

  it("records a quarantined input and its accepted source correction as evidence steps", () => {
    const { contract } = recordFor(SERVICE_SYSTEM_IDS.flood)
    const inspection = inspectLivingLedgerArtifact(contract)

    expect(inspection.correctionPath.map(({ scope }) => scope.correctionStep)).toEqual([
      "quarantined-record",
      "replacement-record",
    ])
    expect(inspection.correctionPath[0].scope).toMatchObject({
      outcome: "quarantine",
      pairedEventId: "danube-discharge-90-correction",
    })
    expect(inspection.correctionPath[1].scope).toMatchObject({
      outcome: "accepted",
      pairedEventId: "danube-discharge-88-bad-unit",
    })
    expect(inspection.claimCorrections).toEqual([])
  })

  it("preserves the restricted source boundary in the portable record", () => {
    const { contract } = recordFor(SERVICE_SYSTEM_IDS.relational)
    const inspection = inspectLivingLedgerArtifact(contract)

    expect(contract.inheritance).toMatchObject({
      privacy: "restricted",
      rawDataDefault: "exclude",
    })
    expect(inspection.sources).toContainEqual(
      expect.objectContaining({
        label: "Fictional, consented community-ledger demonstration",
        scope: expect.objectContaining({ restricted: true, revocable: true }),
      }),
    )
  })
})
