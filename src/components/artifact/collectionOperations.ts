import { canonicalJson } from "./fingerprint"
import { nonJsonValuePaths } from "./jsonCompatibility"
import { validateArtifactContract } from "./contract"
import { auditArtifactCollection } from "./collection"
import { isRecord, rejectUnknownKeys } from "./validationPrimitives"
import {
  claimReferenceKey,
  correctionScopeIsValid,
  scopedCorrectionReferences
} from "./collectionCorrectionScope"
import type { ArtifactContract, CorrectionRecord, JsonObject } from "./types"
import type {
  ArtifactCollectionContract,
  ArtifactCollectionValidation,
  CollectionCorrectionRecord,
  SerializedArtifactCollection
} from "./collection"

function validateCollectionString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  errors: ArtifactCollectionValidation["errors"],
  required = false
): void {
  const value = record[key]
  if (
    (required && (typeof value !== "string" || !value)) ||
    (!required && value !== undefined && typeof value !== "string")
  ) {
    errors.push({
      path: `${path}.${key}`,
      message: required ? "Expected a non-empty string." : "Expected a string."
    })
  }
}

function validateCollectionStringArray(
  value: unknown,
  path: string,
  errors: ArtifactCollectionValidation["errors"],
  required = false
): value is string[] {
  if (value === undefined && !required) return false
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || !entry)
  ) {
    errors.push({ path, message: "Expected an array of non-empty strings." })
    return false
  }
  return true
}

function validateClaimReferenceArray(
  value: unknown,
  path: string,
  errors: ArtifactCollectionValidation["errors"]
): void {
  if (!Array.isArray(value)) {
    errors.push({ path, message: "Expected a claim reference array." })
    return
  }
  value.forEach((reference, index) => {
    if (!isRecord(reference)) {
      errors.push({
        path: `${path}[${index}]`,
        message: "Expected an artifact-qualified claim reference."
      })
      return
    }
    rejectUnknownKeys(
      reference,
      ["artifactId", "claimId"],
      `${path}[${index}]`,
      errors
    )
    validateCollectionString(
      reference,
      "artifactId",
      `${path}[${index}]`,
      errors,
      true
    )
    validateCollectionString(
      reference,
      "claimId",
      `${path}[${index}]`,
      errors,
      true
    )
  })
}

function validateActorRef(
  value: unknown,
  path: string,
  errors: ArtifactCollectionValidation["errors"]
): void {
  if (!isRecord(value)) {
    errors.push({ path, message: "Expected an actor object." })
    return
  }
  rejectUnknownKeys(value, ["id", "name", "kind"], path, errors)
  validateCollectionString(value, "kind", path, errors, true)
  validateCollectionString(value, "id", path, errors)
  validateCollectionString(value, "name", path, errors)
}

/** Dependency-free validation for untrusted collection payloads. */
export function validateArtifactCollection(
  value: unknown
): ArtifactCollectionValidation {
  try {
    return inspectArtifactCollection(value)
  } catch {
    return {
      valid: false,
      errors: [
        {
          path: "$",
          message: "Artifact collection could not be inspected safely."
        }
      ],
      warnings: []
    }
  }
}

function inspectArtifactCollection(
  value: unknown
): ArtifactCollectionValidation {
  const errors: ArtifactCollectionValidation["errors"] = []
  const warnings: ArtifactCollectionValidation["warnings"] = []
  if (!isRecord(value)) {
    return {
      valid: false,
      errors: [{ path: "$", message: "Expected a collection object." }],
      warnings
    }
  }
  const incompatiblePaths = nonJsonValuePaths(value)
  if (incompatiblePaths.length > 0) {
    return {
      valid: false,
      errors: incompatiblePaths.map((path) => ({
        path,
        message:
          "Expected a JSON-compatible value that survives serialization unchanged."
      })),
      warnings
    }
  }
  if (value.collectionVersion !== "0.1") {
    errors.push({
      path: "$.collectionVersion",
      message: "Expected collection version 0.1."
    })
  }
  rejectUnknownKeys(
    value,
    [
      "collectionVersion",
      "id",
      "title",
      "artifacts",
      "metrics",
      "policyId",
      "filters",
      "views",
      "sourceRegistry",
      "claimDependencies",
      "actions",
      "corrections",
      "extensions"
    ],
    "$",
    errors
  )
  validateCollectionString(value, "id", "$", errors, true)
  for (const key of ["title", "policyId"] as const) {
    validateCollectionString(value, key, "$", errors)
  }

  if (!Array.isArray(value.artifacts)) {
    errors.push({ path: "$.artifacts", message: "Expected an artifact array." })
  } else {
    value.artifacts.forEach((artifact, index) => {
      const validation = validateArtifactContract(artifact)
      validation.errors.forEach(({ path, message }) => {
        errors.push({
          path: `$.artifacts[${index}]${path.slice(1)}`,
          message
        })
      })
    })
  }

  const validateObjectArray = (
    key: string,
    validate: (record: Record<string, unknown>, path: string) => void
  ) => {
    const candidate = value[key]
    if (candidate === undefined) return
    if (!Array.isArray(candidate)) {
      errors.push({ path: `$.${key}`, message: "Expected an array." })
      return
    }
    candidate.forEach((entry, index) => {
      const path = `$.${key}[${index}]`
      if (!isRecord(entry)) {
        errors.push({ path, message: "Expected an object." })
        return
      }
      validate(entry, path)
    })
  }

  validateObjectArray("metrics", (metric, path) => {
    rejectUnknownKeys(
      metric,
      ["id", "label", "definition", "unit", "denominator", "version"],
      path,
      errors
    )
    for (const key of ["id", "label", "definition"] as const) {
      validateCollectionString(metric, key, path, errors, true)
    }
    for (const key of ["unit", "denominator", "version"] as const) {
      validateCollectionString(metric, key, path, errors)
    }
  })
  validateObjectArray("filters", (filter, path) => {
    rejectUnknownKeys(
      filter,
      ["id", "label", "value", "appliesToArtifactIds"],
      path,
      errors
    )
    validateCollectionString(filter, "id", path, errors, true)
    validateCollectionString(filter, "label", path, errors)
    validateCollectionStringArray(
      filter.appliesToArtifactIds,
      `${path}.appliesToArtifactIds`,
      errors,
      true
    )
  })
  validateObjectArray("views", (view, path) => {
    rejectUnknownKeys(
      view,
      [
        "artifactId",
        "metricIds",
        "filterIds",
        "selectionFingerprint",
        "summarySelectionFingerprint",
        "status"
      ],
      path,
      errors
    )
    validateCollectionString(view, "artifactId", path, errors, true)
    validateCollectionStringArray(view.metricIds, `${path}.metricIds`, errors)
    validateCollectionStringArray(view.filterIds, `${path}.filterIds`, errors)
    validateCollectionString(view, "selectionFingerprint", path, errors)
    validateCollectionString(view, "summarySelectionFingerprint", path, errors)
    if (
      view.status !== undefined &&
      !["ready", "stale", "failed", "unknown"].includes(String(view.status))
    ) {
      errors.push({
        path: `${path}.status`,
        message: "Expected one of: ready, stale, failed, unknown."
      })
    }
  })
  validateObjectArray("sourceRegistry", (source, path) => {
    rejectUnknownKeys(
      source,
      ["id", "label", "version", "fingerprint"],
      path,
      errors
    )
    validateCollectionString(source, "id", path, errors, true)
    for (const key of ["label", "version", "fingerprint"] as const) {
      validateCollectionString(source, key, path, errors)
    }
  })
  validateObjectArray("claimDependencies", (dependency, path) => {
    rejectUnknownKeys(
      dependency,
      ["artifactId", "claimId", "evidenceIds", "sourceIds"],
      path,
      errors
    )
    validateCollectionString(dependency, "artifactId", path, errors, true)
    validateCollectionString(dependency, "claimId", path, errors, true)
    validateCollectionStringArray(
      dependency.evidenceIds,
      `${path}.evidenceIds`,
      errors,
      true
    )
    validateCollectionStringArray(
      dependency.sourceIds,
      `${path}.sourceIds`,
      errors
    )
  })
  validateObjectArray("actions", (action, path) => {
    rejectUnknownKeys(
      action,
      [
        "id",
        "action",
        "actor",
        "actedAt",
        "claimIds",
        "artifactId",
        "artifactRevision",
        "policyId",
        "status",
        "invalidatedByClaimId"
      ],
      path,
      errors
    )
    validateCollectionString(action, "id", path, errors, true)
    validateCollectionString(action, "action", path, errors, true)
    validateCollectionStringArray(
      action.claimIds,
      `${path}.claimIds`,
      errors,
      true
    )
    for (const key of [
      "actedAt",
      "artifactId",
      "artifactRevision",
      "policyId",
      "invalidatedByClaimId"
    ] as const) {
      validateCollectionString(action, key, path, errors)
    }
    if (action.actor !== undefined) {
      validateActorRef(action.actor, `${path}.actor`, errors)
    }
    if (
      action.status !== undefined &&
      !["proposed", "taken", "reversed", "invalidated"].includes(
        String(action.status)
      )
    ) {
      errors.push({
        path: `${path}.status`,
        message: "Expected one of: proposed, taken, reversed, invalidated."
      })
    }
  })
  validateObjectArray("corrections", (correction, path) => {
    rejectUnknownKeys(
      correction,
      [
        "id",
        "affectedClaimIds",
        "replacementClaimIds",
        "reason",
        "createdAt",
        "createdBy",
        "scope"
      ],
      path,
      errors
    )
    validateCollectionString(correction, "id", path, errors, true)
    validateCollectionString(correction, "reason", path, errors, true)
    validateCollectionString(correction, "createdAt", path, errors)
    validateCollectionStringArray(
      correction.affectedClaimIds,
      `${path}.affectedClaimIds`,
      errors,
      true
    )
    validateCollectionStringArray(
      correction.replacementClaimIds,
      `${path}.replacementClaimIds`,
      errors
    )
    if (correction.createdBy !== undefined) {
      validateActorRef(correction.createdBy, `${path}.createdBy`, errors)
    }
    if (correction.scope !== undefined) {
      if (!isRecord(correction.scope)) {
        errors.push({ path: `${path}.scope`, message: "Expected an object." })
      } else {
        rejectUnknownKeys(
          correction.scope,
          ["affectedClaims", "replacementClaims"],
          `${path}.scope`,
          errors
        )
        if (correction.scope.affectedClaims !== undefined) {
          validateClaimReferenceArray(
            correction.scope.affectedClaims,
            `${path}.scope.affectedClaims`,
            errors
          )
        }
        if (correction.scope.replacementClaims !== undefined) {
          validateClaimReferenceArray(
            correction.scope.replacementClaims,
            `${path}.scope.replacementClaims`,
            errors
          )
        }
      }
    }
  })
  if (value.extensions !== undefined && !isRecord(value.extensions)) {
    errors.push({ path: "$.extensions", message: "Expected an object." })
  }

  if (errors.length === 0) {
    const audit = auditArtifactCollection(
      value as unknown as ArtifactCollectionContract
    )
    const referencePrefixes = [
      "collection.duplicate-",
      "collection.view-artifact.",
      "collection.view-filter.",
      "collection.view-metric.",
      "collection.filter-artifact.",
      "collection.claim-dependency.",
      "collection.dependency-evidence.",
      "collection.dependency-claim-evidence.",
      "collection.dependency-source.",
      "collection.action-",
      "collection.correction-",
      "collection.artifact-contract."
    ]
    for (const finding of audit.findings) {
      if (
        finding.status === "fail" &&
        referencePrefixes.some((prefix) => finding.id.startsWith(prefix))
      ) {
        errors.push({ path: finding.path ?? "$", message: finding.message })
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/** Preserve a collection as deterministic JSON and report validation loss. */
export function serializeArtifactCollection(
  value: unknown
): SerializedArtifactCollection {
  try {
    return serializeInspectedCollection(value)
  } catch {
    const paths = nonJsonValuePaths(value)
    return {
      transfer: {
        status: "invalid",
        omittedPaths: paths.length ? paths : ["$"],
        warnings: ["Artifact collection could not be inspected safely."]
      }
    }
  }
}

function serializeInspectedCollection(
  value: unknown
): SerializedArtifactCollection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      transfer: {
        status: "invalid",
        omittedPaths: ["collection"],
        warnings: ["Artifact collection must be a JSON object."]
      }
    }
  }
  const canonical = canonicalJson(value)
  const nonJsonPaths = [
    ...new Set([...canonical.excludedPaths, ...nonJsonValuePaths(value)])
  ].sort()
  const collection = canonical.value as JsonObject
  if (collection.collectionVersion !== "0.1") {
    return {
      collection,
      transfer: {
        status: nonJsonPaths.length > 0 ? "invalid" : "unsupported-version",
        omittedPaths: nonJsonPaths,
        warnings: [
          `Collection version ${String(collection.collectionVersion)} was preserved but is not interpreted by this runtime.`,
          ...(nonJsonPaths.length > 0
            ? [
                `Non-JSON values could not be preserved at: ${nonJsonPaths.join(", ")}.`
              ]
            : [])
        ]
      }
    }
  }
  const validation = validateArtifactCollection(collection)
  const errors = validation.errors.map(
    ({ path, message }) => `${path}: ${message}`
  )
  return {
    collection: collection as unknown as ArtifactCollectionContract,
    transfer: {
      status:
        errors.length === 0 && nonJsonPaths.length === 0
          ? "preserved"
          : "invalid",
      omittedPaths: nonJsonPaths,
      warnings: [
        ...errors,
        ...(nonJsonPaths.length
          ? [
              `Non-JSON values could not be preserved at: ${nonJsonPaths.join(", ")}.`
            ]
          : [])
      ]
    }
  }
}

/** Apply a collection correction without deleting the previous claim state. */
export function applyCollectionCorrection(
  collection: ArtifactCollectionContract,
  correction: CollectionCorrectionRecord
): ArtifactCollectionContract {
  const affectedReferences = scopedCorrectionReferences(
    collection,
    correction,
    "affected"
  )
  const replacementReferences = scopedCorrectionReferences(
    collection,
    correction,
    "replacement"
  )
  const allTargetsResolved =
    correctionScopeIsValid(collection, correction) &&
    correction.affectedClaimIds.every((claimId) =>
      affectedReferences.some((reference) => reference.claimId === claimId)
    ) &&
    (correction.replacementClaimIds ?? []).every((claimId) =>
      replacementReferences.some((reference) => reference.claimId === claimId)
    )
  if (!allTargetsResolved) {
    return {
      ...collection,
      corrections: [...(collection.corrections ?? []), correction]
    }
  }
  const affected = new Set(affectedReferences.map(claimReferenceKey))
  const replacement = new Set(replacementReferences.map(claimReferenceKey))
  return {
    ...collection,
    artifacts: collection.artifacts.map((artifact) => {
      const localAffectedClaimIds = affectedReferences
        .filter(({ artifactId }) => artifactId === artifact.artifact.id)
        .map(({ claimId }) => claimId)
      const localReplacementClaimIds = replacementReferences
        .filter(({ artifactId }) => artifactId === artifact.artifact.id)
        .map(({ claimId }) => claimId)
      if (
        localAffectedClaimIds.length === 0 &&
        localReplacementClaimIds.length === 0
      ) {
        return artifact
      }
      const recordsLocalCorrection =
        localAffectedClaimIds.length > 0 &&
        affectedReferences.every(
          ({ artifactId }) => artifactId === artifact.artifact.id
        ) &&
        replacementReferences.every(
          ({ artifactId }) => artifactId === artifact.artifact.id
        )
      const localCorrection: CorrectionRecord = {
        id: correction.id,
        affectedClaimIds: localAffectedClaimIds,
        ...(localReplacementClaimIds.length > 0
          ? { replacementClaimIds: localReplacementClaimIds }
          : {}),
        reason: correction.reason,
        ...(correction.createdAt ? { createdAt: correction.createdAt } : {}),
        ...(correction.createdBy ? { createdBy: correction.createdBy } : {})
      }
      const correctedArtifact: ArtifactContract = {
        ...artifact,
        claims: artifact.claims.map((claim) => {
          const key = claimReferenceKey({
            artifactId: artifact.artifact.id,
            claimId: claim.id
          })
          if (affected.has(key)) {
            return {
              ...claim,
              status:
                replacementReferences.length > 0 ? "superseded" : "retracted"
            }
          }
          if (replacement.has(key)) {
            return {
              ...claim,
              ...(localAffectedClaimIds.length > 0
                ? {
                    supersedes: [
                      ...new Set([
                        ...(claim.supersedes ?? []),
                        ...localAffectedClaimIds
                      ])
                    ]
                  }
                : {})
            }
          }
          return claim
        })
      }
      return recordsLocalCorrection
        ? {
            ...correctedArtifact,
            contestability: {
              ...artifact.contestability,
              corrections: [
                ...(artifact.contestability?.corrections ?? []),
                localCorrection
              ]
            }
          }
        : correctedArtifact
    }),
    corrections: [...(collection.corrections ?? []), correction]
  }
}

export { buildArtifactCollectionLineage } from "./collectionLineage"
