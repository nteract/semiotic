import type { ArtifactIdentityBinding } from "./identity"
import type { ArtifactTransferStatus } from "./serialization"

export interface ArtifactAttachmentIssue {
  id: string
  status: "fail" | "unknown"
  message: string
}

/** Shared judgments for identity and transfer reports attached to evidence. */
export function artifactAttachmentIssues(attachment: {
  contract?: unknown
  transfer?: ArtifactTransferStatus
  binding?: ArtifactIdentityBinding
}): ArtifactAttachmentIssue[] {
  const { contract, transfer, binding } = attachment
  if (
    contract === undefined &&
    transfer === undefined &&
    binding === undefined
  ) {
    return []
  }
  const issues: ArtifactAttachmentIssue[] = []
  const mismatchPaths = Array.isArray(binding?.mismatchPaths)
    ? binding.mismatchPaths.filter((path) => typeof path === "string")
    : []
  if (
    transfer &&
    transfer.status !== "preserved" &&
    transfer.status !== "excluded"
  ) {
    issues.push({
      id: "artifact.transfer-invalid",
      status: "fail",
      message: `The attached artifact transfer is ${transfer.status}; its contract cannot be relied on for publication.`
    })
  } else if (!transfer || contract === undefined) {
    issues.push({
      id: "artifact.transfer-unknown",
      status: "unknown",
      message: "The attached artifact lacks a contract or a transfer report."
    })
  }
  // A positive summary must never erase explicit mismatches in its detail.
  if (binding?.status === "mismatch" || mismatchPaths.length > 0) {
    issues.push({
      id: "artifact.identity-mismatch",
      status: "fail",
      message: `The attached artifact does not identify this chart input${mismatchPaths.length ? `: ${mismatchPaths.join(", ")}` : "."}`
    })
  } else if (
    binding?.status !== "match" ||
    !Array.isArray(binding.mismatchPaths) ||
    !Array.isArray(binding.unknownPaths) ||
    binding.mismatchPaths.length > 0 ||
    binding.unknownPaths.length > 0
  ) {
    issues.push({
      id: "artifact.identity-unknown",
      status: "unknown",
      message: "The attached artifact identity has not been fully verified."
    })
  }
  return issues
}
