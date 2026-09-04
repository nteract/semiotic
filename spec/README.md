# The IDID Portability Spec

**Version 0.1 — library-neutral JSON Schemas for four information-artifact
contracts.**

These schemas describe portable metadata that makes a chart inspectable by
software and understandable by its intended audience, independent of any
rendering library:

| Primitive | Schema | Answers |
|---|---|---|
| **Chart Capability** | [`v0.1/chart-capability.schema.json`](./v0.1/chart-capability.schema.json) | *What is this chart good at, and how does it survive mobile?* — declaratively, so a heuristic or an LLM can rank it against a dataset, goal, audience, and phone viewport without running a chart library. |
| **Audience Profile** | [`v0.1/audience-profile.schema.json`](./v0.1/audience-profile.schema.json) | *Who is reading, and what is the org trying to grow?* — so a suggestion is calibrated to a real audience, not a generic baseline. |
| **Annotation Provenance & Lifecycle** | [`v0.1/annotation-provenance.schema.json`](./v0.1/annotation-provenance.schema.json) | *Where did this note come from, how much do we trust it, and how does it age?* — so a claim *on* a chart carries its own evidence and expiry. |
| **Artifact Contract** | [`v0.1/artifact-contract.schema.json`](./v0.1/artifact-contract.schema.json) | *What does this artifact claim, what supports it, when is it valid, and what must survive transfer?* — so charts, dashboards, alerts, stories, and agent answers retain explicit interpretation and review requirements. |

## Why a spec, and not just a library API

A chart that an AI can pick correctly, that a screen-reader user can receive, and that carries
its own provenance is more useful than one that only looks right. Those three properties are
*metadata*, not pixels — and metadata is portable in a way a rendering engine is not. The value
of writing them down as **library-neutral schemas** is that the ideas can travel: a Python
notebook, a Vega-Lite spec, a BI tool, or a competing chart library can attach a capability
descriptor, calibrate to an audience profile, or stamp an annotation with provenance *without
depending on any particular renderer*. The schema is the contract; the renderer is one
implementation of it.

A practical consequence: a format adapter (Vega-Lite → chart, Mermaid → chart, dbt test →
annotation) becomes an *export of these ideas* rather than just a parser. It does not merely
reproduce a source format's appearance — it carries the capability/audience/provenance metadata
the source never had. That is the difference between a chart that renders and a chart that
*communicates*.

## The `x-idid-status` field convention

Public domain properties carry an `x-idid-status` annotation so a reader can tell what is real
today from what the spec reserves for the future:

- **`shipped`** — the field exists in a reference implementation's runtime types today
  (Semiotic ships all v0.1 fields). Safe to depend on.
- **`proposed`** — reserved by the program but not yet a runtime field. May change before it
  ships. *(No v0.1 fields carry this status yet; the marker exists so additions are honestly
  labeled rather than silently mixed in.)*
- **`spec`** — a spec-housekeeping field (e.g. `specVersion`), not a domain field.

Open string unions in the source types (e.g. `provenance.source`, which recognizes
`user`/`ai`/`agent`/… but accepts any string) are expressed as `{ "type": "string" }` with an
`x-idid-recognized-values` list and matching `examples`, rather than a closed `enum`. This is
faithful to the runtime contract — recognized values are documented, but a consumer may pass its
own label and it is preserved. Genuinely closed unions (`lifecycle.freshness`, `lifecycle.status`,
`lifecycle.anchor`) use a strict `enum`.

### The paper/runtime union for annotation metadata

The annotation schema publishes the **union** of the research vocabulary and the fields learned
while implementing it. The paper emphasized `provenance.basis` and the editorial
`lifecycle.status` / `lifecycle.supersedes` chain; the shipping runtime added the stable and
temporal mechanics needed to make those claims survive refreshes:
`provenance.stableId`, `lifecycle.anchor`, and `lifecycle.freshness`. The remaining provenance
fields (`author`, `authorKind`, `source`, `confidence`, `createdAt`, `dataVersion`) and
`lifecycle.ttlHint` are the shared connective vocabulary.

That origin history is not a maturity label. Every field in this v0.1 union is implemented by the
reference runtime and therefore carries `x-idid-status: "shipped"`. A future paper-only or
design-only addition must carry `"proposed"` until a reference implementation makes it executable
and testable.

Chart capabilities may also include a `mobile` block. This is intentionally part of capability,
not rendering props: it lets a custom chart, Vega-Lite binding, or recipe adapter state its mobile
strategy, breakpoints, mark budget, touch target, label plan, and custom scene semantics without
requiring the receiving library to execute the renderer.

### Stretch-pick admission is a rule

`AudienceProfile.exposureLevel` controls a separate, visibly labeled stretch surface; it never
silently turns a stretch into the primary recommendation. Level `0` disables stretch picks. At
level `1`, a candidate's effective familiarity must be at most `3`; level `2` widens that ceiling
to `4`. A host admits a candidate only when all of the following are true:

1. the host's chart implementation says the chart fits the data;
2. it is at or below the active familiarity ceiling; and
3. it is either an explicit `targets[component].direction: "increase"` choice or scores within
   the host's declared tolerance of the top familiar choice for the same task (the reference
   implementation defaults to `1.5` score points).

Each admitted stretch should retain its rationale and caveats, name the familiar chart it could
replace when one exists, and ship with interpretation scaffolding. This is governed literacy
exposure, not a novelty bonus.

## Versioning

The spec is versioned by directory (`v0.1/`). A `0.x` line may add `proposed` fields and tighten
descriptions, but will not remove or repurpose a `shipped` field within the line. Breaking
changes bump the minor (pre-1.0) or major (post-1.0) version into a new directory; old versions
remain resolvable by their `$id`. A document may declare the version it targets via the optional
`specVersion: "0.1"` property.

The `$id` URIs (`https://semiotic.dev/spec/v0.1/…`) are stable identifiers, not fetch targets.
The canonical files ship in the `semiotic` npm tarball and are exposed as
`semiotic/spec/v0.1/<schema-name>` resource paths; they also remain available in this directory
for repository consumers.

The exact npm resource paths are:

```text
semiotic/spec/v0.1/chart-capability.schema.json
semiotic/spec/v0.1/audience-profile.schema.json
semiotic/spec/v0.1/annotation-provenance.schema.json
semiotic/spec/v0.1/artifact-contract.schema.json
semiotic/spec/v0.1/examples/<example-name>.json
semiotic/spec/bindings/vega-lite.mjs
```

CommonJS can load a schema directly:

```js
const capabilitySchema =
  require("semiotic/spec/v0.1/chart-capability.schema.json")
```

Node ESM can use a JSON import attribute:

```js
import capabilitySchema from
  "semiotic/spec/v0.1/chart-capability.schema.json" with { type: "json" }
```

## Validation

These are plain [JSON Schema 2020-12](https://json-schema.org/draft/2020-12) documents. Validate
with any compliant validator (ajv, `jsonschema`, etc.) — no library dependency is required, which
is the point. A reference implementation also ships small dependency-free structural validators
(see *The Vega-Lite binding*, below) for hosts that do not want to pull in a full schema engine.

## Worked examples

Each schema has exactly two canonical JSON fixtures. They are packed with npm and validated in CI
against both the published Draft 2020-12 schema and the reference implementation's
dependency-free structural validator.

| Schema | Example 1 | Example 2 |
|---|---|---|
| Chart Capability | [`chart-capability-bar-comparison.json`](./v0.1/examples/chart-capability-bar-comparison.json) — a familiar categorical comparison with a ranked variant and mobile contract | [`chart-capability-service-flow.json`](./v0.1/examples/chart-capability-service-flow.json) — an operational flow view with accessible interaction alternatives and a namespaced domain extension |
| Audience Profile | [`audience-profile-executive-review.json`](./v0.1/examples/audience-profile-executive-review.json) — visual executive readers with inspectable adoption targets | [`audience-profile-incident-operators.json`](./v0.1/examples/audience-profile-incident-operators.json) — screen-reader reception plus namespaced role, literacy, and decision context |
| Annotation Provenance & Lifecycle | [`annotation-provenance-watcher-threshold.json`](./v0.1/examples/annotation-provenance-watcher-threshold.json) — a proposed watcher threshold with semantic anchoring | [`annotation-provenance-reviewed-revision.json`](./v0.1/examples/annotation-provenance-reviewed-revision.json) — a human-reviewed accepted note that supersedes an earlier claim |
| Artifact Contract | [`artifact-contract-full.json`](./v0.1/examples/artifact-contract-full.json) — a complete chart contract with claims, evidence, review, and transfer requirements | [`artifact-contract-unknown-state.json`](./v0.1/examples/artifact-contract-unknown-state.json) — an explicit record of unknown, manual, and not-applicable fields |

## The Vega-Lite binding (carrying IDID metadata on a portable spec)

Vega-Lite is the closest thing the ecosystem has to a neutral chart-interchange format, but it has
no place for capability, audience, or provenance metadata. The binding convention defines where
IDID metadata rides on a Vega-Lite spec so the two travel together:

### Capability and audience → `usermeta.idid`

Vega-Lite reserves [`usermeta`](https://vega.github.io/vega-lite/docs/spec.html#top-level) for
arbitrary application metadata that validators ignore. IDID metadata lives under a single
namespaced key:

```jsonc
{
  "mark": "bar",
  "encoding": { /* … */ },
  "usermeta": {
    "idid": {
      "specVersion": "0.1",
      "capability": { "component": "BarChart", "rubric": { "familiarity": 5, "accuracy": 5, "precision": 4 }, "intentScores": { "compare-categories": 5, "rank": 4 } },
      "audience": { "name": "Exec review", "receptionModality": "visual", "familiarity": { "BoxPlot": 2 } }
    }
  }
}
```

A consumer reads `spec.usermeta.idid.capability` as the static scoring and communication metadata
for its own chart implementation; the spec still renders as ordinary Vega-Lite everywhere else.
A portable descriptor deliberately has no executable `fits` or `buildProps` functions. A host
whose suggestion engine requires those functions must resolve the descriptor's `component` to a
host implementation rather than inventing a permissive fit.

### Provenanced annotations → `usermeta.idid.annotations`

Annotations ride verbatim — with their provenance/lifecycle blocks — under the same
`usermeta.idid` key, composing with capability/audience. As a courtesy, any annotation with a
representable shape (a threshold, a labelled callout) also emits a best-effort `rule`/`text` mark
in an appended layer, so a plain Vega-Lite renderer still draws something:

```jsonc
{
  "usermeta": {
    "idid": {
      "specVersion": "0.1",
      "annotations": [
        {
          "type": "y-threshold",
          "value": 1000,
          "label": "SLA floor",
          "provenance": { "source": "ai", "basis": "statistical-test", "confidence": 0.7, "createdAt": "2026-06-20T14:00:00Z" },
          "lifecycle": { "ttlHint": "P7D", "status": "proposed", "anchor": "semantic" }
        }
      ]
    }
  },
  "layer": [
    { "mark": "line", "encoding": { /* the data */ } },
    { "mark": "rule", "encoding": { "y": { "datum": 1000 } }, "usermeta": { "idid": { "role": "annotation-layer" } } }
  ]
}
```

A non-IDID Vega-Lite renderer draws the rule and ignores the metadata; an IDID-aware host reads
the provenance/lifecycle off `usermeta.idid.annotations` and can dim a stale note, badge an
AI-authored one with its confidence, or surface it in an accessible navigation tree. When no
annotation is representable as a mark, the metadata still rides on `usermeta` and no empty layer
is added.

### Round-tripping

The binding is designed for a tested supported single-view subset: a chart → Vega-Lite spec (with
IDID metadata in `usermeta`) → back to a chart preserves the supported mark, data, and encoding
semantics. Unsupported composition or chart semantics must return a typed refusal rather than a
plausible fallback. IDID-enriched annotation layers recover their one base view, while arbitrary
Vega-Lite layer composition remains deliberately unsupported.

## Appendix: typology crosswalk

The core schemas are intentionally small. They carry axes that already have interoperable runtime
behavior and leave organization- or domain-specific classifications in namespaced extension
vocabularies. Because the three root schemas permit additional properties, a consumer can add one
object such as `x-example-context` without pretending its local ontology is universal.

| Typology axis | Where it lives in v0.1 | Core or extension? |
|---|---|---|
| Data/domain entity + scale | `ChartCapability.family`, `tags`, and `mobile` describe chart/rendering characteristics, not domain entities or scientific/organizational scale. Put entity types, units, granularity, and domain scale in a namespaced context object. | **Extension vocabulary.** Do not overload `family` with a domain ontology. |
| Analytical task | `ChartCapability.intentScores`, keyed by open intent ids. The schema lists the reference implementation's 13 recognized tasks without closing the vocabulary. | **Core field; extensible values.** |
| Communicative act | Some acts can be inferred by a host from the strongest analytical intent, but v0.1 has no separate act field for report, alert, explain, persuade, teach, and similar purposes. | **Extension vocabulary** when task and act differ. |
| Audience role + literacy | `AudienceProfile.familiarity`, `targets`, and `exposureLevel` carry chart familiarity and governed literacy growth. Job/reader role, domain knowledge, and mastered visualization concepts are not core fields. | **Mixed:** chart familiarity/growth are core; role, domain literacy, and concept mastery are extensions. |
| Reception modality | `AudienceProfile.receptionModality`: `visual`, `screen-reader`, `sonified`, or `agent`. | **Core field and closed vocabulary in v0.1.** |
| Decision/use context | No core field. Put decision type, workflow stage, urgency, cadence, collaboration setting, or regulatory context in a namespaced context object. | **Extension vocabulary.** |
| Provenance + lifecycle | An annotation's `provenance` records actor, evidence basis, confidence, time/data version, and stable identity; `lifecycle` records freshness, editorial status, supersession, TTL, and anchoring. | **Core fields.** Open source/basis labels permit local evidence vocabularies; freshness/status/anchor remain closed. |

Extension vocabularies should be documented, versioned, and preserved verbatim by bindings. They
should graduate into a future core schema only after more than one adopter needs interoperable
behavior, not merely because one domain has a useful label.

---

*This directory is the canonical published copy of the schemas and is packed unchanged into npm.
A reference implementation may embed copies for its own validators; those copies are kept
byte-for-byte in sync with these files by a test, so this directory is always authoritative.*
