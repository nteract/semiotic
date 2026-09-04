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

## Review follow-up: identity and untrusted transfer boundaries

Evidence IDs remain artifact-local. Collection impact accepts explicit references:

```ts
import { affectedCollectionClaims } from "semiotic/artifact"

const affected = affectedCollectionClaims(collection, [
  { artifactId: "panel-a", evidenceId: "rows" },
])
```

Unique legacy string IDs remain supported; ambiguous strings throw instead of marking unrelated
panels affected. Unknown legacy IDs remain no-ops. Explicit references must resolve, and duplicate
artifact identities are rejected. Propagation follows transformation inputs within the selected
artifact and terminates on cycles. No serialized contract field or version changes.

The related-surface audit also found temporal source/schema nodes merging across panels. Local
lineage IDs now include the artifact and, where needed, source kind; collection-registry sources
remain shared. Consumers should use returned node IDs and edges together, not construct local-source
IDs themselves. Claim/evidence nodes, correction scopes, and action targets already qualify local
identity; existing regressions retain that behavior.

SVG metadata, dashboard sizing, precision rounding, raster-export styling, and MCP theme insertion
share dependency-free root-tag lexer. It respects quoted attributes, XML preambles/comments, and
empty elements. Exact attribute handling avoids treating label text or `data-width` as geometry;
precision rounding preserves comments, CDATA, and XML preambles. MCP theme values are XML-escaped
and inserted without replacement-string expansion. This lexer is not an SVG sanitizer or a complete
XML validator. MCP's no-emit typecheck includes this one shared runtime helper; esbuild still emits
the standalone MCP executable.

Contract, collection, and packet validators fail closed on reflection/property-access errors.
Serializers and migration also report invalid input instead of leaking proxy exceptions. Descriptor
inspection does not invoke accessors and cleans up ancestor tracking on failure. These guards do not
provide a resource sandbox for executable proxies; network callers should supply parsed JSON.

Package-guidance checks now compare exact Context7 tokens (including nested subpaths) and compare
README entry counts with the canonical export inventory. The similarly named experimental-prefix
case is covered separately so a stable sibling cannot disappear from compatibility checks.

Regression evidence: [collection impact](../../src/components/artifact/collectionImpact.test.ts),
[local-source lineage](../../src/components/artifact/collectionLineage.test.ts),
[untrusted JSON boundaries](../../src/components/artifact/jsonCompatibility.test.ts),
[host transfer](../../src/components/artifact/hostTransfer.test.ts),
[SVG sizing](../../src/components/server/svgSizing.test.tsx),
[MCP themes](../../ai/svg-theme.test.ts), and the entry-inventory tests in `scripts/`.
