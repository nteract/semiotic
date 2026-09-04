import {
  boundedEvidenceSample,
  buildArtifactContract,
  claimsFromDescription,
  createArtifactPacket,
  diffArtifactContracts,
  fingerprintValue,
  prepareArtifactRevision,
} from "semiotic/artifact"
import {
  WORLD_COUNTRIES,
  WORLD_DATA_RETRIEVED,
  WORLD_DATA_SOURCE,
  WORLD_DATA_SOURCE_URL,
  WORLD_LATEST_YEAR,
  WORLD_OBSERVATIONS,
  WORLD_YEAR_RANGE,
} from "../data/worldDevelopment"

export const MACHINE_ARTIFACT_RETRIEVED_AT = `${WORLD_DATA_RETRIEVED}T00:00:00.000Z`
export const MACHINE_ARTIFACT_AS_OF = `${WORLD_LATEST_YEAR}-12-31T23:59:59.000Z`

function stablePart(value) {
  return (
    String(value)
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "chart"
  )
}

function questionWindow(questionId) {
  const spansHistory = questionId === "trend" || questionId === "distribution"
  const firstYear = spansHistory ? WORLD_YEAR_RANGE[0] : WORLD_LATEST_YEAR
  return {
    firstYear,
    lastYear: WORLD_LATEST_YEAR,
    start: `${firstYear}-01-01T00:00:00.000Z`,
    end: MACHINE_ARTIFACT_AS_OF,
  }
}

function alternativesFor(active, suggestions) {
  return (suggestions ?? [])
    .filter(
      (candidate) =>
        candidate.component !== active.component || candidate.variant?.key !== active.variant?.key,
    )
    .slice(0, 3)
    .map((candidate, index) => ({
      id: `alternative-${index + 1}-${stablePart(candidate.component)}`,
      label: candidate.displayName || candidate.component,
      rationale:
        candidate.reasons?.[0] ||
        candidate.caveats?.[0] ||
        "This form remains available when the reader's task changes.",
    }))
}

function representedCountryCount(questionId, rows) {
  const namedCountries = new Set(rows.map((row) => row?.country).filter(Boolean))
  if (namedCountries.size > 0) return namedCountries.size
  if (questionId === "trend") return rows.length > 0 ? 1 : 0
  if (questionId === "composition") return WORLD_COUNTRIES.length
  return 0
}

function chartSelectionMode(active, suggestions) {
  const first = suggestions?.[0]
  if (!first) return "active-selection"
  return first.component === active.component && first.variant?.key === active.variant?.key
    ? "ranked-default"
    : "reader-override"
}

/**
 * Build the example's inspectable sidecar from the same deterministic inputs
 * that produced the visible chart. The first contract deliberately includes
 * an over-broad scope claim; the returned revision preserves and corrects it.
 */
export function buildMachineArtifactRecord({
  active,
  data,
  description,
  enrichedProps,
  question,
  suggestions,
}) {
  if (!active || !description || !enrichedProps || !question) return null

  const rows = Array.isArray(data) ? data : []
  const artifactId = `machine-sees-${stablePart(question.id)}-${stablePart(active.component)}`
  const sourceEvidenceId = `${artifactId}.source`
  const transformEvidenceId = `${artifactId}.transform`
  const previousClaimId = `${artifactId}.scope.v1`
  const replacementClaimId = `${artifactId}.scope.v2`
  const window = questionWindow(question.id)
  const sourceFingerprint = fingerprintValue(WORLD_OBSERVATIONS).fingerprint
  const viewFingerprint = fingerprintValue(rows).fingerprint
  const representedCountries = representedCountryCount(question.id, rows)
  const selectionMode = chartSelectionMode(active, suggestions)
  const alternativeViews = alternativesFor(active, suggestions)

  const evidence = [
    {
      id: sourceEvidenceId,
      role: "source-data",
      label: "Canonical World Bank documentation fixture",
      source: {
        name: WORLD_DATA_SOURCE,
        uri: WORLD_DATA_SOURCE_URL,
        version: `${WORLD_YEAR_RANGE[0]}-${WORLD_LATEST_YEAR}`,
        retrievedAt: MACHINE_ARTIFACT_RETRIEVED_AT,
        publisher: "World Bank",
      },
      fingerprint: sourceFingerprint,
      dataVersion: `wdi-selected-countries-${WORLD_DATA_RETRIEVED}`,
      observedAt: MACHINE_ARTIFACT_AS_OF,
      scope: {
        sourceFixtureCountryCount: WORLD_COUNTRIES.length,
        firstYear: WORLD_YEAR_RANGE[0],
        lastYear: WORLD_LATEST_YEAR,
        recordCount: WORLD_OBSERVATIONS.length,
      },
      sample: boundedEvidenceSample(WORLD_OBSERVATIONS, { maxRows: 3 }),
      relationship: "descriptive",
    },
    {
      id: transformEvidenceId,
      role: "transformation",
      label: "Question-specific projected rows",
      fingerprint: viewFingerprint,
      observedAt: MACHINE_ARTIFACT_RETRIEVED_AT,
      scope: {
        representedCountryCount: representedCountries,
        sourceFixtureCountryCount: WORLD_COUNTRIES.length,
        firstYear: window.firstYear,
        lastYear: window.lastYear,
        projectedRecordCount: rows.length,
      },
      sample: boundedEvidenceSample(rows, { maxRows: 3 }),
      relationship: question.id === "correlation" ? "correlational" : "descriptive",
      transformation: {
        id: `${artifactId}.view-builder`,
        kind: question.id === "composition" ? "aggregation" : "filter",
        description:
          "The example selects and projects rows for the active question. Artifact identity separately fingerprints the active chart configuration, including a reader override when one is selected.",
        inputEvidenceIds: [sourceEvidenceId],
        parameters: {
          chartComponent: active.component,
          chartSelection: selectionMode,
          intent: question.intent,
          questionId: question.id,
          recordCount: rows.length,
          representedCountryCount: representedCountries,
        },
        assumptions: [
          "The selected sixteen-country fixture is illustrative, not a complete census of countries.",
          "The generated description is limited to the visible configuration and supplied rows.",
        ],
        implementation: "docs/src/pages/examples/WhatTheMachineSeesExamplePage.jsx",
        performedAt: MACHINE_ARTIFACT_RETRIEVED_AT,
        performedBy: {
          kind: "system",
          name: "Semiotic deterministic chart pipeline",
        },
      },
    },
  ]

  const generatedClaims = claimsFromDescription(description, {
    prefix: `${artifactId}.description`,
    evidenceIds: {
      l1: [transformEvidenceId],
      l2: [transformEvidenceId],
      l3: [transformEvidenceId],
    },
    asOf: MACHINE_ARTIFACT_AS_OF,
    authoredBy: {
      kind: "system",
      name: "Semiotic deterministic description",
    },
  })
    .filter((claim) => !claim.tags?.includes("l4"))
    .map((claim) => ({
      ...claim,
      uncertainty: {
        kind: "qualitative",
        description:
          "This statement describes the selected records; no sampling interval or causal estimate is claimed.",
      },
    }))

  const previousContract = buildArtifactContract(
    active.component,
    { ...enrichedProps, data: rows },
    {
      id: `${artifactId}-draft`,
      title: question.question,
      createdAt: MACHINE_ARTIFACT_RETRIEVED_AT,
      revision: "1",
      intents: question.intent,
      purpose: {
        communicativeAct:
          description.levels?.l4 || `Help a reader investigate ${question.question.toLowerCase()}`,
        decisionContext: "Interactive documentation and chart-form exploration",
        stakes: "informational",
        allowedUses: ["Explore the selected historical records", "Compare available chart forms"],
        prohibitedUses: [
          "Treat the selected-country fixture as complete global coverage",
          "Use the chart alone for an operational decision",
        ],
      },
      claims: [
        {
          id: previousClaimId,
          text: "This view describes global development conditions.",
          kind: "description",
          status: "provisional",
          evidenceIds: [sourceEvidenceId],
          asOf: MACHINE_ARTIFACT_AS_OF,
          authoredBy: {
            kind: "system",
            name: "Semiotic documentation fixture",
          },
          uncertainty: {
            kind: "unknown",
            description: "The geographic scope was not stated precisely.",
          },
          tags: ["scope"],
        },
        ...generatedClaims,
      ],
      evidence,
      time: {
        eventTime: {
          field: "year",
          timezone: "UTC",
          granularity: "year",
        },
        observedAt: MACHINE_ARTIFACT_AS_OF,
        processedAt: MACHINE_ARTIFACT_RETRIEVED_AT,
        snapshotAt: MACHINE_ARTIFACT_RETRIEVED_AT,
        presentation: {
          state: "historical",
          label: `Historical ${window.firstYear}-${window.lastYear} source window`,
        },
        freshness: {
          status: "stale",
          checkedAt: MACHINE_ARTIFACT_RETRIEVED_AT,
          basis: "This is a fixed historical documentation snapshot, not a live feed.",
        },
        window: {
          start: window.start,
          end: window.end,
          status: "settled",
        },
        completeness: {
          status: "settled",
          basis: "Complete for the records deliberately selected by this fixture.",
        },
        revision: {
          status: "original",
        },
        sources: [
          {
            id: sourceEvidenceId,
            kind: "snapshot",
            label: WORLD_DATA_SOURCE,
            observedAt: MACHINE_ARTIFACT_AS_OF,
            version: `${WORLD_YEAR_RANGE[0]}-${WORLD_LATEST_YEAR}`,
            timezone: "UTC",
            granularity: "year",
            freshness: "stale",
            completeness: "settled",
          },
        ],
      },
      reception: {
        channels: [
          { channel: "visual", disclosure: "standard", navigation: true },
          {
            channel: "screen-reader",
            disclosure: "detailed",
            navigation: true,
          },
          {
            channel: "agent",
            disclosure: "detailed",
            rawData: "bounded",
          },
        ],
        audience: "People evaluating how deterministic chart assistance works",
        strengths: [
          "The visible chart, generated description, and structured navigation share one input.",
        ],
        risks: ["A chart title can sound broader than the selected-country fixture actually is."],
        scaffolds: [
          "The inspector exposes claims, source identity, time, and correction history on demand.",
        ],
        description: description.text,
        dataFallback: true,
        manualChecks: [
          "Confirm that the generated wording matches the intended audience and question.",
        ],
      },
      form: {
        chartFamily: active.family,
        whyThisForm:
          active.reasons?.[0] || "The current form supports the active data shape and intent.",
        rejectedAlternatives: alternativeViews.map((view) => ({
          representation: view.label,
          reason: view.rationale,
        })),
        risks: active.caveats?.length
          ? active.caveats
          : ["The ranking can be defensible without matching every reader's preference."],
        misuse: ["Do not read visual ranking as a universal quality score."],
      },
      contestability: {
        sourceRequestsAllowed: true,
        alternativeViews,
      },
      accountability: {
        authors: [
          {
            kind: "system",
            name: "Semiotic documentation example",
          },
        ],
        generatedBy: "Deterministic Semiotic chart and description utilities",
        dataSources: [WORLD_DATA_SOURCE],
        codeRef: "docs/src/pages/examples/WhatTheMachineSeesExamplePage.jsx",
      },
      inheritance: {
        requiredPaths: ["purpose", "claims", "evidence", "time", "contestability"],
        privacy: "public",
        rawDataDefault: "exclude",
        preservation: "full-fidelity",
      },
      fieldStatus: {
        "accountability.reviews": {
          status: "manual",
          reason: "No human editorial approval is asserted by this live example.",
          suppliedBy: "system",
          derived: true,
        },
      },
    },
  )

  const correctionReason =
    "The earlier wording implied global coverage, while the fixture intentionally contains sixteen countries."
  const revision = prepareArtifactRevision(
    active.component,
    { ...enrichedProps, data: rows },
    previousContract,
    {
      artifactId,
      revision: "2",
      time: {
        window: {
          ...previousContract.time.window,
          status: "corrected",
        },
        revision: {
          status: "corrected",
          reason: correctionReason,
        },
      },
      claimTransitions: [
        {
          action: "supersede",
          previousClaimId,
          replacement: {
            id: replacementClaimId,
            text: `This view uses ${rows.length} projected records representing ${representedCountries} of ${WORLD_COUNTRIES.length} countries in the World Bank fixture; it does not represent every country worldwide.`,
            kind: "description",
            status: "supported",
            evidenceIds: [sourceEvidenceId, transformEvidenceId],
            scope: {
              representedCountryCount: representedCountries,
              sourceFixtureCountryCount: WORLD_COUNTRIES.length,
              firstYear: window.firstYear,
              lastYear: window.lastYear,
              projectedRecordCount: rows.length,
              coverage: "selected-country fixture",
            },
            uncertainty: {
              kind: "qualitative",
              description:
                "The source values are treated as reported; this example does not estimate sampling or measurement error.",
            },
            asOf: MACHINE_ARTIFACT_AS_OF,
            authoredBy: {
              kind: "system",
              name: "Semiotic documentation fixture",
            },
            tags: ["scope", "correction"],
          },
          correction: {
            id: `${artifactId}.correction.scope`,
            reason: correctionReason,
            createdAt: MACHINE_ARTIFACT_RETRIEVED_AT,
            createdBy: {
              kind: "system",
              name: "Semiotic documentation fixture",
            },
          },
        },
      ],
      groundingChannels: ["visual"],
      policy: "exploratory",
      now: MACHINE_ARTIFACT_RETRIEVED_AT,
      recommendRepresentation: false,
    },
  )
  const contract = revision.contract

  return {
    contract,
    previousContract,
    changes: diffArtifactContracts(previousContract, contract),
    packet: createArtifactPacket(contract, {
      format: "static-package",
      includeEvidenceSamples: false,
    }),
  }
}
