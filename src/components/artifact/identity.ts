import type { Datum } from "../charts/shared/datumTypes"
import { fingerprintValue } from "./fingerprint"
import { nonJsonValuePaths } from "./jsonCompatibility"
import type { ArtifactContract, EvidenceRef } from "./types"

const DATA_KEYS: ReadonlyArray<string> = [
  "data",
  "nodes",
  "edges",
  "points",
  "areas",
  "lines",
  "flows"
]

/** Select the data-bearing props used by artifact identity checks. */
export function artifactDataValue(props: Datum): unknown {
  const present = Object.entries(props).filter(
    ([key, value]) => DATA_KEYS.includes(key) && value !== undefined
  )
  if (present.length === 0) return undefined
  if (present.length === 1 && present[0][0] === "data") return present[0][1]
  return Object.fromEntries(present)
}

/**
 * Bind data identity to declared transformations as well as input values.
 * Evidence order does not affect the result, but changing a transformation's
 * inputs, parameters, assumptions, or implementation does.
 */
export function artifactDataFingerprint(
  data: unknown,
  evidence: ReadonlyArray<EvidenceRef> = []
): string | undefined {
  if (data === undefined) return undefined
  const transformations = evidence
    .filter(
      (
        item
      ): item is EvidenceRef & {
        transformation: NonNullable<EvidenceRef["transformation"]>
      } => Boolean(item.transformation)
    )
    .map(({ id, transformation }) => ({ evidenceId: id, transformation }))
    .sort(({ evidenceId: left }, { evidenceId: right }) =>
      left < right ? -1 : left > right ? 1 : 0
    )
  return fingerprintValue(
    transformations.length > 0 ? { data, transformations } : data
  ).fingerprint
}

/** Select serializable configuration props without embedding chart rows. */
export function artifactConfigurationValue(props: Datum): Datum {
  return Object.fromEntries(
    Object.entries(props).filter(
      ([key]) => !DATA_KEYS.includes(key) && key !== "recipeId"
    )
  ) as Datum
}

export interface ArtifactIdentityBinding {
  status: "match" | "mismatch" | "unknown"
  mismatchPaths: string[]
  unknownPaths: string[]
}

/** Compare declared artifact identity with one concrete component/config/data input. */
export function compareArtifactIdentity(
  contract: ArtifactContract,
  props: Datum,
  component?: string,
  suppliedData: unknown = artifactDataValue(props)
): ArtifactIdentityBinding {
  const configuration = artifactConfigurationValue(props)
  const expectedConfiguration = nonJsonValuePaths(configuration).length === 0
    ? fingerprintValue(configuration).fingerprint
    : undefined
  const expectedData =
    suppliedData !== undefined && nonJsonValuePaths(suppliedData).length === 0
      ? artifactDataFingerprint(suppliedData, contract.evidence)
      : undefined
  const evaluatedComponent =
    component === "ChartRecipe" && typeof props.recipeId === "string"
      ? props.recipeId
      : component
  const mismatchPaths: string[] = []
  const unknownPaths: string[] = []

  if (evaluatedComponent !== undefined) {
    if (contract.artifact.component === undefined) {
      unknownPaths.push("artifact.component")
    } else if (contract.artifact.component !== evaluatedComponent) {
      mismatchPaths.push("artifact.component")
    }
  }
  if (
    contract.artifact.configFingerprint === undefined ||
    expectedConfiguration === undefined
  ) {
    unknownPaths.push("artifact.configFingerprint")
  } else if (contract.artifact.configFingerprint !== expectedConfiguration) {
    mismatchPaths.push("artifact.configFingerprint")
  }
  if (contract.artifact.dataFingerprint === undefined || !expectedData) {
    unknownPaths.push("artifact.dataFingerprint")
  } else if (contract.artifact.dataFingerprint !== expectedData) {
    mismatchPaths.push("artifact.dataFingerprint")
  }

  return {
    status:
      mismatchPaths.length > 0
        ? "mismatch"
        : unknownPaths.length > 0
          ? "unknown"
          : "match",
    mismatchPaths,
    unknownPaths
  }
}
