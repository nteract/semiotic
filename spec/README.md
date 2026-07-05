# The IDID Portability Spec

**Version 0.1 — library-neutral JSON Schemas for three chart-metadata primitives.**

These schemas describe three pieces of metadata that make a chart *legible to an agent* and
*receivable by a real audience*, independent of any rendering library:

| Primitive | Schema | Answers |
|---|---|---|
| **Chart Capability** | [`v0.1/chart-capability.schema.json`](./v0.1/chart-capability.schema.json) | *What is this chart good at, and how does it survive mobile?* — declaratively, so a heuristic or an LLM can rank it against a dataset, goal, audience, and phone viewport without running a chart library. |
| **Audience Profile** | [`v0.1/audience-profile.schema.json`](./v0.1/audience-profile.schema.json) | *Who is reading, and what is the org trying to grow?* — so a suggestion is calibrated to a real audience, not a generic baseline. |
| **Annotation Provenance & Lifecycle** | [`v0.1/annotation-provenance.schema.json`](./v0.1/annotation-provenance.schema.json) | *Where did this note come from, how much do we trust it, and how does it age?* — so a claim *on* a chart carries its own evidence and expiry. |

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

Each property carries an `x-idid-status` annotation so a reader can tell what is real today from
what the spec reserves for the future:

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

Chart capabilities may also include a `mobile` block. This is intentionally part of capability,
not rendering props: it lets a custom chart, Vega-Lite binding, or recipe adapter state its mobile
strategy, breakpoints, mark budget, touch target, label plan, and custom scene semantics without
requiring the receiving library to execute the renderer.

## Versioning

The spec is versioned by directory (`v0.1/`). A `0.x` line may add `proposed` fields and tighten
descriptions, but will not remove or repurpose a `shipped` field within the line. Breaking
changes bump the minor (pre-1.0) or major (post-1.0) version into a new directory; old versions
remain resolvable by their `$id`. A document may declare the version it targets via the optional
`specVersion: "0.1"` property.

The `$id` URIs (`https://semiotic.dev/spec/v0.1/…`) are stable identifiers, not fetch targets —
validate against the local copies in this directory.

## Validation

These are plain [JSON Schema 2020-12](https://json-schema.org/draft/2020-12) documents. Validate
with any compliant validator (ajv, `jsonschema`, etc.) — no library dependency is required, which
is the point. A reference implementation also ships small dependency-free structural validators
(see *The Vega-Lite binding*, below) for hosts that do not want to pull in a full schema engine.

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

A consumer reads `spec.usermeta.idid.capability` and routes it straight into a chart-suggestion
engine; the spec still renders as ordinary Vega-Lite everywhere else.

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

The binding is designed to survive a round trip: a chart → Vega-Lite spec (with IDID metadata in
`usermeta`) → back to a chart loses nothing the spec can express. Round-tripping through the
dominant interchange format *with the IDID metadata preserved* is the portability claim in
runnable form.

---

*This directory is the canonical, published copy of the schemas. A reference implementation may
embed copies for its own validators; those copies are kept byte-for-byte in sync with these files
by a test, so this directory is always authoritative.*
