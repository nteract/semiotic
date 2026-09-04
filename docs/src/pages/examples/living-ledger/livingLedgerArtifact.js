import {
  boundedEvidenceSample,
  buildArtifactContract,
  buildArtifactGrounding,
  fingerprintValue,
} from "semiotic/artifact"

function stablePart(value) {
  return (
    String(value)
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "artifact"
  )
}

function sourceIdsFor(system, pulse, events) {
  const ids = new Set()
  const estimates = [
    system?.ecosystemCondition,
    ...Object.values(system?.eesv ?? {}),
    system?.risk?.exposure,
    system?.risk?.velocity,
  ].filter(Boolean)

  for (const estimate of estimates) {
    for (const sourceId of estimate.sourceIds ?? []) ids.add(sourceId)
  }
  for (const point of pulse?.points ?? []) {
    for (const sourceId of point.sourceIds ?? []) ids.add(sourceId)
  }
  for (const event of events ?? []) {
    if (event.serviceSystemId === system?.id && event.sourceId) ids.add(event.sourceId)
  }
  return ids
}

function sourceEvidenceId(sourceId) {
  return `source.${sourceId}`
}

function selectedSources(system, pulse, events, manifest) {
  const sourceIds = sourceIdsFor(system, pulse, events)
  return (manifest?.sources ?? []).filter((source) => sourceIds.has(source.id))
}

function evidenceForSource(source, manifest) {
  return {
    id: sourceEvidenceId(source.id),
    role: source.url ? "external-source" : "source-data",
    label: source.name ?? source.id,
    source: {
      name: source.name ?? source.id,
      ...(source.url ? { uri: source.url } : {}),
      version: manifest.snapshot,
      retrievedAt: manifest.generatedAt,
    },
    fingerprint: fingerprintValue(source).fingerprint,
    dataVersion: manifest.snapshot,
    observedAt: manifest.generatedAt,
    scope: {
      sourceId: source.id,
      sourceType: source.sourceType ?? "not supplied",
      cadence: source.cadence ?? "bundled snapshot",
      evidenceRoles: source.evidenceRoles ?? [],
      replayValueStatus: source.valuesInReplay ?? "not supplied",
      restricted: source.restricted === true,
      revocable: source.revocable === true,
    },
    relationship: "descriptive",
  }
}

function evidenceForThreshold(threshold, artifactId, observedAt) {
  return {
    id: `${artifactId}.threshold.${stablePart(threshold.id)}`,
    role: "policy-rule",
    label: threshold.label ?? threshold.id,
    source: {
      name: threshold.provenance?.authority ?? "Living Ledger threshold registry",
      ...(threshold.provenance?.url ? { uri: threshold.provenance.url } : {}),
      ...(threshold.provenance?.effectiveDate
        ? { version: threshold.provenance.effectiveDate }
        : {}),
    },
    fingerprint: fingerprintValue(threshold).fingerprint,
    dataVersion: threshold.provenance?.effectiveDate ?? "bundled-threshold",
    observedAt,
    scope: {
      thresholdId: threshold.id,
      spatialScope: threshold.scope?.spatialScope ?? "local",
      temporalAggregation: threshold.scope?.temporalAggregation ?? "not supplied",
      nonTransferable: threshold.provenance?.nonTransferable !== false,
      levels: (threshold.levels ?? []).map((level) => ({
        level: level.level,
        value: level.value,
        persistence: level.persistence,
      })),
    },
    relationship: "descriptive",
  }
}

function correctionEventsFor(system, events) {
  const selected = (events ?? []).filter((event) => event.serviceSystemId === system?.id)
  if (!selected.some((event) => /correction/i.test(`${event.id} ${event.label ?? ""}`))) {
    return []
  }
  return selected.filter((event) =>
    /correction|bad-unit/i.test(`${event.id} ${event.label ?? ""}`),
  )
}

function evidenceForCorrection(event, artifactId, pairedEvent) {
  const replacement = /correction/i.test(`${event.id} ${event.label ?? ""}`)
  return {
    id: `${artifactId}.quality.${stablePart(event.id)}`,
    role: "quality-check",
    label: replacement
      ? `Accepted correction: ${event.label ?? event.id}`
      : `Quarantined record: ${event.label ?? event.id}`,
    source: {
      name: event.sourceId ?? "Source not supplied",
      ...(event.arrivedAt ? { retrievedAt: event.arrivedAt } : {}),
    },
    fingerprint: fingerprintValue(event).fingerprint,
    observedAt: event.observedAt,
    scope: {
      eventId: event.id,
      sourceId: event.sourceId ?? "not supplied",
      outcome: event.outcome ?? event.pipelineStatus ?? "not supplied",
      correctionStep: replacement ? "replacement-record" : "quarantined-record",
      pairedEventId: pairedEvent?.id ?? "not supplied",
    },
    relationship: "descriptive",
  }
}

function claimKind(system) {
  if (system?.alert?.warningKind === "forecast-crossing") return "forecast"
  if (
    system?.alert?.outcomeClaim === true ||
    ["modeled-gap", "trend-change"].includes(system?.alert?.warningKind)
  ) {
    return "inference"
  }
  return "observation"
}

function freshnessStatus(system) {
  if (system?.freshness === "current") return "fresh"
  if (system?.freshness === "unknown") return "unknown"
  return "stale"
}

function claimScope(system, pulse, replayDate) {
  const kind = claimKind(system)
  return {
    serviceSystemId: system.id,
    bioregion: system.bioregionName ?? system.bioregionId ?? "not supplied",
    indicatorId: pulse.indicatorId,
    evidenceRole: system.alert?.evidenceRole ?? pulse.evidenceRole,
    signalKind: system.alert?.warningKind ?? "none",
    alertLevel: system.alert?.level ?? "Observe",
    confidence: system.risk?.confidence ?? system.alert?.confidence ?? "unknown",
    freshness: system.freshness ?? "unknown",
    denominator: "the selected service system within this authored replay",
    serviceFailureClaim: system.alert?.serviceFailure === true,
    outcomeClaim: system.alert?.outcomeClaim === true,
    ...(kind === "forecast"
      ? {
          observedRange: `Replay observations through ${replayDate}`,
          projectedRange: `The 14 days following ${replayDate}`,
        }
      : {}),
  }
}

/**
 * Build the selected evidence pulse's portable interpretation record from the
 * same deterministic replay values used by the visible charts.
 */
export function buildLivingLedgerArtifact({
  system,
  pulse,
  thresholds = [],
  events = [],
  manifest,
  replayDate,
  dayIndex,
}) {
  if (!system?.id || !pulse?.points || !manifest?.snapshot || !replayDate) {
    throw new Error("A system, pulse, source manifest, and replay date are required.")
  }

  const artifactId = `living-ledger-${stablePart(system.id)}-day-${String(dayIndex).padStart(3, "0")}`
  const claimId = `${artifactId}.claim`
  const transformationId = `${artifactId}.selected-snapshot`
  const snapshotAt = system.timestamp ?? `${replayDate}T00:00:00.000Z`
  const portablePoints = fingerprintValue(pulse.points).value
  const sources = selectedSources(system, pulse, events, manifest)
  const sourceEvidence = sources.map((source) => evidenceForSource(source, manifest))
  const thresholdEvidence = thresholds.map((threshold) =>
    evidenceForThreshold(threshold, artifactId, snapshotAt),
  )
  const correctionEvents = correctionEventsFor(system, events)
  const correctionEvidence = correctionEvents.map((event) =>
    evidenceForCorrection(
      event,
      artifactId,
      correctionEvents.find((candidate) => candidate.id !== event.id),
    ),
  )
  const inputEvidenceIds = [
    ...sourceEvidence.map(({ id }) => id),
    ...thresholdEvidence.map(({ id }) => id),
    ...correctionEvidence.map(({ id }) => id),
  ]
  const claimText =
    system.alert?.claim ?? "The selected replay has not supplied an artifact-level claim."
  const uncertainty = [
    system.alert?.caution,
    `Confidence is ${system.risk?.confidence ?? system.alert?.confidence ?? "unknown"}; evidence freshness is ${system.freshness ?? "unknown"}.`,
  ]
    .filter(Boolean)
    .join(" ")
  const transformationEvidence = {
    id: transformationId,
    role: "transformation",
    label: "Selected-system replay projection",
    fingerprint: fingerprintValue({
      system,
      points: pulse.points,
      thresholds,
      correctionEvents,
    }).fingerprint,
    dataVersion: `${manifest.snapshot}:day-${String(dayIndex).padStart(3, "0")}`,
    observedAt: snapshotAt,
    scope: {
      serviceSystemId: system.id,
      replayDate,
      recordCount: pulse.points.length,
      sourceCount: sources.length,
      valuesAreIllustrative: manifest.valuesAreIllustrative === true,
    },
    sample: boundedEvidenceSample(portablePoints, { maxRows: 3 }),
    transformation: {
      id: transformationId,
      kind: "filter",
      description:
        "Filter the fixed teaching replay to one service system and replay date, then apply the system's bounded alert rule without promoting a pressure, forecast, or model into an observed outcome.",
      inputEvidenceIds,
      parameters: {
        systemId: system.id,
        replayDay: dayIndex,
        indicatorId: pulse.indicatorId,
        alertKind: system.alert?.warningKind ?? "none",
        alertLevel: system.alert?.level ?? "Observe",
      },
      assumptions: [
        manifest.notice,
        "The evidence boundary is the selected system and date; it is not a global ecological score.",
      ],
      implementation: "docs/src/pages/examples/living-ledger/livingLedgerData.js",
      performedAt: snapshotAt,
      performedBy: { kind: "system", name: "Living Ledger deterministic replay" },
    },
    generatedClaimId: claimId,
    relationship: "descriptive",
  }
  const props = {
    data: portablePoints,
    xAccessor: "timestamp",
    yAccessor: "value",
    title: `${system.shortName ?? system.name ?? system.id} evidence pulse`,
    description: claimText,
    summary: uncertainty,
    accessibleTable: true,
  }

  const contract = buildArtifactContract("LineChart", props, {
    id: artifactId,
    kind: "chart",
    title: props.title,
    createdAt: manifest.generatedAt,
    revision: String(dayIndex),
    intents: "trend",
    purpose: {
      communicativeAct:
        "Explain the selected service-system signal while preserving its evidence boundary and uncertainty.",
      decisionContext: "Interactive documentation and replay inspection",
      stakes: "informational",
      allowedUses: ["Inspect how the authored replay supports the selected bounded claim"],
      prohibitedUses: [
        "Treat authored replay values as current observations",
        "Infer global ecological condition from one service system",
        "Promote a pressure, forecast, or modeled link into a confirmed service failure",
      ],
    },
    claims: [
      {
        id: claimId,
        text: claimText,
        kind: claimKind(system),
        status: "supported",
        evidenceIds: [transformationId],
        scope: claimScope(system, pulse, replayDate),
        uncertainty: { kind: "qualitative", description: uncertainty },
        asOf: system.lastObservedAt ?? snapshotAt,
        authoredBy: { kind: "system", name: "Living Ledger deterministic replay" },
        tags: ["selected-service-system", stablePart(system.alert?.warningKind ?? "observe")],
      },
    ],
    evidence: [...sourceEvidence, ...thresholdEvidence, ...correctionEvidence, transformationEvidence],
    time: {
      eventTime: {
        field: "lastObservedAt",
        value: system.lastObservedAt ?? snapshotAt,
        timezone: "UTC",
        granularity: "day",
      },
      observedAt: system.lastObservedAt ?? snapshotAt,
      processedAt: snapshotAt,
      publishedAt: system.alert?.updatedAt ?? snapshotAt,
      snapshotAt,
      presentation: { state: "historical", label: `Fixed replay through ${replayDate}` },
      freshness: {
        status: freshnessStatus(system),
        checkedAt: snapshotAt,
        basis: `The selected source state is ${system.freshness ?? "unknown"} within the fixed replay.`,
      },
      window: {
        start: `${manifest.replayWindow.start}T00:00:00.000Z`,
        end: snapshotAt,
        status: "settled",
      },
      completeness: {
        status: "settled",
        basis: "Complete for the selected system and date in the authored replay fixture.",
      },
      revision: { status: "original" },
      sources: sources.map((source) => ({
        id: sourceEvidenceId(source.id),
        kind: "snapshot",
        label: source.name ?? source.id,
        observedAt: system.lastObservedAt ?? snapshotAt,
        version: manifest.snapshot,
        timezone: "UTC",
        granularity: "day",
        freshness: freshnessStatus(system),
        completeness: "settled",
      })),
    },
    reception: {
      channels: [
        { channel: "visual", disclosure: "standard", navigation: true },
        { channel: "screen-reader", disclosure: "detailed", navigation: true },
        { channel: "agent", disclosure: "detailed", rawData: "bounded" },
      ],
      audience: "Readers learning to inspect ecosystem-service evidence",
      strengths: ["The visible claim and inspection panel read from the same contract."],
      risks: ["Alert color can be mistaken for a complete ecological assessment."],
      scaffolds: [
        "The panel exposes the claim, transformation, clock, uncertainty, and source path in text.",
      ],
      description: claimText,
      dataFallback: true,
      manualChecks: ["Confirm that the bounded wording remains appropriate for the audience."],
    },
    form: {
      chartFamily: "xy",
      whyThisForm:
        "A time series keeps observations, modeled points, uncertainty, reference bands, and gaps distinct.",
      rejectedAlternatives: [
        {
          representation: "Single status score",
          reason: "One score would erase source roles, time, and non-comparable dimensions.",
        },
      ],
      risks: ["A connected line can imply continuity between authored replay observations."],
      misuse: ["Do not interpret the alert level as a global rank."],
    },
    contestability: {
      sourceRequestsAllowed: true,
      alternativeViews: [
        {
          id: `${artifactId}.table`,
          label: "Service-system table",
          rationale: "Use the table when exact values and text are more important than trajectory.",
        },
      ],
    },
    accountability: {
      authors: [{ kind: "system", name: "Semiotic documentation fixture" }],
      generatedBy: "Living Ledger deterministic replay",
      dataSources: sources.map((source) => source.name ?? source.id),
      codeRef: "docs/src/pages/examples/living-ledger/livingLedgerArtifact.js",
    },
    inheritance: {
      requiredPaths: ["purpose", "claims", "evidence", "time", "contestability"],
      privacy: sources.some((source) => source.restricted) ? "restricted" : "public",
      rawDataDefault: "exclude",
      preservation: "full-fidelity",
    },
    fieldStatus: {
      "accountability.review": {
        status: "manual",
        reason: "This teaching replay does not assert an external editorial review.",
        suppliedBy: "system",
        derived: true,
      },
    },
  })

  return {
    contract,
    grounding: buildArtifactGrounding("LineChart", props, contract, {
      channel: "screen-reader",
      disclosureLevel: "detailed",
      includeRawData: false,
    }),
  }
}

/** Read the selected claim and its complete evidence path without chart pixels. */
export function inspectLivingLedgerArtifact(contract) {
  const claim = contract?.claims?.find(({ status }) => status !== "retracted")
  const evidence = contract?.evidence ?? []
  const transformation = evidence.find(
    (item) => item.role === "transformation" && item.generatedClaimId === claim?.id,
  )
  return {
    claim,
    transformation,
    sources: evidence.filter((item) => ["source-data", "external-source"].includes(item.role)),
    thresholds: evidence.filter((item) => item.role === "policy-rule"),
    correctionPath: evidence.filter((item) => item.role === "quality-check"),
    claimCorrections: contract?.contestability?.corrections ?? [],
    time: contract?.time,
    uncertainty: claim?.uncertainty,
  }
}
