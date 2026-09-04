import { ARTIFACT_CONTRACT_VERSION } from "./types"
import { nonJsonValuePaths } from "./jsonCompatibility"
import {
  booleanIfPresent,
  jsonObjectIfPresent,
  jsonValuesAreValid,
  numberIfPresent
} from "./validationPrimitives"
import { validateArtifactSurfaces } from "./validationSurfaces"
import { validateArtifactFieldStatus } from "./validationFieldStatus"
import { validateTemporalStructure } from "./validationTemporal"

export interface ArtifactContractValidation {
  valid: boolean
  errors: Array<{ path: string; message: string }>
  warnings: Array<{ path: string; message: string }>
}

import {
  isRecord,
  rejectUnknownKeys,
  requiredString,
  enumString,
  optionalRecord,
  optionalArray,
  validateStringArray,
  enumStringIfPresent,
  stringIfPresent,
  validateActor
} from "./validationPrimitives"

/** Dependency-free structural validation for untrusted contract payloads. */
export function validateArtifactContract(
  value: unknown
): ArtifactContractValidation {
  try {
    return inspectArtifactContract(value)
  } catch {
    return {
      valid: false,
      errors: [
        {
          path: "$",
          message: "Artifact contract could not be inspected safely."
        }
      ],
      warnings: []
    }
  }
}

function inspectArtifactContract(value: unknown): ArtifactContractValidation {
  const errors: ArtifactContractValidation["errors"] = []
  const warnings: ArtifactContractValidation["warnings"] = []
  if (!isRecord(value)) {
    return {
      valid: false,
      errors: [{ path: "$", message: "Expected an object." }],
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
  rejectUnknownKeys(
    value,
    [
      "contractVersion",
      "artifact",
      "purpose",
      "claims",
      "evidence",
      "time",
      "reception",
      "form",
      "contestability",
      "accountability",
      "inheritance",
      "fieldStatus",
      "extensions"
    ],
    "$",
    errors
  )
  if (value.contractVersion !== ARTIFACT_CONTRACT_VERSION) {
    errors.push({
      path: "$.contractVersion",
      message: `Expected contract version ${ARTIFACT_CONTRACT_VERSION}.`
    })
  }
  if (!isRecord(value.artifact)) {
    errors.push({
      path: "$.artifact",
      message: "Expected an artifact identity object."
    })
  } else {
    rejectUnknownKeys(
      value.artifact,
      [
        "id",
        "kind",
        "component",
        "title",
        "createdAt",
        "configFingerprint",
        "dataFingerprint",
        "revision"
      ],
      "$.artifact",
      errors
    )
    requiredString(value.artifact, "id", "$.artifact", errors)
    enumString(
      value.artifact,
      "kind",
      "$.artifact",
      ["chart", "dashboard", "story", "alert", "agent-answer"],
      errors
    )
    for (const key of [
      "component",
      "title",
      "createdAt",
      "configFingerprint",
      "dataFingerprint",
      "revision"
    ]) {
      stringIfPresent(value.artifact, key, "$.artifact", errors)
    }
  }
  if (!isRecord(value.purpose)) {
    errors.push({ path: "$.purpose", message: "Expected a purpose object." })
  } else if (!Array.isArray(value.purpose.intents)) {
    errors.push({
      path: "$.purpose.intents",
      message: "Expected an intent array."
    })
  } else {
    rejectUnknownKeys(
      value.purpose,
      [
        "intents",
        "communicativeAct",
        "decisionContext",
        "stakes",
        "allowedUses",
        "prohibitedUses"
      ],
      "$.purpose",
      errors
    )
    value.purpose.intents.forEach((intent, index) => {
      if (!isRecord(intent) || typeof intent.id !== "string" || !intent.id) {
        errors.push({
          path: `$.purpose.intents[${index}].id`,
          message: "Expected a non-empty intent identifier."
        })
      }
      if (isRecord(intent)) {
        rejectUnknownKeys(
          intent,
          ["id", "strength", "source", "rationale"],
          `$.purpose.intents[${index}]`,
          errors
        )
      }
      if (isRecord(intent) && intent.strength !== undefined) {
        enumString(
          intent,
          "strength",
          `$.purpose.intents[${index}]`,
          ["primary", "secondary"],
          errors
        )
      }
      if (isRecord(intent)) {
        enumStringIfPresent(
          intent,
          "source",
          `$.purpose.intents[${index}]`,
          ["author", "derived", "model-proposal", "import"],
          errors
        )
        stringIfPresent(
          intent,
          "rationale",
          `$.purpose.intents[${index}]`,
          errors
        )
      }
    })
    for (const key of ["allowedUses", "prohibitedUses"]) {
      validateStringArray(
        optionalArray(value.purpose, key, "$.purpose", errors),
        `$.purpose.${key}`,
        errors
      )
    }
    enumStringIfPresent(
      value.purpose,
      "stakes",
      "$.purpose",
      ["exploratory", "informational", "operational", "high"],
      errors
    )
    stringIfPresent(value.purpose, "communicativeAct", "$.purpose", errors)
    stringIfPresent(value.purpose, "decisionContext", "$.purpose", errors)
  }
  if (!Array.isArray(value.claims)) {
    errors.push({ path: "$.claims", message: "Expected a claim array." })
  } else {
    value.claims.forEach((claim, index) => {
      if (!isRecord(claim)) {
        errors.push({
          path: `$.claims[${index}]`,
          message: "Expected a claim object."
        })
        return
      }
      rejectUnknownKeys(
        claim,
        [
          "id",
          "text",
          "kind",
          "status",
          "evidenceIds",
          "scope",
          "uncertainty",
          "asOf",
          "supersedes",
          "authoredBy",
          "review",
          "tags"
        ],
        `$.claims[${index}]`,
        errors
      )
      requiredString(claim, "id", `$.claims[${index}]`, errors)
      enumString(
        claim,
        "kind",
        `$.claims[${index}]`,
        [
          "description",
          "observation",
          "aggregation",
          "inference",
          "forecast",
          "simulation",
          "alert",
          "recommendation",
          "normative"
        ],
        errors
      )
      enumString(
        claim,
        "status",
        `$.claims[${index}]`,
        [
          "supported",
          "provisional",
          "disputed",
          "superseded",
          "retracted",
          "unsupported",
          "unknown"
        ],
        errors
      )
      if (!Array.isArray(claim.evidenceIds)) {
        errors.push({
          path: `$.claims[${index}].evidenceIds`,
          message: "Expected an evidence identifier array."
        })
      } else if (
        claim.evidenceIds.some((id) => typeof id !== "string" || !id)
      ) {
        errors.push({
          path: `$.claims[${index}].evidenceIds`,
          message: "Expected non-empty string evidence identifiers."
        })
      }
      validateStringArray(
        optionalArray(claim, "supersedes", `$.claims[${index}]`, errors),
        `$.claims[${index}].supersedes`,
        errors
      )
      stringIfPresent(claim, "text", `$.claims[${index}]`, errors)
      stringIfPresent(claim, "asOf", `$.claims[${index}]`, errors)
      jsonObjectIfPresent(claim, "scope", `$.claims[${index}]`, errors)
      validateStringArray(
        optionalArray(claim, "tags", `$.claims[${index}]`, errors),
        `$.claims[${index}].tags`,
        errors
      )
      if (claim.authoredBy !== undefined) {
        validateActor(claim.authoredBy, `$.claims[${index}].authoredBy`, errors)
      }
      const review = optionalRecord(
        claim,
        "review",
        `$.claims[${index}]`,
        errors
      )
      if (review) {
        rejectUnknownKeys(
          review,
          ["status", "reviewer", "reviewedAt", "rationale"],
          `$.claims[${index}].review`,
          errors
        )
        enumString(
          review,
          "status",
          `$.claims[${index}].review`,
          ["proposed", "reviewed", "approved", "rejected"],
          errors
        )
        if (review.reviewer !== undefined) {
          validateActor(
            review.reviewer,
            `$.claims[${index}].review.reviewer`,
            errors
          )
        }
        stringIfPresent(
          review,
          "reviewedAt",
          `$.claims[${index}].review`,
          errors
        )
        stringIfPresent(
          review,
          "rationale",
          `$.claims[${index}].review`,
          errors
        )
      }
      const uncertainty = optionalRecord(
        claim,
        "uncertainty",
        `$.claims[${index}]`,
        errors
      )
      if (uncertainty) {
        rejectUnknownKeys(
          uncertainty,
          ["kind", "lower", "upper", "confidence", "unit", "description"],
          `$.claims[${index}].uncertainty`,
          errors
        )
        enumString(
          uncertainty,
          "kind",
          `$.claims[${index}].uncertainty`,
          ["interval", "distribution", "qualitative", "unknown"],
          errors
        )
        for (const key of ["lower", "upper", "confidence"]) {
          numberIfPresent(
            uncertainty,
            key,
            `$.claims[${index}].uncertainty`,
            errors
          )
        }
        stringIfPresent(
          uncertainty,
          "unit",
          `$.claims[${index}].uncertainty`,
          errors
        )
        stringIfPresent(
          uncertainty,
          "description",
          `$.claims[${index}].uncertainty`,
          errors
        )
      }
    })
  }
  if (!Array.isArray(value.evidence)) {
    errors.push({ path: "$.evidence", message: "Expected an evidence array." })
  } else {
    value.evidence.forEach((evidence, index) => {
      if (!isRecord(evidence)) {
        errors.push({
          path: `$.evidence[${index}]`,
          message: "Expected an evidence object."
        })
        return
      }
      rejectUnknownKeys(
        evidence,
        [
          "id",
          "role",
          "label",
          "source",
          "fingerprint",
          "dataVersion",
          "observedAt",
          "scope",
          "sample",
          "transformation",
          "generatedClaimId",
          "relationship"
        ],
        `$.evidence[${index}]`,
        errors
      )
      requiredString(evidence, "id", `$.evidence[${index}]`, errors)
      enumString(
        evidence,
        "role",
        `$.evidence[${index}]`,
        [
          "source-data",
          "external-source",
          "transformation",
          "statistical-test",
          "model-output",
          "human-observation",
          "policy-rule",
          "quality-check"
        ],
        errors
      )
      for (const key of [
        "label",
        "fingerprint",
        "dataVersion",
        "observedAt",
        "generatedClaimId"
      ]) {
        stringIfPresent(evidence, key, `$.evidence[${index}]`, errors)
      }
      jsonObjectIfPresent(evidence, "scope", `$.evidence[${index}]`, errors)
      const source = optionalRecord(
        evidence,
        "source",
        `$.evidence[${index}]`,
        errors
      )
      if (source) {
        rejectUnknownKeys(
          source,
          ["name", "uri", "version", "retrievedAt", "publisher"],
          `$.evidence[${index}].source`,
          errors
        )
        for (const key of [
          "name",
          "uri",
          "version",
          "retrievedAt",
          "publisher"
        ]) {
          stringIfPresent(source, key, `$.evidence[${index}].source`, errors)
        }
      }
      const transformation = optionalRecord(
        evidence,
        "transformation",
        `$.evidence[${index}]`,
        errors
      )
      if (transformation) {
        rejectUnknownKeys(
          transformation,
          [
            "id",
            "kind",
            "description",
            "inputEvidenceIds",
            "parameters",
            "assumptions",
            "implementation",
            "performedAt",
            "performedBy"
          ],
          `$.evidence[${index}].transformation`,
          errors
        )
        requiredString(
          transformation,
          "id",
          `$.evidence[${index}].transformation`,
          errors
        )
        enumString(
          transformation,
          "kind",
          `$.evidence[${index}].transformation`,
          [
            "aggregation",
            "filter",
            "normalization",
            "binning",
            "join",
            "smoothing",
            "forecasting",
            "simulation",
            "other"
          ],
          errors
        )
        const inputs = optionalArray(
          transformation,
          "inputEvidenceIds",
          `$.evidence[${index}].transformation`,
          errors
        )
        if (!inputs) {
          errors.push({
            path: `$.evidence[${index}].transformation.inputEvidenceIds`,
            message: "Expected an evidence identifier array."
          })
        } else {
          validateStringArray(
            inputs,
            `$.evidence[${index}].transformation.inputEvidenceIds`,
            errors
          )
        }
        validateStringArray(
          optionalArray(
            transformation,
            "assumptions",
            `$.evidence[${index}].transformation`,
            errors
          ),
          `$.evidence[${index}].transformation.assumptions`,
          errors
        )
        stringIfPresent(
          transformation,
          "description",
          `$.evidence[${index}].transformation`,
          errors
        )
        stringIfPresent(
          transformation,
          "implementation",
          `$.evidence[${index}].transformation`,
          errors
        )
        stringIfPresent(
          transformation,
          "performedAt",
          `$.evidence[${index}].transformation`,
          errors
        )
        jsonObjectIfPresent(
          transformation,
          "parameters",
          `$.evidence[${index}].transformation`,
          errors
        )
        if (transformation.performedBy !== undefined) {
          validateActor(
            transformation.performedBy,
            `$.evidence[${index}].transformation.performedBy`,
            errors
          )
        }
      }
      const sample = optionalRecord(
        evidence,
        "sample",
        `$.evidence[${index}]`,
        errors
      )
      if (sample) {
        rejectUnknownKeys(
          sample,
          ["rowCount", "fields", "values", "truncated"],
          `$.evidence[${index}].sample`,
          errors
        )
        validateStringArray(
          optionalArray(
            sample,
            "fields",
            `$.evidence[${index}].sample`,
            errors
          ),
          `$.evidence[${index}].sample.fields`,
          errors
        )
        const values = optionalArray(
          sample,
          "values",
          `$.evidence[${index}].sample`,
          errors
        )
        if (values && !jsonValuesAreValid(values)) {
          errors.push({
            path: `$.evidence[${index}].sample.values`,
            message: "Expected JSON values."
          })
        }
        numberIfPresent(
          sample,
          "rowCount",
          `$.evidence[${index}].sample`,
          errors
        )
        booleanIfPresent(
          sample,
          "truncated",
          `$.evidence[${index}].sample`,
          errors
        )
      }
      enumStringIfPresent(
        evidence,
        "relationship",
        `$.evidence[${index}]`,
        ["descriptive", "correlational", "causal", "unknown"],
        errors
      )
    })
  }
  validateArtifactFieldStatus(value.fieldStatus, errors)
  const time = optionalRecord(value, "time", "$", errors)
  if (time) validateTemporalStructure(time, errors)
  validateArtifactSurfaces(value, errors)
  jsonObjectIfPresent(value, "extensions", "$", errors)
  if (Array.isArray(value.claims) && value.claims.length === 0) {
    warnings.push({
      path: "$.claims",
      message: "The contract declares no claims."
    })
  }
  if (Array.isArray(value.evidence) && value.evidence.length === 0) {
    warnings.push({
      path: "$.evidence",
      message: "The contract declares no evidence."
    })
  }
  return { valid: errors.length === 0, errors, warnings }
}
