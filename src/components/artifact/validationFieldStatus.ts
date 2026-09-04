import { ARTIFACT_FIELD_POLICIES } from "./fieldPolicies"
import { booleanIfPresent } from "./validationPrimitives"

type ValidationError = { path: string; message: string }

import {
  isRecord,
  rejectUnknownKeys,
  stringIfPresent as optionalString
} from "./validationPrimitives"

/** Validate declared knowledge state against the field supplier registry. */
export function validateArtifactFieldStatus(
  value: unknown,
  errors: ValidationError[]
): void {
  if (value !== undefined && !isRecord(value)) {
    errors.push({
      path: "$.fieldStatus",
      message: "Expected a field-state object."
    })
    return
  }
  if (!isRecord(value)) return

  for (const [fieldPath, state] of Object.entries(value)) {
    const statePath = `$.fieldStatus.${fieldPath}`
    if (!isRecord(state) || typeof state.status !== "string") {
      errors.push({
        path: statePath,
        message: "Expected a field state with a status."
      })
      continue
    }
    rejectUnknownKeys(
      state,
      ["status", "reason", "suppliedBy", "derived", "reviewedBy"],
      statePath,
      errors
    )
    if (
      !["known", "unknown", "manual", "not-applicable"].includes(state.status)
    ) {
      errors.push({
        path: `${statePath}.status`,
        message: "Expected one of: known, unknown, manual, not-applicable."
      })
    }
    if (
      state.suppliedBy !== undefined &&
      (typeof state.suppliedBy !== "string" ||
        !["author", "system", "model-proposal", "import"].includes(
          state.suppliedBy
        ))
    ) {
      errors.push({
        path: `${statePath}.suppliedBy`,
        message: "Expected one of: author, system, model-proposal, import."
      })
    }
    optionalString(state, "reason", statePath, errors)
    optionalString(state, "reviewedBy", statePath, errors)
    booleanIfPresent(state, "derived", statePath, errors)

    const policy = Object.prototype.hasOwnProperty.call(
      ARTIFACT_FIELD_POLICIES,
      fieldPath
    )
      ? ARTIFACT_FIELD_POLICIES[fieldPath]
      : undefined
    const isModelProposal = state.suppliedBy === "model-proposal"
    const proposalIsAllowed =
      isModelProposal &&
      policy?.modelMayPropose === true &&
      state.status !== "known"
    if (
      policy &&
      state.status === "known" &&
      typeof state.suppliedBy !== "string"
    ) {
      errors.push({
        path: `${statePath}.suppliedBy`,
        message: `Known field "${fieldPath}" must identify an allowed supplier.`
      })
    }
    if (
      policy &&
      typeof state.suppliedBy === "string" &&
      !proposalIsAllowed &&
      !policy.suppliedBy.includes(
        state.suppliedBy as (typeof policy.suppliedBy)[number]
      )
    ) {
      errors.push({
        path: `${statePath}.suppliedBy`,
        message: `Field "${fieldPath}" cannot be supplied by ${state.suppliedBy}.`
      })
    }
    if (policy && state.derived === true && !policy.derivable) {
      errors.push({
        path: `${statePath}.derived`,
        message: `Field "${fieldPath}" cannot be marked as derived.`
      })
    }
    if (
      policy &&
      isModelProposal &&
      (!policy.modelMayPropose || state.status === "known")
    ) {
      errors.push({
        path: `${statePath}.suppliedBy`,
        message:
          state.status === "known"
            ? `A model proposal cannot finalize field "${fieldPath}" as known.`
            : `Field "${fieldPath}" does not accept model proposals.`
      })
    }
    if (
      policy?.humanReview === "required" &&
      state.status === "known" &&
      (typeof state.reviewedBy !== "string" || !state.reviewedBy.trim())
    ) {
      errors.push({
        path: `${statePath}.reviewedBy`,
        message: `Known field "${fieldPath}" requires an attributable human review.`
      })
    }
  }
}
