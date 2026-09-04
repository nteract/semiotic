# 0001: Move Intent into Structured Artifact Purpose

- Status: Accepted
- Date: 2026-09-03

## Context

Semiotic already represents analytical intent in chart suggestion APIs and the earlier
`IntentManifest`. The Artifact Contract needs the same information because claim checks,
representation choices, reader support, and use boundaries depend on declared purpose.

Treating intent as separate metadata would create two possible sources of truth. Replacing the
existing intent APIs immediately would break useful entry points. The contract therefore needs a
canonical location while older inputs migrate.

## Decision

The canonical wire contract stores intent at `purpose.intents`.

Each intent is an object with a stable `id` and may include `strength`, `source`, and a
plain-language `rationale`. The first entry marked `primary`, or otherwise the first entry, is the
leading purpose when a compatibility projection needs one.

`ArtifactContractInput` may continue to accept the root-level compatibility field `intents` as a
string, string array, or structured intent array. `buildArtifactContract` normalizes that field into
`purpose.intents`; when both the compatibility field and nested field are supplied, the
compatibility field currently takes precedence. Serializers and the JSON Schema emit only the
canonical nested form. New callers should supply `purpose.intents` and must not supply both forms.

`fromIntentManifest` imports the earlier manifest, marks its intents with `source: "import"`, and
retains the source manifest in a namespaced extension. `toIntentManifest` returns both the
compatibility projection and an `omittedPaths` list for richer fields the earlier format cannot
carry. Existing suggestion and manifest APIs remain supported; this decision does not rename them or
silently connect their output to a contract.

When no intent is available, the builder emits an empty `purpose.intents` array and records
`purpose.intents` as `unknown` in `fieldStatus`. Validation must not invent a purpose to remove that
state. A model-proposed intent remains labeled by its source and is subject to the field's
policy-dependent review rule.

## Consequences

- Evaluation has one stable path for representation-fit and use-boundary checks.
- Existing callers can migrate without an immediate public API break.
- Round trips have one wire representation even when inputs use a compatibility shortcut.
- An empty array is structurally valid but is not evidence that purpose was considered; the explicit
  field state carries that distinction.
- Removing the compatibility field requires separate deprecation and migration work.

## Alternatives considered

Keeping intent outside the contract was rejected because evaluators and exporters would need to
coordinate two versioned documents and resolve conflicts. A root-level canonical `intent` field was
rejected because decision context, stakes, and use boundaries belong to the same purpose section.
Immediate replacement of existing APIs was rejected because adapters establish the canonical model
with less disruption.

## Implementation evidence

- [`ArtifactContractInput` and `PurposeContract`](../../src/components/artifact/types.ts) define the
  compatibility input and canonical structure.
- [`buildArtifactContract`, `fromIntentManifest`, and `toIntentManifest`](../../src/components/artifact/contract.ts)
  implement normalization and loss-reporting adapters.
- [`contract-kernel.test.ts`](../../src/components/artifact/contract-kernel.test.ts) covers
  construction, unknown state, manifest round trips, and omitted paths.
- [`artifact-contract.schema.json`](../../spec/v0.1/artifact-contract.schema.json) defines the
  canonical wire field and its authorship and review annotations.

Removing the root-level compatibility input requires usage evidence, a migration period, and a
separate decision record.
