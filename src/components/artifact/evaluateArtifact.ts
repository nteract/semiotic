import type { Datum } from "../charts/shared/datumTypes"
import { evaluateChart, type EvaluateChartResult } from "../ai/evaluateChart"
import { auditClaims, type ClaimAudit } from "./claims"
import { activePolicyRules, resolveArtifactPolicy } from "./policies"
import { recommendRepresentation } from "./representation"
import {
  artifactDeclaresRelation,
  hasActiveArtifactClaims
} from "./policyRelations"
import { auditTemporalContext, type TemporalAudit } from "./temporal"
import {
  validateArtifactContract,
  type ArtifactContractValidation
} from "./contract"
import { fingerprintValue } from "./fingerprint"
import { nonJsonValuePaths } from "./jsonCompatibility"
import {
  artifactConfigurationValue,
  artifactDataFingerprint,
  artifactDataValue
} from "./identity"
import { summarizeObligations } from "./obligations"
import { configurationRepairLedgerEntries } from "./configurationRepair"
import {
  chartObligations,
  hasCriticalAccessibilityFailure,
  repairProposals,
  renderEvidenceObligations
} from "./evaluationPresentation"
import type {
  ArtifactContract,
  ArtifactRelation,
  ObligationResult
} from "./types"
import type {
  ArtifactEvaluation,
  ArtifactRepairLedgerEntry,
  ArtifactRepairResult,
  EvaluateArtifactOptions,
  RepairArtifactOptions
} from "./evaluateArtifactTypes"

export type {
  ArtifactEvaluation,
  ArtifactRepairLedgerEntry,
  ArtifactRepairResult,
  EvaluateArtifactOptions,
  RepairArtifactOptions,
  RepairProposal
} from "./evaluateArtifactTypes"
export { explainArtifactRefusal } from "./evaluationPresentation"

function optionalContractObligations(
  contract: ArtifactContract
): ObligationResult[] {
  const findings: ObligationResult[] = []
  const optional: Array<{
    key: keyof ArtifactContract
    relation: ArtifactRelation
    label: string
  }> = [
    { key: "form", relation: "representation-fit", label: "form rationale" },
    { key: "reception", relation: "reception", label: "reception contract" },
    {
      key: "contestability",
      relation: "challenge-and-correction",
      label: "challenge and correction path"
    },
    {
      key: "accountability",
      relation: "accountability",
      label: "authorship and review history"
    },
    {
      key: "inheritance",
      relation: "preservation",
      label: "preservation contract"
    }
  ]
  for (const { key, relation, label } of optional) {
    findings.push({
      id: `contract.${String(key)}`,
      relation,
      status: contract[key] ? "pass" : "unknown",
      path: String(key),
      message: contract[key]
        ? `The artifact declares its ${label}.`
        : `The artifact does not declare a ${label}.`
    })
  }
  for (const [path, field] of Object.entries(contract.fieldStatus ?? {})) {
    const relation: ArtifactRelation = path.startsWith("time")
      ? "time"
      : path.startsWith("reception")
        ? "reception"
        : path.startsWith("accountability")
          ? "accountability"
          : path.startsWith("inheritance")
            ? "preservation"
            : "claim-support"
    findings.push({
      id: `field.${path}`,
      relation,
      status: field.status === "known" ? "pass" : field.status,
      path,
      message: field.reason ?? `${path} is ${field.status}.`
    })
  }
  for (const [index, check] of (
    contract.reception?.manualChecks ?? []
  ).entries()) {
    findings.push({
      id: `reception.manual-check.${index + 1}`,
      relation: "reception",
      status: "manual",
      path: `reception.manualChecks[${index}]`,
      message: check
    })
  }
  return findings
}

function artifactIdentityObligations(
  component: string,
  props: Datum,
  contract: ArtifactContract,
  suppliedData: unknown
): ObligationResult[] {
  const findings: ObligationResult[] = []
  const evaluatedComponent =
    component === "ChartRecipe" && typeof props.recipeId === "string"
      ? props.recipeId
      : component
  const expectedConfigFingerprint = fingerprintValue(
    artifactConfigurationValue(props)
  ).fingerprint
  const configurationIsSerializable =
    nonJsonValuePaths(artifactConfigurationValue(props)).length === 0
  const dataValue = suppliedData ?? artifactDataValue(props)
  const dataIsSerializable =
    dataValue === undefined || nonJsonValuePaths(dataValue).length === 0
  const expectedDataFingerprint = artifactDataFingerprint(
    dataValue,
    contract.evidence
  )

  findings.push({
    id: "identity.component",
    relation: "accountability",
    status:
      contract.artifact.component === undefined
        ? "unknown"
        : contract.artifact.component === evaluatedComponent
          ? "pass"
          : "fail",
    path: "artifact.component",
    message:
      contract.artifact.component === undefined
        ? "The contract does not identify the component being evaluated."
        : contract.artifact.component === evaluatedComponent
          ? "The contract component matches the evaluated chart."
          : `The contract names ${contract.artifact.component}, but the evaluated chart is ${evaluatedComponent}.`,
    ...(contract.artifact.component !== evaluatedComponent
      ? {
          repair: `Reassess claims in an explicit revision for ${evaluatedComponent}.`
        }
      : {})
  })
  findings.push({
    id: "identity.configuration",
    relation: "accountability",
    status:
      !configurationIsSerializable ||
      contract.artifact.configFingerprint === undefined
        ? "unknown"
        : contract.artifact.configFingerprint === expectedConfigFingerprint
          ? "pass"
          : "fail",
    path: "artifact.configFingerprint",
    message: !configurationIsSerializable
      ? "The evaluated configuration contains runtime-only values and cannot be verified by a portable fingerprint."
      : contract.artifact.configFingerprint === undefined
        ? "The contract is not bound to the evaluated chart configuration."
        : contract.artifact.configFingerprint === expectedConfigFingerprint
          ? "The configuration fingerprint matches the evaluated chart."
          : "The configuration fingerprint does not match the evaluated chart.",
    ...(contract.artifact.configFingerprint !== expectedConfigFingerprint
      ? {
          repair:
            "Reassess claims in an explicit revision before rebinding configuration."
        }
      : {})
  })
  if (expectedDataFingerprint && dataIsSerializable) {
    findings.push({
      id: "identity.data",
      relation: "claim-support",
      status:
        contract.artifact.dataFingerprint === undefined
          ? "unknown"
          : contract.artifact.dataFingerprint === expectedDataFingerprint
            ? "pass"
            : "fail",
      path: "artifact.dataFingerprint",
      message:
        contract.artifact.dataFingerprint === undefined
          ? "The contract is not bound to the evaluated data."
          : contract.artifact.dataFingerprint === expectedDataFingerprint
            ? "The data fingerprint matches the evaluated data."
            : "The data fingerprint does not match the evaluated data.",
      ...(contract.artifact.dataFingerprint !== expectedDataFingerprint
        ? {
            repair:
              "Reassess claims in an explicit revision before rebinding data."
          }
        : {})
    })
  } else {
    findings.push({
      id: "identity.data-unavailable",
      relation: "claim-support",
      status: "unknown",
      path: "artifact.dataFingerprint",
      message:
        "No data was supplied, so the contract data identity cannot be verified."
    })
  }
  return findings
}

function relationForValidationPath(path: string): ArtifactRelation {
  if (path.includes(".time")) return "time"
  if (path.includes(".reception")) return "reception"
  if (path.includes(".form")) return "representation-fit"
  if (path.includes(".contestability")) return "challenge-and-correction"
  if (path.includes(".accountability") || path.includes(".artifact")) {
    return "accountability"
  }
  if (path.includes(".inheritance")) return "preservation"
  if (path.includes(".purpose")) return "abstention"
  return "claim-support"
}

function invalidContractEvaluation(
  chart: EvaluateChartResult,
  artifactValidation: ArtifactContractValidation,
  policy: ReturnType<typeof resolveArtifactPolicy>,
  active: ReturnType<typeof activePolicyRules>,
  value: unknown
): ArtifactEvaluation {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined
  const claimFindings: ObligationResult[] = [
    {
      id: "contract.invalid.claim-audit-skipped",
      relation: "claim-support",
      status: "unknown",
      path: "claims",
      message:
        "Claim auditing was not run because the artifact contract is structurally invalid."
    }
  ]
  const temporalFindings: ObligationResult[] = [
    {
      id: "contract.invalid.temporal-audit-skipped",
      relation: "time",
      status: "unknown",
      path: "time",
      message:
        "Temporal auditing was not run because the artifact contract is structurally invalid."
    }
  ]
  const validationObligations = [
    ...artifactValidation.errors.map<ObligationResult>((issue, index) => ({
      id: `contract.validation.error.${index + 1}`,
      relation: relationForValidationPath(issue.path),
      status: "fail",
      path: issue.path,
      message: `${issue.path}: ${issue.message}`,
      repair: "Correct the contract structure before semantic evaluation."
    })),
    ...artifactValidation.warnings.map<ObligationResult>((issue, index) => ({
      id: `contract.validation.warning.${index + 1}`,
      relation: relationForValidationPath(issue.path),
      status: "warn",
      path: issue.path,
      message: `${issue.path}: ${issue.message}`
    }))
  ]
  const obligations = [
    ...validationObligations,
    ...chartObligations(chart),
    ...renderEvidenceObligations(
      chart,
      active.rules.requireRenderEvidence === true
    ),
    ...claimFindings,
    ...temporalFindings
  ]
  const claims: ClaimAudit = {
    ok: false,
    claims: Array.isArray(record?.claims) ? record.claims.length : 0,
    evidence: Array.isArray(record?.evidence) ? record.evidence.length : 0,
    summary: summarizeObligations(claimFindings),
    findings: claimFindings
  }
  const temporal: TemporalAudit = {
    ok: false,
    sources:
      record?.time &&
      typeof record.time === "object" &&
      !Array.isArray(record.time) &&
      Array.isArray((record.time as Record<string, unknown>).sources)
        ? ((record.time as Record<string, unknown>).sources as unknown[]).length
        : 0,
    summary: summarizeObligations(temporalFindings),
    findings: temporalFindings
  }
  const manualChecks = chart.accessibility.findings
    .filter(({ status }) => status === "manual")
    .map(({ heuristic }) => heuristic)

  return {
    status: "refuse",
    policy: {
      id: policy.id,
      version: policy.version,
      appliedExceptions: active.appliedExceptions,
      rejectedExceptions: active.rejectedExceptions
    },
    validation: {
      artifact: artifactValidation,
      chart: chart.validation
    },
    data: chart.data,
    claims,
    temporal,
    accessibility: chart.accessibility,
    design: chart.deception,
    ...(chart.evidence ? { render: chart.evidence } : {}),
    obligations,
    alternatives: [],
    repairs: repairProposals(obligations),
    manualChecks: [...new Set(manualChecks)]
  }
}

function policyRelationObligations(
  contract: ArtifactContract,
  policy: ReturnType<typeof resolveArtifactPolicy>
): ObligationResult[] {
  return policy.requiredRelations.map((relation) => {
    const declared = artifactDeclaresRelation(contract, relation)
    return {
      id: `policy.relation.${relation}`,
      relation,
      status: declared
        ? "pass"
        : policy.id === "exploratory"
          ? "unknown"
          : "fail",
      message: declared
        ? `The artifact declares information for the required ${relation} relation.`
        : `Policy "${policy.id}" requires declared information for ${relation}.`,
      ...(!declared
        ? {
            repair: `Add an explicit ${relation} record or choose a policy that does not require it.`
          }
        : {})
    }
  })
}

/**
 * Compose chart, claim, time, accessibility, and policy evidence without
 * flattening them into a single aggregate score.
 */
export function evaluateArtifact(
  component: string,
  props: Datum,
  contract: ArtifactContract,
  options: EvaluateArtifactOptions = {}
): ArtifactEvaluation {
  const policy = resolveArtifactPolicy(options.policy)
  const active = activePolicyRules(policy, options.exceptions, options.now)
  const data =
    options.data ??
    (Array.isArray(props.data)
      ? (props.data as ReadonlyArray<Datum>)
      : undefined)
  const chart = evaluateChart(component, props, data, options)
  const artifactValidation = validateArtifactContract(contract)
  if (!artifactValidation.valid) {
    return invalidContractEvaluation(
      chart,
      artifactValidation,
      policy,
      active,
      contract
    )
  }
  const claims = auditClaims(contract, {
    requireEvidenceIdentity: active.rules.requireEvidenceIdentity,
    requireReviewForModelClaims: active.rules.requireReviewForModelClaims,
    data,
    now: options.now
  })
  const temporal = auditTemporalContext(contract.time, {
    claims: contract.claims,
    corrections: contract.contestability?.corrections,
    referenceTime: options.now,
    requireSettled: active.rules.requireSettledTime,
    requireFreshnessForLive: active.rules.requireFreshnessForLive
  })
  const obligations = [
    ...artifactIdentityObligations(
      component,
      props,
      contract,
      options.data !== undefined ? options.data : artifactDataValue(props)
    ),
    ...chartObligations(chart),
    ...renderEvidenceObligations(
      chart,
      active.rules.requireRenderEvidence === true
    ),
    ...claims.findings,
    ...temporal.findings,
    ...optionalContractObligations(contract),
    ...policyRelationObligations(contract, policy)
  ]
  if (active.rules.requireClaims && !hasActiveArtifactClaims(contract)) {
    obligations.push({
      id: "policy.claims-required",
      relation: "claim-support",
      status: "fail",
      path: "claims",
      message: `Policy "${policy.id}" requires the artifact to declare at least one active claim.`,
      repair:
        "Add bounded claim records or choose a less strict policy for exploratory work."
    })
  }
  const evidenceIdentityGaps = claims.findings.filter(
    ({ id, status: findingStatus }) =>
      id.startsWith("evidence.identity.") && findingStatus === "unknown"
  )
  if (active.rules.requireEvidenceIdentity && evidenceIdentityGaps.length > 0) {
    obligations.push({
      id: "policy.evidence-identity-required",
      relation: "claim-support",
      status: "fail",
      path: "evidence",
      message: `Policy "${policy.id}" requires source, version, or fingerprint identity for every evidence record.`,
      repair:
        "Add a source URI/version, data version, or deterministic fingerprint to each unidentified evidence record.",
      evidenceIds: evidenceIdentityGaps
        .map(({ id }) => id.slice("evidence.identity.".length))
        .filter(Boolean)
    })
  }
  if (policy.minimumStakes) {
    const order = ["exploratory", "informational", "operational", "high"]
    const declared = contract.purpose.stakes
    const meetsMinimum =
      declared !== undefined &&
      order.indexOf(declared) >= order.indexOf(policy.minimumStakes)
    obligations.push({
      id: "policy.stakes-context",
      relation: "abstention",
      status:
        declared === undefined ? "unknown" : meetsMinimum ? "pass" : "warn",
      path: "purpose.stakes",
      message:
        declared === undefined
          ? `Policy "${policy.id}" has no declared stakes context to compare.`
          : meetsMinimum
            ? `Declared stakes meet the ${policy.minimumStakes} policy context.`
            : `Policy "${policy.id}" is stricter than the declared ${declared} stakes context.`
    })
  }
  const recommendation =
    options.recommendRepresentation === false
      ? undefined
      : recommendRepresentation(data, contract, {
          policy,
          exceptions: options.exceptions,
          now: options.now,
          preferredComponent: component,
          intent: contract.purpose.intents.map(({ id }) => id)
        })

  const structuralFailure = !artifactValidation.valid
  const chartFailure =
    active.rules.refuseChartErrors &&
    chart.findings.some(({ severity }) => severity === "error")
  const accessibilityFailure =
    active.rules.refuseCriticalAccessibilityFailures &&
    hasCriticalAccessibilityFailure(chart)
  const unsupportedFailure =
    active.rules.refuseUnsupportedClaims &&
    contract.claims.some(({ status }) => status === "unsupported")
  const unknownClaimFailure =
    active.rules.refuseUnknownClaims &&
    contract.claims.some(({ status }) => status === "unknown")
  const unknownTimeFailure =
    active.rules.refuseUnknownTime &&
    (!contract.time || temporal.summary.unknown > 0)
  const unsettledFailure =
    active.rules.requireSettledTime &&
    temporal.findings.some(
      ({ id, status }) =>
        status === "fail" &&
        (id.includes("window") || id.includes("completeness"))
    )
  const modelReviewFailure =
    active.rules.requireReviewForModelClaims &&
    claims.findings.some(
      ({ id, status }) =>
        id.startsWith("claims.model-review") && status === "fail"
    )
  const claimIntegrityFailure = claims.summary.fail > 0
  const temporalIntegrityFailure = temporal.summary.fail > 0
  // Every failed policy obligation is binding, including newly added rules.
  const requiredPolicyFailure = obligations.some(
    ({ id, status: obligationStatus }) =>
      id.startsWith("policy.") && obligationStatus === "fail"
  )
  const identityFailure = obligations.some(
    ({ id, status: obligationStatus }) =>
      id.startsWith("identity.") && obligationStatus === "fail"
  )
  const manualCheckFailure =
    !active.rules.allowManualChecks &&
    obligations.some(
      ({ status: obligationStatus }) => obligationStatus === "manual"
    )
  const renderEvidenceFailure =
    active.rules.requireRenderEvidence === true &&
    chart.evidence?.component !== chart.component
  const refused =
    structuralFailure ||
    identityFailure ||
    claimIntegrityFailure ||
    temporalIntegrityFailure ||
    requiredPolicyFailure ||
    manualCheckFailure ||
    renderEvidenceFailure ||
    chartFailure ||
    accessibilityFailure ||
    unsupportedFailure ||
    unknownClaimFailure ||
    unknownTimeFailure ||
    unsettledFailure ||
    modelReviewFailure ||
    recommendation?.status === "refuse"
  const hasOpenWork = obligations.some(({ status }) =>
    ["fail", "warn", "manual", "unknown"].includes(status)
  )
  const status = refused
    ? "refuse"
    : hasOpenWork || recommendation?.status === "conditional"
      ? "conditional"
      : "acceptable"
  const manualChecks = [
    ...new Set([
      ...(contract.reception?.manualChecks ?? []),
      ...chart.accessibility.findings
        .filter(({ status: findingStatus }) => findingStatus === "manual")
        .map(({ heuristic }) => heuristic),
      ...obligations
        .filter(({ status: obligationStatus }) => obligationStatus === "manual")
        .map(({ message }) => message)
    ])
  ]

  return {
    status,
    policy: {
      id: policy.id,
      version: policy.version,
      appliedExceptions: active.appliedExceptions,
      rejectedExceptions: active.rejectedExceptions
    },
    validation: {
      artifact: artifactValidation,
      chart: chart.validation
    },
    data: chart.data,
    claims,
    temporal,
    accessibility: chart.accessibility,
    design: chart.deception,
    ...(chart.evidence ? { render: chart.evidence } : {}),
    obligations,
    ...(recommendation ? { recommendation } : {}),
    alternatives: recommendation?.alternatives ?? [],
    repairs: repairProposals(obligations),
    manualChecks
  }
}

/** Apply deterministic repairs without inventing evidence, review, or claims. */
export function repairArtifact(
  component: string,
  props: Datum,
  contract: ArtifactContract,
  options: RepairArtifactOptions = {}
): ArtifactRepairResult {
  const before = evaluateArtifact(component, props, contract, options)
  if (!before.validation.artifact.valid) {
    return {
      status: "requires-input",
      component,
      props,
      contract,
      before,
      after: before,
      ledger: before.validation.artifact.errors.map((issue, index) => ({
        id: `repair.contract-validation.${index + 1}`,
        category: "contract",
        path: issue.path,
        action: "Correct the contract structure before applying repairs.",
        reason: issue.message,
        applied: false,
        changesClaim: false
      }))
    }
  }
  const applySafe = options.applySafeIdentityRepairs === true
  const evaluatedComponent =
    component === "ChartRecipe" && typeof props.recipeId === "string"
      ? props.recipeId
      : component
  const configProps = artifactConfigurationValue(props)
  const expectedConfigFingerprint =
    nonJsonValuePaths(configProps).length === 0
      ? fingerprintValue(configProps).fingerprint
      : undefined
  const identityData = options.data ?? artifactDataValue(props)
  const expectedDataFingerprint =
    identityData === undefined || nonJsonValuePaths(identityData).length === 0
      ? artifactDataFingerprint(identityData, contract.evidence)
      : undefined
  const identityEntries: ArtifactRepairLedgerEntry[] = []
  const artifact = { ...contract.artifact }
  const fieldStatus = { ...contract.fieldStatus }
  const identities = [
    ["component", "component", evaluatedComponent],
    ["configFingerprint", "config-fingerprint", expectedConfigFingerprint],
    ["dataFingerprint", "data-fingerprint", expectedDataFingerprint]
  ] as const
  for (const [key, id, expected] of identities) {
    if (expected === undefined || artifact[key] === expected) continue
    const missing = artifact[key] === undefined
    const applied = applySafe && missing
    identityEntries.push({
      id: `repair.artifact.${id}`,
      category: "identity",
      path: `artifact.${key}`,
      action: missing
        ? `Set the missing ${key} from the supplied input.`
        : "Prepare an explicit revision and reassess dependent claims before rebinding identity.",
      reason: missing
        ? "The missing identity can be computed locally; this does not verify claim truth."
        : "Replacing an existing identity could carry stale claims, evidence, or reviews onto different content.",
      applied,
      changesClaim: !missing
    })
    if (applied) {
      artifact[key] = expected
      delete fieldStatus[`artifact.${key}`]
    }
  }

  const repairedContract = identityEntries.some(({ applied }) => applied)
    ? { ...contract, artifact, fieldStatus }
    : contract
  const after = applySafe
    ? evaluateArtifact(component, props, repairedContract, options)
    : before
  const configurationEntries = configurationRepairLedgerEntries(
    component,
    props,
    Array.isArray(identityData)
      ? (identityData as ReadonlyArray<Datum>)
      : undefined,
    contract.purpose.intents.map(({ id }) => id)
  )
  const unresolved = after.repairs
    .filter((proposal) => !proposal.id.startsWith("repair.identity."))
    .map<ArtifactRepairLedgerEntry>((proposal) => ({
      id: proposal.id,
      category: proposal.category ?? "contract",
      path: proposal.path ?? "$",
      action: proposal.action,
      reason: proposal.reason,
      applied: false,
      changesClaim: proposal.changesClaim
    }))
  const ledger = [...identityEntries, ...configurationEntries, ...unresolved]
  return {
    status: identityEntries.some(({ applied }) => applied)
      ? after.status === "acceptable"
        ? "repaired"
        : "requires-input"
      : ledger.length > 0
        ? "requires-input"
        : "unchanged",
    component,
    props,
    contract: repairedContract,
    before,
    after,
    ledger
  }
}
