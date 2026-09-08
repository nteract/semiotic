import {
  buildArtifactContract,
  buildArtifactGrounding,
  createArtifactPacket,
  fingerprintValue,
  prepareArtifactRevision,
  type ArtifactContract,
  type Claim,
} from "semiotic/artifact"
import { waterfallProps } from "./chart-config"
import {
  annualChange,
  dateName,
  monthName,
  prepareMonth,
  snapshotDigest,
  shiftMonth,
  signed,
  type JobsSnapshot,
} from "./model"

export type BriefingReading = "direction" | "size"
export function buildBriefing(
  snapshot: JobsSnapshot,
  month: string,
  asOf: string,
  reading: BriefingReading = "direction",
) {
  if (reading !== "direction" && reading !== "size")
    throw new Error("Choose a supported briefing emphasis")
  if (snapshotDigest(snapshot.vintages) !== snapshot.sourceDigest)
    throw new Error("Snapshot content does not match its source identity")
  const selected = prepareMonth(snapshot, month, asOf)
  if (!selected.latest) throw new Error("No estimate was available for this month on that date")
  const props = waterfallProps(selected)
  // October has no first estimate: a single starting level, explicitly labeled,
  // is honest; inventing a first value to fill the waterfall would not be.
  if (!selected.first)
    props.data = [{ step: "Dated estimate only", change: selected.latest.change }]
  const edition = `${asOf}-${month}-${reading === "direction" ? "v1" : "size-v1"}`
  const evidenceId = `source-${snapshot.id}-${asOf}`
  const values = [
    { key: "first", value: selected.first?.change ?? null },
    { key: "third", value: selected.third?.change ?? null },
    { key: "dated", value: selected.latest.change },
    { key: "revision", value: selected.revision },
    { key: "annual-2025", value: annualChange(snapshot, 2025, asOf) },
  ]
  const bindings = (["first", "third", "latest"] as const).flatMap((kind) => {
    const value = selected[kind]
    if (!value) return []
    const rowId = (referenceMonth: string) =>
      `CES0000000001:${value.releaseDate}:${referenceMonth}:employment-level`
    return [
      {
        target: `selected.${kind}.change`,
        operation: "within-vintage-difference",
        sourceFile: value.file,
        sourceRows: [rowId(month), rowId(shiftMonth(month, -1))],
        inputValues: [value.level, value.previousLevel],
        sourceUnit: "thousand jobs",
        multiplier: 1000,
        resultUnit: "jobs",
        expected: value.change,
        tolerance: 0,
        eligibility:
          "Both levels must exist in the same dated export; missing values are never zero-filled.",
        releaseDate: value.releaseDate,
        referenceMonth: month,
        claimId: `estimate-${edition}`,
        rounding: "Integer jobs; no additional rounding.",
      },
    ]
  })
  const claims: Claim[] = [
    { id: `estimate-${edition}`, text: selected.summary, kind: "observation", status: "supported" },
    {
      id: `interpretation-${edition}`,
      text:
        reading === "size"
          ? selected.revision === null
            ? "The revision's size cannot be assessed because the first estimate is unavailable."
            : `The estimate moved ${signed(selected.revision)} jobs between the first and named dated release.`
          : selected.reversal
            ? "The estimated monthly change switched sign between the first and named dated estimate. This alone does not establish a recession or a cause."
            : selected.first
              ? "The first and named dated estimate do not show a strict sign reversal."
              : "A first-to-later reversal cannot be assessed because the first estimate is unavailable.",
      kind: "inference",
      status: "supported",
    },
  ].map((claim) => ({
    ...claim,
    kind: claim.kind as Claim["kind"],
    status: "supported",
    evidenceIds: [evidenceId],
    scope: {
      unit: "jobs",
      coverage: monthName(month),
      metric: "Seasonally adjusted U.S. nonfarm payroll employment change",
    },
    authoredBy: { kind: "system", name: "Deterministic jobs-briefing adapter" },
    review: { status: "proposed" },
    asOf,
  }))
  const contract = buildArtifactContract("WaterfallChart", props, {
    id: `jobs-report-${month}`,
    revision: edition,
    kind: "chart",
    title: props.title,
    intents: ["comparison"],
    purpose: {
      stakes: "informational",
      communicativeAct: "Compare successive estimates of one employment month.",
      prohibitedUses: ["Investment advice", "A causal or recession claim from a revision alone"],
    },
    claims,
    evidence: [
      {
        id: evidenceId,
        role: "source-data",
        label: "BLS CES via dated ALFRED exports",
        source: {
          uri: "https://alfred.stlouisfed.org/series?seid=PAYEMS",
          version: asOf,
          retrievedAt: snapshot.capturedAt,
        },
        fingerprint: snapshot.sourceDigest,
        dataVersion: snapshot.id,
      },
    ],
    time: {
      observedAt: asOf,
      snapshotAt: snapshot.capturedAt,
      freshness: {
        status: "fresh",
        checkedAt: snapshot.capturedAt,
        basis:
          "Pinned historical vintage checked on retrieval; not a claim of current labor-market conditions.",
      },
      presentation: { state: "historical", label: `Estimates published by ${dateName(asOf)}` },
      completeness: {
        status: "provisional",
        basis: "Employment estimates remain revisable; October 2025 has no first estimate.",
      },
      revision: { status: "original" },
      snapshot: { id: snapshot.id, format: "other" },
    },
    reception: {
      channels: [{ channel: "visual" }, { channel: "screen-reader" }, { channel: "agent" }],
      description: props.description,
      dataFallback: true,
    },
    form: {
      chartFamily: "waterfall",
      whyThisForm:
        "Floating signed revisions show how the running estimate changes; exact labeled estimates travel alongside.",
    },
    contestability: { sourceRequestsAllowed: true, corrections: [] },
    accountability: {
      authors: [{ kind: "system", name: "Semiotic jobs-briefing adapter" }],
      reviews: [{ id: "editorial-review", status: "pending" }],
    },
    inheritance: {
      privacy: "public",
      rawDataDefault: "exclude",
      preservation: "claim-evidence-preserved",
      requiredPaths: ["claims", "evidence", "time", "accountability"],
    },
    fieldStatus: {
      "accountability.reviews": {
        status: "manual",
        suppliedBy: "system",
        reason:
          "No human editorial approval is recorded. Inspect the dates, prose, chart and source exception.",
      },
    },
  })
  return {
    schemaVersion: 1 as const,
    edition,
    sourceId: snapshot.id,
    sourceDigest: snapshot.sourceDigest,
    month,
    asOf,
    selected,
    values,
    bindings,
    reading,
    component: "WaterfallChart" as const,
    props,
    contract,
    sourceException:
      "ALFRED dated CSVs substitute for the inaccessible BLS workbook. Independent BLS release-table checks are supplied; workbook-cell admission remains pending.",
  }
}
export type Briefing = ReturnType<typeof buildBriefing>
export function handoff(briefing: Briefing) {
  const packet = {
    ...briefing,
    artifact: createArtifactPacket(briefing.contract, {
      format: "static-package",
      includeEvidenceSamples: false,
    }),
    grounding: buildArtifactGrounding(briefing.component, briefing.props, briefing.contract, {
      channel: "agent",
    }),
    publication: {
      status: "conditional",
      publishable: false,
      reason: "Requires source-exception and editorial review; a completed export is not approval.",
    },
  }
  // The wire packet is JSON. Grounding can contain optional undefined fields;
  // remove those before fingerprinting so serialization cannot change identity.
  return JSON.parse(JSON.stringify(packet)) as typeof packet
}
export function compareBriefings(before: Briefing, after: Briefing, reason = "source-update") {
  if (before.month !== after.month) throw new Error("Compare the same reference month")
  if (!["source-update", "editorial-interpretation"].includes(reason))
    throw new Error("Name a supported revision reason")
  const sourceChanged = before.asOf !== after.asOf || before.sourceDigest !== after.sourceDigest
  if (sourceChanged && reason !== "source-update")
    throw new Error("Changed evidence requires a source-update reason")
  if (sourceChanged && after.asOf < before.asOf)
    throw new Error("A source update must not move the publication vintage backward")
  if (!sourceChanged && reason !== "editorial-interpretation")
    throw new Error("Unchanged evidence requires an editorial-interpretation reason")
  if (before.edition === after.edition) throw new Error("A revision needs a distinct edition")
  const changed = after.values.filter(
    (row) => row.value !== before.values.find((old) => old.key === row.key)?.value,
  )
  const revised = prepareArtifactRevision(before.component, before.props, before.contract, {
    revision: after.edition,
    data: after.props.data,
    propUpdates: after.props,
    evidence: [...before.contract.evidence, ...after.contract.evidence].filter(
      (entry, index, all) => all.findIndex((other) => other.id === entry.id) === index,
    ),
    presentation: {
      title: after.props.title,
      description: after.props.description,
      summary: after.props.summary,
    },
    time: {
      ...after.contract.time,
      revision: {
        status: "corrected",
        correctionId: `revision-${after.edition}-0`,
        reason: sourceChanged
          ? "A later statistical vintage revises the estimate; this is not a claim of a publication error."
          : "An editorial interpretation was amended without a source change.",
      },
    },
    claimTransitions: before.contract.claims.map((claim, index) => ({
      action: "supersede" as const,
      previousClaimId: claim.id,
      replacement: after.contract.claims[index],
      correction: {
        id: `revision-${after.edition}-${index}`,
        reason,
        createdBy: { kind: "system" as const, name: "Jobs edition comparison" },
      },
    })),
    policy: "exploratory",
    now: after.asOf,
    recommendRepresentation: false,
    groundingChannels: ["agent"],
  })
  return {
    reason,
    reasons: [
      ...(sourceChanged ? ["source-update"] : []),
      ...(before.reading !== after.reading ? ["editorial-interpretation"] : []),
    ],
    before: before.edition,
    after: after.edition,
    changed,
    affectedClaims: revised.changedClaimIds,
    previousClaims: before.contract.claims,
    nextClaims: after.contract.claims,
    contract: revised.contract,
    grounding: revised.grounding,
    previousReviewApplies: false,
    publicationStatus: "conditional",
  }
}
export function verifyBriefing(snapshot: JobsSnapshot, briefing: Briefing) {
  const expected = buildBriefing(snapshot, briefing.month, briefing.asOf, briefing.reading)
  // Recompute the whole authored product, including its prose and value bindings.
  // A checksum copied from another packet cannot authorize different data.
  if (fingerprintValue(expected).fingerprint !== fingerprintValue(briefing).fingerprint)
    throw new Error("Briefing source, values, configuration or claims do not reproduce")
}
export function verifyHandoff(snapshot: JobsSnapshot, value: unknown): Briefing {
  if (!value || typeof value !== "object") throw new Error("Expected a briefing packet")
  const {
    artifact: _artifact,
    grounding: _grounding,
    publication: _publication,
    ...briefing
  } = value as ReturnType<typeof handoff>
  verifyBriefing(snapshot, briefing)
  if (fingerprintValue(handoff(briefing)).fingerprint !== fingerprintValue(value).fingerprint)
    throw new Error("The artifact, grounding or publication status does not reproduce")
  return briefing
}
export function activeContract(contract: ArtifactContract) {
  return contract.claims.filter(({ status }) => status !== "superseded" && status !== "retracted")
}
