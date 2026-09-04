export interface ArtifactFieldPolicy {
  suppliedBy: ReadonlyArray<"author" | "system" | "model-proposal" | "import">
  derivable: boolean
  modelMayPropose: boolean
  humanReview: "never" | "policy-dependent" | "required"
}

function freezeFieldPolicies<T extends Record<string, ArtifactFieldPolicy>>(
  policies: T
): Readonly<T> {
  for (const policy of Object.values(policies)) {
    Object.freeze(policy.suppliedBy)
    Object.freeze(policy)
  }
  return Object.freeze(policies)
}

/**
 * Field authorship rules for the contract's externally meaningful values.
 * A model may suggest prose and decisions, but cannot manufacture source,
 * version, clock, review, or approval facts.
 */
export const ARTIFACT_FIELD_POLICIES: Readonly<
  Record<string, ArtifactFieldPolicy>
> = /* @__PURE__ */ freezeFieldPolicies({
  "artifact.id": {
    suppliedBy: ["author", "system", "import"],
    derivable: true,
    modelMayPropose: false,
    humanReview: "never"
  },
  "artifact.createdAt": {
    suppliedBy: ["author", "system", "import"],
    derivable: false,
    modelMayPropose: false,
    humanReview: "never"
  },
  "artifact.configFingerprint": {
    suppliedBy: ["system"],
    derivable: true,
    modelMayPropose: false,
    humanReview: "never"
  },
  "artifact.dataFingerprint": {
    suppliedBy: ["system"],
    derivable: true,
    modelMayPropose: false,
    humanReview: "never"
  },
  "purpose.intents": {
    suppliedBy: ["author", "system", "model-proposal", "import"],
    derivable: true,
    modelMayPropose: true,
    humanReview: "policy-dependent"
  },
  "purpose.communicativeAct": {
    suppliedBy: ["author", "system", "model-proposal", "import"],
    derivable: true,
    modelMayPropose: true,
    humanReview: "policy-dependent"
  },
  "purpose.stakes": {
    suppliedBy: ["author", "import"],
    derivable: false,
    modelMayPropose: true,
    humanReview: "required"
  },
  claims: {
    suppliedBy: ["author", "system", "model-proposal", "import"],
    derivable: true,
    modelMayPropose: true,
    humanReview: "policy-dependent"
  },
  "claims.status": {
    suppliedBy: ["author", "system", "import"],
    derivable: true,
    modelMayPropose: false,
    humanReview: "policy-dependent"
  },
  evidence: {
    suppliedBy: ["author", "system", "import"],
    derivable: true,
    modelMayPropose: false,
    humanReview: "policy-dependent"
  },
  "evidence.source": {
    suppliedBy: ["author", "system", "import"],
    derivable: true,
    modelMayPropose: false,
    humanReview: "policy-dependent"
  },
  "evidence.fingerprint": {
    suppliedBy: ["system"],
    derivable: true,
    modelMayPropose: false,
    humanReview: "never"
  },
  time: {
    suppliedBy: ["author", "system", "import"],
    derivable: true,
    modelMayPropose: false,
    humanReview: "policy-dependent"
  },
  "time.completeness": {
    suppliedBy: ["author", "system", "import"],
    derivable: true,
    modelMayPropose: false,
    humanReview: "policy-dependent"
  },
  reception: {
    suppliedBy: ["author", "system", "model-proposal", "import"],
    derivable: true,
    modelMayPropose: true,
    humanReview: "policy-dependent"
  },
  form: {
    suppliedBy: ["author", "system", "model-proposal", "import"],
    derivable: true,
    modelMayPropose: true,
    humanReview: "policy-dependent"
  },
  contestability: {
    suppliedBy: ["author", "system", "import"],
    derivable: false,
    modelMayPropose: false,
    humanReview: "required"
  },
  accountability: {
    suppliedBy: ["author", "system", "import"],
    derivable: false,
    modelMayPropose: false,
    humanReview: "policy-dependent"
  },
  inheritance: {
    suppliedBy: ["author", "system", "import"],
    derivable: true,
    modelMayPropose: false,
    humanReview: "policy-dependent"
  }
})
