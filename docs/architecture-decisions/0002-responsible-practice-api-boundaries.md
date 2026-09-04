# 0002: Responsible Practice Uses Descriptive API Names

- Status: Accepted
- Date: 2026-09-03

## Context

The Artifact Contract brings together accessibility, evidence, provenance, temporal systems,
editorial review, export, and chart selection. The design needs a responsible-practice doctrine, but
a single conceptual label would be difficult for new users to discover and would make stable API
names depend on specialized vocabulary.

The implementation needs names that work in TypeScript, JSON, command output, and documentation
while leaving room to explain the broader rationale.

## Decision

Responsible practice is expressed as versioned data, inspectable obligations, and explicit limits
rather than as an assurance label:

1. Purpose, claims, evidence, time, reception requirements, correction paths, accountability, and
   transfer requirements travel with the artifact.
2. Deterministic checks report only what their inputs establish.
3. `unknown`, `manual`, and `not-applicable` remain distinct from success.
4. Refusal, waiting, a table, or no chart can be valid outcomes.
5. Revisions preserve claim, evidence, correction, and lineage relationships.

These are engineering constraints, not a claim that the library certifies truth, accessibility,
fairness, or suitability for every audience.

### Public API and naming

The renderer-independent entry is `semiotic/artifact`. Its core object is `ArtifactContract`, and
its wire discriminator is `contractVersion`. Builders, validators, evaluators, and serializers use
descriptive names including `buildArtifactContract`, `validateArtifactContract`, `evaluateArtifact`,
and `serializeArtifactContract`.

The wire format uses `artifact`, `purpose`, `claims`, `evidence`, `time`, `reception`, `form`,
`contestability`, `accountability`, and `inheritance`. Status values use operational words including
`known`, `unknown`, `manual`, `pass`, `warn`, and `fail`. The schema path is
`spec/v0.1/artifact-contract.schema.json`.

New public identifiers must describe data or behavior, work across all artifact kinds, and use the
same term in TypeScript, JSON, schemas, and docs unless an adapter explicitly documents a
compatibility alias. Names must not promise an outcome that the implementation cannot establish.

The previously proposed four-letter, database-style acronym is explicitly rejected. It must not
appear in exported identifiers, wire keys, CLI operation names, documentation headings, or package
paths. It suggests a storage or transaction guarantee that this contract does not make and is less
discoverable than the technical nouns above.

### Deterministic and manual boundaries

Code may deterministically validate the closed JSON structure, stable identifiers and references,
JSON compatibility, fingerprints, declared clock relationships, renderer evidence, and versioned
policy rules. It may preserve supplied provenance and identify internal gaps. Safe repair is limited
to facts available from evaluated configuration or data; it does not invent claims, evidence,
review, or approval.

Code cannot establish that a source is authentic, that a claim is true, that declared stakes are
correct, that a person understood an artifact, that an assistive-technology workflow succeeds in
practice, or that a representation is fair in its deployment context. Those questions remain manual
or unknown until accountable evidence is supplied. A policy may refuse an unresolved manual check,
but it must not convert that check to `pass`.

Model output may propose fields only where the field policy permits it. A model proposal cannot mark
itself reviewed, manufacture a clock or source identity, or turn an unknown into a fact.

## Consequences

- Search, autocomplete, and error messages remain approachable without prior strategy context.
- API review must catch synonyms and names that promise more than the evaluator can demonstrate.
- Compatibility aliases remain possible, but the generated wire format has one canonical vocabulary.
- Deterministic results, manual work, and unknown state cannot collapse into one score.

## Alternatives considered

One conceptual label throughout the API was rejected because it reduces discoverability and can
suggest unsupported assurance. Existing subsystem names were rejected because each covers only part
of the cross-interface contract. An acronym was rejected because it collides conceptually with
established technical guarantees and obscures the public API's purpose.

## Implementation evidence

- [`semiotic-artifact.ts`](../../src/components/semiotic-artifact.ts) defines the
  renderer-independent public exports.
- [`types.ts`](../../src/components/artifact/types.ts) defines the contract, field states, and
  obligation states.
- [`fieldPolicies.ts`](../../src/components/artifact/fieldPolicies.ts) separates derivable fields,
  permitted suppliers, model proposals, and review rules.
- [`evaluateArtifact.ts`](../../src/components/artifact/evaluateArtifact.ts) preserves manual
  obligations, applies versioned policy rules, and limits safe repair.
- [`artifact-field-policies.test.mjs`](../../scripts/artifact-field-policies.test.mjs) checks
  runtime policy metadata against schema annotations.
- [`policy-validation.test.ts`](../../src/components/artifact/policy-validation.test.ts) checks
  manual obligations and policy behavior.

Human comprehension, assistive-technology use, fairness, and cross-context interpretation still
require empirical evaluation outside deterministic checks.
