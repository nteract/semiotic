import { serializeArtifactContract } from "../artifact/serialization"
import type { EnvelopeRenderSection } from "./chartEvidenceEnvelope"
import { stableEvidenceHash } from "./stableJsonHash"

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

/** Validate the accessibility fields consumed by the publication gate. */
export function validateEnvelopeAccessibilityAudit(value: unknown, path: string): void {
  if (value === undefined) return
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be an accessibility audit object`)
  }
  const audit = value as Record<string, unknown>
  if (audit.ok !== undefined && typeof audit.ok !== "boolean") {
    throw new TypeError(`${path}.ok must be boolean`)
  }
  if (audit.findings === undefined) return
  if (!Array.isArray(audit.findings)) {
    throw new TypeError(`${path}.findings must be an array`)
  }
  for (const [index, finding] of audit.findings.entries()) {
    const findingPath = `${path}.findings[${index}]`
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) {
      throw new TypeError(`${findingPath} must be a finding object`)
    }
    if (finding.critical !== undefined && typeof finding.critical !== "boolean") {
      throw new TypeError(`${findingPath}.critical must be boolean`)
    }
    if (
      finding.status !== undefined &&
      !["pass", "fail", "warn", "manual", "not-applicable"].includes(finding.status)
    ) {
      throw new TypeError(`${findingPath}.status must be an accessibility finding status`)
    }
  }
}

/** A nested scene digest has no legacy form: it must always advertise v2. */
export function validateEnvelopeSceneHash(render: EnvelopeRenderSection): void {
  const evidence = render.evidence
  if (evidence !== undefined && !isRecord(evidence)) {
    throw new TypeError("Evidence envelope render evidence must be an object")
  }
  for (const section of [render, evidence]) {
    const requiresVersion =
      section?.sceneHashVersion !== undefined ||
      (section === evidence && section?.sceneHash !== undefined)
    if (
      requiresVersion &&
      (section?.sceneHashVersion !== 2 ||
        typeof section.sceneHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(section.sceneHash))
    ) {
      throw new TypeError("Evidence envelope requires a supported scene hash version and SHA-256 digest")
    }
  }
  if (render.sceneHash !== undefined && render.sceneHashVersion === undefined) {
    const inventory = evidence?.markCountByType
    // Legacy hashes were outer-only hashes of the observed mark inventory.
    // Do not treat missing v2 metadata as permission to accept an opaque hash.
    if (
      render.markInventoryHash !== undefined ||
      !isRecord(inventory) ||
      !Object.values(inventory).every(
        (count) => typeof count === "number" && Number.isSafeInteger(count) && count >= 0
      ) ||
      render.sceneHash !== stableEvidenceHash(inventory)
    ) {
      throw new TypeError("Evidence envelope legacy scene hash must identify its mark inventory")
    }
  }
  if (
    evidence &&
    (render.sceneHashVersion === 2 || evidence.sceneHashVersion === 2) &&
    (render.sceneHashVersion !== 2 ||
      evidence.sceneHashVersion !== 2 ||
      render.sceneHash !== evidence.sceneHash)
  ) {
    throw new TypeError("Evidence envelope scene hash does not match its render evidence")
  }
}

/** Validate both attachment locations before the gate can trust their reports. */
export function validateEnvelopeArtifactAttachment(
  attachment: { contract?: unknown; transfer?: unknown; binding?: unknown },
  path: string
): void {
  const { contract, transfer, binding } = attachment
  if (transfer !== undefined) {
    if (
      !isRecord(transfer) ||
      !["preserved", "unsupported-version", "invalid", "excluded"].includes(transfer.status as string) ||
      !isStringArray(transfer.omittedPaths) ||
      !isStringArray(transfer.warnings) ||
      (transfer.status === "preserved" && transfer.omittedPaths.length > 0) ||
      (transfer.status === "excluded" && transfer.omittedPaths.length === 0)
    ) {
      throw new TypeError(`Evidence envelope ${path} has an invalid transfer report`)
    }
  }
  if (
    binding !== undefined &&
    (!isRecord(binding) ||
      !["match", "mismatch", "unknown"].includes(binding.status as string) ||
      !isStringArray(binding.mismatchPaths) ||
      !isStringArray(binding.unknownPaths))
  ) {
    throw new TypeError(`Evidence envelope ${path} has an invalid identity binding`)
  }
  if (!isRecord(transfer)) return
  if (contract === undefined) {
    if (transfer.status === "preserved" || transfer.status === "excluded") {
      throw new TypeError(`Evidence envelope ${path} requires the contract its transfer report preserves`)
    }
    return
  }
  const restored = serializeArtifactContract(contract)
  const compatibleExcludedStatus =
    transfer.status === "excluded" &&
    restored.transfer.status === "preserved" &&
    isStringArray(transfer.omittedPaths) &&
    transfer.omittedPaths.length > 0
  if (restored.transfer.status !== transfer.status && !compatibleExcludedStatus) {
    throw new TypeError(`Evidence envelope ${path} transfer status does not match its contract`)
  }
}
