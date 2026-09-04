import type { DescribeChartResult, DescribeLevel } from "../ai/describeChart"
import type { Datum } from "../charts/shared/datumTypes"
import type {
  ActorRef,
  ArtifactContract,
  Claim,
  ClaimChallenge,
  ClaimKind,
  CorrectionRecord,
  EvidenceRef
} from "./types"

export interface DescriptionClaimOptions {
  prefix?: string
  evidenceIds?: Partial<Record<DescribeLevel, ReadonlyArray<string>>>
  asOf?: string
  authoredBy?: ActorRef
}

export interface AnnotationClaimProjection {
  claims: Claim[]
  evidence: EvidenceRef[]
  unknownAnnotationIndexes: number[]
}

export interface AnnotationClaimOptions {
  prefix?: string
  defaultKind?: ClaimKind
}

const ANNOTATION_EVIDENCE_ROLES: Record<string, EvidenceRef["role"]> = {
  "human-note": "human-observation",
  "statistical-test": "statistical-test",
  rule: "policy-rule",
  "llm-inference": "model-output",
  "external-source": "external-source",
  computed: "transformation"
}

function annotationText(annotation: Datum): string | undefined {
  for (const key of ["label", "title", "note"]) {
    if (typeof annotation[key] === "string" && annotation[key]) {
      return annotation[key] as string
    }
  }
  return undefined
}

/**
 * Lift existing annotation origin and lifecycle blocks into artifact-wide
 * claim and evidence records. Missing source facts remain unknown, and model
 * output is recorded without allowing it to support the claim it generated.
 */
export function claimsFromAnnotations(
  annotations: ReadonlyArray<Datum>,
  options: AnnotationClaimOptions = {}
): AnnotationClaimProjection {
  const prefix = options.prefix ?? "annotation"
  const claims: Claim[] = []
  const evidence: EvidenceRef[] = []
  const unknownAnnotationIndexes: number[] = []

  annotations.forEach((annotation, index) => {
    const provenance =
      annotation.provenance && typeof annotation.provenance === "object"
        ? (annotation.provenance as Datum)
        : undefined
    const lifecycle =
      annotation.lifecycle && typeof annotation.lifecycle === "object"
        ? (annotation.lifecycle as Datum)
        : undefined
    const stableId =
      typeof provenance?.stableId === "string"
        ? provenance.stableId
        : `${prefix}.${index + 1}`
    const claimId = stableId.startsWith(`${prefix}.`)
      ? stableId
      : `${prefix}.${stableId}`
    const basis =
      typeof provenance?.basis === "string" ? provenance.basis : undefined
    const authorKind =
      typeof provenance?.authorKind === "string"
        ? provenance.authorKind
        : provenance?.source === "ai"
          ? "agent"
          : provenance?.source === "user"
            ? "human"
            : undefined
    const role = basis ? ANNOTATION_EVIDENCE_ROLES[basis] : undefined
    const generated = role === "model-output"
    const evidenceId = `${claimId}.evidence`
    const lifecycleStatus =
      typeof lifecycle?.status === "string" ? lifecycle.status : undefined
    const status: Claim["status"] =
      lifecycleStatus === "retracted"
        ? "retracted"
        : lifecycleStatus === "disputed"
          ? "disputed"
          : lifecycleStatus === "accepted" && role && !generated
            ? "supported"
            : lifecycleStatus === "proposed"
              ? "provisional"
              : "unknown"
    const supersedes =
      typeof lifecycle?.supersedes === "string"
        ? [
            lifecycle.supersedes.startsWith(`${prefix}.`)
              ? lifecycle.supersedes
              : `${prefix}.${lifecycle.supersedes}`
          ]
        : undefined

    if (!provenance) unknownAnnotationIndexes.push(index)
    if (role) {
      evidence.push({
        id: evidenceId,
        role,
        ...(typeof provenance?.author === "string"
          ? { label: provenance.author }
          : {}),
        ...(typeof provenance?.dataVersion === "string"
          ? { dataVersion: provenance.dataVersion }
          : {}),
        ...(typeof provenance?.createdAt === "string"
          ? { observedAt: provenance.createdAt }
          : {}),
        ...(generated ? { generatedClaimId: claimId } : {})
      })
    }
    claims.push({
      id: claimId,
      ...(annotationText(annotation)
        ? { text: annotationText(annotation) }
        : {}),
      kind: options.defaultKind ?? "observation",
      status,
      evidenceIds: role && !generated ? [evidenceId] : [],
      ...(typeof provenance?.createdAt === "string"
        ? { asOf: provenance.createdAt }
        : {}),
      ...(authorKind
        ? {
            authoredBy: {
              kind: authorKind,
              ...(typeof provenance?.author === "string"
                ? { name: provenance.author }
                : {})
            }
          }
        : {}),
      ...(supersedes ? { supersedes } : {}),
      ...(generated ? { review: { status: "proposed" as const } } : {}),
      tags: ["annotation-origin"]
    })
  })

  return { claims, evidence, unknownAnnotationIndexes }
}

const DESCRIPTION_KINDS: Record<DescribeLevel, ClaimKind> = {
  l1: "description",
  l2: "aggregation",
  l3: "observation",
  l4: "recommendation"
}

/** Turn layered generated descriptions into traceable claim records. */
export function claimsFromDescription(
  description: DescribeChartResult,
  options: DescriptionClaimOptions = {}
): Claim[] {
  const prefix = options.prefix ?? "description"
  return (Object.entries(description.levels) as Array<[DescribeLevel, string]>)
    .filter(([, text]) => Boolean(text))
    .map(([level, text]) => {
      const evidenceIds = [...(options.evidenceIds?.[level] ?? [])]
      const proposed = level === "l4" || evidenceIds.length === 0
      return {
        id: `${prefix}.${level}`,
        text,
        kind: DESCRIPTION_KINDS[level],
        status: evidenceIds.length > 0 ? "supported" : "unknown",
        evidenceIds,
        ...(options.asOf ? { asOf: options.asOf } : {}),
        ...(options.authoredBy ? { authoredBy: options.authoredBy } : {}),
        ...(proposed ? { review: { status: "proposed" as const } } : {}),
        tags: ["generated-description", level]
      }
    })
}

/** Preserve the old claim and append a replacement linked by stable id. */
export function supersedeClaim(
  contract: ArtifactContract,
  previousClaimId: string,
  replacement: Claim,
  correction?: Omit<
    CorrectionRecord,
    "affectedClaimIds" | "replacementClaimIds"
  >
): ArtifactContract {
  if (previousClaimId === replacement.id) {
    throw new Error("A replacement claim needs a distinct identifier.")
  }
  if (!contract.claims.some(({ id }) => id === previousClaimId)) {
    throw new Error(`Cannot supersede unknown claim "${previousClaimId}".`)
  }
  if (contract.claims.some(({ id }) => id === replacement.id)) {
    throw new Error(`Claim identifier "${replacement.id}" already exists.`)
  }
  const claims = contract.claims.map((claim) =>
    claim.id === previousClaimId
      ? { ...claim, status: "superseded" as const }
      : claim
  )
  claims.push({
    ...replacement,
    supersedes: [
      ...new Set([...(replacement.supersedes ?? []), previousClaimId])
    ]
  })
  const corrections = correction
    ? [
        ...(contract.contestability?.corrections ?? []),
        {
          ...correction,
          affectedClaimIds: [previousClaimId],
          replacementClaimIds: [replacement.id]
        }
      ]
    : contract.contestability?.corrections
  return {
    ...contract,
    claims,
    ...(corrections
      ? {
          contestability: {
            ...contract.contestability,
            corrections
          }
        }
      : {})
  }
}

/** Retract a claim without deleting its text, evidence, or revision history. */
export function retractClaim(
  contract: ArtifactContract,
  claimId: string,
  correction: Omit<CorrectionRecord, "affectedClaimIds">
): ArtifactContract {
  if (!contract.claims.some(({ id }) => id === claimId)) {
    throw new Error(`Cannot retract unknown claim "${claimId}".`)
  }
  return {
    ...contract,
    claims: contract.claims.map((claim) =>
      claim.id === claimId ? { ...claim, status: "retracted" as const } : claim
    ),
    contestability: {
      ...contract.contestability,
      corrections: [
        ...(contract.contestability?.corrections ?? []),
        { ...correction, affectedClaimIds: [claimId] }
      ]
    }
  }
}

/** Attach an attributable challenge and expose the claim as disputed. */
export function challengeClaim(
  contract: ArtifactContract,
  challenge: ClaimChallenge
): ArtifactContract {
  if (!contract.claims.some(({ id }) => id === challenge.claimId)) {
    throw new Error(`Cannot challenge unknown claim "${challenge.claimId}".`)
  }
  return {
    ...contract,
    claims: contract.claims.map((claim) =>
      claim.id === challenge.claimId && challenge.status === "open"
        ? { ...claim, status: "disputed" as const }
        : claim
    ),
    contestability: {
      ...contract.contestability,
      challenges: [...(contract.contestability?.challenges ?? []), challenge]
    }
  }
}
