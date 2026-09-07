import {
  adaptHistoricalSnapshotMetadata,
  auditTemporalContext,
  buildArtifactContract,
  fingerprintValue,
  requireSerializableArtifactContract,
} from "semiotic/artifact"
import type { JsonObject } from "semiotic/artifact"
import { seasonChartProps } from "./chart-config"
import { guideSummary } from "./format"
import { prepareGuide, SCOPE } from "./prepare"
import { resolveState, STORY_URL, validateState } from "./state"
import type { GuideState, PreparedGuide, ReservoirSnapshot } from "./types"

export function numericalBindings(guide: PreparedGuide) {
  const selected = guide.reading?.eligible ? guide.reading.storageAcreFeet : null
  const base = { state: guide.state, unit: "percent", tolerance: 1e-10 }
  return [
    {
      ...base,
      id: "capacity",
      operation: "ratio-times-100",
      numerator: selected,
      denominator: guide.capacity.capacity?.acreFeet ?? null,
      expected: guide.capacity.percent,
      baseline: guide.capacity.capacity?.id ?? "unknown capacity",
      inputs: guide.reading ? [guide.reading.id] : [],
    },
    {
      ...base,
      id: "seasonal-mean",
      operation: "ratio-times-100",
      numerator: selected,
      denominator: guide.baseline.mean,
      expected: guide.baseline.percentOfMean,
      baseline: guide.state.baselineId,
      inputs: guide.baseline.samples.map((sample) => sample.rowId),
    },
    {
      ...base,
      id: "historical-percentile",
      operation: "midrank-times-100",
      numerator: guide.baseline.less + guide.baseline.equal / 2,
      denominator: guide.baseline.count,
      expected: guide.baseline.percentile,
      baseline: guide.state.baselineId,
      inputs: guide.baseline.samples.map((sample) => sample.rowId),
    },
    {
      ...base,
      id: "collection",
      operation: "ratio-of-sums-times-100",
      numerator: guide.collection.storage,
      denominator: guide.collection.capacity,
      expected: guide.collection.percent,
      baseline:
        guide.collection.mode === "dated"
          ? "dated matched capacities"
          : "2025-07-30 matched capacity references",
      inputs: guide.collection.members
        .filter((member) => guide.collection.includedIds.includes(member.reservoir.id))
        .map((member) => member.reading!.id),
    },
  ]
}

export function evaluateBindings(
  guide: PreparedGuide,
  input: ReturnType<typeof numericalBindings>,
) {
  return numericalBindings(guide)
    .map((binding) => {
      const matches = input.filter((item) => item.id === binding.id)
      if (matches.length !== 1)
        return { id: binding.id, status: "fail", reason: "Missing or duplicate numerical binding" }
      const candidate = matches[0]
      if (
        fingerprintValue({ ...binding, expected: null }).fingerprint !==
        fingerprintValue({ ...candidate, expected: null }).fingerprint
      )
        return {
          id: binding.id,
          status: "fail",
          reason: "Units, inputs, identities, formula or baseline differ",
        }
      if (binding.expected === null)
        return {
          id: binding.id,
          status: candidate.expected === null ? "unknown" : "fail",
          reason: "The required value, denominator or eligible history is unavailable",
        }
      const actual = (binding.numerator! / binding.denominator!) * 100
      return {
        id: binding.id,
        status:
          candidate.expected !== null && Math.abs(candidate.expected - actual) <= binding.tolerance
            ? "pass"
            : "fail",
        reason: "Recomputed from the declared numerator, denominator and source rows",
      }
    })
    .concat(
      input
        .filter((item) => !numericalBindings(guide).some((binding) => binding.id === item.id))
        .map((item) => ({ id: item.id, status: "fail", reason: "Unknown binding" })),
    )
}

export function buildGuidePacket(snapshot: ReservoirSnapshot, state: GuideState) {
  const guide = prepareGuide(snapshot, state)
  const bindings = numericalBindings(guide)
  const checks = evaluateBindings(guide, bindings)
  const time = adaptHistoricalSnapshotMetadata({
    id: snapshot.editionId,
    version: snapshot.editionId,
    snapshotAt: snapshot.retrievedAt,
    timezone: "Etc/GMT+8",
    granularity: "day",
    format: "other",
    schemaVersion: "1",
    freshness: {
      status: "unknown",
      basis:
        "Historical source retrieval; no live freshness or per-row publication time is claimed.",
    },
    completeness: {
      status: guide.collection.status === "complete" ? "provisional" : "partial",
      basis: "Membership is explicit. CDEC readings may be revised after this saved edition.",
    },
    presentationLabel: "Saved historical reservoir edition",
  })
  const artifact = buildArtifactContract("LineChart", seasonChartProps(guide), {
    id: "E03-reservoir-guide",
    revision: snapshot.editionId,
    createdAt: snapshot.retrievedAt,
    title: "How full is full?",
    intents: ["compare", "explain"],
    time,
    purpose: {
      allowedUses: ["Compare reported historical reservoir storage with explicit baselines"],
      prohibitedUses: [
        "Statewide drought classification",
        "Water-allocation advice",
        "Treating current reference capacity as reconstructed historical capacity",
      ],
    },
    claims: bindings.map((binding) => ({
      id: binding.id,
      kind: "aggregation",
      status: binding.expected === null ? "unknown" : "provisional",
      text: `${binding.id}: ${binding.expected ?? "unavailable"} percent`,
      evidenceIds: ["cdec-edition"],
      authoredBy: { kind: "system", id: snapshot.transformVersion },
      scope: {
        unit: binding.unit,
        baseline: binding.baseline,
        stationId: state.stationId,
        reportingDate: guide.date,
        membership: guide.collection.includedIds,
      },
    })),
    evidence: [
      {
        id: "cdec-edition",
        role: "source-data",
        fingerprint: snapshot.fingerprint,
        dataVersion: snapshot.editionId,
        source: {
          name: "California Data Exchange Center daily storage and dated capacity report",
          uri: `${STORY_URL}#sources`,
          retrievedAt: snapshot.retrievedAt,
          version: snapshot.editionId,
          publisher: "California Department of Water Resources",
        },
      },
    ],
    accountability: {
      generatedBy: snapshot.transformVersion,
      reviews: [
        {
          id: "editorial-review",
          status: "pending",
          rationale:
            "Calculation and renderer checks do not constitute independent source interpretation or reader acceptance.",
        },
      ],
    },
    extensions: {
      "semiotic.e03.guide.v1": JSON.parse(
        JSON.stringify({ state, bindings, checks, qualifications: guide.qualifications }),
      ) as JsonObject,
    },
  })
  return {
    packetVersion: 1,
    storyId: "E03",
    editionId: snapshot.editionId,
    snapshotFingerprint: snapshot.fingerprint,
    retrievedAt: snapshot.retrievedAt,
    state: guide.state,
    guide,
    bindings,
    checks,
    summary: guideSummary(guide),
    scope: SCOPE,
    artifact: requireSerializableArtifactContract(artifact),
    temporalAudit: JSON.parse(JSON.stringify(auditTemporalContext(time))) as ReturnType<
      typeof auditTemporalContext
    >,
    sources: snapshot.sources,
    omissions: [
      "This packet contains the selected two-year table, seasonal means, selected-date baseline samples and collection. Full raw history is a separate pinned download.",
      "Reader selection is preserved; this saved edition does not refresh itself.",
      "Source OBS DATE is retained as a source timestamp, not treated as a publication or revision timestamp.",
    ],
  }
}

export function importGuidePacket(input: unknown, snapshot: ReservoirSnapshot) {
  if (!input || typeof input !== "object") throw new Error("Invalid guide packet")
  const packet = input as ReturnType<typeof buildGuidePacket>
  if (packet.packetVersion !== 1 || packet.storyId !== "E03")
    throw new Error("Unsupported guide-packet version")
  const state = validateState(packet.state)
  const issue = resolveState(state, snapshot)
  if (issue) return { state, issue, guide: null }
  const expected = buildGuidePacket(snapshot, state)
  if (fingerprintValue(expected).fingerprint !== fingerprintValue(packet).fingerprint)
    throw new Error("Packet values, units, scope or evidence differ from the pinned edition")
  return { state, issue: null, guide: expected.guide }
}
