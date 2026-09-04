import { canonicalJson } from "./fingerprint"
import { nonJsonValuePaths } from "./jsonCompatibility"
import { validateArtifactContract } from "./validation"
import {
  ARTIFACT_CONTRACT_VERSION,
  type ArtifactContract,
  type JsonObject
} from "./types"

export interface UnknownArtifactContract extends JsonObject {
  contractVersion: string
}

export type PortableArtifactContract =
  ArtifactContract | UnknownArtifactContract

export interface ArtifactTransferStatus {
  status: "preserved" | "unsupported-version" | "invalid" | "excluded"
  omittedPaths: string[]
  warnings: string[]
}

export interface SerializedArtifactContract {
  contract?: PortableArtifactContract
  transfer: ArtifactTransferStatus
}

export interface SerializeArtifactContractOptions {
  /** Remove bounded evidence samples while preserving their identities. */
  excludeEvidenceSamples?: boolean
}

export interface ArtifactContractMigrationResult {
  status: "current" | "unsupported-version" | "invalid"
  fromVersion?: string
  toVersion: typeof ARTIFACT_CONTRACT_VERSION
  contract?: PortableArtifactContract
  changes: string[]
  warnings: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function excludeEvidenceSamples(
  contract: PortableArtifactContract,
  enabled: boolean | undefined
): string[] {
  if (!enabled || !isRecord(contract) || !Array.isArray(contract.evidence)) {
    return []
  }

  const omittedPaths: string[] = []
  contract.evidence.forEach((item, index) => {
    if (
      isRecord(item) &&
      Object.prototype.hasOwnProperty.call(item, "sample")
    ) {
      delete item.sample
      omittedPaths.push(`$.evidence[${index}].sample`)
    }
  })
  return omittedPaths
}

/**
 * Clone an untrusted contract through deterministic JSON. Forward versions are
 * cloned without interpreting unknown fields and clearly marked unsupported.
 * Explicit evidence-sample exclusion remains privacy-first for every version.
 */
export function serializeArtifactContract(
  value: unknown,
  options: SerializeArtifactContractOptions = {}
): SerializedArtifactContract {
  try {
    return serializeInspectedContract(value, options)
  } catch {
    const paths = nonJsonValuePaths(value)
    return {
      transfer: {
        status: "invalid",
        omittedPaths: paths.length ? paths : ["$"],
        warnings: ["Artifact contract could not be inspected safely."]
      }
    }
  }
}

function serializeInspectedContract(
  value: unknown,
  options: SerializeArtifactContractOptions
): SerializedArtifactContract {
  if (!isRecord(value)) {
    return {
      transfer: {
        status: "invalid",
        omittedPaths: ["artifactContract"],
        warnings: ["Artifact contract must be a JSON object."]
      }
    }
  }
  const canonical = canonicalJson(value)
  const nonJsonPaths = [
    ...new Set([...canonical.excludedPaths, ...nonJsonValuePaths(value)])
  ].sort()
  const contract = canonical.value as PortableArtifactContract
  const requestedExclusions = excludeEvidenceSamples(
    contract,
    options.excludeEvidenceSamples
  )
  const exclusionWarnings = requestedExclusions.length
    ? ["Bounded evidence samples were excluded by the transfer policy."]
    : []
  const version = contract?.contractVersion
  if (typeof version !== "string" || !version) {
    return {
      contract,
      transfer: {
        status: "invalid",
        omittedPaths: [...nonJsonPaths, ...requestedExclusions],
        warnings: [
          "Artifact contract is missing a string contractVersion.",
          ...exclusionWarnings
        ]
      }
    }
  }
  if (version !== ARTIFACT_CONTRACT_VERSION) {
    return {
      contract,
      transfer: {
        status: nonJsonPaths.length > 0 ? "invalid" : "unsupported-version",
        omittedPaths: [...nonJsonPaths, ...requestedExclusions],
        warnings: [
          `Contract version ${version} is not interpreted by this runtime.`,
          ...(nonJsonPaths.length > 0
            ? [
                `Non-JSON values could not be preserved at: ${nonJsonPaths.join(", ")}.`
              ]
            : []),
          ...exclusionWarnings
        ]
      }
    }
  }
  const validation = validateArtifactContract(contract)
  const warnings = [
    ...validation.errors.map(({ path, message }) => `${path}: ${message}`),
    ...validation.warnings.map(({ path, message }) => `${path}: ${message}`),
    ...(nonJsonPaths.length
      ? [
          `Non-JSON values could not be preserved at: ${nonJsonPaths.join(", ")}.`
        ]
      : []),
    ...exclusionWarnings
  ]
  return {
    contract,
    transfer: {
      status:
        !validation.valid || nonJsonPaths.length > 0
          ? "invalid"
          : requestedExclusions.length > 0
            ? "excluded"
            : "preserved",
      omittedPaths: [...nonJsonPaths, ...requestedExclusions],
      warnings
    }
  }
}

export function requireSerializableArtifactContract(
  value: ArtifactContract
): SerializedArtifactContract & { contract: ArtifactContract } {
  const result = serializeArtifactContract(value)
  if (!result.contract || result.transfer.status !== "preserved") {
    throw new TypeError(
      result.transfer.warnings.join(" ") ||
        "Artifact contract could not be serialized without loss."
    )
  }
  return result as SerializedArtifactContract & { contract: ArtifactContract }
}

/**
 * Version-aware migration entry point. Version 0.1 is already current;
 * unknown versions are preserved but never guessed into a different shape.
 */
export function migrateArtifactContract(
  value: unknown
): ArtifactContractMigrationResult {
  const serialized = serializeArtifactContract(value)
  const fromVersion =
    typeof serialized.contract?.contractVersion === "string"
      ? serialized.contract.contractVersion
      : undefined
  if (!serialized.contract || serialized.transfer.status === "invalid") {
    return {
      status: "invalid",
      ...(fromVersion ? { fromVersion } : {}),
      toVersion: ARTIFACT_CONTRACT_VERSION,
      changes: [],
      warnings: serialized.transfer.warnings
    }
  }
  if (serialized.transfer.status === "unsupported-version") {
    return {
      status: "unsupported-version",
      ...(fromVersion ? { fromVersion } : {}),
      toVersion: ARTIFACT_CONTRACT_VERSION,
      contract: serialized.contract,
      changes: [],
      warnings: [
        ...serialized.transfer.warnings,
        "No registered deterministic migration can interpret this version."
      ]
    }
  }
  return {
    status: "current",
    fromVersion: ARTIFACT_CONTRACT_VERSION,
    toVersion: ARTIFACT_CONTRACT_VERSION,
    contract: serialized.contract,
    changes: [],
    warnings: serialized.transfer.warnings
  }
}
