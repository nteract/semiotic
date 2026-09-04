import type { Datum } from "../charts/shared/datumTypes"
import { supersedeClaim, retractClaim } from "./claimLifecycle"
import { canonicalJson, fingerprintValue } from "./fingerprint"
import {
  buildArtifactGrounding,
  type ArtifactGrounding,
  type BuildArtifactGroundingOptions
} from "./grounding"
import {
  artifactConfigurationValue,
  artifactDataFingerprint,
  artifactDataValue,
  compareArtifactIdentity
} from "./identity"
import { nonJsonValuePaths } from "./jsonCompatibility"
import { evaluateArtifact } from "./evaluateArtifact"
import type {
  ArtifactEvaluation,
  EvaluateArtifactOptions
} from "./evaluateArtifactTypes"
import { updateTemporalContext } from "./temporalAdapters"
import type {
  ArtifactContract,
  Claim,
  CorrectionRecord,
  EvidenceRef,
  ReceptionChannel,
  TemporalContext
} from "./types"
import { validateArtifactContract } from "./validation"

export type ArtifactClaimTransition =
  | {
      action: "supersede"
      previousClaimId: string
      replacement: Claim
      correction: Omit<
        CorrectionRecord,
        "affectedClaimIds" | "replacementClaimIds"
      >
    }
  | {
      action: "retract"
      claimId: string
      correction: Omit<
        CorrectionRecord,
        "affectedClaimIds" | "replacementClaimIds"
      >
    }

export interface ArtifactRevisionPresentation {
  title?: string
  description?: string
  summary?: string
}

export interface PrepareArtifactRevisionOptions extends Omit<
  EvaluateArtifactOptions,
  "data"
> {
  /** Required stable revision label for the resulting artifact. */
  revision: string
  /** Optional new artifact id; the prior id is retained in source lineage. */
  artifactId?: string
  /** Explicit replacement for the primary `data` prop. */
  data?: ReadonlyArray<Datum>
  /** Other configuration or data-bearing prop updates. */
  propUpdates?: Datum
  /** Complete evidence ledger for the revised data and claims. */
  evidence?: ReadonlyArray<EvidenceRef>
  /** Temporal changes applied together with claims and presentation text. */
  time: TemporalContext
  presentation?: ArtifactRevisionPresentation
  claimTransitions?: ReadonlyArray<ArtifactClaimTransition>
  groundingChannels?: ReadonlyArray<ReceptionChannel>
  grounding?: Omit<BuildArtifactGroundingOptions, "channel">
}

export interface PreparedArtifactRevision {
  /** True only for an acceptable evaluation; conditional results need review. */
  publishable: boolean
  component: string
  props: Datum
  contract: ArtifactContract
  evaluation: ArtifactEvaluation
  grounding: Partial<Record<ReceptionChannel, ArtifactGrounding>>
  changedClaimIds: string[]
}

function serializableClone<T>(value: T): T {
  return canonicalJson(value).value as T
}

function correctionId(transition: ArtifactClaimTransition): string {
  return transition.correction.id
}

function requireClaimReassessment(
  currentProps: Datum,
  nextProps: Datum,
  current: ArtifactContract,
  next: ArtifactContract,
  transitions: ReadonlyArray<ArtifactClaimTransition>
): void {
  // Presentation-only edits do not change a claim's underlying evidence.
  // Until dependencies have a narrower scope, other changes require every
  // active claim to be explicitly superseded or retracted.
  const semanticConfiguration = (props: Datum) =>
    Object.fromEntries(
      Object.entries(artifactConfigurationValue(props)).filter(
        ([key]) =>
          ![
            "title",
            "description",
            "summary",
            "width",
            "height",
            "accessibleTable"
          ].includes(key)
      )
    )
  const snapshot = (props: Datum, contract: ArtifactContract) => ({
    component: props.recipeId ?? contract.artifact.component,
    data: artifactDataValue(props),
    configuration: semanticConfiguration(props),
    evidence: [...contract.evidence].sort((a, b) => a.id.localeCompare(b.id))
  })
  if (
    fingerprintValue(snapshot(currentProps, current)).fingerprint ===
    fingerprintValue(snapshot(nextProps, next)).fingerprint
  )
    return
  const reassessed = new Set(
    transitions.map((transition) =>
      transition.action === "supersede"
        ? transition.previousClaimId
        : transition.claimId
    )
  )
  const missing = current.claims.filter(
    ({ id, status }) =>
      status !== "superseded" && status !== "retracted" && !reassessed.has(id)
  )
  if (missing.length > 0) {
    throw new Error(
      `Changed data, evidence, or semantic configuration requires an explicit claim transition for: ${missing.map(({ id }) => id).join(", ")}.`
    )
  }
}

function applyClaimTransitions(
  contract: ArtifactContract,
  transitions: ReadonlyArray<ArtifactClaimTransition>
): { contract: ArtifactContract; changedClaimIds: string[] } {
  let next = contract
  const changedClaimIds: string[] = []
  const correctionIds = new Set(
    contract.contestability?.corrections?.map(({ id }) => id) ?? []
  )
  for (const transition of transitions) {
    if (correctionIds.has(transition.correction.id)) {
      throw new Error(
        `Correction identifier "${transition.correction.id}" is already in use.`
      )
    }
    correctionIds.add(transition.correction.id)
    if (transition.action === "supersede") {
      next = supersedeClaim(
        next,
        transition.previousClaimId,
        transition.replacement,
        transition.correction
      )
      changedClaimIds.push(
        transition.previousClaimId,
        transition.replacement.id
      )
    } else {
      next = retractClaim(next, transition.claimId, transition.correction)
      changedClaimIds.push(transition.claimId)
    }
  }
  return {
    contract: next,
    changedClaimIds: [...new Set(changedClaimIds)]
  }
}

function bindIdentity(
  contract: ArtifactContract,
  props: Datum,
  artifactId: string,
  revision: string
): ArtifactContract {
  const artifact = { ...contract.artifact, id: artifactId, revision }
  const configuration = artifactConfigurationValue(props)
  const data = artifactDataValue(props)
  const portableConfiguration = nonJsonValuePaths(configuration).length === 0
  const portableData =
    data !== undefined &&
    nonJsonValuePaths(data).length === 0 &&
    nonJsonValuePaths(contract.evidence).length === 0
  const fieldStatus = { ...contract.fieldStatus }

  if (portableConfiguration) {
    artifact.configFingerprint = fingerprintValue(configuration).fingerprint
    delete fieldStatus["artifact.configFingerprint"]
  } else {
    delete artifact.configFingerprint
    fieldStatus["artifact.configFingerprint"] = {
      status: "unknown",
      reason:
        "The revised configuration contains runtime-only values and cannot receive a portable identity.",
      suppliedBy: "system",
      derived: true
    }
  }
  if (portableData) {
    artifact.dataFingerprint = artifactDataFingerprint(data, contract.evidence)
    delete fieldStatus["artifact.dataFingerprint"]
  } else {
    delete artifact.dataFingerprint
    fieldStatus["artifact.dataFingerprint"] = {
      status: "unknown",
      reason:
        data === undefined
          ? "No serializable chart data was supplied."
          : "The revised data or evidence contains values that cannot receive a portable identity.",
      suppliedBy: "system",
      derived: true
    }
  }
  if (contract.claims.length > 0) delete fieldStatus.claims
  if (contract.evidence.length > 0) delete fieldStatus.evidence
  if (contract.time && Object.keys(contract.time).length > 0) {
    delete fieldStatus.time
  }

  const next: ArtifactContract = { ...contract, artifact, fieldStatus }
  if (Object.keys(fieldStatus).length === 0) delete next.fieldStatus
  return next
}

function revisionTime(
  currentId: string,
  current: TemporalContext | undefined,
  update: TemporalContext,
  transitions: ReadonlyArray<ArtifactClaimTransition>
): TemporalContext {
  const time = updateTemporalContext(current ?? {}, update)
  const revision = time.revision
  const correctionRevision =
    revision?.status === "corrected" || revision?.status === "backfilled"
  if (!correctionRevision) {
    if (transitions.length > 0) {
      throw new Error(
        "Claim transitions require a corrected or backfilled temporal revision."
      )
    }
    return time
  }
  if (transitions.length === 0) {
    throw new Error(
      "A correction or backfill revision requires an explicit claim transition."
    )
  }
  if (
    revision.previousArtifactId &&
    revision.previousArtifactId !== currentId
  ) {
    throw new Error(
      "The temporal revision must identify the artifact being revised."
    )
  }
  const ids = [...new Set(transitions.map(correctionId))]
  const linkedId =
    revision.correctionId ?? (ids.length === 1 ? ids[0] : undefined)
  if (!linkedId || !ids.includes(linkedId)) {
    throw new Error(
      "The temporal revision must link a correction created by this transition."
    )
  }
  return {
    ...time,
    revision: {
      ...revision,
      previousArtifactId: currentId,
      correctionId: linkedId
    }
  }
}

/**
 * Prepare one immutable artifact revision. Data, claims, visible text, time,
 * identities, evaluation, and channel grounding all derive from the same
 * snapshot. Conditional and refused results return `publishable: false`;
 * this helper cannot discharge manual checks or authorize publication.
 */
export function prepareArtifactRevision(
  component: string,
  currentProps: Datum,
  currentContract: ArtifactContract,
  options: PrepareArtifactRevisionOptions
): PreparedArtifactRevision {
  const currentValidation = validateArtifactContract(currentContract)
  if (!currentValidation.valid) {
    throw new Error(
      `Cannot revise an invalid artifact contract: ${currentValidation.errors
        .map(({ path, message }) => `${path}: ${message}`)
        .join("; ")}`
    )
  }
  if (!options.revision.trim()) {
    throw new Error("An artifact revision needs a non-empty revision label.")
  }
  if (options.revision === currentContract.artifact.revision) {
    throw new Error("The revised artifact needs a new revision label.")
  }
  const currentComponent =
    component === "ChartRecipe" && typeof currentProps.recipeId === "string"
      ? currentProps.recipeId
      : component
  if (
    compareArtifactIdentity(currentContract, currentProps, currentComponent)
      .status === "mismatch"
  ) {
    throw new Error("The current props must match the artifact being revised.")
  }

  const {
    artifactId = currentContract.artifact.id,
    revision,
    data,
    propUpdates,
    evidence,
    time: timeUpdate,
    presentation,
    claimTransitions = [],
    groundingChannels,
    grounding: groundingOptions,
    ...evaluationOptions
  } = options
  const nextProps: Datum = {
    ...currentProps,
    ...propUpdates,
    ...(data !== undefined ? { data } : {}),
    ...(presentation?.title !== undefined ? { title: presentation.title } : {}),
    ...(presentation?.description !== undefined
      ? { description: presentation.description }
      : {}),
    ...(presentation?.summary !== undefined
      ? { summary: presentation.summary }
      : {})
  }
  const baseContract = serializableClone(currentContract)
  if (evidence !== undefined) {
    const previousEvidence = new Map(
      currentContract.evidence.map((item) => [item.id, item])
    )
    for (const item of evidence) {
      const previous = previousEvidence.get(item.id)
      if (
        previous &&
        fingerprintValue(previous).fingerprint !==
          fingerprintValue(item).fingerprint
      ) {
        throw new Error(
          `Changed evidence "${item.id}" needs a new identifier to preserve revision history.`
        )
      }
    }
    baseContract.evidence = [...evidence]
  }
  requireClaimReassessment(
    currentProps,
    nextProps,
    currentContract,
    baseContract,
    claimTransitions
  )
  const transitioned = applyClaimTransitions(baseContract, claimTransitions)
  const time = revisionTime(
    currentContract.artifact.id,
    currentContract.time,
    timeUpdate,
    claimTransitions
  )
  const visibleTitle =
    typeof nextProps.title === "string" ? nextProps.title : undefined
  const visibleDescription =
    typeof nextProps.description === "string"
      ? nextProps.description
      : undefined
  const titleWasUpdated =
    presentation?.title !== undefined ||
    Object.prototype.hasOwnProperty.call(propUpdates ?? {}, "title")
  const descriptionWasUpdated =
    presentation?.description !== undefined ||
    Object.prototype.hasOwnProperty.call(propUpdates ?? {}, "description")
  const artifact = {
    ...transitioned.contract.artifact,
    id: artifactId,
    revision
  }
  if (titleWasUpdated) {
    if (visibleTitle === undefined) delete artifact.title
    else artifact.title = visibleTitle
  }
  const reception = transitioned.contract.reception
    ? { ...transitioned.contract.reception }
    : descriptionWasUpdated
      ? { channels: [] }
      : undefined
  if (descriptionWasUpdated && reception) {
    if (visibleDescription === undefined) delete reception.description
    else reception.description = visibleDescription
  }
  let contract: ArtifactContract = {
    ...transitioned.contract,
    time,
    artifact,
    ...(reception ? { reception } : {}),
    inheritance: {
      ...transitioned.contract.inheritance,
      sourceArtifactIds: [
        ...new Set([
          ...(transitioned.contract.inheritance?.sourceArtifactIds ?? []),
          currentContract.artifact.id
        ])
      ]
    }
  }
  contract = bindIdentity(contract, nextProps, artifactId, revision)
  const validation = validateArtifactContract(contract)
  if (!validation.valid) {
    throw new Error(
      `The revised artifact contract is invalid: ${validation.errors
        .map(({ path, message }) => `${path}: ${message}`)
        .join("; ")}`
    )
  }
  contract = serializableClone(contract)

  const evaluation = evaluateArtifact(
    component,
    nextProps,
    contract,
    evaluationOptions
  )
  const channels: ReceptionChannel[] = [
    ...new Set<ReceptionChannel>(
      groundingChannels ??
        contract.reception?.channels.map(({ channel }) => channel) ?? [
          "visual" as const
        ]
    )
  ]
  const grounding: Partial<Record<ReceptionChannel, ArtifactGrounding>> = {}
  for (const channel of channels) {
    grounding[channel] = buildArtifactGrounding(
      component,
      nextProps,
      contract,
      {
        ...groundingOptions,
        channel
      }
    )
  }
  return {
    publishable: evaluation.status === "acceptable",
    component,
    props: nextProps,
    contract,
    evaluation,
    grounding,
    changedClaimIds: transitioned.changedClaimIds
  }
}
