import { ARTIFACT_CONTRACT_VERSION } from "../artifact/types"
import type { ArtifactContract } from "../artifact/types"
import { validateArtifactContract } from "../artifact/validation"
import type {
  ChartEvidenceEnvelope,
  EnvelopeMeaningClaim
} from "./chartEvidenceEnvelope"

function referenceArray(value: unknown, path: string): void {
  if (
    value !== undefined &&
    (!Array.isArray(value) ||
      !value.every((id) => typeof id === "string" && id.trim().length > 0))
  ) {
    throw new TypeError(
      `Evidence envelope ${path} must be an array of non-empty evidence ids`
    )
  }
}

/** Validate fields whose types are needed to resolve support, before the gate runs. */
export function validateClaimReferences(envelope: ChartEvidenceEnvelope): void {
  if (envelope.meaning.claims !== undefined) {
    if (!Array.isArray(envelope.meaning.claims))
      throw new TypeError("Evidence envelope claims must be an array")
    for (const claim of envelope.meaning.claims) {
      if (
        !claim ||
        typeof claim !== "object" ||
        typeof claim.claim !== "string"
      ) {
        throw new TypeError("Evidence envelope claims require a claim string")
      }
      referenceArray(claim.evidenceIds, "claim.evidenceIds")
      if (claim.supported !== undefined && typeof claim.supported !== "boolean")
        throw new TypeError("Evidence envelope claim.supported must be boolean")
      validateAttribution(claim, "claim")
    }
  }
  const modality = envelope.modalityChecks
  for (const [channel, observations] of [
    ["structured", modality.structured.observations],
    ["vision", modality.vision.observations],
    ["tandem", modality.tandem.agreements]
  ] as const) {
    const model = modality[channel].model
    if (model != null && (typeof model !== "string" || !model.trim()))
      throw new TypeError(
        "Evidence envelope observation model must be a non-empty string"
      )
    for (const observation of observations) {
      if (!observation.id.trim())
        throw new TypeError(
          "Evidence envelope observation ids must be non-empty"
        )
      referenceArray(observation.evidenceRefs, `${channel}.evidenceRefs`)
      validateAttribution(observation, channel)
    }
  }
  const review = envelope.audit.humanReview
  if (
    review !== undefined &&
    (!review ||
      typeof review !== "object" ||
      Array.isArray(review) ||
      !["not-run", "passed", "failed", "manual-gap"].includes(review.status))
  ) {
    throw new TypeError("Evidence envelope humanReview requires a valid status")
  }
}

function validateAttribution(
  value: Pick<EnvelopeMeaningClaim, "confidence" | "model">,
  path: string
): void {
  if (
    value.confidence !== undefined &&
    (typeof value.confidence !== "number" || !Number.isFinite(value.confidence))
  )
    throw new TypeError(`Evidence envelope ${path} confidence must be finite`)
  if (
    value.model !== undefined &&
    (typeof value.model !== "string" || !value.model.trim())
  )
    throw new TypeError(
      `Evidence envelope ${path} model must be a non-empty string`
    )
}

interface Reference {
  model: boolean
  inputs: readonly string[]
  inputsScope: Map<string, Reference[]>
}

/** Resolve declared references only; arbitrary object paths are not evidence ids. */
export function claimReferenceIssues(
  envelope: ChartEvidenceEnvelope
): Array<{ id: string; claim: string; message: string }> {
  const declarations = new Map<string, Reference[]>()
  function add(
    id: string,
    model = false,
    inputs: readonly string[] = [],
    inputsScope = declarations
  ) {
    const reference = { model, inputs, inputsScope }
    const records = declarations.get(id) ?? []
    records.push(reference)
    declarations.set(id, records)
    if (inputsScope !== declarations) {
      const localRecords = inputsScope.get(id) ?? []
      localRecords.push(reference)
      inputsScope.set(id, localRecords)
    }
  }
  const paths: Array<[string, unknown]> = [
    ["input.hash", envelope.input.hash],
    ["input.profile", envelope.input.profile],
    ["transform.hash", envelope.transform.hash],
    ["render.sceneHash", envelope.render.sceneHash],
    ["render.imageHash", envelope.render.imageHash],
    ["render.markInventoryHash", envelope.render.markInventoryHash],
    ["render.evidence", envelope.render.evidence],
    ["meaning.grounding", envelope.meaning.grounding],
    ["meaning.grounding.description", envelope.meaning.grounding.description],
    ["meaning.grounding.facts", envelope.meaning.grounding.facts],
    ["meaning.grounding.physics", envelope.meaning.grounding.physics]
  ]
  for (const [path, value] of paths)
    if (value != null && value !== "") add(path)
  for (const section of [
    envelope.modalityChecks.structured,
    envelope.modalityChecks.vision
  ]) {
    for (const observation of section.observations)
      add(
        observation.id,
        !!(observation.model || section.model),
        observation.evidenceRefs
      )
  }
  for (const observation of envelope.modalityChecks.tandem.agreements)
    add(
      observation.id,
      !!(observation.model || envelope.modalityChecks.tandem.model),
      observation.evidenceRefs
    )
  // The outer contract is the portable, canonical copy of the render attachment.
  // Do not count that same evidence twice just because it is present in both.
  const contract =
    envelope.artifact?.contract ?? envelope.render.evidence?.artifactContract
  if (
    contract?.contractVersion === ARTIFACT_CONTRACT_VERSION &&
    validateArtifactContract(contract).valid
  ) {
    // Transformation inputs belong to this artifact, even when an envelope
    // record or observation uses the same spelling. Keep duplicates visible.
    const artifactScope = new Map<string, Reference[]>()
    for (const evidence of (contract as ArtifactContract).evidence)
      add(
        evidence.id,
        evidence.role === "model-output",
        evidence.transformation?.inputEvidenceIds,
        artifactScope
      )
  }

  const issues: Array<{ id: string; claim: string; message: string }> = []
  for (const claim of envelope.meaning.claims ?? []) {
    const unknown = new Set<string>()
    const ambiguous = new Set<string>()
    const cyclic = new Set<string>()
    const visited = new Set<Reference>()
    const active = new Set<Reference>()
    let model = !!claim.model
    const stack = (claim.evidenceIds ?? []).map((id) => ({
      id,
      scope: declarations,
      exit: false
    }))
    while (stack.length) {
      const step = stack.pop()!
      const records = step.scope.get(step.id)
      if (!records) {
        unknown.add(step.id)
        continue
      }
      if (records.length !== 1) {
        ambiguous.add(step.id)
        continue
      }
      const reference = records[0]
      if (step.exit) {
        active.delete(reference)
        visited.add(reference)
        continue
      }
      if (active.has(reference)) {
        cyclic.add(step.id)
        continue
      }
      if (visited.has(reference)) continue
      model ||= reference.model
      active.add(reference)
      stack.push({ ...step, exit: true })
      for (const id of reference.inputs)
        stack.push({ id, scope: reference.inputsScope, exit: false })
    }
    for (const [id, refs, description] of [
      ["claim.unknown-evidence", unknown, "missing"],
      ["claim.ambiguous-evidence", ambiguous, "ambiguous"],
      ["claim.evidence-cycle", cyclic, "cyclic"]
    ] as const) {
      if (refs.size)
        issues.push({
          id,
          claim: claim.claim,
          message: `Claim references ${description} evidence (${[...refs].join(", ")}): ${claim.claim}`
        })
    }
    if (model && envelope.audit.humanReview?.status !== "passed")
      issues.push({
        id: "claim.unreviewed-model",
        claim: claim.claim,
        message: `Model-authored claims or evidence require explicit passed human review: ${claim.claim}`
      })
  }
  return issues
}
