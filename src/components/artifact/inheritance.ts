import { canonicalJson, fingerprintValue } from "./fingerprint"
import { validateArtifactContract } from "./contract"
import { requireSerializableArtifactContract } from "./serialization"
import { nonJsonValuePaths } from "./jsonCompatibility"
import { boundEvidenceSample } from "./evidenceSample"
import { semanticContractErrors } from "./inheritanceIntegrity"
import {
  artifactPathContains as pathContains,
  artifactPathsOverlap as pathsOverlap,
  deleteArtifactExportPath as deleteExportPath,
  parseArtifactExportPath as parseExportPath
} from "./exportPaths"
import type {
  ArtifactContract,
  Claim,
  CorrectionRecord,
  EvidenceRef,
  PreservationClass,
  TemporalContext
} from "./types"

export type ArtifactTransferFormat =
  | "semiotic-config"
  | "portable-recipe"
  | "vega-lite"
  | "html"
  | "svg"
  | "png-sidecar"
  | "notebook"
  | "static-package"
  | "mcp"

export interface ArtifactTransferReport {
  format: ArtifactTransferFormat
  preservation: PreservationClass
  preservedPaths: string[]
  omittedPaths: string[]
  warnings: string[]
}

export interface ArtifactPacket {
  packetVersion: "0.1"
  artifactId: string
  contractFingerprint: string
  transferFingerprint: string
  contract: ArtifactContract
  transfer: ArtifactTransferReport
}

export interface ArtifactPacketValidation {
  valid: boolean
  errors: string[]
  packet?: ArtifactPacket
}

export interface CreateArtifactPacketOptions {
  format?: ArtifactTransferFormat
  includeEvidenceSamples?: boolean
  maxEvidenceRecords?: number
  maxClaims?: number
}

const FULL_FIDELITY_FORMATS = new Set<ArtifactTransferFormat>(
  "semiotic-config html notebook static-package mcp".split(
    " "
  ) as ArtifactTransferFormat[]
)
const SUPPORTED_TRANSFER_FORMATS = new Set<string>(
  "semiotic-config portable-recipe vega-lite html svg png-sidecar notebook static-package mcp".split(
    " "
  )
)
const PRESERVATION_CLASSES = new Set<PreservationClass>(
  "full-fidelity claim-evidence-preserved visual-only lossy unknown".split(
    " "
  ) as PreservationClass[]
)
const REQUIRED_CONTRACT_PATHS =
  "contractVersion artifact.id artifact.kind purpose.intents claims[].id claims[].kind claims[].status claims[].evidenceIds evidence[].id evidence[].role".split(
    " "
  )

function cloneContract(contract: ArtifactContract): ArtifactContract {
  return requireSerializableArtifactContract(contract).contract
}

function finiteLimit(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback
}

import { projectContractRecords } from "./recordProjection"

function transferFingerprint(
  artifactId: string,
  contractFingerprint: string,
  transfer: ArtifactTransferReport
): string {
  return fingerprintValue({
    packetVersion: "0.1",
    artifactId,
    contractFingerprint,
    transfer
  }).fingerprint
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function validateTransferReport(
  value: unknown,
  errors: string[]
): ArtifactTransferReport | undefined {
  const errorCount = errors.length
  if (!isRecord(value)) {
    errors.push("Artifact packet is missing its transfer report.")
    return undefined
  }
  const allowedKeys = new Set([
    "format",
    "preservation",
    "preservedPaths",
    "omittedPaths",
    "warnings"
  ])
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(`Artifact packet transfer has unexpected property "${key}".`)
    }
  }
  if (typeof value.format !== "string" || !value.format.trim()) {
    errors.push("Artifact packet transfer format must be a non-empty string.")
  } else if (!SUPPORTED_TRANSFER_FORMATS.has(value.format)) {
    errors.push("Artifact packet transfer format is not supported.")
  }
  if (
    typeof value.preservation !== "string" ||
    !PRESERVATION_CLASSES.has(value.preservation as PreservationClass)
  ) {
    errors.push("Artifact packet transfer preservation is not recognized.")
  }
  for (const key of ["preservedPaths", "omittedPaths", "warnings"] as const) {
    const field = value[key]
    if (!Array.isArray(field) || field.some((item) => typeof item !== "string"))
      errors.push(
        `Artifact packet transfer ${key} must be an array of strings.`
      )
  }
  const preservedPaths =
    Array.isArray(value.preservedPaths) &&
    value.preservedPaths.every((item) => typeof item === "string")
      ? (value.preservedPaths as string[])
      : undefined
  const omittedPaths =
    Array.isArray(value.omittedPaths) &&
    value.omittedPaths.every((item) => typeof item === "string")
      ? (value.omittedPaths as string[])
      : undefined
  if (
    preservedPaths &&
    omittedPaths &&
    preservedPaths.some((preserved) =>
      omittedPaths.some(
        (omitted) =>
          pathsOverlap(preserved, omitted) &&
          !allowsPartialEvidencePreservation(preserved, omitted)
      )
    )
  ) {
    errors.push(
      "Artifact packet transfer cannot report overlapping preserved and omitted paths."
    )
  }
  if (value.preservation === "full-fidelity" && omittedPaths?.length) {
    errors.push(
      "Artifact packet transfer cannot report full fidelity with omitted paths."
    )
  }
  if (
    typeof value.format === "string" &&
    SUPPORTED_TRANSFER_FORMATS.has(value.format) &&
    typeof value.preservation === "string" &&
    omittedPaths &&
    PRESERVATION_CLASSES.has(value.preservation as PreservationClass) &&
    value.preservation !==
      transferClass(value.format as ArtifactTransferFormat, omittedPaths)
  ) {
    errors.push(
      "Artifact packet transfer preservation does not match its format and omissions."
    )
  }
  return errors.length === errorCount
    ? (value as unknown as ArtifactTransferReport)
    : undefined
}

function isEvidenceSampleOmission(path: string): boolean {
  return pathContains("evidence[].sample", path)
}

function allowsPartialEvidencePreservation(
  preserved: string,
  omitted: string
): boolean {
  return preserved === "evidence" && isEvidenceSampleOmission(omitted)
}

function pathRemovesCoreClaimEvidence(path: string): boolean {
  if (path === "claims" || path.startsWith("claims[")) return true
  if (path === "evidence") return true
  return path.startsWith("evidence[") && !isEvidenceSampleOmission(path)
}

function pathPreventsPreservation(candidate: string, omitted: string): boolean {
  return (
    pathsOverlap(candidate, omitted) &&
    !allowsPartialEvidencePreservation(candidate, omitted)
  )
}

function transferClass(
  format: ArtifactTransferFormat,
  omittedPaths: ReadonlyArray<string>
): PreservationClass {
  if (omittedPaths.length === 0 && FULL_FIDELITY_FORMATS.has(format)) {
    return "full-fidelity"
  }
  const coreLost = omittedPaths.some(
    (path) => path === "time" || pathRemovesCoreClaimEvidence(path)
  )
  const rendererSemanticLoss =
    (format === "svg" || format === "vega-lite") &&
    omittedPaths.some((path) => !isEvidenceSampleOmission(path))
  if (!coreLost && !rendererSemanticLoss) return "claim-evidence-preserved"
  if (format === "svg" || format === "vega-lite") return "lossy"
  return "unknown"
}

export function createArtifactPacket(
  contract: ArtifactContract,
  options: CreateArtifactPacketOptions = {}
): ArtifactPacket {
  const format = options.format ?? "static-package"
  if (typeof format !== "string" || !format.trim()) {
    throw new TypeError("Artifact packet format must be a non-empty string.")
  }
  if (!SUPPORTED_TRANSFER_FORMATS.has(format)) {
    throw new TypeError(`Unsupported artifact packet format "${format}".`)
  }
  const portable = cloneContract(contract)
  const sourceSemanticErrors = semanticContractErrors(portable)
  if (sourceSemanticErrors.length > 0) {
    throw new TypeError(
      `Cannot create an artifact packet with broken semantic integrity: ${sourceSemanticErrors.join("; ")}`
    )
  }
  const omittedPaths: string[] = []
  const warnings: string[] = []
  const inheritance = contract.inheritance
  const prohibitedExports = inheritance?.prohibitedExports ?? []
  const prohibitsSamples = prohibitedExports.some((path) =>
    pathContains(path, "evidence[].sample")
  )
  const privacyBlocksSamples = inheritance?.privacy === "confidential"
  const restrictedNeedsOptIn =
    inheritance?.privacy === "restricted" &&
    options.includeEvidenceSamples !== true
  const rawDataDefault = inheritance?.rawDataDefault ?? "exclude"
  const hadSamples = portable.evidence.some(({ sample }) => Boolean(sample))
  let sampleMode: "deny" | "bounded" | "allow" =
    options.includeEvidenceSamples === false
      ? "deny"
      : options.includeEvidenceSamples === true
        ? rawDataDefault === "bounded"
          ? "bounded"
          : "allow"
        : rawDataDefault === "include"
          ? "allow"
          : rawDataDefault === "bounded"
            ? "bounded"
            : "deny"
  if (prohibitsSamples || privacyBlocksSamples || restrictedNeedsOptIn) {
    sampleMode = "deny"
  }

  if (sampleMode === "deny") {
    if (hadSamples) omittedPaths.push("evidence[].sample")
    for (const item of portable.evidence) delete item.sample
    if (hadSamples && prohibitsSamples) {
      warnings.push(
        "Evidence samples were omitted because the contract prohibits their export."
      )
    } else if (hadSamples && privacyBlocksSamples) {
      warnings.push(
        "Evidence samples were omitted because confidential artifacts cannot export raw samples."
      )
    } else if (hadSamples && restrictedNeedsOptIn) {
      warnings.push(
        "Evidence samples were omitted because restricted artifacts require an explicit export request."
      )
    }
  } else if (sampleMode === "bounded") {
    let bounded = false
    portable.evidence = portable.evidence.map((item) => {
      if (!item.sample) return item
      const sample = boundEvidenceSample(item.sample)
      if (JSON.stringify(sample) !== JSON.stringify(item.sample)) bounded = true
      return { ...item, sample }
    })
    if (bounded) omittedPaths.push("evidence[].sample[overflow]")
  }

  const policyRemovedPaths: string[] = []
  for (const path of prohibitedExports) {
    if (
      REQUIRED_CONTRACT_PATHS.some((required) => pathsOverlap(path, required))
    ) {
      throw new Error(
        `Cannot create an artifact packet because prohibited export path "${path}" removes required contract data.`
      )
    }
    const segments = parseExportPath(path)
    if (!segments) {
      throw new Error(`Unsupported prohibited export path: "${path}".`)
    }
    if (deleteExportPath(portable, segments)) {
      policyRemovedPaths.push(path)
      omittedPaths.push(path)
    }
  }
  if (policyRemovedPaths.length > 0) {
    const validation = validateArtifactContract(portable)
    if (!validation.valid) {
      throw new Error(
        `Cannot create an artifact packet because prohibited export paths leave an invalid contract: ${validation.errors
          .map(({ path, message }) => `${path}: ${message}`)
          .join("; ")}`
      )
    }
  }

  const maxEvidence = finiteLimit(
    options.maxEvidenceRecords,
    Number.MAX_SAFE_INTEGER
  )
  const maxClaims = finiteLimit(options.maxClaims, Number.MAX_SAFE_INTEGER)
  const originalClaims = portable.claims
  const originalEvidence = portable.evidence
  const projected = projectContractRecords(
    originalClaims,
    originalEvidence,
    maxClaims,
    maxEvidence
  )
  portable.claims = projected.claims
  portable.evidence = projected.evidence
  if (portable.claims.length < originalClaims.length)
    omittedPaths.push("claims[overflow]")
  if (portable.evidence.length < originalEvidence.length)
    omittedPaths.push("evidence[overflow]")
  if (projected.unresolvedClaims)
    omittedPaths.push("claims[unresolved-references]")

  const retainedClaimIds = new Set(portable.claims.map(({ id }) => id))
  let removedGeneratedClaimLink = false
  portable.evidence = portable.evidence.map((item) => {
    if (!item.generatedClaimId || retainedClaimIds.has(item.generatedClaimId)) {
      return item
    }
    removedGeneratedClaimLink = true
    const next = { ...item }
    delete next.generatedClaimId
    return next
  })
  if (removedGeneratedClaimLink)
    omittedPaths.push("evidence[].generatedClaimId[unresolved-claim]")

  if (portable.contestability?.challenges) {
    const before = portable.contestability.challenges
    portable.contestability.challenges = before.filter(
      ({ claimId, counterclaimId }) =>
        retainedClaimIds.has(claimId) &&
        (!counterclaimId || retainedClaimIds.has(counterclaimId))
    )
    if (portable.contestability.challenges.length < before.length) {
      omittedPaths.push("contestability.challenges[unresolved-claims]")
    }
  }
  if (portable.contestability?.corrections) {
    const before = portable.contestability.corrections
    portable.contestability.corrections = before.filter(
      ({ affectedClaimIds, replacementClaimIds }) =>
        affectedClaimIds.every((id) => retainedClaimIds.has(id)) &&
        (replacementClaimIds ?? []).every((id) => retainedClaimIds.has(id))
    )
    if (portable.contestability.corrections.length < before.length) {
      omittedPaths.push("contestability.corrections[unresolved-claims]")
    }
  }
  if (portable.accountability?.actions) {
    const before = portable.accountability.actions
    portable.accountability.actions = before.filter(
      ({ claimIds, invalidatedByClaimId }) =>
        claimIds.every((id) => retainedClaimIds.has(id)) &&
        (!invalidatedByClaimId || retainedClaimIds.has(invalidatedByClaimId))
    )
    if (portable.accountability.actions.length < before.length) {
      omittedPaths.push("accountability.actions[unresolved-claims]")
    }
  }

  if (format === "vega-lite") {
    let translationLoss = false
    if (portable.contestability) {
      omittedPaths.push("contestability")
      delete portable.contestability
      translationLoss = true
    }
    if (portable.accountability?.actions) {
      omittedPaths.push("accountability.actions")
      delete portable.accountability.actions
      translationLoss = true
    }
    if (portable.inheritance) {
      omittedPaths.push("inheritance")
      delete portable.inheritance
      translationLoss = true
    }
    if (translationLoss) {
      warnings.push(
        "The supported chart translation cannot carry the complete correction, action, and preservation record."
      )
    }
  }
  if (format === "svg") {
    warnings.push(
      "Embed or distribute this packet beside the SVG; the image markup alone is not a complete artifact."
    )
  }
  if (format === "png-sidecar") {
    warnings.push(
      "Keep this packet adjacent to the PNG because image pixels do not preserve its interpretation contract."
    )
  }
  const semanticErrors = semanticContractErrors(portable)
  if (semanticErrors.length > 0) {
    throw new TypeError(
      `Cannot create an artifact packet with broken semantic integrity: ${semanticErrors.join("; ")}`
    )
  }
  const uniqueOmittedPaths = [...new Set(omittedPaths)]
  for (const required of inheritance?.requiredPaths ?? []) {
    if (uniqueOmittedPaths.some((path) => pathsOverlap(path, required))) {
      warnings.push(`A required preservation path was omitted: ${required}.`)
    }
  }
  const candidatePreservedPaths = [
    "artifact",
    "purpose",
    "claims",
    "evidence",
    ...(portable.time ? ["time"] : []),
    ...(portable.reception ? ["reception"] : []),
    ...(portable.form ? ["form"] : []),
    ...(portable.contestability ? ["contestability"] : []),
    ...(portable.accountability ? ["accountability"] : []),
    ...(portable.inheritance ? ["inheritance"] : [])
  ]
  const preservedPaths = candidatePreservedPaths.filter(
    (candidate) =>
      !uniqueOmittedPaths.some((omitted) =>
        pathPreventsPreservation(candidate, omitted)
      )
  )
  const preservation = transferClass(format, uniqueOmittedPaths)
  const transfer: ArtifactTransferReport = {
    format,
    preservation,
    preservedPaths,
    omittedPaths: uniqueOmittedPaths,
    warnings
  }
  const artifactId = portable.artifact.id
  const contractFingerprint = fingerprintValue(portable).fingerprint
  return {
    packetVersion: "0.1",
    artifactId,
    contractFingerprint,
    transferFingerprint: transferFingerprint(
      artifactId,
      contractFingerprint,
      transfer
    ),
    contract: portable,
    transfer
  }
}

export function validateArtifactPacket(
  value: unknown
): ArtifactPacketValidation {
  try {
    return inspectArtifactPacket(value)
  } catch {
    return {
      valid: false,
      errors: ["Artifact packet could not be inspected safely."]
    }
  }
}

function inspectArtifactPacket(value: unknown): ArtifactPacketValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, errors: ["Artifact packet must be an object."] }
  }
  const incompatiblePaths = nonJsonValuePaths(value)
  if (incompatiblePaths.length > 0) {
    return {
      valid: false,
      errors: incompatiblePaths.map(
        (path) =>
          `Artifact packet contains a value that cannot survive JSON serialization at ${path}.`
      )
    }
  }
  const packet = value as Partial<ArtifactPacket>
  const errors: string[] = []
  const allowedKeys = new Set([
    "packetVersion",
    "artifactId",
    "contractFingerprint",
    "transferFingerprint",
    "contract",
    "transfer"
  ])
  for (const key of Object.keys(packet)) {
    if (!allowedKeys.has(key)) {
      errors.push(`Artifact packet has unexpected property "${key}".`)
    }
  }
  if (packet.packetVersion !== "0.1") {
    errors.push("Artifact packet has an unsupported packetVersion.")
  }
  if (typeof packet.artifactId !== "string" || !packet.artifactId) {
    errors.push("Artifact packet has no valid artifactId.")
  }
  if (
    typeof packet.contractFingerprint !== "string" ||
    !packet.contractFingerprint
  ) {
    errors.push("Artifact packet has no valid contract fingerprint.")
  }
  if (!packet.contract) {
    errors.push("Artifact packet is missing its contract.")
  } else {
    const validation = validateArtifactContract(packet.contract)
    errors.push(
      ...validation.errors.map(({ path, message }) => `${path}: ${message}`)
    )
    const expected = fingerprintValue(packet.contract).fingerprint
    if (packet.contractFingerprint !== expected) {
      errors.push("Artifact packet fingerprint does not match its contract.")
    }
    if (packet.artifactId !== packet.contract.artifact?.id) {
      errors.push("Artifact packet identity does not match its contract.")
    }
    if (validation.valid) {
      errors.push(
        ...semanticContractErrors(packet.contract).map(
          (message) =>
            `Artifact packet claim or evidence audit failed: ${message}`
        )
      )
    }
  }
  const transferErrors: string[] = []
  const transfer = validateTransferReport(packet.transfer, transferErrors)
  errors.push(...transferErrors)
  if (transfer && packet.contract && isRecord(packet.contract)) {
    const expectedPreservedPaths = [
      "artifact",
      "purpose",
      "claims",
      "evidence",
      ...(packet.contract.time ? ["time"] : []),
      ...(packet.contract.reception ? ["reception"] : []),
      ...(packet.contract.form ? ["form"] : []),
      ...(packet.contract.contestability ? ["contestability"] : []),
      ...(packet.contract.accountability ? ["accountability"] : []),
      ...(packet.contract.inheritance ? ["inheritance"] : [])
    ]
      .filter(
        (candidate) =>
          !transfer.omittedPaths.some((omitted) =>
            pathPreventsPreservation(candidate, omitted)
          )
      )
      .sort()
    const declaredPreservedPaths = [...transfer.preservedPaths].sort()
    if (
      JSON.stringify(expectedPreservedPaths) !==
      JSON.stringify(declaredPreservedPaths)
    ) {
      errors.push(
        "Artifact packet preserved paths do not match the contract and omissions."
      )
    }
  }
  if (
    typeof packet.transferFingerprint !== "string" ||
    !packet.transferFingerprint
  ) {
    errors.push("Artifact packet is missing its transfer fingerprint.")
  } else if (
    isRecord(packet.transfer) &&
    typeof packet.artifactId === "string" &&
    typeof packet.contractFingerprint === "string" &&
    packet.transferFingerprint !==
      transferFingerprint(
        packet.artifactId,
        packet.contractFingerprint,
        packet.transfer as unknown as ArtifactTransferReport
      )
  ) {
    errors.push(
      "Artifact packet transfer fingerprint does not match its report."
    )
  }
  return errors.length === 0
    ? {
        valid: true,
        errors,
        packet: canonicalJson(packet).value as unknown as ArtifactPacket
      }
    : { valid: false, errors }
}

export {
  diffArtifactContracts,
  type ArtifactContractChange
} from "./artifactContractDiff"

export interface CompactInheritancePacket {
  artifact: ArtifactContract["artifact"]
  purpose: ArtifactContract["purpose"]
  claims: Claim[]
  evidence: EvidenceRef[]
  time?: TemporalContext
  corrections?: CorrectionRecord[]
  accountability?: ArtifactContract["accountability"]
  inheritance?: ArtifactContract["inheritance"]
  fieldStatus?: ArtifactContract["fieldStatus"]
  omittedPaths: string[]
}

export function compactInheritancePacket(
  contract: ArtifactContract,
  options: { maxClaims?: number; maxEvidence?: number } = {}
): CompactInheritancePacket {
  const maxClaims = finiteLimit(options.maxClaims, 20)
  const maxEvidence = finiteLimit(options.maxEvidence, 20)
  const packet = createArtifactPacket(contract, {
    format: "mcp",
    includeEvidenceSamples: false,
    maxClaims,
    maxEvidenceRecords: maxEvidence
  })
  const projectedContract = packet.contract
  const omittedPaths = [...packet.transfer.omittedPaths]
  for (const path of ["reception", "form", "extensions"] as const) {
    if (projectedContract[path] !== undefined) omittedPaths.push(path)
  }
  for (const path of [
    "sourceRequestsAllowed",
    "alternativeViews",
    "challenges",
    "editorialExceptions"
  ] as const) {
    if (projectedContract.contestability?.[path] !== undefined) {
      omittedPaths.push(`contestability.${path}`)
    }
  }
  return {
    artifact: projectedContract.artifact,
    purpose: projectedContract.purpose,
    claims: projectedContract.claims,
    evidence: projectedContract.evidence,
    ...(projectedContract.time ? { time: projectedContract.time } : {}),
    ...(projectedContract.contestability
      ? { corrections: projectedContract.contestability?.corrections ?? [] }
      : {}),
    ...(projectedContract.accountability
      ? { accountability: projectedContract.accountability }
      : {}),
    ...(projectedContract.inheritance
      ? { inheritance: projectedContract.inheritance }
      : {}),
    ...(projectedContract.fieldStatus
      ? { fieldStatus: projectedContract.fieldStatus }
      : {}),
    omittedPaths: [...new Set(omittedPaths)]
  }
}

export function artifactContractScriptTag(packet: ArtifactPacket): string {
  const validation = validateArtifactPacket(packet)
  if (!validation.valid || !validation.packet) {
    throw new TypeError(
      `Artifact packet must be valid before HTML transfer: ${validation.errors.join("; ")}`
    )
  }
  const validatedPacket = validation.packet
  const json = JSON.stringify(validatedPacket)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
  const artifactId = validatedPacket.artifactId
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  return `<script type="application/json" data-semiotic-artifact="${artifactId}">${json}</script>`
}
