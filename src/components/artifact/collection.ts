import { fingerprintValue } from "./fingerprint"
import { summarizeObligations } from "./obligations"
import { auditClaims } from "./claims"
import {
  auditArtifactCollectionPolicy,
  type ArtifactCollectionAuditOptions
} from "./collectionPolicy"
import type { ArtifactContract, ObligationResult } from "./types"

import type {
  ArtifactCollectionContract,
  ArtifactCollectionAudit,
  CollectionClaimReference,
  MetricDefinition
} from "./collectionTypes"
export type * from "./collectionTypes"

function duplicateValues(values: ReadonlyArray<string>): string[] {
  const seen = new Set<string>()
  const duplicate = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value)
    seen.add(value)
  }
  return [...duplicate]
}

function normalized(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

function claimDirection(
  contract: ArtifactContract,
  claimId: string
): string | undefined {
  const direction = contract.claims.find(({ id }) => id === claimId)?.scope
    ?.direction
  return typeof direction === "string" ? direction : undefined
}

/** Audit failures that only become visible when individually valid views meet. */
export function auditArtifactCollection(
  collection: ArtifactCollectionContract,
  options: ArtifactCollectionAuditOptions = {}
): ArtifactCollectionAudit {
  const policyAudit = auditArtifactCollectionPolicy(collection, options)
  const findings: ObligationResult[] = [...policyAudit.findings]
  const policy = policyAudit.policy
  const artifactsById = new Map(
    collection.artifacts.map((artifact) => [artifact.artifact.id, artifact])
  )
  for (const id of duplicateValues(
    collection.artifacts.map(({ artifact }) => artifact.id)
  )) {
    findings.push({
      id: `collection.duplicate-artifact.${id}`,
      relation: "accountability",
      status: "fail",
      path: "artifacts",
      message: `Artifact identifier "${id}" appears more than once in the collection.`,
      repair: "Use one stable identifier per panel or artifact revision."
    })
  }
  for (const artifact of collection.artifacts) {
    for (const id of duplicateValues(artifact.claims.map(({ id }) => id))) {
      findings.push({
        id: `collection.duplicate-claim.${artifact.artifact.id}.${id}`,
        relation: "accountability",
        status: "fail",
        path: "artifacts[].claims",
        message: `Claim identifier "${id}" appears more than once in artifact "${artifact.artifact.id}".`
      })
    }
    for (const id of duplicateValues(artifact.evidence.map(({ id }) => id))) {
      findings.push({
        id: `collection.duplicate-evidence.${artifact.artifact.id}.${id}`,
        relation: "accountability",
        status: "fail",
        path: "artifacts[].evidence",
        message: `Evidence identifier "${id}" appears more than once in artifact "${artifact.artifact.id}".`
      })
    }
    const baselineClaimAudit = auditClaims(artifact)
    for (const finding of baselineClaimAudit.findings) {
      if (finding.status !== "fail") continue
      findings.push({
        ...finding,
        id: `collection.artifact-contract.${artifact.artifact.id}.${finding.id}`,
        path: finding.path
          ? `artifacts[${artifact.artifact.id}].${finding.path}`
          : `artifacts[${artifact.artifact.id}]`
      })
    }
  }

  const metricsById = new Map(
    (collection.metrics ?? []).map((metric) => [metric.id, metric])
  )
  for (const id of duplicateValues(
    (collection.metrics ?? []).map(({ id }) => id)
  )) {
    findings.push({
      id: `collection.duplicate-metric.${id}`,
      relation: "accountability",
      status: "fail",
      path: "metrics",
      message: `Metric identifier "${id}" appears more than once in the collection.`,
      repair: "Use one stable identifier per collection metric."
    })
  }
  const metricsByLabel = new Map<string, MetricDefinition[]>()
  for (const metric of collection.metrics ?? []) {
    const key = normalized(metric.label)
    metricsByLabel.set(key, [...(metricsByLabel.get(key) ?? []), metric])
  }
  for (const [label, metrics] of metricsByLabel) {
    const definitions = new Set(
      metrics.map(({ definition }) => normalized(definition))
    )
    const units = new Set(metrics.map(({ unit }) => normalized(unit)))
    const denominators = new Set(
      metrics.map(({ denominator }) => normalized(denominator))
    )
    if (definitions.size > 1) {
      findings.push({
        id: `collection.metric-definition.${label}`,
        relation: "claim-support",
        status: "fail",
        path: "metrics",
        message: `The label "${metrics[0].label}" refers to different metric definitions.`,
        repair: "Rename the metrics or use one shared versioned definition."
      })
    }
    if (units.size > 1) {
      findings.push({
        id: `collection.metric-unit.${label}`,
        relation: "representation-fit",
        status: "fail",
        path: "metrics",
        message: `The label "${metrics[0].label}" uses incompatible units across views.`,
        repair: "Normalize units or label each measure distinctly."
      })
    }
    if (denominators.size > 1) {
      findings.push({
        id: `collection.metric-denominator.${label}`,
        relation: "claim-support",
        status: "fail",
        path: "metrics",
        message: `The label "${metrics[0].label}" changes denominator across views.`,
        repair:
          "Use a shared denominator or disclose the difference in each label and claim."
      })
    }
  }

  const snapshotIds = new Set(
    collection.artifacts
      .map(({ time }) => time?.snapshot?.id)
      .filter((value): value is string => Boolean(value))
  )
  if (snapshotIds.size > 1) {
    findings.push({
      id: "collection.snapshot-skew",
      relation: "time",
      status: "warn",
      path: "artifacts[].time.snapshot.id",
      message: `The collection mixes ${snapshotIds.size} snapshot identities.`,
      repair: "Align snapshots or label each panel's time basis explicitly."
    })
  }
  const windows = new Set(
    collection.artifacts
      .map(({ time }) =>
        time?.window ? `${time.window.start}/${time.window.end}` : undefined
      )
      .filter((value): value is string => Boolean(value))
  )
  if (windows.size > 1) {
    findings.push({
      id: "collection.window-skew",
      relation: "time",
      status: "warn",
      path: "artifacts[].time.window",
      message: "Panels use incompatible time windows.",
      repair: "Align windows or make the differing comparison basis visible."
    })
  }
  const freshness = collection.artifacts.map(
    ({ time }) => time?.freshness?.status
  )
  if (freshness.includes("fresh") && freshness.includes("stale")) {
    findings.push({
      id: "collection.stale-panel",
      relation: "time",
      status: "fail",
      path: "artifacts[].time.freshness",
      message:
        "A stale panel appears beside fresh panels without a collection-level warning.",
      repair:
        "Refresh the panel, isolate it, or expose its stale state in the collection summary."
    })
  }

  const filtersById = new Map(
    (collection.filters ?? []).map((filter) => [filter.id, filter])
  )
  for (const id of duplicateValues(
    (collection.filters ?? []).map(({ id }) => id)
  )) {
    findings.push({
      id: `collection.duplicate-filter.${id}`,
      relation: "accountability",
      status: "fail",
      path: "filters",
      message: `Filter identifier "${id}" appears more than once in the collection.`,
      repair: "Use one stable identifier per collection filter."
    })
  }
  for (const filter of collection.filters ?? []) {
    const missingArtifacts = filter.appliesToArtifactIds.filter(
      (artifactId) => !artifactsById.has(artifactId)
    )
    if (missingArtifacts.length) {
      findings.push({
        id: `collection.filter-artifact.${filter.id}`,
        relation: "accountability",
        status: "fail",
        path: "filters",
        message: `Filter "${filter.id}" references missing artifacts: ${missingArtifacts.join(", ")}.`
      })
    }
  }
  for (const artifactId of duplicateValues(
    (collection.views ?? []).map(({ artifactId }) => artifactId)
  )) {
    findings.push({
      id: `collection.duplicate-view.${artifactId}`,
      relation: "accountability",
      status: "fail",
      path: "views",
      message: `Artifact "${artifactId}" has more than one collection view state.`
    })
  }
  for (const view of collection.views ?? []) {
    if (!artifactsById.has(view.artifactId)) {
      findings.push({
        id: `collection.view-artifact.${view.artifactId}`,
        relation: "accountability",
        status: "fail",
        path: "views",
        message: `A view references missing artifact "${view.artifactId}".`
      })
    }
    for (const metricId of view.metricIds ?? []) {
      if (!metricsById.has(metricId)) {
        findings.push({
          id: `collection.view-metric.${view.artifactId}.${metricId}`,
          relation: "claim-support",
          status: "fail",
          path: "views",
          message: `View "${view.artifactId}" references missing metric "${metricId}".`
        })
      }
    }
    for (const filterId of view.filterIds ?? []) {
      const filter = filtersById.get(filterId)
      if (!filter) {
        findings.push({
          id: `collection.view-filter.${view.artifactId}.${filterId}`,
          relation: "claim-support",
          status: "fail",
          path: "views",
          message: `View "${view.artifactId}" references missing filter "${filterId}".`
        })
      } else if (!filter.appliesToArtifactIds.includes(view.artifactId)) {
        findings.push({
          id: `collection.filter-scope.${view.artifactId}.${filterId}`,
          relation: "claim-support",
          status: "warn",
          path: "filters",
          message: `Filter "${filterId}" is shown on view "${view.artifactId}" but does not declare that scope.`,
          repair:
            "Align the visible control with the filter's declared panel scope."
        })
      }
    }
    if (
      view.selectionFingerprint &&
      view.summarySelectionFingerprint !== view.selectionFingerprint
    ) {
      findings.push({
        id: `collection.stale-summary.${view.artifactId}`,
        relation: "claim-support",
        status: "fail",
        path: "views",
        message: `Selection changed the evidence in "${view.artifactId}" without updating its dependent summary.`,
        repair:
          "Recompute the summary or mark it stale when selection state changes."
      })
    }
    if (view.status === "failed") {
      findings.push({
        id: `collection.panel-failed.${view.artifactId}`,
        relation: "reception",
        status: "warn",
        path: "views",
        message: `Panel "${view.artifactId}" failed; the remaining collection must not imply it is complete.`
      })
    }
  }

  const dependencies = collection.claimDependencies ?? []
  const seenMetricDirections = new Map<
    string,
    Array<{ artifactId: string; claimId: string; direction: string }>
  >()
  for (const dependency of dependencies) {
    const artifact = artifactsById.get(dependency.artifactId)
    const claim = artifact?.claims.find(({ id }) => id === dependency.claimId)
    if (!artifact || !claim) {
      findings.push({
        id: `collection.claim-dependency.${dependency.artifactId}.${dependency.claimId}`,
        relation: "claim-support",
        status: "fail",
        path: "claimDependencies",
        message: `A collection dependency references a missing artifact or claim (${dependency.artifactId}/${dependency.claimId}).`
      })
      continue
    }
    const missingEvidence = dependency.evidenceIds.filter(
      (id) => !artifact.evidence.some((evidence) => evidence.id === id)
    )
    if (missingEvidence.length) {
      findings.push({
        id: `collection.dependency-evidence.${dependency.claimId}`,
        relation: "claim-support",
        status: "fail",
        path: "claimDependencies",
        message: `Claim dependency "${dependency.claimId}" references missing evidence: ${missingEvidence.join(", ")}.`
      })
    }
    const unrelatedEvidence = dependency.evidenceIds.filter(
      (id) =>
        artifact.evidence.some((evidence) => evidence.id === id) &&
        !claim.evidenceIds.includes(id)
    )
    if (unrelatedEvidence.length) {
      findings.push({
        id: `collection.dependency-claim-evidence.${dependency.artifactId}.${dependency.claimId}`,
        relation: "claim-support",
        status: "fail",
        path: "claimDependencies",
        message: `Claim dependency "${dependency.claimId}" lists evidence not declared by the claim: ${unrelatedEvidence.join(", ")}.`,
        repair: "Link only evidence declared by the referenced claim."
      })
    }
    const availableSourceIds = new Set([
      ...(collection.sourceRegistry ?? []).map(({ id }) => id),
      ...(artifact.time?.sources ?? []).map(({ id }) => id)
    ])
    const missingSources = (dependency.sourceIds ?? []).filter(
      (id) => !availableSourceIds.has(id)
    )
    if (missingSources.length) {
      findings.push({
        id: `collection.dependency-source.${dependency.artifactId}.${dependency.claimId}`,
        relation: "accountability",
        status: "fail",
        path: "claimDependencies",
        message: `Claim dependency "${dependency.claimId}" references missing sources: ${missingSources.join(", ")}.`
      })
    }
    const metric = claim.scope?.metric
    const direction = claimDirection(artifact, claim.id)
    if (typeof metric === "string" && direction) {
      const key = metric.toLowerCase()
      seenMetricDirections.set(key, [
        ...(seenMetricDirections.get(key) ?? []),
        { artifactId: artifact.artifact.id, claimId: claim.id, direction }
      ])
    }
  }
  for (const [metric, entries] of seenMetricDirections) {
    const directions = new Set(entries.map(({ direction }) => direction))
    if (
      (directions.has("increase") && directions.has("decrease")) ||
      (directions.has("positive") && directions.has("negative"))
    ) {
      findings.push({
        id: `collection.contradictory-claims.${metric}`,
        relation: "claim-support",
        status: "warn",
        path: "claimDependencies",
        message: `Claims about "${metric}" point in contradictory directions across views.`,
        repair:
          "Reconcile scope, time window, filters, or metric definitions before combining the claims."
      })
    }
  }

  const everyClaim: Array<{
    artifactId: string
    claimId: string
    status: string
  }> = []
  for (const artifact of collection.artifacts) {
    for (const claim of artifact.claims) {
      everyClaim.push({
        artifactId: artifact.artifact.id,
        claimId: claim.id,
        status: claim.status
      })
    }
  }
  for (const id of duplicateValues(
    (collection.sourceRegistry ?? []).map(({ id }) => id)
  )) {
    findings.push({
      id: `collection.duplicate-source.${id}`,
      relation: "accountability",
      status: "fail",
      path: "sourceRegistry",
      message: `Source identifier "${id}" appears more than once in the collection.`
    })
  }
  for (const id of duplicateValues(
    (collection.actions ?? []).map(({ id }) => id)
  )) {
    findings.push({
      id: `collection.duplicate-action.${id}`,
      relation: "accountability",
      status: "fail",
      path: "actions",
      message: `Action identifier "${id}" appears more than once in the collection.`
    })
  }
  for (const action of collection.actions ?? []) {
    const actionArtifact = action.artifactId
      ? artifactsById.get(action.artifactId)
      : undefined
    if (action.artifactId && !actionArtifact) {
      findings.push({
        id: `collection.action-artifact.${action.id}.${action.artifactId}`,
        relation: "accountability",
        status: "fail",
        path: "actions",
        message: `Action "${action.id}" references missing artifact "${action.artifactId}".`
      })
    }
    if (
      action.artifactRevision &&
      actionArtifact &&
      action.artifactRevision !== actionArtifact.artifact.revision
    ) {
      findings.push({
        id: `collection.action-revision.${action.id}`,
        relation: "accountability",
        status: "fail",
        path: "actions",
        message: `Action "${action.id}" is bound to a different artifact revision.`
      })
    }
    if (action.invalidatedByClaimId) {
      const invalidatingClaims = everyClaim.filter(
        (candidate) =>
          candidate.claimId === action.invalidatedByClaimId &&
          (!action.artifactId || candidate.artifactId === action.artifactId)
      )
      if (invalidatingClaims.length === 0) {
        findings.push({
          id: `collection.action-invalidation-claim.${action.id}.${action.invalidatedByClaimId}`,
          relation: "accountability",
          status: "fail",
          path: "actions",
          message: `Action "${action.id}" references unknown invalidating claim "${action.invalidatedByClaimId}".`
        })
      } else if (!action.artifactId && invalidatingClaims.length > 1) {
        findings.push({
          id: `collection.action-invalidation-ambiguous.${action.id}.${action.invalidatedByClaimId}`,
          relation: "accountability",
          status: "fail",
          path: "actions",
          message: `Action "${action.id}" references invalidating claim "${action.invalidatedByClaimId}" in more than one artifact.`,
          repair:
            "Declare action.artifactId so the invalidation has one evidence path."
        })
      }
      if (action.status !== "invalidated") {
        findings.push({
          id: `collection.action-invalidation-status.${action.id}`,
          relation: "accountability",
          status: "fail",
          path: "actions",
          message: `Action "${action.id}" names an invalidating claim but is not marked invalidated.`
        })
      }
    }
    for (const claimId of action.claimIds) {
      const candidates = everyClaim.filter(
        (candidate) =>
          candidate.claimId === claimId &&
          (!action.artifactId || candidate.artifactId === action.artifactId)
      )
      if (candidates.length === 0) {
        findings.push({
          id: `collection.action-claim.${action.id}.${claimId}`,
          relation: "accountability",
          status: "fail",
          path: "actions",
          message: `Action "${action.id}" references unknown claim "${claimId}".`
        })
      } else if (!action.artifactId && candidates.length > 1) {
        findings.push({
          id: `collection.action-claim-ambiguous.${action.id}.${claimId}`,
          relation: "accountability",
          status: "fail",
          path: "actions",
          message: `Action "${action.id}" references claim "${claimId}" in more than one artifact.`,
          repair:
            "Declare action.artifactId so the action has one evidence path."
        })
      } else if (
        action.status !== "reversed" &&
        action.status !== "invalidated" &&
        candidates.some((candidate) =>
          ["superseded", "retracted"].includes(candidate.status)
        )
      ) {
        findings.push({
          id: `collection.action-invalidated.${action.id}.${claimId}`,
          relation: "abstention",
          status: "fail",
          path: "actions",
          message: `Action "${action.id}" still relies on superseded or retracted claim "${claimId}".`,
          repair:
            "Re-evaluate or reverse the action against the current claim revision."
        })
      }
    }
  }

  for (const id of duplicateValues(
    (collection.corrections ?? []).map(({ id }) => id)
  )) {
    findings.push({
      id: `collection.duplicate-correction.${id}`,
      relation: "accountability",
      status: "fail",
      path: "corrections",
      message: `Correction identifier "${id}" appears more than once in the collection.`
    })
  }
  for (const correction of collection.corrections ?? []) {
    const inspectCorrectionTargets = (
      kind: "affected" | "replacement",
      ids: ReadonlyArray<string>,
      references: ReadonlyArray<CollectionClaimReference> | undefined
    ): {
      valid: boolean
      targets: typeof everyClaim
    } => {
      const declaredIds = new Set(ids)
      const resolvedTargets = new Map<string, (typeof everyClaim)[number]>()
      let valid = true
      if (references !== undefined) {
        const scopedReferences = new Map(
          references.map((reference) => [
            JSON.stringify([reference.artifactId, reference.claimId]),
            reference
          ])
        )
        for (const reference of scopedReferences.values()) {
          if (!declaredIds.has(reference.claimId)) {
            valid = false
            findings.push({
              id: `collection.correction-scope-mismatch.${correction.id}.${kind}.${reference.artifactId}.${reference.claimId}`,
              relation: "accountability",
              status: "fail",
              path: "corrections",
              message: `Correction "${correction.id}" scopes claim "${reference.claimId}" without listing it as ${kind}.`
            })
            continue
          }
          const candidates = everyClaim.filter(
            (candidate) =>
              candidate.artifactId === reference.artifactId &&
              candidate.claimId === reference.claimId
          )
          if (candidates.length === 0) {
            valid = false
            findings.push({
              id: `collection.correction-claim.${correction.id}.${kind}.${reference.artifactId}.${reference.claimId}`,
              relation: "accountability",
              status: "fail",
              path: "corrections",
              message: `Correction "${correction.id}" references missing claim "${reference.artifactId}/${reference.claimId}".`
            })
          } else if (candidates.length > 1) {
            valid = false
            findings.push({
              id: `collection.correction-claim-ambiguous.${correction.id}.${kind}.${reference.artifactId}.${reference.claimId}`,
              relation: "accountability",
              status: "fail",
              path: "corrections",
              message: `Correction "${correction.id}" resolves ${kind} claim "${reference.artifactId}/${reference.claimId}" more than once.`,
              repair:
                "Use unique artifact and claim identifiers before applying the correction."
            })
          } else {
            resolvedTargets.set(
              JSON.stringify([candidates[0].artifactId, candidates[0].claimId]),
              candidates[0]
            )
          }
        }
        for (const claimId of declaredIds) {
          if (
            ![...scopedReferences.values()].some(
              (reference) => reference.claimId === claimId
            )
          ) {
            valid = false
            findings.push({
              id: `collection.correction-scope-missing.${correction.id}.${kind}.${claimId}`,
              relation: "accountability",
              status: "fail",
              path: "corrections",
              message: `Correction "${correction.id}" does not scope its ${kind} claim "${claimId}" to an artifact.`
            })
          }
        }
        return { valid, targets: [...resolvedTargets.values()] }
      }
      for (const claimId of declaredIds) {
        const candidates = everyClaim.filter(
          (candidate) => candidate.claimId === claimId
        )
        if (candidates.length === 0) {
          valid = false
          findings.push({
            id: `collection.correction-claim.${correction.id}.${kind}.${claimId}`,
            relation: "accountability",
            status: "fail",
            path: "corrections",
            message: `Correction "${correction.id}" references unknown ${kind} claim "${claimId}".`
          })
        } else if (candidates.length > 1) {
          valid = false
          findings.push({
            id: `collection.correction-claim-ambiguous.${correction.id}.${kind}.${claimId}`,
            relation: "accountability",
            status: "fail",
            path: "corrections",
            message: `Correction "${correction.id}" references ${kind} claim "${claimId}" in more than one artifact.`,
            repair: `Scope the ${kind} claim to an artifact.`
          })
        } else {
          resolvedTargets.set(
            JSON.stringify([candidates[0].artifactId, candidates[0].claimId]),
            candidates[0]
          )
        }
      }
      return { valid, targets: [...resolvedTargets.values()] }
    }

    const affected = inspectCorrectionTargets(
      "affected",
      correction.affectedClaimIds,
      correction.scope?.affectedClaims
    )
    const replacements = inspectCorrectionTargets(
      "replacement",
      correction.replacementClaimIds ?? [],
      correction.scope?.replacementClaims
    )
    if (affected.valid) {
      for (const target of affected.targets) {
        if (target.status === "superseded" || target.status === "retracted") {
          continue
        }
        findings.push({
          id: `collection.correction-affected-status.${correction.id}.${target.artifactId}.${target.claimId}`,
          relation: "challenge-and-correction",
          status: "fail",
          path: "corrections",
          message: `Correction "${correction.id}" affects claim "${target.artifactId}/${target.claimId}", but the claim remains ${target.status}.`,
          repair:
            "Preserve the affected claim and mark it superseded or retracted."
        })
      }
    }
    if (affected.valid && replacements.valid) {
      const replacementTargets = new Set(
        replacements.targets.map(({ artifactId, claimId }) =>
          JSON.stringify([artifactId, claimId])
        )
      )
      for (const target of affected.targets) {
        if (
          !replacementTargets.has(
            JSON.stringify([target.artifactId, target.claimId])
          )
        ) {
          continue
        }
        findings.push({
          id: `collection.correction-target-overlap.${correction.id}.${target.artifactId}.${target.claimId}`,
          relation: "challenge-and-correction",
          status: "fail",
          path: "corrections",
          message: `Correction "${correction.id}" names claim "${target.artifactId}/${target.claimId}" as both affected and replacement.`,
          repair: "Use a distinct replacement claim or omit the replacement."
        })
      }
    }
  }

  if (findings.length === 0) {
    findings.push({
      id: "collection.coherence",
      relation: "claim-support",
      status: "pass",
      message:
        "No cross-view definition, unit, time, filter, dependency, or action conflict was found."
    })
  }
  const summary = summarizeObligations(findings)
  return {
    ok: summary.fail === 0,
    ...(policy ? { policy: { id: policy.id, version: policy.version } } : {}),
    summary,
    findings
  }
}

export const auditDashboard = auditArtifactCollection

/** Stable identity for collection state and portable export comparisons. */
export function fingerprintArtifactCollection(
  collection: ArtifactCollectionContract
): string {
  return fingerprintValue(collection).fingerprint
}

export {
  applyCollectionCorrection,
  buildArtifactCollectionLineage,
  serializeArtifactCollection,
  validateArtifactCollection
} from "./collectionOperations"
export { affectedCollectionClaims } from "./collectionImpact"
