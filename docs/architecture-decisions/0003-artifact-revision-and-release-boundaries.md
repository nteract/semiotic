# 0003 — Artifact revision and release boundaries

Status: Accepted

Date: 2026-09-04

## Context

A fingerprint can identify content without proving a claim about it. Replacing an existing binding
during a repair can make stale support appear current. Likewise, a diagnostic result with open
manual work cannot authorize publication.

## Decision

- Every failed policy obligation forces refusal. A claims-required policy needs at least one active
  claim, even when representation recommendations are disabled.
- Automatic identity repair fills absent fields only. An existing component, configuration, or data
  mismatch requires an explicit revision and reassessment.
- Revision preparation verifies the previous binding. Data, evidence, and semantic-configuration
  changes require explicit supersession or retraction of every active claim until narrower
  dependency scopes are available. Changed evidence records need new identifiers so historical
  references retain meaning. Presentation-only edits need not retire claims.
- `publishable` is false for conditional and refused evaluations. Existing manual accessibility
  findings remain open; general review records do not discharge individual obligations.
- Artifact audits are opt-in. The ordinary renderer remains backward compatible and is not an
  institutional publication or action gate. CLI exit code 0 means no refusal, not approval. Hosts
  must inspect the returned status.

## Consequences and outstanding work

This conservative kernel prevents silent rebinding but can require broad claim reassessment. It does
not verify domain arithmetic, authenticate reviewers, or provide a revision-bound release decision.
Those need independently designed and tested host workflows. Strict examples intentionally withhold
packets while manual work remains; do not advertise a completed automated publication flow.

## Alternatives

Automatically rewriting fingerprints was rejected because it cannot establish that existing claims
or reviews apply to changed content. Treating conditional as approved, or treating a general review
record as proof that every manual check passed, was rejected because both hide unresolved
obligations.

## Implementation evidence

- [Evaluation and repair](../../src/components/artifact/evaluateArtifact.ts)
- [Revision preparation](../../src/components/artifact/artifactRevision.ts)
- [Policy and identity regressions](../../src/components/artifact/artifactReadiness.test.ts)
- [Revision regressions](../../src/components/artifact/artifactRevision.test.ts)
- [CLI parity](../../scripts/artifact-cli.test.mjs)
- [MCP parity](../../ai/mcp-artifact-contract.integration.test.ts)
