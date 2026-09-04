type ValidationIssue = { path: string; message: string }

import {
  isRecord,
  rejectUnknownKeys,
  requiredString,
  stringIfPresent,
  booleanIfPresent,
  numberIfPresent,
  enumString,
  enumStringIfPresent,
  optionalRecord,
  optionalArray,
  validateStringArray as stringArray,
  validateActor as actor
} from "./validationPrimitives"

function validateReception(
  value: Record<string, unknown>,
  errors: ValidationIssue[]
): void {
  const reception = optionalRecord(value, "reception", "$", errors)
  if (!reception) return
  rejectUnknownKeys(
    reception,
    [
      "channels",
      "audience",
      "strengths",
      "risks",
      "scaffolds",
      "description",
      "dataFallback",
      "manualChecks"
    ],
    "$.reception",
    errors
  )
  const channels = optionalArray(reception, "channels", "$.reception", errors)
  if (!channels) {
    errors.push({
      path: "$.reception.channels",
      message: "Expected a reception-channel array."
    })
  }
  channels?.forEach((channel, index) => {
    const path = `$.reception.channels[${index}]`
    if (!isRecord(channel)) {
      errors.push({ path, message: "Expected a channel object." })
      return
    }
    rejectUnknownKeys(
      channel,
      [
        "channel",
        "disclosure",
        "navigation",
        "interactionInstructions",
        "rawData",
        "tokenBudget",
        "privacyNotes"
      ],
      path,
      errors
    )
    enumString(
      channel,
      "channel",
      path,
      [
        "visual",
        "screen-reader",
        "sonified",
        "agent",
        "print",
        "low-bandwidth"
      ],
      errors
    )
    enumStringIfPresent(
      channel,
      "disclosure",
      path,
      ["summary", "standard", "detailed"],
      errors
    )
    enumStringIfPresent(
      channel,
      "rawData",
      path,
      ["deny", "bounded", "allow"],
      errors
    )
    booleanIfPresent(channel, "navigation", path, errors)
    booleanIfPresent(channel, "interactionInstructions", path, errors)
    numberIfPresent(channel, "tokenBudget", path, errors)
    stringArray(
      optionalArray(channel, "privacyNotes", path, errors),
      `${path}.privacyNotes`,
      errors
    )
  })
  for (const key of ["strengths", "risks", "scaffolds", "manualChecks"]) {
    stringArray(
      optionalArray(reception, key, "$.reception", errors),
      `$.reception.${key}`,
      errors
    )
  }
  stringIfPresent(reception, "audience", "$.reception", errors)
  stringIfPresent(reception, "description", "$.reception", errors)
  booleanIfPresent(reception, "dataFallback", "$.reception", errors)
}

function validateForm(
  value: Record<string, unknown>,
  errors: ValidationIssue[]
): void {
  const form = optionalRecord(value, "form", "$", errors)
  if (!form) return
  rejectUnknownKeys(
    form,
    ["chartFamily", "whyThisForm", "rejectedAlternatives", "risks", "misuse"],
    "$.form",
    errors
  )
  stringIfPresent(form, "chartFamily", "$.form", errors)
  stringIfPresent(form, "whyThisForm", "$.form", errors)
  stringArray(
    optionalArray(form, "risks", "$.form", errors),
    "$.form.risks",
    errors
  )
  stringArray(
    optionalArray(form, "misuse", "$.form", errors),
    "$.form.misuse",
    errors
  )
  optionalArray(form, "rejectedAlternatives", "$.form", errors)?.forEach(
    (alternative, index) => {
      const path = `$.form.rejectedAlternatives[${index}]`
      if (!isRecord(alternative)) {
        errors.push({ path, message: "Expected an alternative object." })
        return
      }
      rejectUnknownKeys(alternative, ["representation", "reason"], path, errors)
      requiredString(alternative, "representation", path, errors)
      requiredString(alternative, "reason", path, errors)
    }
  )
}

function validateContestability(
  value: Record<string, unknown>,
  errors: ValidationIssue[]
): void {
  const section = optionalRecord(value, "contestability", "$", errors)
  if (!section) return
  rejectUnknownKeys(
    section,
    [
      "sourceRequestsAllowed",
      "alternativeViews",
      "challenges",
      "corrections",
      "editorialExceptions"
    ],
    "$.contestability",
    errors
  )
  booleanIfPresent(section, "sourceRequestsAllowed", "$.contestability", errors)
  optionalArray(section, "challenges", "$.contestability", errors)?.forEach(
    (challenge, index) => {
      const path = `$.contestability.challenges[${index}]`
      if (!isRecord(challenge)) {
        errors.push({ path, message: "Expected a challenge object." })
        return
      }
      rejectUnknownKeys(
        challenge,
        [
          "id",
          "claimId",
          "status",
          "reason",
          "raisedBy",
          "raisedAt",
          "counterclaimId",
          "resolution"
        ],
        path,
        errors
      )
      requiredString(challenge, "id", path, errors)
      requiredString(challenge, "claimId", path, errors)
      requiredString(challenge, "reason", path, errors)
      enumString(
        challenge,
        "status",
        path,
        ["open", "accepted", "declined", "resolved"],
        errors
      )
      if (challenge.raisedBy !== undefined)
        actor(challenge.raisedBy, `${path}.raisedBy`, errors)
      for (const key of ["raisedAt", "counterclaimId", "resolution"]) {
        stringIfPresent(challenge, key, path, errors)
      }
    }
  )
  optionalArray(section, "corrections", "$.contestability", errors)?.forEach(
    (correction, index) => {
      const path = `$.contestability.corrections[${index}]`
      if (!isRecord(correction)) {
        errors.push({ path, message: "Expected a correction object." })
        return
      }
      rejectUnknownKeys(
        correction,
        [
          "id",
          "affectedClaimIds",
          "replacementClaimIds",
          "reason",
          "createdAt",
          "createdBy"
        ],
        path,
        errors
      )
      requiredString(correction, "id", path, errors)
      requiredString(correction, "reason", path, errors)
      const affected = optionalArray(
        correction,
        "affectedClaimIds",
        path,
        errors
      )
      if (!affected) {
        errors.push({
          path: `${path}.affectedClaimIds`,
          message: "Expected an affected-claim array."
        })
      }
      stringArray(affected, `${path}.affectedClaimIds`, errors)
      stringArray(
        optionalArray(correction, "replacementClaimIds", path, errors),
        `${path}.replacementClaimIds`,
        errors
      )
      stringIfPresent(correction, "createdAt", path, errors)
      if (correction.createdBy !== undefined)
        actor(correction.createdBy, `${path}.createdBy`, errors)
    }
  )
  optionalArray(
    section,
    "alternativeViews",
    "$.contestability",
    errors
  )?.forEach((alternative, index) => {
    const path = `$.contestability.alternativeViews[${index}]`
    if (!isRecord(alternative)) {
      errors.push({ path, message: "Expected an alternative-view object." })
      return
    }
    rejectUnknownKeys(alternative, ["id", "label", "rationale"], path, errors)
    requiredString(alternative, "id", path, errors)
    requiredString(alternative, "label", path, errors)
    stringIfPresent(alternative, "rationale", path, errors)
  })
  optionalArray(
    section,
    "editorialExceptions",
    "$.contestability",
    errors
  )?.forEach((exception, index) => {
    const path = `$.contestability.editorialExceptions[${index}]`
    if (!isRecord(exception)) {
      errors.push({ path, message: "Expected an editorial-exception object." })
      return
    }
    rejectUnknownKeys(
      exception,
      ["ruleId", "rationale", "owner", "reviewAt"],
      path,
      errors
    )
    requiredString(exception, "ruleId", path, errors)
    requiredString(exception, "rationale", path, errors)
    stringIfPresent(exception, "owner", path, errors)
    stringIfPresent(exception, "reviewAt", path, errors)
  })
}

function validateAccountability(
  value: Record<string, unknown>,
  errors: ValidationIssue[]
): void {
  const section = optionalRecord(value, "accountability", "$", errors)
  if (!section) return
  rejectUnknownKeys(
    section,
    ["authors", "generatedBy", "dataSources", "codeRef", "reviews", "actions"],
    "$.accountability",
    errors
  )
  optionalArray(section, "authors", "$.accountability", errors)?.forEach(
    (value, index) => actor(value, `$.accountability.authors[${index}]`, errors)
  )
  stringArray(
    optionalArray(section, "dataSources", "$.accountability", errors),
    "$.accountability.dataSources",
    errors
  )
  stringIfPresent(section, "generatedBy", "$.accountability", errors)
  stringIfPresent(section, "codeRef", "$.accountability", errors)
  optionalArray(section, "reviews", "$.accountability", errors)?.forEach(
    (review, index) => {
      const path = `$.accountability.reviews[${index}]`
      if (!isRecord(review)) {
        errors.push({ path, message: "Expected a review object." })
        return
      }
      rejectUnknownKeys(
        review,
        ["id", "status", "reviewer", "reviewedAt", "rationale", "policyId"],
        path,
        errors
      )
      requiredString(review, "id", path, errors)
      enumString(
        review,
        "status",
        path,
        ["pending", "approved", "changes-requested", "rejected"],
        errors
      )
      if (review.reviewer !== undefined)
        actor(review.reviewer, `${path}.reviewer`, errors)
      for (const key of ["reviewedAt", "rationale", "policyId"])
        stringIfPresent(review, key, path, errors)
    }
  )
  optionalArray(section, "actions", "$.accountability", errors)?.forEach(
    (action, index) => {
      const path = `$.accountability.actions[${index}]`
      if (!isRecord(action)) {
        errors.push({ path, message: "Expected an action object." })
        return
      }
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
      requiredString(action, "id", path, errors)
      requiredString(action, "action", path, errors)
      const claimIds = optionalArray(action, "claimIds", path, errors)
      if (!claimIds)
        errors.push({
          path: `${path}.claimIds`,
          message: "Expected a claim identifier array."
        })
      stringArray(claimIds, `${path}.claimIds`, errors)
      if (action.actor !== undefined)
        actor(action.actor, `${path}.actor`, errors)
      for (const key of [
        "actedAt",
        "artifactId",
        "artifactRevision",
        "policyId",
        "invalidatedByClaimId"
      ]) {
        stringIfPresent(action, key, path, errors)
      }
      enumStringIfPresent(
        action,
        "status",
        path,
        ["proposed", "taken", "reversed", "invalidated"],
        errors
      )
    }
  )
}

function validateInheritance(
  value: Record<string, unknown>,
  errors: ValidationIssue[]
): void {
  const section = optionalRecord(value, "inheritance", "$", errors)
  if (!section) return
  rejectUnknownKeys(
    section,
    [
      "requiredPaths",
      "prohibitedExports",
      "privacy",
      "rawDataDefault",
      "preservation",
      "sourceArtifactIds"
    ],
    "$.inheritance",
    errors
  )
  for (const key of [
    "requiredPaths",
    "prohibitedExports",
    "sourceArtifactIds"
  ]) {
    stringArray(
      optionalArray(section, key, "$.inheritance", errors),
      `$.inheritance.${key}`,
      errors
    )
  }
  enumStringIfPresent(
    section,
    "privacy",
    "$.inheritance",
    ["public", "restricted", "confidential", "unknown"],
    errors
  )
  enumStringIfPresent(
    section,
    "rawDataDefault",
    "$.inheritance",
    ["exclude", "bounded", "include"],
    errors
  )
  enumStringIfPresent(
    section,
    "preservation",
    "$.inheritance",
    [
      "full-fidelity",
      "claim-evidence-preserved",
      "visual-only",
      "lossy",
      "unknown"
    ],
    errors
  )
}

/** Validate optional public contract surfaces that are independent of claims. */
export function validateArtifactSurfaces(
  value: Record<string, unknown>,
  errors: ValidationIssue[]
): void {
  validateReception(value, errors)
  validateForm(value, errors)
  validateContestability(value, errors)
  validateAccountability(value, errors)
  validateInheritance(value, errors)
}
