import type { ArtifactRelation, ArtifactStakes } from "./types"
import { parseAbsoluteTime } from "./temporalPresentation"

export type BuiltInArtifactPolicyId =
  | "exploratory"
  | "operational-streaming"
  | "editorial"
  | "public-civic"
  | "agent-generated"

export interface ArtifactPolicyRules {
  /** Require at least one active (not superseded or retracted) claim. */
  requireClaims: boolean
  requireEvidenceIdentity: boolean
  requireReviewForModelClaims: boolean
  /** Require evidence emitted by an actual renderer before release. */
  requireRenderEvidence: boolean
  requireSettledTime: boolean
  requireFreshnessForLive: boolean
  refuseUnsupportedClaims: boolean
  refuseUnknownClaims: boolean
  refuseCriticalAccessibilityFailures: boolean
  refuseChartErrors: boolean
  refuseUnknownTime: boolean
  /** Allow conditional results with open manual checks, not automatic release. */
  allowManualChecks: boolean
  allowExceptions: boolean
}

export interface ArtifactPolicy {
  id: BuiltInArtifactPolicyId | (string & {})
  version: string
  label: string
  description: string
  minimumStakes?: ArtifactStakes
  rules: ArtifactPolicyRules
  requiredRelations: ArtifactRelation[]
}

export interface ArtifactPolicyException {
  rule: keyof ArtifactPolicyRules | (string & {})
  rationale: string
  owner: string
  expiresAt?: string
  reviewAt?: string
}

const BASE_RULES: ArtifactPolicyRules = {
  requireClaims: true,
  requireEvidenceIdentity: false,
  requireReviewForModelClaims: false,
  requireRenderEvidence: false,
  requireSettledTime: false,
  requireFreshnessForLive: false,
  refuseUnsupportedClaims: false,
  refuseUnknownClaims: false,
  refuseCriticalAccessibilityFailures: true,
  refuseChartErrors: true,
  refuseUnknownTime: false,
  allowManualChecks: true,
  allowExceptions: true
}

const CORE_RELATIONS: ArtifactRelation[] = [
  "claim-support",
  "representation-fit",
  "reception",
  "time",
  "abstention"
]

const POLICY_RULE_KEYS = Object.keys(
  BASE_RULES
) as (keyof ArtifactPolicyRules)[]
const POLICY_FIELDS = new Set([
  "id",
  "version",
  "label",
  "description",
  "minimumStakes",
  "rules",
  "requiredRelations"
])
const POLICY_RELATIONS = new Set<ArtifactRelation>([
  "claim-support",
  "representation-fit",
  "reception",
  "time",
  "challenge-and-correction",
  "accountability",
  "abstention",
  "preservation"
])
const POLICY_STAKES = new Set<ArtifactStakes>([
  "exploratory",
  "informational",
  "operational",
  "high"
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function invalidCustomPolicy(message: string): never {
  throw new TypeError(`Invalid custom artifact policy: ${message}`)
}

function freezePolicyMap<T extends Record<string, ArtifactPolicy>>(
  policies: T
): Readonly<T> {
  for (const policy of Object.values(policies)) {
    Object.freeze(policy.rules)
    Object.freeze(policy.requiredRelations)
    Object.freeze(policy)
  }
  return Object.freeze(policies)
}

function copyPolicy(policy: ArtifactPolicy): ArtifactPolicy {
  return {
    ...policy,
    rules: { ...policy.rules },
    requiredRelations: [...policy.requiredRelations]
  }
}

function samePolicyDefinition(
  left: ArtifactPolicy,
  right: ArtifactPolicy
): boolean {
  return (
    left.id === right.id &&
    left.version === right.version &&
    left.label === right.label &&
    left.description === right.description &&
    left.minimumStakes === right.minimumStakes &&
    POLICY_RULE_KEYS.every((key) => left.rules[key] === right.rules[key]) &&
    left.requiredRelations.length === right.requiredRelations.length &&
    left.requiredRelations.every(
      (relation, index) => relation === right.requiredRelations[index]
    )
  )
}

function validatedCustomPolicy(value: unknown): ArtifactPolicy {
  if (!isRecord(value)) {
    return invalidCustomPolicy("expected an object.")
  }
  const unexpectedFields = Object.keys(value).filter(
    (key) => !POLICY_FIELDS.has(key)
  )
  if (unexpectedFields.length > 0) {
    return invalidCustomPolicy(
      `unexpected field${unexpectedFields.length === 1 ? "" : "s"}: ${unexpectedFields.join(", ")}.`
    )
  }
  for (const key of ["id", "version", "label", "description"] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      return invalidCustomPolicy(`${key} must be a non-empty string.`)
    }
  }
  const policyId = value.id as string
  const builtIn = Object.prototype.hasOwnProperty.call(
    ARTIFACT_POLICIES,
    policyId
  )
    ? ARTIFACT_POLICIES[policyId as BuiltInArtifactPolicyId]
    : undefined
  if (
    (!builtIn &&
      !Object.prototype.hasOwnProperty.call(value, "minimumStakes")) ||
    (Object.prototype.hasOwnProperty.call(value, "minimumStakes") &&
      (typeof value.minimumStakes !== "string" ||
        !POLICY_STAKES.has(value.minimumStakes as ArtifactStakes)))
  ) {
    return invalidCustomPolicy(
      "minimumStakes is required and must be exploratory, informational, operational, or high."
    )
  }
  if (!isRecord(value.rules)) {
    return invalidCustomPolicy("rules must be an object.")
  }
  const knownRuleKeys = new Set<string>(POLICY_RULE_KEYS)
  const unexpectedRules = Object.keys(value.rules).filter(
    (key) => !knownRuleKeys.has(key)
  )
  if (unexpectedRules.length > 0) {
    return invalidCustomPolicy(
      `unexpected rule${unexpectedRules.length === 1 ? "" : "s"}: ${unexpectedRules.join(", ")}.`
    )
  }
  for (const key of POLICY_RULE_KEYS) {
    if (
      !Object.prototype.hasOwnProperty.call(value.rules, key) ||
      typeof value.rules[key] !== "boolean"
    ) {
      return invalidCustomPolicy(`rule "${key}" must be a boolean.`)
    }
  }
  if (
    !Array.isArray(value.requiredRelations) ||
    value.requiredRelations.length === 0
  ) {
    return invalidCustomPolicy(
      "requiredRelations must be a non-empty array of recognized relations."
    )
  }
  const requiredRelations: ArtifactRelation[] = []
  for (const relation of value.requiredRelations) {
    if (
      typeof relation !== "string" ||
      !POLICY_RELATIONS.has(relation as ArtifactRelation)
    ) {
      return invalidCustomPolicy(
        `requiredRelations contains an unrecognized relation: ${String(relation)}.`
      )
    }
    requiredRelations.push(relation as ArtifactRelation)
  }
  if (new Set(requiredRelations).size !== requiredRelations.length) {
    return invalidCustomPolicy("requiredRelations must not contain duplicates.")
  }

  const policy: ArtifactPolicy = {
    id: policyId,
    version: value.version as string,
    label: value.label as string,
    description: value.description as string,
    ...(value.minimumStakes !== undefined
      ? { minimumStakes: value.minimumStakes as ArtifactStakes }
      : {}),
    rules: { ...(value.rules as unknown as ArtifactPolicyRules) },
    requiredRelations
  }
  if (builtIn && !samePolicyDefinition(policy, builtIn)) {
    return invalidCustomPolicy(
      `built-in policy id "${policy.id}" cannot be redefined; use a distinct id for an extension.`
    )
  }
  return builtIn ? copyPolicy(builtIn) : policy
}

/** Versioned, inspectable policy packs built only from deterministic evidence. */
export const ARTIFACT_POLICIES: Readonly<
  Record<BuiltInArtifactPolicyId, ArtifactPolicy>
> = /* @__PURE__ */ freezePolicyMap({
  exploratory: {
    id: "exploratory",
    version: "0.1",
    label: "Exploratory",
    description:
      "Keeps uncertainty visible while allowing incomplete work to remain inspectable.",
    rules: {
      ...BASE_RULES,
      requireClaims: false,
      refuseCriticalAccessibilityFailures: false,
      refuseChartErrors: false
    },
    requiredRelations: ["claim-support", "representation-fit"]
  },
  "operational-streaming": {
    id: "operational-streaming",
    version: "0.1",
    label: "Operational streaming",
    description:
      "Blocks action when render proof, live freshness, completeness, evidence identity, or model review is unresolved.",
    minimumStakes: "operational",
    rules: {
      ...BASE_RULES,
      requireEvidenceIdentity: true,
      requireReviewForModelClaims: true,
      requireRenderEvidence: true,
      requireSettledTime: true,
      requireFreshnessForLive: true,
      refuseUnsupportedClaims: true,
      refuseUnknownClaims: true,
      refuseUnknownTime: true
    },
    requiredRelations: [
      ...CORE_RELATIONS,
      "accountability",
      "challenge-and-correction"
    ]
  },
  editorial: {
    id: "editorial",
    version: "0.1",
    label: "Editorial",
    description:
      "Requires render proof, attributable evidence, settled publication language, and visible correction history.",
    minimumStakes: "informational",
    rules: {
      ...BASE_RULES,
      requireEvidenceIdentity: true,
      requireReviewForModelClaims: true,
      requireRenderEvidence: true,
      requireSettledTime: true,
      refuseUnsupportedClaims: true,
      refuseUnknownClaims: true,
      refuseUnknownTime: true
    },
    requiredRelations: [
      ...CORE_RELATIONS,
      "challenge-and-correction",
      "accountability",
      "preservation"
    ]
  },
  "public-civic": {
    id: "public-civic",
    version: "0.1",
    label: "Public information",
    description:
      "Prioritizes render proof, accessible reception, source answerability, uncertainty, privacy, and correction paths.",
    minimumStakes: "informational",
    rules: {
      ...BASE_RULES,
      requireEvidenceIdentity: true,
      requireReviewForModelClaims: true,
      requireRenderEvidence: true,
      refuseUnsupportedClaims: true,
      refuseUnknownClaims: false,
      refuseUnknownTime: false
    },
    requiredRelations: [
      ...CORE_RELATIONS,
      "challenge-and-correction",
      "preservation"
    ]
  },
  "agent-generated": {
    id: "agent-generated",
    version: "0.1",
    label: "Agent generated",
    description:
      "Requires render proof, independent evidence, explicit review state, safe grounding, and refusal when support is absent.",
    rules: {
      ...BASE_RULES,
      requireEvidenceIdentity: true,
      requireReviewForModelClaims: true,
      requireRenderEvidence: true,
      requireSettledTime: true,
      refuseUnsupportedClaims: true,
      refuseUnknownClaims: true
    },
    requiredRelations: [...CORE_RELATIONS, "accountability", "preservation"]
  }
})

export type ArtifactPolicyInput =
  BuiltInArtifactPolicyId | ArtifactPolicy | undefined

export function resolveArtifactPolicy(
  policy: ArtifactPolicyInput
): ArtifactPolicy {
  if (policy === undefined) return copyPolicy(ARTIFACT_POLICIES.exploratory)
  if (typeof policy !== "string") return validatedCustomPolicy(policy)
  const resolved = Object.prototype.hasOwnProperty.call(
    ARTIFACT_POLICIES,
    policy
  )
    ? ARTIFACT_POLICIES[policy as BuiltInArtifactPolicyId]
    : undefined
  if (!resolved) throw new Error(`Unknown artifact policy "${policy}".`)
  return copyPolicy(resolved)
}

export function activePolicyRules(
  policy: ArtifactPolicy,
  exceptions: ReadonlyArray<ArtifactPolicyException> = [],
  now?: string
): {
  rules: ArtifactPolicyRules
  appliedExceptions: ArtifactPolicyException[]
  rejectedExceptions: ArtifactPolicyException[]
} {
  const rules = { ...policy.rules }
  const appliedExceptions: ArtifactPolicyException[] = []
  const rejectedExceptions: ArtifactPolicyException[] = []
  const currentTime = now ? parseAbsoluteTime(now) : Number.NaN
  for (const exception of exceptions) {
    const key = exception.rule as keyof ArtifactPolicyRules
    const recognized = Object.prototype.hasOwnProperty.call(rules, key)
    const providedBounds = [exception.expiresAt, exception.reviewAt]
    const invalidProvidedBound = providedBounds.some(
      (value) =>
        value !== undefined &&
        (typeof value !== "string" || value.trim().length === 0)
    )
    const bounds = providedBounds.filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0
    )
    const boundTimes = bounds.map(parseAbsoluteTime)
    const validAccountability =
      typeof exception.rationale === "string" &&
      exception.rationale.trim().length > 0 &&
      typeof exception.owner === "string" &&
      exception.owner.trim().length > 0
    const validWindow =
      Number.isFinite(currentTime) &&
      !invalidProvidedBound &&
      bounds.length > 0 &&
      boundTimes.every(
        (boundTime) =>
          Number.isFinite(boundTime) && boundTime > (currentTime as number)
      )
    const waivable =
      recognized &&
      rules[key] === true &&
      key !== "allowExceptions" &&
      key !== "allowManualChecks"
    if (
      !policy.rules.allowExceptions ||
      !waivable ||
      !validAccountability ||
      !validWindow
    ) {
      rejectedExceptions.push(exception)
      continue
    }
    rules[key] = false
    appliedExceptions.push(exception)
  }
  return { rules, appliedExceptions, rejectedExceptions }
}
