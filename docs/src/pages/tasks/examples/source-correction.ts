import {
  buildArtifactContract,
  createAdjacentArtifactSidecar,
  createArtifactPacket,
  evaluateArtifact,
  fingerprintValue,
  prepareArtifactRevision,
  validateArtifactPacket,
  type ArtifactContract,
  type Claim,
  type EvidenceRef,
  type PrepareArtifactRevisionOptions,
} from "semiotic/artifact"
import type { BarChartProps } from "semiotic/ordinal"

export const originalRows = [
  { region: "North", total: 12 },
  { region: "South", total: 30 },
  { region: "West", total: 18 },
]

export const correctedRows = [
  { region: "North", total: 12 },
  { region: "South", total: 30 },
  { region: "West", total: 36 },
]

// Fixed teaching-fixture times describe the example, not a verification run.
const originalAt = "2026-08-01T12:00:00Z"
export const correctionAt = "2026-08-02T12:00:00Z"
const reason = "The source corrected West from 18 to 36 units."

export function sourceChartProps(data = originalRows) {
  const sum = data.reduce((total, row) => total + row.total, 0)
  const largest = data.reduce((winner, row) => (row.total > winner.total ? row : winner))
  return {
    data: data.map((row) => ({ ...row })),
    categoryAccessor: "region",
    valueAccessor: "total",
    title: "Regional totals",
    description: "Three synthetic regional totals, measured in the same unit.",
    summary: `${largest.region} has the largest total: ${largest.total} units. All regions total ${sum} units.`,
    accessibleTable: true,
    height: 280,
    responsiveWidth: true,
  } satisfies BarChartProps<(typeof originalRows)[number]>
}

function sourceEvidence(revision: "1" | "2"): EvidenceRef {
  return {
    id: `regional-source-v${revision}`,
    role: "source-data",
    label: `Synthetic regional totals, revision ${revision}`,
    source: { name: "Authored teaching fixture", version: revision },
    dataVersion: revision,
    fingerprint: fingerprintValue(revision === "1" ? originalRows : correctedRows).fingerprint,
    observedAt: revision === "1" ? originalAt : correctionAt,
  }
}

function claims(revision: "1" | "2"): Claim[] {
  return [
    {
      id: `regional-total-v${revision}`,
      text: revision === "1" ? "The total is 60 units." : "The total is 78 units.",
      kind: "aggregation",
      status: "supported",
      evidenceIds: [`regional-source-v${revision}`],
      scope: { unit: "units", coverage: "three synthetic regions" },
      authoredBy: { kind: "system", name: "Deterministic teaching fixture" },
      review: { status: "proposed" },
    },
    {
      id: `regional-largest-v${revision}`,
      text:
        revision === "1"
          ? "South has the largest total: 30 units."
          : "West has the largest total: 36 units.",
      kind: "observation",
      status: "supported",
      evidenceIds: [`regional-source-v${revision}`],
      scope: { unit: "units", coverage: "three synthetic regions" },
      authoredBy: { kind: "system", name: "Deterministic teaching fixture" },
      review: { status: "proposed" },
    },
  ]
}

export function originalSourceArtifact() {
  const props = sourceChartProps()
  const contract = buildArtifactContract("BarChart", props, {
    id: "regional-totals",
    revision: "1",
    intents: ["comparison"],
    purpose: { stakes: "informational" },
    claims: claims("1"),
    evidence: [sourceEvidence("1")],
    time: {
      observedAt: originalAt,
      presentation: { state: "historical", label: "Original synthetic source" },
      revision: { status: "original" },
    },
    reception: {
      channels: [{ channel: "visual" }, { channel: "agent" }],
      description: props.description,
      dataFallback: true,
    },
    form: {
      chartFamily: "ordinal",
      whyThisForm: "Bar lengths compare totals in the same unit.",
    },
    contestability: { sourceRequestsAllowed: true },
    accountability: {
      authors: [{ kind: "system", name: "Semiotic documentation fixture" }],
      reviews: [{ id: "editorial-review", status: "pending" }],
    },
    inheritance: { privacy: "public", rawDataDefault: "exclude" },
    fieldStatus: {
      "accountability.reviews": {
        status: "manual",
        reason: "This teaching example records no human editorial approval.",
        suppliedBy: "system",
      },
    },
  })
  return { props, contract }
}

export function sourceCorrectionOptions(current: ArtifactContract): PrepareArtifactRevisionOptions {
  return {
    revision: "2",
    data: correctedRows.map((row) => ({ ...row })),
    evidence: [...current.evidence, sourceEvidence("2")],
    presentation: {
      summary: sourceChartProps(correctedRows).summary,
      description: "Corrected synthetic regional totals; West changed from 18 to 36 units.",
    },
    time: {
      observedAt: correctionAt,
      presentation: { state: "historical", label: "Corrected synthetic source" },
      revision: { status: "corrected", reason, correctionId: "regional-total-correction" },
    },
    claimTransitions: claims("2").map((replacement, index) => ({
      action: "supersede",
      previousClaimId: claims("1")[index].id,
      replacement,
      correction: {
        id: index === 0 ? "regional-total-correction" : "regional-largest-correction",
        reason,
        createdAt: correctionAt,
        createdBy: { kind: "system", name: "Deterministic teaching fixture" },
      },
    })),
    policy: "exploratory",
    now: correctionAt,
    recommendRepresentation: false,
    groundingChannels: ["agent"],
  }
}

export function reviseSourceArtifact(reassessClaims = true) {
  const original = originalSourceArtifact()
  const options = sourceCorrectionOptions(original.contract)
  return prepareArtifactRevision("BarChart", original.props, original.contract, {
    ...options,
    claimTransitions: reassessClaims ? options.claimTransitions : [],
  })
}

export function sourceCorrectionSidecar(contract: ArtifactContract) {
  return createAdjacentArtifactSidecar(
    createArtifactPacket(contract, {
      format: "static-package",
      includeEvidenceSamples: false,
    }),
    "regional-totals",
  )
}

export const sourceCorrectionNote = `Regional totals: maintenance context

Purpose: compare three synthetic totals in the same unit.
Component: BarChart from semiotic/ordinal.
Choice rationale: React charting with exact values and explicit correction history.
Constraint: preserve the project's dependency policy; changed requirements may justify another library.
Version: inspect the installed package and lockfile before editing.
Verification: this optional note stores no execution result or human approval.
Recheck: category/value mapping, arithmetic, summary, claim transitions and accessible route.
Limits: a matching fingerprint does not authenticate the source or prove arbitrary prose.
Files: retain chart configuration/data separately from the artifact-contract sidecar.
Documentation: /tasks/correct-published-chart (check its build identity against your installation).
`

/** A missing sidecar carries no evidence of source identity or prior review. */
export function inspectSourceHandoff(props: ReturnType<typeof sourceChartProps>, packet?: unknown) {
  if (packet === undefined) {
    return {
      status: "unavailable" as const,
      message:
        "Correction context unavailable. Chart values remain available, but source identity, previous claims and review history were not transferred.",
    }
  }
  const validation = validateArtifactPacket(packet)
  if (!validation.valid || !validation.packet) {
    return {
      status: "refused" as const,
      message: `Sidecar refused: ${validation.errors.join("; ")}`,
    }
  }
  const contract = validation.packet.contract
  const evaluation = evaluateArtifact("BarChart", props, contract, {
    policy: "exploratory",
    now: correctionAt,
    recommendRepresentation: false,
  })
  if (
    evaluation.obligations.some(({ id, status }) => id.startsWith("identity.") && status !== "pass")
  ) {
    return {
      status: "refused" as const,
      message:
        "Sidecar refused: its identity does not establish a match with this chart configuration and data.",
    }
  }
  return {
    status: "available" as const,
    message: `Revision ${contract.artifact.revision} correction context matches this chart. Human editorial approval remains unrecorded.`,
    contract,
  }
}
